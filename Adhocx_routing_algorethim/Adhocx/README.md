# Employee Pickup Planner

This local planner reads employee pickup rows from CSV, groups nearby employees up to a configurable cab capacity, uses Google Geocoding and traffic-aware Routes, and draws the returned routes on Google Maps.

## Run locally

Add rotated Google API keys to the ignored `.env` file. Enable billing and the Geocoding API, Routes API, and Maps JavaScript API. The browser key is included in the page, so restrict it to Maps JavaScript API and your allowed HTTP referrers. For production, use separate server and browser keys; restrict the server key to Geocoding and Routes and, where possible, the server's outbound IP. Do not reuse a key exposed in chat.

In PowerShell from this folder:

```powershell
python -m pip install -r requirements.txt
python route_planner_app.py
```

Open `http://127.0.0.1:5001`. If that port is already in use, set `$env:PORT="5002"` before running the app. The app uses `GOOGLE_MAPS_API_KEY` for server-side Geocoding and Routes calls. `GOOGLE_MAPS_BROWSER_API_KEY` is optional locally and falls back to the server key; set it separately for a referrer-restricted browser key.

## CSV format

Use the **Download sample employee CSV** link in the page. The required columns are:

```csv
employee_name,pickup_address
Employee A,Location A
Employee B,Location B
```

Provide full, specific pickup addresses. Review the plotted pins and route before using a plan operationally. The prototype accepts up to 100 employees per plan.

## Office radius

Set the maximum straight-line radius from the geocoded office (default 50 km). Each pickup is measured from the office with the Haversine formula; pickups beyond the limit are counted in the summary, marked red when their route is selected or visible at close zoom, and identified in the route details and CSV export. This is a geographic catchment alert, not road distance, and it does not exclude employees from routing.

## Scheduling model

For a cab with $n$ employees, configured pickup dwell $w$, safety buffer $b$, login deadline $t_L$, and Google traffic-aware driving duration $T(t)$, the target departure solves:

$$
t_D = t_L - b - n w - T(t_D)
$$

The app probes Google Routes at a candidate departure, then refines it up to two times using the returned traffic-aware duration. Pickup dwell is added locally. Geographic grouping is a greedy straight-line-distance heuristic; Google optimizes stop order within each cab. Each driver is assumed to already be at a pickup in their group. Traffic estimates depend on Google's data and are not guarantees. Production use still requires HTTPS, organizational authentication, privacy/retention controls, monitoring, and production-grade hosting.