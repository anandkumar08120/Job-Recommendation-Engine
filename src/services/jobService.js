import { randomUUID } from 'node:crypto';
import { NotFoundError } from '../lib/errors.js';

export const createJobService = ({ repositories }) => ({
  async create(input) {
    const job = {
      id: input.id ?? randomUUID(),
      title: input.title,
      requiredSkills: input.requiredSkills,
      minYearsExperience: input.minYearsExperience,
      location: input.location,
      salaryRange: input.salaryRange,
      remoteAllowed: input.remoteAllowed,
      createdAt: new Date().toISOString(),
    };
    return repositories.jobs.create(job);
  },

  async getById(id) {
    const job = await repositories.jobs.findById(id);
    if (!job) throw new NotFoundError('Job', id);
    return job;
  },

  async list() {
    return repositories.jobs.findAll();
  },
});
