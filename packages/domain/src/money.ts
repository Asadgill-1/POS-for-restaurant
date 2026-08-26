/**
 * Money primitives.
 *
 * THE RULE: money in this system is always an integer count of fils.
 * 1 AED = 100 fils. `AED 73.50` is the number `7350`.
 *
 * There is deliberately no "AED number" type anywhere in the codebase. AED
 * exists only as a formatted string at the UI edge (`formatAed`) and as user
 * input at the admin edge (`parseAedToFils`). Everything in between is fils.
 *
 * `Fils` is a documentation alias, not a branded type — branding makes ordinary
 * arithmetic (`a + b`) require a cast at every call site, which is noise that
 * people route around. The protection here is the naming convention
 * (`amountFils`, `totalFils`) plus the fact that no float ever enters.
 */
export type Fils = number;

/** Basis points. 5% = 500, 10% = 1000. Integer, so rates never carry float error. */
export type Bps = number;

export const FILS_PER_AED = 100;
export const BPS_DIVISOR = 10_000;

/** Above this, `roundHalfUp`'s internal `2 * numerator` could leave safe-integer range. */
const MAX_SAFE_NUMERATOR = Math.floor(Number.MAX_SAFE_INTEGER / 2);

export class MoneyError extends Error {
  override readonly name = 'MoneyError';
}

function assertInt(value: number, label: string): void {
  if (!Number.isInteger(value)) {
    throw new MoneyError(`${label} must be an integer, received ${value}`);
  }
}

/**
 * Integer division, rounding halves away from zero.
 *
 * Half-away-from-zero rather than banker's rounding: it is what a customer
 * verifies against a printed receipt, and it makes a refund the exact negative
 * of the charge (`roundHalfUp(-n, d) === -roundHalfUp(n, d)`), which banker's
 * rounding does not guarantee.
 *
 * This is the ONLY place rounding happens. Every percentage, every VAT
 * extraction, every split routes through here.
 */
export function roundHalfUp(numerator: number, denominator: number): number {
  assertInt(numerator, 'numerator');
  assertInt(denominator, 'denominator');
  if (denominator === 0) throw new MoneyError('division by zero');
  if (Math.abs(numerator) > MAX_SAFE_NUMERATOR) {
    throw new MoneyError(`numerator ${numerator} exceeds safe integer range`);
  }

  const negative = numerator < 0 !== denominator < 0;
  const n = Math.abs(numerator);
  const d = Math.abs(denominator);
  const magnitude = Math.floor((2 * n + d) / (2 * d));

  return negative ? -magnitude : magnitude;
}

/** Apply a basis-point rate. `applyBps(20000, 500)` -> 1000 (5% of AED 200.00). */
export function applyBps(amountFils: Fils, rateBps: Bps): Fils {
  assertInt(amountFils, 'amountFils');
  assertInt(rateBps, 'rateBps');
  if (rateBps < 0) throw new MoneyError(`rateBps must not be negative, received ${rateBps}`);
  return roundHalfUp(amountFils * rateBps, BPS_DIVISOR);
}

/**
 * Extract the net amount from a tax-INCLUSIVE gross amount.
 * `netFromInclusive(10500, 500)` -> 10000. The tax is `gross - net`, never a
 * second rounded division — that is what guarantees net + tax === gross exactly.
 */
export function netFromInclusive(grossFils: Fils, rateBps: Bps): Fils {
  assertInt(grossFils, 'grossFils');
  assertInt(rateBps, 'rateBps');
  if (rateBps < 0) throw new MoneyError(`rateBps must not be negative, received ${rateBps}`);
  return roundHalfUp(grossFils * BPS_DIVISOR, BPS_DIVISOR + rateBps);
}

/**
 * Split `totalFils` across `weights` so the parts sum to EXACTLY `totalFils`.
 *
 * Largest-remainder method: floor every share, then hand the leftover fils out
 * one at a time, largest fractional remainder first, ties broken by index.
 *
 * Used for equal bill splits and for spreading an order-level discount across
 * lines pro-rata. `sum(allocate(t, w)) === t` is an invariant, not an aspiration.
 *
 * All-zero weights fall back to an equal split — an order where every line is
 * free still has to divide a delivery fee somehow.
 */
export function allocate(totalFils: Fils, weights: readonly number[]): Fils[] {
  assertInt(totalFils, 'totalFils');
  if (weights.length === 0) throw new MoneyError('allocate requires at least one weight');
  for (const w of weights) {
    if (!Number.isFinite(w) || w < 0) {
      throw new MoneyError(`weights must be finite and non-negative, received ${w}`);
    }
  }

  const effective = weights.some((w) => w > 0) ? weights : weights.map(() => 1);
  const totalWeight = effective.reduce((a, b) => a + b, 0);

  const negative = totalFils < 0;
  const magnitude = Math.abs(totalFils);

  // `magnitude * w` below must stay exact. Realistic orders are nowhere near
  // this, but a silent precision loss here would be a silent wrong total.
  const maxWeight = Math.max(...effective);
  if (magnitude * maxWeight > Number.MAX_SAFE_INTEGER) {
    throw new MoneyError('allocate inputs exceed safe integer range');
  }

  const shares = effective.map((w) => Math.floor((magnitude * w) / totalWeight));
  const remainders = effective.map(
    (w, i) => (magnitude * w) / totalWeight - (shares[i] as number),
  );

  let leftover = magnitude - shares.reduce((a, b) => a + b, 0);
  const order = remainders
    .map((r, i) => ({ r, i }))
    .sort((a, b) => b.r - a.r || a.i - b.i);

  for (let k = 0; leftover > 0; k = (k + 1) % order.length) {
    shares[(order[k] as { i: number }).i]! += 1;
    leftover -= 1;
  }

  return negative ? shares.map((s) => -s) : shares;
}

/**
 * Parse user-entered AED into fils. String-based on purpose:
 * `parseFloat('73.55') * 100` is `7354.999999999999`.
 */
export function parseAedToFils(input: string): Fils {
  // Validate BEFORE stripping separators. Stripping first would quietly accept
  // malformed input like "12," or "1,,2" — this is a trust boundary, so the
  // grouped form has to be well-formed, not merely comma-flavoured.
  const match = /^(-)?(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d{1,2}))?$/.exec(input.trim());
  if (!match) throw new MoneyError(`"${input}" is not a valid AED amount`);

  const [, sign, whole, fraction = ''] = match;
  const fils =
    Number((whole as string).replace(/,/g, '')) * FILS_PER_AED +
    Number(fraction.padEnd(2, '0'));

  return sign ? -fils : fils;
}

/** Format fils for display. `formatAed(7350)` -> `'73.50'`. Never returns a number. */
export function formatAed(amountFils: Fils, options: { grouping?: boolean } = {}): string {
  assertInt(amountFils, 'amountFils');
  const { grouping = true } = options;

  const negative = amountFils < 0;
  const magnitude = Math.abs(amountFils);
  const whole = Math.floor(magnitude / FILS_PER_AED);
  const fraction = magnitude % FILS_PER_AED;

  const wholeText = grouping ? whole.toLocaleString('en-US') : String(whole);

  return `${negative ? '-' : ''}${wholeText}.${String(fraction).padStart(2, '0')}`;
}
