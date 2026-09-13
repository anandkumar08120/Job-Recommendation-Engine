import { describe, expect, it } from 'vitest';
import { scoreSalary } from '../../../src/domain/scoring/salary.js';
import { DEFAULT_TUNING } from '../../../src/domain/scoring/weights.js';
import { aCandidate, aJob } from '../../factories.js';

const score = (expectedSalary, min, max) =>
  scoreSalary(aCandidate({ expectedSalary }), aJob({ salaryRange: { min, max } }), DEFAULT_TUNING);

describe('scoreSalary', () => {
  it('gives full marks when the whole band clears the expectation', () => {
    expect(score(100, 120, 200).ratio).toBe(1);
    expect(score(120, 120, 200).ratio).toBe(1);
  });

  it('scores zero when the ceiling is far below the expectation', () => {
    const result = score(300, 100, 200);

    expect(result.ratio).toBe(0);
    expect(result.fit).toBe('above-range');
  });

  it('falls off a cliff to near zero the moment the expectation passes the ceiling', () => {
    const atCeiling = score(200, 100, 200).ratio;
    const justOver = score(205, 100, 200).ratio;

    expect(justOver).toBeGreaterThan(0);
    expect(justOver).toBeLessThanOrEqual(DEFAULT_TUNING.salaryOverreachCeiling);
    expect(justOver).toBeLessThan(atCeiling / 2);
  });

  it('drops to exactly zero past the negotiation tolerance', () => {
    expect(score(220, 100, 200).ratio).toBe(0);
  });

  it('decays linearly from full to the floor across the band', () => {
    expect(score(150, 100, 200).ratio).toBeCloseTo(0.75, 10);
    expect(score(200, 100, 200).ratio).toBeCloseTo(DEFAULT_TUNING.salaryInRangeFloor, 10);
  });

  it('ranks a comfortable job above one that only just meets the expectation', () => {
    const comfortable = score(150, 160, 240).ratio;
    const stretched = score(150, 100, 150).ratio;

    expect(comfortable).toBeGreaterThan(stretched);
  });

  it('handles a single-point salary range without dividing by zero', () => {
    const result = score(200, 200, 200);

    expect(Number.isFinite(result.ratio)).toBe(true);
    expect(result.ratio).toBe(1);
  });

  it('gives full marks when the candidate states no expectation', () => {
    expect(score(0, 100, 200).ratio).toBe(1);
  });
});
