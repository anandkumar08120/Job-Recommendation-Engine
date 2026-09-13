import { Router } from 'express';

/**
 * Two probes, deliberately different:
 *  - /health  is liveness. Process is up; never touches a dependency, so a
 *             database blip cannot get the container killed and restarted.
 *  - /ready   is readiness. Pings persistence, because a pod that cannot reach
 *             its database should be pulled out of the load balancer.
 */
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
