# Implementation Plan: Scalable Distributed URL Shortener Platform

## Overview

Incremental implementation of the URL shortener backend (Node.js/Express), background worker (BullMQ), and React frontend. Tasks are ordered so each step builds on the previous: project scaffolding → core utilities → auth → URL engine → redirect → analytics → caching/rate-limiting → frontend → integration wiring.

---

## Tasks

- [ ] 1. Project scaffolding and shared infrastructure
  - [ ] 1.1 Initialize monorepo structure with backend and frontend workspaces
    - Create `/backend` (Node.js/Express) and `/frontend` (React + Vite + Tailwind) directories
    - Add root `package.json` with workspace scripts
    - Add `.env.example` with all required environment variable keys (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `PORT`, etc.)
    - _Requirements: REQ-NFT-4_

  - [ ] 1.2 Configure Docker Compose for local development
    - Write `docker-compose.yml` with services: `api`, `worker`, `postgres`, `redis`
    - Map ports, set environment variables, add health checks for `postgres` and `redis`
    - Write `Dockerfile` for backend (multi-stage: build + production)
    - _Requirements: REQ-NFT-4_

  - [ ] 1.3 Set up PostgreSQL schema and migration scripts
    - Create `backend/db/migrations/001_init.sql` with `users`, `urls`, and `analytics` table DDL (including all indexes and constraints from the design)
    - Add a `backend/db/migrate.js` runner script that applies migrations in order
    - _Requirements: REQ-AUTH-1, REQ-URL-1, REQ-ANALYTICS-1, REQ-SHARD-1_

  - [ ] 1.4 Configure Express application entry point and shared middleware
    - Set up `backend/src/app.js` with Express app, `helmet`, JSON body parser, and CORS
    - Wire global error-handling middleware that returns the standard JSON error envelope `{ error, message, statusCode }`
    - Set up `backend/src/server.js` to start the HTTP server
    - _Requirements: REQ-NFT-2_

  - [ ] 1.5 Set up Redis client and BullMQ queue definitions
    - Create `backend/src/lib/redisClient.js` using `ioredis`
    - Create `backend/src/queues/analyticsQueue.js` defining the BullMQ `analytics` queue
    - _Requirements: REQ-ANALYTICS-3, REQ-CACHE-1, REQ-RATE-1_

  - [ ] 1.6 Set up backend testing framework
    - Install and configure Jest (or Vitest) with `--runInBand` for sequential DB tests
    - Install `fast-check` for property-based tests
    - Add `backend/jest.config.js` (or `vitest.config.js`) with coverage thresholds (80%)
    - _Requirements: (testing infrastructure)_

- [ ] 2. Core utility functions
  - [ ] 2.1 Implement Base62 short code generator
    - Create `backend/src/utils/shortCode.js` with `generateShortCode()` that produces a 6-character Base62 string using the alphabet `0-9A-Za-z`
    - _Requirements: REQ-URL-1_

  - [ ]* 2.2 Write property tests for short code generator (Property 5 & 6)
    - **Property 5: Base62 short codes** — for any generated code, all characters are in `[0-9A-Za-z]` and length === 6
    - **Property 6: Short code uniqueness across bulk generation** — any batch of N ≥ 2 generated codes contains no duplicates
    - Tag comments: `// Feature: url-shortener, Property 5` and `// Feature: url-shortener, Property 6`
    - Minimum 100 iterations each (`fc.assert(..., { numRuns: 100 })`)
    - **Validates: REQ-URL-1**

  - [ ] 2.3 Implement email and URL validators
    - Create `backend/src/utils/validators.js` with `isValidEmail(str)` and `isValidUrl(str)` functions
    - `isValidEmail`: conforms to RFC 5321 (exactly one `@`, valid local part, valid domain with TLD)
    - `isValidUrl`: requires `http://` or `https://` scheme and a valid host
    - _Requirements: REQ-AUTH-1, REQ-URL-1_

  - [ ]* 2.4 Write property tests for validators (Property 1 & 7)
    - **Property 1: Email validation correctness** — for arbitrary strings, `isValidEmail(x)` accepts iff the string is a valid email
    - **Property 7: URL format validation correctness** — for arbitrary strings, `isValidUrl(x)` accepts iff the string is a well-formed `http(s)://` URL
    - Tag comments: `// Feature: url-shortener, Property 1` and `// Feature: url-shortener, Property 7`
    - Minimum 100 iterations each
    - **Validates: REQ-AUTH-1, REQ-URL-1**

  - [ ] 2.5 Implement shard router
    - Create `backend/src/utils/shardRouter.js` with `getShard(shortCode)` implementing the character-range mapping: `A–F → shard_1`, `G–M → shard_2`, `N–S → shard_3`, `T–Z and digits → shard_4`
    - _Requirements: REQ-SHARD-1, REQ-SHARD-2_

  - [ ]* 2.6 Write property tests for shard router (Property 14)
    - **Property 14: Shard router determinism and correctness** — for any short code string, `getShard` returns a deterministic shard in `{shard_1, shard_2, shard_3, shard_4}` matching the first-character range rules, and the same input always produces the same output
    - Tag comment: `// Feature: url-shortener, Property 14`
    - Minimum 100 iterations
    - **Validates: REQ-SHARD-1, REQ-SHARD-2**

