# Production Readiness Checklist

CatBook is still in development, so this checklist focuses on the foundation that must be stable before any real customer traffic, payment, or personal data is accepted.

## Runtime Configuration

- Validate `CATBOOK_API_PORT`, `CATBOOK_PREVIEW_PORT`, `CATBOOK_DEV_PASSWORD`, `CATBOOK_DB_BACKUP_DIR`, and `CATBOOK_BACKUP_RETENTION` at server startup.
- Replace the default development password before staging or production.
- Keep production secrets outside source control and outside `.env.example`.
- Point database backups to durable storage, not the local app folder.

## Health And Monitoring

- Use `GET /api/v1/health` for uptime, environment, runtime warnings, and database status.
- Alert when health returns a non-2xx response, database checks fail, or response time is abnormal.
- Ship structured JSON logs to centralized log storage.
- Track order creation, payment changes, admin changes, and authentication events.

## Database Backup Strategy

- Run `POST /api/v1/admin/system/backup` before risky data changes and deployments.
- Schedule automated backups outside the Node process before production launch.
- Keep backups encrypted and access-controlled.
- Test restore procedures during UAT, not after an incident.
- Define retention by environment: short retention for development, longer retention for staging and production.

## Security Gates

- Keep CSRF protection enabled for every cookie-based mutation request.
- Keep admin APIs behind the shared role guard.
- Confirm all error responses are sanitized and do not expose stack traces.
- Review audit logs for login, logout, failed login, and admin actions.
- Re-test upload, payment callback, and promotion endpoints when those features are added.

## Deployment Gates

- `npm run lint` passes.
- `npm run build` passes.
- Health endpoint returns `ok: true`.
- Core flows pass in UAT: login, product browse, cart, checkout, order tracking, admin product, stock, order, and payment status management.
- Rollback plan is documented and tested.

## Open Production Work

- Move the JSON database layer to a managed database.
- Add real payment gateway callbacks and signature verification.
- Add rate limiting and request body size limits.
- Add automated backup jobs and restore tooling.
- Add monitoring dashboards and alert routing.
