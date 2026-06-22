# Requirements: Scalable Distributed URL Shortener Platform

## Overview
A production-grade URL shortening platform inspired by Bitly and TinyURL. Supports short link creation, custom aliases, analytics tracking, JWT authentication, Redis caching, background job processing, and database sharding simulation — all containerized with Docker.

---

## Functional Requirements

### 1. User Authentication

**REQ-AUTH-1**: Users can register with name, email, and password.
- Email must be validated for correct format.
- Passwords must be hashed using bcrypt before storage.
- Duplicate email registration must be rejected with a clear error.

**REQ-AUTH-2**: Registered users can log in with email and password.
- On success, the system returns a JWT access token.
- Invalid credentials return an appropriate error.

**REQ-AUTH-3**: Protected routes must require a valid JWT token.
- Requests without a valid token are rejected with 401 Unauthorized.

---

### 2. URL Shortening Engine

**REQ-URL-1**: Authenticated users can submit a long URL and receive a shortened URL.
- Short codes are generated using Base62 encoding.
- Short codes must be unique; collision prevention is required.
- Input URLs must be validated for correct format.

**REQ-URL-2**: The system generates short URLs in the format:
```
https://shortly.com/<shortCode>
```

**REQ-URL-3**: Authenticated users can provide a custom alias instead of an auto-generated code.
- Custom aliases must be unique across the system.
- Reserved keywords (e.g., `api`, `login`, `register`, `dashboard`) must be protected and rejected.

**REQ-URL-4**: Authenticated users can view all their shortened URLs.

**REQ-URL-5**: Authenticated users can edit (update the destination) of their URLs.

**REQ-URL-6**: Authenticated users can delete their shortened URLs.

---

### 3. URL Redirection

**REQ-REDIRECT-1**: Any user (guest or registered) can access a short URL and be redirected to the original URL.
- The system first checks Redis cache for the short code.
- On cache miss, the system queries PostgreSQL, then stores the result in Redis with a 24-hour TTL.
- Redirection must be fast with minimal latency.

**REQ-REDIRECT-2**: If a short code does not exist, the system returns a 404 response.

---

### 4. Analytics

**REQ-ANALYTICS-1**: Every redirect click must generate an analytics event capturing:
- Timestamp
- IP Address
- Browser
- Device Type (Desktop / Mobile / Tablet)
- Operating System
- Referrer
- Country (optional)

**REQ-ANALYTICS-2**: Authenticated users can view analytics for their own URLs, including:
- Total Clicks
- Unique Visitors
- Daily Click Trends (chart data)
- Top Referrers
- Device Breakdown (Desktop / Mobile / Tablet)

**REQ-ANALYTICS-3**: Analytics events must be processed asynchronously via a background job queue (BullMQ + Redis).
- Jobs handle: updating click counts, aggregating analytics, generating reports.

---

### 5. Redis Caching

**REQ-CACHE-1**: Before querying PostgreSQL for a URL lookup, the system checks Redis.
- Cache hit → return URL immediately.
- Cache miss → query PostgreSQL → store result in Redis with TTL of 24 hours → return URL.

**REQ-CACHE-2**: When a URL is deleted or updated, its Redis cache entry must be invalidated.

---

### 6. Rate Limiting

**REQ-RATE-1**: The system enforces Redis-based rate limiting of 100 requests per minute per user/IP.
- Exceeding the limit returns a 429 Too Many Requests response.
- This applies to all API endpoints to prevent spam, abuse, and DDoS simulation.

---

### 7. Database Sharding Simulation

**REQ-SHARD-1**: URLs must be logically partitioned into shards based on the first character of the short code:
- Shard 1: A–F
- Shard 2: G–M
- Shard 3: N–S
- Shard 4: T–Z

**REQ-SHARD-2**: The application automatically determines the correct shard for each read/write operation.

---

## Non-Functional Requirements

**REQ-NFT-1 (Performance)**: URL redirection should be served from Redis cache in under 10ms for cached entries.

**REQ-NFT-2 (Security)**:
- Passwords stored using bcrypt hashing.
- All API endpoints protected with JWT where required.
- Input validated to prevent SQL injection and invalid URL submissions.
- HTTP security headers applied using `helmet`.

**REQ-NFT-3 (Scalability)**: Architecture must demonstrate horizontal scaling concepts via sharding simulation and background job queues.

