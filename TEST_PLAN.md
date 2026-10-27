# DentalERP — Test Plan

> **Status**: Current — **3,612 Vitest tests across 171 files** and **479 Playwright E2E tests across 52 spec files**
> **Last verified**: 2026-10-23 against `main` (all Vitest tests passing, chromium E2E green apart from documented skips)
> **Stack**: Vitest + React Testing Library (unit/component/API), Playwright (browser flows), axe-core (accessibility)

This plan describes what is tested, where the tests live, how to run them, and
what is deliberately not covered. It replaces the long checklist that used to
live here: checklists drift out of date faster than the tests themselves, so the
source of truth is the suite plus the commands below.

---

## 1. How to run the suite

```bash
npx vitest run                      # all unit/component/API tests (~25 s)
npx vitest run tests/api            # API route handlers only
npx vitest run tests/components     # React components only
npx vitest run --coverage           # with V8 coverage

npx playwright test --project=chromium   # E2E against a local dev server
npx playwright test                      # full six-browser matrix (slow)

npm run lint                        # ESLint
npx tsc --noEmit                    # type check
npx prettier --check .              # formatting
```

CI (`.github/workflows/ci.yml`) runs lint, type check, format check, the full
Vitest suite, and a production build. Chromium E2E runs in a separate workflow
because it needs a seeded MySQL database.

### Test database

Vitest mocks Prisma; no database is required. Playwright expects a running app
at `http://localhost:3000` with the seeded demo clinic. The default seed login
is `admin@demo-dental.com` / `Admin@123`.

---

## 2. Test layers

| Layer          | Location                | Tests | Purpose                                                                                                                  |
| -------------- | ----------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------ |
| Unit           | `tests/unit/`           |   745 | Pure business logic: billing maths, GST, tooth numbering, formatting, encryption, i18n, storage, payment gateway signing |
| API routes     | `tests/api/`            | 1,245 | Route handlers with mocked Prisma: auth, validation, tenancy scoping, status codes, side effects                         |
| Components     | `tests/components/`     |   587 | React components with Testing Library: forms, dialogs, navigation, responsive states                                     |
| Comprehensive  | `tests/comprehensive/`  |   242 | Multi-step domain flows (patients, appointments, invoices, inventory, RBAC)                                              |
| Hooks          | `tests/hooks/`          |    60 | Toast, keyboard shortcuts, voice input                                                                                   |
| Integration    | `tests/integration/`    |    17 | Cross-module workflows against an in-memory model                                                                        |
| Regression     | `tests/regression/`     |    49 | Previously reported defects that must not return                                                                         |
| Smoke          | `tests/smoke/`          |    21 | Every major page renders without crashing                                                                                |
| Security       | `tests/security/`       |   130 | Role matrices, injection, secret exposure, HTTPS, token handling                                                         |
| Accessibility  | `tests/accessibility/`  |    62 | axe-core scans and keyboard reachability                                                                                 |
| API validation | `tests/api-validation/` |    89 | Malformed input, edge cases, status-code contracts                                                                       |
| Compatibility  | `tests/compatibility/`  |   146 | Browser feature detection, device widths, offline/network failure                                                        |
| Database       | `tests/database/`       |    90 | CRUD consistency, concurrent writes, migration/backup behaviour                                                          |
| Deployment     | `tests/deployment/`     |    89 | Docker/compose config, env validation, test maintenance rules                                                            |
| Performance    | `tests/performance/`    |    40 | Payload size, query-count and render-cost budgets                                                                        |
| E2E            | `tests/e2e/`            |   479 | Browser journeys across auth, patients, appointments, billing, inventory, staff, lab, CRM, portal, settings              |

Vitest total: **3,612**. Playwright total: **479** (52 spec files).

### Testing categories

The layers above map onto the standard categories a test plan is expected to cover:

- **Functional Testing** — unit, API, component, integration and E2E layers verify that each feature does what its acceptance criteria say, including validation, state transitions and side effects.
- **Security Testing** — `tests/security/` plus the tenancy assertions inside every API test cover role matrices, injection, secret exposure, token handling and cross-hospital data isolation.
- **Performance Testing** — `tests/performance/` enforces payload-size, query-count and render-cost budgets; see the runtime caveat in section 5.
- **Accessibility Testing** — `tests/accessibility/` runs axe-core scans and keyboard-reachability checks against every main page.

---

## 3. Coverage by functional area

### Authentication and access control

- Login, logout, session shape, role hierarchy (`tests/unit/auth.test.ts`, `tests/api/auth-nextauth.test.ts`)
- Middleware redirects and protected API prefixes (`tests/unit/middleware.test.ts`)
- Role-scoped navigation and page guards (`tests/comprehensive/rbac.comprehensive.test.ts`, `tests/e2e/auth-roles.spec.ts`)
- Patient portal OTP flow (`tests/unit/patient-auth.test.ts`, `tests/api/patient-portal-auth.test.ts`, `tests/e2e/portal-login.spec.ts`)
- Signup and invitation acceptance (`tests/e2e/auth-signup.spec.ts`, `tests/api/public-invite-accept.test.ts`)

### Patients

