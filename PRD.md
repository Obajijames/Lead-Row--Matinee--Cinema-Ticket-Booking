# Lead Row --- Product Requirements Document (PRD)

**Document status:** Build specification\
**Product:** Lead Row cinema ticket booking mobile app\
**Client:** React Native + Expo\
**Backend:** Node.js + Express + TypeScript\
**Database:** PostgreSQL\
**Cache, locks and rate limiting:** Redis\
**Background jobs:** BullMQ with a BullMQ-compatible Redis deployment\
**Payments:** Flutterwave (test mode for this assessment)\
**Movie catalogue:** The Movie Database (TMDB), accessed only by the
backend

------------------------------------------------------------------------

## 1. Product summary

Lead Row helps people discover films, compare cinema showtimes, select
seats from a live seat map, pay securely, and access a digital ticket
with a QR code. It combines a polished, accessible mobile experience
with a backend designed to remain correct during high-demand releases.

The defining engineering promise is **one seat can have at most one
confirmed booking for a given showtime**. Redis provides fast temporary
holds, while PostgreSQL remains the durable source of truth. Payment
confirmation comes only from a verified Flutterwave webhook processed
idempotently in a background job.

### Product principles

1.  **Correctness before convenience:** never confirm a booking based
    only on a client redirect or a Redis key.
2.  **Fast by default:** cache movie data, avoid unnecessary database
    reads, and paginate catalogue results.
3.  **Clear under pressure:** use a waiting room, visible queue
    position, useful error messages, and safe retry actions.
4.  **Design is a requirement:** every screen, state, and component is
    intentionally designed before implementation.
5.  **Secrets stay server-side:** the mobile app never calls TMDB
    directly and never contains private provider credentials.

## 2. Problem statement

Cinema booking combines discovery, time-sensitive inventory, and
payment. During a popular release, thousands of users may try to reserve
the same limited seats at once. A naive "check availability, then book"
implementation can sell one seat twice. Traffic spikes can also
overwhelm the database or third-party APIs, leaving users with stale
seat maps, failed checkouts, or unclear booking status.

Lead Row must provide an excellent mobile booking journey while
protecting seat inventory, payment integrity, and service availability
under concurrency and partial failures.

## 3. Goals and non-goals

### Goals

-   Deliver a premium-feeling iOS/Android experience built with React
    Native and Expo.
-   Browse now-playing, popular, upcoming, and movie-detail information
    from TMDB through the backend.
-   Show locally managed cinemas, showtimes, seat inventory, fees, and
    booking records.
-   Hold seats atomically for up to 10 minutes and prevent duplicate
    confirmed bookings.
-   Use Flutterwave test-mode checkout, server-side fee calculation,
    verified webhooks, idempotency, and a payment ledger.
-   Provide a QR-code ticket after successful payment confirmation.
-   Use Redis caching, rate limiting, waiting-room admission, and seat
    holds.
-   Process webhooks, hold expiry, and refunds through background jobs.
-   Demonstrate correctness with a k6 load test of 500 virtual users
    competing for 50 seats.
-   Provide clear technical documentation, Figma designs, test evidence,
    and a three-minute demo.

### Non-goals for this assessment

-   Live production payments or storing card details.
-   Cinema point-of-sale integration or automated seat-map ingestion
    from cinema operators.
-   Auto-renewing memberships or subscriptions.
-   Building a real multi-region active-active database.
-   Simulating a fully distributed sharding deployment; a documented
    sharding plan is required.
-   Guaranteeing that every request succeeds during overload; the
    requirement is controlled degradation and explicit recovery paths.

## 4. Users and key journeys

### Personas

-   **Moviegoer:** discovers a film, compares showtimes, chooses seats,
    pays, and presents a ticket.
-   **High-demand moviegoer:** joins a waiting room during a major
    release and needs clear queue progress.
-   **Operations/admin user:** manages cinemas, auditoriums, seat
    layouts, showtimes, cancellations, and refund initiation.
-   **Support/operator:** traces a booking or payment using request IDs
    and immutable payment/refund records.

