/**
 * Opaque token generation and hashing, for sessions, device enrolment and
 * password resets.
 *
 * These are NOT passwords, and deliberately do not use the scrypt in
 * password.ts. A password is low-entropy and human-chosen, so it needs a slow
 * memory-hard KDF to survive an offline guessing attack. A token here is 256
 * bits from a CSPRNG -- there is nothing to guess, so a slow hash would buy no
 * security and would put ~100ms on the critical path of every authenticated
 * request. SHA-256 is the right tool for exactly this reason.
 *
 * What matters is that only the HASH is ever stored. A leaked database yields
 * no usable session, device token, or reset link.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** 256 bits. Long enough that guessing is not a threat model. */
const TOKEN_BYTES = 32;

/** Cryptographically random, URL-safe, no padding. Safe in a cookie or header. */
export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/** Deterministic lookup key for a token. Store this; never the token itself. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('base64url');
}

/**
 * Compare two token hashes without leaking their difference through timing.
 *
 * Database lookups by hash are the normal path; this is for the cases where a
 * candidate is compared in application code.
 */
export function tokenHashEquals(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;

  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;

  return timingSafeEqual(left, right);
}

/**
 * Pseudonymise an IP address for rate limiting and audit records.
 *
 * Rate limiting needs to recognise a repeat source; it does not need to know
 * where anyone is. Hashing with a server-side secret keeps the audit trail
 * useful while stopping the logs from becoming a location history (spec §49).
 *
 * The secret must be stable, or yesterday's rate-limit buckets stop matching
 * today's.
 */
export function hashIp(ip: string, secret: string): string {
  if (!secret) throw new Error('hashIp requires a server secret');
  return createHash('sha256').update(`${secret}:${ip}`, 'utf8').digest('base64url').slice(0, 32);
}
