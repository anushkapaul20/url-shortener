# Requirements Document

## Introduction

This document defines the requirements for a production-grade URL shortening platform (Shortly) inspired by Bitly and TinyURL. The platform enables users to create short URLs, manage links, track click analytics, and redirect visitors efficiently. It is designed using modern software engineering principles with a strong focus on scalability, caching, performance optimization, distributed systems concepts, and clean architecture.

The platform supports two user roles: Guests (redirect access only) and Registered Users (full link management and analytics). The system is built on a Node.js/Express backend with PostgreSQL for persistence, Redis for caching and job queues, and a React.js frontend.

---

## Glossary

- **Shortly**: The name of the URL shortening platform described in this document.
- **Short_Code**: A unique alphanumeric identifier (Base62, 6–10 characters) appended to the platform base URL to form a short URL (e.g., `aB29Kd`).
- **Short_URL**: The full shortened URL composed of the platform base URL and a Short_Code or Custom_Alias (e.g., `https://shortly.com/aB29Kd`).
- **Long_URL**: The original destination URL that a Short_URL resolves to.
- **Custom_Alias**: A user-defined slug chosen instead of a system-generated Short_Code (e.g., `anushka`).
- **Guest**: An unauthenticated visitor who can only follow Short_URLs to be redirected.
- **Registered_User**: An authenticated user who can create, manage, and view analytics for Short_URLs.
- **Auth_Service**: The backend component responsible for user registration, login, and JWT issuance.
- **URL_Engine**: The backend component responsible for Short_Code generation, collision prevention, and URL validation.
- **Redirect_Service**: The backend component responsible for resolving Short_Codes and issuing HTTP redirects.
- **Analytics_Service**: The backend component responsible for recording and aggregating click-level analytics data.
- **Cache**: The Redis instance used for caching Short_Code-to-Long_URL mappings.
- **Database**: The PostgreSQL instance used for persistent storage of users, URLs, and analytics.
- **Shard_Router**: The backend component that determines the logical database shard for a given Short_Code.
- **Job_Queue**: The BullMQ/Redis-backed queue used for asynchronous analytics processing.
- **Rate_Limiter**: The Redis-backed middleware that enforces request rate limits per user or IP address.
- **JWT**: JSON Web Token used as the access token for authenticated API requests.
- **BCrypt**: The password hashing algorithm used to store user credentials securely.
- **TTL**: Time-To-Live; the duration a cached entry remains valid before expiry (default 24 hours for URL mappings).
- **Base62**: The encoding scheme using characters `[A-Za-z0-9]` used to generate Short_Codes.
- **Reserved_Keyword**: A slug that is reserved by the system and cannot be used as a Custom_Alias (e.g., `api`, `admin`, `login`, `register`, `dashboard`).

---

## Requirements

### Requirement 1: User Registration

**User Story:** As a visitor, I want to register an account with my name, email, and password, so that I can create and manage short URLs.

#### Acceptance Criteria

1. WHEN a registration request is received with a valid name, email, and password, THE Auth_Service SHALL create a new user record with the password stored as a BCrypt hash and return an HTTP 201 response.
2. WHEN a registration request is received with an email that already exists in the Database, THE Auth_Service SHALL return an HTTP 409 response with a descriptive error message.
3. WHEN a registration request is received with a malformed email address, THE Auth_Service SHALL return an HTTP 400 response with a descriptive validation error.
4. WHEN a registration request is received with a password shorter than 8 characters, THE Auth_Service SHALL return an HTTP 400 response with a descriptive validation error.
5. THE Auth_Service SHALL store passwords exclusively as BCrypt hashes and SHALL NOT store plaintext passwords in the Database.

---

### Requirement 2: User Login

**User Story:** As a Registered_User, I want to log in with my email and password, so that I can access protected features of the platform.

#### Acceptance Criteria

1. WHEN a login request is received with a valid email and correct password, THE Auth_Service SHALL return an HTTP 200 response containing a signed JWT access token.
2. WHEN a login request is received with a valid email and an incorrect password, THE Auth_Service SHALL return an HTTP 401 response with a descriptive error message.
3. WHEN a login request is received with an email that does not exist in the Database, THE Auth_Service SHALL return an HTTP 401 response with a descriptive error message.
4. THE Auth_Service SHALL sign JWT tokens with an expiry of no longer than 24 hours.
5. WHEN a request is made to a protected API route without a valid JWT, THE Auth_Service SHALL return an HTTP 401 response.

