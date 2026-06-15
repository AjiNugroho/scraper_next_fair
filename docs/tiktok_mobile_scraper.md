# TikTok Hashtag Mobile — Feature Spec for Next.js Rebuild

## What This Feature Does

This system manages a pool of **mobile workers** (scraper bots) that are each assigned a list of **TikTok hashtags** to scrape. When new hashtags are registered or workers are added/removed, the system automatically **rebalances** — distributing all hashtags evenly across all available workers using round-robin. Workers then call back to report the video URLs they collected.

---

## Database Schema

All tables use Postgres (via Drizzle ORM). In Next.js, use Drizzle with a Neon/Postgres adapter.

### `workers`
Stores the pool of mobile scraper bots.

| column      | type      | notes            |
|-------------|-----------|------------------|
| id          | uuid (pk) | auto-generated   |
| name        | text      | unique, not null |
| created_at  | timestamp | defaultNow       |

### `job_hashtag`
The global registry of all TikTok hashtags to scrape. Each hashtag is stored once (unique).

| column     | type      | notes          |
|------------|-----------|----------------|
| id         | uuid (pk) | auto-generated |
| hashtag    | text      | unique         |
| created_at | timestamp | defaultNow     |

### `worker_hashtag_task`
Maps which hashtag is assigned to which worker. This is the **result of rebalancing**. The entire table is rebuilt on every rebalance.

| column      | type      | notes                                               |
|-------------|-----------|-----------------------------------------------------|
| id          | uuid (pk) | auto-generated                                      |
| worker_id   | uuid (fk) | → workers.id, ON DELETE CASCADE                     |
| hashtag_id  | uuid (fk) | → job_hashtag.id, ON DELETE CASCADE, **unique**     |
| created_at  | timestamp | defaultNow                                          |

> `hashtag_id` is unique — enforces that each hashtag is assigned to at most one worker at the DB level.

### `tiktok_hashtag_request`
Audit log of every job submission batch. One row per hashtag per batch submission.

| column          | type      | notes                                                          |
|-----------------|-----------|----------------------------------------------------------------|
| id              | uuid (pk) | auto-generated                                                 |
| listen_group_id | integer   | not null                                                       |
| request_data_id | integer   | not null                                                       |
| hashtag         | text      | not null                                                       |
| webhook_url     | text      | optional                                                       |
| extras          | jsonb     | full extras object from the request                            |
| created_at      | timestamp | defaultNow                                                     |

> Unique constraint on `(listen_group_id, request_data_id, hashtag)`. Duplicate submissions are silently ignored (`ON CONFLICT DO NOTHING`).

### `tiktok_hashtag_video_result`
Stores video URLs returned by workers. Flattened — one row per URL.

| column      | type      | notes          |
|-------------|-----------|----------------|
| id          | uuid (pk) | auto-generated |
| worker_name | text      | not null       |
| video_url   | text      | not null       |
| created_at  | timestamp | defaultNow     |

---

## Rebalancing Algorithm

Rebalancing is triggered any time the worker pool or hashtag list changes. It is a **full rebuild** of `worker_hashtag_task` inside a transaction.

```
function rebalance():
  allWorkers = SELECT * FROM workers
  allHashtags = SELECT id FROM job_hashtag

  if allWorkers is empty OR allHashtags is empty:
    DELETE all rows from worker_hashtag_task
    return

  assignments = allHashtags.map((hashtag, index) => ({
    hashtagId: hashtag.id,
    workerId: allWorkers[index % allWorkers.length].id
  }))

  BEGIN TRANSACTION
    DELETE all rows from worker_hashtag_task
    INSERT assignments into worker_hashtag_task
  COMMIT
```

**Example**: 2 workers (W0, W1), 10 hashtags (H0–H9):
- W0 → H0, H2, H4, H6, H8
- W1 → H1, H3, H5, H7, H9

The order of `allWorkers` and `allHashtags` should be consistent (e.g., ordered by `created_at`) for deterministic assignment.

### Rebalance triggers
Rebalance is called after:
1. A worker is **created**
2. A worker is **deleted**
3. A job batch is **submitted** (new hashtags registered)

---

## API Endpoints

All endpoints require API key authentication via `x-api-key` header.

---

### Workers

#### `POST /v2/tiktok-hashtag-mobile/workers`
Create a new mobile worker.

**Request body:**
```json
{ "name": "worker-01" }
```

