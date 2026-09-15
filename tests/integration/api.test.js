import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../helpers/testApp.js';

let app;

const candidatePayload = (overrides = {}) => ({
  name: 'Ada Lovelace',
  skills: ['JavaScript', 'Node.js', 'PostgreSQL'],
  yearsOfExperience: 5,
  location: 'Bengaluru',
  expectedSalary: 2_000_000,
  ...overrides,
});

const jobPayload = (overrides = {}) => ({
  title: 'Backend Engineer',
  requiredSkills: [
    { name: 'JavaScript', mustHave: true },
    { name: 'Kubernetes', mustHave: false },
  ],
  minYearsExperience: 4,
  location: 'Bengaluru',
  salaryRange: { min: 1_800_000, max: 2_600_000 },
  remoteAllowed: false,
  ...overrides,
});

beforeEach(() => {
  ({ app } = buildTestApp());
});

describe('POST /candidates', () => {
  it('creates a candidate and returns it with a generated id', async () => {
    const response = await request(app).post('/candidates').send(candidatePayload()).expect(201);

    expect(response.body.data.id).toEqual(expect.any(String));
    expect(response.body.data.name).toBe('Ada Lovelace');
    expect(response.headers.location).toBe(`/candidates/${response.body.data.id}`);
  });

  it('rejects a payload missing required fields', async () => {
    const response = await request(app).post('/candidates').send({ name: 'No Skills' }).expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.issues.map((i) => i.path)).toEqual(
      expect.arrayContaining(['skills', 'yearsOfExperience', 'location', 'expectedSalary']),
    );
  });

  it('rejects unknown fields instead of silently dropping them', async () => {
    await request(app)
      .post('/candidates')
      .send(candidatePayload({ yearsOfExperiance: 9 }))
      .expect(400);
  });

  it('rejects malformed JSON with a 400', async () => {
    await request(app)
      .post('/candidates')
      .set('content-type', 'application/json')
      .send('{"name":')
      .expect(400);
  });
});

describe('POST /jobs', () => {
  it('creates a job and defaults mustHave/remoteAllowed to false', async () => {
    const response = await request(app)
      .post('/jobs')
      .send({
        title: 'Platform Engineer',
        requiredSkills: [{ name: 'Go' }],
        minYearsExperience: 3,
        location: 'Berlin',
        salaryRange: { min: 100, max: 200 },
      })
      .expect(201);

    expect(response.body.data.requiredSkills[0].mustHave).toBe(false);
    expect(response.body.data.remoteAllowed).toBe(false);
  });

  it('rejects an inverted salary range', async () => {
    const response = await request(app)
      .post('/jobs')
      .send(jobPayload({ salaryRange: { min: 200, max: 100 } }))
      .expect(400);

    expect(response.body.error.details.issues[0].path).toBe('salaryRange.max');
  });
});

