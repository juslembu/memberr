# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
pnpm install

# Development (run each separately)
docker compose up postgres -d
pnpm db:migrate
pnpm --filter @memberr/api dev          # API on :3000
pnpm --filter @memberr/mobile dev       # Expo: press w=web, a=Android, i=iOS

# Type-check both apps
pnpm type-check

# Lint mobile app
pnpm --filter @memberr/mobile lint

# DB schema changes
pnpm db:generate   # generate migration after editing apps/api/src/db/schema.ts
pnpm db:migrate    # apply migrations

# Production web deploy (build + force-recreate Caddy)
pnpm deploy:web
```

## Architecture

**Monorepo:** pnpm workspaces + Turborepo. Three packages: `apps/api`, `apps/mobile`, `packages/shared`.

**`packages/shared`** exports TypeScript types (`Card`, `CardShare`, `User`, etc.) and Zod validation schemas (`createCardSchema`, `shareCardSchema`, etc.). Both API and mobile import from here via `@memberr/shared`. When adding a new field to a card or user, update the schema here first.

**`apps/api`** — Fastify 5 + Drizzle ORM + PostgreSQL 16. Route files: `auth`, `cards`, `shares`, `invitations`, `shared-with-me` — all registered under `/api/v1/`. Auth is an `onRequest` hook in `plugins/auth.ts`: every route is protected by default; mark public routes with `{ config: { public: true } }`. Access tokens are 15-minute JWTs; refresh tokens (30-day, httpOnly cookie) use token-family rotation — reuse of a revoked token invalidates the whole family.

**`apps/mobile`** — Expo 52 + expo-router v4 targeting iOS, Android, and Web via react-native-web. Key files:
- `app/_layout.tsx` — root `Stack` conditionally shows `(auth)` or `(tabs)` based on `AuthContext`
- `app/index.tsx` — auth-aware `Redirect` to resolve `/`
- `hooks/useAuth.ts` — `AuthContext` provider; after login/register calls `router.replace('/(tabs)/my-cards')`; after logout calls `router.replace('/(auth)/login')` — explicit navigation is required because expo-router's conditional Stack doesn't auto-navigate on screen registration changes
- `lib/api.ts` — all API calls; `fetchWithAuth` handles 401→refresh→retry automatically; only sets `Content-Type: application/json` when a request body is present (omitting it on bodyless DELETE/GET avoids Fastify 400s)
- Token storage: `localStorage` on web, `expo-secure-store` on native

**Web platform gotchas** — the mobile app runs as a web SPA (`output: "single"` in `app.json`). Several expo/RN APIs don't work on web and require platform-split files (Metro resolves `.web.tsx` / `.web.ts` automatically):
- `expo-camera` and `expo-image-picker` both call `createPermissionHook` at module load time, which doesn't exist in the web bundle → use `BarcodeScanner.web.tsx` (@zxing/browser + getUserMedia) and `lib/imagePicker.web.ts` (HTML `<input type="file">`) instead
- `expo-secure-store` — not available on web; use `localStorage`
- `Alert.alert` — no-op on web (react-native-web doesn't implement it); use inline state (`error` string, confirm `Modal`) instead
- `KeyboardAvoidingView` with `behavior="height"` intercepts pointer events on web; wrap with plain `View` when `Platform.OS === 'web'`

**Barcode handling:**
- Camera scanning: `BarcodeScanner.tsx` (native, expo-camera) / `BarcodeScanner.web.tsx` (web, @zxing/browser)
- Image upload detection: `@zxing/browser` dynamically imported in `add.tsx` (web only)
- Display: `BarcodeDisplay.tsx` uses `react-native-barcode-svg` for linear codes and `react-native-qrcode-svg` for QR
- Card images are compressed to base64 JPEG data URLs via canvas (max 1200px, 75% quality) and stored directly in the `cardImageUrl` DB column — no separate file upload endpoint

**Deployment:** Docker Compose + Caddy on `memberr.cowjuice.xyz`. The prod override (`docker-compose.prod.yml`) mounts `apps/mobile/dist` into Caddy as a bind mount. Because `expo export` deletes and recreates `dist/` on each build, Caddy must be force-recreated after every web build — this is what `pnpm deploy:web` does.
