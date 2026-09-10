# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Stack

delegated: TypeScript Expo React Native for iOS and Android development builds, with a TypeScript API service and PostGIS-ready data model.

## Users

Bahrain-based road and endurance cyclists planning an outdoor ride, checking conditions before departure, or already riding a known route.

## Product Purpose

Naseem Bahrain turns route geometry and weather into a readable riding plan: it compares departure times, explains wind by segment, estimates return-home conditions and ETA impact, and keeps live support bounded to an active ride. Success means a rider can understand the recommendation in seconds and can verify why it was made.

## Positioning

The product joins route shape, road/infrastructure evidence, wind vectors, and a rider's own route history in one Bahrain-first view. It never labels a road safe and never hides uncertainty.

## Operating Context

The first private pilot uses the NBH loop and representative Bahrain roads. Riders may choose a generated candidate, draw or import a GPX route, or reuse a learned route. Strava read-only import is the first personalization connector; WHOOP is optional and conditional on official access.

## Capabilities and Constraints

- English and Arabic, including RTL layout, dark and light themes, and accessible map-first mobile UI.
- Native map rendering on iOS and Android; route segments are visually distinct as dedicated infrastructure, mixed traffic, restricted, or unknown.
- Pre-ride route analysis uses sustained wind, gusts, route heading, capped ETA adjustments, and transparent headwind, tailwind, or crosswind labels.
- Live location begins only after a rider starts a session and stops when the rider ends it. Location permission denial must leave pre-ride analysis usable.
- Open-Meteo is development data and requires a commercial-use review before public release. Map and road data require licensing review before public claims.
- No medical assessment, safety certification, guaranteed forecast, or pseudo-scientific effort score.
- Store provenance, consent, encrypted source tokens, deletion controls, and activity deduplication from the beginning.

## Brand Commitments

The working product name is Naseem Bahrain (NASEEM / نسيم). The voice is direct, calm, evidence-led, and useful before a rider leaves home. The UI must feel like an instrument, not a social feed.

## Evidence on Hand

- Product brief and research dossier in `docs/product-dossier.md`.
- Source and terms register in `docs/licensing-terms-register.md`.
- Bahrain Tourism's public NBH Loop page is a route lead, not proof of every pilot geometry claim.
- Open-Meteo is wired for current development conditions.
- The current seed route geometry is explicitly pilot geometry pending GIS validation; it must not be presented as authoritative road guidance.

## Product Principles

1. Explain the recommendation, do not merely score it.
2. Separate mapped fact, forecast, rider history, and uncertainty.
3. Keep live tracking bounded, explicit, and recoverable.
4. Make the map and route sequence the primary evidence.
5. Prefer a useful private pilot over unsupported public claims.

## Accessibility & Inclusion

Support large text, minimum touch targets, clear focus/pressed states, high contrast, Arabic RTL reading order, permission-denied recovery, and low-connectivity fallback states. Use text labels alongside color for wind and road tiers.
