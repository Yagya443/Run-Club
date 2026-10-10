# Architecture

```
Browser (React + Leaflet, service worker, IndexedDB)
   |  REST + Bearer token
Express API  ── helmet, CORS, rate limits, zod validation, JWT auth
   |
   ├─ controllers/     parse + validate, call services
   ├─ services/        business logic
   │    ├─ routeGenerationService   candidate loops -> OSRM -> filter -> score
   │    ├─ matchingService          database filters + scoreCandidate (matchScoring.js)
   │    ├─ groupRunService          meeting point, group route, create run
   │    ├─ runLifecycleService      start / complete / discard / stats / reflection
   │    ├─ runService, clubService, profileService
   │    └─ ai/                      ollamaClient + routeAI + runnerMatchAI + runReflectionAI
   └─ Mongoose ── MongoDB

External (open): OSRM-compatible router, Nominatim, OSM tiles, Ollama (local)
```

## Key decisions

- **AI is a layer, not the engine.** Geometry, distance, filtering and scores are code. AI picks among valid options and writes text. Every AI output is schema-validated and has a deterministic fallback; the UI shows which was used.
- **Route generation.** For each of six bearings, build a triangle (or out-and-back) of waypoints sized for the target distance, route it, then rescale and re-route up to three times. Reject routes more than 10% off or not finishing near the start. Score = 70% distance accuracy, 30% little doubling back.
- **Matching.** MongoDB narrows by date and code filters candidates by opt-in, bounding box, exact radius, a 45 minute window and a 50% distance tolerance. Score is a weighted sum of five factors, all shown to the user.
- **Open group runs.** Runner matching only finds existing accounts that have published availability. A runner can create a public meeting-point run when no matches are available; other signed-in runners can find it in Discover and join.
- **Per-runner results.** `RunParticipant` holds each runner's start, finish, distance and source, so group runs have one result each. `Run` holds shared state.
- **Privacy by construction.** Exact coordinates live in `Location` and never leave the server for other users. Serializers (`runCard`, `getRun`, `findCandidates`) are the only exits and they coarsen or trim.
- **Offline.** IndexedDB stores joined runs (with geometry) and an ordered outbox of start/complete actions. On reconnect the outbox is flushed in order; 409/404 responses count as done; other rejections are kept and shown so nothing is lost silently. The service worker caches the shell and viewed tiles, never `/api`.

## Tests

`npm test` runs offline checks (route generation convergence, scoring, AI validation and fallbacks, privacy trimming, GPS maths, result plausibility) and a smoke test that boots the real Express app without a database to verify that every route requires auth, inputs are validated, headers are set and oversized bodies are refused. It then builds the client.
