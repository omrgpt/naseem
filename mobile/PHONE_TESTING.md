# Phone testing without shared Wi‑Fi

## Fastest path: Expo Go over a tunnel

This is the right path while the product is still changing frequently. The PC and iPhone only need internet access; they do not need to be on the same Wi‑Fi network.

1. Install Expo Go on the iPhone.
2. From this directory, install dependencies (the tunnel helper is already a local development dependency):

   ```powershell
   npm install
   ```

3. Start the app with a public development tunnel:

   ```powershell
   npm run phone:tunnel
   ```

4. Scan the QR code shown by Expo with the iPhone camera or from inside Expo Go.

The tunnel URL is temporary, public, and slower than LAN. Do not use it for production data or secrets. Stop the process when you finish testing.

## Durable path: EAS development or preview build

Use this when you want the app installed on the iPhone without keeping the PC's Metro server running. It requires an Expo account and, for iOS device builds/TestFlight, Apple Developer access.

```powershell
npm install --global eas-cli
eas login
eas build:configure
eas build --platform ios --profile development
```

Install the resulting development build on the iPhone, then run `npx expo start --dev-client` when you want live local JavaScript changes.

For a shareable internal build that does not require Metro:

```powershell
eas build --platform ios --profile preview
```

For JavaScript-only updates after a compatible build is installed, configure EAS Update once and publish to the matching channel:

```powershell
npx expo install expo-updates
eas update:configure
eas update --channel preview --message "Describe the change"
```

EAS Update does not replace a native build when native dependencies, permissions, app configuration, or the Expo SDK changes. Those changes require a new EAS build.

## Production/TestFlight

Before public release, use the `production` profile, an authenticated backend, real error reporting, privacy terms, and a review of location permissions. The current app is still a private pilot: the tunnel and preview profiles are the intended testing paths.

## Final user-first QA checklist

Run the web build from `mobile` for a repeatable first pass:

```powershell
npm.cmd start -- --web --port 8083
```

The automated release gate is:

```powershell
npm.cmd test                 # 101/101 passing
npm.cmd run typecheck        # no diagnostics
git diff --check             # no whitespace errors
```

### English journey

1. Start with no saved route. Complete onboarding or choose `Skip for now`; neither path should ask for location.
2. On Home, confirm the empty state explains how to choose a route and offers `Plan a route` / `Choose a route`.
3. Open Plan and confirm the route identity, distance unit, preview status, OSM attribution, `Fit route`, zoom controls, and separate route/access, forecast, selection, and live-position layers.
4. Use `Preview without location` or `Record without following` for a preview-only route. Do not present a route-following start action until road-matched geometry is ready.
5. Open `More ways to plan` and select points from the map, a saved point, or a sample. Editing a field must clear stale point/route state; the interface must not imply that a place-search service exists when it does not.
6. Open Ride. Verify that location permission is explained/requested only after an explicit start/connect action, and that denial offers recovery. Recording-only mode must not imply route following.
7. Visit You and Settings. Confirm local-only wording, optional history wording, language and km/mi controls, privacy/data actions, and deletion limited to saved routes and rides.

### Arabic/RTL journey

Repeat the same journey after selecting العربية. Confirm Arabic headings, button labels, hints, route statuses, empty states, and privacy copy; right-to-left rows and action groups mirror correctly; Arabic distance/time formatting is consistent; and no control, map label, attribution, or alert is clipped or hidden.

### Adversarial checks

- A rider without location permission can browse, select, and review routes; only an explicit ride/connect action crosses the location boundary.
- A rider away from the known NBH entry receives a distance/eligibility explanation instead of a false “connected” or navigation claim.
- A failed route match stays a dashed, editable preview with Retry/Edit actions; it never becomes a solid road route.
- A save failure preserves the completion draft and exposes Retry; discard is explicit and confirmed.
- Provided dense router geometry is the only solid road-following line. Supplied waypoint/recorded geometry remains a dashed preview.
- Map attribution remains visible, and every interactive control has a visible label, an accessibility role/name, and at least a 44 px target.

### Evidence boundary

The final run used the in-app web preview with live accessibility-tree and screenshot inspection, plus phone-width render checks from the independent review passes. The CUA controller viewport in this environment was approximately 754×698 rather than an exact 390×844 device frame, so the exact device-width layout still needs a real phone or emulator pass. Native `react-native-maps`, OS permission prompts, safe-area behavior, VoiceOver, and TalkBack were not run here. Complete those checks before TestFlight/store release, along with the production backend, privacy terms, and error-reporting review.
