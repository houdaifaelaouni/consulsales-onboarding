# ConsulSales Onboarding Platform

Client onboarding portal at app.consulsales.com. Takes a client from signed contract to a running
LinkedIn system in 30 days. Specs: `docs/ConsulSales-Onboarding-Platform-PDR.pdf` (requirements,
FR-xx / NFR-xx) and `docs/ConsulSales-Onboarding-Dev-Plan.pdf` (sprints S0-S7, prompts, backlog).

## Product
- 6 modules: Welcome & kickoff, Guided intake, Access & assets, Review & approve, Stage payments,
  Live dashboard (v2 only). Plus admin board and notifications.
- Roles: `client_owner`, `delivery_lead` (sees assigned clients only), `admin`. (`client_member` is v2.)
- Core promise: "you never pay ahead of the work". Stage 1 paid at checkout; stage 2/3 invoices are
  created only when the matching deliverable is approved.
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
- **Legacy** (`components/ui`, `ink`/`surface`/`hairline`/`accent` tokens) is temporary. Migrate a screen to Untitled UI, then delete
  what it no longer uses. Remove the legacy block in `src/styles/globals.css` when nothing references it.
- ESLint ignores the vendored Untitled UI folders on purpose.

## Design tokens (legacy Linear-style, being replaced)
- canvas `#010102`; surfaces `#0f1011` / `#141516` / `#18191a`
- hairline `#23252a`, hairline-strong `#34343a`
- ink `#f7f8f8`, ink-muted `#d0d6e0`, ink-subtle `#8a8f98`
- accent/primary `#5e6ad2` (hover `#828fff`), success `#27a644`, danger `#e5484d` (semantic only: admin blocker flags, never decorative)
- Font Inter; radius 6/8/12/16px, pills for badges; 4px spacing base; **no shadows**
- Accent only on primary CTA, focus ring, active state
- Type: display-lg 56/600/-1.8px, headline 28/600/-0.6px, card-title 22/500/-0.4px, body 16/400,
  eyebrow 13/500/+0.4px, mono 13/400

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
