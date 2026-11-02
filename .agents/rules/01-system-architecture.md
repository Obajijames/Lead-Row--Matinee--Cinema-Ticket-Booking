# Rule 01: System Architecture, Locked Stack & Boundaries

**Applies to:** Entire codebase, workspace configuration, build setup, dependency management  
**Severity:** CRITICAL / NON-NEGOTIABLE

---

## 1. Locked Technology Stack

Under no circumstances should any layer of the following technology stack be replaced, bypassed, or substituted without explicit written approval from the project architect:

| Layer | Locked Technology | Prohibited Substitutions |
| :--- | :--- | :--- |
| **Mobile Client** | React Native, Expo, TypeScript | Flutter, native iOS/Android, plain React, web wrappers |
| **Backend API** | Node.js, Express, TypeScript REST API | Next.js API routes, NestJS, Fastify, serverless functions, WebSockets (deferred) |
| **Data Validation** | Zod | Joi, Yup, class-validator, ad-hoc runtime checks |
| **Primary Database** | PostgreSQL, Prisma ORM | MongoDB, MySQL, SQLite, Supabase client-side access |
| **Cache, Locks & Rate Limits** | Redis (standard standalone/cluster) | In-memory maps, REST-only Redis, Memcached |
| **Background Jobs** | BullMQ (on BullMQ-compatible Redis) | In-memory `setTimeout`/`setInterval`, Agenda, RabbitMQ |
| **Payments** | Flutterwave (Test Mode Only) | Paystack, Stripe, live cards, raw card inputs |
| **Movie Metadata** | TMDB (Backend Adapter Only) | Direct client TMDB calls, IMDb scraping, OMDb |
| **Load Testing** | k6 | Artillery, JMeter, manual ApacheBench scripts |
| **Design Source** | Figma design tokens & specifications | Unverified UI mockups, arbitrary one-off styles |

---

## 2. Monorepo Workspace Boundaries

The repository follows a clean, decoupled workspace layout. Agents must respect module isolation:

```text
Lead Row/
├── apps/
│   ├── mobile/             # Expo mobile app, screens, components, tokens, API client
│   └── server/             # Express API, services, repositories, queues, workers
│       └── prisma/         # Prisma schema, migrations, seed scripts
├── docs/                   # System design, traffic, sharding, and component docs
│   ├── ARCHITECTURE.md
│   ├── TRAFFIC.md
│   ├── SHARDING.md
│   ├── COMPONENTS.md
│   ├── LEARNING-LOG.md
│   └── load-test-report.md
├── load-tests/             # k6 concurrency test scripts
├── .agents/rules/          # AI agent engineering constraints
├── design-tokens.tokens.json # Raw design tokens exported from Figma
└── tokens.css              # Compiled CSS Custom Properties
```

### Strict Boundary Rules:
1. **Zero Secret Leakage to Mobile:** `TMDB_API_KEY`, `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_HASH`, and database connection strings must **never** be imported, bundled, or exposed in `apps/mobile/`.
2. **No Direct External API Calls from Mobile:** The mobile client must only communicate with the Lead Row backend REST API (`/v1/*`). It must never call TMDB or Flutterwave directly.
3. **Database Access Exclusively via Repositories:** Express route handlers and services in `apps/server/` must never execute arbitrary raw SQL or instantiate multiple Prisma instances per request. All database queries must run through centralized repository modules.
4. **No Ad-Hoc In-Memory Timers for Critical Tasks:** Never use Node.js `setTimeout` or `setInterval` for seat hold expiry, payment reconciliation, or refunds. All asynchronous background workflows must be dispatched to BullMQ queues.

---

## 3. Failure Mode, Consistency & Real-Time Protocols

1. **Fail Safely:** If Redis, PostgreSQL, BullMQ, or Flutterwave becomes unavailable, the system must return a structured HTTP `503 Service Unavailable` with a descriptive, user-safe error message.
2. **Never Falsify Success:** Never simulate success or bypass inventory checks to make an endpoint return 200 OK when a backing service is unreachable.
3. **Primary-First Consistency & Free-Tier Replication:**
   - All writes and consistency-sensitive reads (e.g. seat map right after a hold, booking state after payment handoff) must query the PostgreSQL primary database.
   - Only stale-tolerant reads (e.g. popular movie lists) may query read replicas.
   - **Free-Tier Dispensation:** If the chosen hosting environment lacks a read replica, retain the explicit repository routing interface (`readClient` vs `writeClient`) pointing to the primary, and document this infrastructure constraint in `ARCHITECTURE.md`.
4. **Real-Time Seat Updates (Polling vs WebSockets):**
   - The initial release mandates **HTTP polling every 3–5 seconds with ETags/version headers** to track seat availability.
   - Do **NOT** introduce WebSockets (`ws`, `socket.io`) during the initial build; WebSockets are deferred until post-launch load test metrics prove polling saturation.

