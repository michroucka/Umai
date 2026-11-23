# Umai roadmap

Agreed order: CI -> tests -> device pairing (auth) -> UI redesign -> E2E tests.

## How we work

- Mentor mode (`/mentor`, see `CLAUDE.md`): the user writes feature code. Claude writes CI, tests and a skeleton of the code under test (signatures, `throw new Error("Not implemented")`, no logic), then reviews.
- Help escalates per concrete thing: 1st ask = point the way, 2nd = more detailed guidance, 3rd+ = offer to show only the stuck part. Code without asking only on an explicit "napiš mi to".
- Tests verified against a reference implementation kept outside the repo (scratchpad), never written into the project.
- Commit after each green step on the feature branch; one PR per feature from current `main`.

## 1. CI and deploy

- [x] `ci.yml`: format, lint, typecheck, test, build on PRs (required check name: "Lint, typecheck, test, build")
- [x] `deploy.yml`: every push to `main` runs CI, then deploys to the NAS
- [x] Dependabot, Prettier

## 2. Unit tests

- [x] Vitest, tests for `lib/utils.ts` and the recipe import (`lib/import/recipe-source.ts`)

## 3. Device pairing (branch `device-pairing`)

Remote access for the family without accounts: each browser is paired once with a one-time code and keeps a 400-day sliding cookie.

- [x] Tables `devices`, `pairing_codes` + migration `0003`
- [x] `lib/auth/devices.ts`: create/redeem codes (SHA-256 hashes, 15 min, single use), find/list/revoke devices
- [x] `lib/auth/session.ts`: cookie (`httpOnly`, `secure`, `lax`, 400 days), `getCurrentDevice`, `requireDevice`, `requireAdmin`
- [x] `lib/actions/pair-device.ts` + `lib/auth/pairing-limit.ts` (global lockout: 10 failed codes / 15 min)
- [x] `/pair` page + `components/pair-form.tsx` (device name prefilled from User-Agent, OTP input auto-submits, shake on invalid code)
- [x] `scripts/create-pairing-code.mjs` (`docker compose exec umai node scripts/create-pairing-code.mjs --admin`)
- [x] `proxy.ts`: optimistic cookie check, redirect to `/pair?next=...`, 401 for other methods, renews the cookie
- [x] `requireDevice()` at the top of every server action in `lib/actions/*` and in `app/uploads/[filename]/route.ts` (proxy alone is not enough: Next docs say server functions must check auth themselves); uploads route rejects paths outside `public/uploads`, `saveImage` moved to `lib/recipes/` so it is no longer a public action
- [x] Devices page in settings (admin only): list devices, revoke, create a pairing code; an admin must not revoke their own device or the last admin
  - [x] `revokePairedDevice` action + `findDeviceById`
  - [x] `createDevicePairingCode` action
  - [x] `/settings/devices` page
- [x] PR `device-pairing` -> `main` with manual test steps; after deploy create the first admin code on the NAS

Notes:

- Client components must not import modules that reach the database (`lib/auth/devices.ts`, `session.ts`); shared constants live in DB-free modules like `lib/auth/device-name.ts`. Tests run in Node and don't catch this, `npm run build` does.
- The cookie is always `secure`: home access goes through nginx with HTTPS on a custom domain. Dev on `localhost` works; testing on a phone in dev needs `next dev --experimental-https`.

## 4. Dependency security (branch from `main`, before public access)

Claude does this one (package updates count as setup), after device pairing is finished.

GitHub reported 105 open Dependabot alerts on `main` (2026-11-22): 6 critical, 35 high, 55 moderate, 9 low.

- [x] `next` 16.2.9 -> latest 16.4.x (>= 16.4.5): 5 critical RCEs, incl. two in the Image Optimization API (`/_next/image` is outside the proxy matcher, so reachable without pairing) and one in `use cache`
- [x] `zod` 4.4.3 -> >= 4.6.6 (memory exhaustion on oversized collections; used for the AI import output)
- [x] Transitive alerts: mostly dev-only via the `shadcn` CLI (`hono`, `@modelcontextprotocol/sdk`, `express`/`proxy-addr`, `undici`); `npm update`, then check `npm audit` and the remaining alerts one by one
  - `npm audit --omit=dev` is clean. 8 moderate dev-only findings remain, accepted: `drizzle-kit` -> `@esbuild-kit` -> old `esbuild` (dev server CORS; drizzle-kit never starts the esbuild dev server) and `shadcn` -> `ts-morph` -> `minimatch` (ReDoS on untrusted glob patterns; the CLI only sees our own). Both parents are on their latest version and `npm audit fix --force` would downgrade them to ancient majors. Revisit when they release fixes.
