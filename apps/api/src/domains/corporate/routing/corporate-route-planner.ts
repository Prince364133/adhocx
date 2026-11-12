import { Logger } from '@nestjs/common';
import {
  ITravelTimeMatrixPort,
  MatrixPoint,
  TravelTimeSource,
  TravelTimeMatrixOptions,
  combineSources,
} from './travel-time-matrix.port';
import { HaversineTravelTimeMatrix } from './haversine-travel-time-matrix';

/**
 * Corporate commute route planner (capacitated VRP with ride-time limits, single depot).
 *
 * This is a deterministic heuristic, not an exact solver and not OR-Tools:
 *  1. Sweep clustering (Gillett-Miller): employees are ordered by bearing around the office,
 *     starting after the widest angular gap, and cut into vehicle-capacity groups. This gives
 *     the minimum vehicle count ceil(n / capacity) up front.
 *  2. Real travel times: a sparse matrix is fetched only for employees that can end up in the
 *     same or adjacent sweep groups (O(capacity x n) elements, not n^2), plus every
 *     employee <-> office leg.
 *  3. Per-route sequencing is exact (all permutations) for up to 7 stops, otherwise
 *     nearest-neighbour + 2-opt. Objective: (constraint penalty, drive time, total ride time).
 *  4. Inter-route local search between sweep-adjacent routes (swap / relocate one employee),
 *     best-improvement, bounded passes.
 *  5. Ride-time repair: employees that cannot meet the max ride time are peeled off and
 *     re-planned as additional routes; anyone infeasible even alone gets a flagged solo route.
 * Times are computed backwards from the office arrival target (LOGIN) or forwards from office
 * departure (LOGOUT) with a fixed dwell at every employee stop.
 */

export type CommuteDirection = 'LOGIN' | 'LOGOUT';

export interface PlannerPassenger {
  requestId: string;
  employeeId?: string;
  latitude: number;
  longitude: number;
  gender?: string;
  /** Opaque data carried through to the output (e.g. the original request row). */
  payload?: any;
}

export interface PlannerInput {
  direction: CommuteDirection;
  office: MatrixPoint;
  /** Shift login time (LOGIN) or logout time (LOGOUT). */
  anchorTime: Date;
  capacity: number;
  passengers: PlannerPassenger[];
  /** Dwell at every employee stop. Default 300 s. */
  dwellSeconds?: number;
  /** LOGIN: arrive this many minutes before login. Default 10. */
  officeBufferMinutes?: number;
  /** LOGOUT: cab reports at office this many minutes before logout. Default 15. */
  logoutReportingBufferMinutes?: number;
  /** Max time any employee spends in the cab. Default 7200 s (2 h). */
  maxRideTimeSeconds?: number;
  /** Night shift: avoid a woman being first pickup (LOGIN) / last drop (LOGOUT) when a man is in the cab. */
  nightShift?: boolean;
  /** Local-search passes. Default 3. */
  maxImprovementPasses?: number;
  /** Routing controls applied by matrix providers that support them. */
  routingOptions?: TravelTimeMatrixOptions;
}

export interface PlannedRoute {
  /** Employees in visit order. */
  passengers: PlannerPassenger[];
  /** Planned arrival at each employee stop, index-aligned with passengers. */
  stopEtas: Date[];
  /** In-cab time per employee (pickup ETA -> office, or office departure -> drop ETA). */
  rideSeconds: number[];
  /** LOGIN: leg i = stop i -> next stop (last -> office). LOGOUT: leg i = previous (office for 0) -> stop i. */
  legDurationsSec: number[];
  legDistancesMeters: number[];
  driveSeconds: number;
  distanceMeters: number;
  /** drive + dwell at every employee stop. */
  totalSeconds: number;
  /** LOGIN: pickup 1 ETA. LOGOUT: cab reporting time at office. */
  firstStopTime: Date;
  /** LOGIN: target office arrival. LOGOUT: office departure (= logout time). */
  officeTime: Date;
  rideTimeViolation: boolean;
  /** Night route where a woman is first pickup / last drop and no man could take that slot. */
  escortRequired: boolean;
}

export interface PlanResult {
  routes: PlannedRoute[];
  travelTimeSource: TravelTimeSource;
  matrixElementsRequested: number;
  warnings: string[];
}

interface SeqResult {
  order: number[];
  penalty: number;
  drive: number;
  sumRide: number;
  maxRide: number;
  rideOk: boolean;
  safetyOk: boolean;
}

