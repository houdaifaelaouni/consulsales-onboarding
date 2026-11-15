# ConsulSales Onboarding Platform

Client onboarding portal at app.consulsales.com. Takes a client from signed contract to a running
LinkedIn system in 30 days. Specs: `docs/ConsulSales-Onboarding-Platform-PDR.pdf` (requirements,
FR-xx / NFR-xx) and `docs/ConsulSales-Onboarding-Dev-Plan.pdf` (sprints S0-S7, prompts, backlog).

## Start here
Read `docs/CODEMAP.md` before searching the code. It lists where each feature lives, the database rules, and the gotchas. Update it in the same PR when structure changes.

## Product
- 6 modules: Welcome & kickoff, Guided intake, Access & assets, Review & approve, Stage payments,
  Live dashboard (v2 only). Plus admin board and notifications.
- Roles: `client_owner`, `delivery_lead` (sees assigned clients only), `admin`. (`client_member` is v2.)
- Payment rule (founder decision, Nov 2026): no payment, no work. Stage 1 (€300) is paid before the client can enter
  the workspace; stage 2 is billed and charged when the ICP is approved, stage 3 when the LinkedIn profile is approved;
  the database refuses to send a deliverable until its stage is paid. Admins can set custom stage prices, make a stage
  free (waive) or give a free trial (entry only) from the client page; every change is logged.
- v1 scope rule: if a story is not needed to onboard the 3 pilot clients, it moves to v2.
- Never automate LinkedIn actions; never store LinkedIn passwords.

## Stack
Next.js 15 (App Router), TypeScript strict, Tailwind, Supabase (EU region) with RLS + Auth (magic
links) + Storage + Vault, Resend + React Email, Vercel (+ Cron), Vitest, Playwright, Sentry.

**Payments: Whop, not Stripe** (founder decision, supersedes the PDR/dev plan). Wherever the docs
say Stripe (checkout, invoices, SEPA, Tax, subscriptions, webhooks, FR-20..FR-23), build it on
Whop instead. Keep payment code behind a `src/lib/payments/` interface so the provider stays
swappable. Verify Whop webhook signatures and make handlers idempotent.

## UI library and layout (founder decision, Nov 2026: supersedes the Linear-style kit below)
- **Dashboard layout** (sidebar on large screens, slide-in menu on phones) via `src/components/shell/dashboard-shell.tsx`.
- **Untitled UI React** is the component library. Its components are copied into the repo (we own the source) under
  `src/components/base`, `application`, `foundations`, `shared-assets`, plus `src/utils/cx.ts` and `src/hooks`. Add more with
  `npx untitledui@latest add <name>`; they come from the starter kit.
- **Licence rule (public repo!):** use only the free, open-source (MIT) Untitled UI components. Never add PRO components or
  PRO page templates to this repo. Keep `THIRD_PARTY_LICENSES/untitled-ui-MIT.txt`. Do not ship Untitled UI's own logo.
- **Theme:** dark by default (`dark-mode` class via next-themes). Brand colour is the ConsulSales lavender `#5e6ad2`
  (`--color-brand-*` in `src/styles/theme.css`). In new code use Untitled UI semantic tokens (`bg-primary`, `text-secondary`,
  `border-secondary`, `bg-brand-solid`, ...), not the legacy ones.
- **Legacy kit removed.** The old `components/ui` and the Linear-style tokens are gone; everything uses Untitled UI components and tokens.
- ESLint ignores the vendored Untitled UI folders on purpose.

## Rules
- Every table has `workspace_id` and an RLS policy; RLS tests are part of Definition of Done.
- Never log secrets or personal data. Secrets/tokens live in Supabase Vault only.
- `event_log` is append-only. Approved deliverable versions are immutable.
- All UI strings go through the i18n helper (en, fr, es, de, pt-br, zh). No hard-coded strings.
- Every screen has empty, loading and error states. Mobile-first at 375px. WCAG 2.2 AA.
- Webhooks (Stripe etc.) are signature-verified and idempotent.
- Tests ship with every feature. One story per PR, keep PRs under ~400 lines.
- Definition of done: reviewed, unit + Playwright pass in CI, works at 375px, empty/loading/error
  states, strings in 6 languages, deployed to preview.

## Commands (filled in at S0.1)
- `npm run dev` - dev server
- `npm run lint` / `npm run typecheck`
- `npm test` - Vitest; `npm run e2e` - Playwright
- `supabase db reset` / `supabase migration new <name>` - local DB and migrations
