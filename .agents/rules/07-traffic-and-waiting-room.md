# Rule 07: Traffic Management, Waiting Room & Surge Protection

**Applies to:** `apps/server/src/services/queue*`, waiting room middleware, client polling handlers  
**Severity:** HIGH / NON-NEGOTIABLE

---

## 1. Per-Showtime Virtual Waiting Room

During blockbuster releases or traffic spikes, sudden surges must not crash the database or overwhelm seat-inventory locks:
1. **Capacity Thresholds:** Each showtime has a configurable **active booking session cap** (e.g., maximum 50 concurrent users actively on the seat map/checkout) and a fixed **admission rate** (e.g., 5 users admitted per minute).
2. **Admission Tokens:** Users admitted past the threshold receive a cryptographically signed, short-lived `admissionToken` stored in Redis with an explicit TTL.
3. **Queue Gatekeeping:** The hold endpoint (`POST /v1/showtimes/:id/holds`) and checkout endpoint (`POST /v1/checkout`) must validate the presence, signature, and unexpired status of the `admissionToken`. If the token is missing or expired, the request must be redirected to the waiting room.

---

## 2. Queue Status Polling & Anti-Thundering Herd

1. **Jittered Polling:** Mobile clients in the waiting room must **never** execute synchronized 1-second polling loops.
   - Base polling interval: **3 to 5 seconds**.
   - Randomized Jitter: Add a random deviation of $\pm 500\text{ms}$ to $1000\text{ms}$ per request to desynchronize client traffic.
2. **Transparent UX:** The queue-status endpoint (`GET /v1/queue/:showtimeId`) must return the user's approximate queue position and estimated wait time.
3. **Queue Eviction:** If a client abandons the waiting room or fails to poll within 3 missed intervals, their queue position is reclaimed to admit the next waiting user.

---

## 3. Overload Protection & Controlled Degradation

1. **Load Shedding:** If Redis latency exceeds 200ms or PostgreSQL connection pool saturation exceeds 90%, the API gateway must shed excess unauthenticated traffic with HTTP `503 Service Unavailable` before internal queues back up.
2. **Retry Headers:** All `429 Too Many Requests` and `503 Service Unavailable` responses must include a valid `Retry-After: <seconds>` header guiding client backoff.
3. **Stale View Tolerance:** Catalogue browsing routes (`/v1/movies/*`) must continue serving cached or stale data during an inventory traffic spike.

