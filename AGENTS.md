# AGENTS.md --- Lead Row Build Rules

This file is the implementation contract for coding agents working on
Lead Row. Follow it before changing code. The PRD is the product source
of truth; if a requirement is unclear, ask a focused question or
document the assumption. Do not silently change locked decisions.

## 1. Product and locked stack

Build Lead Row, a polished cinema ticket-booking mobile app.

-   Mobile: React Native + Expo + TypeScript.
-   Backend: Node.js + Express + TypeScript REST API.
-   Validation: Zod at every external request boundary.
-   Database: PostgreSQL, Prisma migrations/client; use reviewed raw SQL
    migrations when partial indexes or advanced constraints are needed.
-   Cache, locks and rate limiting: Redis.
-   Background jobs: BullMQ on a Redis deployment compatible with
    BullMQ's required commands and connection behavior.
-   Payments: Flutterwave test mode only.
-   Movie data: TMDB, accessed only through the backend.
-   Load testing: k6.
-   Design source: Figma.

Do not replace this stack with Next.js API routes, a different mobile
framework, or a different payment provider without explicit user
approval.

## 2. Non-negotiable correctness rules

1.  **Never trust the mobile client** for price, service fee, seat
    availability, user identity, payment status, or booking
    confirmation.
2.  **PostgreSQL is the durable source of truth** for confirmed bookings
    and active seat allocations.
3.  Seat holds use atomic Redis `SET key value NX EX <ttl>` or an
    equivalent atomic script. A Redis lock is not by itself sufficient
    to guarantee no double booking.
4.  Database constraints must prevent two active allocations for the
    same `(showtime_id, seat_id)`. Test the constraint directly.
5.  Confirm bookings only after a verified Flutterwave webhook has been
    processed successfully. Redirects and client callbacks are not proof
    of payment.
6.  Webhook processing, checkout creation, ticket issuance, ledger
    writes, and refunds must be idempotent.
7.  Store money as integer minor units (NGN kobo for the initial
    release). Never use floating-point arithmetic for money.
8.  Never store card numbers or CVVs.
9.  Never log secrets, full payment payloads containing sensitive data,
    or unnecessary personal information.
10. If Redis, PostgreSQL, the queue, or a provider is unavailable, fail
    safely. Do not bypass inventory or payment safeguards to make the UI
    appear successful.

## 3. Repository structure

Prefer a clear workspace layout. Keep concerns separate:

-   `apps/mobile/` --- Expo app, navigation, screens, tokens,
    components, API client, and app-level error states.
-   `apps/server/` --- Express API, schemas, services, repositories,
    adapters, queues, workers, and observability.
-   `apps/server/prisma/` --- Prisma schema, migrations, and seed
    scripts.
-   `docs/` --- `README.md`, `ARCHITECTURE.md`, `TRAFFIC.md`,
    `SHARDING.md`, `COMPONENTS.md`, `LEARNING-LOG.md`, and load-test
    report.
-   `load-tests/` --- k6 scripts and configuration.
-   Root config --- workspace scripts, lint, formatting, type checking,
    and tests.

If the existing repository already has a sound structure, extend it
rather than reorganizing everything unnecessarily. Keep the TMDB and
Flutterwave adapters isolated.

## 4. TMDB integration rules

-   The mobile app must never call TMDB directly.
-   Keep `TMDB_API_KEY` on the backend only.
-   Exactly one adapter/module knows TMDB's raw response shape. Convert
    raw payloads into internal Lead Row DTOs there.
-   Validate provider responses before mapping them; handle missing or
    renamed fields defensively.
-   Redis TTL defaults: movie details 24 hours, catalogue lists 6 hours,
    search results 15 minutes. Keep TTLs configurable.
-   Use timeouts, bounded retries with exponential backoff and jitter,
    respect `Retry-After`, and serve stale cached data when available.
-   Do not retry forever. Return a clear safe error if there is no
    usable cache.
-   Include TMDB attribution and verify current official terms before
    release.

## 5. API and validation rules

-   Use Zod for request params, query strings, bodies, and
    provider/webhook payloads.
-   Centralize error formatting. Return predictable JSON error objects
    with a safe message, stable error code, request ID, and correct HTTP
    status.
-   Use authentication and server-side authorization for user-owned
    bookings and admin routes.
