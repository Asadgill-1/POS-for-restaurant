import { describe, expect, it } from 'vitest';
import { hashPassword, needsRehash, PasswordError, verifyPassword } from './password';

describe('hashPassword', () => {
  it('produces a self-describing, parseable format', async () => {
    const hash = await hashPassword('correct horse battery staple');
    const [algorithm, cost, blockSize, parallelism, salt, digest] = hash.split('$');

    expect(algorithm).toBe('scrypt');
    expect(Number(cost)).toBe(65536);
    expect(Number(blockSize)).toBe(8);
    expect(Number(parallelism)).toBe(2);
    expect(salt).toMatch(/^[A-Za-z0-9_-]+$/); // base64url, no padding
    expect(digest).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('salts, so the same password never yields the same hash', async () => {
    const [a, b] = await Promise.all([hashPassword('same-password'), hashPassword('same-password')]);
    expect(a).not.toBe(b);
    // ...and both still verify
    expect(await verifyPassword('same-password', a)).toBe(true);
    expect(await verifyPassword('same-password', b)).toBe(true);
  });

  it('refuses an empty value', async () => {
    await expect(hashPassword('')).rejects.toThrow(PasswordError);
  });
});

describe('verifyPassword', () => {
  it('accepts the correct password and rejects a wrong one', async () => {
    const hash = await hashPassword('s3cret-p@ssw0rd');

    expect(await verifyPassword('s3cret-p@ssw0rd', hash)).toBe(true);
    expect(await verifyPassword('s3cret-p@ssw0rc', hash)).toBe(false);
    expect(await verifyPassword('', hash)).toBe(false);
    expect(await verifyPassword('S3CRET-P@SSW0RD', hash)).toBe(false);
  });

  it('works for numeric POS PINs', async () => {
    const hash = await hashPassword('4821');
    expect(await verifyPassword('4821', hash)).toBe(true);
    expect(await verifyPassword('4822', hash)).toBe(false);
    expect(await verifyPassword('04821', hash)).toBe(false);
  });

  it('normalises unicode so an accented password verifies across input methods', async () => {
    // U+00E9  vs  'e' + U+0301 -- visually identical, different bytes.
    const composed = 'café-password';
    const decomposed = 'café-password';

    const hash = await hashPassword(composed);
    expect(await verifyPassword(decomposed, hash)).toBe(true);
  });

  it('returns false, never throws, for malformed stored values', async () => {
    const malformed = [
      '',
      'not-a-hash',
      'scrypt$65536$8$2$onlyfiveparts',
      'scrypt$65536$8$2$$',
      'bcrypt$65536$8$2$c2FsdA$aGFzaA',
      'scrypt$abc$8$2$c2FsdA$aGFzaA',
      'scrypt$65536$8$2$c2FsdA$aGFzaA$extra',
    ];

    for (const stored of malformed) {
      await expect(verifyPassword('anything', stored)).resolves.toBe(false);
    }
  });

  it('rejects poisoned parameters instead of allocating unbounded memory', async () => {
    // A tampered row must not be able to make a serverless function allocate GBs.
    expect(await verifyPassword('x', 'scrypt$1099511627776$8$2$c2FsdA$aGFzaA')).toBe(false);
    expect(await verifyPassword('x', 'scrypt$65536$99999$2$c2FsdA$aGFzaA')).toBe(false);
    expect(await verifyPassword('x', 'scrypt$65536$8$9999$c2FsdA$aGFzaA')).toBe(false);
    // ...and below the floor, so an attacker cannot downgrade the cost either.
    expect(await verifyPassword('x', 'scrypt$2$8$2$c2FsdA$aGFzaA')).toBe(false);
  });

  it('rejects non-string input without throwing', async () => {
    expect(await verifyPassword(undefined as unknown as string, 'x')).toBe(false);
    expect(await verifyPassword('x', undefined as unknown as string)).toBe(false);
  });
});

describe('needsRehash', () => {
  it('is false for a hash at current policy', async () => {
    expect(needsRehash(await hashPassword('current'))).toBe(false);
  });

  it('is true for weaker parameters or another algorithm', () => {
    expect(needsRehash('scrypt$16384$8$2$c2FsdA$aGFzaA')).toBe(true);
    expect(needsRehash('scrypt$65536$4$2$c2FsdA$aGFzaA')).toBe(true);
    expect(needsRehash('scrypt$65536$8$1$c2FsdA$aGFzaA')).toBe(true);
    expect(needsRehash('argon2id$v=19$m=65536$c2FsdA$aGFzaA')).toBe(true);
    expect(needsRehash('garbage')).toBe(true);
  });
});
