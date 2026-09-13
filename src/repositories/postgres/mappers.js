/**
 * Row <-> domain mapping.
 *
 * The database speaks snake_case and returns BIGINT as a string; the domain
 * speaks camelCase and numbers. Keeping the translation in one file means the
 * scorer never has to know that `expected_salary` arrives as "2000000".
 */

const toNumber = (value) => (value === null || value === undefined ? value : Number(value));

export const rowToCandidate = (row) => ({
  id: row.id,
  name: row.name,
  skills: row.skills,
  yearsOfExperience: toNumber(row.years_of_experience),
  location: row.location,
  expectedSalary: toNumber(row.expected_salary),
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
});

export const rowToJob = (row) => ({
  id: row.id,
  title: row.title,
  requiredSkills: row.required_skills,
  minYearsExperience: toNumber(row.min_years_experience),
  location: row.location,
  salaryRange: { min: toNumber(row.salary_min), max: toNumber(row.salary_max) },
  remoteAllowed: row.remote_allowed,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
});