---

### Requirement 3: URL Shortening

**User Story:** As a Registered_User, I want to submit a long URL and receive a short URL, so that I can share compact links easily.

#### Acceptance Criteria

1. WHEN a URL creation request is received with a valid Long_URL and an authenticated JWT, THE URL_Engine SHALL generate a unique Short_Code using Base62 encoding and return an HTTP 201 response containing the resulting Short_URL.
2. WHEN a URL creation request is received and the generated Short_Code collides with an existing Short_Code in the Database, THE URL_Engine SHALL regenerate a new Short_Code until a unique one is found before persisting the record.
3. WHEN a URL creation request is received with a malformed or non-HTTP/HTTPS Long_URL, THE URL_Engine SHALL return an HTTP 400 response with a descriptive validation error.
4. WHEN a URL creation request is received without a valid JWT, THE URL_Engine SHALL return an HTTP 401 response.
5. THE URL_Engine SHALL generate Short_Codes of 6 to 10 characters using the Base62 character set `[A-Za-z0-9]`.

---

### Requirement 4: Custom Alias Support

**User Story:** As a Registered_User, I want to choose a custom alias for my short URL, so that I can create memorable and branded links.

#### Acceptance Criteria

1. WHEN a URL creation request is received with a non-empty Custom_Alias and an authenticated JWT, THE URL_Engine SHALL use the Custom_Alias as the Short_Code if it is available and not a Reserved_Keyword, and return an HTTP 201 response.
2. WHEN a URL creation request is received with a Custom_Alias that already exists in the Database, THE URL_Engine SHALL return an HTTP 409 response with a descriptive error message.
3. WHEN a URL creation request is received with a Custom_Alias that matches a Reserved_Keyword, THE URL_Engine SHALL return an HTTP 400 response with a descriptive error message identifying the alias as reserved.
4. WHEN a URL creation request is received with a Custom_Alias containing characters outside the set `[A-Za-z0-9_-]`, THE URL_Engine SHALL return an HTTP 400 response with a descriptive validation error.
5. THE URL_Engine SHALL treat Custom_Aliases as case-sensitive for uniqueness checks.

---

### Requirement 5: URL Redirection

**User Story:** As a Guest or Registered_User, I want to be redirected to the original URL when I visit a short URL, so that I can reach the destination efficiently.

#### Acceptance Criteria

1. WHEN a redirect request is received for a Short_Code that exists in the Cache, THE Redirect_Service SHALL retrieve the Long_URL from the Cache and return an HTTP 302 redirect to the Long_URL without querying the Database.
2. WHEN a redirect request is received for a Short_Code that does not exist in the Cache but exists in the Database, THE Redirect_Service SHALL retrieve the Long_URL from the Database, store the Short_Code-to-Long_URL mapping in the Cache with a TTL of 24 hours, and return an HTTP 302 redirect to the Long_URL.
3. WHEN a redirect request is received for a Short_Code that does not exist in either the Cache or the Database, THE Redirect_Service SHALL return an HTTP 404 response.
4. WHEN a redirect request is received for a Short_Code whose associated URL record has an expired `expires_at` timestamp, THE Redirect_Service SHALL return an HTTP 410 response.
5. WHEN a redirect request is successfully processed, THE Redirect_Service SHALL enqueue a click analytics event to the Job_Queue for asynchronous processing.

---

### Requirement 6: Analytics Tracking

**User Story:** As a Registered_User, I want each visit to my short URL to be recorded with contextual data, so that I can understand how my links are being used.

#### Acceptance Criteria

1. WHEN a click analytics event is dequeued from the Job_Queue, THE Analytics_Service SHALL persist a record in the Analytics table containing the url_id, timestamp, IP address, browser, device type, OS, and referrer.
2. WHEN a click analytics event is dequeued and country data is available from the request metadata, THE Analytics_Service SHALL include the country field in the persisted Analytics record.
3. THE Analytics_Service SHALL process click analytics events asynchronously via the Job_Queue and SHALL NOT block the HTTP redirect response.
4. WHEN an analytics event fails to persist after 3 retry attempts, THE Analytics_Service SHALL log the failure with sufficient detail for manual investigation and discard the event.

---

### Requirement 7: Analytics Dashboard

**User Story:** As a Registered_User, I want to view a dashboard with analytics for my short URLs, so that I can measure link performance.

