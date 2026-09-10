# Naseem Bahrain design contract

This is a mobile-first route atlas for deciding when and where to ride. It is not a social feed, a turn-by-turn navigator, or a safety certification.

## Visual language

- The map is the primary visual canvas for route review and an active ride. One anchored bottom sheet explains the selected route instead of stacking dashboard cards over it.
- The default remains a night-console surface: near-black green `#0B1414`, deep ink `#F1F6F3`, and quiet panels `#13211F` / `#1B2D2A`. Cloud light mode is the daylight alternate.
- Teal `#65D0BE` identifies a selected action or state. Forecast, route/access evidence, selection, and GPS match confidence always have separate labels; color never carries all four meanings.
- Copper `#E99A70` is reserved for caution, unavailable/restricted evidence, or destructive actions. It does not imply danger.
- Home uses a quiet compact preview and one `Open map` action. Map controls, source detail, legends, and long evidence copy belong in review details, not the compact preview.

## Screen contract

1. Home: a calm departure outlook and quiet selected-route preview; no route-specific claim before a route is selected.
2. Plan: the supplied route preview first, then progressive disclosure for Start/Destination road following, imports, and advanced manual drawing.
3. Route review: full map, fit/zoom controls in collision-free safe zones, and a collapsed/expanded sheet for status, departure evidence, layers, and sources.
4. Ride: a focused full-map live context with independent match confidence and explicit degradation; no automatic rerouting or turn instructions.
5. You: personal routes, imports, saved rides, sources, privacy, and Settings. Route review is a pushed surface, not a fifth tab.

## Interaction rules

- Every map route is visible on real tiles or a native map provider and carries attribution.
- Every segment exposes road tier, source, and confidence. Unknown remains unknown.
- Weather values are forecast inputs, not promises. ETA adjustments are capped in the route engine.
- Location is requested only after Start live ride and the watcher is removed on End.
- Touch targets are at least 44 px high. Buttons have text labels and accessibility roles.
- Arabic changes locale, reading direction, typography, and number/time formatting. It mirrors logical horizontal rows and map safe zones, never vertical stacks.
- Customer language names the route `NBH Loop` / `حلقة ناصر بن حمد`. Use `Route preview · road check not complete` / `معاينة المسار · لم يتم التحقق من الطرق بعد` when the route line is not confirmed against mapped roads; use a separate road-route-ready status when it is. Do not expose pilot, private, owner, policy, catalogue, geometry, provider, or debug wording.
- Plan drawing is a route sketch with visible `Undo`, `Clear`, and `Done` controls. It requires two points before use, and a straight-line sketch is never presented as navigation or a road claim.
- Route/access details, forecast conditions, chosen-route state, and live-position confidence remain separate map layers with matching text labels. A preview status never implies route following, navigation, or safety certification.
- Arabic uses locale-aware numbers and times with rider-facing units such as `كم`, `دقيقة`, and `كم/س`; labels wrap in logical rows and never rely on English unit fallbacks.
- Web maps support drag/pan, double-tap and wheel zoom, visible plus/minus controls, and a Fit route control. Native maps explicitly enable scroll and zoom gestures.
- Generated loops use a small curated waypoint set and are saved only after a road-matching response; imported and drawn routes remain available but bounded to Bahrain and the 160 km pilot limit.
- Route analysis is protected by client caching/debounce and API rate, body-size, timeout, concurrency and response-cache limits.

## Provenance

The direction is documented in [docs/visual-direction.md](/C:/Users/PC/Documents/ChatGPT/Bike/docs/visual-direction.md). The map contract is native `react-native-maps` on iOS/Android and attributed OpenStreetMap tiles for the web preview. A configurable OSM routed-bike preview supplies road-following geometry when available; infrastructure suitability remains explicitly pending GIS validation.
