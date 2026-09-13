import { describe, expect, it } from 'vitest';
import { DEFAULT_WEIGHTS, resolveWeights } from '../../../src/domain/scoring/weights.js';
import { ValidationError } from '../../../src/lib/errors.js';

const sum = (weights) => Object.values(weights).reduce((total, value) => total + value, 0);

describe('resolveWeights', () => {
  it('returns the documented default budget', () => {
    expect(resolveWeights()).toEqual(DEFAULT_WEIGHTS);
  });

  it('treats weights as relative and rescales them to 100', () => {
    expect(sum(resolveWeights({ skills: 2, experience: 1, location: 1, salary: 1 }))).toBe(100);
    expect(sum(resolveWeights({ skills: 500 }))).toBe(100);
  });

  it('sums to exactly 100 even for splits that do not divide cleanly', () => {
    for (const skills of [1, 3, 7, 11, 13]) {
      const weights = resolveWeights({ skills, experience: 1, location: 1, salary: 1 });
      expect(sum(weights)).toBe(100);
    }
  });

  it('allows a dimension to be switched off entirely', () => {
    const weights = resolveWeights({ location: 0 });

    expect(weights.location).toBe(0);
    expect(sum(weights)).toBe(100);
  });

  it('rejects an unknown dimension rather than ignoring it', () => {
    expect(() => resolveWeights({ vibes: 10 })).toThrow(ValidationError);
  });

  it('rejects negative and non-numeric weights', () => {
    expect(() => resolveWeights({ skills: -1 })).toThrow(ValidationError);
    expect(() => resolveWeights({ skills: Number.NaN })).toThrow(ValidationError);
  });

  it('rejects an all-zero budget, which would make every score zero', () => {
    expect(() => resolveWeights({ skills: 0, experience: 0, location: 0, salary: 0 })).toThrow(
      ValidationError,
    );
  });

  it('ignores undefined overrides so partial query strings work', () => {
    expect(resolveWeights({ skills: undefined })).toEqual(DEFAULT_WEIGHTS);
  });
});
