# Rule 08: Testing, Concurrency Verification & Observability

**Applies to:** `load-tests/`, unit tests, integration tests, logging infrastructure  
**Severity:** CRITICAL / NON-NEGOTIABLE

---

## 1. Concurrency Benchmark: The 500 VU k6 Mandate

1. **Test Scenario:** A realistic k6 test script must simulate **500 virtual users (VUs) simultaneously competing for the exact same 50 seats** in a single auditorium showtime.
2. **Success Criteria:**
   - **Zero Double-Bookings:** Exactly 50 seats booked; 0 duplicate active allocations.
   - **Database Proof:** Verification must query PostgreSQL directly post-run:
     ```sql
     -- For active confirmed allocations:
     SELECT showtime_id, seat_id, COUNT(*)
     FROM booking_seats
     WHERE status = 'CONFIRMED'
     GROUP BY showtime_id, seat_id
     HAVING COUNT(*) > 1;

     -- If temporary holds are mirrored in a durable allocations/holds table:
     SELECT showtime_id, seat_id, COUNT(*)
     FROM seat_allocations
     WHERE status IN ('HELD', 'CONFIRMED')
     GROUP BY showtime_id, seat_id
     HAVING COUNT(*) > 1;
     ```
     Both queries must return **0 rows**, proving zero double-allocations.
   - **Graceful Conflict Handling:** The 450 rejected requests must receive clean HTTP `409 Conflict` responses without unhandled 500 server crashes.
3. **No Fabricated Evidence:** Never invent or estimate load test numbers, latency percentiles, or terminal output. Load test reports must record actual, reproducible metrics from real test executions.

---

## 2. Test Suite Standards

Every meaningful pull request or feature branch must provide automated tests:
1. **Unit Tests:** Business logic, fee math in kobo, and token conversion.
2. **Database Integration Tests:** Constraint verification, active allocation uniqueness, transaction rollbacks.
3. **API Tests:** Zod schema rejection, rate-limit headers, authentication/authorization checks.
4. **Payment/Webhook Tests:** Signature validation, amount mismatch rejections, duplicate webhook replay safety, late payment refund paths.

---

## 3. Observability, Logging & Incident Reporting

1. **Structured JSON Logs:** All application logs must be emitted as structured JSON containing:
   - `timestamp` (ISO 8601)
   - `level` (`info`, `warn`, `error`)
   - `requestId` (correlated from incoming request)
   - `route` and `method`
   - `statusCode` and `durationMs`
   - `showtimeId` and `userId` (where applicable)
2. **Prohibited Log Data:**
   - **NEVER** log passwords, session tokens, or API secrets.
   - **NEVER** log credit card numbers, CVVs, or full payment authorization payloads.
   - **NEVER** log unnecessary personal information.
3. **Load-Test Incident Narrative:** When load testing reveals bottlenecks, document the observation in `docs/load-test-report.md` with:
   - Peak latency (p50, p95, p99) and error rate.
   - Root-cause bottleneck (e.g. database pool starvation, Redis contention).
   - Applied architectural mitigation.

