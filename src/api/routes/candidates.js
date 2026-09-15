import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { createCandidateSchema } from '../schemas/candidate.js';
import { idParamSchema } from '../schemas/common.js';
import { recommendationQuerySchema } from '../schemas/recommendation.js';

export const createCandidatesRouter = ({ candidateService, recommendationService }) => {
  const router = Router();

  router.post('/', validate({ body: createCandidateSchema }), async (req, res) => {
    const candidate = await candidateService.create(req.validated.body);
    res.status(201).location(`/candidates/${candidate.id}`).json({ data: candidate });
  });

  router.get('/', async (_req, res) => {
    const candidates = await candidateService.list();
    res.json({ data: candidates, meta: { count: candidates.length } });
  });

  router.get('/:id', validate({ params: idParamSchema }), async (req, res) => {
    const candidate = await candidateService.getById(req.validated.params.id);
    res.json({ data: candidate });
  });

  /** Forward view: the best jobs for this candidate. */
  router.get(
    '/:id/recommendations',
    validate({ params: idParamSchema, query: recommendationQuerySchema }),
    async (req, res) => {
      const { limit, weights, tuning } = req.validated.query;
      const result = await recommendationService.recommendJobsForCandidate(
        req.validated.params.id,
        {
          limit,
          weights,
          tuning,
        },
      );
      res.json({ data: result.results, meta: toMeta(result) });
    },
  );

  return router;
};

const toMeta = ({ candidate, weights, limit, totalJobs, eligibleJobs }) => ({
  candidate,
  weights,
  limit,
  totalJobs,
  eligibleJobs,
  filteredOutByMustHaveSkills: totalJobs - eligibleJobs,
});
