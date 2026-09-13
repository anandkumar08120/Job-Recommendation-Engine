-- Schema for the job-match API.
-- Applied automatically by the Postgres container on first boot
-- (mounted into /docker-entrypoint-initdb.d), or manually via `npm run migrate`.

CREATE TABLE IF NOT EXISTS candidates (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    -- Skills are a value list owned entirely by the candidate, never queried
    -- independently, so jsonb keeps them in one row instead of forcing a join
    -- for every read. A GIN index makes containment lookups cheap if the
    -- must-have filter is ever pushed down into SQL.
    skills              JSONB NOT NULL,
    years_of_experience DOUBLE PRECISION NOT NULL CHECK (years_of_experience >= 0),
    location            TEXT NOT NULL,
    expected_salary     BIGINT NOT NULL CHECK (expected_salary >= 0),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
    id                   TEXT PRIMARY KEY,
    title                TEXT NOT NULL,
    required_skills      JSONB NOT NULL,
    min_years_experience DOUBLE PRECISION NOT NULL CHECK (min_years_experience >= 0),
    location             TEXT NOT NULL,
    salary_min           BIGINT NOT NULL CHECK (salary_min >= 0),
    salary_max           BIGINT NOT NULL,
    remote_allowed       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT jobs_salary_range_valid CHECK (salary_max >= salary_min)
);

CREATE INDEX IF NOT EXISTS candidates_skills_idx ON candidates USING GIN (skills);
CREATE INDEX IF NOT EXISTS jobs_required_skills_idx ON jobs USING GIN (required_skills);
CREATE INDEX IF NOT EXISTS jobs_location_idx ON jobs (lower(location));
