import { describe, expect, it } from 'vitest';
import { NotFoundError } from '../../../src/lib/errors.js';
import { createMemoryRepositories } from '../../../src/repositories/memory/index.js';
import { createServices } from '../../../src/services/index.js';
import { aCandidate, aJob } from '../../factories.js';

const build = () => {
  const repositories = createMemoryRepositories();
  return createServices({ repositories });
};

describe('candidateService', () => {
  it('generates an id and timestamp when none is supplied', async () => {
    const { candidateService } = build();
    const { id, ...rest } = aCandidate();

    const created = await candidateService.create(rest);

    expect(created.id).toEqual(expect.any(String));
    expect(created.createdAt).toEqual(expect.any(String));
    expect(id).toBe('cand-1');
  });

  it('honours a caller-supplied id', async () => {
    const { candidateService } = build();

    const created = await candidateService.create(aCandidate({ id: 'chosen' }));

    expect(created.id).toBe('chosen');
    expect(await candidateService.getById('chosen')).toMatchObject({ id: 'chosen' });
  });

  it('throws NotFoundError for an unknown id', async () => {
    const { candidateService } = build();

    await expect(candidateService.getById('nope')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('lists candidates', async () => {
    const { candidateService } = build();
    await candidateService.create(aCandidate({ id: 'a' }));
    await candidateService.create(aCandidate({ id: 'b' }));

    expect(await candidateService.list()).toHaveLength(2);
  });
});

describe('jobService', () => {
  it('creates and reads back a job', async () => {
    const { jobService } = build();

    const created = await jobService.create(aJob({ id: 'j1' }));

    expect(created.salaryRange).toEqual({ min: 1_800_000, max: 2_600_000 });
    expect(await jobService.getById('j1')).toMatchObject({ id: 'j1' });
    expect(await jobService.list()).toHaveLength(1);
  });

  it('throws NotFoundError for an unknown id', async () => {
    const { jobService } = build();

    await expect(jobService.getById('nope')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('recommendationService', () => {
  it('surfaces a NotFoundError rather than an empty list for an unknown candidate', async () => {
    const { recommendationService } = build();

    await expect(recommendationService.recommendJobsForCandidate('ghost')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('caps limit at the configured maximum', async () => {
    const { candidateService, recommendationService } = build();
    await candidateService.create(aCandidate({ id: 'c1' }));

    const result = await recommendationService.recommendJobsForCandidate('c1', { limit: 10_000 });

    expect(result.limit).toBeLessThanOrEqual(100);
  });
});
