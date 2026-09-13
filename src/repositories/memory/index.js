import { createInMemoryCollection } from './inMemoryCollection.js';

export const createMemoryRepositories = () => ({
  driver: 'memory',
  candidates: createInMemoryCollection('Candidate'),
  jobs: createInMemoryCollection('Job'),
  async ping() {
    return true;
  },
  async close() {},
});
