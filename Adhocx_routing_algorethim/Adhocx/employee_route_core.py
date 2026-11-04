"""Provider-independent route-planning core with Google Maps transport adapters."""

from __future__ import annotations

import csv
import io
import math
from dataclasses import dataclass
from datetime import datetime, timedelta
from itertools import permutations
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests


@dataclass(frozen=True)
class PlannerConfig:
    login_time: datetime
    logout_time: datetime | None = None
    buffer_minutes: int = 15
    pickup_wait_minutes: int = 5
    cab_capacity: int = 3
    office_radius_km: float = 50.0
    routing_preference: str = "TRAFFIC_AWARE"
    avoid_tolls: bool = False
    avoid_highways: bool = False
    timezone_name: str = "UTC"
    max_employees: int = 1000
    earliest_departure: datetime | None = None


class GoogleMapsClient:
    def __init__(self, api_key: str, session: requests.Session | None = None) -> None:
        if not api_key:
            raise ValueError("GOOGLE_MAPS_API_KEY is required")
        self.api_key = api_key
        self.session = session or requests.Session()

    def geocode(self, address: str) -> dict:
        address = (address or "").strip()
        if not address:
            raise ValueError("Address cannot be blank")
        response = self.session.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={"address": address, "key": self.api_key},
            timeout=30,
        )
        response.raise_for_status()
        payload = response.json()
        if payload.get("status") != "OK" or not payload.get("results"):
            raise ValueError(f'Address could not be geocoded: "{address}" ({payload.get("status")})')
        result = payload["results"][0]
        location = result["geometry"]["location"]
        return {
            "lat": float(location["lat"]),
            "lng": float(location["lng"]),
            "matched_address": result.get("formatted_address", address),
            "partial_match": bool(result.get("partial_match", False)),
        }

    def route(self, origin: dict, stops: list[dict], destination: dict, departure: datetime,
              config: PlannerConfig) -> dict:
        body = {
            "origin": _lat_lng(origin),
            "destination": _lat_lng(destination),
            "travelMode": "DRIVE",
            "routingPreference": config.routing_preference,
            "departureTime": departure.isoformat(timespec="seconds"),
        }
        if stops:
            body["intermediates"] = [_lat_lng(stop) for stop in stops]
            if config.routing_preference == "TRAFFIC_AWARE":
                body["optimizeWaypointOrder"] = False
        if config.avoid_tolls or config.avoid_highways:
            body["routeModifiers"] = {
                "avoidTolls": config.avoid_tolls,
                "avoidHighways": config.avoid_highways,
            }
        response = self.session.post(
            "https://routes.googleapis.com/directions/v2:computeRoutes",
            json=body,
            headers={
                "X-Goog-Api-Key": self.api_key,
                "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.optimizedIntermediateWaypointIndex,routes.legs.duration,routes.legs.distanceMeters,routes.polyline.encodedPolyline,routes.legs.polyline.encodedPolyline",
            },
            timeout=45,
        )
        if not response.ok:
            message = response.text
            try:
                message = response.json().get("error", {}).get("message", message)
            except ValueError:
                pass
            raise RuntimeError(f"Google Routes API error: {message}")
        routes = response.json().get("routes", [])
        if not routes:
            raise RuntimeError("Google Routes returned no route")
        route = routes[0]
        return {
            "duration": route["duration"],
            "distanceMeters": float(route.get("distanceMeters", 0)),
            "optimizedIntermediateWaypointIndex": route.get("optimizedIntermediateWaypointIndex", list(range(len(stops)))),
            "legs": route.get("legs", []),
            "encodedPolyline": route.get("polyline", {}).get("encodedPolyline", ""),
        }


def _lat_lng(location: dict) -> dict:
    coord = location["coord"] if "coord" in location else location
    return {"location": {"latLng": {"latitude": coord["lat"], "longitude": coord["lng"]}}}


def haversine_km(first: dict, second: dict) -> float:
    earth_radius_km = 6371.0
    lat1, lng1 = math.radians(first["lat"]), math.radians(first["lng"])
    lat2, lng2 = math.radians(second["lat"]), math.radians(second["lng"])
    delta_lat, delta_lng = lat2 - lat1, lng2 - lng1
    value = math.sin(delta_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lng / 2) ** 2
    return 2 * earth_radius_km * math.asin(min(1.0, math.sqrt(value)))


def decode_google_polyline(encoded: str) -> list[list[float]]:
    points: list[list[float]] = []
    index = lat = lng = 0
    while index < len(encoded):
        values = []
        for _ in range(2):
            result = shift = 0
            while True:
                byte = ord(encoded[index]) - 63
                index += 1
                result |= (byte & 0x1F) << shift
                shift += 5
                if byte < 0x20:
                    break
            values.append(~(result >> 1) if result & 1 else result >> 1)
        lat += values[0]
        lng += values[1]
        points.append([lat / 1e5, lng / 1e5])
    return points