### Core journeys

1.  Open Lead Row → browse catalogue → view movie details.
2.  Choose cinema and showtime → view seat map → select seats → create a
    10-minute hold.
3.  Review order and server-calculated service fee → create checkout →
    pay with Flutterwave test mode.
4.  Flutterwave webhook is verified → event is queued → idempotent
    worker confirms booking → ticket and QR code become available.
5.  Payment fails, expires, or is abandoned → hold is released safely.
6.  Showtime is cancelled → affected customers are identified → refund
    job is recorded and processed.
7.  During a traffic surge → user sees waiting room position → is
    admitted at a controlled rate.
8.  Booking or payment issue → user sees a clear status and
    retry/support action rather than a blank screen.

## 5. Functional requirements

### 5.1 Movie discovery and TMDB integration

-   The mobile app calls only Lead Row backend endpoints; it must never
    call TMDB directly.
-   Backend code maps TMDB responses into stable internal DTOs. Only the
    TMDB adapter module may depend on TMDB's field names and response
    structure.
-   Keep the TMDB API key in backend secrets; never commit it or expose
    it to the app bundle.
-   Cache normalized movie responses in Redis. Initial TTL policy:
    -   Movie details: 24 hours.
    -   Now-playing/popular/upcoming lists: 6 hours.
    -   Search results: 15 minutes.
    -   Movie images are delivered from TMDB image URLs using documented
        configuration; cache metadata, and use progressive image loading
        with placeholders.
-   TTLs are configurable and documented. Invalidate or refresh relevant
    cache entries when practical.
-   Use request timeouts, bounded retries with exponential backoff and
    jitter for transient failures, and respect `Retry-After` when
    provided.
-   Do not retry indefinitely. For a cache miss during a TMDB outage,
    return a clear temporary-unavailable response; serve stale cached
    data when available.
-   Validate and normalize incoming query parameters. Paginate results.
-   Include TMDB attribution in the app's About/settings screen and
    relevant catalogue experience, following current TMDB branding and
    attribution terms. Confirm exact wording/logo requirements against
    the current TMDB terms before release.

### 5.2 Cinemas, showtimes and inventory

-   Cinemas, auditoriums, seats, showtimes, seat holds, bookings, and
    payment records are owned by Lead Row's PostgreSQL database.
-   Each seat has a stable ID and row/seat label, plus accessibility
    metadata (including wheelchair-accessible positions).
-   A showtime has a start time, auditorium, movie reference, price
    rules, and booking-open status.
-   Seat-map responses expose each seat's state: available, held by
    current user, held by another user, sold/confirmed, unavailable, or
    wheelchair-accessible (accessibility is a seat attribute and can
    coexist with an availability state).
-   Seat availability is refreshed by polling every 3--5 seconds while
    the seat map is active for the initial implementation. Use
    ETags/version numbers where useful to reduce payloads. WebSockets
    may be considered later if measured polling load justifies the added
    operational complexity.
-   Never trust a client-supplied price, fee, seat status, user ID, or
    payment status.

### 5.3 Seat holds and double-booking protection

-   A user must be authenticated before creating a hold.
-   A hold request includes a showtime and a list of seat IDs. Validate
    ownership, showtime state, seat membership, maximum seats per order,
    and request schema with Zod.
-   For each seat, use an atomic Redis `SET key value NX EX <seconds>`
    operation (or an equivalent atomic script for multi-seat behavior)
    with a 10-minute expiry. A Redis lock alone is not sufficient to
    guarantee booking correctness.
-   A multi-seat request must be all-or-nothing from the user's
    perspective. If any seat cannot be held, release any locks acquired
    by that request using compare-and-delete ownership checks, and
    return the unavailable seats.
-   Store a unique hold token/owner and expiration. Never delete a lock
    unless it still belongs to the caller's token.
