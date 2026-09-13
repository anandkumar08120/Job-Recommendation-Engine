/**
 * Loads a small, deliberately varied demo dataset into a running API.
 *
 *   npm start &           # or docker compose up
 *   node scripts/seed.js  # BASE_URL=http://localhost:3000 by default
 *
 * The fixtures are chosen to exercise every branch of the scorer: a gated-out
 * must-have, a remote-only fit, an underqualified candidate and a job that
 * cannot meet the expected salary.
 */
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

const candidates = [
  {
    id: 'cand-ada',
    name: 'Ada Iyer',
    skills: ['JavaScript', 'Node.js', 'PostgreSQL', 'Docker'],
    yearsOfExperience: 6,
    location: 'Bengaluru',
    expectedSalary: 2_400_000,
  },
  {
    id: 'cand-ravi',
    name: 'Ravi Menon',
    skills: ['JavaScript', 'Node.js', 'Kubernetes', 'AWS', 'Terraform'],
    yearsOfExperience: 3,
    location: 'Remote',
    expectedSalary: 1_900_000,
  },
  {
    id: 'cand-sara',
    name: 'Sara Khan',
    skills: ['Python', 'Django', 'PostgreSQL'],
    yearsOfExperience: 8,
    location: 'Pune',
    expectedSalary: 3_200_000,
  },
];

const jobs = [
  {
    id: 'job-backend-blr',
    title: 'Senior Backend Engineer',
    requiredSkills: [
      { name: 'Node.js', mustHave: true },
      { name: 'PostgreSQL', mustHave: true },
      { name: 'Kubernetes', mustHave: false },
      { name: 'Docker', mustHave: false },
    ],
    minYearsExperience: 5,
    location: 'Bengaluru',
    salaryRange: { min: 2_200_000, max: 3_000_000 },
    remoteAllowed: false,
  },
  {
    id: 'job-platform-remote',
    title: 'Platform Engineer (Remote)',
    requiredSkills: [
      { name: 'Node.js', mustHave: true },
      { name: 'Terraform', mustHave: false },
      { name: 'AWS', mustHave: false },
    ],
    minYearsExperience: 4,
    location: 'Berlin',
    salaryRange: { min: 1_800_000, max: 2_600_000 },
    remoteAllowed: true,
  },
  {
    id: 'job-data-pune',
    title: 'Data Engineer',
    requiredSkills: [
      { name: 'Python', mustHave: true },
      { name: 'Airflow', mustHave: false },
    ],
    minYearsExperience: 4,
    location: 'Pune',
    salaryRange: { min: 2_000_000, max: 2_800_000 },
    remoteAllowed: false,
  },
  {
    id: 'job-rust-core',
    title: 'Systems Engineer (Rust)',
    requiredSkills: [{ name: 'Rust', mustHave: true }],
    minYearsExperience: 3,
    location: 'Bengaluru',
    salaryRange: { min: 2_500_000, max: 3_500_000 },
    remoteAllowed: true,
  },
];

const post = async (path, body) => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (response.status === 409) return { skipped: true, id: body.id };
  if (!response.ok) {
    throw new Error(`POST ${path} -> ${response.status}: ${await response.text()}`);
  }
  return response.json();
};

const run = async () => {
  for (const candidate of candidates) await post('/candidates', candidate);
  for (const job of jobs) await post('/jobs', job);

  const recommendations = await fetch(`${BASE_URL}/candidates/cand-ada/recommendations?limit=3`);
  const body = await recommendations.json();

  process.stdout.write(
    `Seeded ${candidates.length} candidates and ${jobs.length} jobs.\n\n` +
      `Top matches for Ada Iyer:\n` +
      body.data
        .map(
          (r) =>
            `  ${String(r.score).padStart(6)}  ${r.title}\n          ${r.summary.join('  |  ')}`,
        )
        .join('\n') +
      '\n',
  );
};

run().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
