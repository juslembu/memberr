# Memberr

Share membership cards with friends and family. Self-hostable — runs on web, iOS, and Android,
all talking to a server you control.

> **Note:** This project is vibe-coded — built largely with AI assistance and light human review.
> Treat it accordingly before relying on it for anything sensitive.

## Stack

- **Frontend**: Expo (React Native + Web) — one codebase for all platforms
- **Backend**: Fastify + TypeScript
- **Database**: PostgreSQL 16 + Drizzle ORM
- **Deployment**: Docker Compose + Caddy (auto-HTTPS)

## How sharing works

1. User A adds a membership card (store name, card number, barcode type)
2. User A opens the card and taps the share icon, enters User B's email
3. If User B has an account → direct access granted immediately
4. If User B has no account → a shareable invite link is created (7-day expiry); User A sends it
   to User B however they like (text, chat app, etc.) — Memberr does not send emails itself
5. User B opens the link, creates an account or signs in → can now view and show the card's barcode
6. User A can revoke access at any time

---

# Part 1: Running your own server

This section is for whoever hosts Memberr (a VM, home server, etc.). If you just want to *use*
someone else's Memberr server from the mobile app, skip to [Part 2](#part-2-using-the-app).

## Prerequisites
- Node.js 20+
- pnpm 9+
- Docker + Docker Compose
- A domain name pointed at your server (for production HTTPS — not needed for local dev)

## Local development

### 1. Install dependencies
```bash
pnpm install
```
This also builds `packages/shared` automatically (via a `postinstall` script) — no separate build
step needed.

### 2. Configure environment
```bash
cp .env.example .env
```
Edit `.env` and set strong values for `JWT_SECRET` and `REFRESH_TOKEN_SECRET` (32+ characters each).
Generate them with:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Start the database + API
```bash
docker compose up postgres -d
pnpm db:migrate
pnpm --filter @memberr/api dev
```
The API's `dev` script loads the root `.env` itself (`tsx --env-file`) — nothing extra to wire up.
It listens on `:3000`.

### 4. Start the mobile/web app
```bash
pnpm --filter @memberr/mobile dev
# Press 'w' for web, 'a' for Android emulator, 'i' for iOS simulator (macOS only)
```

## Production deployment

