import { scoreExperience } from './experience.js';
import { scoreLocation } from './location.js';
import { scoreSalary } from './salary.js';
import { scoreSkills } from './skills.js';
import { DIMENSIONS, resolveTuning, resolveWeights } from './weights.js';

const round2 = (value) => Math.round(value * 100) / 100;

/**
 * Score one candidate against one job.
 *
 * Pure: same inputs, same output, no I/O, no clock, no randomness. That is what
 * makes the result reproducible and the whole thing testable -- and it is the
 * reason the "why" of a score can be handed back to the user verbatim instead of
 * being reverse-engineered from a model.
 *
 * Returns `eligible: false` (with the reason) when the candidate misses a
 * must-have skill. Callers decide what to do with that; the ranking helpers drop
 * such pairs entirely, which is the hard filter the brief requires.
 */
export const scoreMatch = (candidate, job, { weights, tuning } = {}) => {
  const resolvedWeights = weights ?? resolveWeights();
  const resolvedTuning = resolveTuning(tuning);

  const skills = scoreSkills(candidate, job, resolvedTuning);

  if (!skills.eligible) {
    return {
      eligible: false,
      score: 0,
      disqualifiedBy: 'must-have-skills',
      reason: skills.reason,
      missingMustHaveSkills: skills.detail.mustHave.missing,
      breakdown: null,
      summary: [],
      weights: resolvedWeights,
    };
  }

  const dimensions = {
    skills,
    experience: scoreExperience(candidate, job, resolvedTuning),
    location: scoreLocation(candidate, job, resolvedTuning),
    salary: scoreSalary(candidate, job, resolvedTuning),
  };

  const breakdown = {};
  let score = 0;

  for (const name of DIMENSIONS) {
    const dimension = dimensions[name];
    // resolveWeights() already apportions the budget to exact 2dp values that
    // sum to 100, so maxPoints needs no further rounding.
    const maxPoints = resolvedWeights[name];
    // Round per dimension first so the breakdown always adds up to the headline
    // score exactly -- an explanation that does not reconcile is worse than none.
    const points = round2(dimension.ratio * resolvedWeights[name]);

    breakdown[name] = {
      points,
      maxPoints,
      ratio: round2(dimension.ratio),
      reason: dimension.reason,
      detail: dimension.detail,
      ...(dimension.match ? { match: dimension.match } : {}),
      ...(dimension.fit ? { fit: dimension.fit } : {}),
    };
    score += points;
  }

  return {
    eligible: true,
    score: round2(score),
    breakdown,
    summary: DIMENSIONS.map((name) => `${name}: ${breakdown[name].points}/${breakdown[name].maxPoints}`),
    weights: resolvedWeights,
  };
};
