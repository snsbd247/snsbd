# WHMCS Alternative — Roadmap

লক্ষ্য: এই সফটওয়্যারকে একটি পূর্ণাঙ্গ WHMCS বিকল্প বানানো — ক্লায়েন্ট, বিলিং, প্রোভিশনিং, সাপোর্ট, ডোমেইন, অটোমেশন সব একসাথে।

বর্তমান অবস্থা: Admin panel এ Projects, Customers, Orders, Invoices, Hosting Packages, Domain Pricing, Service Catalog, WHM Servers, Team, Expenses আছে। WHM package selection যুক্ত হয়েছে।

---

## Phase 1 — Client-Facing Portal (সবচেয়ে জরুরি)
WHMCS এর মূল হচ্ছে client portal। এখন শুধু admin panel আছে।

1. **Client Signup/Login** — আলাদা `/client` area, self-registration
2. **Client Dashboard** — নিজের services, domains, invoices, tickets একনজরে
3. **Order/Cart System** — পাবলিক pricing pages থেকে hosting/domain কেনা
   - Hosting package browse → configure → domain check → checkout
   - Domain search + register/transfer
4. **Client Profile** — contact info, password, 2FA

## Phase 2 — Billing & Payments
1. **Automated Invoice Generation** — recurring service এর জন্য (monthly/yearly/etc) cron দিয়ে auto invoice
2. **Payment Gateway Integration** — Stripe/bKash/Nagad/SSLCommerz (Bangladesh)
3. **Online Payment on Invoices** — client নিজে pay করতে পারবে, auto-mark paid
4. **Credit Balance** — client account credit, refund handling
5. **Late Fees & Suspension Automation** — overdue হলে auto suspend WHM account
6. **Proforma/Tax Invoice, VAT** — BD context

## Phase 3 — Provisioning Automation
1. **Auto WHM Account Creation** — order paid → auto create cPanel account, send email
2. **Suspend/Unsuspend/Terminate** — invoice status অনুযায়ী auto
3. **Password Reset, Package Upgrade/Downgrade** — client portal থেকে
4. **Server Load Balancing** — একাধিক WHM server, capacity অনুযায়ী distribute

## Phase 4 — Domain Management
1. **Domain Registrar Integration** — ResellerClub / Namecheap / Enom API
2. **Auto Register/Renew/Transfer** — order থেকে
3. **DNS Management** — client portal থেকে
4. **Domain Expiry Reminders**

## Phase 5 — Support System
1. **Ticket System** — client submit, admin/staff reply, department, priority, status
2. **Email Piping** — reply-by-email
3. **Knowledgebase / Announcements**
4. **Live chat (optional later)**

## Phase 6 — Automation & Notifications
1. **Cron Jobs** — invoice generation, reminders, suspensions, domain sync
2. **Email Templates** — welcome, invoice, payment received, suspension, renewal reminder (customizable)
3. **SMS Notifications** — BD context (bulk SMS gateway)

## Phase 7 — Admin Enhancements
1. **Reports & Analytics** — revenue, MRR, churn, overdue, server usage
2. **Staff Roles & Permissions** — granular (billing, support, admin)
3. **Activity Log / Audit Trail**
4. **Product Addons & Upgrades**
5. **Promo Codes / Coupons**
6. **Affiliate System**

## Phase 8 — Reseller & Advanced
1. **Reseller Accounts** — sub-clients, custom pricing
2. **API for third-party integration**
3. **Multi-currency & Multi-language** (BN/EN toggle)
4. **White-label branding**

---

## প্রস্তাবিত ধাপ (শুরু করার ক্রম)

আমি সুপারিশ করছি এই ক্রমে:
1. **Phase 1** (Client Portal + Cart) — এটা ছাড়া WHMCS alternative অসম্ভব
2. **Phase 2** (Billing automation + Payment gateway — bKash/Stripe)
3. **Phase 3** (WHM full automation)
4. **Phase 5** (Ticket) সমান্তরালভাবে
5. **Phase 4** (Domain registrar)
6. বাকিগুলো ধাপে ধাপে

---

## এখনই আপনার সিদ্ধান্ত দরকার

1. **Phase 1 দিয়ে শুরু করব?** নাকি অন্য কোনো phase আগে?
2. **Payment gateway** — কোনটা আগে? (Stripe / bKash / Nagad / SSLCommerz)
3. **Domain registrar** — কোনটা ব্যবহার করবেন? (ResellerClub / Namecheap / অন্য)
4. **Client portal** কি একই ডোমেইনে (`/client`) নাকি আলাদা subdomain?
5. **BN/EN** — client portal Bangla-first নাকি English-first?

আপনি approve করলে Phase 1 থেকে detailed implementation plan দিব এবং কাজ শুরু করব।