def parse_duration_seconds(value: str) -> float:
    if not isinstance(value, str) or not value.endswith("s"):
        raise ValueError(f"Invalid Google duration: {value}")
    return float(value[:-1])


def parse_employee_csv(csv_bytes: bytes) -> list[dict]:
    text = csv_bytes.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    normalized = {name.strip().casefold().replace(" ", "_"): name for name in (reader.fieldnames or []) if name}
    name_column = normalized.get("employee_name") or normalized.get("name")
    address_column = normalized.get("pickup_address") or normalized.get("address")
    if not name_column or not address_column:
        raise ValueError("CSV requires employee_name and pickup_address columns")
    employees = []
    names = set()
    for row_number, row in enumerate(reader, start=2):
        name = (row.get(name_column) or "").strip()
        address = (row.get(address_column) or "").strip()
        if not name and not address:
            continue
        if not name or not address:
            raise ValueError(f"CSV row {row_number} requires both employee_name and pickup_address")
        identity = name.casefold()
        if identity in names:
            raise ValueError(f"Duplicate employee_name: {name}")
        names.add(identity)
        employees.append({"employee_name": name, "pickup_address": address})
    if not employees:
        raise ValueError("Employee CSV contains no employees")
    return employees


def validate_config(config: PlannerConfig, employee_count: int) -> None:
    if config.login_time.tzinfo is None:
        raise ValueError("login_time must include timezone information")
    if config.logout_time and config.logout_time.tzinfo is None:
        raise ValueError("logout_time must include timezone information")
    if config.logout_time and config.logout_time < config.login_time:
        raise ValueError("logout_time cannot precede login_time")
    if not 0 <= config.buffer_minutes <= 180:
        raise ValueError("buffer_minutes must be between 0 and 180")
    if not 0 <= config.pickup_wait_minutes <= 60:
        raise ValueError("pickup_wait_minutes must be between 0 and 60")
    if not 1 <= config.cab_capacity <= 12:
        raise ValueError("cab_capacity must be between 1 and 12")
    if not 1 <= config.office_radius_km <= 500:
        raise ValueError("office_radius_km must be between 1 and 500")
    if config.routing_preference not in {"TRAFFIC_AWARE", "TRAFFIC_AWARE_OPTIMAL"}:
        raise ValueError("routing_preference must be TRAFFIC_AWARE or TRAFFIC_AWARE_OPTIMAL")
    if employee_count > config.max_employees:
        raise ValueError(f"Maximum employee count is {config.max_employees}")


def group_employees(employees: list[dict], capacity: int) -> list[list[dict]]:
    remaining = list(employees)
    groups = []
    while len(remaining) > capacity:
        best_group = None
        best_score = None
        for seed in remaining:
            nearest = sorted(
                (employee for employee in remaining if employee is not seed),
                key=lambda employee: haversine_km(seed["coord"], employee["coord"]),
            )[:max(capacity * 2, capacity - 1)]
            candidate = [seed, *nearest[:capacity - 1]]
            pairwise_km = sum(
                haversine_km(candidate[i]["coord"], candidate[j]["coord"])
                for i in range(len(candidate))
                for j in range(i + 1, len(candidate))
            )
            office_distances = [
                person["office_distance_km"]
                for person in candidate
            ]
            radial_spread_km = max(office_distances) - min(office_distances)
            score = pairwise_km + 0.35 * radial_spread_km
            if best_score is None or score < best_score:
                best_group, best_score = candidate, score
        groups.append(best_group)
        selected_ids = {id(employee) for employee in best_group}
        remaining = [employee for employee in remaining if id(employee) not in selected_ids]
    if remaining:
        groups.append(remaining)
    return groups


def clock(value: datetime) -> str:
    return value.strftime("%I:%M %p").lstrip("0")


