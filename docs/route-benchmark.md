# Bahrain private-pilot route benchmark

The numbers below are repeatable development checks against the configurable
OSM routed-bike preview. They demonstrate routing feasibility and geometry
rendering; they do not certify legal access, infrastructure, or safety.

| Route sample | Seed / evidence | Road-matched result | What remains open |
| --- | --- | ---: | --- |
| Nasser bin Hamad Loop | Bahrain Tourism public page; seed anchored to its embedded map center (25.9888, 50.4983) | **50.30 km, 301 geometry points, 5 review waypoints** | Obtain authoritative GIS trace and validate the dedicated-track label on-road |
| Bahrain Bay / waterfront | OpenStreetMap-derived pilot trace | **24.74 km, 269 geometry points, 5 review waypoints** | Confirm access, crossings, and mixed-traffic classification from authoritative local data |
| Curated generated candidate | Device-generated Bahrain ring; saved only after road matching | **Representative result varies by curated template; expected 5–80 km** | Treat all road suitability as unknown until the pilot validates it |

## Forecast and rendering checks

- The app requests one Open-Meteo current/hourly forecast for the selected route
  start and caches weather by a rounded grid cell for 10 minutes on the client
  and 15 minutes on the API;
  segment arrival times select the nearest hourly snapshot.
- The web preview uses attributed OpenStreetMap tiles and a continuous SVG
  polyline from the road geometry. If routing fails, it shows a dashed pilot
  trace and an explicit fallback label.
- Native iOS/Android uses `react-native-maps`; Android requires a Google Maps
  key for the Google provider, while iOS can use Apple Maps.

## Release interpretation

These checks are enough to exercise the private preview, not to make public
coverage claims. A release candidate must repeat the benchmark with the
licensed production graph, country-specific restrictions, forecast provider,
map contract, and a rider/on-road review of each displayed segment.
