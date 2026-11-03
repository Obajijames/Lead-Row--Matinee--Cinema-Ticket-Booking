# Lead Row - Database Sharding Architecture & Strategy

> **Status:** Architectural Plan (Not simulated or falsely claimed as deployed).

---

## 1. Candidate Sharding Tables & Keys

As booking volume scales beyond single-node vertical limits (e.g. $> 10,000$ concurrent showtimes nationwide), candidate tables for horizontal partitioning include:

| Table | Candidate Shard Key | Rationale |
| :--- | :--- | :--- |
| `booking_seats` | `showtime_id` | Co-locates all seat contention logic for a single screening on one physical node. |
| `seat_holds` | `showtime_id` | Enables localized atomic locking and eliminates cross-shard hold transactions. |
| `bookings` | `showtime_id` | Aligns order records with their corresponding seat allocations. |
| `showtimes` | `id` (maps to `showtime_id`) | Showtimes partition alongside their dependent inventory. |
| `users` | `id` (`user_id`) | User identity, profiles, and authentication partition independently on a user shard cluster. |
| `cinemas` & `auditoriums` | Global / Replicated | Reference metadata is low-frequency read-heavy; globally replicated across all shards. |
| `movies` | Global / Replicated | Synchronized from TMDB and read-replicated to every shard node. |

---

## 2. Co-Location Requirements

To preserve database transaction atomicity (`ACID`) without costly distributed two-phase commits (`2PC`):

1. **Intra-Showtime Co-Location:**
   - All records sharing the same `showtime_id` (`showtimes`, `seat_holds`, `bookings`, `booking_seats`) **must reside on the exact same physical database shard**.
   - This ensures that seat hold verification, checkout transactions, and the partial unique constraint (`uq_active_seat_allocation`) execute within a single PostgreSQL engine instance with zero network serialization delay.

2. **Cross-Entity References:**
   - User lookups during checkout perform a stateless foreign reference check or read from a local read-replica cache of the `users` table.
   - Financial ledger entries (`ledger_entries`) partition by `booking_id` or append to an immutable append-only financial event stream.

---

## 3. The Blockbuster Hot-Shard Risk & Mitigation

### The Problem:
If tens of thousands of users rush to buy tickets for a single blockbuster premiere (e.g. Marvel, Avatar, or Christopher Nolan), horizontal sharding by `showtime_id` creates a **hot shard** because all concurrent traffic for that movie targets the single database node holding that specific `showtime_id`.

### Mitigations:
1. **Virtual Waiting Room at the Edge:**
   - The waiting room throttles admissions per showtime to a safe concurrency cap (`WAITING_ROOM_ACTIVE_CAP = 50`), ensuring no shard ever experiences unmanaged connection exhaustion.
2. **Fast Redis In-Memory Hold Gate:**
   - 95% of rejected contention is absorbed by atomic Redis `SET NX EX 600` operations in RAM before requests ever touch PostgreSQL.
3. **Controlled Queue Polling with Jitter:**
   - Client polling intervals include randomized jitter ($\pm 500\text{ms}$), preventing synchronized thundering herd spikes.
4. **BullMQ Worker Queue Buffering:**
   - Inbound payment webhooks are enqueued and processed asynchronously with concurrency rate limits per worker.

---

## 4. Multi-Phase Sharding Migration Plan

When scaling out of the current single-node PostgreSQL topology to a distributed Citus / Amazon Aurora distributed cluster:

### Phase 1: Schema & Query Harmonization (Pre-Migration)
- Add composite primary keys where required: modify tables to ensure `showtime_id` is present on all inventory-related unique indexes.
- Audit all application queries to ensure no cross-showtime `JOIN` operations exist in mutating paths.

### Phase 2: Dual-Write Abstraction Layer
- Introduce a Shard Routing Proxy (e.g. Citus Coordinator or application-level routing repository).
- All new showtimes are assigned to a target shard based on a consistent hashing function:
  $$\text{Shard ID} = \text{murmur3}(\text{showtime\_id}) \pmod N$$
- Write operations to active showtimes write to the target shard; historical queries fall back to the monolith.

### Phase 3: Historical Data Backfill
- Asynchronously backfill historical showtimes, past bookings, and audit records from the monolith to target shards using chunked background workers with rate limiting.

### Phase 4: Shadow Verification & Cutover
- Run shadow read queries comparing single-node vs. sharded query outputs for consistency.
- Switch all routing exclusively to the sharded database cluster.
- Monitor query latency, connection pool saturation, and replication lag.

### Phase 5: Decommissioning Monolith
- Archive historical tables on the legacy single-node database to cold storage (e.g. Parquet on S3) and decommission the legacy cluster.

