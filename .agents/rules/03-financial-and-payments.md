# Rule 03: Financial Integrity, Checkout & Payment Ledger

**Applies to:** `apps/server/src/adapters/flutterwave/`, payment routes, ledger repositories, BullMQ payment workers  
**Severity:** CRITICAL / NON-NEGOTIABLE

---

## 1. Monetary Representation: Integer Minor Units Only

1. **No Floating-Point Math:** Floating-point arithmetic for currency is strictly prohibited in JavaScript/TypeScript and database schemas.
2. **Standard Minor Unit:** All monetary amounts must be stored and computed as **integers in minor units** (for NGN, use **kobo**: 1 NGN = 100 kobo).
3. **Database Check Constraints:** Every price, fee, subtotal, and total column in PostgreSQL must have a check constraint enforcing non-negative values (`CHECK (amount >= 0)`).
4. **Provider Adapter Boundary:** Conversion to Flutterwave's external currency format must occur exclusively inside the Flutterwave adapter (`server/src/adapters/flutterwave/`) and must be verified by automated unit tests.

---

## 2. Server-Authoritative Fee Computation

1. **Client Trust Zero:** The mobile client is **never** trusted for ticket price, service fees, discounts, or order totals.
2. **Server Calculation:** The backend computes:
   - `subtotal_in_kobo = sum(seat_tier_prices)`
   - `service_fee_in_kobo = calculate_service_fee(subtotal_in_kobo)`
   - `total_in_kobo = subtotal_in_kobo + service_fee_in_kobo`
3. **Checkout Request Validation:** The checkout creation endpoint (`POST /v1/checkout`) must accept only `holdToken` and an `idempotencyKey`. It must reject any request that attempts to supply prices or totals.

---

## 3. Flutterwave Integration & Webhook Verification

1. **Test Mode Enforcement:** Use Flutterwave test mode only (`FLUTTERWAVE_SECRET_KEY` starting with `FLWSECK_TEST-`).
2. **Zero Card Data Storage:** Never collect, handle, log, or store credit card numbers, CVVs, expiry dates, or PINs. Flutterwave hosted checkout handles all card entry.
3. **Redirects Are NOT Payment Proof:** A client redirect, callback parameter, or browser return page is **never** proof of payment. Only a verified server-to-server webhook plus transaction verification can confirm a booking.
4. **Webhook Verification Protocol:**
   - **Step 1 (Signature Check):** Validate the `verif-hash` header against the backend secret `FLUTTERWAVE_WEBHOOK_HASH`.
   - **Step 2 (Receipt Persistence & Deduplication):**
     - Persist the raw webhook receipt immediately into `webhook_events` with a unique constraint on `(provider, provider_event_id)` before dispatching to BullMQ.
     - **Deterministic Event ID Handling:** Because Flutterwave webhooks lack a unique event UUID, compute a deterministic `provider_event_id` hash:
       `provider_event_id = SHA256("flutterwave:" + payload.event + ":" + payload.data.id + ":" + payload.data.tx_ref)`
       This prevents duplicate processing of identical webhook events while allowing distinct events (e.g. charge vs refund) for the same transaction.
   - **Step 3 (Transaction Verification API):** The asynchronous BullMQ worker must call the official Flutterwave verification endpoint (`GET https://api.flutterwave.com/v3/transactions/:id/verify`) to confirm:
     - Transaction status is `"successful"`
     - Verified amount matches expected order `total_in_kobo`
     - Verified currency matches expected currency (`"NGN"`)
     - Transaction reference matches internal order reference
   - **Step 4 (Database Confirmation):** Execute booking confirmation inside a PostgreSQL transaction.

---

## 4. Append-Only Financial Ledger

1. **Immutable History:** Every financial event (payment received, partial refund, full cancellation refund) must be recorded in an append-only `ledger_entries` table.
2. **No Deletions or In-Place Updates:** Never execute `UPDATE` or `DELETE` queries on ledger records. Adjustments must be recorded as compensatory reverse ledger rows.
3. **Unique Ledger Reference:** Every ledger entry must have a unique constraint on `(source_type, source_reference)` to prevent double-crediting or double-refunding during worker retries.
4. **Cancelled Showtime Refunds:** When an auditorium showtime is cancelled:
   - Identify affected confirmed bookings.
   - Insert refund entries into the ledger.
   - Dispatch refund jobs to BullMQ workers with bounded retries and backoff.