-   PostgreSQL is the durable safety net. Enforce uniqueness for active
    seat allocations by `(showtime_id, seat_id)` using a unique
    constraint or a partial unique index for active states. If the
    assessment requires a uniqueness rule directly on the booking table,
    document the status/history trade-off and implement the constraint
    that actually prevents two active bookings without blocking
    legitimate historical records.
-   Confirmation runs in a database transaction and rechecks inventory.
    A conflict causes the worker to fail safely and trigger
    reconciliation/refund handling rather than create a duplicate.
-   The client countdown is informational; the server expiry is
    authoritative.
-   A background job cleans expired holds, but correctness must not
    depend on the cleanup job running on time.

### 5.4 Waiting room and traffic control

-   Configure a maximum number of active booking sessions per showtime
    and a fixed admission rate. Store admission tokens/leases in Redis
    with expiries.
-   Users above the active limit receive a waiting-room token and their
    approximate queue position.
-   Queue position is best-effort and may move as users are admitted or
    leave; communicate this in the UI.
-   Poll a queue-status endpoint at a controlled interval with jitter.
    Avoid one-second synchronized polling from every client.
-   Admission tokens must be scoped to user + showtime, expire, and be
    validated by hold/checkout endpoints.
-   Apply rate limits per user and per IP to search, hold, checkout, and
    queue-status endpoints. Return HTTP 429 with `Retry-After` and a
    user-safe message.
-   Limits are configurable and documented; use stricter limits for
    hold/checkout than catalogue browsing.
-   On overload, return controlled 429/503 responses with retry
    guidance. Never crash or silently accept unsafe requests.

### 5.5 Checkout and payments

-   Use Flutterwave hosted checkout in test mode. The backend creates
    payment sessions; the app opens the provider checkout experience.
-   Store all monetary amounts as integer minor units in PostgreSQL.
    Define one explicit currency and its minor-unit convention; for NGN,
    use kobo. Convert to provider format only in a dedicated payment
    adapter and test the conversion.
-   Calculate ticket subtotal and service fee on the server. The client
    displays the quote but cannot alter it.
-   Create a unique idempotency key for checkout creation, scoped to the
    user and order. Repeated requests with the same key return the same
    logical checkout result.
-   Never store card numbers, CVVs, or raw card data.
-   A redirect/success page is not proof of payment. Only a verified
    webhook plus provider-side transaction verification can move payment
    to paid.
-   Verify webhook signatures using the official Flutterwave mechanism,
    validate the transaction/reference and amount/currency against the
    expected order, and reject mismatches.
-   Persist webhook receipt and enqueue processing. Deduplicate using a
    unique `(provider, provider_event_id)` key; where the provider lacks
    a stable event ID, define a deterministic event identity and
    document its limitations.
-   Process events in BullMQ workers. Worker operations must be
    idempotent so retries cannot create a second booking or ledger
    entry.
-   Confirm a booking only after successful verification and a
    successful database transaction.
-   On failed/abandoned checkout or expired hold, release the hold if it
    still belongs to the order. Handle late successful payment after
    expiry with a safe compensation path (attempt to re-acquire/allocate
    seats transactionally, otherwise initiate refund and mark the order
    for support).
-   Generate a ticket with a cryptographically random, non-sequential
    public token. QR code contents must not expose personal data or a
    database ID. Validate ticket status server-side when scanned.
-   Refunds for cancelled showtimes are recorded as ledger entries and
    processed asynchronously. Keep original payment and refund entries
    append-only; never rewrite history to make a refund disappear.

### 5.6 Background jobs

BullMQ workers are required for: - Verified webhook processing. -
Hold-expiry cleanup and reconciliation. - Refund processing. - Optional
cache refresh and operational notifications.

Jobs must use bounded retries, exponential backoff, jitter where
appropriate, dead-letter/failure inspection, structured logs, and
idempotent handlers. Do not rely on in-memory timers for critical expiry
or payment work. Use a Redis deployment compatible with BullMQ's
required Redis commands; a Redis REST-only plan that does not support
BullMQ's blocking/connection requirements must not be used for the
queue.

### 5.7 Component library and design system

