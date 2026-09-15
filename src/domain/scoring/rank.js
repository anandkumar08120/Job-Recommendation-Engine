import { scoreMatch } from './scoreMatch.js';

const compareMatches = (a, b) => {
  if (b.score !== a.score) return b.score - a.score;
  const skillDelta = b.match.breakdown.skills.points - a.match.breakdown.skills.points;
  if (skillDelta !== 0) return skillDelta;
  return String(a.id).localeCompare(String(b.id));
};

const rank = (pairs, limit) => {
  const eligible = pairs.filter((pair) => pair.match.eligible);
  eligible.sort(compareMatches);
  return typeof limit === 'number' ? eligible.slice(0, limit) : eligible;
};

export const rankJobsForCandidate = (candidate, jobs, { limit, weights, tuning } = {}) => {
  const pairs = jobs.map((job) => {
    const match = scoreMatch(candidate, job, { weights, tuning });
    return { id: job.id, job, match, score: match.score };
  });
  return rank(pairs, limit);
};

export const rankCandidatesForJob = (job, candidates, { limit, weights, tuning } = {}) => {
  const pairs = candidates.map((candidate) => {
    const match = scoreMatch(candidate, job, { weights, tuning });
    return { id: candidate.id, candidate, match, score: match.score };
  });
  return rank(pairs, limit);
};
