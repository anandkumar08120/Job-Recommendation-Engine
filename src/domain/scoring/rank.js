import { scoreMatch } from './scoreMatch.js';

/**
 * Ranking rules shared by both directions of the match.
 *
 * Ties are broken deterministically -- score, then skills, then id -- so the
 * same request always returns the same order. Pagination and caching downstream
 * both depend on that; an unstable sort would quietly shuffle equal-scoring
 * results between identical calls.
 */
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

/** Rank jobs for one candidate. Jobs failing the must-have gate are dropped. */
export const rankJobsForCandidate = (candidate, jobs, { limit, weights, tuning } = {}) => {
  const pairs = jobs.map((job) => {
    const match = scoreMatch(candidate, job, { weights, tuning });
    return { id: job.id, job, match, score: match.score };
  });
  return rank(pairs, limit);
};

/** Reverse view: rank candidates for one job, using the identical scorer. */
export const rankCandidatesForJob = (job, candidates, { limit, weights, tuning } = {}) => {
  const pairs = candidates.map((candidate) => {
    const match = scoreMatch(candidate, job, { weights, tuning });
    return { id: candidate.id, candidate, match, score: match.score };
  });
  return rank(pairs, limit);
};