Build and document at least these reusable components: 1. Button
(variants, disabled and loading states) 2. Text (typography scale) 3.
Card 4. MovieCard 5. Input 6. Chip 7. Badge 8. BottomSheet 9. Skeleton
10. Toast 11. EmptyState 12. SeatMap (at least 300 seats) 13.
ScreenHeader 14. PriceSummary 15. QueueStatus 16. ErrorState

All components use shared design tokens. Document props, variants,
states, accessibility behavior, and examples in `COMPONENTS.md`. Include
a hidden component-gallery screen for development/testing only; it must
not be linked from production navigation.

### 5.8 UX, accessibility and visual quality

-   Design all screens and major states in Figma before implementation.
-   Define tokens for color, typography, spacing (multiples of 4 or 8),
    radii, elevation/shadows, and motion. Do not introduce arbitrary
    one-off values.
-   Study five well-designed apps; capture reference screenshots and one
    sentence per reference explaining what works. Respect copyright and
    use screenshots only for internal study/documentation.
-   Use React Native Reanimated for purposeful transitions, seat
    selection, queue transitions, and booking confirmation.
-   Use haptic feedback for seat selection and confirmed payment, with a
    non-haptic fallback.
-   Use skeletons for content loading; avoid blank screens and avoid
    using a spinner as the only representation of a content-loading
    page.
-   Design loading, empty, offline, expired-hold, seat-taken,
    payment-pending, payment-failed, cancelled-showtime, and
    server-overloaded states.
-   Support light and dark themes as intentionally designed palettes.
-   Load images progressively with placeholders and caching.
-   Keep lists virtualized and stable; the 300+ seat map must remain
    responsive.
-   Support small and large phone sizes and safe areas.
-   Meet WCAG AA contrast of at least 4.5:1 for normal text and 3:1 for
    large text/non-text controls where applicable.
-   Provide accessibility labels/roles/hints for interactive controls
    and meaningful images. Decorative images should be hidden from
    screen readers.
-   Respect system font scaling; do not hard-code text sizes in a way
    that prevents user scaling.
-   Keep interactive touch targets at least 44 × 44 points.
-   Test with screen readers and increased font size.

### 5.9 Account, booking history and ticket

-   The user can view current and past bookings with clear statuses.
-   A booking detail screen shows movie, cinema, auditorium, showtime,
    seat labels, price breakdown, and ticket state.
-   Ticket QR code appears only after payment has been verified and the
    booking is confirmed.
-   Do not expose internal IDs or secrets in the QR code.
-   Booking status should distinguish pending payment, confirmed,
    cancelled, refund pending, and refunded.

### 5.10 Operations and admin

Provide a protected, minimal admin interface or documented seed/admin
workflow to manage cinemas, auditoriums, seat layouts, showtimes, ticket
pricing, and showtime cancellation. Enforce role-based authorization on
the server; hiding a button in the app is not authorization.

## 6. Screen inventory

Figma must include the following screens and key states before build:

1.  Splash/initial loading.
2.  Onboarding or welcome (keep optional and short).
3.  Sign in/sign up and validation/error states if authentication is
    included.
4.  Home / movie discovery.
5.  Search and filters.
6.  Movie details.
7.  Cinema selection.
8.  Showtime selection.
9.  Seat map (available, selected, held by another user, sold,
    wheelchair-accessible, expired hold, seat conflict).
10. Order review and fee breakdown.
11. Payment handoff / payment pending.
12. Booking confirmation.
13. Digital ticket with QR code.
14. Booking history and booking detail.
15. Waiting room and queue-position states.
16. Empty, offline, rate-limited, unavailable, and server-overloaded
    states.
17. Cancelled-showtime/refund status.
18. Settings, theme selection, accessibility options, TMDB attribution.
19. Hidden component gallery.
20. Admin/operations screens or documented admin workflow.

## 7. Technical architecture

### 7.1 Locked stack

-   **Mobile:** React Native, Expo, TypeScript.
-   **Backend:** Node.js, Express, TypeScript, REST API.
-   **Validation:** Zod on every external request boundary (params,
    query, body, and relevant provider payloads).
