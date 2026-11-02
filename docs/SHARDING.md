# Lead Row - Database Sharding Architecture & Strategy

> **Status:** Architectural Plan (Not simulated or falsely claimed as deployed).

## 1. Candidate Sharding Tables & Keys

As booking volume scales beyond single-node vertical limits, candidate tables for horizontal partitioning include:

| Table | Candidate Shard Key | Rationale |
| :--- | :--- | :--- |
| `booking_seats` | `showtime_id` | Co-locates all seat contention logic for a single screening on one physical node. |
| `seat_holds` | `showtime_id` | Enables localized atomic locking and eliminates cross-shard hold transactions. |
| `bookings` | `showtime_id` | Aligns order records with their corresponding seat allocations. |
| `users` | `user_id` | User identity and authentication partition independently. |

---

## 2. The Blockbuster Hot-Shard Risk & Mitigation

### The Problem:
If thousands of users rush to buy tickets for a single Marvel or Christopher Nolan premiere, all concurrent writes target the exact same `showtime_id`, concentrating load onto a single database shard (a hot shard).

### Mitigations:
1. **Virtual Waiting Room at the Edge:** Limits active concurrency on that specific showtime to 50 active sessions.
2. **Fast Redis In-Memory Hold Gate:** Absorbs 95% of rejected contention before requests reach the database.
3. **Queue-Buffered Confirmations:** Webhook processing is queued in BullMQ, preventing instantaneous spikes on the shard.

