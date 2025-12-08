# Mailestro - Email Automation Platform

## General Usage

## Project Structure

This is a monorepo workspace using Yarn workspaces with two main applications:

- **`apps/backend/`** - NestJS backend application
- **`apps/web/`** - Next.js frontend application

## Project Specifics

### Initial Setup

Before you start, all necessary package installs are done via `yarn install` and a dev server is started with `yarn dev`.

### Linting and Formatting

Human devs have IDEs that autoformat code on every file save. After you edit files, you must do the equivalent by running `yarn check:fix`.

This command will also report linter errors that were not automatically fixable. Use your judgement as to which of the linter violations should be fixed.

### Build/Test Commands

- `yarn run typecheck` - Compiles all the files and quickly reports back syntax errors 
- `yarn run dev` - Start development server on both web and backend
- `yarn run build` - Build for production
- `yarn run test` - Run all Vitest tests
- `vitest run <test-file>` - Run single test file

### Architecture

- **Frontend**: Next.js 16 app with App Router
- **Backend**: NestJS app with Express adapter
- **Database**: PostgreSQL with TypeORM
- **Styling**: Tailwind CSS v4
- **Authentication**: better-auth (handled on both frontend and backend)
- **API**: tRPC v11 for mutations with full e2e type safety
- **Message Queue**: RabbitMQ for async processing
- **Cache**: Redis for session storage and caching
- **Error Tracking**: Sentry integration

### API Routing

- **tRPC** (`/trpc/*`) - All mutations (create, update, delete) and queries with full type safety
  - Backend endpoint: `http://localhost:4001/trpc`
  - Frontend connects via `http://localhost:3000/trpc` (proxied through Next.js)
- **better-auth** (`/api/auth/*`) - Authentication endpoints (handled by Next.js API routes)

### Code Style

- **TypeScript**: Strict mode, ES2022 target, bundler module resolution
- **Imports**: Use `@web/*` and `@server/*` path aliases for `src/` directory imports, for both backend and frontend projects
- **Components**: React 19 with JSX transform, functional components preferred
- **Server DB**: TypeORM with PostgreSQL dialect
- **Testing**: Vitest with @testing-library/react for component tests
- **File names**: Should always use kebab-case

## Backend Architecture

### Module Structure

Each feature module in NestJS follows this pattern:

```
src/
  {feature}/
    {feature}.module.ts      # NestJS module definition
    {feature}.entity.ts      # TypeORM entity
    {feature}.service.ts     # Business logic
    {feature}.router.ts      # tRPC router builder (implements RouterBuilder)
    {feature}.controller.ts  # Optional: REST endpoints (if needed)
    {feature}.consumer.ts    # Optional: RabbitMQ consumers
    {feature}.seed.ts        # Optional: Database seeding
```

### Adding New Modules on NestJS

1. **Create the module directory** in `apps/backend/src/{feature}/`

2. **Create the Entity** (`{feature}.entity.ts`):
```typescript
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('feature')
export class FeatureEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  name: string;

  // ... other columns
}
```

3. **Create the Service** (`{feature}.service.ts`):
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureEntity } from './feature.entity';

@Injectable()
export class FeatureService {
  constructor(
    @InjectRepository(FeatureEntity)
    private repository: Repository<FeatureEntity>,
  ) {}

  // Business logic methods
}
```

4. **Create the Router Builder** (`{feature}.router.ts`):
```typescript
import { Injectable } from '@nestjs/common';
import { RouterBuilder } from '@server/trpc/trpc.interface';
import { authRequired } from '@server/trpc/trpc.middleware';
import { TrpcService } from '@server/trpc/trpc.service';
import { FeatureService } from './feature.service';

@Injectable()
export class FeatureRouterBuilder implements RouterBuilder {
  constructor(
    private readonly trpc: TrpcService,
    private readonly featureService: FeatureService,
  ) {}

  public buildRouter() {
    return this.trpc.router({
      list: this.trpc.procedure
        .use(authRequired)
        .query(async () => {
          return await this.featureService.list();
        }),

      create: this.trpc.procedure
        .use(authRequired)
        .mutation(async ({ input }) => {
          return await this.featureService.create(input);
        }),
    });
  }
}
```

5. **Create the Module** (`{feature}.module.ts`):
```typescript
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrpcModule } from '@server/trpc/trpc.module';
import { FeatureEntity } from './feature.entity';
import { FeatureRouterBuilder } from './feature.router';
import { FeatureService } from './feature.service';

