import { describe, expect, it } from 'vitest';
import { scoreExperience } from '../../../src/domain/scoring/experience.js';
import { DEFAULT_TUNING } from '../../../src/domain/scoring/weights.js';
import { aCandidate, aJob } from '../../factories.js';

const score = (years, min, tuning = DEFAULT_TUNING) =>
  scoreExperience(aCandidate({ yearsOfExperience: years }), aJob({ minYearsExperience: min }), tuning);

describe('scoreExperience', () => {
  it('gives full marks when the candidate meets the minimum exactly', () => {
    expect(score(5, 5).ratio).toBe(1);
  });

  it('gives full marks -- and no bonus -- when the candidate exceeds the minimum', () => {
    expect(score(6, 5).ratio).toBe(1);
    expect(score(20, 5).ratio).toBe(1);
  });

  it('penalises rather than excludes a candidate below the minimum', () => {
    const result = score(4, 5);

    expect(result.ratio).toBeCloseTo(0.75, 10);
    expect(result.ratio).toBeGreaterThan(0);
    expect(result.detail.shortfallYears).toBe(1);
  });

  it('scales the penalty with the size of the shortfall', () => {
    expect(score(3, 5).ratio).toBeCloseTo(0.5, 10);
    expect(score(2, 5).ratio).toBeCloseTo(0.25, 10);
  });

  it('floors at zero for a very large shortfall instead of going negative', () => {
    expect(score(0, 10).ratio).toBe(0);
  });

  it('gives full marks when the job states no minimum', () => {
    expect(score(0, 0).ratio).toBe(1);
  });

  it('honours a configured penalty rate', () => {
    const lenient = score(3, 5, { ...DEFAULT_TUNING, experiencePenaltyPerYear: 0.1 });

    expect(lenient.ratio).toBeCloseTo(0.8, 10);
  });
});