-   **Database:** PostgreSQL with Prisma for schema/migrations and
    transaction access; use raw SQL migrations where partial indexes or
    database-specific constraints are required.
-   **Cache/locks/rate limits:** Redis.
-   **Queue:** BullMQ with a compatible Redis service.
-   **Payments:** Flutterwave test mode.
-   **Movie catalogue:** TMDB through a backend adapter.
-   **Load testing:** k6.
-   **Observability:** structured logs with request IDs, error tracking
    for app/server, metrics and dashboards where available.
-   **Design:** Figma.

### 7.2 Service boundaries

-   `mobile/`: Expo application, navigation, screens, design tokens,
    reusable UI components, API client, state handling.
-   `server/src/routes/`: route definitions and HTTP concerns.
-   `server/src/schemas/`: Zod request/response schemas.
-   `server/src/services/`: business rules and orchestration.
-   `server/src/repositories/`: database reads/writes and explicit
    primary/replica routing.
-   `server/src/adapters/tmdb/`: the only module that knows TMDB's raw
    response shape.
-   `server/src/adapters/flutterwave/`: provider checkout, verification,
    webhook signature, and refund integration.
-   `server/src/queues/` and `server/src/workers/`: BullMQ queue
    definitions and worker handlers.
-   `server/src/observability/`: request ID middleware, structured
    logging, metrics, error reporting.
-   `server/prisma/`: schema and migrations.
-   `docs/`: architecture, traffic, sharding, component, and learning
    documentation.
-   `load-tests/`: k6 scripts and test configuration.

### 7.3 API outline

-   `GET /v1/movies/now-playing`
-   `GET /v1/movies/popular`
-   `GET /v1/movies/:movieId`
-   `GET /v1/movies/search?q=...`
-   `GET /v1/cinemas?near=...` (location filtering optional)
-   `GET /v1/cinemas/:cinemaId/showtimes?movieId=...&date=...`
-   `GET /v1/showtimes/:showtimeId/seats`
-   `POST /v1/showtimes/:showtimeId/holds`
-   `DELETE /v1/holds/:holdId`
-   `GET /v1/queue/:showtimeId`
-   `POST /v1/checkout`
-   `POST /v1/webhooks/flutterwave`
-   `GET /v1/bookings`
-   `GET /v1/bookings/:bookingId`
-   `GET /v1/tickets/:ticketToken`
-   `POST /v1/admin/showtimes/:showtimeId/cancel`
-   `POST /v1/admin/showtimes/:showtimeId/refunds`

All endpoints must define authentication, authorization, validation,
idempotency, rate-limit policy, and documented error responses where
relevant.

## 8. Data model

Minimum logical entities:

-   `User`: identity, email, role/status, timestamps.
-   `Movie`: internal record keyed by TMDB ID, cached metadata fields or
    normalized projection, timestamps.
-   `Cinema`: name, address, timezone, status.
-   `Auditorium`: cinema ID, name, seat layout version.
-   `Seat`: auditorium ID, row label, seat number, seat
    type/accessibility metadata; unique per auditorium.
-   `Showtime`: movie ID/TMDB ID, auditorium ID, start/end time,
    currency, ticket price in minor units, booking status.
-   `SeatHold`: hold token, user ID, showtime ID, seat ID, expiry,
    status; durable record may be used for audit/reconciliation while
    Redis is the fast lock.
-   `Booking`: user ID, showtime ID, status, subtotal/fee/total in minor
    units, currency, idempotency key, timestamps.
-   `BookingSeat` or active seat-allocation record: booking ID, showtime
    ID, seat ID, status. Enforce one active allocation per
    `(showtime_id, seat_id)` at the database level.
-   `Payment`: booking/order ID, provider reference, expected and
    verified amount/currency, status, timestamps.
-   `WebhookEvent`: provider, provider event ID/deduplication key,
    payload hash or safely minimized payload, processing status,
    timestamps.
