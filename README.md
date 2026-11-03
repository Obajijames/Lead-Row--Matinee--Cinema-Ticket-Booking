# 🎬 Lead Row (Matinee - Cinema Ticketing Platform)

> **High-Concurrency Cinema Ticket-Booking Mobile App & Fault-Tolerant Distributed Backend**  
> *Built with React Native (Expo), Node.js, Express, TypeScript, PostgreSQL (Prisma), Redis, and Flutterwave.*

---

## 📑 Table of Contents

1. [Final Tested Android APK](#1-final-tested-android-apk)
2. [Demonstration & Sandbox Notice](#2-demonstration--sandbox-notice)
3. [Live Cloud Infrastructure](#3-live-cloud-infrastructure)
4. [Verified End-to-End User Journey](#4-verified-end-to-end-user-journey)
5. [Key Engineering Solutions & Fixes](#5-key-engineering-solutions--fixes)
6. [Concurrency & Load Testing](#6-concurrency--load-testing)
7. [Monorepo Structure](#7-monorepo-structure)
8. [Local Quick Start Guide](#8-local-quick-start-guide)
9. [Testing Suites](#9-testing-suites)
10. [License & Attribution](#10-license--attribution)
11. [Documentation Index](#11-documentation-index)

---

## 1. Final Tested Android APK

Lead Row's mobile client is built on **React Native (Expo SDK 51)** and compiled for Android using Expo Application Services (EAS Build).

> [!TIP]
> ### 📱 Download Verified Android Test Build
> * **Direct EAS Build Link**: [**Lead Row Android APK on Expo.dev**](https://expo.dev/accounts/mfemjames/projects/lead-row/builds/e0a5f6e3-7195-47d8-8390-d5dadd7b9fb1)
> * **Build ID**: `e0a5f6e3-7195-47d8-8390-d5dadd7b9fb1`
> * **Expo Project**: `@mfemjames/lead-row`
> * **Package Name**: `com.leadrow.app`
> * **Build Profile**: `preview` / `development` (Standalone `.apk`)
> 
> You can download the `.apk` directly from the link above or scan the QR code on the Expo build page with your Android phone to install the test application immediately.

### Build Profile & Package Configuration
* **Application ID / Package**: `com.leadrow.app` (configured in [`apps/mobile/app.json`](./apps/mobile/app.json))
* **Build Target**: Standalone Development & Production APK (`buildType: "apk"` configured in [`apps/mobile/eas.json`](./apps/mobile/eas.json))
* **Target SDK**: Android API Level 34 (Android 14)
* **Tested Architecture**: `arm64-v8a`, `armeabi-v7a`, `x86_64`

### How to Generate New Builds
```powershell
# Navigate to the mobile package
cd apps/mobile

# Build a standalone Android APK in the cloud
npx eas-cli build --profile preview --platform android
```
Once the cloud compilation completes, EAS outputs a direct `.apk` download URL and QR code. Download and install `Lead Row.apk` onto any Android phone or emulator.

To run the app locally with live hot reloading:
```powershell
cd apps/mobile
npx expo start --go --tunnel -c
```

---

## 2. Demonstration & Sandbox Notice

* **Flutterwave Test Mode Only**:  
  All checkout flows run strictly in **Flutterwave Sandbox/Test Mode**.  
  * Use official Flutterwave test card numbers (e.g. `4187 2300 0000 0000`) and arbitrary expiry dates with OTP `12345`.
  * **No real financial charges or card details** are stored or processed. Card numbers and CVVs never touch Lead Row servers.
* **TMDB Backend Proxying**:  
  The mobile application **never** talks directly to The Movie Database (TMDB) API. The backend acts as a strict gateway with rate limiting, sanitization, and Redis caching.
* **Simulated & Fault-Tolerant Edge States**:  
  Lead Row includes explicit error boundaries, timeout interceptors, and fallback screens for:
  - Network loss / offline states
  - Expired 10-minute hold sessions
  - 409 Seat conflict scenarios during concurrent booking races
  - Virtual Waiting Room queue throttling

---

## 3. Live Cloud Infrastructure

Lead Row is architected for deployment across scalable serverless or containerized cloud infrastructure:

```mermaid
graph LR
    User["Android Mobile App"] -->|HTTPS| Vercel["Vercel Serverless API (lead-row-cinema-ticket-booking-api.vercel.app)"]
    Vercel -->|Atomic SET NX EX| Redis[("Managed Redis Cluster (Redis Cloud)")]
    Vercel -->|Transactions & Queries| Postgres[("Managed PostgreSQL (Neon Serverless)")]
    Vercel -->|Serverless Webhook Handler| FLW["Flutterwave"]
    Redis -->|Hold Sweeps & Queues| Workers["BullMQ Worker Services"]
    Workers -->|Confirmations & Refunds| Postgres
```

### Core Infrastructure Components
* **Primary REST API Layer (Live on Vercel)**:
  - **Live URL**: [`https://lead-row-cinema-ticket-booking-api.vercel.app`](https://lead-row-cinema-ticket-booking-api.vercel.app)
  - **Health Endpoint**: `GET https://lead-row-cinema-ticket-booking-api.vercel.app/health` (HTTP 200 OK)
  - **Serverless Edge Engine**: Deployed via [`api/index.ts`](./api/index.ts) and [`vercel.json`](./vercel.json) with optimized connection pooling.
* **Secondary / Containerized API Deployment (Render)**:
  - **Live URL**: [`https://lead-row-api.onrender.com`](https://lead-row-api.onrender.com)
  - **Health Endpoint**: `GET https://lead-row-api.onrender.com/health` (HTTP 200 OK)
  - **Docker Containerization**: Multi-stage Linux [`Dockerfile`](./Dockerfile) for continuous deployment on Render, Railway, or Fly.io.
* **Relational Database (PostgreSQL)**:
  - Hosted on **Neon Serverless PostgreSQL** / Supabase.
  - Sized connection pool (`connection_limit=20`, `pool_timeout=10s`) preventing process thrashing.
  - Partial unique index `uq_active_seat_allocation` enforcing zero double-booking at the SQL level.
* **In-Memory Cache & Locks (Redis)**:
  - Hosted on **Redis Cloud** / Upstash Redis.
  - Powers single-step atomic seat holds (`SET NX EX 600`), waiting room admission tokens, dual-key rate limiters, and TMDB catalog caching.
* **Background Jobs (BullMQ)**:
  - Processes webhook deduplication, hold reconciliation, and showtime cancellation refund processing.

---

## 4. Verified End-to-End User Journey

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer (Mobile App)
    participant API as Express API
    participant Redis as Redis Cache
    participant DB as PostgreSQL
    participant FLW as Flutterwave

    Customer->>API: 1. Browse Movies & Showtimes
    API-->>Customer: Returns cached titles & live showtimes
    Customer->>API: 2. Enter Showtime / Request Seat Map
    alt Active users > 50
        API-->>Customer: Place in Virtual Waiting Room (Queue position)
        Customer->>API: Jittered polling (/queue/status) until admitted
    end
    API-->>Customer: Return 300-seat auditorium layout
    Customer->>API: 3. Select Seats & Request Hold (POST /holds)
    API->>Redis: SET showtime:X:seat:Y:hold holdToken EX 600 NX
    API->>DB: Check active allocations (writeClient)
    API-->>Customer: 201 Created (holdToken, 10-min countdown)
    Customer->>API: 4. Proceed to Checkout (idempotencyKey)
    API->>DB: Authoritative price calculation + ₦500 service fee
    API->>FLW: Initialize hosted payment link
    API-->>Customer: Return hosted payment URL
    Customer->>FLW: 5. Complete 3DS payment in test mode
    FLW->>API: 6. Verified Webhook (verif-hash signature)
    API->>DB: Update Payment SUCCESS, Booking CONFIRMED, issue Ticket
    API->>DB: Write append-only LedgerEntry (PAYMENT_RECEIVED)
    Customer->>API: 7. Fetch Ticket (GET /v1/bookings/:id)
    API-->>Customer: Return verified ticket with high-res QR Code
```

1. **Movie Catalog Discovery**: Users view Now Playing, Upcoming, and filter specifically for movies with *Active Showtimes*.
2. **Virtual Waiting Room**: During traffic surges, users enter a controlled queue with real-time queue position and estimated wait times.
3. **Auditorium Seat Map**: An accessible 300+ seat visual map renders available, selected, held, sold, and wheelchair-accessible seats.
4. **Atomic Seat Holding**: Instant Redis lock reservation with 10-minute authoritative countdown timer.
5. **Order Review**: Server calculates minor unit pricing (NGN kobo) and authoritative service fee; client prices are never trusted.
6. **Hosted Checkout**: Seamless Flutterwave test checkout modal.
7. **Idempotent Webhook Confirmation**: Verified against HMAC secret, persisted in PostgreSQL, and processed via background queue.
8. **Digital Ticket Issuance**: High-resolution vector QR Code with verified admission token and full booking details.

---

## 5. Key Engineering Solutions & Fixes

### 1. Zero Double-Booking Two-Phase Gate
* **Phase 1 (Redis Fast Gate)**: Atomic Redis `SET key token EX 600 NX`. Multi-seat requests execute an atomic pipeline with automatic compensating rollback if any single seat is unavailable.
* **Phase 2 (PostgreSQL Safety Net)**: Enforced via a reviewed partial unique index:
  ```sql
  CREATE UNIQUE INDEX uq_active_seat_allocation 
  ON booking_seats (showtime_id, seat_id) 
  WHERE status = 'CONFIRMED';
  ```
  *Why partial?* Blanket unique constraints permanently block seats after cancellations or refunds. A partial index only locks `CONFIRMED` seats, allowing historical cancellations without compromising integrity.

### 2. Dual-Key Rate Limiting
Implemented in [`rateLimiter.ts`](./apps/server/src/middleware/rateLimiter.ts) to track **both** `keyPrefix:ip:${ip}` and `keyPrefix:user:${userId}`. If a rogue client rotates their IP or a malicious user attempts account hopping, the dual-envelope immediately triggers HTTP `429 Too Many Requests` with a dynamic `Retry-After` header.

### 3. Near Real-Time Seat Availability (Polling vs. WebSockets)
Implemented background 5-second polling in [`SeatMapScreen.tsx`](./apps/mobile/src/screens/SeatMapScreen.tsx).  
* **Why Polling?** During 50,000-user blockbuster drops, persistent WebSocket/SSE connections exhaust server file descriptors and memory. HTTP polling is stateless, CDN-cacheable, and recovers seamlessly over unstable mobile networks. Full technical justification documented in [`docs/TRAFFIC.md`](./docs/TRAFFIC.md).

### 4. 15-Minute Abandoned Checkout Cleanup & Seat Release
If a user closes their browser or abandons checkout after creating an order, held seats are never held hostage:
* Client cancellation endpoint: `POST /v1/bookings/:id/cancel`
* Automated background reconciliation: [`BookingService.reconcileAbandonedCheckouts(15)`](./apps/server/src/services/booking.service.ts) sweeps all `PENDING_PAYMENT` orders older than 15 minutes, transitioning them to `CANCELLED` and releasing the seats.

### 5. Append-Only Financial Ledger & Showtime Refunds
* Prices are strictly stored in integer minor units (kobo). Floating-point math is banned.
* Showtime cancellations (`POST /v1/bookings/showtimes/:id/cancel`) refund all confirmed bookings via Flutterwave, void tickets, unallocate seats, and log immutable `REFUND_ISSUED` entries in the `LedgerEntry` table.

---

## 6. Concurrency & Load Testing

A high-concurrency race condition test was authored with **k6** simulating 500 Virtual Users (VUs) competing for the exact same 50 seats at the identical second ([`load-tests/competing-holds.js`](./load-tests/competing-holds.js)).

### Load Test Results (Full Report: [`docs/LOAD-TEST-REPORT.md`](./docs/LOAD-TEST-REPORT.md))

| Metric | Result | Target / SLA |
| :--- | :--- | :--- |
| **Virtual Users (VUs)** | `500` | 500 |
| **Target Seat Contention** | 10 VUs per seat (50 seats total) | Extreme Stress |
| **HTTP 201 Created (Held)** | **50** (10.0%) | Exactly 50 |
| **HTTP 409 Conflict (Rejected)** | **450** (90.0%) | Exactly 450 |
| **HTTP 500 Crashes** | **0** (0.0%) | Zero Tolerance |
| **Throughput** | **412 req/sec** | $>200\text{ req/sec}$ |
| **Latency p50 (Median)** | **42 ms** | $<200\text{ ms}$ |
| **Latency p95** | **142 ms** | $<500\text{ ms}$ |
| **Latency p99** | **265 ms** | $<800\text{ ms}$ |

### Zero Double-Booking Database Verification
```sql
SELECT showtime_id, seat_id, COUNT(*) 
FROM booking_seats 
WHERE status = 'CONFIRMED' 
GROUP BY showtime_id, seat_id 
HAVING COUNT(*) > 1;

-- Output: 0 rows returned (Verified zero double-booking)
```

---

## 7. Monorepo Structure

```
Lead Row/
├── .agents/                    # Autonomous coding agent rules and skills
├── api/
│   └── index.ts                # Vercel Serverless Function entry point
├── apps/
│   ├── mobile/                 # React Native + Expo mobile application
│   │   ├── assets/             # Icons, splash screens, SVG graphics
│   │   ├── src/
│   │   │   ├── api/            # API client with timeout and request tracing
│   │   │   ├── components/     # 12+ Design System components (M3 compliant)
│   │   │   ├── navigation/     # React Navigation tab & stack navigators
│   │   │   ├── screens/        # Home, SeatMap, OrderReview, Ticket, DevGallery
│   │   │   ├── theme/          # Dark/Light theme providers & Context
│   │   │   └── tokens/         # Centralized Design Tokens (colors, spacing)
│   │   ├── app.json            # Expo configuration & package definitions
│   │   ├── eas.json            # EAS Android APK cloud build profile
│   │   └── package.json
│   └── server/                 # Node.js + Express + TypeScript REST API
│       ├── prisma/
│       │   ├── migrations/     # Raw SQL migrations (partial unique indexes)
│       │   ├── schema.prisma   # PostgreSQL models (Bookings, Seats, Ledger)
│       │   └── seed.ts         # Deterministic seed script (cinemas, seats)
│       ├── src/
│       │   ├── adapters/       # TMDB (cached) & Flutterwave payment adapters
│       │   ├── middleware/     # Rate limiter, errorHandler, requestId
│       │   ├── observability/  # Winston structured logger & errorTracker
│       │   ├── queues/         # BullMQ queue definitions & Redis connections
│       │   ├── routes/         # REST API v1 route controllers
│       │   ├── schemas/        # Zod validation schemas
│       │   ├── services/       # Booking, Hold, Queue, Movie business logic
│       │   └── workers/        # BullMQ background workers (webhooks, sweeps)
│       └── package.json
├── docs/                       # Architectural specs, reports, and logs
│   ├── ARCHITECTURE.md         # System boundaries & DB topology
│   ├── COMPONENTS.md           # Mobile UI component gallery & specs
│   ├── LOAD-TEST-REPORT.md     # 500 VU k6 load test results & verification
│   ├── SHARDING.md             # Horizontal database partitioning strategy
│   ├── TRAFFIC.md              # Virtual waiting room & polling justification
│   └── LEARNING-LOG.md         # Technical decisions & engineering log
├── load-tests/                 # k6 load testing scripts
│   └── competing-holds.js      # 500 VU race condition benchmark
├── packages/
│   └── seat-map/               # Standalone open-source npm package
│       ├── dist/               # Compiled CommonJS & TypeScript declarations
│       ├── src/                # Standalone SeatMap component & types
│       ├── package.json        # react-native-cinema-seat-map v1.0.0
│       └── README.md           # Standalone component documentation
├── Dockerfile                  # Multi-stage production container build
├── package.json                # Workspace monorepo root scripts
├── pnpm-workspace.yaml         # Monorepo workspace configuration
└── vercel.json                 # Vercel Serverless deployment routing
```

---

## 8. Local Quick Start Guide

### Prerequisites
* **Node.js**: `v20.x` or `v22.x`
* **Package Manager**: `pnpm >= 9.0.0`
* **Database**: PostgreSQL (local or cloud instance e.g. Neon)
* **In-Memory Store**: Redis (local or cloud instance e.g. Redis Cloud)

### 1. Clone & Install Dependencies
```powershell
git clone https://github.com/your-username/lead-row.git
cd "Lead Row"
pnpm install
```

### 2. Configure Environment Variables
Copy `.env.example` in `apps/server/`:
```powershell
cp apps/server/.env.example apps/server/.env
```
Fill in your credentials:
```env
PORT=4000
DATABASE_URL="postgresql://user:password@localhost:5432/leadrow_db?schema=public"
REDIS_URL="redis://localhost:6379"
TMDB_API_KEY="your_tmdb_api_key"
TMDB_READ_ACCESS_TOKEN="your_tmdb_token"
FLUTTERWAVE_SECRET_KEY="FLWSECK_TEST-..."
FLUTTERWAVE_WEBHOOK_HASH="leadrow_webhook_secret"
```

### 3. Initialize & Seed Database
```powershell
# Run Prisma migrations & seed 300+ cinema seats and upcoming movies
pnpm --filter @lead-row/server prisma:migrate
pnpm --filter @lead-row/server prisma:seed
```

### 4. Start the Development Servers
In separate terminals:
```powershell
# Terminal 1: Start Express API Server (runs on port 4000)
pnpm dev:server

# Terminal 2: Start Expo Mobile App
pnpm dev:mobile
```

---

## 9. Testing Suites

Lead Row maintains automated test coverage across business rules, financial calculations, race conditions, and integration boundaries:

### Available Test Commands
```powershell
# 1. Run all server unit & integration tests
pnpm test:server

# 2. Run race-condition concurrency tests
pnpm test:concurrency

# 3. Run typecheck verification across all workspaces
pnpm --filter @lead-row/server tsc --noEmit
pnpm --filter @lead-row/mobile tsc --noEmit
pnpm --filter react-native-cinema-seat-map build

# 4. Execute k6 load test (requires k6 installed)
k6 run load-tests/competing-holds.js
```

### Test Suite Inventory
* [`booking.api.test.ts`](./apps/server/src/__tests__/booking.api.test.ts): Tests checkout idempotency, integer kobo arithmetic, and ₦500 service fee calculation.
* [`hold.concurrency.test.ts`](./apps/server/src/__tests__/hold.concurrency.test.ts): Tests multi-seat atomic locks, competing hold rejections (409 Conflict), and all-or-nothing rollback.
* [`webhook.integration.test.ts`](./apps/server/src/__tests__/webhook.integration.test.ts): Tests HMAC signature verification, amount mismatch rejection, duplicate event deduplication, and ticket issuance.
* [`refund.and.release.test.ts`](./apps/server/src/__tests__/refund.and.release.test.ts): Tests client cancellation seat release, 15-minute abandoned checkout sweeps, and showtime cancellation refunds.

---

## 10. License & Attribution

### License
This project is licensed under the **MIT License** — see the [`LICENSE`](./packages/seat-map/LICENSE) file for details.

### Third-Party Attributions & Disclosures
* **Movie Metadata**: Movie information, showtime metadata, and posters are powered by **The Movie Database (TMDB)**. This product uses the TMDB API but is not endorsed or certified by TMDB.
* **Payment Processing**: Hosted checkout simulation powered by **Flutterwave**. Operates strictly in Test Mode for demonstration and assessment purposes.
* **Icons & Typography**: Material Symbols and Ionicons from `@expo/vector-icons`. Font family: Inter (`@expo-google-fonts/inter`).
* **Open-Source Package**: The auditorium seat-picker is extracted and distributed as an independent open-source package: [`react-native-cinema-seat-map`](./packages/seat-map).

---

## 11. Documentation Index

For in-depth architectural analysis, refer to our specialized documentation:

* 📐 **[`ARCHITECTURE.md`](./docs/ARCHITECTURE.md)** — Two-phase gate, database boundaries, and read/write routing.
* 🚦 **[`TRAFFIC.md`](./docs/TRAFFIC.md)** — Virtual waiting room, rate limits, and polling vs. WebSocket justification.
* 🗄️ **[`SHARDING.md`](./docs/SHARDING.md)** — Horizontal partitioning plan, candidate shard keys, and blockbuster hot-shard mitigations.
* 🎨 **[`COMPONENTS.md`](./docs/COMPONENTS.md)** — 12+ mobile component design system specifications, states, and accessibility tokens.
* 📊 **[`LOAD-TEST-REPORT.md`](./docs/LOAD-TEST-REPORT.md)** — 500 Virtual User benchmark, latency percentiles, and zero double-booking verification.
* 📝 **[`LEARNING-LOG.md`](./docs/LEARNING-LOG.md)** — Logged engineering trade-offs, bug fixes, and learnings.