- [ ] 3. Checkpoint — Core utilities
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Authentication module
  - [ ] 4.1 Implement user registration endpoint
    - Create `backend/src/modules/auth/authController.js` with `register` handler
    - Validate `name`, `email` (use `isValidEmail`), and `password` fields; return `400 VALIDATION_ERROR` on failure
    - Hash password with `bcrypt` (saltRounds=12) before storing; return `409 EMAIL_ALREADY_EXISTS` on duplicate
    - Insert into `users` table; return `201` with `{ message, userId }`
    - _Requirements: REQ-AUTH-1_

  - [ ] 4.2 Implement user login endpoint
    - Add `login` handler: fetch user by email, `bcrypt.compare` password, sign JWT (24h expiry) with `{ userId, email }` payload
    - Return `200 { token }` on success; `401 INVALID_CREDENTIALS` on failure
    - _Requirements: REQ-AUTH-2_

  - [ ] 4.3 Implement JWT auth middleware
    - Create `backend/src/middleware/authMiddleware.js` that reads `Authorization: Bearer <token>`, verifies the JWT, attaches `req.user`, and calls `next()`
    - Return `401 UNAUTHORIZED` for absent, expired, or malformed tokens
    - _Requirements: REQ-AUTH-3_

  - [ ]* 4.4 Write property tests for auth module (Property 2 & 3)
    - **Property 2: Password storage is never plaintext** — for any password string, `storedHash !== plain` AND `bcrypt.compare(plain, hash)` returns `true`
    - **Property 3: Login returns JWT iff credentials are valid** — for registered vs unregistered creds, `200 + token` vs `401`
    - Tag comments: `// Feature: url-shortener, Property 2` and `// Feature: url-shortener, Property 3`
    - Minimum 100 iterations each
    - **Validates: REQ-AUTH-1, REQ-AUTH-2**

  - [ ]* 4.5 Write property tests for protected routes (Property 4)
    - **Property 4: Protected endpoints reject requests without valid token** — for every protected route and any request with absent/expired/malformed JWT, response is `401`
    - Tag comment: `// Feature: url-shortener, Property 4`
    - Minimum 100 iterations
    - **Validates: REQ-AUTH-3**

  - [ ] 4.6 Register auth routes
    - Create `backend/src/modules/auth/authRoutes.js` with `POST /api/auth/register` and `POST /api/auth/login`
    - Mount routes in `app.js`
    - _Requirements: REQ-AUTH-1, REQ-AUTH-2_

