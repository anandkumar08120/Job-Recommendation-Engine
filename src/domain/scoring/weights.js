import { ValidationError } from '../../lib/errors.js';

export const DIMENSIONS = Object.freeze(['skills', 'experience', 'location', 'salary']);

export const DEFAULT_WEIGHTS = Object.freeze({
  skills: 50,
  experience: 20,
  location: 15,
  salary: 15,
});

export const DEFAULT_TUNING = Object.freeze({

  mustHaveShare: 0.7,

  experiencePenaltyPerYear: 0.25,

  /** Share of the location budget awarded when the job is remote-friendly but the city differs. */
  remoteLocationShare: 0.6,

  salaryInRangeFloor: 0.5,


  salaryOverreachTolerance: 0.1,

  salaryOverreachCeiling: 0.15,
});

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

const apportionTo100 = (values) => {
  const cents = {};
  let allocated = 0;

  for (const key of DIMENSIONS) {
    cents[key] = Math.floor(values[key] * 100);
    allocated += cents[key];
  }

  const remainders = DIMENSIONS.map((key) => ({
    key,
    remainder: values[key] * 100 - cents[key],
  })).sort((a, b) => b.remainder - a.remainder || a.key.localeCompare(b.key));

  for (let i = 0; i < 10_000 - allocated; i += 1) {
    cents[remainders[i % remainders.length].key] += 1;
  }

  return Object.fromEntries(DIMENSIONS.map((key) => [key, cents[key] / 100]));
};

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
  return Object.freeze(apportionTo100(normalised));
};

export const resolveTuning = (overrides = {}) => Object.freeze({ ...DEFAULT_TUNING, ...overrides });
