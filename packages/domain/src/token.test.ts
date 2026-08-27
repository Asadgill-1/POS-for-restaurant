import { describe, expect, it } from 'vitest';
import { generateToken, hashIp, hashToken, tokenHashEquals } from './token.ts';

describe('generateToken', () => {
  it('is URL-safe and unpadded, so it survives a cookie or header intact', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(generateToken()).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 bytes base64url
    }
  });

  it('never repeats across many draws', () => {
    const seen = new Set(Array.from({ length: 5_000 }, () => generateToken()));
    expect(seen.size).toBe(5_000);
  });
});

describe('hashToken', () => {
  it('is deterministic, so it can be a database lookup key', () => {
    const token = generateToken();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it('differs for different tokens', () => {
    expect(hashToken('a')).not.toBe(hashToken('b'));
  });

  it('does not contain the token, so a leaked row is not replayable', () => {
    const token = generateToken();
    const hash = hashToken(token);
    expect(hash).not.toContain(token);
    expect(hash).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('avalanches on a one-character change', () => {
    const a = hashToken('session-token-0');
    const b = hashToken('session-token-1');
    const shared = [...a].filter((ch, i) => ch === b[i]).length;
    expect(shared).toBeLessThan(a.length / 2);
  });
});

describe('tokenHashEquals', () => {
  it('matches identical hashes and rejects everything else', () => {
    const hash = hashToken('x');
    expect(tokenHashEquals(hash, hash)).toBe(true);
    expect(tokenHashEquals(hash, hashToken('y'))).toBe(false);
    expect(tokenHashEquals(hash, `${hash}extra`)).toBe(false); // length mismatch must not throw
    expect(tokenHashEquals('', '')).toBe(true);
  });

  it('returns false rather than throwing on non-strings', () => {
    expect(tokenHashEquals(undefined as unknown as string, 'x')).toBe(false);
    expect(tokenHashEquals('x', null as unknown as string)).toBe(false);
  });
});

describe('hashIp', () => {
  it('is stable for the same address, so rate-limit buckets keep matching', () => {
    expect(hashIp('81.52.7.1', 'secret')).toBe(hashIp('81.52.7.1', 'secret'));
  });

  it('separates different addresses and different secrets', () => {
    expect(hashIp('81.52.7.1', 'secret')).not.toBe(hashIp('81.52.7.2', 'secret'));
    expect(hashIp('81.52.7.1', 'secret')).not.toBe(hashIp('81.52.7.1', 'other'));
  });

  it('does not embed the address', () => {
    expect(hashIp('81.52.7.1', 'secret')).not.toContain('81.52');
  });

  it('handles IPv6 and refuses to run without a secret', () => {
    expect(hashIp('2001:db8::1', 'secret')).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(() => hashIp('1.2.3.4', '')).toThrow();
  });
});
