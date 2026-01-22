# Dream Tales AI

Dream Tales AI is a monorepo for an interactive storybook experience for kids. It combines a Next.js frontend with a NestJS backend, connected through tRPC for end-to-end type safety.

## Quick Start

```bash
yarn install
yarn dev
```

Open `http://localhost:3000` for the web app and `http://localhost:4001` for the backend.

## Repository Layout

- `apps/web` - Next.js 16 app (App Router, Tailwind v4)
- `apps/backend` - NestJS API (tRPC v11, TypeORM, Redis, BullMQ)
- `packages/auth` - Shared auth package

## Common Commands

```bash
yarn dev
yarn check:fix
yarn run typecheck
yarn run test
yarn run build
```

## Environment Variables

Backend (`apps/backend`):

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string (sessions + BullMQ)
- `BETTER_AUTH_SECRET` - better-auth secret
- `CORS_URL` - allowed origins
- `PORT` - backend port (default: 4001)

Frontend (`apps/web`):

- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` - optional OAuth

## Documentation

- `ARCHITECTURE.md`
- `DEVELOPER_GUIDE.md`
- `USER_GUIDE.md`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `CHANGELOG.md`
- `CODE_OF_CONDUCT.md`

## Notes

- tRPC routers should stay thin; move business logic into services.
- File names should be kebab-case.
- Run `yarn check:fix` and `yarn run typecheck` after edits.
