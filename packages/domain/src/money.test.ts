import { describe, expect, it } from 'vitest';
import {
  allocate,
  applyBps,
  formatAed,
  MoneyError,
  netFromInclusive,
  parseAedToFils,
  roundHalfUp,
} from './money.ts';

describe('roundHalfUp', () => {
  it('divides exactly when there is no remainder', () => {
    expect(roundHalfUp(1000, 10)).toBe(100);
  });

  it('rounds halves away from zero', () => {
    expect(roundHalfUp(5, 2)).toBe(3); // 2.5 -> 3
    expect(roundHalfUp(7, 2)).toBe(4); // 3.5 -> 4
    expect(roundHalfUp(3, 2)).toBe(2); // 1.5 -> 2
  });

  it('rounds below half down', () => {
    expect(roundHalfUp(1, 3)).toBe(0); // 0.333 -> 0
    expect(roundHalfUp(2, 3)).toBe(1); // 0.667 -> 1
  });

  it('is symmetric for negatives, so a refund is the exact negative of a charge', () => {
    for (const n of [5, 7, 3, 1, 2, 12345]) {
      expect(roundHalfUp(-n, 2)).toBe(-roundHalfUp(n, 2));
      expect(roundHalfUp(n, -2)).toBe(-roundHalfUp(n, 2));
    }
  });

  it('rejects non-integers and division by zero', () => {
    expect(() => roundHalfUp(1.5, 2)).toThrow(MoneyError);
    expect(() => roundHalfUp(3, 1.5)).toThrow(MoneyError);
    expect(() => roundHalfUp(1, 0)).toThrow(MoneyError);
    expect(() => roundHalfUp(Number.MAX_SAFE_INTEGER, 2)).toThrow(MoneyError);
  });
});

describe('applyBps', () => {
  it('computes 5% VAT on AED 100.00', () => {
    expect(applyBps(10_000, 500)).toBe(500); // AED 5.00
  });

  it('computes a 10% service charge on AED 200.00', () => {
    expect(applyBps(20_000, 1000)).toBe(2000); // AED 20.00
  });

  it('rounds a rate that does not divide evenly', () => {
    // 5% of AED 33.33 = 166.65 fils -> 167
    expect(applyBps(3333, 500)).toBe(167);
  });

  it('returns zero for a zero rate', () => {
    expect(applyBps(12_345, 0)).toBe(0);
  });

  it('rejects a negative rate', () => {
    expect(() => applyBps(100, -500)).toThrow(MoneyError);
  });
});

describe('netFromInclusive', () => {
  it('extracts net from a VAT-inclusive price (the AED 105 case)', () => {
    const gross = 10_500;
    const net = netFromInclusive(gross, 500);
    expect(net).toBe(10_000);
    expect(gross - net).toBe(500); // and never gross + 525
  });

  it('never loses a fil: net + tax === gross for every amount in a wide sweep', () => {
    for (let gross = 0; gross <= 20_000; gross += 7) {
      const net = netFromInclusive(gross, 500);
      expect(net + (gross - net)).toBe(gross);
      expect(net).toBeLessThanOrEqual(gross);
    }
  });

  it('is a no-op at a zero rate', () => {
    expect(netFromInclusive(3333, 0)).toBe(3333);
  });

  it('rejects a negative rate', () => {
    expect(() => netFromInclusive(100, -1)).toThrow(MoneyError);
  });
});

describe('allocate', () => {
  it('splits AED 100.00 three ways without losing a fil', () => {
    expect(allocate(10_000, [1, 1, 1])).toEqual([3334, 3333, 3333]);
  });

  it('splits pro-rata by weight', () => {
    expect(allocate(10_000, [3, 1])).toEqual([7500, 2500]);
  });

  it('falls back to an equal split when every weight is zero', () => {
    expect(allocate(300, [0, 0, 0])).toEqual([100, 100, 100]);
  });

  it('handles a single part', () => {
    expect(allocate(7350, [5])).toEqual([7350]);
  });

  it('mirrors exactly for negatives (refund allocation)', () => {
    expect(allocate(-10_000, [1, 1, 1])).toEqual([-3334, -3333, -3333]);
  });

  it('sums to the total for 10k random splits — the invariant', () => {
    let seed = 42;
    const rand = (max: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % max;
    };

    for (let i = 0; i < 10_000; i += 1) {
      const total = rand(5_000_000);
      const parts = 1 + rand(8);
      const weights = Array.from({ length: parts }, () => rand(1000));

      const result = allocate(total, weights);

      expect(result.reduce((a, b) => a + b, 0)).toBe(total);
      expect(result.every((n) => Number.isInteger(n) && n >= 0)).toBe(true);
    }
  });

  it('rejects empty and negative weights', () => {
    expect(() => allocate(100, [])).toThrow(MoneyError);
    expect(() => allocate(100, [1, -1])).toThrow(MoneyError);
    expect(() => allocate(100, [1, Number.NaN])).toThrow(MoneyError);
  });
});

describe('parseAedToFils', () => {
  it('parses without float error — the 73.55 trap', () => {
    // parseFloat('73.55') * 100 === 7354.999999999999
    expect(parseAedToFils('73.55')).toBe(7355);
  });

  it('parses whole, one-decimal, and grouped input', () => {
    expect(parseAedToFils('100')).toBe(10_000);
    expect(parseAedToFils('73.5')).toBe(7350);
    expect(parseAedToFils('1,234.56')).toBe(123_456);
    expect(parseAedToFils('  0.05  ')).toBe(5);
    expect(parseAedToFils('-12.30')).toBe(-1230);
  });

  it('rejects anything that is not a clean AED amount', () => {
    for (const bad of ['', 'abc', '1.234', '1.2.3', '12,', '1,,2', '1,23,456', 'AED 5', '1e3', '- 5']) {
      expect(() => parseAedToFils(bad)).toThrow(MoneyError);
    }
  });

  it('round-trips through formatAed', () => {
    for (const fils of [0, 5, 100, 7350, 7355, 123_456, -1230]) {
      expect(parseAedToFils(formatAed(fils))).toBe(fils);
    }
  });
});

describe('formatAed', () => {
  it('always shows two decimals', () => {
    expect(formatAed(7350)).toBe('73.50');
    expect(formatAed(5)).toBe('0.05');
    expect(formatAed(0)).toBe('0.00');
    expect(formatAed(100)).toBe('1.00');
  });

  it('groups thousands, and can be told not to', () => {
    expect(formatAed(123_456)).toBe('1,234.56');
    expect(formatAed(123_456, { grouping: false })).toBe('1234.56');
  });

  it('formats negatives', () => {
    expect(formatAed(-24_550)).toBe('-245.50');
  });

  it('rejects a non-integer, which would mean a float leaked in', () => {
    expect(() => formatAed(73.5)).toThrow(MoneyError);
  });
});
