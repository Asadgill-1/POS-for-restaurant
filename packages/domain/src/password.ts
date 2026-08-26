/**
 * Password and PIN hashing.
 *
 * Uses Node's built-in scrypt. No dependency, no native binary, nothing for a
 * bundler to fail to copy -- which matters here, because this code has to run
 * inside a Vercel serverless function.
 *
 * ponytail: scrypt from stdlib rather than Argon2id. OWASP lists scrypt
 * (N=2^16, r=8, p=2) as an acceptable alternative where Argon2id is not
 * available, and every Argon2 binding for Node is either a node-gyp build or a
 * prebuilt .node binary -- the exact class of thing that already cost this
 * project a day when Prisma's query engine failed to reach the function bundle.
 * Upgrade path: the stored format is self-describing, so `hash()` can start
 * emitting `argon2id$...` and `verify()` can dispatch on the prefix, with no
 * migration and no forced password reset.
 */
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto';

// `promisify` collapses scrypt to its 3-argument overload and drops the options
// parameter, so the tuning below would not type-check. Wrap it explicitly.
function scrypt(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

/**
 * OWASP-recommended scrypt parameters.
 *
 * Measured cost of this configuration: ~410ms and ~64MB per hash on a
 * developer laptop, similar on a Vercel function. That is the point -- it is
 * what makes an offline guessing attack expensive. It is paid once at login
 * and at PIN unlock, never per request.
 *
 * These four values are the calibration knob. Raise COST as hardware improves;
 * do NOT lower `p` to save time, because (N=2^16, r=8, p=2) is an OWASP
 * equivalent-work configuration and halving `p` drops below that line.
 * Memory is roughly 128 * N * r and is independent of `p`.
 */
const COST = 2 ** 16; // N -- CPU/memory cost
const BLOCK_SIZE = 8; // r
const PARALLELISM = 2; // p
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

// Node's scrypt defaults to a 32 MB memory ceiling and throws above it.
// Memory used is roughly 128 * N * r; the factor of 2 is headroom.
const MAX_MEMORY = 128 * COST * BLOCK_SIZE * 2;

const ALGORITHM = 'scrypt';

export class PasswordError extends Error {
  override readonly name = 'PasswordError';
}

/**
 * Hash a password or PIN.
 *
 * Returns `scrypt$N$r$p$salt$hash`, base64url-encoded. Self-describing on
 * purpose: parameters can be raised, or the algorithm swapped, while old hashes
 * keep verifying.
 */
export async function hashPassword(plain: string): Promise<string> {
  if (typeof plain !== 'string' || plain.length === 0) {
    throw new PasswordError('cannot hash an empty value');
  }

  const salt = randomBytes(SALT_LENGTH);
  const derived = await scrypt(plain.normalize('NFKC'), salt, KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELISM,
    maxmem: MAX_MEMORY,
  });

  return [
    ALGORITHM,
    COST,
    BLOCK_SIZE,
    PARALLELISM,
    salt.toString('base64url'),
    derived.toString('base64url'),
  ].join('$');
}

/**
 * Verify a password or PIN against a stored hash.
 *
 * Returns false rather than throwing for any malformed or unrecognised stored
 * value: a corrupt row in the users table must read as "wrong password", never
 * as a 500 that tells an attacker the account exists.
 */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (typeof plain !== 'string' || typeof stored !== 'string') return false;

  const parts = stored.split('$');
  if (parts.length !== 6) return false;

  const [algorithm, costText, blockText, parallelText, saltText, hashText] = parts as [
    string, string, string, string, string, string,
  ];
  if (algorithm !== ALGORITHM) return false;

  const cost = Number(costText);
  const blockSize = Number(blockText);
  const parallelism = Number(parallelText);
  if (!Number.isInteger(cost) || !Number.isInteger(blockSize) || !Number.isInteger(parallelism)) {
    return false;
  }
  // Refuse absurd stored parameters rather than let a poisoned row allocate
  // gigabytes inside a serverless function.
  if (cost < 2 ** 12 || cost > 2 ** 20 || blockSize < 1 || blockSize > 32) return false;
  if (parallelism < 1 || parallelism > 16) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltText, 'base64url');
    expected = Buffer.from(hashText, 'base64url');
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  let derived: Buffer;
  try {
    derived = await scrypt(plain.normalize('NFKC'), salt, expected.length, {
      N: cost,
      r: blockSize,
      p: parallelism,
      maxmem: 128 * cost * blockSize * 2,
    });
  } catch {
    return false;
  }

  // Lengths already match by construction, but timingSafeEqual throws if they
  // ever do not, and a throw here would leak through as a 500.
  if (derived.length !== expected.length) return false;

  return timingSafeEqual(derived, expected);
}

/**
 * True when a stored hash was produced with weaker parameters than current
 * policy, so it can be transparently re-hashed on the user's next successful
 * sign-in.
 */
export function needsRehash(stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 6) return true;

  const [algorithm, costText, blockText, parallelText] = parts as [string, string, string, string];

  return (
    algorithm !== ALGORITHM ||
    Number(costText) < COST ||
    Number(blockText) < BLOCK_SIZE ||
    Number(parallelText) < PARALLELISM
  );
}
