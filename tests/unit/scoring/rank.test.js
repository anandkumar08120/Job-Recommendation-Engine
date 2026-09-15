import { describe, expect, it } from 'vitest';
import { rankCandidatesForJob, rankJobsForCandidate } from '../../../src/domain/scoring/rank.js';
import { aCandidate, aJob, skill } from '../../factories.js';

describe('rankJobsForCandidate', () => {
  const candidate = aCandidate({
    skills: ['JavaScript', 'Node.js'],
    yearsOfExperience: 5,
    location: 'Bengaluru',
    expectedSalary: 2_000_000,
  });

  const localJob = aJob({ id: 'local' });
  const remoteJob = aJob({ id: 'remote', location: 'Berlin', remoteAllowed: true });
  const onsiteElsewhere = aJob({ id: 'elsewhere', location: 'Berlin', remoteAllowed: false });
  const blockedJob = aJob({ id: 'blocked', requiredSkills: [skill('Rust', true)] });

  it('drops jobs the candidate is gated out of', () => {
    const results = rankJobsForCandidate(candidate, [localJob, blockedJob]);

    expect(results.map((r) => r.id)).toEqual(['local']);
  });

  it('orders by descending score', () => {
    const results = rankJobsForCandidate(candidate, [onsiteElsewhere, localJob, remoteJob]);

    expect(results.map((r) => r.id)).toEqual(['local', 'remote', 'elsewhere']);
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it('applies the top-N limit after ranking, not before', () => {
    const results = rankJobsForCandidate(candidate, [onsiteElsewhere, localJob, remoteJob], {
      limit: 2,
    });

    expect(results.map((r) => r.id)).toEqual(['local', 'remote']);
  });

  it('breaks ties deterministically so repeated calls agree', () => {
    const twinA = aJob({ id: 'twin-a' });
    const twinB = aJob({ id: 'twin-b' });

    const first = rankJobsForCandidate(candidate, [twinB, twinA]).map((r) => r.id);
    const second = rankJobsForCandidate(candidate, [twinA, twinB]).map((r) => r.id);

    expect(first).toEqual(second);
    expect(first).toEqual(['twin-a', 'twin-b']);
  });

  it('returns an empty list when nothing is eligible', () => {
    expect(rankJobsForCandidate(candidate, [blockedJob])).toEqual([]);
    expect(rankJobsForCandidate(candidate, [])).toEqual([]);
  });

  it('carries the explanation through with each result', () => {
    const [top] = rankJobsForCandidate(candidate, [localJob]);

    expect(top.match.breakdown.skills.points).toBeGreaterThan(0);
    expect(top.job.id).toBe('local');
  });
});

describe('rankCandidatesForJob', () => {
  const job = aJob({ location: 'Bengaluru', minYearsExperience: 5 });

  it('ranks candidates with the same scorer, gate included', () => {
    const strong = aCandidate({ id: 'strong', skills: ['JavaScript', 'Node.js', 'Kubernetes'] });
    const junior = aCandidate({
      id: 'junior',
      skills: ['JavaScript', 'Node.js'],
      yearsOfExperience: 1,
    });
    const gated = aCandidate({ id: 'gated', skills: ['JavaScript'] });

    const results = rankCandidatesForJob(job, [junior, gated, strong]);

    expect(results.map((r) => r.id)).toEqual(['strong', 'junior']);
    expect(results[0].candidate.id).toBe('strong');
  });

  it('honours the limit', () => {
    const candidates = [1, 2, 3].map((n) =>
      aCandidate({ id: `c${n}`, skills: ['JavaScript', 'Node.js'] }),
    );

    expect(rankCandidatesForJob(job, candidates, { limit: 2 })).toHaveLength(2);
  });
});
