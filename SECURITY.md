# Security

Report vulnerabilities privately to the repository owner. Use GitHub private vulnerability reporting when it is enabled; otherwise arrange a private channel through the maintainer's GitHub profile before sharing sensitive details. Do not open a public issue containing an exploit, credentials or patient information.

Include the affected revision, reproduction steps, impact and any suggested mitigation. Use synthetic records in examples. Response and resolution timing depend on the issue; no fixed service commitment is implied by this repository.

## Deployment practices

- Keep real environment files and provider credentials outside version control.
- Generate distinct application, encryption and scheduler secrets.
- Use HTTPS for remote access and restrict database exposure.
- Use separate staff accounts and appropriate permissions.
- Configure and verify backups for the database and uploaded files.
- Keep demo credentials and synthetic seeds out of a live clinic environment.
- Review dependencies and validate the clinic's actual workflow before activation.
