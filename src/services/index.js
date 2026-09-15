import { createCandidateService } from './candidateService.js';
import { createJobService } from './jobService.js';
import { createRecommendationService } from './recommendationService.js';

/** Wires the service layer over a set of repositories. */
export const createServices = ({ repositories }) => {
  const candidateService = createCandidateService({ repositories });
  const jobService = createJobService({ repositories });
  const recommendationService = createRecommendationService({
    repositories,
    candidateService,
    jobService,
  });

  return { candidateService, jobService, recommendationService };
};
