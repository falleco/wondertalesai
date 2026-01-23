FROM node:22-bullseye-slim AS builder

WORKDIR /app

RUN corepack enable

ARG DATABASE_URL
ARG REDIS_URL
ARG STRIPE_SECRET_KEY
ARG STRIPE_WEBHOOK_SECRET
ARG GITHUB_CLIENT_ID
ARG GITHUB_CLIENT_SECRET
ARG NEXT_PUBLIC_API_BASE_URL

ENV DATABASE_URL=$DATABASE_URL
ENV REDIS_URL=$REDIS_URL
ENV STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
ENV STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET
ENV GITHUB_CLIENT_ID=$GITHUB_CLIENT_ID
ENV GITHUB_CLIENT_SECRET=$GITHUB_CLIENT_SECRET
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

COPY . .

RUN yarn install --immutable
RUN yarn workspace @dreamtalesai/auth build
RUN yarn workspace @dreamtalesai/web build

FROM node:22-bullseye-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/packages/auth/dist /app/packages/auth/dist
COPY --from=builder /app/packages/auth/package.json /app/packages/auth/package.json
COPY --from=builder /app/apps/web/.next /app/apps/web/.next
COPY --from=builder /app/apps/web/public /app/apps/web/public
COPY --from=builder /app/apps/web/package.json /app/apps/web/package.json
COPY --from=builder /app/apps/web/next.config.ts /app/apps/web/next.config.ts

EXPOSE 3000

WORKDIR /app/apps/web

CMD ["yarn", "start"]