- [ ] 5. URL management module
  - [ ] 5.1 Implement URL creation endpoint
    - Create `backend/src/modules/urls/urlController.js` with `createUrl` handler (protected by `authMiddleware`)
    - Validate `longUrl` with `isValidUrl`; return `400 INVALID_URL` on failure
    - If `customAlias` provided: check against reserved keywords list, check uniqueness in DB; return `400 RESERVED_KEYWORD` or `409 ALIAS_ALREADY_EXISTS` as appropriate
    - If no alias: call `generateShortCode()`, check DB uniqueness, retry up to 5 times; return `500 CODE_GENERATION_FAILED` on exhaustion
    - Determine `shard_key` via `getShard(shortCode)`
    - Insert into `urls`; return `201` with `{ id, shortCode, shortUrl, longUrl, createdAt }`
    - _Requirements: REQ-URL-1, REQ-URL-2, REQ-URL-3_

  - [ ]* 5.2 Write property tests for URL creation (Property 8 & 9)
    - **Property 8: Custom alias uniqueness enforcement** — for any alias already in the system, a second creation attempt with the same alias is rejected
    - **Property 9: Reserved keywords are rejected as custom aliases** — for any string in the reserved list, submission as a custom alias always returns an error
    - Tag comments: `// Feature: url-shortener, Property 8` and `// Feature: url-shortener, Property 9`
    - Minimum 100 iterations each
    - **Validates: REQ-URL-3**

  - [ ] 5.3 Implement URL listing, retrieval, update, and delete endpoints
    - Add `listUrls`, `getUrl`, `updateUrl`, `deleteUrl` handlers (all protected)
    - `updateUrl`: validate new `longUrl`, update DB, call `redis.del(`url:${shortCode}`)` for cache invalidation
    - `deleteUrl`: delete from DB, call `redis.del(`url:${shortCode}`)` for cache invalidation
    - Return `404 NOT_FOUND` when URL does not belong to the authenticated user
    - _Requirements: REQ-URL-4, REQ-URL-5, REQ-URL-6, REQ-CACHE-2_

  - [ ]* 5.4 Write property tests for cache invalidation (Property 13)
    - **Property 13: Cache invalidation on URL modification** — for any URL whose short code is cached in Redis, after an update or delete the key `url:{shortCode}` must be absent in Redis
    - Tag comment: `// Feature: url-shortener, Property 13`
    - Minimum 100 iterations
    - **Validates: REQ-CACHE-2**

  - [ ] 5.5 Register URL management routes
    - Create `backend/src/modules/urls/urlRoutes.js` with all five CRUD endpoints
    - Apply `authMiddleware` to all routes; mount under `/api/urls` in `app.js`
    - _Requirements: REQ-URL-4, REQ-URL-5, REQ-URL-6_

- [ ] 6. Checkpoint — Auth and URL management
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Redirection module
  - [ ] 7.1 Implement cache-aside redirect handler
    - Create `backend/src/modules/redirect/redirectController.js` with `resolveShortCode` handler
    - Check Redis key `url:{shortCode}`; on hit return immediately
    - On miss: query PostgreSQL with shard-aware lookup via `getShard`, store result `SET url:{shortCode} <longUrl> EX 86400`
    - Enqueue BullMQ analytics job (fire-and-forget) with `{ urlId, shortCode, ip, userAgent, referrer, timestamp }`
    - Respond with `HTTP 302` redirect to `longUrl`; return `404 SHORT_CODE_NOT_FOUND` if not found
    - _Requirements: REQ-REDIRECT-1, REQ-REDIRECT-2, REQ-CACHE-1, REQ-ANALYTICS-3_

  - [ ]* 7.2 Write property tests for redirect edge cases (Property 10)
    - **Property 10: Non-existent short codes return 404** — for any short code string not registered in the system, `GET /:shortCode` returns `404` and does not perform a redirect
    - Tag comment: `// Feature: url-shortener, Property 10`
    - Minimum 100 iterations
    - **Validates: REQ-REDIRECT-2**

  - [ ] 7.3 Register redirect route
    - Create `backend/src/modules/redirect/redirectRoutes.js` with `GET /:shortCode`
    - Mount at root level in `app.js` (after `/api` routes to avoid conflicts)
    - _Requirements: REQ-REDIRECT-1_

