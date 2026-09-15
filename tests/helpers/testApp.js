import { createApp } from '../../src/api/app.js';
import { createMemoryRepositories } from '../../src/repositories/memory/index.js';
import { createServices } from '../../src/services/index.js';

/** Boots the real app over fresh in-memory repositories -- no mocks, no database. */
export const buildTestApp = () => {
  const repositories = createMemoryRepositories();
  const services = createServices({ repositories });
  return { app: createApp({ services, repositories }), repositories, services };
};