-   Apply rate limits by user and IP to search, queue polling, hold, and
    checkout endpoints.
-   Return `429` with `Retry-After` when rate-limited; use `503` for
    controlled temporary unavailability.
-   Never expose stack traces, SQL errors, provider secrets, or internal
    infrastructure details to clients.
-   Keep OpenAPI/API documentation in sync if an API spec is added.

## 6. Seat holds and booking rules

-   A hold expires after 10 minutes; the server is authoritative.
-   A multi-seat hold should behave atomically from the user's
    perspective. Use a Lua script or safe compensating release with
    owner-token checks; do not delete a lock owned by another request.
-   Redis hold keys must be namespaced and include showtime and seat
    identifiers.
-   On hold conflict, return a structured conflict response listing
    unavailable seats.
-   Do not trust cached seat-map state for writes. Recheck when
    acquiring a hold and again during durable confirmation.
-   Database confirmation must run in a transaction and rely on a unique
    active seat-allocation constraint.
-   Avoid a blanket unique constraint that permanently blocks a seat
    from being booked in later legitimate showtimes or after valid
    historical cancellation. Model active allocation/history
    deliberately and document the constraint.
-   If Redis is down, do not pretend the hold succeeded. Return a safe
    temporary-unavailable response unless an explicitly designed
    database-only fallback provides equivalent guarantees.
-   Expiry cleanup is a reconciliation mechanism, not the only
    correctness mechanism.

## 7. Payment and background-job rules

-   Use Flutterwave hosted checkout in test mode.
-   The server calculates ticket subtotal, service fee, total, currency,
    and provider amount.
-   Use an idempotency key for checkout creation, unique provider
    references, unique webhook deduplication keys, and unique ledger
    source references.
-   Verify webhook authenticity using the official provider method and
    verify the transaction server-side against expected amount,
    currency, and order/reference.
-   Persist a webhook receipt before processing it asynchronously.
-   A BullMQ worker must be safe to retry. A duplicate event must not
    create another booking, ticket, or ledger entry.
-   Only verified, successfully processed payment can confirm a booking.
-   Handle late payment after a hold expires explicitly: safely allocate
    if still possible; otherwise record the exception and initiate a
    refund path. Never silently assign an already allocated seat.
-   Record payments/refunds in an append-only ledger.
-   Queue jobs for webhook processing, hold expiry/reconciliation, and
    refunds. Use bounded retries, backoff, failure visibility, and
    operational replay procedures.
-   Do not use an in-memory timer as the only implementation of a
    critical background task.
-   Ensure the chosen Redis host supports BullMQ's required commands; do
    not assume every REST-only Redis offering is compatible.

## 8. Database, pooling, replication, and sharding

-   Add foreign keys, appropriate check constraints, indexes, and unique
    constraints.
-   Keep payment and audit history from being accidentally deleted by
    cascading deletes.
-   Configure and document database connection pooling. Do not open a
    new Prisma client per request.
-   Keep transactions short; never hold a transaction open while calling
    TMDB or Flutterwave.
-   Use primary writes. Route consistency-sensitive reads (including a
    user's just-created hold/booking/payment status and all inventory
    decisions) to the primary.
-   Route only stale-tolerant reads to a replica. If replica lag is high
    or read-your-own-write is not guaranteed, fall back to the primary.
-   If the deployment's free tier lacks a replica, document that
    limitation and retain an explicit repository routing boundary.
-   Write `SHARDING.md`: candidate tables, shard key, co-location
    requirements, hot-shard risk for one blockbuster showtime,
    mitigation, and migration plan. Do not claim sharding is implemented
    unless it is deployed.

## 9. Mobile design and accessibility rules

-   Design screens in Figma before implementing them.
-   Use centralized design tokens for color, typography, spacing
    (4/8-point multiples), radius, shadows/elevation, and motion. Avoid
    arbitrary one-off values.
-   Build at least these components: Button, Text, Card, MovieCard,
    Input, Chip, Badge, BottomSheet, Skeleton, Toast, EmptyState,
    SeatMap. Add ScreenHeader, PriceSummary, QueueStatus, and ErrorState
    where useful.
-   Document component props, variants, states, and accessibility in
    `COMPONENTS.md`.
