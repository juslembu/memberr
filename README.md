# Memberr

Share membership cards with friends and family. Available on web, iOS, and Android.

## Stack

- **Frontend**: Expo (React Native + Web) — one codebase for all platforms
- **Backend**: Fastify + TypeScript
- **Database**: PostgreSQL 16 + Drizzle ORM
- **Deployment**: Docker Compose + Caddy (auto-HTTPS)

## Getting started (development)

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker + Docker Compose

### 1. Install dependencies
```bash
pnpm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env and set strong secrets for JWT_SECRET and REFRESH_TOKEN_SECRET
```

### 3. Start the database + API
```bash
docker compose up postgres -d
pnpm db:migrate          # run migrations
pnpm --filter @memberr/api dev
```

### 4. Start the mobile/web app
```bash
pnpm --filter @memberr/mobile dev
# Press 'w' for web, 'a' for Android emulator, 'i' for iOS simulator
```

## Production deployment (VM)

```bash
# On your VM, set all secrets in .env, then:
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Point your domain's DNS to the VM's IP.
# Caddy automatically issues a Let's Encrypt certificate.
```

Edit `infra/Caddyfile` to replace `memberr.yourdomain.com` with your domain.

## Project structure

```
apps/
  api/       Fastify backend (REST API)
  mobile/    Expo app (iOS + Android + Web)
packages/
  shared/    Shared TypeScript types and Zod validation schemas
infra/
  Caddyfile  Reverse proxy config
```

## How sharing works

1. User A adds a membership card (store name, card number, barcode type)
2. User A opens the card and taps the share icon, enters User B's email
3. If User B has an account → direct access granted immediately
4. If User B has no account → an invitation is created (email link, 7-day expiry)
5. User B accepts the invitation → can now view and show the card's barcode
6. User A can revoke access at any time
