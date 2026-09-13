import { ValidationError } from '../../lib/errors.js';

/**
 * Scoring configuration.
 *
 * Every number the scorer uses lives here, so the weighting policy can be read
 * (and audited, and overridden per request) in one place instead of being
 * scattered through the dimension modules.
 *
 * The rationale for each value is in README.md -> "Scoring formula".
 */

export const DIMENSIONS = Object.freeze(['skills', 'experience', 'location', 'salary']);

/** Point budget, out of 100. */
export const DEFAULT_WEIGHTS = Object.freeze({
  skills: 50,
  experience: 20,
  location: 15,
  salary: 15,
});

export const DEFAULT_TUNING = Object.freeze({
  /**
   * Share of the skills budget awarded for clearing the must-have gate.
   * Must-haves are a hard filter, so every scored job already has 100% coverage
   * of them; the remaining share is what actually separates two surviving jobs.
   */
  mustHaveShare: 0.7,

  /**
   * Fraction of the experience budget lost per full year below
   * minYearsExperience. 0.25 => a candidate 4+ years short scores 0 on the
   * dimension but is still returned, which is the "penalise, don't exclude"
   * behaviour the brief asks for.
   */
  experiencePenaltyPerYear: 0.25,

  /** Share of the location budget awarded when the job is remote-friendly but the city differs. */
  remoteLocationShare: 0.6,

  /**
   * Score floor for a job whose salary range *contains* the expectation.
   * expectedSalary == salaryRange.max means "they can pay it, with no headroom",
   * which is a real but weak fit compared with a range that starts above it.
   */
  salaryInRangeFloor: 0.5,

  /**
   * How far above salaryRange.max the expectation may stretch before the salary
   * dimension hits exactly zero (10% => a 55k expectation still earns a sliver
   * against a 50k ceiling, because that gap is usually negotiable).
   */
  salaryOverreachTolerance: 0.1,

  /**
   * Score awarded the instant the expectation crosses salaryRange.max, decaying
   * to zero across the tolerance band. Deliberately a cliff, not a slope: the
   * employer has stated a ceiling, so "near zero" (15%) is the most any such job
   * can earn on this dimension, however small the gap.
   */
  salaryOverreachCeiling: 0.15,
});

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

/**
 * Merge caller-supplied weights over the defaults and rescale them to a 100
 * point budget, so an overall score is always comparable across requests and
 * always lands in 0..100 no matter what the caller passed in.
 */
export const resolveWeights = (overrides = {}) => {
  const merged = { ...DEFAULT_WEIGHTS };

  for (const [key, value] of Object.entries(overrides ?? {})) {
    if (value === undefined) continue;
    if (!DIMENSIONS.includes(key)) {
      throw new ValidationError(`Unknown scoring dimension "${key}"`, {
        allowed: [...DIMENSIONS],
      });
    }
    if (!isFiniteNumber(value) || value < 0) {
      throw new ValidationError(`Weight for "${key}" must be a number >= 0`, { received: value });
    }
    merged[key] = value;
  }

  const total = DIMENSIONS.reduce((sum, key) => sum + merged[key], 0);
  if (total <= 0) {
    throw new ValidationError('At least one scoring weight must be greater than zero');
  }

  const normalised = {};
  for (const key of DIMENSIONS) {
    normalised[key] = (merged[key] / total) * 100;
  }
  return Object.freeze(normalised);
};

export const resolveTuning = (overrides = {}) => Object.freeze({ ...DEFAULT_TUNING, ...overrides });
