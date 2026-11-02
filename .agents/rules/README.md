# Lead Row - AI Agent Engineering Rules Index

This directory contains the immutable technical constraints and architectural rules governing all AI coding agents working on the Lead Row codebase.

Every agent MUST adhere to these rules before planning, writing, or refactoring code.

---

## Rules Directory Inventory

| File | Domain | Key Invariants (Harmonized with PRD) |
| :--- | :--- | :--- |
| **[`01-system-architecture.md`](file:///c:/Users/JAMES%20MFEM/Desktop/Lead%20Row/.agents/rules/01-system-architecture.md)** | Stack & Boundaries | Locked REST stack. Zero mobile secrets. HTTP polling (3–5s) with ETags (WebSockets deferred). Free-tier routing interface dispensation. |
| **[`02-inventory-and-concurrency.md`](file:///c:/Users/JAMES%20MFEM/Desktop/Lead%20Row/.agents/rules/02-inventory-and-concurrency.md)** | Inventory & Concurrency | Zero double-booking. Two-phase gate (Redis `SET NX EX` + PostgreSQL active unique constraint). Safe DB-only row-locking fallback permitted during Redis outage. |
| **[`03-financial-and-payments.md`](file:///c:/Users/JAMES%20MFEM/Desktop/Lead%20Row/.agents/rules/03-financial-and-payments.md)** | Finance & Payments | Kobo minor units only. Server fee calculation. Verified webhooks with deterministic event hashing (`SHA256`). Append-only ledger. |
| **[`04-tmdb-adapter.md`](file:///c:/Users/JAMES%20MFEM/Desktop/Lead%20Row/.agents/rules/04-tmdb-adapter.md)** | Movie Catalogue | Backend adapter isolation. Redis TTLs (24h/6h/15m). Bounded jittered retries. Stale fallback. |
| **[`05-api-and-validation.md`](file:///c:/Users/JAMES%20MFEM/Desktop/Lead%20Row/.agents/rules/05-api-and-validation.md)** | API & Validation | Zod on every external boundary. Standardized error envelope. Rate limits & request tracing. |
| **[`06-design-system-and-mobile.md`](file:///c:/Users/JAMES%20MFEM/Desktop/Lead%20Row/.agents/rules/06-design-system-and-mobile.md)** | Design System & UI | Two-tier colors (UI strictly consumes Roles, never Primitives). 44pt touch targets. WCAG AA. 16 components (12 foundational + 4 composite). |
| **[`07-traffic-and-waiting-room.md`](file:///c:/Users/JAMES%20MFEM/Desktop/Lead%20Row/.agents/rules/07-traffic-and-waiting-room.md)** | Traffic & Waiting Room | Per-showtime queue. Jittered polling. Expiring admission tokens required by mutating routes. |
| **[`08-testing-and-observability.md`](file:///c:/Users/JAMES%20MFEM/Desktop/Lead%20Row/.agents/rules/08-testing-and-observability.md)** | Testing & Observability | 500 VU k6 concurrency test against 50 seats. SQL proof of 0 duplicates. Structured logging. |