def plan_routes(employees: list[dict], office: dict, office_name: str, config: PlannerConfig,
                maps: GoogleMapsClient, progress=None) -> dict:
    validate_config(config, len(employees))
    office_coord = maps.geocode(office_name)
    if progress:
        progress("office_geocoded", 5, {"office": office_name, "coordinates": office_coord})

    unique_addresses = []
    seen_addresses = set()
    for row in employees:
        key = row["pickup_address"].strip().casefold()
        if key not in seen_addresses:
            seen_addresses.add(key)
            unique_addresses.append(row["pickup_address"])
    geocode_cache = {}

    def geocode_address(address: str):
        return address, maps.geocode(address)

    workers = min(6, max(1, len(unique_addresses)))
    completed = 0
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = [executor.submit(geocode_address, address) for address in unique_addresses]
        for future in as_completed(futures):
            address, coord = future.result()
            geocode_cache[address.casefold()] = coord
            completed += 1
            if progress:
                progress("geocoded", 5 + int(completed / max(1, len(unique_addresses)) * 25),
                         {"completed": completed, "total": len(unique_addresses), "address": address})

    employee_records = []
    for row in employees:
        coord = dict(geocode_cache[row["pickup_address"].strip().casefold()])
        office_distance = haversine_km(coord, office_coord)
        employee_records.append({
            **row,
            "coord": coord,
            "office_distance_km": round(office_distance, 2),
            "out_of_radius": office_distance > config.office_radius_km,
        })

    routes = []
    groups = group_employees(employee_records, config.cab_capacity)
    for cab_number, group in enumerate(groups, start=1):
        driver = max(group, key=lambda person: person["office_distance_km"])
        pending = sorted(
            (person for person in group if person is not driver),
            key=lambda person: (-person["office_distance_km"], person["employee_name"].casefold()),
        )
        target = config.login_time - timedelta(minutes=config.buffer_minutes)
        earliest = config.earliest_departure or (config.login_time - timedelta(hours=12))
        initial = max(target - timedelta(hours=2), earliest)
        route = maps.route(driver, pending, office_coord, initial, config)
        dwell_seconds = len(group) * config.pickup_wait_minutes * 60
        departure = max(target - timedelta(seconds=parse_duration_seconds(route["duration"])
                                           + dwell_seconds), earliest)
        if abs((departure - initial).total_seconds()) > 60:
            route = maps.route(driver, pending, office_coord, departure, config)
            refined = max(target - timedelta(seconds=parse_duration_seconds(route["duration"])
                                             + dwell_seconds), earliest)
            if abs((refined - departure).total_seconds()) > 60:
                departure = refined
                route = maps.route(driver, pending, office_coord, departure, config)
        drive_seconds = parse_duration_seconds(route["duration"])
        arrival = departure + timedelta(seconds=drive_seconds + len(group) * config.pickup_wait_minutes * 60)

        ordering = route["optimizedIntermediateWaypointIndex"]
        ordered_stops = [pending[index] for index in ordering] if len(ordering) == len(pending) else pending
        people = [driver, *ordered_stops]
        legs = route["legs"]
        if len(legs) != len(group):
            raise RuntimeError(f"Google returned {len(legs)} legs for {len(group)} pickups")
        leg_seconds = [parse_duration_seconds(leg["duration"]) for leg in legs]
        if leg_seconds:
            leg_seconds[-1] += drive_seconds - sum(leg_seconds)

        current = departure
        stops = []
        segments = []
        for index, person in enumerate(people):
            dwell_until = current + timedelta(minutes=config.pickup_wait_minutes)
            next_name = people[index + 1]["employee_name"] if index + 1 < len(people) else office_name
            leg_arrival = dwell_until + timedelta(seconds=leg_seconds[index])
            stops.append({
                "name": person["employee_name"],
                "address": person["pickup_address"],
                "matched_address": person["coord"]["matched_address"],
                "lat": person["coord"]["lat"],
                "lng": person["coord"]["lng"],
                "eta": clock(current),
                "dwell_until": clock(dwell_until),
                "next_stop": next_name,
                "travel_to_next_minutes": round(leg_seconds[index] / 60, 1),
                "distance_to_next_km": round(float(legs[index].get("distanceMeters", 0)) / 1000, 2),
                "arrival_at_next": clock(leg_arrival),
                "office_distance_km": person["office_distance_km"],
                "out_of_radius": person["out_of_radius"],
            })
            segments.append({
                "from": person["employee_name"], "to": next_name,
                "depart": clock(dwell_until), "arrive": clock(leg_arrival),
                "minutes": round(leg_seconds[index] / 60, 1),
                "distance_km": round(float(legs[index].get("distanceMeters", 0)) / 1000, 2),
            })
            current = leg_arrival
        routes.append({
            "cab": cab_number,
            "driver_start": driver["employee_name"] + " - " + driver["pickup_address"],
            "sequence": " -> ".join([person["employee_name"] for person in people] + [office_name]),
            "stops": stops,
            "segments": segments,
            "departure": clock(departure),
            "arrival": clock(arrival),
            "distance_km": round(float(route.get("distanceMeters", 0)) / 1000, 2),
            "drive_minutes": round(drive_seconds / 60, 1),
            "status": "Meets deadline" if arrival <= config.login_time else "Misses deadline",
            "buffer_status": "Meets buffer" if arrival <= target else "Misses buffer",
            "time_source": "Google Routes traffic aware",
            "path": decode_google_polyline(route["encodedPolyline"]),
            "_departure_sort": departure,
        })
        if progress:
            progress("route_complete", 30 + int(len(routes) / max(1, len(groups)) * 70),
                     {"route": routes[-1], "completed": len(routes), "total": len(groups)})
    routes.sort(key=lambda route: route["_departure_sort"])
    for index, route in enumerate(routes, start=1):
        route["cab"] = index
        del route["_departure_sort"]
    return {
        "employee_count": len(employee_records),
        "cab_count": len(routes),
        "office_radius_km": config.office_radius_km,
        "out_of_radius_count": sum(employee["out_of_radius"] for employee in employee_records),
        "office": {"name": office_name, **office_coord},
        "buffered_deadline": clock(config.login_time - timedelta(minutes=config.buffer_minutes)),
        "routes": routes,
    }