@Module({
  imports: [
    forwardRef(() => TrpcModule),
    TypeOrmModule.forFeature([FeatureEntity]),
  ],
  providers: [FeatureService, FeatureRouterBuilder],
  exports: [FeatureRouterBuilder],
})
export class FeatureModule {}
```

6. **Register in AppModule** (`apps/backend/src/app.module.ts`):
```typescript
import { FeatureModule } from './feature/feature.module';

@Module({
  imports: [
    // ... other modules
    FeatureModule,
  ],
})
export class AppModule {}
```

7. **Register Router in TrpcRouter** (`apps/backend/src/trpc/trpc.router.ts`):
```typescript
import { FeatureRouterBuilder } from '@server/feature/feature.router';

@Injectable()
export class TrpcRouter {
  constructor(
    // ... other routers
    private readonly featureRouter: FeatureRouterBuilder,
  ) {}

  appRouter = this.trpc.router({
    // ... other routers
    feature: this.featureRouter.buildRouter(),
  });
}
```

8. **Register Router Builder in TrpcModule** (`apps/backend/src/trpc/trpc.module.ts`):
```typescript
import { FeatureModule } from '@server/feature/feature.module';

@Module({
  imports: [
    // ... other modules
    forwardRef(() => FeatureModule),
  ],
})
export class TrpcModule {}
```

### Exposing Endpoints via tRPC Router on NestJS

tRPC routers are built using the `RouterBuilder` interface pattern:

1. **Router Builder Pattern**: Each module exports a `RouterBuilder` class that implements the `RouterBuilder` interface
2. **Middleware**: Use `authRequired` middleware from `@server/trpc/trpc.middleware` for protected routes
3. **Context**: Access user via `ctx.user` in procedures (after `authRequired` middleware)
4. **Error Handling**: Errors are automatically captured by Sentry via the TrpcService error formatter

**Example Procedure Types**:
- **Query**: `this.trpc.procedure.query(() => { ... })` - For read operations
- **Mutation**: `this.trpc.procedure.mutation(() => { ... })` - For write operations
- **Protected**: Add `.use(authRequired)` before query/mutation

### Database Migrations

Migrations are managed via TypeORM:

- **Create migration**: `yarn workspace @mailestro/backend migration:create ./src/migrations/{migration-name}`
- **Run migrations**: `yarn workspace @mailestro/backend migration:run`
- **Revert migration**: `yarn workspace @mailestro/backend migration:revert`

Migrations are located in `apps/backend/src/migrations/` and follow the pattern:
```typescript
export class CreateFeature1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Migration logic
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback logic
  }
}
```

### RabbitMQ Integration

RabbitMQ is used for async message processing:

1. **Send Messages**: Use `RabbitMQService.sendToQueue()` in services
2. **Consume Messages**: Create a consumer class with `@RabbitSubscribe()` decorator
3. **Example Consumer**:
```typescript
import { Injectable } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';

@Injectable()
export class FeatureConsumer {
  @RabbitSubscribe({
    exchange: 'feature',
    routingKey: 'feature',
  })
  async handleMessage(msg: any) {
    // Process message
  }
}
```

### Authentication Flow

1. **Frontend**: Uses `better-auth` client (`@web/auth/client`) for sign-in/sign-up
2. **Backend**: Uses `better-auth` server via `@thallesp/nestjs-better-auth` package
3. **Session Management**: 
   - Sessions stored in Redis (configured in `AuthModule`)
   - Cookies are used for session transport
   - `PrincipalService` extracts user from request cookies
4. **tRPC Context**: User is injected into tRPC context via `generateInjectedContext()` in `trpc.context.ts`
5. **Protected Routes**: Use `authRequired` middleware in tRPC procedures

### Configuration

Configuration is managed via `ConfigModule` with support for:
- Environment variables
- AWS Secrets Manager (optional, via `AWS_SECRET_NAME`)
- Type-safe configuration via `AppConfigurationType`

Key configuration files:
- `apps/backend/src/config/configuration.ts` - Main configuration factory
- `apps/backend/src/config/orm.configuration.ts` - Database configuration
- `apps/backend/src/config/cache.configuration.ts` - Cache configuration

## Frontend Architecture

### tRPC Integration

tRPC is integrated on the frontend using React Query:

1. **Client Setup**: `apps/web/src/trpc/react.tsx` - React client with `createTRPCReact`
2. **Server Setup**: `apps/web/src/trpc/server.ts` - Server-side client for SSR
3. **Provider**: Wrapped in `TRPCReactProvider` in root layout
4. **Usage in Components**:
```typescript
"use client";
import { trpc } from "@web/trpc/react";

