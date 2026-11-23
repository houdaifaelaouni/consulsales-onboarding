# Code map

Read this first. It says what lives where, so you do not have to search the whole repo. Keep it short and update it in the
same PR when a structure changes. Last checked against main at migration `20261115001000`.

## One feature = one vertical slice
`src/app/<route>/page.tsx` (server: loads data, checks the viewer) -> `src/components/<area>/*.tsx` (screen) ->
`src/lib/<area>/*` (pure logic with tests, and the row mappers) -> a table in `supabase/migrations`.
- `db-*.tsx` or a page under `src/app/app` / `src/app/admin` = the LIVE version (real data, row-level security).
- `sample.ts`, `src/app/demo/*`, `src/app/welcome` = demo with sample data. Never import sample data into a live screen.
- `from-db.ts` / `rows.ts` = turn database rows into screen shapes (pure, tested). `load.ts` = the server query.

## Routes
| Area | Files |
|---|---|
| Public | `page.tsx` (redirect), `login/page.tsx` (password, email link, sign-up, PIN keypad), `health/`, `auth/callback`, `auth/signout` |
| Client `/app` (needs sign-in) | `app/page.tsx` home + tasks, `intake`, `access`, `deliverables` (+ `[id]`), `payments`, `booking` (still a sample), `account` (password + PIN) |
| Admin `/admin` (admin only, layout guard) | `page.tsx` board, `clients/[id]` (detail + delivery panel), `integrations` (+ `actions.ts` saves keys to Vercel) |
| API | `api/webhooks/whop` (payment -> workspace), `api/auth/pin-login` |
| Demo | `demo/*`, `welcome` (sample data, public) |

## Library map (`src/lib`)
- `auth/`: `viewer.ts` (who is signed in + roles), `access.ts` (staff?), `paths.ts`, `pin.ts` (rules), `pin-status.ts` (server), `password.ts`, `secure-prompt.ts`.
- `supabase/`: `client.ts` (browser), `server.ts` (cookies), `admin.ts` (SERVICE ROLE, server only).
- `intake/`, `access/`, `review/`, `payments-ui/`, `admin/`, `booking/`, `welcome/`, `home.ts`: pure logic + mappers + tests per screen.
- `onboarding/`: `provision.ts` (payment -> workspace steps), `supabase-repo.ts` (the database calls), `attach.ts`.
- `payments/`: provider-neutral interface (`types.ts`, `index.ts`), `whop.ts` (the only Whop code).
- `integrations/`: `config.ts` (every key the app needs; `.env.example` is generated from it), `vercel.ts` (saving keys).
- `i18n/`: `index.ts` + `en.json`. Every user-visible string goes through `t()`. Only English exists.
- `payments/agency.ts` + `supabase-agency-repo.ts`: a verified agency-tier payment raises the agency tier (upgrade only, idempotent). `classify.ts` maps WHOP_AGENCY_PLAN_* ids to tiers; checkout for a plan uses `variantId`.
- `agency/tiers.ts`: agency tier limits and prices (mirrors the SQL `agency_room_limit`), with tests.
- `outreach/campaign.ts` (limits, validation, message placeholders, time estimate).
- `outreach/leads.ts` (CSV parsing, LinkedIn url normalising), `outreach/owner.ts` (the signed-in client owner for server actions).
- `outreach/`: `unipile.ts` (hosted LinkedIn login link, the only Unipile call), `connect.ts` (consent + single-use token flow), `status.ts` (webhook parsing), `secret.ts`; webhooks at `api/webhooks/unipile/{connected,status}`.
- `plans.ts` (plans, default tasks; stage prices are still null), `nav.ts`, `home.ts`.

## Database (`supabase/migrations`, applied BY HAND in the Supabase SQL editor)
| File | What it adds |
|---|---|
| 0100 | `app_user`, `workspace`, `membership`, `task`, role helpers, RLS |
| 0200 | payment columns on workspace, `payment_event` |
| 0300 | `intake_answer`, append-only `event_log` |
| 0400 | `access_item` (status only, no secrets) |
| 0500 | `deliverable`, immutable `deliverable_version`, `deliverable_submit`, `deliverable_decide` |
| 0600 | `invoice`: stage 1 paid at checkout; stage 2/3 created by triggers when deliverables are approved |
| 0700 | task status follows access items and approvals |
| 0800 | `user_pin` (hashed, 15-minute lockout), `pin_*` functions, service role only |
| 0900 | users may edit only name and locale; email unique and follows auth |
| 1000 | event_log insert allow-list; approvals lock rows and name the version |
| 20261122000100 | `agency`, `agency_member`, `workspace.agency_id`; tier room limit enforced by a trigger on workspace insert (free = 1 total, paid = N per month) |
Each migration has a test in `supabase/tests/rls_*.sql` (ends with a "passed" select). Run both in the SQL editor; CI does not run them yet.

## Rules the database enforces (do not move these to the UI)
- Clients cannot write `invoice`, approve by direct update, or edit versions. Only the checked functions and triggers do.
- Approving names the version on screen and it must be the newest. No new version during review.
- `event_log` is append-only; members may insert only `intake.saved` with a count.
- `user_pin` is unreadable from the browser; only the service role calls `pin_*`.

## Gotchas learned the hard way
- A server page must NEVER pass an icon component (a function) to a client component. Use `src/components/shell/notice.tsx` with an icon name. This crashed twice.
- Every screen needs empty, loading and error states. Use `Notice` for full-page ones.
- Do not delete `.next` while the dev server runs. Restart it after.
- Node is at `$HOME/.local/node/bin`. Commands: `npm run lint`, `npm run typecheck`, `npm test`. Playwright cannot run on the founder's Mac, so e2e runs only in GitHub Actions.
- Secrets never go in code, logs or chat. Platform keys live in Vercel env vars (saved from /admin/integrations).
- One story per PR, squash-merge, commit and PR text end with the attribution lines.

## Task -> file
- Change a string: `src/lib/i18n/en.json`. Add a screen: copy an existing slice. Add a table: new migration + test + this file.
- Payments gaps: `src/lib/payments/*`, `src/app/api/webhooks/whop/route.ts`, `src/lib/onboarding/*`.
- Roles and guards: `src/app/admin/layout.tsx`, `src/middleware.ts`, `src/lib/auth/*`.
