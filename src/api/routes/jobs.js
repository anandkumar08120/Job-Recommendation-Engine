import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../schemas/common.js';
import { createJobSchema } from '../schemas/job.js';
import { recommendationQuerySchema } from '../schemas/recommendation.js';

export const createJobsRouter = ({ jobService, recommendationService }) => {
  const router = Router();

  router.post('/', validate({ body: createJobSchema }), async (req, res) => {
    const job = await jobService.create(req.validated.body);
    res.status(201).location(`/jobs/${job.id}`).json({ data: job });
  });

  router.get('/', async (_req, res) => {
    const jobs = await jobService.list();
    res.json({ data: jobs, meta: { count: jobs.length } });
  });

  router.get('/:id', validate({ params: idParamSchema }), async (req, res) => {
    const job = await jobService.getById(req.validated.params.id);
    res.json({ data: job });
  });

  /** Reverse view: the best candidates for this job, scored by the same function. */
  router.get(
    '/:id/recommendations',
    validate({ params: idParamSchema, query: recommendationQuerySchema }),
    async (req, res) => {
      const { limit, weights, tuning } = req.validated.query;
      const result = await recommendationService.recommendCandidatesForJob(
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

const toMeta = ({ job, weights, limit, totalCandidates, eligibleCandidates }) => ({
  job,
  weights,
  limit,
  totalCandidates,
  eligibleCandidates,
  filteredOutByMustHaveSkills: totalCandidates - eligibleCandidates,
});