export default function MyComponent() {
  const { data, isLoading } = trpc.feature.list.useQuery();
  const mutation = trpc.feature.create.useMutation();

  // Use data and mutation
}
```

### Authentication

- **Client**: `apps/web/src/auth/client.ts` - Client-side auth operations
- **Server**: `apps/web/src/auth/server.ts` - Server-side auth (used in Server Components)
- **API Routes**: Next.js API routes at `/api/auth/*` handle better-auth endpoints

### Routing Structure

- **`(auth)/`** - Authentication pages (sign-in, sign-up, reset-password)
- **`(protected)/`** - Protected pages requiring authentication
- **`(landing)/`** - Public landing pages
- **`api/`** - API routes (better-auth endpoints)

### Component Organization

- **`components/ui/`** - Reusable UI components
- **`components/layout/`** - Layout components (header, footer, etc.)
- **`hooks/`** - Custom React hooks
- **`lib/`** - Utility functions and configurations

## Data Flow Architecture between Frontend and Backend

```
┌─────────────────┐
│  Next.js App    │
│  (Frontend)     │
└────────┬────────┘
         │
         │ HTTP (tRPC)
         │ Cookies (Session)
         │
         ▼
┌─────────────────┐
│  NestJS App     │
│  (Backend)      │
└────────┬────────┘
         │
         ├──► PostgreSQL (TypeORM)
         ├──► Redis (Sessions/Cache)
         └──► RabbitMQ (Async Jobs)
```

### Request Flow

1. **Client Request**: React component calls `trpc.feature.list.useQuery()`
2. **tRPC Client**: Request sent to `/trpc` endpoint (Next.js API route or direct to backend)
3. **Backend tRPC**: Express middleware at `/trpc` receives request
4. **Context Creation**: `generateInjectedContext()` extracts user from cookies via `PrincipalService`
5. **Procedure Execution**: Router executes procedure with context
6. **Response**: Data returned to frontend with full type safety

### Authentication Flow

1. **Sign In**: User signs in via `authClient.signIn.email()` (better-auth)
2. **Session Creation**: better-auth creates session, stores in Redis
3. **Cookie Set**: Session cookie set in browser
4. **Subsequent Requests**: Cookie sent with each request
5. **Context Extraction**: `PrincipalService.getPrincipal()` reads cookie and validates session
6. **User Available**: User available in `ctx.user` for protected procedures

## Development Workflow

### Adding a New Feature

1. **Backend**:
   - Create entity, service, router, and module
   - Register module in `AppModule` and router in `TrpcRouter`
   - Create migration if schema changes needed
   - Test with tRPC procedures

2. **Frontend**:
   - Create page/component in appropriate route group
   - Use `trpc.{feature}.{procedure}.useQuery()` or `.useMutation()`
   - Handle loading/error states
   - Test end-to-end flow

### Environment Variables

Backend requires:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `RABBITMQ_URL` - RabbitMQ connection string
- `BETTER_AUTH_SECRET` - Secret for better-auth
- `CORS_URL` - Allowed CORS origins
- `PORT` - Backend port (default: 4001)

Frontend requires:
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` - For OAuth (optional)

### Type Safety

- **Backend → Frontend**: tRPC provides full type safety via `AppRouter` type
- **Frontend**: Import `AppRouter` from `@server/trpc/trpc.router` for type inference
- **No manual types needed**: tRPC automatically infers types from backend routers

## Testing

- **Backend**: Jest for unit/integration tests
- **Frontend**: Vitest with @testing-library/react for component tests
- **E2E**: Can be added using Playwright or similar

## Deployment Considerations

- **Database**: Run migrations before deployment
- **Redis**: Required for session storage
- **RabbitMQ**: Required for async job processing
- **Environment**: Set all required environment variables
- **CORS**: Configure `CORS_URL` for production domain
- **Sentry**: Configure Sentry DSN for error tracking
