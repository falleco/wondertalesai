FROM node:22-bullseye-slim AS builder

WORKDIR /app

RUN corepack enable

COPY . .

RUN yarn install --immutable
RUN yarn workspace @dreamtalesai/auth build
RUN yarn workspace @dreamtalesai/backend build

FROM node:22-bullseye-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/packages/auth/dist /app/packages/auth/dist
COPY --from=builder /app/packages/auth/package.json /app/packages/auth/package.json
COPY --from=builder /app/apps/backend/dist /app/apps/backend/dist
COPY --from=builder /app/apps/backend/package.json /app/apps/backend/package.json

EXPOSE 4001

WORKDIR /app/apps/backend

CMD ["node", "dist/main"]