- [ ] 8. Analytics module
  - [ ] 8.1 Implement BullMQ analytics worker
    - Create `backend/src/workers/analyticsWorker.js` consuming from the `analytics` queue
    - For each job: parse User-Agent with `ua-parser-js` → extract `browser`, `device`, `os`; optionally resolve IP to country with `geoip-lite`
    - `INSERT INTO analytics (url_id, timestamp, ip_address, browser, device, os, referrer, country)`
    - `UPDATE urls SET click_count = click_count + 1 WHERE id = ?`
    - Configure 3 retries with exponential backoff; log failed jobs
    - _Requirements: REQ-ANALYTICS-1, REQ-ANALYTICS-3_

  - [ ]* 8.2 Write property tests for analytics event completeness (Property 11)
    - **Property 11: Analytics events capture all required fields** — for any redirect event (varied IP, User-Agent, referrer), the stored analytics record has non-null `url_id`, `timestamp`, `ip_address`, `browser`, `device`, `referrer`
    - Tag comment: `// Feature: url-shortener, Property 11`
    - Minimum 100 iterations
    - **Validates: REQ-ANALYTICS-1**

  - [ ] 8.3 Implement analytics aggregation endpoint
    - Create `backend/src/modules/analytics/analyticsController.js` with `getAnalytics` handler (protected)
    - Query `analytics` for `url_id` owned by `req.user.userId`; compute `totalClicks`, `uniqueVisitors` (DISTINCT ip_address), `dailyTrends` (GROUP BY DATE), `topReferrers` (GROUP BY referrer LIMIT 5), `deviceBreakdown` (GROUP BY device)
    - Return structured JSON per the design API shape
    - _Requirements: REQ-ANALYTICS-2_

  - [ ]* 8.4 Write property tests for analytics aggregation (Property 12)
    - **Property 12: Analytics aggregation correctness** — for any known set of analytics records, `totalClicks` equals record count, `uniqueVisitors` equals distinct IP count, `deviceBreakdown` values sum to `totalClicks`, `dailyTrends` entries collectively sum to `totalClicks`
    - Tag comment: `// Feature: url-shortener, Property 12`
    - Minimum 100 iterations
    - **Validates: REQ-ANALYTICS-2**

  - [ ] 8.5 Register analytics route
    - Create `backend/src/modules/analytics/analyticsRoutes.js` with `GET /api/analytics/:id`
    - Apply `authMiddleware`; mount in `app.js`
    - _Requirements: REQ-ANALYTICS-2_

- [ ] 9. Rate limiting middleware
  - [ ] 9.1 Implement Redis-backed rate limiter
    - Install `express-rate-limit` and `rate-limit-redis`; create `backend/src/middleware/rateLimiter.js`
    - Configure: window 60s, max 100 requests, key = `userId` (authenticated) or IP (unauthenticated), store = Redis
    - Return `429 RATE_LIMIT_EXCEEDED` with `Retry-After` header on limit breach
    - Apply globally in `app.js` before all route handlers
    - _Requirements: REQ-RATE-1_

  - [ ]* 9.2 Write property tests for rate limiter (Property 15)
    - **Property 15: Rate limiter blocks at threshold** — for any user/IP identity, the first 100 requests within a 60s window succeed; the 101st request receives `429`
    - Tag comment: `// Feature: url-shortener, Property 15`
    - Minimum 100 iterations
    - **Validates: REQ-RATE-1**

- [ ] 10. Checkpoint — Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. React frontend — Setup and shared infrastructure
  - [ ] 11.1 Initialize React + Vite project with Tailwind CSS and React Router v6
    - Scaffold `frontend/` with Vite React template
    - Install and configure Tailwind CSS
    - Set up React Router v6 with route definitions for all seven pages (`/`, `/login`, `/register`, `/dashboard`, `/create`, `/analytics/:id`, `/profile`)
    - _Requirements: REQ-NFT-5_

  - [ ] 11.2 Configure Axios instance with JWT interceptor
    - Create `frontend/src/lib/api.js` with a configured Axios instance
    - Add request interceptor that attaches `Authorization: Bearer <token>` from `localStorage`
    - Add response interceptor that redirects to `/login` on `401`
    - _Requirements: REQ-AUTH-3_

  - [ ] 11.3 Implement authentication context and protected route wrapper
    - Create `frontend/src/context/AuthContext.jsx` storing `token` and decoded user from `localStorage`
    - Create `ProtectedRoute` component that redirects unauthenticated users to `/login`
    - Apply `ProtectedRoute` to Dashboard, Create, Analytics, and Profile routes
    - _Requirements: REQ-AUTH-3_