const RIDE_PENALTY = 1e7;
const SAFETY_PENALTY = 1e6;
const EXACT_LIMIT = 7;

export class CorporateRoutePlanner {
  private readonly logger = new Logger(CorporateRoutePlanner.name);

  constructor(
    private readonly matrixPort: ITravelTimeMatrixPort,
    private readonly fallback: HaversineTravelTimeMatrix = new HaversineTravelTimeMatrix(),
    private readonly fetchConcurrency = 4,
  ) {}

  async plan(input: PlannerInput): Promise<PlanResult> {
    return new PlanRun(this.matrixPort, this.fallback, this.fetchConcurrency, input, this.logger).run();
  }
}

/** One planning run; holds the sparse matrix and memo for a single shift batch. */
class PlanRun {
  private readonly pts: MatrixPoint[];
  private readonly n: number;
  private readonly officeIdx: number;
  private readonly dwell: number;
  private readonly maxRide: number;
  private readonly cap: number;
  private readonly isLogin: boolean;
  private readonly departure: Date;
  private readonly dur = new Map<number, number>();
  private readonly dist = new Map<number, number>();
  private readonly sources: TravelTimeSource[] = [];
  private readonly memo = new Map<string, SeqResult>();
  private readonly warnings: string[] = [];
  private readonly passengers: PlannerPassenger[];
  private elements = 0;

  constructor(
    private readonly port: ITravelTimeMatrixPort,
    private readonly fallback: HaversineTravelTimeMatrix,
    private readonly concurrency: number,
    private readonly input: PlannerInput,
    private readonly logger: Logger,
  ) {
    if (!Number.isInteger(input.capacity) || input.capacity < 1) {
      throw new Error(`Vehicle capacity must be a positive integer (got ${input.capacity})`);
    }
    // Stable input order => deterministic output
    this.passengers = [...input.passengers].sort((a, b) =>
      a.requestId < b.requestId ? -1 : a.requestId > b.requestId ? 1 : 0,
    );
    this.n = this.passengers.length;
    this.officeIdx = this.n;
    this.pts = [
      ...this.passengers.map((p) => ({ latitude: Number(p.latitude), longitude: Number(p.longitude) })),
      { latitude: Number(input.office.latitude), longitude: Number(input.office.longitude) },
    ];
    this.dwell = input.dwellSeconds ?? 300;
    this.maxRide = input.maxRideTimeSeconds ?? 7200;
    this.cap = input.capacity;
    this.isLogin = input.direction === 'LOGIN';
    // Matrix departure: middle of the pickup window for LOGIN, logout time for LOGOUT
    const officeArrivalMs = input.anchorTime.getTime() - (input.officeBufferMinutes ?? 10) * 60_000;
    this.departure = this.isLogin ? new Date(officeArrivalMs - 60 * 60_000) : new Date(input.anchorTime);
  }

  async run(): Promise<PlanResult> {
    if (this.n === 0) {
      return { routes: [], travelTimeSource: 'HAVERSINE', matrixElementsRequested: 0, warnings: [] };
    }

    // Office legs for everyone
    const all = this.range(this.n);
    if (this.isLogin) await this.fetchRects([[all, [this.officeIdx]]]);
    else await this.fetchRects([[[this.officeIdx], all]]);

    const groups = await this.solveGroup(all, 0);
    await this.ensureCoverage(groups);

    const routes = groups.map((g) => this.buildRoute(this.sequence(g)));
    for (const r of routes) {
      if (r.rideTimeViolation) {
        this.warnings.push(
          `Employee(s) ${r.passengers.map((p) => p.requestId).join(', ')} exceed max ride time ${Math.round(
            this.maxRide / 60,
          )} min even on a dedicated cab`,
        );
      }
      if (r.escortRequired) {
        this.warnings.push(
          `Night route with ${r.passengers.map((p) => p.requestId).join(', ')} has a woman as ${
            this.isLogin ? 'first pickup' : 'last drop'
          }; escort/guard required`,
        );
      }
    }
    const travelTimeSource = combineSources(this.sources);
    if (
      this.input.routingOptions &&
      (travelTimeSource === 'HAVERSINE' || travelTimeSource === 'MIXED')
    ) {
      this.warnings.push(
        'Some route legs used haversine fallback; traffic and avoid-road routing modifiers were not applied to those legs.',
      );
    }
    return {
      routes,
      travelTimeSource,
      matrixElementsRequested: this.elements,
      warnings: this.warnings,
    };
  }

