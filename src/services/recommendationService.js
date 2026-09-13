import { config } from '../config/env.js';
import { rankCandidatesForJob, rankJobsForCandidate, resolveWeights } from '../domain/scoring/index.js';

/**
 * Recommendation use-cases: fetch, then delegate every judgement call to the
 * pure scoring domain. Nothing here decides what a good match is -- that lives
 * in src/domain/scoring and is unit-tested in isolation.
 *
 * Scoring runs in-process over the full candidate/job set. At the scale this
 * brief implies that is the right call: it keeps the scorer a single, readable,
 * fully testable function instead of a SQL expression split across the database
 * and the app. See README ("What I'd do differently with more time") for where
 * that breaks down and what replaces it.
 */
export const createRecommendationService = ({ repositories, candidateService, jobService }) => {
  const resolveLimit = (limit) =>
    Math.min(limit ?? config.recommendations.defaultLimit, config.recommendations.maxLimit);

  return {
    async recommendJobsForCandidate(candidateId, { limit, weights: weightOverrides, tuning } = {}) {
      const candidate = await candidateService.getById(candidateId);
      const jobs = await repositories.jobs.findAll();
      const weights = resolveWeights(weightOverrides);
      const appliedLimit = resolveLimit(limit);

      const ranked = rankJobsForCandidate(candidate, jobs, { limit: appliedLimit, weights, tuning });

      return {
        candidate: { id: candidate.id, name: candidate.name },
        weights,
        limit: appliedLimit,
        totalJobs: jobs.length,
        eligibleJobs: ranked.length,
        results: ranked.map(({ job, match }) => ({
          jobId: job.id,
          title: job.title,
          location: job.location,
          remoteAllowed: job.remoteAllowed,
          salaryRange: job.salaryRange,
          score: match.score,
          summary: match.summary,
          breakdown: match.breakdown,
        })),
      };
    },

    async recommendCandidatesForJob(jobId, { limit, weights: weightOverrides, tuning } = {}) {
      const job = await jobService.getById(jobId);
      const candidates = await repositories.candidates.findAll();
      const weights = resolveWeights(weightOverrides);
      const appliedLimit = resolveLimit(limit);

      const ranked = rankCandidatesForJob(job, candidates, {
        limit: appliedLimit,
        weights,
        tuning,
      });

      return {
        job: { id: job.id, title: job.title },
        weights,
        limit: appliedLimit,
        totalCandidates: candidates.length,
        eligibleCandidates: ranked.length,
        results: ranked.map(({ candidate, match }) => ({
          candidateId: candidate.id,
          name: candidate.name,
          location: candidate.location,
          yearsOfExperience: candidate.yearsOfExperience,
          expectedSalary: candidate.expectedSalary,
          score: match.score,
          summary: match.summary,
          breakdown: match.breakdown,
        })),
      };
    },
  };
};