**First-time setup, on your server (common to both options below):**
```bash
git clone <your-fork-or-this-repo-url> memberr
cd memberr
cp .env.example .env
# Edit .env: set POSTGRES_PASSWORD, JWT_SECRET, REFRESH_TOKEN_SECRET, and CORS_ORIGINS
# (CORS_ORIGINS should include your domain, e.g. https://memberr.yourdomain.com)
```
Edit `infra/Caddyfile` and replace the domain at the top (currently `memberr.cowjuice.xyz`,
this deployment's own domain) with yours.

You still need the repo cloned either way — `docker-compose.yml`, the Caddyfile, and `.env.example`
all live in it — but you have a choice for the API container itself:

### Option A: pull the prebuilt image (fastest, no Node/build toolchain needed)

Every push to `main` publishes `ghcr.io/juslembu/memberr-api` (linux/amd64). Skip `pnpm install`
entirely for this path:
```bash
docker compose pull api
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
docker compose exec api node dist/db/migrate.js
```

### Option B: build from source (if you've modified the code)
```bash
pnpm install
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
pnpm db:migrate
```

Either way, point your domain's DNS A record at the server's IP before or shortly after this —
Caddy will automatically request a Let's Encrypt certificate once it can verify the domain.

**Deploying updates after the initial setup** — always use these, never a plain `docker compose
restart` (it won't pick up source/build changes):
```bash
pnpm deploy:api    # API only: rebuilds the image, recreates the API container
pnpm deploy:web    # frontend only: Expo web export, recreates Caddy (which serves the export)
pnpm deploy:all    # both, in the right order
```
If you're on Option A, `docker compose pull api && docker compose -f docker-compose.yml -f
docker-compose.prod.yml up -d --force-recreate api` is the equivalent for picking up a new image.

### Database migrations in production
```bash
pnpm db:migrate
```
Run this after pulling changes that include new files under `apps/api/src/db/migrations/`. If
you're running the prebuilt image without a local Node/pnpm toolchain (Option A), run migrations
inside the container instead: `docker compose exec api node dist/db/migrate.js`.

## Server-side troubleshooting

These are real issues hit while setting this project up — saving you the trouble:

- **`Invalid environment variables` on `pnpm --filter @memberr/api dev`** — you're missing `.env`
  or it's missing required keys. Re-check step 2 above.
- **`Cannot find module '@memberr/shared/dist/index.js'`** — `packages/shared` wasn't built. Run
  `pnpm --filter @memberr/shared build` (this normally happens automatically via `postinstall`;
  only needed manually after editing files in `packages/shared` while a dev server is already running).
- **Windows: `npm`/`pnpm` fail with "running scripts is disabled"** — PowerShell's execution
  policy is blocking npm's `.ps1` shims. Fix once with:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```
- **`docker compose pull api` fails with "unauthorized" / "denied"** (maintainers only) — GHCR
  packages default to private. After the first successful `docker-publish` workflow run, go to the
  repo's Packages tab and set `memberr-api`'s visibility to public.

---

# Part 2: Using the app

## Web
No setup needed — open your Memberr server's URL in a browser (e.g. `https://memberr.yourdomain.com`).
The web app talks to the API on the same domain automatically.

## Android (prebuilt APK)
Don't want to build anything? Grab the latest signed release APK from
[GitHub Releases](https://github.com/juslembu/memberr/releases/latest) and sideload it. On first
launch, enter your Memberr server's URL on the setup screen (changeable later from
**Account → Server**). You'll need to allow "install from unknown sources" for your browser/file
manager, since this isn't distributed through the Play Store.

## iOS / Android (Expo Go)
Fastest way to try the app on a real phone without building anything:
1. Install **Expo Go** from the App Store / Play Store.
2. Run `pnpm --filter @memberr/mobile dev` on a machine on the same network as your phone, and scan
   the QR code it prints.
3. On first launch, enter your Memberr server's URL (e.g. `https://memberr.yourdomain.com`) on the
   setup screen. You can change this later from **Account → Server**.

## Building a real native app (not Expo Go)

Needed if you want an installable app icon (rather than running inside Expo Go), or are testing
native-only behavior (camera permissions, secure storage, push notifications).

### Android

Requires Android Studio and the Android SDK installed locally:

1. Install [Android Studio](https://developer.android.com/studio) and let its Setup Wizard install
   the SDK (it also bundles a working JDK at `Android Studio\jbr`).
2. Set `ANDROID_HOME` and `JAVA_HOME` env vars, and add `%ANDROID_HOME%\platform-tools` /
   `%JAVA_HOME%\bin` to `PATH` (Windows: System Properties → Environment Variables; macOS/Linux:
   your shell profile).
3. In Android Studio, **Tools → Device Manager** → create a virtual device (any recent API level)
   and boot it, or connect a physical device with USB debugging enabled (`adb devices` should list it).
4. From the repo root:
   ```bash
   pnpm --filter @memberr/mobile android
   ```
5. On first launch, enter the server URL on the setup screen:
   - Emulator → `http://10.0.2.2:3000` if running the API locally (Android's alias for the host
     machine's `localhost`), or your production domain if pointing at a real server
   - Physical device → your machine's LAN IP (e.g. `http://192.168.1.x:3000`) if running the API
     locally, or your production domain

### iOS
Requires a Mac with Xcode installed:
```bash
pnpm --filter @memberr/mobile ios
```

### Native build troubleshooting

- **`Plugin [id: 'expo-module-gradle-plugin'] was not found`** — almost always a dependency version
  mismatch: some `expo-*` package resolved to a newer SDK generation than the rest of the project
  (check for stray `^` caret ranges in `apps/mobile/package.json` next to otherwise-pinned `~`
  ranges). Fix with `pnpm --filter @memberr/mobile exec expo install --fix`, then delete and
  regenerate the native project: `rm -rf apps/mobile/android && pnpm --filter @memberr/mobile android`.
- **Same error persists after deleting `node_modules` and reinstalling on Windows** — pnpm's default
  symlinked `node_modules` layout can trip up Gradle's plugin resolution on Windows. This repo's
  `.npmrc` already sets `node-linker=hoisted` to avoid this; if you still hit it, delete `android/`
  and rebuild as above.
- **Stale Gradle plugin errors after changing dependencies** — delete the native project and let
  Expo regenerate it: `rm -rf apps/mobile/android` (it's not committed to git, this is always safe).
- **`Port "8081" became busy"`** — a previous Metro/Gradle process is still holding the port. Find
  and kill it, then retry:
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 8081).OwningProcess
  Stop-Process -Id <PID> -Force
  ```

---

## Project structure

```
apps/
  api/       Fastify backend (REST API)
  mobile/    Expo app (iOS + Android + Web)
packages/
  shared/    Shared TypeScript types and Zod validation schemas
infra/
  Caddyfile  Reverse proxy config (edit the domain for your own deployment)
```

See `CLAUDE.md` for architecture details (auth model, self-hosting URL resolution, web platform
gotchas, etc.) if you're modifying the code rather than just deploying it.
