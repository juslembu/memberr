FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# --ignore-scripts: the root `postinstall` (builds packages/shared) would otherwise run here too,
# before the COPY below brings in the actual source — it has nothing to compile yet and fails.
# The real build happens explicitly below once source is present.
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN pnpm --filter @memberr/shared build
RUN pnpm --filter @memberr/api build

FROM node:22-alpine AS runner
WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# --ignore-scripts: same reason as above, plus `typescript` (needed by the postinstall build) is a
# devDependency stripped by --prod. The already-built dist is copied in below instead. We still
# need argon2's own native binding for production, so rebuild just that package explicitly.
RUN pnpm install --frozen-lockfile --prod --ignore-scripts && pnpm rebuild argon2

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/src/db/migrations ./apps/api/dist/db/migrations

ENV NODE_ENV=production
WORKDIR /app/apps/api
CMD ["node", "dist/index.js"]
