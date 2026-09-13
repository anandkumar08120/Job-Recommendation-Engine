import { describe, expect, it } from 'vitest';
import { scoreMatch } from '../../../src/domain/scoring/scoreMatch.js';
import { resolveWeights } from '../../../src/domain/scoring/weights.js';
import { aCandidate, aJob, skill } from '../../factories.js';

describe('scoreMatch', () => {
  it('scores a perfect match at 100', () => {
    const result = scoreMatch(
      aCandidate({
        skills: ['JavaScript', 'Node.js', 'Kubernetes'],
        yearsOfExperience: 8,
        location: 'Bengaluru',
        expectedSalary: 1_500_000,
      }),
      aJob(),
    );

    expect(result.eligible).toBe(true);
    expect(result.score).toBe(100);
  });

  it('rejects the candidate outright when a must-have skill is missing', () => {
    const result = scoreMatch(
      aCandidate({ skills: ['Node.js'] }),
      aJob({ requiredSkills: [skill('Go', true)] }),
    );

    expect(result.eligible).toBe(false);
    expect(result.score).toBe(0);
    expect(result.disqualifiedBy).toBe('must-have-skills');
    expect(result.missingMustHaveSkills).toEqual(['Go']);
    expect(result.breakdown).toBeNull();
  });

  it('rejects on a missing must-have even when every other dimension is perfect', () => {
    const perfectExceptSkills = scoreMatch(
      aCandidate({ yearsOfExperience: 30, location: 'Bengaluru', expectedSalary: 1 }),
      aJob({ requiredSkills: [skill('COBOL', true)] }),
    );

    expect(perfectExceptSkills.eligible).toBe(false);
  });

  it('produces a breakdown that adds up to the headline score', () => {
    const result = scoreMatch(
      aCandidate({ yearsOfExperience: 2, location: 'Berlin', expectedSalary: 2_500_000 }),
      aJob(),
    );

    const sum = Object.values(result.breakdown).reduce((total, d) => total + d.points, 0);

    expect(Math.round(sum * 100) / 100).toBe(result.score);
  });

  it('never exceeds the 0..100 bounds, including with custom weights', () => {
    const weights = resolveWeights({ skills: 3, experience: 1, location: 1, salary: 1 });
    const best = scoreMatch(
      aCandidate({ skills: ['JavaScript', 'Node.js', 'Kubernetes'], yearsOfExperience: 9, expectedSalary: 1 }),
      aJob(),
      { weights },
    );
    const worst = scoreMatch(
      aCandidate({ skills: ['JavaScript', 'Node.js'], yearsOfExperience: 0, location: 'Berlin', expectedSalary: 9_999_999 }),
      aJob({ requiredSkills: [skill('JavaScript', true)], minYearsExperience: 10 }),
      { weights },
    );

    expect(best.score).toBeLessThanOrEqual(100);
    expect(worst.score).toBeGreaterThanOrEqual(0);
  });

  it('reports each dimension out of its configured maximum', () => {
    const result = scoreMatch(aCandidate(), aJob());

    expect(result.breakdown.skills.maxPoints).toBe(50);
    expect(result.breakdown.experience.maxPoints).toBe(20);
    expect(result.breakdown.location.maxPoints).toBe(15);
    expect(result.breakdown.salary.maxPoints).toBe(15);
    expect(result.summary).toHaveLength(4);
    expect(result.summary[0]).toMatch(/^skills: \d+(\.\d+)?\/50$/);
  });

  it('shifts the score when weights are re-pointed at a weak dimension', () => {
    const candidate = aCandidate({ location: 'Berlin' }); // location mismatch
    const job = aJob();

    const defaultScore = scoreMatch(candidate, job).score;
    const locationHeavy = scoreMatch(candidate, job, {
      weights: resolveWeights({ skills: 10, experience: 10, location: 70, salary: 10 }),
    }).score;

    expect(locationHeavy).toBeLessThan(defaultScore);
  });

  it('honours tuning overrides without touching the defaults', () => {
    const candidate = aCandidate({ yearsOfExperience: 2 });
    const job = aJob({ minYearsExperience: 6 });

    const strict = scoreMatch(candidate, job).score;
    const lenient = scoreMatch(candidate, job, { tuning: { experiencePenaltyPerYear: 0.05 } }).score;

    expect(lenient).toBeGreaterThan(strict);
    expect(scoreMatch(candidate, job).score).toBe(strict);
  });

  it('explains every dimension in words', () => {
    const result = scoreMatch(aCandidate(), aJob());

    for (const dimension of Object.values(result.breakdown)) {
      expect(typeof dimension.reason).toBe('string');
      expect(dimension.reason.length).toBeGreaterThan(0);
    }
  });
});