#### Acceptance Criteria

1. WHEN an authenticated request is received for analytics data for a URL owned by the requesting Registered_User, THE Analytics_Service SHALL return the total click count, unique visitor count, daily click trend data for the last 30 days, top referrers (up to 10), and device type breakdown.
2. WHEN an authenticated request is received for analytics data for a URL not owned by the requesting Registered_User, THE Analytics_Service SHALL return an HTTP 403 response.
3. WHEN an authenticated request is received for analytics data for a URL that does not exist, THE Analytics_Service SHALL return an HTTP 404 response.
4. THE Analytics_Service SHALL derive unique visitor counts by counting distinct IP addresses per url_id in the Analytics table.

---

### Requirement 8: URL Management

**User Story:** As a Registered_User, I want to list, update, and delete my short URLs, so that I can maintain and control my link portfolio.

#### Acceptance Criteria

1. WHEN an authenticated request is received to list URLs, THE URL_Engine SHALL return all URL records owned by the requesting Registered_User with pagination support (page and limit query parameters).
2. WHEN an authenticated request is received to update a URL owned by the requesting Registered_User, THE URL_Engine SHALL update the provided fields (Long_URL, Custom_Alias, or expires_at) and return the updated record.
3. WHEN an authenticated request is received to update a URL not owned by the requesting Registered_User, THE URL_Engine SHALL return an HTTP 403 response.
4. WHEN an authenticated request is received to delete a URL owned by the requesting Registered_User, THE URL_Engine SHALL delete the URL record, remove the corresponding Cache entry, and return an HTTP 204 response.
5. WHEN an authenticated request is received to delete a URL not owned by the requesting Registered_User, THE URL_Engine SHALL return an HTTP 403 response.
6. WHEN a URL record is updated with a new Long_URL or Custom_Alias, THE URL_Engine SHALL invalidate the corresponding Cache entry to prevent stale redirects.

---

### Requirement 9: Redis Caching (Cache-Aside Pattern)

**User Story:** As a platform operator, I want Short_Code lookups to be served from cache when possible, so that redirect latency is minimized and Database load is reduced.

#### Acceptance Criteria

1. WHEN a Short_Code lookup is performed and the Short_Code exists in the Cache, THE Redirect_Service SHALL return the cached Long_URL without issuing a Database query.
2. WHEN a Short_Code lookup is performed and the Short_Code does not exist in the Cache, THE Redirect_Service SHALL query the Database, write the result to the Cache with a TTL of 24 hours, and then return the Long_URL.
3. WHEN a URL record is deleted or updated, THE URL_Engine SHALL remove the corresponding Cache entry within the same request lifecycle.
4. THE Cache SHALL store Short_Code-to-Long_URL mappings as key-value pairs where the key is the Short_Code and the value is the Long_URL string.
5. IF the Cache is unavailable, THEN THE Redirect_Service SHALL fall back to querying the Database directly and SHALL NOT return an error to the user due to Cache unavailability alone.

---

### Requirement 10: Rate Limiting

**User Story:** As a platform operator, I want to enforce request rate limits, so that the platform is protected from spam, abuse, and traffic floods.

#### Acceptance Criteria

1. WHEN a request is received from a Registered_User that exceeds 100 requests within a 60-second sliding window, THE Rate_Limiter SHALL return an HTTP 429 response with a `Retry-After` header indicating when the limit resets.
2. WHEN a request is received from an unauthenticated IP address that exceeds 100 requests within a 60-second sliding window, THE Rate_Limiter SHALL return an HTTP 429 response with a `Retry-After` header.
3. THE Rate_Limiter SHALL track request counts using the Redis instance with a key derived from the authenticated user's ID or the client IP address.
4. WHEN a rate-limited request is rejected, THE Rate_Limiter SHALL include a `X-RateLimit-Limit` and `X-RateLimit-Remaining` header in the response.

---

### Requirement 11: Database Sharding Simulation

**User Story:** As a platform architect, I want Short_Code lookups to be routed to a logical shard based on the Short_Code prefix, so that the system demonstrates horizontal partitioning behavior.

#### Acceptance Criteria