**Responses:**
- `201` — `{ "success": true, "worker": { "id": "...", "name": "worker-01", "createdAt": "..." } }`
- `409` — `{ "error": "Worker name already exists" }`
- `500` — `{ "error": "Failed to create worker" }`

**Side effect:** triggers `rebalance()`.

---

#### `DELETE /v2/tiktok-hashtag-mobile/workers/:name`
Delete a worker by name.

**Responses:**
- `200` — `{ "success": true }`
- `404` — `{ "error": "Worker not found" }`
- `500` — `{ "error": "Failed to delete worker" }`

**Side effect:** triggers `rebalance()`. Because `worker_hashtag_task.worker_id` has `ON DELETE CASCADE`, the worker's assignments are automatically removed before rebalancing.

---

### Jobs

#### `POST /v2/tiktok-hashtag-mobile/jobs`
Register a batch of hashtags as scraping jobs.

**Request body:**
```json
{
  "webhook_url": "https://example.com/webhook",
  "extras": {
    "listen_group_id": 1,
    "request_data_id": 42
  },
  "data": [
    { "identifier": "savearth", "date_start": "2024-01-01", "date_end": "2024-12-31", "data_size": 100 },
    { "identifier": "ocean" }
  ]
}
```

**Validation rules:**
- `extras.listen_group_id` — required integer
- `extras.request_data_id` — required integer
- `extras` — may contain any additional key-value pairs
- `data` — array of 1–50 items
- `data[].identifier` — required, the TikTok hashtag (no `#` prefix)
- `data[].date_start`, `data[].date_end` — optional strings
- `data[].data_size` — optional integer

**What happens on submit:**
1. Insert one row per hashtag into `tiktok_hashtag_request` (ignore duplicates via `ON CONFLICT DO NOTHING`)
2. Insert each hashtag into `job_hashtag` (ignore duplicates via `ON CONFLICT DO NOTHING`)
3. Call `rebalance()`

**Responses:**
- `201` — `{ "success": true }`
- `500` — `{ "error": "Failed to create job" }`

> Duplicate hashtag submissions always return success — they are idempotent.

---

#### `GET /v2/tiktok-hashtag-mobile/jobs/hashtags?worker_name=<name>`
Get the list of hashtags currently assigned to a worker.

**Query params:**
- `worker_name` — required

**Response:**
```json
["savearth", "ocean", "wildlife"]
```
Plain array of hashtag strings. Returns `[]` if the worker has no assignments.

- `400` — `{ "error": "worker_name is required" }` if param is missing

**Query logic:** joins `worker_hashtag_task` → `job_hashtag` → `workers`, filters by `workers.name`.

---

### Results

#### `POST /v2/tiktok-hashtag-mobile/results`
Workers call this endpoint to submit scraped video URLs.

**Request body:**
```json
{
  "worker_name": "worker-01",
  "video_urls": [
    "https://www.tiktok.com/@user/video/123",
    "https://www.tiktok.com/@user/video/456"
  ]
}
```

**Validation rules:**
- `worker_name` — required string
- `video_urls` — array of valid URLs, min 1 item

**What happens:** Each URL is inserted as a separate row in `tiktok_hashtag_video_result` (flattened). No deduplication.

**Responses:**
- `201` — `{ "success": true, "saved": 2 }` (count of rows inserted)
- `500` — `{ "error": "Failed to save results" }`

---

## Next.js Implementation Notes

### Auth
All routes require API key validation. Check the `x-api-key` request header and verify against the `apikey` table using Better Auth's `verifyApiKey`. Reject with `401`/`403` if invalid or missing.

### Rebalance
Extract the rebalance function into a shared utility (e.g., `lib/rebalance.ts`) and import it in the three route files that trigger it.

### Database
Use Drizzle ORM with `drizzle-orm/neon-http` and `@neondatabase/serverless`. The `db.transaction()` call in rebalance requires this to work correctly on serverless/edge runtimes.

### Key invariants to preserve
1. `worker_hashtag_task.hashtag_id` must be unique — each hashtag belongs to at most one worker.
2. Rebalance always wipes and rebuilds the entire `worker_hashtag_task` table — never do partial updates.
3. Job submission is idempotent — same `(listen_group_id, request_data_id, hashtag)` triple never errors.
4. Rebalance gracefully handles zero workers or zero hashtags by clearing the task table.