-   Provide a hidden development-only component gallery. Never expose it
    in production navigation.
-   SeatMap must handle at least 300 seats and represent available,
    selected, held, sold, and wheelchair-accessible states.
-   Use Reanimated for purposeful transitions; haptics for key actions
    when available.
-   Use skeleton loading for content, progressive image
    placeholders/caching, and virtualized lists where appropriate.
-   Design light and dark themes separately; do not simply invert
    colors.
-   Every interactive element needs an accessibility role/label/hint as
    appropriate. Decorative images should not create screen-reader
    noise.
-   Respect system font scaling. Touch targets must be at least 44 × 44
    points.
-   Aim for WCAG AA contrast: 4.5:1 for normal text and 3:1 for large
    text/non-text controls where applicable.
-   Never leave a blank screen for loading, empty, offline,
    expired-hold, seat conflict, payment pending/failure, cancellation,
    or overload cases.
-   Test small and large phones, safe areas, and screen readers.

## 10. Caching and traffic management

-   Cache TMDB data according to the PRD TTLs.
-   Seat-map caching is a short-lived view only; never use it to approve
    a hold or booking.
-   Add a per-showtime waiting room with configurable active-session cap
    and admission rate.
-   Queue tokens must be scoped to the user and showtime and expire.
-   Avoid synchronized queue polling; use a controlled interval and
    jitter.
-   Add per-user and per-IP limits for search, queue polling, holds, and
    checkout.
-   Provide graceful 429/503 responses with retry guidance.
-   Use request IDs across HTTP requests and background jobs.
-   Monitor Redis latency/errors, DB pool saturation, API
    latency/errors, rate limits, queue depth/age, job failures, hold
    conflicts, webhook mismatches, and unique-constraint violations.

## 11. Testing requirements

For each meaningful change: - Add unit tests for business rules and
money conversion. - Add integration tests for database constraints and
transaction behavior. - Add API tests for Zod validation, auth,
authorization, rate limits, and error responses. - Add payment/webhook
tests for valid signatures, invalid signatures, amount mismatch,
duplicate events, retry, and late payment. - Add concurrency tests for
competing holds and booking confirmation. - Add mobile tests for
critical components and important state transitions where practical. -
Run formatting, lint, type checking, and relevant tests before declaring
work complete.

Create a k6 test with 500 virtual users competing for the same 50 seats
at the same moment. Report p50/p95/p99 latency, throughput, error rates,
successful/rejected holds, and database allocation results. Prove zero
double-booking by querying the database for duplicate active
`(showtime_id, seat_id)` allocations. Never fabricate load-test results
or screenshots.

## 12. Observability and operational evidence

-   Add request ID middleware and structured logs.
-   Carry request ID and relevant safe identifiers into job data.
-   Integrate app/server error tracking if credentials are available;
    otherwise implement an adapter/interface and document setup.
-   Never claim monitoring is configured if it is only stubbed.
-   Write the load-test report from actual results and logs:
    environment, configuration, what happened, peak latency/error rate,
    bottleneck, mitigation, and remaining risks.

## 13. Working method for coding agents

1.  Read this file and the PRD before coding.
2.  Inspect the existing repository and report its current state
    briefly.
3.  Work in small, coherent steps. Do not overwrite user work or perform
    broad refactors unrelated to the task.
4.  Before implementing a large feature, state the plan and the files
    expected to change.
5.  Follow existing conventions unless they conflict with these rules.
6.  Use migrations for schema changes; do not silently edit a production
    schema.
7.  Update tests and documentation alongside behavior changes.
8.  Never invent secrets, deployed URLs, test results, Figma links,
    build links, or screenshots.
9.  If a required external credential is missing, add validated
    environment configuration and a clear setup instruction; do not
    hardcode a fake secret.
10. Do not silently change a locked stack decision or weaken a
    correctness requirement to make tests pass.
11. After work, summarize: changes made, commands run, test results,
    remaining gaps, and manual steps the user must perform.

## 14. Definition of done

A task is done only when: - The requested behavior is implemented, not
just represented by placeholder UI. - Type checking, lint, and relevant
tests pass, or failures are clearly reported. - Security, validation,
and failure states are included. - Documentation is updated. - No
secrets or fabricated evidence are added. - Any unimplemented
requirement is explicitly listed as a gap.
