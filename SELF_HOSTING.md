# Self-hosting DentalERP

The default production stack builds the checked-out source. It does not depend on a pre-published application image.

## Configure

Install Docker Engine with the Compose plugin. Clone the repository and copy the production environment template:

```sh
git clone https://github.com/sea-deep/dentalerp.git
cd dentalerp
cp .env.production.example .env
```

Configure the MySQL passwords, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `ENCRYPTION_KEY` and `CRON_SECRET`. `ENCRYPTION_KEY` must be 64 hexadecimal characters. Keep `.env` private.

Use the public HTTPS origin for `NEXTAUTH_URL` when a reverse proxy is configured. The app binds to `127.0.0.1:3000` by default; MySQL has no published production port.

## Start

```sh
docker compose up -d --build
docker compose ps
```

The migration service must complete successfully before the application starts. The application image contains the standalone Next.js server and static assets. Patient uploads and MySQL data use persistent volumes.

Check both process health and database readiness:

```sh
curl --fail http://localhost:3000/api/health
curl --fail http://localhost:3000/api/ready
docker compose logs --tail=100 app migrate
```

Create the clinic through signup. Demo seeding is intended only for isolated development environments.

## HTTPS

Use an existing reverse proxy, or configure the domain variables in `.env` and start the Caddy overlay:

```sh
docker compose -f docker-compose.yml -f docker-compose.caddy.yml up -d --build
```

The domain must resolve to the host and the proxy must be reachable on the required HTTP/HTTPS ports.

## Clinic services

Configure WhatsApp templates and credentials, SMTP, payment providers and calendar connections from the clinic settings as needed. Configure a scheduler to call the reminder worker with its bearer secret. See the [README](README.md#integration-setup) for the supported worker endpoint and message-status meaning.

For local file storage, keep the uploads volume across container replacements. For object storage, configure the S3 driver described in [STORAGE.md](docs/STORAGE.md). Backups must cover both the database and uploaded files.

## Back up and restore

The repository includes `scripts/backup.sh` and `scripts/restore.sh`. Review their environment variables and run them for the configured stack. Store copies outside the application host and test restoration into a separate database before relying on the backup process.

Do not use `docker compose down -v` during a routine update: it removes persistent volumes.

## Update

Back up first, then pull and rebuild:

```sh
git pull --ff-only
docker compose up -d --build
docker compose ps
curl --fail http://localhost:3000/api/ready
```

Inspect the migration and app logs when an update fails. Retain the previous source revision and backups until the updated workflow is verified.

## Container releases

The release workflow builds and publishes architecture-specific images when a version tag is pushed, then assembles a GHCR manifest under this repository's namespace. No published image is required for the default source-build instructions above.
