import { Router } from 'express';
import { createCandidatesRouter } from './candidates.js';
import { createJobsRouter } from './jobs.js';

export const createApiRouter = ({ services }) => {
  const router = Router();

  router.use('/candidates', createCandidatesRouter(services));
  router.use('/jobs', createJobsRouter(services));

  return router;
};
