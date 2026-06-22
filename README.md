# Shortly — Scalable Distributed URL Shortener

A production-grade URL shortening platform with analytics, Redis caching, JWT auth, background job processing, and database sharding simulation.

## Tech Stack

| Layer    | Technology                              |
|----------|-----------------------------------------|
| Frontend | React 18, Tailwind CSS, Vite, Recharts  |
| Backend  | Node.js, Express.js                     |
| Database | PostgreSQL 16                           |
| Cache    | Redis 7                                 |
| Queue    | BullMQ                                  |
| Auth     | JWT + bcrypt                            |
| DevOps   | Docker, Docker Compose                  |

## Quick Start (Docker)

```bash
# Clone and start everything
git clone <repo>
cd url-shortener
cp .env.example .env

docker compose up --build
```

- API: http://localhost:5000
- Frontend (dev): http://localhost:3000

## Local Development

### Backend
```bash
cd backend
npm install
cp ../.env.example .env   # fill in values
npm run migrate           # run DB migrations
npm run dev               # start API server
npm run worker            # start analytics worker (separate terminal)
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Run Tests
```bash
cd backend
npm test
```

## API Endpoints

| Method | Endpoint              | Auth | Description           |
|--------|-----------------------|------|-----------------------|
| POST   | /api/auth/register    | No   | Register user         |
| POST   | /api/auth/login       | No   | Login, get JWT        |
| POST   | /api/urls             | Yes  | Create short URL      |
| GET    | /api/urls             | Yes  | List user's URLs      |
| GET    | /api/urls/:id         | Yes  | Get URL details       |
| PUT    | /api/urls/:id         | Yes  | Update URL            |
| DELETE | /api/urls/:id         | Yes  | Delete URL            |
| GET    | /api/analytics/:id    | Yes  | Get URL analytics     |
| GET    | /:shortCode           | No   | Redirect to long URL  |

## Architecture Highlights

- **Redis cache-aside**: Short codes cached for 24h, invalidated on update/delete
- **BullMQ worker**: Analytics events processed asynchronously (3 retries + exponential backoff)
- **Shard routing**: Short codes logically partitioned A–F/G–M/N–S/T–Z
- **Rate limiting**: 100 req/min per user/IP via Redis
- **Property-based tests**: 15 correctness properties verified with fast-check
