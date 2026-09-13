import { z } from 'zod';
import { config } from '../../config/env.js';
import { ratio } from './common.js';

const weight = z.coerce.number().min(0).max(1000);

/**
 * Recommendation query string.
 *
 * Weights and tuning knobs are overridable per request (the "configurable
 * weights" bonus). Weights are relative, not absolute: resolveWeights() rescales
 * whatever arrives to a 100-point budget, so `?skillsWeight=3&salaryWeight=1`
 * means "skills matter three times as much as salary" and the score stays
 * comparable with a default-weighted one.
 *
 * Unknown query params are rejected rather than ignored: `?limt=5` silently
 * returning the default 10 is the kind of thing nobody notices until production.
 */
export const recommendationQuerySchema = z
  .strictObject({
    limit: z.coerce.number().int().min(1).max(config.recommendations.maxLimit).optional(),

    skillsWeight: weight.optional(),
    experienceWeight: weight.optional(),
    locationWeight: weight.optional(),
    salaryWeight: weight.optional(),

    mustHaveShare: ratio.optional(),
    experiencePenaltyPerYear: ratio.optional(),
    remoteLocationShare: ratio.optional(),
    salaryInRangeFloor: ratio.optional(),
    salaryOverreachTolerance: ratio.optional(),
    salaryOverreachCeiling: ratio.optional(),
  })
  .transform((query) => {
    const weights = stripUndefined({
      skills: query.skillsWeight,
      experience: query.experienceWeight,
      location: query.locationWeight,
      salary: query.salaryWeight,
    });

    const tuning = stripUndefined({
      mustHaveShare: query.mustHaveShare,
      experiencePenaltyPerYear: query.experiencePenaltyPerYear,
      remoteLocationShare: query.remoteLocationShare,
      salaryInRangeFloor: query.salaryInRangeFloor,
      salaryOverreachTolerance: query.salaryOverreachTolerance,
      salaryOverreachCeiling: query.salaryOverreachCeiling,
    });

    return { limit: query.limit, weights, tuning };
  });

const stripUndefined = (object) =>
  Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
