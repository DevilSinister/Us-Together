# OpenStreetMap location policy

Accepted by owner direction, 2026-09-05. Applies project-wide, not only to Release 2.

## Default

Use OpenStreetMap-based APIs/services wherever a feature mentions location: bucket ideas, plans, trips, memories, moments, calendar entries, future timeline places and suggestions. Reuse the existing authenticated Photon/OpenStreetMap search and nearby-lookup integration. Do not introduce Google Places, a paid proprietary location dependency or an unrelated provider by default.

"Open street API" means OpenStreetMap-based location services here. Photon is the existing search/geocoding implementation. Do not use the OpenStreetMap editing API as a place-autocomplete service. Map rendering or routing needs an appropriate OpenStreetMap-based service and an explicit provider/configuration choice when that capability is implemented; this document does not claim a map or route engine already exists.

Google Calendar remains a calendar integration, not a location-provider choice. Its private event locations must not be sent to a geocoder automatically. Existing user-entered map links are not rewritten by this documentation change.

## Shared behavior

- Reuse the existing location field and server boundary wherever practical. Keep the selected place label editable; no manual latitude/longitude form fields.
- Nearby lookup requires an explicit user action and browser permission. Ordinary typing does not request geolocation.
- Preserve the current minimization rule: save the selected label, not lookup coordinates or full provider responses. Legacy coordinate columns remain untouched.
- Keep endpoints server-configured, inputs/results validated and requests bounded/debounced. Never log search text, coordinates, private entry content or provider payloads.
- Retain visible OpenStreetMap contributor attribution and manual entry when search is disabled, unavailable, throttled or returns nothing.
- Preserve LOCATION_SEARCH_ENABLED and PHOTON_BASE_URL as documented in [Setup](../SETUP.md). Do not invent a required API key.

## Provider policy and growth

Photon's public demo is rate-limited in practice and has no availability guarantee; growth should use an appropriate configured or self-hosted instance. Public Nominatim forbids client-side autocomplete, so it is not a drop-in replacement for the existing search field. Check applicable service/tiles policies before implementing additional maps or routing.

Primary references checked 2026-09-05: [Photon service policy](https://github.com/komoot/photon#demo-server), [Photon API](https://github.com/komoot/photon/blob/master/docs/api-v1.md), [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/), [OpenStreetMap attribution](https://www.openstreetmap.org/copyright).

## Acceptance

New location work must demonstrate reusable lookup, attribution, editable labels, explicit nearby consent, safe permission denial, outage/throttling fallback and no new coordinate/content persistence. Record any approved provider change before implementing it.
