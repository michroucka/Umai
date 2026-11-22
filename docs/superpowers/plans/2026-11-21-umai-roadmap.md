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
- [ ] Devices page in settings (admin only): list devices, revoke, create a pairing code; an admin must not revoke their own device or the last admin
- [ ] PR `device-pairing` -> `main` with manual test steps; after deploy create the first admin code on the NAS

Notes:

- Client components must not import modules that reach the database (`lib/auth/devices.ts`, `session.ts`); shared constants live in DB-free modules like `lib/auth/device-name.ts`. Tests run in Node and don't catch this, `npm run build` does.
- The cookie is always `secure`: home access goes through nginx with HTTPS on a custom domain. Dev on `localhost` works; testing on a phone in dev needs `next dev --experimental-https`.

## 4. Public access

- [ ] Cloudflare Tunnel (`cloudflared` in `docker-compose.yml`), no Cloudflare Access; the app's pairing is the gate
- [ ] Spending limit for the Anthropic API key in the Anthropic Console

## 5. UI redesign

Concept C "Knihovna + kuchyně", mobile only, built for cooking at the stove. Clickable mockup: https://claude.ai/artifact/JKMw61zUFMBETBAKBMjymY

Branding (`~/Repos/graphic-design/recepty/kit`): ink #1E211F, slate #2A302C, rice #F4F1EA, light nori #94BFA2, yuzu #E8B931, nori #2F4A3A; DM Serif Display + DM Sans; dark only; smooth animations and transitions.

Features to add:

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

## 6. E2E tests

- [ ] Playwright in CI (pairing flow, recipe CRUD, import)
