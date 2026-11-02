# 03 — ROUTE OPTIMIZATION & CAPACITY SOLVER

**Product:** AdhocX Direct Corporate Managed Transport (ETS)  
**Document:** Route Optimization & Vehicle Routing Problem (VRP) Specification  
**Status:** Source of Truth Baseline  
**Version:** 2.0 (Hyderabad Enterprise ETS Pilot)  
**Company:** Estemporaneo Technologies Private Limited  

---

> ### ⚠️ MANDATORY DESIGN & IMPLEMENTATION DIRECTIVE FOR ALL AI AGENTS & ENGINEERS
> Every AI agent, prompt, developer, and automated assistant modifying or contributing to this codebase **MUST STRICTLY ADHERE** to the project's foundational guidelines:
> 1. **Visual Foundation:** [`docs/04_DESIGN_SYSTEM.md`](file:///c:/Users/saavi/Desktop/adhocx/docs/04_DESIGN_SYSTEM.md) (Colors, Typography, Spacing, Tokens, Radius, Component Styling)
> 2. **Interaction & User Journey Rules:** [`docs/05_UI_UX_GUIDELINES.md`](file:///c:/Users/saavi/Desktop/adhocx/docs/05_UI_UX_GUIDELINES.md) (Information Architecture, Screen States, Error Handling, Navigation)
> 3. **Engineering Authority & Constraints:** [`docs/20_AI_AGENT_RULES.md`](file:///c:/Users/saavi/Desktop/adhocx/docs/20_AI_AGENT_RULES.md) (Correctness > Architecture > Security > Speed. Zero hallucinated business rules. Preserved integrity).

---

# 1. Problem Formulation: Capacitated VRP with Time Windows (CVRPTW)

Corporate employee transportation requires solving a multi-vehicle, multi-stop routing problem where employees must be collected from residential locations and delivered to a corporate hub prior to shift login, or picked up from the hub at shift logout and dropped at home.

The routing engine uses **Google OR-Tools** to guarantee deterministic constraint fulfillment:
- Objective: Minimize total fleet operating cost and overall vehicle travel distance, while enforcing strict arrival punctuality and passenger ride-time limits.

---

# 2. Vehicle Capacity Models & Real-World Calculations

### 2.1 Vehicle Class Constraints

| Vehicle Class | Licensed Seating | Max Corporate Passengers ($C$) | Configuration Notes |
| :--- | :---: | :---: | :--- |
| **Sedan** (e.g. Dzire, Etios) | 5 Seats | **4 Employees** | Front passenger seat + 3 rear passengers. |
| **SUV** (e.g. Ertiga, Innova) | 7 Seats | **6 Employees** | Front passenger + 2 middle + 3 third row. |

### 2.2 Corporate Client Fleet Calculation (User Pilot Example)
Consider Company X with **500 employees** requiring daily corporate transport:
- **Total Demand:** 500 employee transport requests.
- **Vehicle Type Requested:** Sedan ($C = 4$).
- **Theoretical Fleet Needed:**
  $$N_{\text{cabs}} = \left\lceil \frac{500}{4} \right\rceil = 125\text{ cabs}$$
- **Shift Distribution:** Demand is divided across two login shifts:
  1. **Batch 1 (08:00 AM Login):** 250 employees $\implies 250 / 4 \approx 62$ passengers / ~25-30 shared vehicle routes.
  2. **Batch 2 (09:00 AM Login):** 250 employees $\implies 250 / 4 \approx 62$ passengers / ~25-30 shared vehicle routes.
- **Total Route Plans Generated:** Approximately **50–60 optimized routes** across the two morning login batches, and mirrored for the evening logout batches (05:00 PM and 06:00 PM).

---

# 3. Route Duration & Stop Buffer Formula

The solver enforces exact dwell times and travel dynamics:

```text
[Stop 1: Home A] ──(+5 min buffer)──> [Stop 2: Home B] ──(+5 min buffer)──> [Stop 3: Home C] ──(+5 min buffer)──> [Stop 4: Home D] ──(+5 min buffer)──> [Corporate Office Hub]
```

### Mathematical Breakdown:
1. **Dynamic Driving Time ($T_{\text{drive}}$):**
   - Direct driving duration computed via Google Maps Matrix API between stops and the destination hub.
   - Baseline highway/arterial transit time: **90 minutes (1.5 hours)**.
2. **Stop Buffer Dwell Time ($T_{\text{dwell}}$):**
   - Each pickup stop carries an immutable buffer of **5.0 minutes** for employee boarding and OTP exchange.
   - For a 4-passenger sedan:
     $$T_{\text{dwell\_total}} = 4 \text{ stops} \times 5\text{ minutes} = 20\text{ minutes}$$
3. **Total Route Time ($T_{\text{route}}$):**
   $$T_{\text{route}} = T_{\text{drive}} + T_{\text{dwell\_total}} = 90\text{ min} + 20\text{ min} = 110\text{ min (1 hr 50 min)} \approx 2\text{ hours}$$
4. **Calculated Arrival at First Pickup ($t_{\text{pickup\_1}}$):**
   - For an **08:00 AM** shift login:
     $$t_{\text{pickup\_1}} = 08:00\text{ AM} - 01:50 = 06:10\text{ AM (Target arrival window: 06:00 AM – 06:10 AM)}$$

---

# 4. Hard & Soft Optimization Constraints

### 4.1 Hard Constraints (Must NEVER be Violated)
1. **Capacity Limit:** Total passengers assigned to any vehicle must not exceed $C$ (Sedan = 4, SUV = 6).
2. **On-Time Office Arrival:** Vehicle arrival time at office destination $\le \text{Shift Login Time} - 10\text{ min}$ (providing a 10-minute entry buffer).
3. **Maximum Employee Ride Time (MERT):** No passenger may remain inside a moving cab for longer than **120 minutes (2.0 hours)**.
4. **Female Passenger Safety Constraints (Night Shifts):**
   - For pickups between 20:00 and 06:00, a female employee must NOT be the first passenger picked up or the last passenger dropped off unless a security escort is assigned.
5. **No Overlapping Driver Duties:** A driver cannot be committed to two conflicting routes.

### 4.2 Soft Constraints (Cost Penalties in Solver)
- Minimize total route travel distance (penalty weight: $\alpha = 1.0$).
- Minimize total transit time (penalty weight: $\beta = 1.5$).
- Minimize route variance across vehicles to achieve balanced utilization.

---

# 5. Solver Implementation Architecture

```python
# Pseudo-implementation using Google OR-Tools CVRPTW
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

def solve_corporate_routes(distance_matrix, time_matrix, demands, vehicle_capacities, shift_deadline):
    # 1. Create routing index manager
    manager = pywrapcp.RoutingIndexManager(len(distance_matrix), len(vehicle_capacities), 0)
    routing = pywrapcp.RoutingModel(manager)

    # 2. Add capacity constraint (Sedan: 4 passengers)
    def demand_callback(from_index):
        node = manager.IndexToNode(from_index)
        return demands[node]

    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index, 0, vehicle_capacities, True, "Capacity"
    )

    # 3. Add time dimension with 5-minute dwell time
    def time_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        # 5 minutes buffer (300s) added at each pickup node
        dwell_time = 300 if from_node != 0 else 0
        return time_matrix[from_node][to_node] + dwell_time

    time_callback_index = routing.RegisterTransitCallback(time_callback)
    routing.AddDimension(
        time_callback_index,
        slack_max=600,       # 10 min slack
        capacity=7200,      # Max 2 hours (7200s) route duration
        fix_start_cumul_to_zero=False,
        name="Time"
    )

    # 4. Set search parameters
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_parameters.time_limit.seconds = 30

    # 5. Solve and return structured route plans
    solution = routing.SolveWithParameters(search_parameters)
    return format_route_solution(solution, routing, manager)
```

---

# 6. Versioning, Audit & Re-optimization Triggers

- **Route Plan Versioning:** Every output receives an immutable version tag (`v1`, `v2`, etc.).
- **Unserved Demand Reporting:** If the solver cannot seat an employee without violating hard constraints (e.g. isolated home location $> 40\text{ km}$ away), that request is flagged as `UNSERVED` with the explicit diagnostic reason (`EXCEEDS_MAX_RIDE_TIME`).
- **Dynamic Re-optimization:** When an employee cancels or reschedules (see Doc 06), affected routes trigger a localized re-solve rather than mutating un-impacted clusters.

---
*Refer to `04_AUTONOMOUS_DISPATCH_AND_H3_ROUTING_ENGINE.md` for the driver assignment process.*

