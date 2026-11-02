# Lead Row - Architectural Learning Log

## Entry 1: The Two-Tier Color System
- **Context:** Design tokens were provided in `design-tokens.tokens.json` containing 120 foundational palette tokens and 50 semantic color roles.
- **Decision:** Enforce a strict two-tier separation. UI components are prohibited from touching raw primitives (`--color-primitive-*`) and must strictly bind to semantic roles (`--color-role-*` / `--color-*`).
- **Learning:** This decoupling enables dark/light theme switching and brand palette updates without refactoring UI component styles.

## Entry 2: Resolving the Double-Booking Race Condition
- **Context:** 500 concurrent users competing for 50 seats.
- **Decision:** Built a Two-Phase Gate. Redis absorbs 95% of rejected contention via atomic `SET NX EX` holds. PostgreSQL acts as the durable safety net via a partial unique index on `booking_seats (showtime_id, seat_id) WHERE status = 'CONFIRMED'`.
- **Learning:** Relying solely on a Redis lock leaves risk during Redis eviction or network partitions. Relying solely on PostgreSQL creates transaction pool exhaustion. The combination delivers both high performance and zero double-bookings.

## Entry 3: Minor-Unit Financial Correctness & Append-Only Ledger
- **Context:** Ticket prices, booking fees, and Flutterwave charges.
- **Decision:** All financial amounts are strictly modeled as integer minor units (`NGN kobo`). Floating-point arithmetic is strictly banned across all server boundaries. Every confirmed payment or refund generates an append-only entry in `ledger_entries` with unique provider references.
- **Learning:** Eliminating floating-point calculations completely prevents fractional roundoff discrepancies between the client, server, and payment gateway. The append-only ledger ensures tamper-evident auditability.

## Entry 4: Asynchronous Webhook Processing with BullMQ & Provider Verification
- **Context:** Webhooks from Flutterwave can arrive late, be duplicated, or retry multiple times.
- **Decision:** Inbound webhooks are immediately persisted to `webhook_events` upon signature verification (`verif-hash`) and enqueued into a BullMQ queue with exponential backoff. The worker performs server-to-server transaction verification against Flutterwave before confirming the booking and issuing the ticket.
- **Learning:** Never rely on mobile redirects or client callbacks as proof of payment. Using BullMQ with idempotency guards guarantees that even if a webhook is retried five times, only one ticket and one ledger entry are ever generated.

## Entry 5: Expo SDK 51 Asset Resolution & Inter Font Hydration
- **Context:** Expo Go threw `Unable to resolve manifest assets: Cannot read properties of null (reading '0')` and React Native warned `fontFamily Inter is not a system font`.
- **Decision:** Patched `@expo/cli` middleware to accept the `exps://` and `exp://` protocols when forwarded from local proxies. Integrated `@expo-google-fonts/inter` via `useFonts` with a startup loading gate.
- **Learning:** Native mobile apps must ensure typography is fully loaded in memory before rendering text nodes, and development middleware must handle forwarded tunneling headers defensively.

## Entry 6: High-Demand Traffic Control with Virtual Waiting Rooms
- **Context:** Blockbuster ticket drops (e.g., Marvel premieres) can overwhelm database connection pools.
- **Decision:** Built a per-showtime virtual waiting room with configurable active session caps (`WAITING_ROOM_ACTIVE_CAP=50`) and admission rates (`WAITING_ROOM_ADMISSION_RATE_PER_MIN=10`). Queue polling includes server-guided intervals with randomized jitter ($\pm 2-5\text{s}$).
- **Learning:** Adding jitter prevents the "thundering herd" problem where hundreds of waiting clients poll at the exact same second.
