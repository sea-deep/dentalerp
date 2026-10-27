# Contributing

Use [repository issues](https://github.com/sea-deep/dentalerp/issues) for reproducible bugs and scoped feature proposals. Include the affected workflow, expected result and reproduction steps. Do not include patient records or credentials.

## Development

Follow the local setup in [README.md](README.md). Use a feature branch and keep changes focused on a single workflow.

```sh
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

Pre-commit formats staged source. Pre-push runs the unit/component/API suite and prevents accidental direct pushes to protected branch names.

## Code conventions

- Use TypeScript and the existing shared components.
- Validate API input and enforce authentication and permissions on the server.
- Scope clinic records by `hospitalId`; never trust a client-supplied clinic identifier as proof of access.
- Keep provider credentials out of source, browser responses and logs.
- Add meaningful coverage for changed behaviour and failure cases.
- Keep dependencies and their lockfile consistent.

Tests live under `tests/unit`, `tests/api`, `tests/components` and `tests/e2e`. Unit/API tests mock external services. Browser tests use a disposable database and synthetic fixtures.

Include versioned schema changes under `prisma/migrations` when changing the shared database schema. Use the development schema-push command only for disposable local databases.

## Pull requests

Describe the problem, resulting behaviour and verification. Explain provider or environment setup where relevant. Avoid mixing formatting-only edits with behavioural changes beyond what the changed files require.

Preserve required software and bundled-asset licence notices. Keep local assistant context, planning notes, generated reports and secrets out of commits.
