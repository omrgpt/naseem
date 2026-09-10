# Naseem Bahrain private pilot

Naseem is a Bahrain-first cycling intelligence prototype. It gives a rider an understandable view of route wind, arrival timing, road-infrastructure evidence, and live conditions without claiming that any road is safe.

## What is runnable now

- `mobile/` — Expo SDK 57 React Native app with English/Arabic copy, RTL-aware layout, light/dark themes, real native maps (Apple/Google), a real OpenStreetMap web preview, road-matched bicycle geometry when the configurable OSM router is available, hourly weather and air-quality context, departure comparison, opt-in foreground live location, segment wind and gust analysis, GPX import, map drawing, and device-persisted saved routes.
- `api/` — Fastify route-analysis API with a bounded 15-minute weather cache, strict geometry checks (including road-matched geometry), resource limits, and tested wind-vector/ETA primitives.
- `ui-lab/leaflet/` — isolated Vite + React + TypeScript + Tailwind/shadcn-style browser lab for evaluating the supplied Leaflet map without adding DOM-only dependencies to the Expo app.
- `database/schema.sql` — PostgreSQL/PostGIS schema for consent, source provenance, activity deduplication, and deletion workflows.
- `docs/product-dossier.md` — initial evidence dossier and the pre-public-launch validation gates.
- `docs/licensing-terms-register.md` — source provenance, terms posture, and release gates.
- `docs/route-benchmark.md` — measured Bahrain routing/rendering checks and their limits.
- `docs/ruler-audit.md` — measurable spacing, map, touch-target, and RTL checks used in lieu of an installed Ruler skill.
- `docs/sample-route.gpx` — a small GPX fixture for trying the import flow.

## Run locally

```powershell
cd C:\Users\PC\Documents\ChatGPT\Bike\api
npm install
npm test
npm run dev
```

In a second terminal:

```powershell
cd C:\Users\PC\Documents\ChatGPT\Bike\mobile
npm install
npx expo start
```

Copy `mobile/.env.example` to `mobile/.env` when you want the app to call the local API. A mirrored `EXPO_PUBLIC_API_TOKEN` is acceptable only for a local/private pilot because every `EXPO_PUBLIC_*` value is visible in the app bundle; production needs user/session authentication. Without a working authenticated API, the mobile client uses its on-device weather/analysis fallback.

For the browser preview, run `npx expo start --web` and open `http://localhost:8081`. For a real iOS/Android map and location testing, use a development build. Set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` before building to inject the native Google Maps key; iOS can otherwise use Apple Maps. The app deliberately requests foreground permission only; it does not register background tracking.

To run the isolated Leaflet comparison surface:

```powershell
cd C:\Users\PC\Documents\ChatGPT\Bike\ui-lab\leaflet
npm install
npm run dev -- --host 0.0.0.0 --port 8085
```

Open `http://localhost:8085/`. It is a browser-only comparison surface; it is not the native iOS map implementation.

The UI pattern atlas is available at `http://localhost:8081/?catalog=1`. It includes exact code names, canonical UI terms, alternative search names, reference websites, and a decision note for the supplied 21st.dev components. See [`docs/21st-map-and-ui-integration.md`](docs/21st-map-and-ui-integration.md) for the Leaflet/shadcn separation, production map hardening, and the recommended iPhone testing loop.

The source-backed visual component chooser is available at `http://localhost:8085/?chooser=1` while the isolated web lab is running. It renders the current NASEEM direction beside source-backed alternatives from Untitled UI, Uiverse, Blocks.so, Modern UI, and ReUI, includes exact component names, searchable vocabulary, public source excerpts, official links, and a live assembled preview. It is intentionally a browser lab: after a direction is selected, port the chosen anatomy into native-safe `mobile/src` components rather than copying DOM/Tailwind code into the iOS build.

For the searchable visual component catalog, run the same web server and open `http://localhost:8081/?catalog=1`. The catalog is development-only and lists each current UI surface with its exact code name, canonical UI-pattern name, library-specific search vocabulary, alternative search terms, official reference websites, source file, and a visual preview. The naming reference lives in `mobile/src/componentVocabulary.ts`.

To create an installable development build after signing in to EAS, run `npx eas build --profile development --platform android` (or `ios` on macOS), then install the generated build and start Metro with `npx expo start --dev-client`. Expo Go is enough for the browser-like preview, but a development build is required to verify native map provider behavior and location permissions on a phone.

Ruflo `v3.39.0` is installed globally for development orchestration. Its full project configuration lives under `mobile/`; runtime memory is ignored by `mobile/.gitignore`, and the MCP command is pinned to the reviewed Ruflo version.

## Before a public pilot

1. Replace the private preview's community OSM routed-bike call and seeded catalog with a validated, licensed OSM/GraphHopper import and source-backed road restrictions.
2. Put weather access behind a commercial-use agreement and a server-side API key; do not ship a provider key in the app.
3. Replace the web tile preview with the approved production map/search provider after tile licensing and Bahrain routing coverage are benchmarked.
4. Add Strava OAuth credentials and encrypted token storage. WHOOP remains conditional on official access and consent.
5. Run the data-deletion, licensing, Arabic/RTL, and on-road validation gates in `docs/product-dossier.md`.