-   `LedgerEntry`: append-only payment/refund entry, amount in minor
    units, currency, provider reference, related booking/payment,
    timestamp.
-   `Ticket`: booking ID, random public token hash, status, issued
    timestamp.
-   `QueueAdmission`: user/showtime admission token and expiry (or
    equivalent Redis-backed state).
-   `AuditLog`: actor, action, target type/ID, request ID, timestamp,
    safe metadata.

Use foreign keys, check constraints for non-negative monetary amounts
and valid state combinations, indexes for frequent access patterns, and
unique constraints for provider references and idempotency keys. Define
deletion/retention policies rather than cascading away payment history.

## 9. Concurrency and transaction rules

1.  Redis atomic `SET NX EX` is the fast first gate for seat holds.
2.  For multi-seat holds, use a Redis Lua script or carefully
    compensated per-seat locks so the user does not receive a partial
    hold.
3.  PostgreSQL is the source of truth for confirmed bookings and active
    seat allocations.
4.  Booking confirmation happens inside a transaction that locks/checks
    the relevant inventory rows and inserts allocations protected by a
    unique constraint.
5.  Webhook receipt is persisted before asynchronous processing;
    deduplication is enforced by a database unique constraint.
6.  Worker retries must be safe. A repeated event must not create a
    second booking, ticket, or ledger entry.
7.  Lock expiry, worker delay, or Redis outage must not permit a
    duplicate database allocation.
8.  If Redis is unavailable, do not bypass seat-lock safety and proceed
    as though the hold succeeded. Return a controlled
    temporary-unavailable response or use a deliberately designed
    database-only fallback with equivalent transactional guarantees.

## 10. Traffic management

-   Redis cache for TMDB responses and safe, versioned seat-map
    snapshots.
-   Do not cache seat availability as authoritative for writes. Treat it
    as a short-lived view and revalidate when holding seats.
-   Waiting room with configurable active-session cap and admission rate
    per showtime.
-   Per-user and per-IP rate limits for search, holds, checkout, and
    queue polling.
-   `Retry-After` headers for 429/503 responses.
-   Load test: 500 virtual users concurrently compete for the same 50
    seats. Record request latency (p50/p95/p99), throughput, HTTP error
    rate, successful holds, rejected holds, confirmed seat allocations,
    and database uniqueness violations.
-   Acceptance condition: no more than 50 unique seat allocations can be
    active for the 50-seat test inventory; no seat has more than one
    active allocation; no payment/booking is confirmed without verified
    payment. Report the actual result, not a fabricated pass.
-   Test both the normal path and failure modes: Redis timeout, database
    connection exhaustion, webhook duplicate, worker retry, provider
    timeout, expired hold, and traffic overload.

## 11. Backend system design standards

### 11.1 Connection pooling

