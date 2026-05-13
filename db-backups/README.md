# KartClawDB backups

Portable PostgreSQL SQL dumps for the KartClaw development database.

These dumps are generated with:

```bash
docker exec KartClawDB pg_dump -U kartclaw -d kartclaw --no-owner --no-privileges > db-backups/kartclawdb-latest.sql
```

Restore into a running `KartClawDB` container:

```bash
cat db-backups/kartclawdb-latest.sql | docker exec -i KartClawDB psql -U kartclaw -d kartclaw
```

Note: this is for dev/bootstrap data. Do not commit real customer data, payment data, tokens, or secrets here.
