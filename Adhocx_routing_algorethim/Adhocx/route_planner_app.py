"""Local Google Maps employee pickup planner.

Install: pip install -r requirements.txt
Run: python route_planner_app.py
The Google API key is loaded from the local .env file.
"""

from __future__ import annotations

import csv
import io
import math
import os
from pathlib import Path
from queue import Queue
from threading import Thread
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template_string, request, send_file

from employee_route_core import GoogleMapsClient, PlannerConfig, parse_employee_csv, plan_routes

load_dotenv()
app = Flask(__name__)
TZ_NAME = os.environ.get("APP_TIMEZONE", "UTC").strip() or "UTC"
TZ = ZoneInfo(TZ_NAME)
API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY", "").strip()
BROWSER_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_BROWSER_API_KEY", API_KEY).strip()
GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"
ROOT = Path(__file__).resolve().parent
app.config["MAX_CONTENT_LENGTH"] = 1_000_000

PAGE = r"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Employee Pickup Planner</title>
    <style>
        #map { height: min(72vh, 760px); min-height: 460px; width: 100%; }
        #route-summary { display: grid; grid-template-columns: repeat(5, minmax(110px, 1fr)); gap: 1px; margin: 1rem 0; background: #d7dddf; border: 1px solid #d7dddf; }
        .summary-metric { background: #f5f7f7; padding: 0.75rem 1rem; }
        .summary-metric span { display: block; font-size: 0.75rem; color: #53636b; }
        .summary-metric strong { display: block; margin-top: 0.25rem; font-size: 1.25rem; }
        #planner-layout { display: grid; grid-template-columns: minmax(270px, 350px) minmax(0, 1fr); gap: 1rem; align-items: start; }
        #route-panel { max-height: 72vh; overflow-y: auto; border: 1px solid #d7dddf; }
        #route-panel h2 { position: sticky; top: 0; margin: 0; padding: 0.85rem 1rem; background: #f5f7f7; border-bottom: 1px solid #d7dddf; font-size: 1rem; }
        .route-card { border-bottom: 1px solid #d7dddf; }
        .route-select { width: 100%; padding: 0.8rem 1rem; border: 0; background: #fff; text-align: left; cursor: pointer; }
        .route-select[aria-expanded="true"] { background: #eaf1f2; }
        .route-select span { display: block; }
        .route-select .route-subtitle { margin-top: 0.3rem; color: #53636b; font-size: 0.85rem; }
        .route-details { padding: 0 1rem 0.8rem; font-size: 0.9rem; }
        .route-details ol { padding-left: 1.2rem; }
        .route-details li { padding: 0.25rem 0; }
        .route-detail-meta { color: #53636b; }
        .radius-alert { color: #b91c1c; font-weight: 700; }
        @media (max-width: 780px) {
            #planner-layout { grid-template-columns: 1fr; }
            #route-panel { max-height: 40vh; }
            #map { min-height: 400px; }
            #route-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
    </style>
</head>
<body>
  <h1>Employee Pickup Planner</h1>
  <form id="planner">
    <p><label>Office destination / central location<br><input name="office" required size="70" value=""></label></p>
    <p><label>Maximum straight-line radius from office (km)<br><input name="office_radius_km" type="number" min="1" max="500" step="1" value="50" required></label></p>
    <p><label>Required arrival date and time<br><input name="deadline" type="datetime-local" required value="{{ deadline }}"></label></p>
        <p><label>Pickup dwell time per employee (minutes)<br><input name="stop_minutes" type="number" min="0" max="60" value="5" required></label></p>
    <p><label>Safety buffer before login (minutes)<br><input name="buffer_minutes" type="number" min="0" max="180" value="15" required></label></p>
    <p><label>Maximum passengers per cab<br><input name="capacity" type="number" min="1" max="12" value="3" required></label></p>
        <p><label>Traffic routing quality<br>
            <select name="routing_preference"><option value="TRAFFIC_AWARE" selected>Traffic-aware, optimize pickup order</option><option value="TRAFFIC_AWARE_OPTIMAL">Traffic-aware optimal, preserve pickup order</option></select>
        </label></p>
        <p><label><input name="avoid_tolls" type="checkbox" value="true"> Avoid toll roads</label><br>
            <label><input name="avoid_highways" type="checkbox" value="true"> Avoid highways</label></p>
    <p><a href="/sample.csv" download>Download sample employee CSV</a></p>
    <p><label>Upload employee CSV<br><input name="employees_csv" type="file" accept=".csv,text/csv" required></label></p>
    <button type="submit">Calculate routes</button>
    <button type="button" id="download" disabled>Download CSV</button>
  </form>
  <p id="status" role="status"></p>
    <div id="route-summary" hidden></div>
    <div id="planner-layout">
        <aside id="route-panel" aria-label="Calculated routes">
            <h2>Routes</h2>
            <div id="route-list"><p>Calculate routes to see route details.</p></div>
        </aside>
        <div id="map" aria-label="Planned pickup routes"></div>
    </div>
    <p>Google geocodes pickup addresses and uses traffic-aware road routing. Pickup groups use geographic proximity; each driver is assumed to start at one group's employee location. Traffic estimates are not guarantees.</p>
  <script>
    const colors = ['#c2410c', '#047857', '#1d4ed8', '#a21caf', '#b91c1c', '#0e7490', '#4d7c0f', '#7c2d12'];
    let currentPlan = [];
        let map;
        let routeLines = [];
        let routeMarkers = new Map();
        let detailMarkers = [];
        let officeMarker;
        let officeRadiusCircle;
        let selectedCab = null;
        let infoWindow;

        window.initializePlannerMap = function() {
            map = new google.maps.Map(document.getElementById('map'), {
                center: {lat: 17.385, lng: 78.4867}, zoom: 11,
                mapTypeControl: true, fullscreenControl: true
            });
            infoWindow = new google.maps.InfoWindow();
            map.addListener('zoom_changed', updateDetailMarkers);
        };

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    }

        function renderRouteList() {
            const list = document.getElementById('route-list');
            list.innerHTML = currentPlan.routes.map(route => {
                const selected = route.cab === selectedCab;
                const pickupDetails = route.stops.map((stop, index) => `
                    <li><b>${String.fromCharCode(65 + index)}. ${escapeHtml(stop.name)}</b><br>
                        ${escapeHtml(stop.matched_address)}<br>
                        ${stop.out_of_radius ? `<span class="radius-alert">OUTSIDE ${escapeHtml(currentPlan.office_radius_km)} km · ${escapeHtml(stop.office_distance_km)} km from office</span><br>` : `${escapeHtml(stop.office_distance_km)} km from office<br>`}
                        Pickup ${escapeHtml(stop.eta)}; dwell until ${escapeHtml(stop.dwell_until)}
                    </li>`).join('');
                const legDetails = route.segments.map(segment => `
                    <li><b>${escapeHtml(segment.from)} to ${escapeHtml(segment.to)}</b><br>
                        Depart ${escapeHtml(segment.depart)}; ${escapeHtml(segment.minutes)} min; ${escapeHtml(segment.distance_km)} km; arrive ${escapeHtml(segment.arrive)}
                    </li>`).join('');
                return `<article class="route-card">
                    <button class="route-select" type="button" data-route-id="${route.cab}" aria-expanded="${selected}">
                        <span><b>Route ${route.cab}</b> · ${escapeHtml(route.stops.length)} pickups</span>
                        <span class="route-subtitle">${escapeHtml(route.departure)} → ${escapeHtml(route.arrival)} · ${escapeHtml(route.distance_km)} km · ${route.stops.filter(stop => stop.out_of_radius).length} outside radius · ${escapeHtml(route.status)}</span>
                    </button>
                    <div class="route-details" ${selected ? '' : 'hidden'}>
                        <p>Driver starts at ${escapeHtml(route.driver_start)}<br>Driving ${escapeHtml(route.drive_minutes)} min · ${escapeHtml(route.buffer_status)}</p>
                        <h3>Pickups</h3><ol>${pickupDetails}</ol>
                        <h3>Leg estimates</h3><ol>${legDetails}</ol>
                    </div>
                </article>`;
            }).join('');
        }

        function selectRoute(cab, focusMap = true) {
            selectedCab = cab;
            renderRouteList();
            updateDetailMarkers();
            if (!focusMap) return;
            const route = currentPlan.routes.find(item => item.cab === cab);
            if (!route) return;
            const bounds = new google.maps.LatLngBounds();
            route.path.forEach(([lat, lng]) => bounds.extend({lat, lng}));
            if (currentPlan.office) bounds.extend({lat: currentPlan.office.lat, lng: currentPlan.office.lng});
            if (!bounds.isEmpty()) {
                google.maps.event.addListenerOnce(map, 'idle', () => {
                    if (map.getZoom() < 14) map.setZoom(14);
                    updateDetailMarkers();
                });
                map.fitBounds(bounds, 48);
            }
        }

        function updateDetailMarkers() {
            if (!map || !currentPlan.routes.length) return;
            detailMarkers.forEach(marker => marker.setMap(null));
            detailMarkers = [];
            const bounds = map.getBounds();
            const zoom = map.getZoom() || 0;
            currentPlan.routes.forEach((route, routeIndex) => {
                const inView = bounds && route.stops.some(stop => bounds.contains({lat: stop.lat, lng: stop.lng}));
                const showStops = route.cab === selectedCab || (zoom >= 14 && inView);
                const routeMarker = routeMarkers.get(route.cab);
                if (routeMarker) routeMarker.setMap(showStops ? null : map);
                if (!showStops) return;
                const color = colors[(route.cab - 1) % colors.length];
                route.stops.forEach((stop, stopIndex) => {
                    const label = String.fromCharCode(65 + stopIndex);
                    const marker = new google.maps.Marker({
                        position: {lat: stop.lat, lng: stop.lng}, map,
                        label: {text: label, color: '#fff'}, title: `${stop.name} · Pickup ${stop.eta}${stop.out_of_radius ? ' · OUTSIDE OFFICE RADIUS' : ''}`,
                        icon: {path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: stop.out_of_radius ? '#b91c1c' : color, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2},
                        zIndex: 100 + routeIndex
                    });
                    marker.addListener('click', () => {
                        const segment = route.segments[stopIndex];
                        const radiusNote = stop.out_of_radius ? `<br><b style="color:#b91c1c">Outside ${escapeHtml(currentPlan.office_radius_km)} km office radius · ${escapeHtml(stop.office_distance_km)} km away</b>` : `<br>${escapeHtml(stop.office_distance_km)} km from office`;
                        const content = `<b>${label}. ${escapeHtml(stop.name)}</b><br>${escapeHtml(stop.matched_address)}${radiusNote}<br>Pickup ${escapeHtml(stop.eta)} · wait through ${escapeHtml(stop.dwell_until)}<br>To ${escapeHtml(segment.to)}: ${escapeHtml(segment.minutes)} min, ${escapeHtml(segment.distance_km)} km<br>Estimated arrival: ${escapeHtml(segment.arrive)}`;
                        infoWindow.setContent(content);
                        infoWindow.open({anchor: marker, map});
                    });
                    detailMarkers.push(marker);
                });
            });
        }

        function showPlan(plan) {
            if (!map) throw new Error('Google Maps did not load. Check the browser key and Maps JavaScript API configuration.');
            routeLines.forEach(line => line.setMap(null));
            routeMarkers.forEach(marker => marker.setMap(null));
            detailMarkers.forEach(marker => marker.setMap(null));
            if (officeMarker) officeMarker.setMap(null);
            if (officeRadiusCircle) officeRadiusCircle.setMap(null);
            routeLines = [];
            routeMarkers = new Map();
            detailMarkers = [];
            currentPlan = plan;
            selectedCab = null;
            const bounds = new google.maps.LatLngBounds();

            currentPlan.routes.forEach((route, index) => {
                const color = colors[index % colors.length];
                const path = route.path.map(([lat, lng]) => ({lat, lng}));
                const line = new google.maps.Polyline({path, geodesic: true, strokeColor: color, strokeOpacity: 0.75, strokeWeight: 4, map});
                line.addListener('click', () => selectRoute(route.cab));
                routeLines.push(line);
                path.forEach(point => bounds.extend(point));

                const firstStop = route.stops[0];
                if (firstStop) {
                    const marker = new google.maps.Marker({
                        position: {lat: firstStop.lat, lng: firstStop.lng}, map,
                        label: {text: `R${route.cab}`, color: '#fff'}, title: `Route ${route.cab} · ${route.stops.length} pickups`,
                        icon: {path: google.maps.SymbolPath.CIRCLE, scale: 12, fillColor: color, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2},
                        zIndex: 50 + index
                    });
                    marker.addListener('click', () => selectRoute(route.cab));
                    routeMarkers.set(route.cab, marker);
                }
            });

            if (currentPlan.office) {
                const office = currentPlan.office;
                officeRadiusCircle = new google.maps.Circle({
                    map,
                    center: {lat: office.lat, lng: office.lng},
                    radius: currentPlan.office_radius_km * 1000,
                    strokeColor: '#176b87', strokeOpacity: 0.8, strokeWeight: 2,
                    fillColor: '#176b87', fillOpacity: 0.035,
                    clickable: false
                });
                officeMarker = new google.maps.Marker({
                    position: {lat: office.lat, lng: office.lng}, map,
                    label: {text: 'HQ', color: '#fff'}, title: `Office · ${office.name}`,
                    icon: {path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW, scale: 7, fillColor: '#166534', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2},
                    zIndex: 1000
                });
                officeMarker.addListener('click', () => {
                    const content = document.createElement('div');
                    content.textContent = `Office: ${office.name} · ${currentPlan.office_radius_km} km radius`;
                    infoWindow.setContent(content);
                    infoWindow.open({anchor: officeMarker, map});
                });
                bounds.extend({lat: office.lat, lng: office.lng});
            }

            const metBuffer = currentPlan.routes.filter(route => route.buffer_status === 'Meets buffer').length;
            const outOfRadius = currentPlan.out_of_radius_count;
            document.getElementById('route-summary').innerHTML = `
                <div class="summary-metric"><span>Routes</span><strong>${currentPlan.cab_count}</strong></div>
                <div class="summary-metric"><span>Employees</span><strong>${currentPlan.employee_count}</strong></div>
                <div class="summary-metric"><span>Meet login</span><strong>${currentPlan.routes.filter(route => route.status === 'Meets deadline').length} / ${currentPlan.cab_count}</strong></div>
                <div class="summary-metric"><span>Meet buffer</span><strong>${metBuffer} / ${currentPlan.cab_count}</strong></div>
                <div class="summary-metric"><span>Outside ${currentPlan.office_radius_km} km radius</span><strong class="${outOfRadius ? 'radius-alert' : ''}">${outOfRadius}</strong></div>`;
            document.getElementById('route-summary').hidden = false;
            renderRouteList();
            if (!bounds.isEmpty()) map.fitBounds(bounds, 40);
            updateDetailMarkers();
            document.getElementById('download').disabled = false;
        }

        document.getElementById('route-list').addEventListener('click', event => {
            const button = event.target.closest('[data-route-id]');
            if (button) selectRoute(Number(button.dataset.routeId));
        });

    document.getElementById('planner').addEventListener('submit', async event => {
      event.preventDefault();
            document.getElementById('status').textContent = 'Geocoding locations and calculating traffic-aware Google routes...';
    document.getElementById('route-list').replaceChildren();
    document.getElementById('route-summary').hidden = true;
      document.getElementById('download').disabled = true;
      try {
                const data = new FormData(event.currentTarget);
        const response = await fetch('/api/plan', {
                    method: 'POST', body: data
        });
        const contentType = response.headers.get('content-type') || '';
        const result = contentType.includes('application/json')
          ? await response.json()
          : {error: await response.text()};
        if (!response.ok) throw new Error(result.error || 'Route calculation failed.');
        showPlan(result);
        document.getElementById('status').textContent = 'Route plan ready.';
      } catch (error) {
        document.getElementById('status').textContent = error.message;
      }
    });

    document.getElementById('download').addEventListener('click', () => {
            const columns = ['Route', 'Employee', 'Pickup address', 'Matched place', 'Distance from office km', 'Radius limit km', 'Radius status', 'Pickup ETA', 'Wait until', 'Next stop', 'Drive to next min', 'Leg distance km', 'Arrival at next', 'Driver start', 'Office', 'Route departure', 'Office arrival', 'Route distance km', 'Login status', 'Buffer status', 'Time source'];
            const rows = [columns, ...currentPlan.routes.flatMap(route => route.stops.map(stop => [route.cab, stop.name, stop.address, stop.matched_address, stop.office_distance_km, currentPlan.office_radius_km, stop.out_of_radius ? 'OUTSIDE RADIUS' : 'Inside radius', stop.eta, stop.dwell_until, stop.next_stop, stop.travel_to_next_minutes, stop.distance_to_next_km, stop.arrival_at_next, route.driver_start, route.destination, route.departure, route.arrival, route.distance_km, route.status, route.buffer_status, route.time_source]))];
      const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([csv], {type: 'text/csv'}));
      link.download = 'employee_pickup_plan.csv';
      link.click();
      URL.revokeObjectURL(link.href);
    });
  </script>
    {% if browser_maps_key %}
    <script async defer src="https://maps.googleapis.com/maps/api/js?key={{ browser_maps_key|urlencode }}&callback=initializePlannerMap&loading=async&v=weekly"></script>
    {% else %}
    <script>document.getElementById('status').textContent = 'Set GOOGLE_MAPS_API_KEY in .env and enable Maps JavaScript API, Routes API, and Geocoding API.';</script>
    {% endif %}
</body>
</html>"""


def haversine_km(a: dict, b: dict) -> float:
    radius = 6371.0
    lat1, lon1 = math.radians(a["lat"]), math.radians(a["lng"])
    lat2, lon2 = math.radians(b["lat"]), math.radians(b["lng"])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    value = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(value))


def group_employees(employees: list[dict], capacity: int) -> list[list[dict]]:
    remaining = list(employees)
    groups = []
    while len(remaining) > capacity:
        best_group = None
        best_cost = None
        for seed in remaining:
            nearest = sorted(
                (person for person in remaining if person is not seed),
                key=lambda person: haversine_km(seed["coord"], person["coord"]),
            )[: max(capacity * 2, capacity - 1)]
            group = [seed, *nearest[: capacity - 1]]
            pairwise_km = sum(
                haversine_km(group[i]["coord"], group[j]["coord"])
                for i in range(len(group))
                for j in range(i + 1, len(group))
            )
            office_distances = [person["office_distance_km"] for person in group]
            radial_spread_km = max(office_distances) - min(office_distances)
            cost = pairwise_km + 0.35 * radial_spread_km
            if best_cost is None or cost < best_cost:
                best_group, best_cost = group, cost
        groups.append(best_group)
        chosen = {person["name"] for person in best_group}
        remaining = [person for person in remaining if person["name"] not in chosen]
    if remaining:
        groups.append(remaining)
    return groups


def geocode(address: str) -> dict:
    response = requests.get(
        GEOCODE_URL,
        params={"address": address, "key": API_KEY},
        timeout=30,
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("status") != "OK" or not payload.get("results"):
        raise ValueError(
            f'Google Geocoding could not match "{address}" ({payload.get("status", "no result")}).'
        )
    result = payload["results"][0]
    location = result["geometry"]["location"]
    return {
        "lat": float(location["lat"]),
        "lng": float(location["lng"]),
        "matched_address": result.get("formatted_address", address),
        "partial_match": bool(result.get("partial_match", False)),
    }


def decode_polyline(encoded: str) -> list[list[float]]:
    points = []
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


def duration_seconds(value: str) -> float:
    if not value.endswith("s"):
        raise ValueError(f"Unexpected Google duration: {value}")
    return float(value[:-1])


def request_route(origin: dict, destination: dict, stops: list[dict], depart: datetime,
                  routing_preference: str, avoid_tolls: bool, avoid_highways: bool) -> dict:
    body = {
        "origin": {"location": {"latLng": {"latitude": origin["coord"]["lat"], "longitude": origin["coord"]["lng"]}}},
        "destination": {"location": {"latLng": {"latitude": destination["lat"], "longitude": destination["lng"]}}},
        "travelMode": "DRIVE",
        "routingPreference": routing_preference,
        "departureTime": depart.isoformat(timespec="seconds"),
        "computeAlternativeRoutes": False,
    }
    if stops:
        body["intermediates"] = [
            {"location": {"latLng": {"latitude": stop["coord"]["lat"], "longitude": stop["coord"]["lng"]}}}
            for stop in stops
        ]
        if routing_preference == "TRAFFIC_AWARE":
            body["optimizeWaypointOrder"] = False
    if avoid_tolls or avoid_highways:
        body["routeModifiers"] = {"avoidTolls": avoid_tolls, "avoidHighways": avoid_highways}
    response = requests.post(
        ROUTES_URL,
        json=body,
        headers={
            "X-Goog-Api-Key": API_KEY,
            "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.optimizedIntermediateWaypointIndex,routes.legs.duration,routes.legs.distanceMeters,routes.legs.polyline.encodedPolyline,routes.polyline.encodedPolyline",
        },
        timeout=45,
    )
    if not response.ok:
        try:
            detail = response.json().get("error", {}).get("message", response.text)
        except ValueError:
            detail = response.text
        raise ValueError(f"Google Routes API error: {detail}")
    routes = response.json().get("routes", [])
    if not routes:
        raise ValueError("Google Routes API returned no route.")
    route = routes[0]
    ordered_stops = route.get("optimizedIntermediateWaypointIndex", list(range(len(stops))))
    return {
        "duration": route["duration"],
        "distanceMeters": float(route.get("distanceMeters", 0)),
        "optimizedIntermediateWaypointIndex": ordered_stops,
        "legs": route.get("legs", []),
        "path": decode_polyline(route.get("polyline", {}).get("encodedPolyline", "")),
    }


def clock(value: datetime) -> str:
    return value.strftime("%I:%M %p").lstrip("0")


def calculate_cab(group: list[dict], office: dict, office_name: str, deadline: datetime,
                  stop_minutes: int, buffer_minutes: int, cab_number: int,
                  routing_preference: str, avoid_tolls: bool, avoid_highways: bool) -> dict:
    driver = max(group, key=lambda person: person["office_distance_km"])
    pending = sorted(
        (person for person in group if person is not driver),
        key=lambda person: (-person["office_distance_km"], person["name"].casefold()),
    )
    target = deadline - timedelta(minutes=buffer_minutes)
    earliest_request = datetime.now(TZ) + timedelta(minutes=1)
    dwell_seconds = len(group) * stop_minutes * 60
    probe_departure = max(target - timedelta(hours=2), earliest_request)
    route = request_route(
        driver, office, pending, probe_departure,
        routing_preference, avoid_tolls, avoid_highways,
    )
    drive_seconds = duration_seconds(route["duration"])
    departure = max(
        target - timedelta(seconds=drive_seconds + dwell_seconds),
        earliest_request,
    )
    route_departure = departure
    for _ in range(2):
        route_departure = departure
        route = request_route(
            driver, office, pending, route_departure,
            routing_preference, avoid_tolls, avoid_highways,
        )
        revised_departure = max(
            target - timedelta(seconds=duration_seconds(route["duration"]) + dwell_seconds),
            earliest_request,
        )
        if abs((revised_departure - route_departure).total_seconds()) <= 60:
            break
        departure = revised_departure
    departure = route_departure
    drive_seconds = duration_seconds(route["duration"])

    ordering = route.get("optimizedIntermediateWaypointIndex", list(range(len(pending))))
    ordered_stops = [pending[index] for index in ordering]
    legs = route.get("legs", [])
    if len(legs) != len(group):
        raise ValueError("Google Routes returned an unexpected number of route legs.")

    leg_seconds = [duration_seconds(leg["duration"]) for leg in legs]
    if leg_seconds:
        leg_seconds[-1] += drive_seconds - sum(leg_seconds)

    stop_times = []
    segments = []
    current_time = departure
    full_path = route.get("path", [])
    current_people = [driver, *ordered_stops]
    for index, person in enumerate(current_people):
        dwell_until = current_time + timedelta(minutes=stop_minutes)
        leg = legs[index]
        next_name = current_people[index + 1]["name"] if index + 1 < len(current_people) else office_name
        leg_arrival = dwell_until + timedelta(seconds=leg_seconds[index])
        stop_times.append({
            "name": person["name"],
            "address": person["address"],
            "matched_address": person["coord"].get("matched_address", person["address"]),
            "lat": person["coord"]["lat"],
            "lng": person["coord"]["lng"],
            "office_distance_km": person["office_distance_km"],
            "out_of_radius": person["out_of_radius"],
            "eta": clock(current_time),
            "dwell_until": clock(dwell_until),
            "next_stop": next_name,
            "travel_to_next_minutes": round(leg_seconds[index] / 60),
            "distance_to_next_km": round(float(leg.get("distanceMeters", 0)) / 1000, 1),
            "arrival_at_next": clock(leg_arrival),
        })
        segments.append({
            "from": person["name"],
            "to": next_name,
            "depart": clock(dwell_until),
            "arrive": clock(leg_arrival),
            "minutes": round(leg_seconds[index] / 60),
            "distance_km": round(float(leg.get("distanceMeters", 0)) / 1000, 1),
        })
        current_time = leg_arrival
    arrival = departure + timedelta(seconds=drive_seconds + dwell_seconds)
    distance_km = float(route.get("distanceMeters", 0)) / 1000
    meets_deadline = arrival <= deadline
    return {
        "cab": cab_number,
        "driver_start": driver["name"] + " - " + driver["address"],
        "sequence": " -> ".join([person["name"] for person in current_people] + [office_name]),
        "stops": stop_times,
        "destination": office_name,
        "office": {"name": office_name, "lat": office["lat"], "lng": office["lng"]},
        "segments": segments,
        "departure": clock(departure),
        "arrival": clock(arrival),
        "drive_minutes": round(drive_seconds / 60),
        "distance_km": round(distance_km, 1),
        "status": "Meets deadline" if meets_deadline else "Misses deadline",
        "buffer_status": "Meets buffer" if arrival <= target else "Misses buffer",
        "time_source": f"Google Routes {routing_preference.lower().replace('_', ' ')}",
        "_departure_sort": departure,
        "path": full_path,
    }


@app.get("/")
def index():
    now = datetime.now(TZ)
    deadline = now.replace(hour=9, minute=0, second=0, microsecond=0)
    if deadline <= now:
        deadline += timedelta(days=1)
    return render_template_string(
        PAGE,
        deadline=deadline.strftime("%Y-%m-%dT%H:%M"),
        browser_maps_key=BROWSER_MAPS_API_KEY,
    )


@app.get("/sample.csv")
def sample_csv():
    sample = "employee_name,pickup_address\nEmployee A,Location A\nEmployee B,Location B\n"
    return app.response_class(
        sample,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=employee_pickups_sample.csv"},
    )


@app.post("/api/legacy-plan")
def plan():
    if not API_KEY:
        return jsonify(error="Set GOOGLE_MAPS_API_KEY in .env and enable Geocoding API and Routes API."), 503
    if not BROWSER_MAPS_API_KEY:
        return jsonify(error="Set GOOGLE_MAPS_BROWSER_API_KEY in .env and enable Maps JavaScript API."), 503
    try:
        office_name = request.form.get("office", "").strip()
        if not office_name:
            raise ValueError("Enter the office destination address.")
        office = geocode(office_name)
        office_radius_km = float(request.form.get("office_radius_km", 50))
        if not 1 <= office_radius_km <= 500:
            raise ValueError("Office radius must be between 1 and 500 km.")
        deadline = datetime.fromisoformat(request.form.get("deadline", "")).replace(tzinfo=TZ)
        if deadline <= datetime.now(TZ):
            raise ValueError("Arrival date and time must be in the future.")
        stop_minutes = int(request.form.get("stop_minutes", 5))
        buffer_minutes = int(request.form.get("buffer_minutes", 15))
        capacity = int(request.form.get("capacity", 3))
        if not 0 <= stop_minutes <= 60 or not 0 <= buffer_minutes <= 180 or not 1 <= capacity <= 12:
            raise ValueError("Use stop time 0-60, buffer 0-180, and cab capacity 1-12.")

        routing_preference = request.form.get("routing_preference", "TRAFFIC_AWARE_OPTIMAL")
        if routing_preference not in {"TRAFFIC_AWARE", "TRAFFIC_AWARE_OPTIMAL"}:
            raise ValueError("Choose a supported traffic-aware route mode.")
        avoid_tolls = request.form.get("avoid_tolls") == "true"
        avoid_highways = request.form.get("avoid_highways") == "true"

        uploaded = request.files.get("employees_csv")
        if uploaded is None or not uploaded.filename:
            raise ValueError("Choose an employee CSV file.")
        try:
            csv_text = uploaded.read().decode("utf-8-sig")
        except UnicodeDecodeError as error:
            raise ValueError("The employee CSV must be saved as UTF-8.") from error
        reader = csv.DictReader(io.StringIO(csv_text))
        if not reader.fieldnames:
            raise ValueError("The CSV needs employee_name and pickup_address columns.")
        columns = {name.strip().casefold().replace(" ", "_"): name for name in reader.fieldnames if name}
        name_column = columns.get("employee_name") or columns.get("name")
        address_column = columns.get("pickup_address") or columns.get("address")
        if not name_column or not address_column:
            raise ValueError("CSV headers must include employee_name and pickup_address.")

        employee_rows = []
        seen = set()
        for row_number, row in enumerate(reader, start=2):
            name = (row.get(name_column) or "").strip()
            address = (row.get(address_column) or "").strip()
            if not name and not address:
                continue
            if not name or not address:
                raise ValueError(f"CSV row {row_number} needs both an employee name and pickup address.")
            if name.casefold() in seen:
                raise ValueError(f"Employee names must be unique: {name}")
            seen.add(name.casefold())
            employee_rows.append({"name": name, "address": address})
        if not employee_rows:
            raise ValueError("Enter at least one employee.")
        if len(employee_rows) > 100:
            raise ValueError("This prototype is limited to 100 employees per plan.")

        geocode_cache = {}
        for person in employee_rows:
            cache_key = person["address"].casefold()
            if cache_key not in geocode_cache:
                geocode_cache[cache_key] = geocode(person["address"])
            person["coord"] = geocode_cache[cache_key]
            distance_km = haversine_km(person["coord"], office)
            person["office_distance_km"] = round(distance_km, 2)
            person["out_of_radius"] = distance_km > office_radius_km
        people = employee_rows

        groups = group_employees(people, capacity)
        routes = [
            calculate_cab(group, office, office_name, deadline, stop_minutes,
                          buffer_minutes, index, routing_preference, avoid_tolls, avoid_highways)
            for index, group in enumerate(groups, start=1)
        ]
        routes.sort(key=lambda route: route["_departure_sort"])
        for index, route in enumerate(routes, start=1):
            route["cab"] = index
            route.pop("_departure_sort")
        return jsonify({
            "employee_count": len(people),
            "cab_count": len(routes),
            "buffered_deadline": clock(deadline - timedelta(minutes=buffer_minutes)),
            "office_radius_km": office_radius_km,
            "out_of_radius_count": sum(person["out_of_radius"] for person in people),
            "office": {"name": office_name, "lat": office["lat"], "lng": office["lng"]},
            "routes": routes,
        })
    except (ValueError, requests.RequestException, csv.Error) as error:
        return jsonify(error=str(error)), 400


@app.get("/frontend")
def standalone_frontend():
    html = (ROOT / "pickup_planner_frontend.html").read_text(encoding="utf-8")
    html = html.replace("{{GOOGLE_BROWSER_KEY}}", BROWSER_MAPS_API_KEY)
    return app.response_class(html, mimetype="text/html")


@app.get("/maps-loader.js")
def maps_loader():
    key = BROWSER_MAPS_API_KEY.replace("'", "")
    script = (
        "var script=document.createElement('script');"
        f"script.src='https://maps.googleapis.com/maps/api/js?key={key}&callback=initMap&loading=async&v=weekly';"
        "document.head.appendChild(script);"
    )
    return app.response_class(script, mimetype="application/javascript")


@app.post("/api/plan/stream")
def core_plan_stream():
    if not API_KEY:
        return jsonify(error="GOOGLE_MAPS_API_KEY is not configured"), 503
    events = Queue()

    def publish(event_type, percent, data=None, message="Calculating"):
        events.put({"type": event_type, "percent": percent, "message": message, "data": data or {}})

    uploaded = request.files.get("employees_csv")
    if uploaded is None or not uploaded.filename:
        return jsonify(error="Choose an employee CSV file"), 400
    csv_bytes = uploaded.read()
    form_data = request.form.to_dict(flat=True)

    def run():
        try:
            login_text = (form_data.get("login_time") or form_data.get("deadline") or "").strip()
            logout_text = form_data.get("logout_time", "").strip()
            if not login_text:
                raise ValueError("login_time is required")
            login = datetime.fromisoformat(login_text).replace(tzinfo=TZ)
            logout = datetime.fromisoformat(logout_text).replace(tzinfo=TZ) if logout_text else None
            config = PlannerConfig(login_time=login, logout_time=logout,
                buffer_minutes=int(form_data.get("buffer_minutes", 15)),
                pickup_wait_minutes=int(form_data.get("pickup_wait_minutes", form_data.get("stop_minutes", 5))),
                cab_capacity=int(form_data.get("cab_capacity", form_data.get("capacity", 3))),
                office_radius_km=float(form_data.get("office_radius_km", 50)),
                routing_preference=form_data.get("routing_preference", "TRAFFIC_AWARE"),
                avoid_tolls=form_data.get("avoid_tolls") == "true",
                avoid_highways=form_data.get("avoid_highways") == "true")
            employees = parse_employee_csv(csv_bytes)
            office_name = form_data.get("office", "").strip()
            if not office_name:
                raise ValueError("Office address is required")
            plan = plan_routes(employees, {}, office_name, config, GoogleMapsClient(API_KEY), publish)
            events.put({"type": "complete", "percent": 100, "message": "Complete", "data": {"plan": plan}})
        except Exception as error:
            events.put({"type": "error", "percent": 0, "message": str(error), "data": {}})
        finally:
            events.put(None)

    Thread(target=run, daemon=True).start()

    def generate():
        import json
        while True:
            event = events.get()
            if event is None:
                return
            yield json.dumps(event, default=str) + "\n"

    return app.response_class(generate(), mimetype="application/x-ndjson")


@app.post("/api/plan")
def core_plan():
    if not API_KEY:
        return jsonify(error="GOOGLE_MAPS_API_KEY is not configured"), 503
    try:
        uploaded = request.files.get("employees_csv")
        if uploaded is None or not uploaded.filename:
            raise ValueError("Choose an employee CSV file")
        login_text = (request.form.get("login_time") or request.form.get("deadline") or "").strip()
        if not login_text:
            raise ValueError("login_time is required")
        logout_text = request.form.get("logout_time", "").strip()
        login = datetime.fromisoformat(login_text).replace(tzinfo=TZ)
        logout = datetime.fromisoformat(logout_text).replace(tzinfo=TZ) if logout_text else None
        config = PlannerConfig(
            login_time=login,
            logout_time=logout,
            buffer_minutes=int(request.form.get("buffer_minutes", 15)),
            pickup_wait_minutes=int(request.form.get("pickup_wait_minutes", request.form.get("stop_minutes", 5))),
            cab_capacity=int(request.form.get("cab_capacity", request.form.get("capacity", 3))),
            office_radius_km=float(request.form.get("office_radius_km", 50)),
            routing_preference=request.form.get("routing_preference", "TRAFFIC_AWARE"),
            avoid_tolls=request.form.get("avoid_tolls") == "true",
            avoid_highways=request.form.get("avoid_highways") == "true",
        )
        employees = parse_employee_csv(uploaded.read())
        office_name = request.form.get("office", "").strip()
        if not office_name:
            raise ValueError("Office address is required")
        result = plan_routes(employees, {}, office_name, config, GoogleMapsClient(API_KEY))
        return jsonify(result)
    except (ValueError, RuntimeError, KeyError, requests.RequestException, UnicodeDecodeError) as error:
        return jsonify(error=str(error)), 400


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "5001")), debug=False)