-   Configure a managed PostgreSQL pooler (for example, PgBouncer or the
    hosting provider's pooler) and set conservative application pool
    sizes.
-   Document expected concurrent requests, pool limits, transaction
    duration, and provider connection ceiling.
-   Do not hold database transactions open while calling TMDB or
    Flutterwave.
-   Load-test pool saturation and monitor wait time, active connections,
    and timeouts.

### 11.2 Replication and read-your-own-writes

-   Production topology plan: one PostgreSQL primary for all writes and
    one read replica for eligible read-heavy queries.
-   Route writes and consistency-sensitive reads (seat map after hold,
    booking status after checkout/webhook, payment verification, and
    user-visible state immediately after mutation) to the primary.
-   Route only stale-tolerant catalogue/analytics reads to the replica.
    If replication lag is high or read-your-own-write cannot be
    guaranteed, fall back to the primary.
-   The implementation may use separate Prisma clients/repository
    methods for primary and replica. Never rely on a replica for seat
    availability decisions or booking uniqueness.
-   If the selected free-tier host does not provide replicas, document
    this as a deployment limitation and retain the explicit routing
    interface so a replica can be added without changing business logic.

### 11.3 Sharding

-   Provide `SHARDING.md` describing candidate tables, shard key,
    routing, migration/backfill, cross-shard limitations, hot-shard risk
    for a blockbuster showtime, and mitigation. No simulation required.
-   Candidate partition/shard key: `showtime_id` for inventory and
    booking-related data, subject to co-location needs; user-centric
    booking history may require a user index or a separate projection.
-   A single blockbuster showtime can still overload one shard. Mitigate
    with a waiting room, per-showtime admission limits, Redis holds,
    cached reads, queueing writes, and isolating hot inventory if
    necessary.
-   Do not claim sharding is implemented unless it is actually deployed.

### 11.4 Caching

-   TMDB TTLs as defined in Section 5.1.
-   Seat-map cache is a short-lived snapshot/versioned response and must
    never be used to approve a hold or booking.
-   Avoid caching personalized/payment data across users.
-   Define cache-key namespacing, TTLs, invalidation strategy, and
    behavior when Redis is unavailable.

### 11.5 Background processing

-   BullMQ workers for webhook events, expiry cleanup, and refunds.
-   Jobs use idempotency, bounded retries, backoff, failure visibility,
    and replay/reconciliation procedures.
-   Queue depth, oldest-job age, failure count, retry count, and
    processing duration are observable.
-   Queue outages must not turn a webhook redirect into a confirmed
    booking; retain the verified event durably and retry
    enqueue/processing.

### 11.6 Idempotency

-   Unique checkout idempotency key per user/order.
-   Unique provider transaction/reference constraints.
-   Unique webhook event/deduplication key.
-   Unique active `(showtime_id, seat_id)` allocation.
-   Unique ticket per confirmed booking.
-   Unique ledger source reference/type to prevent duplicate
    payment/refund entries.
-   Document the retention period for idempotency records and how
    retries behave after that period.

### 11.7 Observability

-   Generate or validate a request ID at the edge; propagate it through
    API logs, queue job data, payment metadata where safe, and error
    reports.
-   Structured logs include request ID, route, status, duration, safe
    user identifier, showtime ID, and job ID as appropriate. Never log
    secrets, full payment credentials, or unnecessary personal data.
-   Track request latency, 4xx/5xx rates, rate-limit counts, queue
    depth, worker failures, Redis latency/errors, DB pool saturation,
    payment verification mismatches, hold conflicts, and booking
    constraint violations.
-   Add app-side error reporting and backend error tracking.
-   Write a short load-test incident narrative using actual logs: what
    happened, peak latency/errors, bottleneck, mitigation, and remaining
    risks.

## 12. Security and privacy

-   Keep secrets in deployment environment variables/secret manager;
    commit only `.env.example` with placeholders.
-   Validate all requests with Zod; validate provider callbacks
    independently.
-   Apply authentication and server-side authorization to user-owned
    bookings and admin operations.
-   Use HTTPS in deployed environments, secure session/token handling,
    CORS allowlists, security headers, and request/body size limits.
-   Rate-limit authentication and sensitive actions.
-   Store only necessary personal data; set retention rules for webhook
    payloads and logs.
-   QR codes contain opaque random tokens, not user details or
    sequential database IDs.
-   Do not mark a payment paid based on client input.
-   Keep test and production credentials separate.

## 13. Acceptance criteria

### Product and UI

-   [ ] Every required screen and state is represented in Figma before
    implementation.
-   [ ] Design tokens are defined and consumed by components; no
    unexplained one-off spacing values.
-   [ ] At least 12 required components plus the component gallery exist
    and are documented.
-   [ ] SeatMap handles 300+ seats smoothly and supports all required
    states.
-   [ ] Loading, empty, error, offline, payment-pending, expired-hold,
    and overload states are designed.
-   [ ] Dark mode, text scaling, screen-reader labels, contrast, and
    touch-target checks are completed.
-   [ ] TMDB attribution is present and terms have been reviewed.

### API and integration

-   [ ] The mobile app has no direct TMDB calls or exposed TMDB secret.
-   [ ] Only one backend module maps raw TMDB payloads into internal
    types.
-   [ ] TMDB caching, timeouts, bounded retries, stale-cache fallback,
    and outage behavior are tested.
-   [ ] Every public API request is validated with Zod.
-   [ ] Flutterwave checkout works in test mode and money conversion is
    covered by tests.

### Booking correctness

-   [ ] Concurrent attempts to hold the same seat result in at most one
    successful hold.
-   [ ] Database constraints reject duplicate active seat allocation
    even if Redis logic fails.
-   [ ] Duplicate webhook deliveries do not duplicate booking, ticket,
    or ledger records.
-   [ ] Client redirect alone cannot confirm a booking.
-   [ ] Failed/abandoned checkout releases holds safely.
-   [ ] Cancelled showtimes create auditable refund ledger entries and
    background jobs.

### Traffic and backend

-   [ ] Waiting room shows queue position and admits users at the
    configured rate.
-   [ ] Per-user and per-IP rate limits apply to required endpoints.
-   [ ] 500 VUs compete for 50 seats in k6; report includes latency and
    error rates.
-   [ ] The test proves zero double-booked seats using database queries,
    not just API responses.
-   [ ] Pooling, primary/replica routing, read-your-own-writes, sharding
    plan, jobs, idempotency, and observability are documented.
-   [ ] Load-test report describes actual logs and observed bottlenecks.

## 14. Required deliverables

-   Public GitHub repository (or repositories).
-   Android development build download link.
-   Deployed backend URL.
-   Figma file link with tokens and all screens/states.
-   `README.md`
-   `ARCHITECTURE.md`
-   `TRAFFIC.md`
-   `SHARDING.md`
-   `COMPONENTS.md`
-   `LEARNING-LOG.md`
-   k6 scripts and load-test report.
-   Three-minute demo video showing UI, seat map, a booking, and
    load-test results.
-   LinkedIn post explaining the double-booking problem and the
    solution.
-   `.env.example`, migration/seed instructions, and reproducible test
    commands.

## 15. Suggested build sequence

1.  **Design and discovery:** review five reference apps, define tokens,
    map journeys, design all screens/states in Figma.
2.  **Foundation:** create repo structure, TypeScript configuration,
    lint/test scripts, environment validation, CI, request IDs, error
    handling, and Zod conventions.
3.  **Data model:** define Prisma schema/migrations, seed
    cinemas/seats/showtimes, indexes, constraints, and repository
    boundaries.
4.  **TMDB adapter:** backend-only integration, normalized DTOs, Redis
    TTLs, retry/backoff, stale-cache fallback, tests.
5.  **Mobile shell and component library:** navigation, themes, reusable
    components, component gallery, accessibility foundations.
6.  **Discovery and showtime journey:** movie lists/details, cinemas,
    showtimes, seat map polling and visual states.
7.  **Seat holds and traffic controls:** atomic holds, database safety
    net, waiting room, rate limits, conflict handling.
8.  **Checkout and webhook jobs:** Flutterwave test mode, idempotency,
    verified webhooks, queue worker, ticket/QR, refunds.
9.  **Reliability and evidence:** k6 concurrency test, failure
    injection, logs, query plans, pool tuning, and report.
10. **Release evidence:** deploy backend, create Android development
    build, complete documentation, record demo, publish LinkedIn post.

## 16. Assumptions and open decisions

-   Currency is initially NGN with amounts stored in kobo; the provider
    adapter owns conversion to provider format.
-   The exact service-fee formula and maximum seats per booking must be
    selected and documented before checkout implementation.
-   Authentication method and provider must be selected before protected
    booking flows are built.
-   Cinema and showtime data are seeded/admin-managed for this
    assessment.
-   The deployment provider may have free-tier limits. Document any
    unavailable replica or queue feature honestly and keep interfaces
    ready for production-grade hosting.
-   TMDB terms, attribution, image usage, and API limits must be checked
    against current official documentation before release.
-   Load-test results must be real, reproducible, and accompanied by the
    exact environment/configuration used.