  // ---------------------------------------------------------------- solving

  private async solveGroup(members: number[], depth: number): Promise<number[][]> {
    const order = this.sweepOrder(members);

    // Sparse matrix: segments of 2*cap in sweep order; fetch S_k x (S_k u S_{k+1}) and S_{k+1} x S_k
    const seg = 2 * this.cap;
    const segments: number[][] = [];
    for (let i = 0; i < order.length; i += seg) segments.push(order.slice(i, i + seg));
    const rects: [number[], number[]][] = [];
    for (let k = 0; k < segments.length; k++) {
      const next = segments[k + 1] ?? [];
      rects.push([segments[k], [...segments[k], ...next]]);
      if (next.length > 0) rects.push([next, segments[k]]);
    }
    await this.fetchRects(rects);

    // Initial routes: consecutive capacity-sized chunks of the sweep
    let routes: number[][] = [];
    for (let i = 0; i < order.length; i += this.cap) routes.push(order.slice(i, i + this.cap));

    routes = this.localSearch(routes);

    // Ride-time repair
    const kept: number[][] = [];
    const spill: number[] = [];
    for (const r of routes) {
      let cur = [...r];
      let res = this.sequence(cur);
      while (!res.rideOk && cur.length > 1) {
        let bestIdx = -1;
        let best: SeqResult | null = null;
        for (let i = 0; i < cur.length; i++) {
          const cand = this.sequence(cur.filter((_, j) => j !== i));
          if (!best || cand.penalty < best.penalty || (cand.penalty === best.penalty && cand.maxRide < best.maxRide)) {
            best = cand;
            bestIdx = i;
          }
        }
        spill.push(cur[bestIdx]);
        cur = cur.filter((_, j) => j !== bestIdx);
        res = this.sequence(cur);
      }
      kept.push(cur);
    }
    if (spill.length === 0) return kept;
    if (spill.length === members.length || depth >= 3) {
      // No progress possible: dedicated cabs
      return [...kept, ...spill.sort((a, b) => a - b).map((i) => [i])];
    }
    const extra = await this.solveGroup(spill, depth + 1);
    return [...kept, ...extra];
  }

  /** Bearing-sorted order starting after the widest angular gap. */
  private sweepOrder(members: number[]): number[] {
    const o = this.pts[this.officeIdx];
    const cosLat = Math.cos((o.latitude * Math.PI) / 180);
    const info = members.map((i) => {
      const dy = this.pts[i].latitude - o.latitude;
      const dx = (this.pts[i].longitude - o.longitude) * cosLat;
      let theta = Math.atan2(dx, dy);
      if (theta < 0) theta += 2 * Math.PI;
      return { i, theta, r: dx * dx + dy * dy };
    });
    info.sort((a, b) => a.theta - b.theta || a.r - b.r || a.i - b.i);
    if (info.length < 2) return info.map((x) => x.i);
    let gapAt = 0;
    let gap = info[0].theta + 2 * Math.PI - info[info.length - 1].theta;
    for (let k = 1; k < info.length; k++) {
      const g = info[k].theta - info[k - 1].theta;
      if (g > gap) {
        gap = g;
        gapAt = k;
      }
    }
    return [...info.slice(gapAt), ...info.slice(0, gapAt)].map((x) => x.i);
  }

