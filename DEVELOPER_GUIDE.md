# Developer Guide

This guide covers local setup, commands, and engineering conventions.

## Prerequisites

- Node.js (LTS)
- Yarn
- PostgreSQL
- Redis

## Local Setup

```bash
yarn install
yarn dev
```

Web: `http://localhost:3000`
API: `http://localhost:4001`

## Commands

```bash
yarn dev
yarn check:fix
yarn run typecheck
yarn run test
yarn run build
```

## Linting and Type Safety

- Always run `yarn check:fix` after edits.
- Always run `yarn run typecheck` after code changes.

## Migrations (Backend)

```bash
yarn workspace @mailestro/backend migration:create ./src/migrations/<name>
yarn workspace @mailestro/backend migration:run
yarn workspace @mailestro/backend migration:revert
```

## Conventions

- Keep tRPC routers thin; move logic to services.
- Prefer explicit, simple designs over abstractions.
- Use `@web/*` and `@server/*` path aliases for imports.
- File names use kebab-case.

## Testing

- Frontend: Vitest with @testing-library/react.
- Backend: Jest unit/integration tests.
- Follow RED -> GREEN -> REFACTOR.
