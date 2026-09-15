import { scoreExperience } from './experience.js';
import { scoreLocation } from './location.js';
import { scoreSalary } from './salary.js';
import { scoreSkills } from './skills.js';
import { DIMENSIONS, resolveTuning, resolveWeights } from './weights.js';

const round2 = (value) => Math.round(value * 100) / 100;

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
    const maxPoints = resolvedWeights[name];
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
    summary: DIMENSIONS.map(
      (name) => `${name}: ${breakdown[name].points}/${breakdown[name].maxPoints}`,
    ),
    weights: resolvedWeights,
  };
};
