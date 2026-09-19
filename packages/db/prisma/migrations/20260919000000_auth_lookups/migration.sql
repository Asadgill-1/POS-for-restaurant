-- Pre-tenant lookups for authentication.
--
-- Login and session resolution happen BEFORE any tenant is known, but every
-- identity table is under row level security and the application role sees
-- nothing without app.organization_id. These two functions are the only
-- sanctioned way across that boundary. Each lifts RLS for exactly one query
-- shape, returns only the columns authentication needs, and then restores the
-- caller's setting -- so a bug in login code can at worst read what these
-- functions return, never an arbitrary cross-tenant query.
--
-- Why save-and-restore in plpgsql rather than the tidier
-- `CREATE FUNCTION ... SET app.super_admin = 'on'`: Postgres refuses a
-- function-level SET of a custom parameter unless the creating role is a
-- superuser. That passes locally, where the owner is a superuser, and fails on
-- Neon, where it is not.
--
-- The setting is transaction-local (set_config(..., true)), so even an
-- exception between the two set_config calls cannot carry it past the
-- enclosing transaction.
--
-- Enums are returned as text: Prisma's raw-query deserialiser does not map
-- Postgres enum types.

CREATE OR REPLACE FUNCTION auth_login_lookup(p_email text)
RETURNS TABLE (
  user_id             uuid,
  organization_id     uuid,
  password_hash       text,
  user_status         text,
  is_super_admin      boolean,
  organization_status text
)
LANGUAGE plpgsql
AS $$
DECLARE
  prev text := current_setting('app.super_admin', true);
BEGIN
  PERFORM set_config('app.super_admin', 'on', true);

  RETURN QUERY
    SELECT u.id, u."organizationId", u."passwordHash", u.status::text,
           u."isSuperAdmin", o.status::text
    FROM users u
    LEFT JOIN organizations o ON o.id = u."organizationId"
    WHERE u.email = p_email
      AND u."deletedAt" IS NULL;

  PERFORM set_config('app.super_admin', coalesce(prev, ''), true);
END
$$;

CREATE OR REPLACE FUNCTION auth_session_lookup(p_token_hash text)
RETURNS TABLE (
  session_id          uuid,
  user_id             uuid,
  organization_id     uuid,
  expires_at          timestamptz,
  revoked_at          timestamptz,
  user_status         text,
  is_super_admin      boolean,
  user_name           text,
  user_email          text,
  organization_status text
)
LANGUAGE plpgsql
AS $$
DECLARE
  prev text := current_setting('app.super_admin', true);
BEGIN
  PERFORM set_config('app.super_admin', 'on', true);

  RETURN QUERY
    SELECT s.id, u.id, u."organizationId", s."expiresAt", s."revokedAt",
           u.status::text, u."isSuperAdmin", u.name, u.email, o.status::text
    FROM sessions s
    JOIN users u ON u.id = s."userId"
    LEFT JOIN organizations o ON o.id = u."organizationId"
    WHERE s."tokenHash" = p_token_hash
      AND u."deletedAt" IS NULL;

  PERFORM set_config('app.super_admin', coalesce(prev, ''), true);
END
$$;