describe('GET /candidates/:id', () => {
  it('returns 404 for an unknown id', async () => {
    const response = await request(app).get('/candidates/does-not-exist').expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

describe('GET /candidates/:id/recommendations', () => {
  const seed = async () => {
    const { body } = await request(app).post('/candidates').send(candidatePayload()).expect(201);

    await request(app)
      .post('/jobs')
      .send(jobPayload({ title: 'Local match' }))
      .expect(201);
    await request(app)
      .post('/jobs')
      .send(jobPayload({ title: 'Remote match', location: 'Berlin', remoteAllowed: true }))
      .expect(201);
    await request(app)
      .post('/jobs')
      .send(jobPayload({ title: 'Onsite elsewhere', location: 'Berlin' }))
      .expect(201);
    await request(app)
      .post('/jobs')
      .send(jobPayload({ title: 'Needs Rust', requiredSkills: [{ name: 'Rust', mustHave: true }] }))
      .expect(201);

    return body.data.id;
  };

  it('ranks eligible jobs and excludes must-have mismatches entirely', async () => {
    const candidateId = await seed();

    const response = await request(app)
      .get(`/candidates/${candidateId}/recommendations`)
      .expect(200);
    const titles = response.body.data.map((r) => r.title);

    expect(titles).toEqual(['Local match', 'Remote match', 'Onsite elsewhere']);
    expect(titles).not.toContain('Needs Rust');
    expect(response.body.meta.filteredOutByMustHaveSkills).toBe(1);
    expect(response.body.meta.totalJobs).toBe(4);
  });

  it('returns a breakdown that reconciles with the overall score', async () => {
    const candidateId = await seed();

    const response = await request(app)
      .get(`/candidates/${candidateId}/recommendations`)
      .expect(200);
    const [top] = response.body.data;
    const sum = Object.values(top.breakdown).reduce((total, d) => total + d.points, 0);

    expect(top.score).toBeGreaterThan(0);
    expect(top.score).toBeLessThanOrEqual(100);
    expect(Math.round(sum * 100) / 100).toBe(top.score);
    expect(top.summary).toEqual([
      expect.stringMatching(/^skills: /),
      expect.stringMatching(/^experience: /),
      expect.stringMatching(/^location: /),
      expect.stringMatching(/^salary: /),
    ]);
  });

  it('honours the limit query param', async () => {
    const candidateId = await seed();

    const response = await request(app)
      .get(`/candidates/${candidateId}/recommendations?limit=2`)
      .expect(200);

    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta.limit).toBe(2);
  });

  it('rejects an invalid limit and unknown query params', async () => {
    const candidateId = await seed();

    await request(app).get(`/candidates/${candidateId}/recommendations?limit=0`).expect(400);
    await request(app).get(`/candidates/${candidateId}/recommendations?limt=2`).expect(400);
  });

  it('re-ranks when weights are overridden per request', async () => {
    const candidateId = await seed();

    const response = await request(app)
      .get(
        `/candidates/${candidateId}/recommendations?locationWeight=0&skillsWeight=50&experienceWeight=20&salaryWeight=15`,
      )
      .expect(200);

    // With location worth nothing, the three eligible jobs are indistinguishable.
    const scores = response.body.data.map((r) => r.score);
    expect(new Set(scores).size).toBe(1);
    expect(response.body.meta.weights.location).toBe(0);
  });

  it('returns an empty, self-explanatory result when nothing is eligible', async () => {
    const { body } = await request(app)
      .post('/candidates')
      .send(candidatePayload({ skills: ['COBOL'] }))
      .expect(201);
    await request(app).post('/jobs').send(jobPayload()).expect(201);

    const response = await request(app)
      .get(`/candidates/${body.data.id}/recommendations`)
      .expect(200);

    expect(response.body.data).toEqual([]);
    expect(response.body.meta.filteredOutByMustHaveSkills).toBe(1);
  });
});

describe('GET /jobs/:id/recommendations', () => {
  it('returns the best candidates for a job, gated the same way', async () => {
    const { body: job } = await request(app).post('/jobs').send(jobPayload()).expect(201);

    await request(app)
      .post('/candidates')
      .send(candidatePayload({ name: 'Strong', skills: ['JavaScript', 'Kubernetes'] }))
      .expect(201);
    await request(app)
      .post('/candidates')
      .send(candidatePayload({ name: 'Junior', skills: ['JavaScript'], yearsOfExperience: 1 }))
      .expect(201);
    await request(app)
      .post('/candidates')
      .send(candidatePayload({ name: 'Gated out', skills: ['COBOL'] }))
      .expect(201);

    const response = await request(app).get(`/jobs/${job.data.id}/recommendations`).expect(200);

    expect(response.body.data.map((r) => r.name)).toEqual(['Strong', 'Junior']);
    expect(response.body.meta.filteredOutByMustHaveSkills).toBe(1);
  });
});

describe('infrastructure endpoints', () => {
  it('serves liveness and readiness probes', async () => {
    await request(app).get('/health').expect(200);
    const ready = await request(app).get('/ready').expect(200);

    expect(ready.body.storage).toBe('memory');
  });

  it('serves the same routes under the /api/v1 alias', async () => {
    await request(app).post('/api/v1/candidates').send(candidatePayload()).expect(201);
  });

  it('returns a structured 404 for unknown routes', async () => {
    const response = await request(app).get('/nope').expect(404);

    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});
