
export const scoreExperience = (candidate, job, tuning) => {
  const required = job.minYearsExperience ?? 0;
  const actual = candidate.yearsOfExperience ?? 0;

  if (required <= 0) {
    return {
      ratio: 1,
      reason: 'Job sets no minimum experience',
      detail: { requiredYears: required, candidateYears: actual, shortfallYears: 0 },
    };
  }

  if (actual >= required) {
    return {
      ratio: 1,
      reason: `Meets the ${required}-year minimum with ${actual} years`,
      detail: { requiredYears: required, candidateYears: actual, shortfallYears: 0 },
    };
  }

  const shortfall = required - actual;
  const ratio = Math.max(0, 1 - shortfall * tuning.experiencePenaltyPerYear);

  return {
    ratio,
    reason:
      ratio > 0
        ? `${formatYears(shortfall)} short of the ${required}-year minimum (penalised, not excluded)`
        : `${formatYears(shortfall)} short of the ${required}-year minimum -- no points, but still listed`,
    detail: { requiredYears: required, candidateYears: actual, shortfallYears: round(shortfall) },
  };
};

const round = (value) => Math.round(value * 100) / 100;
const formatYears = (value) => `${round(value)} year${round(value) === 1 ? '' : 's'}`;