  /** Best-improvement swap/relocate between sweep-adjacent routes. */
  private localSearch(routes: number[][]): number[][] {
    const passes = this.input.maxImprovementPasses ?? 3;
    const cost = (r: number[]) => {
      if (r.length === 0) return 0;
      const sq = this.sequence(r);
      return sq.penalty + sq.drive;
    };
    // Cost of an explicit order (no re-optimisation)
    const orderCost = (order: number[]) => {
      if (order.length === 0) return 0;
      const ev = this.evaluate(order);
      return ev.penalty + ev.drive;
    };
    // Upper bound on the optimal cost of (order without `removeAt`) + `insert`, via cheapest insertion.
    // The exact sequence can only be cheaper, so a positive estimated gain is a real gain.
    const estimate = (order: number[], removeAt: number, insert: number | null) => {
      const base = removeAt >= 0 ? order.filter((_, k) => k !== removeAt) : order;
      if (insert === null) return { cost: orderCost(base), members: base };
      let bestC = Infinity;
      let bestO: number[] = [];
      for (let pos = 0; pos <= base.length; pos++) {
        const o = [...base.slice(0, pos), insert, ...base.slice(pos)];
        const c = orderCost(o);
        if (c < bestC) {
          bestC = c;
          bestO = o;
        }
      }
      return { cost: bestC, members: bestO };
    };

    for (let pass = 0; pass < passes; pass++) {
      let improved = false;
      for (let r = 0; r + 1 < routes.length; r++) {
        for (let guard = 0; guard < 2 * this.cap; guard++) {
          if (routes[r].length === 0 || routes[r + 1].length === 0) break;
          const sa = this.sequence(routes[r]);
          const sb = this.sequence(routes[r + 1]);
          const A = sa.order;
          const B = sb.order;
          const base = sa.penalty + sa.drive + sb.penalty + sb.drive;
          let bestGain = 1e-9;
          let bestA: number[] | null = null;
          let bestB: number[] | null = null;
          const consider = (na: { cost: number; members: number[] }, nb: { cost: number; members: number[] }) => {
            const gain = base - (na.cost + nb.cost);
            if (gain > bestGain) {
              bestGain = gain;
              bestA = na.members;
              bestB = nb.members;
            }
          };
          for (let i = 0; i < A.length; i++) {
            for (let j = 0; j < B.length; j++) consider(estimate(A, i, B[j]), estimate(B, j, A[i]));
          }
          if (B.length < this.cap) {
            for (let i = 0; i < A.length; i++) consider(estimate(A, i, null), estimate(B, -1, A[i]));
          }
          if (A.length < this.cap) {
            for (let j = 0; j < B.length; j++) consider(estimate(A, -1, B[j]), estimate(B, j, null));
          }
          if (!bestA || !bestB) break;
          // Confirm with exact sequencing before committing
          if (cost(bestA) + cost(bestB) >= base) break;
          routes[r] = bestA;
          routes[r + 1] = bestB;
          improved = true;
        }
      }
      routes = routes.filter((r) => r.length > 0);
      if (!improved) break;
    }
    return routes;
  }

  // ---------------------------------------------------------------- sequencing

  private sequence(members: number[]): SeqResult {
    const key = [...members].sort((a, b) => a - b).join(',');
    const hit = this.memo.get(key);
    if (hit) return hit;
    const sorted = [...members].sort((a, b) => a - b);
    let best: SeqResult;
    if (sorted.length <= EXACT_LIMIT) {
      best = this.exactSequence(sorted);
    } else {
      best = this.heuristicSequence(sorted);
    }
    this.memo.set(key, best);
    return best;
  }

  private better(a: SeqResult, b: SeqResult | null): boolean {
    if (!b) return true;
    if (a.penalty !== b.penalty) return a.penalty < b.penalty;
    if (a.drive !== b.drive) return a.drive < b.drive;
    return a.sumRide < b.sumRide;
  }

  private exactSequence(members: number[]): SeqResult {
    // Seed with the radial order (farthest-first for LOGIN, nearest-first for LOGOUT) so
    // branch-and-bound prunes early
    const radial = [...members].sort((a, b) =>
      this.isLogin
        ? this.d(b, this.officeIdx) - this.d(a, this.officeIdx) || a - b
        : this.d(this.officeIdx, a) - this.d(this.officeIdx, b) || a - b,
    );
    let best: SeqResult | null = this.evaluate(radial);
    const k = members.length;
    const used = new Array(k).fill(false);
    const order: number[] = [];
    // Branch and bound: penalties only add cost and legs are non-negative, so once a
    // penalty-free sequence is known, any prefix whose drive already exceeds it is dead.
    const dfs = (partial: number) => {
      const b = best as SeqResult | null;
      if (b && b.penalty === 0 && partial > b.drive) return;
      if (order.length === k) {
        const ev = this.evaluate(order);
        if (this.better(ev, b)) best = { ...ev, order: [...order] };
        return;
      }
      const last = order.length > 0 ? order[order.length - 1] : -1;
      for (let i = 0; i < k; i++) {
        if (used[i]) continue;
        let step = 0;
        if (last >= 0) step = this.d(last, members[i]);
        else if (!this.isLogin) step = this.d(this.officeIdx, members[i]);
        used[i] = true;
        order.push(members[i]);
        dfs(partial + step);
        order.pop();
        used[i] = false;
      }
    };
    dfs(0);
    return best!;
  }

