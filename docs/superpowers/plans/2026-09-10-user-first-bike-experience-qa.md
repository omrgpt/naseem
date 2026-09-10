# User-first Bike experience — final QA report

Date: 2026-09-10
Scope: final release-gate review for the Bike/NASEEM mobile experience
Objective: confirm that first-time riders can understand route choice, preview the supplied route honestly, and reach a ride only through an explicit location-aware action.

## Verification commands

Run from `C:\Users\PC\Documents\ChatGPT\Bike\mobile`:

```powershell
npm.cmd test
npm.cmd run typecheck
```

Results: **101 tests passed, 0 failed**; TypeScript completed with exit code 0 and no diagnostics. From the repository root, `git diff --check` completed with no errors.

## Product and accessibility findings

The final pool used six independent Luna Max review slots for map, integration, Arabic/RTL, accessibility, reliability, settings/profile, route lifecycle, units, copy, and planner audits. Writers were kept on disjoint scopes. The last rendered review found a raw marker fragment; a focused rider-facing map-label patch landed before the final read-only QA gate, which then changed only this report and the phone checklist.

The live web preview was inspected through its accessibility tree and screenshots at `http://localhost:8083/`:

- Arabic Home rendered a clear no-route state with `خطّط لمسار` and `اختر مساراً`; it did not request location.
- Arabic You and Settings exposed localized headings, local-only profile wording (`ملفك المحلي`), RTL radio controls, location timing (“only during an active ride”), and deletion limited to saved routes and rides.
- English Settings exposed Language, km/mi units, Light/Dark appearance, location/notification status, privacy/data, export, and the same scoped deletion wording.
- English Plan exposed NBH Loop, the selected unit, `Route preview · road check not complete`, OSM attribution, Fit/Zoom controls, and the four separate map layers. It offered `Preview without location` and `Record without following NBH Loop`, while live position remained off until an active ride.
- Web map labels now use rider-facing road-evidence wording and no longer append raw source/internal fragments to every marker label. Provenance remains available in the route evidence/detail surfaces.

The CUA controller viewport was approximately 754×698. It is useful for live interaction, AX names, focus, and screenshot inspection but is not an exact 390×844 device frame. Earlier phone-width render passes covered the compact English/Arabic surfaces. No native device/emulator was available.

## Truth and recovery checks

- Only finite, validated router geometry is rendered as a solid road-following line; waypoint and recorded traces remain visibly dashed previews.
- Router responses are checked for usable geometry, endpoint correspondence, monotonic progress, and distance bounds before becoming ready.
- A preview route cannot start a route-following ride. Explicit recording-only and preview-without-location paths remain available.
- Browsing, map review, saved-route selection, and route editing do not request location. Location is crossed only by the explicit start/connect action, with denied-permission recovery.
- Recorded/imported/catalog traces retain their identity during review rather than being silently replaced by another route.
- Current-location controls require explicit opt-in and a finite supplied coordinate.
- Web alerts are real accessible app dialogs rather than no-op browser alerts; save failure retains a retryable completion draft.
- km/mi preferences convert displayed distances while canonical route values remain in kilometres.

## Residual evidence boundary

No P0/P1 implementation blocker remains in the reviewed web/product paths. The following are human-owned release checks or intentionally bounded product scope:

1. Native `react-native-maps`, Android/iOS permission prompts, safe areas, VoiceOver, and TalkBack still require a device/emulator pass.
2. Exact 390×844 English and Arabic screenshots were not produced by the current controller; the checklist records the real-phone/emulator follow-up.
3. Exact place autocomplete is not implemented. The planner now says to name/choose points and offers map/current/saved/sample selection rather than pretending a search provider exists.
4. Keyboard map selection adds a point at the panned map center. Arbitrary coordinate entry/search and full native keyboard semantics remain a follow-up if that workflow becomes required.
5. Production release still needs authenticated backend/error reporting/privacy-term review and provider/licensing confirmation.

## Release recommendation

The web implementation is ready for the user-first handoff and has a green automated gate. Treat native device QA and the production privacy/backend checks above as required before TestFlight or public store release.