- CRUD, search, pagination, soft delete, hospital scoping (`tests/api/patients.test.ts`, `tests/e2e/patients-crud.spec.ts`)
- Timeline, documents, annotations, insurance documents (`tests/api/patients-timeline.test.ts`, `tests/api/patient-document-annotations.test.ts`)
- Clinical summary and dental chart (`tests/components/clinical-components.test.tsx`, `tests/api/dental-chart-routes.test.ts`, `tests/e2e/dental-chart.spec.ts`)

### Appointments

- Booking, rescheduling, cancellation, status transitions (`tests/api/appointments.test.ts`, `tests/e2e/appointments-crud.spec.ts`)
- Check-in/check-out, queue and waitlist (`tests/api/appointments-checkin-checkout.test.ts`, `tests/e2e/appointments-queue.spec.ts`)
- Today view and stats consumed by the dashboard (`tests/api/appointments-today-waitlist.test.ts`)

### Treatments and prescriptions

- Treatment plans, progress, tooth/surface selection (`tests/unit/treatment-utils.test.ts`, `tests/e2e/treatments-plans.spec.ts`)
- Prescription creation, medication catalogue, print view (`tests/api/medications-prescriptions.test.ts`, `tests/e2e/prescriptions.spec.ts`)

### Billing and payments

- GST and discount maths, rounding, number-to-words (`tests/unit/billing-utils.test.ts`)
- Invoices, line items, refunds, payment plans (`tests/api/billing-extended.test.ts`, `tests/e2e/billing-invoice.spec.ts`)
- Gateway signatures and webhooks (`tests/unit/payment-gateways.test.ts`, `tests/api/webhooks-payment.test.ts`)
- Reports and aging (`tests/api/billing-reports-unbilled.test.ts`, `tests/e2e/reports.spec.ts`)

### Inventory, lab and sterilization

- Stock levels, transactions, suppliers, low-stock alerts (`tests/api/inventory-extended.test.ts`, `tests/e2e/inventory-transactions.spec.ts`)
- Lab orders, statuses, vendors (`tests/api/lab-order-status.test.ts`, `tests/e2e/lab-orders.spec.ts`)
- Instrument cycles and sterilization logs (`tests/api/sterilization-routes.test.ts`, `tests/e2e/sterilization.spec.ts`)

### CRM, communications and insurance

- Memberships, loyalty, referrals (`tests/api/crm-loyalty-routes.test.ts`, `tests/e2e/crm-loyalty.spec.ts`)
- Email/SMS templates, campaigns, automations, surveys (`tests/api/communications-extended.test.ts`, `tests/e2e/communications-email.spec.ts`)
- Insurance providers, verification, claims and pre-authorization (`tests/api/insurance-routes.test.ts`, `tests/e2e/patients-insurance.spec.ts`)

### Patient portal and public pages

- Portal bills, records, forms and video (`tests/e2e/portal-bills.spec.ts`, `tests/e2e/portal-records.spec.ts`)
- Public booking and payment (`tests/api/public-booking.test.ts`, `tests/e2e/public-booking.spec.ts`)
- Public payment links and slot availability (`tests/api/public-slots-payment.test.ts`)

### Cross-cutting

- Accessibility scans for every main page (`tests/accessibility/accessibility.test.tsx`)
- Responsive layout at mobile/tablet/desktop widths (`tests/components/responsive-design.test.tsx`)
- Data import: upload, mapping, validation, commit (`tests/api/data-import-*.test.ts`, `tests/e2e/data-import.spec.ts`)
- Localization and formatting (`tests/unit/localization.test.ts`, `tests/unit/i18n-format.test.ts`)
- Health/readiness endpoints (`tests/api/health-ready.test.ts`)

---

## 4. Conventions

- **Mock at the boundary.** API tests mock `@/lib/prisma`; component tests mock
  `next/navigation`, `next-auth/react` and any heavy chart library. When a
  component imports a helper from `@/lib/utils`, either use the real module or
  mock _every_ export the component touches — a partial mock that omits an
  export fails at render time with a Vitest "no export defined" error.
- **Scope every query.** A test that creates data must assert another hospital
  cannot read it. This is the most common real-world defect in a multi-tenant
  app and the cheapest to catch here.
- **No snapshot-only assertions** for clinical or billing output. Assert the
  value, the label, and the accessible role.
- **E2E specs own their data.** Create the patient/appointment you need in the
  spec; do not depend on seed rows beyond the admin login.
- **Flaky tests are bugs.** Fix the race or quarantine the spec with a linked
  issue; do not retry until green.

---

## 5. Known gaps

These are honest gaps, not aspirations:

- **Usability testing** is manual and ad hoc. There is no scripted task-completion
  study for front-desk or clinical workflows.
- **Runtime performance** is covered by static budgets (payload size, render
  counts) but not by load testing or p95 latency benchmarks against a production
  database.
- **Full browser matrix** is local-only. CI runs chromium to stay inside the
  runner time limit; Firefox/WebKit/Edge/mobile projects are available via
  `npx playwright test` and the `e2e-full` workflow.
- **Third-party sandboxes** (Razorpay, PhonePe, Paytm, SMS, SMTP) are tested
  against mocks and signature fixtures, not live sandbox accounts.
- **Medical-device integrations** are validated at the API boundary only; no
  hardware-in-the-loop tests exist.
- **Print/PDF output** is asserted by DOM structure and text content, not by
  pixel comparison.
