-- Least-privilege runtime role. Idempotent; safe to run repeatedly.
--
-- Row level security does nothing for a SUPERUSER or a BYPASSRLS role, and
-- nothing for a table's owner unless FORCE is set. The application therefore
-- connects as this role, which is none of those; migrations run as the owner.
-- Why this exists: docs/DECISIONS.md §4a.
--
-- Run as the table owner, in the application database. The password is the
-- local-development one already committed in docker-compose.yml; production
-- roles are created on Neon with a real secret (docs/DEPLOYMENT.md).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mizan_app') THEN
    CREATE ROLE mizan_app LOGIN PASSWORD 'mizan_local_dev'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO mizan_app;

-- Tables that already exist...
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mizan_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO mizan_app;

-- ...and every table the owner creates in future migrations.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO mizan_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO mizan_app;