**REQ-NFT-4 (Containerization)**: The entire backend stack (Node.js, PostgreSQL, Redis) must run via a single `docker compose up` command.

**REQ-NFT-5 (Deployability)**: The system must be deployable with:
- Frontend on Vercel
- Backend on Render/Railway
- PostgreSQL on a cloud provider
- Redis on a cloud provider

---

## User Roles

| Capability               | Guest | Registered User |
|--------------------------|-------|-----------------|
| Access / redirect URLs   | ✅    | ✅              |
| Register / Login         | ✅    | ✅              |
| Create shortened URLs    | ❌    | ✅              |
| Create custom aliases    | ❌    | ✅              |
| View analytics           | ❌    | ✅              |
| Manage (edit/delete) URLs| ❌    | ✅              |

---

## API Endpoints

### Authentication
| Method | Endpoint              | Auth Required | Description        |
|--------|-----------------------|---------------|--------------------|
| POST   | /api/auth/register    | No            | Register new user  |
| POST   | /api/auth/login       | No            | Login, get JWT     |

### URL Management
| Method | Endpoint          | Auth Required | Description              |
|--------|-------------------|---------------|--------------------------|
| POST   | /api/urls         | Yes           | Create shortened URL     |
| GET    | /api/urls         | Yes           | List user's URLs         |
| GET    | /api/urls/:id     | Yes           | Get single URL details   |
| PUT    | /api/urls/:id     | Yes           | Update URL               |
| DELETE | /api/urls/:id     | Yes           | Delete URL               |

### Analytics
| Method | Endpoint              | Auth Required | Description              |
|--------|-----------------------|---------------|--------------------------|
| GET    | /api/analytics/:id    | Yes           | Get analytics for a URL  |

### Redirect
| Method | Endpoint       | Auth Required | Description                     |
|--------|----------------|---------------|---------------------------------|
| GET    | /:shortCode    | No            | Redirect to original URL        |

---

## Database Schema

### users
| Column        | Type      | Notes                  |
|---------------|-----------|------------------------|
| id            | UUID/SERIAL | Primary key          |
| name          | VARCHAR   |                        |
| email         | VARCHAR   | Unique, indexed        |
| password_hash | VARCHAR   | bcrypt hash            |
| created_at    | TIMESTAMP | Default now()          |

### urls
| Column       | Type      | Notes                        |
|--------------|-----------|------------------------------|
| id           | UUID/SERIAL | Primary key                |
| short_code   | VARCHAR   | Unique, indexed              |
| long_url     | TEXT      |                              |
| custom_alias | VARCHAR   | Nullable, unique             |
| user_id      | FK        | References users.id          |
| click_count  | INTEGER   | Default 0                    |
| created_at   | TIMESTAMP | Default now()                |
| expires_at   | TIMESTAMP | Nullable                     |

### analytics
| Column     | Type      | Notes                    |
|------------|-----------|--------------------------|
| id         | UUID/SERIAL | Primary key            |
| url_id     | FK        | References urls.id       |
| timestamp  | TIMESTAMP | Default now()            |
| ip_address | VARCHAR   |                          |
| browser    | VARCHAR   |                          |
| device     | VARCHAR   | Desktop / Mobile / Tablet|
| country    | VARCHAR   | Optional                 |
| referrer   | VARCHAR   |                          |

---

## Frontend Pages

| Page            | Route          | Auth Required |
|-----------------|----------------|---------------|
| Landing Page    | /              | No            |
| Login Page      | /login         | No            |
| Register Page   | /register      | No            |
| Dashboard       | /dashboard     | Yes           |
| URL Creation    | /create        | Yes           |
| Analytics Page  | /analytics/:id | Yes           |
| Profile Page    | /profile       | Yes           |

---

## Tech Stack Summary

| Layer        | Technology                        |
|--------------|-----------------------------------|
| Frontend     | React.js, Tailwind CSS, Axios, React Router |
| Backend      | Node.js, Express.js               |
| Database     | PostgreSQL                        |
| Cache        | Redis                             |
| Auth         | JWT, bcrypt                       |
| Queue        | BullMQ + Redis                    |
| Security     | helmet, input validation, rate limiting |
| DevOps       | Docker, Docker Compose            |
