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
`pnpm install` already builds `packages/shared` (via a `postinstall` script) and the API's `dev`
script loads the root `.env` itself — no extra steps needed for either.

### 4. Start the mobile/web app
```bash
pnpm --filter @memberr/mobile dev
# Press 'w' for web, 'a' for Android emulator, 'i' for iOS simulator
```

### 5. Testing on a real Android emulator/device (native build)

`pnpm --filter @memberr/mobile dev` + Expo Go covers most UI work, but native-only code (camera
permissions, secure-store, push notifications) needs a real native build via `expo run:android`.
This requires Android Studio and the Android SDK installed locally:

1. Install [Android Studio](https://developer.android.com/studio) and let its Setup Wizard install
   the SDK (default install also gives you a working JDK at `Android Studio\jbr`).
2. Set `ANDROID_HOME` and `JAVA_HOME` env vars, and add `%ANDROID_HOME%\platform-tools` /
   `%JAVA_HOME%\bin` to `PATH` (Windows: System Properties → Environment Variables; macOS/Linux:
   your shell profile).
3. **Windows only:** if `npm`/`pnpm` fail with "running scripts is disabled", PowerShell's execution
   policy is blocking npm's `.ps1` shims — fix once with:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
4. In Android Studio, **Tools → Device Manager** → create a virtual device (any recent API level)
   and boot it, or connect a physical device with USB debugging enabled (`adb devices` should list it).
5. Run the API locally (steps 1–3 above), then build and install the app:
   ```bash
   pnpm --filter @memberr/mobile android
   ```
6. On first launch, enter the server URL on the setup screen:
   - Emulator → `http://10.0.2.2:3000` (Android's alias for the host machine's `localhost`)
   - Physical device → your machine's LAN IP, e.g. `http://192.168.1.x:3000`

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