- [x] Find out why Dependabot opened no PRs yet (weekly grouped updates, security updates enabled)
  - Every run failed: the merged branch `dependabot` blocked `dependabot/...` refs. Merged branches deleted 2026-11-23, the repo now deletes head branches on merge.

## 5. Production safety (before public access)

Goal: a bad deploy or migration must never lose recipes, and anything CI can catch must not first show up on the NAS. Claude does the CI, deploy and backup parts (setup) and writes the tests; bugs the tests find are fixed by the user.

Backups:

- [x] Nightly off-site backup, like `pedicure-db-backup`: private repo `umai-db-backup` with its own self-hosted runner on the NAS (artifacts of the public Umai repo are downloadable by any GitHub user). Workflow: SQLite `.backup` of `data/umai.db` (a plain `cp` is not consistent with WAL) + tar of `uploads/`, `gpg --symmetric` AES-256 with a secret passphrase that also lives in the password manager, artifact kept 14 days (30 x 18 MB would exceed the 500 MB artifact limit of GitHub Free). README with restore steps; restore verified once by hand.
  - Done 2026-11-24 in `michroucka/umai-db-backup` (runner `umai-db-backup` on the NAS, 1:15 UTC). Restore verified: the first backup decrypted and opened with all 25 recipes.
- [x] Backup before every deploy in `deploy.yml`: SQLite `.backup` next to the data, keep the last 10. Migrations run on container start, so this is the restore point for a broken migration.

Deploy:

- [ ] `Dockerfile`: `npm ci` instead of `npm install`, so the image has exactly the versions CI tested
- [ ] Rollback: tag the running image before the build; after `up --wait` run a smoke test (`/pair` returns 200); on failure restore the previous image and the pre-deploy DB backup
- [ ] CI builds the Docker image on PRs and starts it with an empty DB (catches a missing `COPY` before the NAS does)

CI:

- [ ] Migration drift: `drizzle-kit generate` in CI must not produce a new file, plus `drizzle-kit check`
- [ ] Weekly scheduled `npm audit --omit=dev --audit-level=high` (not on every PR, so an unrelated advisory doesn't turn a PR red)
- [ ] Coverage report (`vitest --coverage`), no thresholds yet, to see what is untested

Tests:

- [ ] Recipe actions: `create-recipe`, `update-recipe` (editing must not silently drop ingredients or steps), `delete-recipe`, `get-recipe-details`
- [ ] Portion scaling: `components/scalable-text.tsx`, `lib/units.ts`, `lib/recipes/recipe-utils.ts`
- [ ] Smoke E2E with Playwright in CI before the redesign rewrites the UI: pair -> create a recipe -> open it -> change portions -> delete. The full suite stays in section 8.

## 6. Public access

- [ ] Cloudflare Tunnel (`cloudflared` in `docker-compose.yml`), no Cloudflare Access; the app's pairing is the gate
- [ ] Spending limit for the Anthropic API key in the Anthropic Console

## 7. UI redesign

Concept C "Knihovna + kuchyně", mobile only, built for cooking at the stove. Clickable mockup: https://claude.ai/artifact/JKMw61zUFMBETBAKBMjymY

Branding (`~/Repos/graphic-design/recepty/kit`): ink #1E211F, slate #2A302C, rice #F4F1EA, light nori #94BFA2, yuzu #E8B931, nori #2F4A3A; DM Serif Display + DM Sans; dark only; smooth animations and transitions.

Features to add:

- [ ] Link to `/settings/devices` for admins (the navbar lives in the layout and does not know the current device yet)
- [ ] Switch icons from Lucide to Tabler (`@tabler/icons-react`, `iconLibrary` in `components.json`, replace `lucide-react` imports incl. `components/ui`)
- [ ] Tags and filters
- [ ] Favorites and recently cooked
- [ ] "Co dneska?" (what to cook today)
- [ ] Search by ingredient
- [ ] Ingredients shown per step
- [ ] Tap-to-start timers in steps
- [ ] Unit conversion
- [ ] Shopping list
- [ ] Cooking journal (optional)
- [ ] Import from a photo
- [ ] PWA share target (`method: "GET"`), incl. Instagram and TikTok links; continues to the import after pairing via `next`
- [ ] JSON backup

## 8. E2E tests

- [ ] Playwright in CI (pairing flow, recipe CRUD, import)
