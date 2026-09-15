import { Router } from 'express';

export const createHealthRouter = ({ repositories }) => {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
  });

  router.get('/ready', async (_req, res) => {
    try {
      await repositories.ping();
      res.json({ status: 'ready', storage: repositories.driver });
    } catch (error) {
      res.status(503).json({
        status: 'unavailable',
        storage: repositories.driver,
        reason: error.message,
      });
    }
  });

  return router;
};
