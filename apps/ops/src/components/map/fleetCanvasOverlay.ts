/**
 * Draws every cab on ONE canvas laid over the Google map. The canvas is fixed over the map
 * container and cabs are placed with `fromLatLngToContainerPixel` (correct at fractional zoom and
 * mid-drag); an OverlayView supplies the projection. Overlay panes are not used: Maps CSS-scales
 * them at fractional zoom, which misplaces a viewport-sized canvas.
 *
 * Legacy `google.maps.Marker`s each own a canvas that Maps re-rasterises on every position or
 * icon change; profiling the live map showed that cost alone (Maps' `scale` / `getContext` /
 * `getBoundingClientRect`) holding the page at ~2 FPS with 500 moving cabs. Here a frame is a single
 * clear + one small path per on-screen cab, so thousands of cabs stay cheap, with no extra
 * dependency and no vector Map ID requirement (dark `styles` keep working).
 */

export interface CanvasVehicle {
  id: string;
  lat: number;
  lng: number;
  /** Degrees clockwise from north. */
  heading: number;
  fill: string;
  stroke: string;
  /** On-demand trips draw as a slimmer navigation arrow, corporate cabs as a wider arrow. */
  shape: 'ARROW' | 'NAV';
}

export interface FleetCanvasOverlay {
  /** Redraws all cabs (call from requestAnimationFrame). */
  render(vehicles: Iterable<CanvasVehicle>, selectedId: string | null): void;
  /** Id of the cab under a container pixel (within the hit radius), or null. */
  hitTest(x: number, y: number): string | null;
  destroy(): void;
}

const HIT_RADIUS_PX = 12;
/** Arrow outlines in a 0-centred unit box, pointing north (canvas y grows downward). */
const ARROW: Array<[number, number]> = [
  [0, -11],
  [8, 9],
  [0, 4.5],
  [-8, 9],
];
const NAV: Array<[number, number]> = [
  [0, -10],
  [6.5, 7.5],
  [0, 4],
  [-6.5, 7.5],
];

export function createFleetCanvasOverlay(g: any, map: any): FleetCanvasOverlay {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.left = '0';
  canvas.style.top = '0';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '1';
  const ctx = canvas.getContext('2d')!;
  // Screen positions of the last frame, for hit-testing (container pixels).
  let drawn: Array<{ id: string; x: number; y: number }> = [];
  let ready = false;

  class Overlay extends g.maps.OverlayView {
    onAdd() {
      const host: HTMLElement | undefined = map.getDiv?.();
      if (host) {
        if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
        host.appendChild(canvas);
      }
      ready = true;
    }
    draw() {
      // Maps calls this after pan/zoom settles; the rAF render keeps the frame current otherwise.
    }
    onRemove() {
      ready = false;
      canvas.remove();
    }
  }
  const overlay = new Overlay();
  overlay.setMap(map);

  return {
    render(vehicles, selectedId) {
      const proj = ready ? overlay.getProjection() : null;
      const div: HTMLElement | undefined = map.getDiv?.();
      if (!proj || !div) return;
      const w = div.clientWidth;
      const h = div.clientHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.lineJoin = 'round';
      const next: Array<{ id: string; x: number; y: number }> = [];
      let selected: { x: number; y: number } | null = null;
      for (const v of vehicles) {
        const p = proj.fromLatLngToContainerPixel(new g.maps.LatLng(v.lat, v.lng));
        if (!p) continue;
        const x = p.x;
        const y = p.y;
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        if (x < -20 || y < -20 || x > w + 20 || y > h + 20) continue; // off-screen
        next.push({ id: v.id, x, y });
        if (v.id === selectedId) selected = { x, y };
        const pts = v.shape === 'NAV' ? NAV : ARROW;
        const rad = (v.heading * Math.PI) / 180;
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        ctx.beginPath();
        pts.forEach(([px, py], i) => {
          const rx = x + px * c - py * s;
          const ry = y + px * s + py * c;
          if (i === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        });
        ctx.closePath();
        ctx.fillStyle = v.fill;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = v.stroke;
        ctx.stroke();
      }
      if (selected) {
        ctx.beginPath();
        ctx.arc(selected.x, selected.y, 17, 0, Math.PI * 2);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#5728B2';
        ctx.stroke();
      }
      drawn = next;
    },
    hitTest(x, y) {
      let best: string | null = null;
      let bestD = HIT_RADIUS_PX * HIT_RADIUS_PX;
      for (const d of drawn) {
        const dd = (d.x - x) ** 2 + (d.y - y) ** 2;
        if (dd <= bestD) {
          bestD = dd;
          best = d.id;
        }
      }
      return best;
    },
    destroy() {
      overlay.setMap(null);
      drawn = [];
    },
  };
}