- [ ] 12. React frontend — Pages
  - [ ] 12.1 Build Landing Page
    - Implement `frontend/src/pages/LandingPage.jsx` with hero section, feature highlights, and links to login/register
    - _Requirements: (frontend)_

  - [ ] 12.2 Build Login and Register pages
    - Implement `LoginPage.jsx`: form with email + password, calls `POST /api/auth/login`, stores token, redirects to Dashboard
    - Implement `RegisterPage.jsx`: form with name + email + password, calls `POST /api/auth/register`, redirects to Login
    - Display inline validation errors and API error messages
    - _Requirements: REQ-AUTH-1, REQ-AUTH-2_

  - [ ] 12.3 Build Dashboard page
    - Implement `DashboardPage.jsx`: fetch and display all user URLs from `GET /api/urls`
    - Each URL row shows `shortUrl`, `longUrl`, `clickCount`, and action buttons (copy, edit, delete, view analytics)
    - Wire delete button to `DELETE /api/urls/:id` and refresh list
    - _Requirements: REQ-URL-4, REQ-URL-6_

  - [ ] 12.4 Build URL Creation page
    - Implement `CreateUrlPage.jsx`: form with `longUrl` and optional `customAlias` fields
    - Call `POST /api/urls`; display resulting `shortUrl` with a copy-to-clipboard button
    - Show server-side validation errors inline
    - _Requirements: REQ-URL-1, REQ-URL-2, REQ-URL-3_

  - [ ] 12.5 Build Analytics page
    - Implement `AnalyticsPage.jsx`: fetch `GET /api/analytics/:id` and render:
      - Total clicks and unique visitors counters
      - Daily clicks line chart (use `recharts` or `chart.js`)
      - Device breakdown pie/doughnut chart
      - Top referrers table
    - _Requirements: REQ-ANALYTICS-2_

  - [ ] 12.6 Build Profile page
    - Implement `ProfilePage.jsx`: decode JWT from `localStorage` and display `name` and `email`
    - Add logout button that clears `localStorage` and redirects to `/`
    - _Requirements: REQ-AUTH-2_

- [ ] 13. Integration wiring and Docker Compose test environment
  - [ ] 13.1 Write Docker Compose test configuration
    - Create `docker-compose.test.yml` with isolated `postgres-test` and `redis-test` services
    - Add a `test` service that runs the Jest/Vitest suite against the test containers
    - _Requirements: REQ-NFT-4_

  - [ ] 13.2 Write integration tests for cache-aside and BullMQ flows
    - Test cache hit/miss flow: prime Redis, assert hit; flush Redis, assert miss then repopulation
    - Test BullMQ job enqueue and consumption: create URL, trigger redirect, assert analytics row inserted and `click_count` incremented
    - _Requirements: REQ-REDIRECT-1, REQ-CACHE-1, REQ-ANALYTICS-3_

  - [ ] 13.3 Write integration tests for end-to-end redirect and rate limiting
    - End-to-end: register user → create URL → GET short code → assert 302 redirect
    - Rate limit: fire 101 requests from same IP → assert first 100 succeed, 101st returns 429
    - _Requirements: REQ-REDIRECT-1, REQ-RATE-1_

  - [ ] 13.4 Verify Docker Compose full-stack startup
    - Confirm `docker compose up` brings up all services healthy (api, worker, postgres, redis)
    - Confirm migration script runs on api startup and all tables are created
    - _Requirements: REQ-NFT-4_

- [ ] 14. Final checkpoint — Full stack
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use `fast-check` with minimum 100 iterations per property (`fc.assert(..., { numRuns: 100 })`)
- Each property task references its design document property number and the requirement it validates
- Unit tests and property tests are complementary — both should pass
- Checkpoints ensure incremental validation before advancing to the next phase
- The BullMQ worker (`analyticsWorker.js`) should be started as a separate process in Docker Compose

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["1.4", "1.5", "1.6"] },
    { "id": 2, "tasks": ["2.1", "2.3", "2.5"] },
    { "id": 3, "tasks": ["2.2", "2.4", "2.6"] },
    { "id": 4, "tasks": ["4.1", "4.2", "4.3"] },
    { "id": 5, "tasks": ["4.4", "4.5", "4.6"] },
    { "id": 6, "tasks": ["5.1"] },
    { "id": 7, "tasks": ["5.2", "5.3"] },
    { "id": 8, "tasks": ["5.4", "5.5", "7.1"] },
    { "id": 9, "tasks": ["7.2", "7.3", "8.1", "8.3"] },
    { "id": 10, "tasks": ["8.2", "8.4", "8.5", "9.1"] },
    { "id": 11, "tasks": ["9.2", "11.1"] },
    { "id": 12, "tasks": ["11.2", "11.3"] },
    { "id": 13, "tasks": ["12.1", "12.2", "12.3", "12.4", "12.5", "12.6"] },
    { "id": 14, "tasks": ["13.1"] },
    { "id": 15, "tasks": ["13.2", "13.3", "13.4"] }
  ]
}
```
