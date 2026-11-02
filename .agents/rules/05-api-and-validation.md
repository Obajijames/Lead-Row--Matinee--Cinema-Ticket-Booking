# Rule 05: API Design, Request Validation & Security

**Applies to:** `apps/server/src/routes/`, `apps/server/src/schemas/`, middleware, error handlers  
**Severity:** HIGH / NON-NEGOTIABLE

---

## 1. Universal Request Validation with Zod

1. **Mandatory Boundary Parsing:** Every incoming HTTP request must be validated using Zod before any business logic, database query, or service function executes.
2. **Three-Layer Validation:** Where applicable, routes must define distinct Zod schemas for:
   - `params`: Route path parameters (e.g. UUIDs, IDs).
   - `query`: Query string parameters (e.g. pagination `page`, `limit`, search string `q`).
   - `body`: Request payload.
3. **Strict Stripping:** Disallow unexpected extra properties in request bodies using `.strict()` on mutating endpoints (such as holds and checkouts) to prevent parameter injection attacks.

---

## 2. Standardized API Response Envelopes

### Success Envelope
All successful responses must adhere to a predictable structure:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req_01HP8S3V4W9Z4QJ7K2X9R5N1M",
    "timestamp": "2026-10-29T16:00:00.000Z"
  }
}
```

### Error Envelope
All error responses must return standard JSON objects with stable error codes:
```json
{
  "success": false,
  "error": {
    "code": "SEAT_ALREADY_HELD",
    "message": "One or more selected seats are no longer available.",
    "requestId": "req_01HP8S3V4W9Z4QJ7K2X9R5N1M",
    "details": [
      { "seatId": "seat_a12", "reason": "HELD_BY_ANOTHER_USER" }
    ]
  }
}
```

### Strict Prohibition on Internal Leaks:
- **NEVER** expose stack traces, Prisma query errors, database column names, foreign key violation strings, or Axios errors to the client.
- Catch internal errors in centralized error middleware and map them to sanitized client-safe error messages while logging the raw stack trace server-side with the `requestId`.

---

## 3. HTTP Status Codes & Semantics

Endpoints must return accurate HTTP status codes:

| HTTP Status | Semantic Meaning in Lead Row | Required Headers |
| :--- | :--- | :--- |
| `200 OK` | Successful query or idempotent replay | — |
| `201 Created` | Successful resource creation (hold, booking, checkout session) | — |
| `400 Bad Request` | Zod validation failure or malformed JSON | — |
| `401 Unauthorized` | Missing, expired, or invalid user authentication token | `WWW-Authenticate` |
| `403 Forbidden` | Valid user attempting to access another user's booking or admin route | — |
| `404 Not Found` | Requested movie, showtime, or booking does not exist | — |
| `409 Conflict` | Seat hold conflict (requested seat already held or booked) | — |
| `429 Too Many Requests` | Rate limit exceeded | `Retry-After: <seconds>` |
| `503 Service Unavailable` | Redis down, waiting room overload, or TMDB outage | `Retry-After: <seconds>` |

---

## 4. Rate Limiting Strategy

Rate limits must be enforced via Redis at the API gateway / Express middleware layer by IP address and authenticated User ID:

| Endpoint Pattern | Rate Limit Policy | Window |
| :--- | :--- | :--- |
| `GET /v1/movies/search` | 30 requests / IP | 1 minute |
| `GET /v1/queue/:showtimeId` | 60 requests / User & IP | 1 minute |
| `POST /v1/showtimes/:id/holds` | 10 requests / User & IP | 1 minute |
| `POST /v1/checkout` | 5 requests / User & IP | 1 minute |
| `POST /v1/auth/*` | 10 attempts / IP | 15 minutes |

---

## 5. Request Tracing & Correlation

1. **Request ID Middleware:** Generate a unique `requestId` (using UUIDv4 or ULID) for every incoming HTTP request at the earliest middleware layer.
2. **Header Echo:** Echo the `requestId` back in the `X-Request-Id` response header.
3. **Context Propagation:** Pass the `requestId` into all structured logger calls, database query metadata, and BullMQ background job payloads.

