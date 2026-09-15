import { ConflictError } from '../../lib/errors.js';
import { rowToCandidate, rowToJob } from './mappers.js';
import { closePool, getPool } from './pool.js';

const UNIQUE_VIOLATION = '23505';

const asConflict = (error, resource, id) => {
  if (error.code === UNIQUE_VIOLATION) {
    return new ConflictError(`${resource} with id "${id}" already exists`, { resource, id });
  }
  return error;
};

export const createPostgresRepositories = () => {
  const pool = getPool();

  return {
    driver: 'postgres',

    candidates: {
      async create(candidate) {
        try {
          const { rows } = await pool.query(
            `INSERT INTO candidates (id, name, skills, years_of_experience, location, expected_salary)
             VALUES ($1, $2, $3::jsonb, $4, $5, $6)
             RETURNING *`,
            [
              candidate.id,
              candidate.name,
              JSON.stringify(candidate.skills),
              candidate.yearsOfExperience,
              candidate.location,
              candidate.expectedSalary,
            ],
          );
          return rowToCandidate(rows[0]);
        } catch (error) {
          throw asConflict(error, 'Candidate', candidate.id);
        }
      },

      async findById(id) {
        const { rows } = await pool.query('SELECT * FROM candidates WHERE id = $1', [id]);
        return rows[0] ? rowToCandidate(rows[0]) : null;
      },

      async findAll() {
        const { rows } = await pool.query('SELECT * FROM candidates ORDER BY created_at, id');
        return rows.map(rowToCandidate);
      },

      async count() {
        const { rows } = await pool.query('SELECT count(*)::int AS total FROM candidates');
        return rows[0].total;
      },

      async clear() {
        await pool.query('TRUNCATE candidates');
      },
    },

    jobs: {
      async create(job) {
        try {
          const { rows } = await pool.query(
            `INSERT INTO jobs (id, title, required_skills, min_years_experience, location,
                               salary_min, salary_max, remote_allowed)
             VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
              job.id,
              job.title,
              JSON.stringify(job.requiredSkills),
              job.minYearsExperience,
              job.location,
              job.salaryRange.min,
              job.salaryRange.max,
              job.remoteAllowed,
            ],
          );
          return rowToJob(rows[0]);
        } catch (error) {
          throw asConflict(error, 'Job', job.id);
        }
      },

      async findById(id) {
        const { rows } = await pool.query('SELECT * FROM jobs WHERE id = $1', [id]);
        return rows[0] ? rowToJob(rows[0]) : null;
      },

      async findAll() {
        const { rows } = await pool.query('SELECT * FROM jobs ORDER BY created_at, id');
        return rows.map(rowToJob);
      },

      async count() {
        const { rows } = await pool.query('SELECT count(*)::int AS total FROM jobs');
        return rows[0].total;
      },

      async clear() {
        await pool.query('TRUNCATE jobs');
      },
    },

    async ping() {
      await pool.query('SELECT 1');
      return true;
    },

    async close() {
      await closePool();
    },
  };
};
