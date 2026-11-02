# Rule 04: TMDB Integration & Movie Catalogue Caching

**Applies to:** `apps/server/src/adapters/tmdb/`, movie catalog routes, movie caching layers  
**Severity:** HIGH / NON-NEGOTIABLE

---

## 1. Single Adapter Boundary

1. **Strict Isolation:** Exactly **one** backend module (`apps/server/src/adapters/tmdb/`) may communicate with The Movie Database (TMDB) API or know its raw JSON structure.
2. **Internal DTO Transformation:** The TMDB adapter must map external payloads into strongly typed, stable internal Lead Row Data Transfer Objects (DTOs). No other controller, route, service, or repository may import raw TMDB types.
3. **Defensive Ingestion:** Validate incoming TMDB responses defensively with Zod. Handle missing fields, null posters, renamed genres, or unexpected character sets gracefully with stable internal fallbacks.
4. **Secret Confidentiality:** `TMDB_API_KEY` and `TMDB_READ_ACCESS_TOKEN` must exist exclusively in backend environment variables. The mobile bundle must have zero knowledge of TMDB credentials.

---

## 2. Redis Caching Policy & TTL Standards

All normalized movie data must be cached in Redis with strict namespacing and documented, configurable TTLs:

| Resource Type | Cache Key Format | Default TTL | Rationale |
| :--- | :--- | :--- | :--- |
| **Movie Details** | `tmdb:movie:{tmdbId}` | **24 hours** (86,400s) | Static metadata (synopsis, runtime, director) rarely changes. |
| **Catalogue Lists** | `tmdb:list:{now_playing\|popular\|upcoming}:p{page}` | **6 hours** (21,600s) | Balances freshness of release schedules with high cache hit rates. |
| **Search Queries** | `tmdb:search:{normalizedQuery}:p{page}` | **15 minutes** (900s) | Prevents upstream rate limits while keeping search dynamic. |
| **Configuration** | `tmdb:config:images` | **7 days** (604,800s) | TMDB secure base image URLs and available poster/backdrop widths. |

---

## 3. Resilience, Outages & Rate Limiting

1. **Bounded Retries with Jitter:** When calls to TMDB fail with transient network errors or HTTP `5xx`:
   - Maximum retries: **3**.
   - Backoff strategy: Exponential backoff with randomized jitter (e.g., $100\text{ms} \times 2^{\text{attempt}} \pm \text{jitter}$).
   - **Never** retry indefinitely.
2. **Respect `Retry-After`:** If TMDB responds with HTTP `429 Too Many Requests`, parse and honor the `Retry-After` header.
3. **Stale-Cache Fallback:** During a TMDB upstream outage or timeout:
   - If stale cached data exists in Redis, serve the stale data and log a warning.
   - If no cached entry exists, fail gracefully with an HTTP `503 Service Unavailable` returning a user-safe message: `"Movie catalogue is temporarily unavailable. Please try again shortly."`
   - **Never** expose raw Axios/Fetch network timeout errors or internal TMDB error codes to the client.

---

## 4. Attribution & Media Delivery

1. **TMDB Attribution Notice:** The mobile app's About/Settings screen and movie catalogue footer must display official TMDB attribution and logo according to current TMDB terms of service:
   > *"This product uses the TMDB API but is not endorsed or certified by TMDB."*
2. **Image URL Construction:** The backend provides standardized image path keys. The mobile client loads poster and backdrop images progressively using TMDB's secure image CDN (`https://image.tmdb.org/t/p/{width}`) with blurhash or low-resolution placeholders.

