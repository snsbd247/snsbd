
## Scope (from your answers)

1. **Domain pricing (TLD wise)** — admin UI + dynamic pricing on marketing site
2. **Site-wide logo** from `company_settings.logo_url`, transparent, everywhere
3. **Hosting order** from marketing site (login required first)
4. **Payment** — both manual bKash (submit trxID) and bKash gateway
5. **Admin verify** — activating a hosting order auto-creates cPanel account on WHM + sends email

---

## 1. Domain pricing

**DB:** new table `domain_pricing` (tld, register_price, renew_price, transfer_price, currency BDT, featured bool, sort_order). Admin-managed.

**Admin UI:** new route `/_authenticated/domain-pricing` — table with add/edit/delete TLDs.

**Marketing:** `_marketing.register-domain.tsx` and `_marketing.domain-search.tsx` fetch from a public server fn (`getDomainPricing`) via publishable client + `TO anon` SELECT policy. Replace hardcoded prices.

## 2. Logo everywhere (transparent)

- Add `useCompanySettings()` hook (already have `company-settings.ts`) → returns `logo_url`.
- Replace text logo in: `marketing-header`, `marketing-footer`, `site-footer`, `auth.tsx`, `_authenticated/route.tsx` sidebar, invoice header/footer (already uses logo — keep as-is).
- Render as `<img>` with `bg-transparent`. Fallback to brand name text if no logo.

## 3. Hosting order flow (login-first)

**Marketing:** on `_marketing.web-hosting.tsx` / `bdix-hosting.tsx` / `reseller-hosting.tsx` — each "Order Now" button:
- If not logged in → redirect to `/auth?redirect=/order/hosting/<package_id>`
- If logged in → go to new route `/order/hosting/$packageId`

**New route** `_authenticated/order.hosting.$packageId.tsx`:
- Shows package summary + domain input (existing/register new)
- Billing period select
- Payment method radio: **Manual bKash** or **bKash Online**
- If manual: show bKash number from `company_settings.bkash_number`, textarea for trxID + sender number
- If online: bKash create-payment via existing `bkash.functions.ts`
- Creates `customer_orders` row (status=`pending`, payment_status per method)

## 4. Admin verifies order

**Route** `/_authenticated/orders` already exists — extend it:
- Show pending hosting orders with "Verify & Activate" button
- On click → server fn `activateHostingOrder({ order_id })`:
  1. Verify admin
  2. Create `services` row (type=hosting) with cpanel_username derived from domain, random password
  3. If order specifies a WHM server + package → call existing `cpanelCreateAccount` internally
  4. Update `customer_orders.status = 'active'`
  5. Send activation email (Lovable Emails — needs email domain; if not set up, skip and toast admin)

## 5. Email

Use Lovable Emails (`sendLovableEmail`). If no email domain configured, activation still succeeds; email is best-effort.

---

## Technical details

**Migrations (one file):**
- `create table public.domain_pricing (...)` + GRANT authenticated/anon SELECT + admin-only write policy
- Add columns to `customer_orders` if missing: `package_id uuid`, `billing_cycle text`, `domain_name text`, `payment_method text`, `manual_trx_id text`, `manual_sender text`
- Add `logo_url` check in `company_settings` (already exists)

**New server fns** (`src/lib/orders.functions.ts`):
- `getDomainPricing()` (public, publishable client)
- `createHostingOrder({ package_id, domain, cycle, payment_method, manual_trx_id?, manual_sender? })`
- `activateHostingOrder({ order_id })` — admin, wraps WHM create + email

**Files to add:**
- `src/routes/_authenticated/domain-pricing.tsx`
- `src/routes/_authenticated/order.hosting.$packageId.tsx`
- `src/lib/orders.functions.ts`
- `src/hooks/use-company-logo.tsx`

**Files to edit:**
- `src/routes/auth.tsx` — honor `?redirect=` param
- `src/components/marketing/marketing-header.tsx` + footer + `site-footer.tsx` — logo image
- `src/routes/_authenticated/route.tsx` — sidebar logo
- `src/routes/_marketing.web-hosting.tsx` + siblings — "Order Now" wired to new flow
- `src/routes/_marketing.register-domain.tsx` + `domain-search.tsx` — dynamic prices
- `src/routes/_authenticated/orders.tsx` — verify/activate button
- `src/routes/_marketing.index.tsx` — dynamic domain prices if listed

---

## Out of scope (ask if you need these)

- Automatic actual domain registration at a registrar (only tracking)
- Automatic bKash refund on rejection
- Cron for auto-cancelling unpaid orders

Approve to build in this order: (1) migration → (2) logo/site-wide → (3) domain pricing admin+marketing → (4) order flow → (5) admin activation + WHM + email.
