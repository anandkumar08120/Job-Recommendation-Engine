/** Test data builders -- keep each test's body about the one field it exercises. */

export const aCandidate = (overrides = {}) => ({
  id: 'cand-1',
  name: 'Ada Lovelace',
  skills: ['JavaScript', 'Node.js', 'PostgreSQL'],
  yearsOfExperience: 5,
  location: 'Bengaluru',
  expectedSalary: 2_000_000,
  ...overrides,
});

export const aJob = (overrides = {}) => ({
  id: 'job-1',
  title: 'Backend Engineer',
  requiredSkills: [
    { name: 'JavaScript', mustHave: true },
    { name: 'Node.js', mustHave: true },
    { name: 'Kubernetes', mustHave: false },
  ],
  minYearsExperience: 4,
  location: 'Bengaluru',
  salaryRange: { min: 1_800_000, max: 2_600_000 },
  remoteAllowed: false,
  ...overrides,
});

export const skill = (name, mustHave = false) => ({ name, mustHave });