  private heuristicSequence(members: number[]): SeqResult {
    let best: SeqResult | null = null;
    for (const start of members) {
      // Nearest neighbour (LOGIN builds backwards from the office side, LOGOUT forwards)
      const left = new Set(members.filter((m) => m !== start));
      const order = [start];
      while (left.size > 0) {
        const last = order[order.length - 1];
        let nxt = -1;
        let nd = Infinity;
        for (const c of left) {
          const d = this.isLogin ? this.d(c, last) : this.d(last, c);
          if (d < nd) {
            nd = d;
            nxt = c;
          }
        }
        order.push(nxt);
        left.delete(nxt);
      }
      if (this.isLogin) order.reverse();
      let cur = { ...this.evaluate(order), order };
      // 2-opt
      let improved = true;
      while (improved) {
        improved = false;
        for (let i = 0; i < cur.order.length - 1; i++) {
          for (let j = i + 1; j < cur.order.length; j++) {
            const cand = [...cur.order.slice(0, i), ...cur.order.slice(i, j + 1).reverse(), ...cur.order.slice(j + 1)];
            const ev = this.evaluate(cand);
            if (this.better(ev, cur)) {
              cur = { ...ev, order: cand };
              improved = true;
            }
          }
        }
      }
      if (this.better(cur, best)) best = cur;
    }
    return best!;
  }

  private evaluate(order: number[]): SeqResult {
    const k = order.length;
    const legs = this.legs(order);
    const drive = legs.reduce((s, x) => s + x, 0);
    const rides: number[] = new Array(k);
    if (this.isLogin) {
      let tail = 0;
      for (let i = k - 1; i >= 0; i--) {
        tail += legs[i];
        rides[i] = tail + (k - i) * this.dwell;
      }
    } else {
      let acc = 0;
      for (let i = 0; i < k; i++) {
        acc += legs[i] + (i > 0 ? this.dwell : 0);
        rides[i] = acc;
      }
    }
    const maxRide = Math.max(...rides);
    const sumRide = rides.reduce((s, x) => s + x, 0);
    const rideOk = maxRide <= this.maxRide;
    let safetyOk = true;
    if (this.input.nightShift && k > 1) {
      const g = (i: number) => (this.passengers[i].gender || '').toUpperCase();
      const hasMale = order.some((i) => g(i) === 'MALE');
      const edge = this.isLogin ? order[0] : order[k - 1];
      if (hasMale && g(edge) === 'FEMALE') safetyOk = false;
    }
    const penalty = (rideOk ? 0 : RIDE_PENALTY + (maxRide - this.maxRide)) + (safetyOk ? 0 : SAFETY_PENALTY);
    return { order, penalty, drive, sumRide, maxRide, rideOk, safetyOk };
  }

  private legs(order: number[]): number[] {
    const k = order.length;
    const out: number[] = new Array(k);
    if (this.isLogin) {
      for (let i = 0; i < k - 1; i++) out[i] = this.d(order[i], order[i + 1]);
      out[k - 1] = this.d(order[k - 1], this.officeIdx);
    } else {
      out[0] = this.d(this.officeIdx, order[0]);
      for (let i = 1; i < k; i++) out[i] = this.d(order[i - 1], order[i]);
    }
    return out;
  }

  private legDistances(order: number[]): number[] {
    const k = order.length;
    const out: number[] = new Array(k);
    if (this.isLogin) {
      for (let i = 0; i < k - 1; i++) out[i] = this.m(order[i], order[i + 1]);
      out[k - 1] = this.m(order[k - 1], this.officeIdx);
    } else {
      out[0] = this.m(this.officeIdx, order[0]);
      for (let i = 1; i < k; i++) out[i] = this.m(order[i - 1], order[i]);
    }
    return out;
  }

  // ---------------------------------------------------------------- output

