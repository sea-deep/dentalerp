# DentalERP

A dental practice workspace that connects reception, clinical records, treatment planning and accounts around one patient record.

The suite is under active development. It supports a local demo and configurable clinic workflows; production services need their own credentials and operational setup.

## What it covers

| Area             | Capabilities                                                                                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reception        | Patient registration and search, appointments, availability checks, walk-ins, front-desk queue, waitlist and booking approval inbox.                             |
| Clinical records | Medical history and allergies, tooth/surface charting, permanent/primary/mixed dentition, findings, treatment plans, prescriptions, vitals and assigned dentist. |
| Diagnostics      | Pathology and radiograph orders, results, patient documents and dental lab orders.                                                                               |
| Billing          | Itemized invoices, partial payments, outstanding balances, expenses, financial reports, PDF downloads and configured UPI QR.                                     |
| Operations       | Inventory and suppliers, stock movements, sterilization records, staff attendance and leave.                                                                     |
| Patient services | Patient portal, verified booking requests, public clinic information, consented galleries and moderated reviews.                                                 |
| Administration   | Staff roles, per-user restrictions, optional new-device verification, audit logs, exports and clinic settings.                                                   |
| Messaging        | Consent-aware WhatsApp templates, reminder worker, document messages, delivery-attempt logs and manual retry.                                                    |

## Run locally

Requirements: Node.js 20.9 or newer, npm and MySQL 8.x.

```sh
git clone https://github.com/sea-deep/dentalerp.git
cd dentalerp
npm ci
cp .env.example .env
```

Edit `.env` with your database URL and application secrets. Generate separate values for `NEXTAUTH_SECRET`, `ENCRYPTION_KEY` and `CRON_SECRET`:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

For a new development database:

```sh
npm run db:generate
npm run db:push
npm run dev
```

Open [localhost:3000](http://localhost:3000). Create a clinic through the signup screen.

### Optional demo data

These commands create synthetic records for development and demonstrations:

```sh
npm run db:seed
npm run seed:demo
```

The seeded administrator is `admin@demo-dental.com` with password `Admin@123`. Use this account only in an isolated demo environment.

## Production deployment

The included Docker Compose stack builds this source, starts MySQL, applies versioned schema changes and runs the standalone Next.js server with persistent storage.

```sh
cp .env.production.example .env
# Configure the values before starting the stack.
docker compose up -d --build
```

See [SELF_HOSTING.md](SELF_HOSTING.md) for configuration, health checks, backups and updates.

## Integration setup

- **WhatsApp:** enter the clinic's Meta phone number ID, access token, supported Graph API version, template language and approved template names under Settings → WhatsApp. Patient consent is required for automated messages.
- **Scheduled work:** call `GET /api/cron/reminders` with `Authorization: Bearer <CRON_SECRET>` every 5–15 minutes to dispatch the outbox, schedule reminders and update no-shows. A `SENT` message status means provider acceptance, not confirmed handset delivery.
- **Email:** configure SMTP before enabling staff new-device verification or sending email.
- **Payments and calendar:** configure provider credentials in the relevant settings before using those integrations.
- **Storage:** local uploads are the default. An S3-compatible driver is available; see [storage configuration](docs/STORAGE.md).

Scanner import, interactive viewing of exported dental meshes and direct scanner/vendor synchronisation are not implemented. The dental chart is a clinical chart, not a scan viewer. Organisation-wide branch switching and offline operation are also outside the current implementation.

## Development checks

```sh
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

Browser tests are in `tests/e2e`. They require a disposable MySQL database and application secrets. To run the focused clinic workflow against an existing local server:

```sh
PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test tests/e2e/feature-parity.spec.ts --project=chromium --workers=1
```

Provider delivery is substituted in that test; authentication, persistence and application endpoints are exercised. It creates and removes a synthetic clinic fixture.

## Repository layout

```text
app/          Application screens, patient portal and API routes
components/   Shared controls and clinic workflow components
lib/          Authentication, permissions, validation, storage and services
prisma/       Database schema, versioned changes and optional seeds
public/       Static assets and bundled font licences
scripts/      Maintenance and validation utilities
tests/        Unit, component, API and browser checks
```

Local assistant configuration, design research, meeting material, patient uploads, build output and environment secrets are excluded from version control. The independent clinic website is maintained separately.

## Project notes

- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [Storage](docs/STORAGE.md)
- [Localisation](docs/LOCALIZATION.md)
- [Licence](LICENSE)
