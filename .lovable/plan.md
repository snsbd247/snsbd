# Invoice Templates, Theming & PDF Export

Add a full theming layer + PDF export to the invoice detail page.

## 1. Database — `invoice_templates` table + settings

New migration:

- `invoice_templates` table
  - `template_key` ("classic-red", "modern-minimal", "corporate-blue", "elegant-dark")
  - `name`, `is_default`, `is_active`, `sort_order`
  - `theme` JSONB: `{ primary, accent, textOnPrimary, fontHeading, fontBody, logoStyle: "plain"|"stroke"|"shadow"|"badge", showBackground, backgroundUrl, backgroundOpacity }`
- Extend `company_settings` with:
  - `invoice_template_key TEXT DEFAULT 'classic-red'`
  - `invoice_theme JSONB` (per-project override on top of the template)
  - `invoice_logo_style TEXT`
  - `invoice_background_url TEXT`
- Extend `invoices` (optional per-invoice override): `template_key TEXT`, `theme_override JSONB`
- Seed 4 built-in templates

Grants + RLS: read for `authenticated`, write for admins only.

## 2. Storage — `invoice-assets` bucket

Private bucket with signed URLs (or public with narrow policy) for uploaded logos and background images used in invoices. Reuse `marketing-media` if the user prefers a single bucket — default is a dedicated `invoice-assets` bucket for clarity.

RLS on `storage.objects`:
- authenticated admins can insert/update/delete under `invoice-assets/*`
- authenticated users can read (needed to render invoice)

## 3. Admin UI — Invoice Settings page

New route `src/routes/_authenticated/invoice-settings.tsx`:

- Template picker (grid of 4 thumbnails)
- Color pickers: primary, accent, text-on-primary
- Font pair selector (heading + body: e.g. Inter/Inter, Playfair/Inter, Poppins/Roboto, Bebas/Lato)
- Logo style: plain | white stroke | drop shadow | badge (rounded background)
- Logo upload (writes to `invoice-assets` and updates `company_settings.logo_url`)
- Background upload + opacity slider + toggle
- **Live preview pane** on the right using the same `<InvoicePreview />` component the real invoice page renders, fed by unsaved form state
- Save → updates `company_settings`

## 4. Shared invoice renderer

Refactor invoice markup out of `src/routes/_authenticated/invoices_.$invoiceId.tsx` into `src/components/invoice/invoice-render.tsx`:

- Props: `invoice`, `items`, `company`, `theme` (resolved template + overrides)
- All colors/fonts/logo-style driven by `theme` — no hardcoded red
- Optional background image with opacity
- Used by both the invoice detail page and the settings live preview

Fonts loaded via `<link>` in `__root.tsx` head for the four font pairs.

## 5. High-quality PDF export

Add "Download PDF" button on `invoices_.$invoiceId.tsx`. Use client-side `html2canvas-pro` + `jspdf` (both work with oklch/modern CSS, unlike vanilla html2canvas):

- Render the invoice off-screen at 2x scale (`scale: 2`, `useCORS: true`)
- Wait for fonts (`document.fonts.ready`) and background image `onload` before capture
- Convert to A4 PDF, multi-page if content overflows
- Filename: `{invoice_number}.pdf`

Install: `bun add html2canvas-pro jspdf`

## 6. Wiring

- `src/lib/invoice-theme.ts` — resolve final theme (template defaults ← company override ← invoice override)
- Update `invoices_.$invoiceId.tsx` to consume `<InvoiceRender />` with resolved theme
- Add `/invoice-settings` link under Settings in the admin sidebar

## Technical notes

- Live preview is pure client state — no debounce needed, updates on every field change
- html2canvas-pro chosen over `@react-pdf/renderer` because we already have polished HTML/Tailwind markup; re-implementing it in @react-pdf primitives would drift from the on-screen invoice
- Uploads go through a small server function that validates admin role, then uses signed upload URL from storage
- All new colors/fonts are semantic tokens on the theme object, not global CSS — invoices can be re-themed without touching the app's design system
