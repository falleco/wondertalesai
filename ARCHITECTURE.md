# Architecture

Dream Tales AI is a monorepo with a Next.js frontend and a NestJS backend. The system uses tRPC for type-safe API calls and Redis-backed session storage.

## High-Level Diagram

```
┌───────────────────┐        HTTP + Cookies        ┌───────────────────┐
│  Next.js Web App  │  ─────────────────────────▶  │  NestJS Backend   │
│  apps/web         │                              │  apps/backend     │
└─────────┬─────────┘                              └─────────┬─────────┘
          │                                                │
          │ tRPC (React Query)                             │
          │                                                ├── PostgreSQL (TypeORM)
          │                                                ├── Redis (sessions/cache)
          │                                                └── BullMQ (jobs)
          │
          ▼
    better-auth
```

## Core Components

- **Frontend**: Next.js 16, App Router, React 19, Tailwind CSS v4.
- **Backend**: NestJS with Express adapter, TypeORM for Postgres, BullMQ for async jobs.
- **API**: tRPC v11 routers in NestJS, consumed by React Query on the frontend.
- **Auth**: better-auth in Next.js API routes and NestJS integration.
- **Observability**: Sentry captures backend errors via tRPC error formatter.

## Data Flow

1. React components call `trpc.*` hooks from `apps/web/src/trpc`.
2. Requests are proxied through the Next.js `/trpc` endpoint to the backend.
3. NestJS builds the tRPC context and injects the user from cookies.
4. Services execute business logic and return data with inferred types.

## Authentication Flow

1. Client uses `@web/auth/client` for sign-in/sign-up.
2. better-auth creates a session and stores it in Redis.
3. Cookies carry the session for subsequent requests.
4. `PrincipalService` reads cookies and attaches `ctx.user`.

## Backend Module Pattern

Each feature module follows:

```
src/{feature}/
  {feature}.module.ts
  {feature}.entity.ts
  {feature}.service.ts
  {feature}.router.ts
```

Routers implement `RouterBuilder` and delegate to services.
