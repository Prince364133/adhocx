"""AdhocX minimum-cost cab grouping and pricing."""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True)
class CabType:
    name: str
    capacity: int
    fleet_count: int
    fixed_charge: float
    per_km_charge: float
    distance_slabs: tuple[tuple[float, float], ...] = ()


@dataclass(frozen=True)
class PricingConfig:
    cab_types: tuple[CabType, ...]
    employee_revenue: float = 0.0
    revenue_per_km: float = 0.0


@dataclass
class OptimizedRouteCost:
    cab_type: str
    distance_km: float
    driver_payout: float
    revenue: float


DEFAULT_CAB_TYPES = (
    CabType("sedan", 4, 20, 350.0, 14.0, ((10.0, 14.0), (25.0, 12.0), (float("inf"), 10.0))),
    CabType("suv", 6, 10, 500.0, 16.0, ((10.0, 16.0), (25.0, 14.0), (float("inf"), 12.0))),
)


def load_pricing(path: str | Path | None = None) -> PricingConfig:
    default_path = Path(__file__).resolve().parent / "adhocx_pricing.json"
    source = Path(path) if path else default_path
    if not source.exists():
        return PricingConfig(DEFAULT_CAB_TYPES)
    data = json.loads(source.read_text(encoding="utf-8"))
    cab_types = tuple(
        CabType(
            name=item["name"],
            capacity=int(item["capacity"]),
            fleet_count=int(item.get("fleet_count", 0)),
            fixed_charge=float(item["fixed_charge"]),
            per_km_charge=float(item["per_km_charge"]),
            distance_slabs=tuple(
                (float(slab["up_to_km"]), float(slab["rate_per_km"]))
                for slab in item.get("distance_slabs", [])
            ),
        )
        for item in data["cab_types"]
    )
    return PricingConfig(
        cab_types=cab_types,
        employee_revenue=float(data.get("employee_revenue", 0)),
        revenue_per_km=float(data.get("revenue_per_km", 0)),
    )


def distance_charge(distance_km: float, cab: CabType) -> float:
    if not cab.distance_slabs:
        return cab.fixed_charge + distance_km * cab.per_km_charge
    remaining = max(0.0, distance_km)
    previous_limit = 0.0
    variable = 0.0
    for limit, rate in cab.distance_slabs:
        slab_distance = min(remaining, max(0.0, limit - previous_limit))
        variable += slab_distance * rate
        remaining -= slab_distance
        if remaining <= 0.000001:
            break
        previous_limit = limit
    if remaining > 0.000001:
        variable += remaining * cab.per_km_charge
    return cab.fixed_charge + variable


def bearing(first: dict, second: dict) -> float:
    lat1 = math.radians(first["lat"])
    lat2 = math.radians(second["lat"])
    delta_lng = math.radians(second["lng"] - first["lng"])
    y = math.sin(delta_lng) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(delta_lng)
    return math.degrees(math.atan2(y, x)) % 360


def angular_distance(first: float, second: float) -> float:
    difference = abs(first - second) % 360
    return min(difference, 360 - difference)


def corridor_penalty(employee: dict, office: dict, group: list[dict]) -> float:
    employee_bearing = bearing(office, employee["coord"])
    office_bearings = [bearing(office, person["coord"]) for person in group]
    return max([angular_distance(employee_bearing, value) for value in office_bearings] or [0.0])


def cheapest_cab(distance_km: float, employees: int, pricing: PricingConfig,
                 fleet_used: dict[str, int]) -> CabType | None:
    choices = [
        cab for cab in pricing.cab_types
        if cab.capacity >= employees and fleet_used.get(cab.name, 0) < cab.fleet_count
    ]
    if not choices:
        return None
    return min(choices, key=lambda cab: distance_charge(distance_km, cab))


def optimize_groups(employees: list[dict], office: dict, pricing: PricingConfig,
                    max_capacity: int, max_trip_km: float) -> list[list[dict]]:
    remaining = list(employees)
    groups: list[list[dict]] = []
    while remaining:
        if not groups:
            seed = max(remaining, key=lambda person: person["office_distance_km"])
        else:
            seed = min(
                remaining,
                key=lambda person: min(
                    180 - angular_distance(bearing(office, person["coord"]),
                                           bearing(office, member["coord"]))
                    for group in groups
                    for member in group
                ),
            )
        remaining.remove(seed)
        group = [seed]
        limit = min(max_capacity, max((cab.capacity for cab in pricing.cab_types), default=max_capacity))
        while len(group) < limit and remaining:
            candidate = min(
                remaining,
                key=lambda person: (
                    corridor_penalty(person, office, group) * 0.4
                    + angular_distance(bearing(person["coord"], office),
                                       bearing(group[-1]["coord"], office))
                ),
            )
            proposed = [*group, candidate]
            road_estimate = sum(
                person["office_distance_km"] for person in proposed
            ) / max(1, len(proposed) - 1)
            if road_estimate > max_trip_km:
                break
            group.append(candidate)
            remaining.remove(candidate)
        groups.append(group)
    return merge_compatible_groups(groups, office, max_capacity, max_trip_km)


def merge_compatible_groups(groups: list[list[dict]], office: dict, capacity: int,
                            max_trip_km: float) -> list[list[dict]]:
    changed = True
    while changed:
        changed = False
        for first_index in range(len(groups)):
            for second_index in range(first_index + 1, len(groups)):
                merged = groups[first_index] + groups[second_index]
                if len(merged) > capacity:
                    continue
                corridor = max(
                    angular_distance(bearing(office, left["coord"]), bearing(office, right["coord"]))
                    for left in groups[first_index]
                    for right in groups[second_index]
                )
                if corridor > 55:
                    continue
                office_span = max(person["office_distance_km"] for person in merged)
                if office_span <= max_trip_km:
                    groups[first_index] = merged
                    del groups[second_index]
                    changed = True
                    break
            if changed:
                break
    return groups