  private buildRoute(seq: SeqResult): PlannedRoute {
    const order = seq.order;
    const k = order.length;
    const legs = this.legs(order);
    const legM = this.legDistances(order);
    const drive = legs.reduce((s, x) => s + x, 0);
    const distance = legM.reduce((s, x) => s + x, 0);
    const total = drive + k * this.dwell;
    const etas: Date[] = new Array(k);
    const rides: number[] = new Array(k);
    let firstStopTime: Date;
    let officeTime: Date;

    if (this.isLogin) {
      const arrival = this.input.anchorTime.getTime() - (this.input.officeBufferMinutes ?? 10) * 60_000;
      officeTime = new Date(arrival);
      // Backwards from office arrival: each stop = next stop - leg - dwell
      let t = arrival;
      for (let i = k - 1; i >= 0; i--) {
        t -= (legs[i] + this.dwell) * 1000;
        etas[i] = new Date(t);
        rides[i] = (arrival - t) / 1000;
      }
      firstStopTime = etas[0];
    } else {
      const dep = this.input.anchorTime.getTime();
      officeTime = new Date(dep);
      firstStopTime = new Date(dep - (this.input.logoutReportingBufferMinutes ?? 15) * 60_000);
      let t = dep;
      for (let i = 0; i < k; i++) {
        t += (legs[i] + (i > 0 ? this.dwell : 0)) * 1000;
        etas[i] = new Date(t);
        rides[i] = (t - dep) / 1000;
      }
    }

    const g = (i: number) => (this.passengers[i].gender || '').toUpperCase();
    const edge = this.isLogin ? order[0] : order[k - 1];
    const escortRequired = !!this.input.nightShift && g(edge) === 'FEMALE';

    return {
      passengers: order.map((i) => this.passengers[i]),
      stopEtas: etas,
      rideSeconds: rides,
      legDurationsSec: legs,
      legDistancesMeters: legM,
      driveSeconds: drive,
      distanceMeters: distance,
      totalSeconds: total,
      firstStopTime,
      officeTime,
      rideTimeViolation: !seq.rideOk,
      escortRequired,
    };
  }

  // ---------------------------------------------------------------- matrix

  private key(i: number, j: number): number {
    return i * (this.n + 1) + j;
  }

  private d(i: number, j: number): number {
    if (i === j) return 0;
    const v = this.dur.get(this.key(i, j));
    if (v !== undefined) return v;
    const e = this.fallback.estimate(this.pts[i], this.pts[j]);
    this.dur.set(this.key(i, j), e.durationSec);
    this.dist.set(this.key(i, j), e.distanceMeters);
    this.estimated.add(this.key(i, j));
    return e.durationSec;
  }

  private m(i: number, j: number): number {
    if (i === j) return 0;
    if (!this.dist.has(this.key(i, j))) this.d(i, j);
    return this.dist.get(this.key(i, j))!;
  }

  /** Pairs filled by on-the-fly estimate (not from the port). */
  private readonly estimated = new Set<number>();

  private allKnown(o: number[], d: number[]): boolean {
    for (const i of o) for (const j of d) if (i !== j && (!this.dur.has(this.key(i, j)) || this.estimated.has(this.key(i, j)))) return false;
    return true;
  }

  private async fetchRects(rects: [number[], number[]][]): Promise<void> {
    const todo = rects.filter(([o, d]) => o.length > 0 && d.length > 0 && !this.allKnown(o, d));
    let cursor = 0;
    const worker = async () => {
      while (cursor < todo.length) {
        const [o, d] = todo[cursor++];
        this.elements += o.length * d.length;
        try {
          const res = await this.port.getMatrix(
            o.map((i) => this.pts[i]),
            d.map((j) => this.pts[j]),
            this.departure,
            this.input.routingOptions,
          );
          this.sources.push(res.source);
          o.forEach((oi, a) =>
            d.forEach((dj, b) => {
              const s = res.durationSec?.[a]?.[b];
              const mm = res.distanceMeters?.[a]?.[b];
              if (oi === dj || !Number.isFinite(s)) return;
              this.dur.set(this.key(oi, dj), Math.max(0, Math.round(s)));
              this.dist.set(this.key(oi, dj), Number.isFinite(mm) ? Math.max(0, Math.round(mm)) : 0);
              this.estimated.delete(this.key(oi, dj));
            }),
          );
        } catch (err: any) {
          this.sources.push('HAVERSINE');
          this.warnings.push(`Travel-time matrix request failed; haversine estimates were used (${err.message})`);
          this.logger.warn(`Travel-time matrix port failed (${err.message}); using haversine estimates`);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(this.concurrency, todo.length) }, worker));
    // New data invalidates cached sequences
    if (todo.length > 0) this.memo.clear();
  }

  /** Make sure every final route's internal legs come from the port, then re-sequence. */
  private async ensureCoverage(groups: number[][]): Promise<void> {
    await this.fetchRects(groups.filter((g) => g.length > 1).map((g) => [g, g] as [number[], number[]]));
  }

  private range(k: number): number[] {
    return Array.from({ length: k }, (_, i) => i);
  }
}
