---
name: Operon DB Migration Conventions
description: Migration framework, DB engine, naming patterns, and known quirks for the Operon project
type: project
---

The Operon project uses **Prisma** (v7.8.0) with **PostgreSQL** (local socket at /tmp) and database name `operon`.

Connection string: `postgresql://yaroslavfairfieldd@localhost/operon?host=/tmp`

**Migration framework:** Prisma Migrate — raw SQL files under `prisma/migrations/<timestamp>_<name>/migration.sql`. No `prisma migrate dev` or `prisma migrate deploy` is used directly; migrations are applied with `psql -f` and then registered manually in `_prisma_migrations`.

**Naming conventions:**
- Migration directories: `YYYYMMDDHHMMSS_snake_case_description`
- Table names: PascalCase (e.g., `"Notification"`, `"DigestLog"`, `"User"`)
- Column names: camelCase (e.g., `"userId"`, `"createdAt"`, `"sentAt"`)
- Index names: `TableName_col1_col2_idx` for regular indexes, `TableName_col_key` for unique indexes
- FK constraint names: `TableName_columnName_fkey`
- PK constraint names: `TableName_pkey`

**SQL style (matching existing migrations):**
- `TIMESTAMP(3)` for datetime columns
- `JSONB` for JSON columns
- `TEXT` for all string columns (not VARCHAR)
- FK actions: `ON DELETE CASCADE ON UPDATE CASCADE`
- Comment headers: `-- CreateEnum`, `-- CreateTable`, `-- CreateIndex`, `-- AddForeignKey`
- `IF NOT EXISTS` used in some later migrations (add_stores style) but not in init-style migrations

**Manual migration registration:**
When applying migrations manually, compute the SHA-256 checksum with `sha256sum` (shell) and insert into `_prisma_migrations` with columns: id (gen_random_uuid()), checksum, finished_at, migration_name, logs (NULL), rolled_back_at (NULL), started_at, applied_steps_count (1).
Do NOT use `pg_read_binary_file` for the checksum — it fails with "Interrupted system call" in this environment.

**Known enum situation:**
- `NotificationType` enum ('digest', 'alert', 'info') was defined in schema.prisma from early on but was never in any migration until `20260507000000_add_notifications`. It was absent from the DB until that migration.

**Client regeneration:**
`npx prisma generate` exits 0 silently in this project (no stdout). That is normal — the client is generated successfully.

**Applied migrations as of 2026-05-07:**
1. 20260427062642_init
2. 20260427130827_add_subscription_fields
3. 20260504090000_add_read_only_integrations
4. 20260505000000_add_seo_analysis
5. 20260505074500_add_onboarding_fields
6. 20260506000000_add_stores
7. 20260507000000_add_notifications