1. WHEN a Database query is issued for a Short_Code beginning with a character in the range `[A-Fa-f]`, THE Shard_Router SHALL route the query to Shard 1.
2. WHEN a Database query is issued for a Short_Code beginning with a character in the range `[G-Mg-m]`, THE Shard_Router SHALL route the query to Shard 2.
3. WHEN a Database query is issued for a Short_Code beginning with a character in the range `[N-Sn-s]`, THE Shard_Router SHALL route the query to Shard 3.
4. WHEN a Database query is issued for a Short_Code beginning with a character in the range `[T-Zt-z0-9]`, THE Shard_Router SHALL route the query to Shard 4.
5. THE Shard_Router SHALL determine the target shard solely from the first character of the Short_Code before issuing any Database query.

---

### Requirement 12: Background Job Processing

**User Story:** As a platform operator, I want analytics events to be processed asynchronously via a job queue, so that redirect response times are not impacted by analytics writes.

#### Acceptance Criteria

1. WHEN a redirect is successfully completed, THE Redirect_Service SHALL enqueue a click event payload (containing url_id, timestamp, IP address, user-agent, and referrer) to the Job_Queue without awaiting the result.
2. THE Job_Queue SHALL use BullMQ backed by the Redis instance to manage job scheduling and processing.
3. WHEN the Analytics_Service dequeues a click event job, THE Analytics_Service SHALL parse the user-agent string to extract browser, device type, and OS fields before persisting the Analytics record.
4. WHEN a job fails, THE Job_Queue SHALL retry the job up to 3 times with exponential backoff before marking it as failed.
5. WHILE the Job_Queue worker is running, THE Analytics_Service SHALL process jobs concurrently with a maximum concurrency of 5 workers.

---

### Requirement 13: Security Controls

**User Story:** As a platform operator, I want the application to enforce security best practices, so that users and data are protected from common web threats.

#### Acceptance Criteria

1. THE Auth_Service SHALL protect all non-public API routes by requiring a valid JWT in the `Authorization: Bearer <token>` header.
2. THE URL_Engine SHALL validate all Long_URL inputs against an allowlist of permitted protocols (`http`, `https`) and reject inputs that fail URL structure validation.
3. THE Database SHALL use parameterized queries or an ORM with parameterized bindings for all user-supplied input to prevent SQL injection.
4. THE Auth_Service SHALL apply the Helmet.js middleware to all HTTP responses to set secure HTTP headers (including `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, and `Strict-Transport-Security`).
5. WHEN a JWT is expired or tampered with, THE Auth_Service SHALL return an HTTP 401 response and SHALL NOT grant access to protected resources.

---

### Requirement 14: Containerization

**User Story:** As a developer, I want the entire application stack to be launchable with a single command, so that local development and deployment are straightforward.

#### Acceptance Criteria

1. THE platform SHALL include a `Dockerfile` for the backend service that produces a runnable Node.js container image.
2. THE platform SHALL include a `docker-compose.yml` file that defines and orchestrates the backend service, the PostgreSQL Database service, and the Redis Cache service.
3. WHEN `docker compose up` is executed from the project root, THE platform SHALL start all three services (backend, Database, Redis) with the correct environment variables, port mappings, and inter-service networking.
4. THE `docker-compose.yml` SHALL define a named volume for PostgreSQL data persistence so that data is not lost when the Database container is restarted.
5. WHEN the backend container starts, THE platform SHALL run database migration scripts automatically before accepting incoming HTTP requests.

---

### Requirement 15: Frontend Application

**User Story:** As a Registered_User, I want a web interface to interact with all platform features, so that I can manage links and view analytics without using the API directly.

#### Acceptance Criteria

1. THE Frontend SHALL provide a Landing Page that allows a Guest to enter a Long_URL and create a Short_URL without authentication, displaying the resulting Short_URL.
2. THE Frontend SHALL provide Login and Register pages that submit credentials to the Auth_Service API and store the returned JWT in the browser for subsequent authenticated requests.
3. THE Frontend SHALL provide a Dashboard page that displays all Short_URLs owned by the authenticated Registered_User with their click counts and creation dates.
4. THE Frontend SHALL provide a URL Creation page that allows a Registered_User to submit a Long_URL and an optional Custom_Alias, and displays the resulting Short_URL upon success.
5. THE Frontend SHALL provide an Analytics page per URL that displays total clicks, unique visitors, a daily click trend chart for the last 30 days, top referrers, and device breakdown.
6. THE Frontend SHALL provide a Profile page displaying the authenticated Registered_User's name and email.
7. WHEN an authenticated request returns an HTTP 401 response, THE Frontend SHALL clear the stored JWT and redirect the Registered_User to the Login page.
