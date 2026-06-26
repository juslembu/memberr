<p align="center">
  <img src="apps/mobile/assets/images/icon.png" width="96" alt="Memberr icon" />
</p>

<h1 align="center">Memberr</h1>

<p align="center">
  A self-hostable membership card wallet for web, iOS, and Android.
  Store your loyalty cards and share them with friends and family,
  all on a server you control.
</p>

<p align="center">
  <a href="https://github.com/juslembu/memberr/actions/workflows/docker-publish.yml"><img src="https://github.com/juslembu/memberr/actions/workflows/docker-publish.yml/badge.svg" alt="Docker image build status"></a>
  <a href="https://github.com/juslembu/memberr/actions/workflows/android-release.yml"><img src="https://github.com/juslembu/memberr/actions/workflows/android-release.yml/badge.svg" alt="Android release build status"></a>
  <a href="https://github.com/juslembu/memberr/pkgs/container/memberr-api"><img src="https://img.shields.io/badge/ghcr.io-memberr--api-blue?logo=docker" alt="Docker image on GHCR"></a>
</p>

> [!NOTE]
> This project is vibe-coded, built largely with AI assistance and light human review. Treat it
> accordingly before relying on it for anything sensitive.

Jump to: [Features](#features) · [Self-hosting](#part-1-running-your-own-server) · [Using the app](#part-2-using-the-app) · [Project structure](#project-structure)

## Features

- **Card wallet**: store membership and loyalty cards with barcode or QR code, organize and reorder them freely
- **Sharing**: share a card with another registered user by username, or send a time-limited invite link to someone without an account; revoke access at any time
- **Self-hostable**: your data lives on a server you control with no third-party account required
- **Cross-platform**: one codebase for web, iOS, and Android via Expo
- **Prebuilt distribution**: pull the API as a ready-made Docker image or sideload a signed Android APK without needing a build toolchain

## Stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Frontend   | Expo (React Native + Web)           |
| Backend    | Fastify + TypeScript                |
| Database   | PostgreSQL 16 + Drizzle ORM         |
| Deployment | Docker Compose + Caddy (auto-HTTPS) |

## How sharing works

1. User A adds a membership card (store name, card number, barcode type)
2. User A opens the card and taps Share, then enters User B's username
3. If User B has an account, access is granted immediately
4. If User B has no account yet, a shareable invite link is created (7-day expiry); User A sends it however they like (text, chat, etc.) since Memberr does not send emails
5. User B opens the link, creates an account or signs in, and can now view and scan the card's barcode
6. User A can revoke access at any time from the card detail screen

---

# Part 1: Running your own server

This section is for whoever hosts Memberr (a VPS, home server, etc.). If you just want to use
someone else's Memberr server from the mobile app, skip to [Part 2](#part-2-using-the-app).

## Prerequisites

- Docker and Docker Compose
- A domain name pointed at your server (for production HTTPS; not needed for local dev)
- Node.js 20+ and pnpm 9+ are **only** needed for local development or building the API from source (Option B). Deploying the prebuilt image (Option A) requires neither.

## Quick start

**First-time setup on your server (common to both options):**

```bash
git clone <your-fork-or-this-repo-url> memberr
cd memberr
cp .env.example .env
# Edit .env: set POSTGRES_PASSWORD, JWT_SECRET, REFRESH_TOKEN_SECRET, and CORS_ORIGINS
# CORS_ORIGINS should include your domain, e.g. https://memberr.yourdomain.com
```

Edit `infra/Caddyfile` and replace the domain at the top with yours.

You still need the repo cloned either way since `docker-compose.yml`, the Caddyfile, and `.env.example` all live in it. For the API container itself you have two options:

### Option A: pull the prebuilt image (recommended)

> [!TIP]
> Every push to `main` publishes `ghcr.io/juslembu/memberr-api` (linux/amd64) automatically.
> No Node.js or build toolchain needed.

```bash
docker compose pull api
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
docker compose exec api node dist/db/migrate.js
```

### Option B: build from source

Use this if you have modified the code.

```bash
pnpm install
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
pnpm db:migrate
```

After either option, point your domain's DNS A record at the server's IP. Caddy will request a Let's Encrypt certificate automatically once the domain is reachable.

**Deploying updates** (never use a plain `docker compose restart` as it won't pick up code or image changes):

```bash
pnpm deploy:api    # API only: rebuilds the image and recreates the API container
pnpm deploy:web    # frontend only: Expo web export, then recreates Caddy
pnpm deploy:all    # both, in the correct order
```

For Option A, the equivalent for picking up a new image is:

```bash
docker compose pull api
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate api
```

Run the migration command again any time you pull changes that add new files under `apps/api/src/db/migrations/`.

<details>
<summary>Local development setup</summary>

### 1. Install dependencies

```bash
pnpm install
```

This also builds `packages/shared` automatically via a `postinstall` script; no separate build step needed.

### 2. Configure environment

```bash
cp .env.example .env
```

Set strong values for `JWT_SECRET` and `REFRESH_TOKEN_SECRET` (32+ characters each):

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Start the database and API

```bash
docker compose up postgres -d
pnpm db:migrate
pnpm --filter @memberr/api dev
```

The API listens on `:3000` and loads `.env` automatically via `tsx --env-file`.

### 4. Start the mobile/web app

```bash
pnpm --filter @memberr/mobile dev
# Press w for web, a for Android emulator, i for iOS simulator (macOS only)
```

</details>

<details>
<summary>Server-side troubleshooting</summary>

- **`Invalid environment variables` on API start**: you are missing `.env` or it is missing required keys. Re-check the local development steps above.
- **`Cannot find module '@memberr/shared/dist/index.js'`**: `packages/shared` was not built. Run `pnpm --filter @memberr/shared build` (this normally happens automatically via `postinstall`; only needed manually if you edit `packages/shared` while a dev server is already running).
- **Windows: `npm`/`pnpm` fail with "running scripts is disabled"**: PowerShell's execution policy is blocking npm's `.ps1` shims. Fix once with:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```
- **`docker compose pull api` fails with "unauthorized"** (maintainers only): GHCR packages default to private. After the first successful `docker-publish` workflow run, go to the repo's Packages tab and set `memberr-api` visibility to public.

</details>

---

# Part 2: Using the app

## Web

Open your Memberr server's URL in a browser (e.g. `https://memberr.yourdomain.com`). No setup needed; the web app talks to the API on the same domain automatically.

## Android

**Most people want the prebuilt APK.** Use Expo Go if you just want to try the app without installing anything permanent. Only go through a native build if you are developing or debugging the app itself.

### Prebuilt APK

Download the latest signed release APK from [GitHub Releases](https://github.com/juslembu/memberr/releases/latest) and sideload it. On first launch, enter your Memberr server's URL on the setup screen (changeable later from **Account › Server**). You will need to allow "install from unknown sources" in your browser or file manager since this is not distributed through the Play Store.

### Expo Go (quick preview)

1. Install **Expo Go** from the App Store or Play Store.
2. Run `pnpm --filter @memberr/mobile dev` on a machine on the same network as your phone, then scan the QR code it prints.
3. Enter your Memberr server's URL on the setup screen.

<details>
<summary>Building a native app (Android or iOS)</summary>

Use this if you need to test native-only behavior (camera permissions, secure storage, push notifications) or if you want to build for iOS, which has no prebuilt download.

### Android

1. Install [Android Studio](https://developer.android.com/studio) and let its Setup Wizard install the SDK (it bundles a working JDK at `Android Studio\jbr`).
2. Set `ANDROID_HOME` and `JAVA_HOME`, and add `%ANDROID_HOME%\platform-tools` and `%JAVA_HOME%\bin` to `PATH`.
3. In Android Studio, open **Tools › Device Manager**, create a virtual device and boot it, or connect a physical device with USB debugging enabled (`adb devices` should list it).
4. From the repo root:
   ```bash
   pnpm --filter @memberr/mobile android
   ```
5. On first launch, enter the server URL on the setup screen:
   - Emulator: use `http://10.0.2.2:3000` if running the API locally (Android's alias for the host machine's `localhost`)
   - Physical device: use your machine's LAN IP (e.g. `http://192.168.1.x:3000`) if running the API locally

### iOS

Requires a Mac with Xcode installed:

```bash
pnpm --filter @memberr/mobile ios
```

### Native build troubleshooting

- **`Plugin [id: 'expo-module-gradle-plugin'] was not found`**: almost always a dependency version mismatch where some `expo-*` package resolved to a newer SDK generation. Fix with `pnpm --filter @memberr/mobile exec expo install --fix`, then delete and regenerate the native project:
  ```bash
  rm -rf apps/mobile/android
  pnpm --filter @memberr/mobile android
  ```
- **Same error persists after reinstalling on Windows**: this repo's `.npmrc` already sets `node-linker=hoisted` to avoid Gradle plugin resolution issues. If you still hit it, delete `android/` and rebuild as above.
- **Stale Gradle errors after changing dependencies**: delete the native project and let Expo regenerate it (`rm -rf apps/mobile/android`). It is not committed to git and is always safe to delete.
- **`Port "8081" became busy`**: a previous Metro or Gradle process is holding the port. Kill it and retry:
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 8081).OwningProcess
  Stop-Process -Id <PID> -Force
  ```

</details>

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
