# Lead Row - Traffic Management & Surge Protection

## 1. Virtual Waiting Room

To protect PostgreSQL connection pools and Redis memory during blockbuster ticket drops, Lead Row implements a **per-showtime virtual waiting room**:

1. **Active Session Cap:** Each showtime limits active booking sessions (default: 50 concurrent users on the seat map/checkout).
2. **Controlled Admission Rate:** Users are admitted from the queue in controlled batches (e.g. 10 users per minute).
3. **Admission Tokens:** Admitted users receive a cryptographically signed, expiring token (`admissionToken`) stored in Redis.
4. **Gatekeeping Mutating Routes:** `POST /v1/showtimes/:id/holds` and `POST /v1/checkout` strictly require a valid, unexpired `admissionToken`.

---

## 2. Anti-Thundering Herd: Jittered Polling

- Mobile clients in the queue poll `GET /v1/queue/:showtimeId` every **3 to 5 seconds**.
- A randomized jitter of **$\pm 500\text{ms}$** is added to each request cycle to prevent synchronized requests from overwhelming the server.

---

## 3. Rate Limiting Envelopes

Redis-backed rate limiters are applied by IP address and authenticated User ID:

- `POST /v1/showtimes/:id/holds`: 10 requests / min
- `POST /v1/checkout`: 5 requests / min
- `GET /v1/movies/search`: 30 requests / min
- `GET /v1/queue/:showtimeId`: 60 requests / min

---

## 4. Near Real-Time Seat Availability: Architectural Justification

Seat availability on the mobile app ([SeatMapScreen.tsx](../apps/mobile/src/screens/SeatMapScreen.tsx)) updates in near real-time via **controlled background HTTP polling (every 5 seconds)** rather than persistent WebSockets or Server-Sent Events (SSE).

### Why Polling Was Chosen Over WebSockets / SSE:

1. **Connection Pool & File Descriptor Exhaustion:**
   - During blockbuster ticket launches, 10,000 to 50,000 concurrent mobile users may view seat maps simultaneously.
   - Long-lived WebSockets or SSE connections require dedicated OS file descriptors, active TCP sockets, and server memory per client. In Node.js, holding tens of thousands of idle socket connections degrades throughput and starves worker event loops.
   - Polling requests are short-lived, transient HTTP/2 or HTTP/1.1 connections that immediately return to the socket pool.

2. **Stateless Edge Scaling & Caching:**
   - HTTP seat map requests (`GET /v1/showtimes/:id/seats`) are stateless and cached at the Redis layer with a short 2-to-3 second TTL.
   - This allows edge reverse proxies, Cloudflare, or horizontal API instances to serve hundreds of identical seat-map requests directly from Redis or memory without touching PostgreSQL.
   - WebSockets, by contrast, require stateful sticky sessions or pub/sub Redis broadcasting backplanes (e.g. Socket.io with Redis adapter), adding complexity, failure modes, and serialization overhead.

3. **Mobile Network Resilience & Reconnection:**
   - Cinema mobile users are frequently in transit, elevators, or congested cellular towers where TCP connections drop frequently.
   - WebSockets require complex reconnection handshakes, heartbeat pings, state reconciliation, and missed-event backfills.
   - Stateless HTTP polling inherently self-heals: if one 5-second poll fails due to a network blip, the next poll seamlessly recovers the authoritative state without error.

4. **Guaranteed Final Consistency at Write Time:**
   - Regardless of UI representation, seat map views are purely advisory.
   - Authoritative inventory correctness is guaranteed at the moment of mutation via atomic Redis `SET NX EX` holds and PostgreSQL's unique constraint safety net. Polling at 5-second intervals provides users with high visual fidelity while preserving server resources.


