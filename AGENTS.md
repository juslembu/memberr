# AGENTS.md

Compact guidance for OpenCode sessions in the Memberr repo.

## Project at a glance

Self-hostable membership/loyalty card wallet. Stack: Fastify 5 + Drizzle/Postgres 16 API, Expo 52 + React Native + react-native-web mobile app. pnpm workspaces + Turborepo monorepo: `apps/api`, `apps/mobile`, `packages/shared`.

## Daily commands

```bash
pnpm install                     # also builds packages/shared via postinstall

docker compose up postgres -d    # start local DB
pnpm db:migrate                  # apply migrations
pnpm --filter @memberr/api dev   # API on http://localhost:3000

pnpm --filter @memberr/mobile dev        # Expo (w=web, a=Android, i=iOS)
pnpm --filter @memberr/mobile lint       # lint only
pnpm type-check                          # type-check both apps
pnpm test                                # run tests across all packages (Vitest)
```

### Database changes

```bash
# 1. edit apps/api/src/db/schema.ts
# 2. generate migration
pnpm db:generate                 # drizzle-kit generate
# 3. apply
pnpm db:migrate
```

## Non-obvious architecture

- **`packages/shared`** — source of truth for shared types and Zod schemas. Imported via `@memberr/shared`. Built automatically on `pnpm install`, but dev servers do **not** watch it; rebuild manually with `pnpm --filter @memberr/shared build` after edits.
- **Auth** — `apps/api/src/plugins/auth.ts` protects every route by default. Mark public routes with `{ config: { public: true } }`. Access tokens = 15m JWT; refresh tokens = 30d httpOnly cookies with token-family rotation (reuse of revoked token revokes the whole family).
- **API dev env** — `apps/api/package.json` loads `../../.env` via `tsx watch --env-file=../../.env`.
- **Migration side effect** — `apps/api/src/db/migrate.ts` seeds an admin user (`admin / admin`) if none exists.
- **Version enforcement** — `apps/api/src/routes/version.ts` exposes `minAppVersion` from `MIN_APP_VERSION` env var. Native app compares against `APP_VERSION` from `app.json` and blocks stale clients with an update screen.

## Web vs native gotchas

The mobile app is also the web SPA (`app.json` has `"output": "single"`).

- **Server URL resolution** (`apps/mobile/lib/serverUrl.ts`):
  - Web production: same-origin (Caddy reverse-proxies `/api/*`).
  - Web local dev: `http://localhost:3000` hard-coded for localhost/127.0.0.1 so Metro `:8081` can talk to the local API.
  - Native: user enters URL in `app/server-setup.tsx`, persisted in `expo-secure-store`. `app.json` `extra.apiUrl` is only a pre-filled suggestion, not a default.
  - Any shareable link must use `getServerUrl()`; never hardcode the production domain.
- **Platform-split files** (Metro auto-resolves `.web.tsx` / `.web.ts`):
  - Camera scanning: `components/BarcodeScanner.tsx` (native) / `BarcodeScanner.web.tsx` (@zxing/browser).
  - Image picker: `lib/imagePicker.ts` (native) / `lib/imagePicker.web.ts` (HTML `<input type="file">`).
  - `expo-secure-store` is not available on web; use `localStorage` there.
  - `Alert.alert` is a no-op on web; use inline state/modals instead.
  - `KeyboardAvoidingView behavior="height"` intercepts pointer events on web; wrap with `View` on web.
- **Card images** — compressed client-side to base64 JPEG (max 1200px, 75% quality) and stored in the `cardImageUrl` column. No file-upload endpoint.

## Mobile routing and auth navigation

`app/_layout.tsx` conditionally renders `(auth)`, `(tabs)`, `(admin)`, or `server-setup` based on `AuthContext` + `hasServerUrl()`. Because expo-router's conditional `Stack` does not auto-navigate when screen registration changes, explicit navigation is required:

- After login/register: `router.replace('/(tabs)/my-cards')` (or `/change-password` when `mustChangePassword`).
- After logout: `router.replace('/(auth)/login')`.

## API client notes

`apps/mobile/lib/api.ts` (`fetchWithAuth`):

- Only sets `Content-Type: application/json` when a body is present; omitting it on bodyless GET/DELETE avoids Fastify 400s.
- Sends `X-App-Version` header on every request.
- Handles 401 → refresh-token retry automatically.

## Testing

Vitest is the test runner, wired through Turborepo (`pnpm test` runs all packages). Tests are devDependencies and are not included in the Docker production image (`--prod` install).

```bash
pnpm test                                    # all tests (via turbo)
pnpm --filter @memberr/shared test           # shared Zod schema tests only
pnpm --filter @memberr/shared test:watch     # watch mode
pnpm --filter @memberr/api test              # API tests only
pnpm --filter @memberr/mobile test           # mobile tests only (Jest)
```

- `packages/shared/src/validation/__tests__/validation.test.ts` — all Zod schema edge cases.
- `apps/api/src/plugins/__tests__/auth.test.ts` — auth helpers (token hashing, JWT signing, refresh token rotation, reuse detection). Mocks the DB layer so no Postgres needed.
- `apps/mobile/lib/__tests__/serverUrl.test.ts` — pure URL normalization logic.
- `apps/mobile/app/(auth)/__tests__/login.test.tsx` — React Native component test (Jest + React Native Testing Library). Requires native module mocks in `apps/mobile/jest.setup.js`.
- Tests also run in CI via `.github/workflows/test.yml` on push to `main` and on PRs.

## Deployment gotchas

Never use plain `docker compose restart`; it does not pick up source or image changes.

```bash
pnpm deploy:api   # rebuild API image + force-recreate api container
pnpm deploy:web   # expo export --platform web + force-recreate caddy
pnpm deploy:all   # deploy:api then deploy:web
```

- `expo export --platform web` deletes and recreates `apps/mobile/dist/`, so Caddy must be force-recreated each time.
- The API runs from a built Docker image with no source volume mount; source changes require `pnpm deploy:api`.
- Prebuilt image: `ghcr.io/juslembu/memberr-api:latest` (linux/amd64). Pull then recreate the API container to update.
- For self-hosting, edit `infra/Caddyfile` to your domain and set secrets in `.env`.

## Native builds

```bash
pnpm --filter @memberr/mobile android   # needs Android Studio + ANDROID_HOME + JAVA_HOME
pnpm --filter @memberr/mobile ios         # macOS + Xcode only
```

- Native Android directories are generated by Expo and are not committed; `rm -rf apps/mobile/android` is safe.
- `.npmrc` sets `node-linker=hoisted` to avoid Gradle/expo native-plugin resolution issues.
- Release APK build happens in GitHub Actions (`.github/workflows/android-release.yml`); it needs repository secrets for keystore + optional `google-services.json`.

## Backups

```bash
./scripts/backup.sh                    # dumps to ./backups, 14-day retention
./scripts/backup.sh /path/to/dir 30    # custom dir + retention
./scripts/restore.sh backups/memberr-YYYYMMDD-HHMMSS.sql.gz
```

## Existing instruction files

- `CLAUDE.md` — more detailed architecture notes (preserved; overlaps with this file).
- `README.md` — user-facing setup, self-hosting guide, and project overview.
