import { describe, expect, it } from 'vitest';
import { scoreSkills } from '../../../src/domain/scoring/skills.js';
import { DEFAULT_TUNING } from '../../../src/domain/scoring/weights.js';
import { aCandidate, aJob, skill } from '../../factories.js';

const score = (candidate, job) => scoreSkills(candidate, job, DEFAULT_TUNING);

describe('scoreSkills', () => {
  it('marks a candidate ineligible when a must-have skill is missing', () => {
    const result = score(
      aCandidate({ skills: ['JavaScript'] }),
      aJob({ requiredSkills: [skill('JavaScript', true), skill('Go', true)] }),
    );

    expect(result.eligible).toBe(false);
    expect(result.ratio).toBe(0);
    expect(result.detail.mustHave.missing).toEqual(['Go']);
  });

  it('stays ineligible even when every other required skill matches', () => {
    const result = score(
      aCandidate({ skills: ['JavaScript', 'Node.js', 'Kubernetes', 'Docker', 'AWS'] }),
      aJob({
        requiredSkills: [
          skill('Rust', true),
          skill('Kubernetes', false),
          skill('Docker', false),
          skill('AWS', false),
        ],
      }),
    );

    expect(result.eligible).toBe(false);
  });

  it('awards the must-have share plus nice-to-have coverage', () => {
    const result = score(
      aCandidate({ skills: ['JavaScript', 'Node.js', 'Kubernetes'] }),
      aJob({
        requiredSkills: [
          skill('JavaScript', true),
          skill('Kubernetes', false),
          skill('Terraform', false),
          skill('Go', false),
        ],
      }),
    );

    // 0.7 gate + 0.3 * (1 of 3 nice-to-haves)
    expect(result.eligible).toBe(true);
    expect(result.ratio).toBeCloseTo(0.8, 10);
    expect(result.detail.niceToHave).toMatchObject({ required: 3, matched: 1 });
  });

  it('gives full credit when the job lists no nice-to-have skills', () => {
    const result = score(
      aCandidate({ skills: ['JavaScript'] }),
      aJob({ requiredSkills: [skill('JavaScript', true)] }),
    );

    expect(result.ratio).toBe(1);
  });

  it('gives full credit when the job lists no required skills at all', () => {
    const result = score(aCandidate(), aJob({ requiredSkills: [] }));

    expect(result.eligible).toBe(true);
    expect(result.ratio).toBe(1);
  });

  it('matches skills irrespective of case, spacing and punctuation', () => {
    const result = score(
      aCandidate({ skills: ['node js', 'REACT-NATIVE'] }),
      aJob({ requiredSkills: [skill('Node.js', true), skill('React Native', false)] }),
    );

    expect(result.eligible).toBe(true);
    expect(result.ratio).toBe(1);
  });

  it('does not reward skills beyond what the job asked for', () => {
    const job = aJob({ requiredSkills: [skill('JavaScript', true), skill('Go', false)] });
    const focused = score(aCandidate({ skills: ['JavaScript'] }), job);
    const generalist = score(
      aCandidate({ skills: ['JavaScript', 'Rust', 'Elixir', 'Haskell'] }),
      job,
    );

    expect(generalist.ratio).toBe(focused.ratio);
  });
});
