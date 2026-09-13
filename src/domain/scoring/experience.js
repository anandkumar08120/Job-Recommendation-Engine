/**
 * Experience dimension -- penalise, never exclude.
 *
 * `minYearsExperience` is an employer's shorthand, not a hard requirement: a
 * candidate one year short who holds every must-have skill is a plausible hire,
 * and dropping them would make the filter quietly exercise judgement that
 * belongs to the recruiter. So a shortfall costs a fixed slice of the dimension
 * per full year (default 25%), floored at zero: the candidate stays visible but
 * ranks honestly below someone who clears the bar.
 *
 * Extra years earn no bonus. Seniority beyond the requirement says little about
 * fit for *this* role and rewarding it would push every posting towards the most
 * senior candidate available, so we cap at full marks rather than penalising
 * overqualification or paying for it.
 */
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
