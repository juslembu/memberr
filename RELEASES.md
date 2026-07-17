# Memberr Releases

This file contains release notes for GitHub Releases. Each release has its own section.

To publish a release, copy the relevant section into the GitHub Release notes, or use the GitHub CLI:

```bash
gh release create v1.0.1 --title "Memberr v1.0.1" --notes-file RELEASES.md
```

> Note: `gh release create --notes-file` uses the **entire file** as the release notes. For per-release notes, either copy the section manually or use a tool like [`release-drafter`](https://github.com/release-drafter/release-drafter) / a GitHub Action that parses this file.

---

## Memberr v1.0.1

### What's new

- **Archive cards instead of deleting them.** Archived cards move to a separate screen and can be restored at any time.
- **Bulk actions on My Cards.** Long-press to select multiple cards, then archive or share them in one go.
- **Optional biometric app lock.** Enable it from Account; the app locks when backgrounded and requires biometric unlock to reopen.
- **Version display.** App version is now shown on the Account screen, and web/Android builds pick up the version from the git tag automatically.

### Improvements

- **Smaller list payloads.** `GET /cards` and `GET /cards/archived` no longer return the base64 `cardImageUrl`; the full image is still fetched on the card detail screen.
- **Database indexes.** Added missing indexes and case-insensitive unique constraints on `users.email`, `users.username`, and several foreign-key columns used by sharing and invites.
- **Predefined shop guard.** Admins can no longer delete a predefined shop while cards are still using it.
- **Cleaner config.** `MIN_APP_VERSION` is now part of the validated API config object. Removed unused `@fastify/multipart`, `@fastify/static`, and the `UPLOAD_DIR` setting from the API.

### Bug fixes

- **Case-insensitive login and sharing.** Logging in with `User@Example.com` now matches `user@example.com`; the same applies to registration, profile updates, and sharing by username/email.
- **Last-admin protection.** Deleting the final admin account is now blocked.
- **Web archive/delete flows.** Replaced native `Alert.alert` prompts with inline confirmation overlays so archive, restore, and permanent delete work reliably on web.
- **Web version fallback.** Fixed the web build showing `Version 1.0.0` when deployed from a tag; the version is now baked in at build time via `apps/mobile/lib/appInfo.ts`.
- **Biometric prompt timing.** On Android, the biometric prompt now waits for the splash screen to hide before auto-prompting.

### For self-hosters

1. Pull the `v1.0.1` tag.
2. Run `pnpm install`.
3. Apply the database migration: `pnpm db:migrate`.
4. Redeploy: `pnpm deploy:api && pnpm deploy:web`.

No manual data migration is needed. The old `uploads` Docker volume has been removed because card images are stored as base64 in the database.

### For developers

- Added automated test suites: Vitest for `packages/shared` and `apps/api`, Jest + React Native Testing Library for `apps/mobile`.
- `pnpm test` and `pnpm type-check` now run across all packages via Turborepo.
- `pnpm db:migrate` now loads the root `.env` file automatically.
