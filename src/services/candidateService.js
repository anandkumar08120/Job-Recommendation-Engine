import { randomUUID } from 'node:crypto';
import { NotFoundError } from '../lib/errors.js';

export const createCandidateService = ({ repositories }) => ({
  async create(input) {
    const candidate = {
      id: input.id ?? randomUUID(),
      name: input.name,
      skills: input.skills,
      yearsOfExperience: input.yearsOfExperience,
      location: input.location,
      expectedSalary: input.expectedSalary,
      createdAt: new Date().toISOString(),
    };
    return repositories.candidates.create(candidate);
  },

  async getById(id) {
    const candidate = await repositories.candidates.findById(id);
    if (!candidate) throw new NotFoundError('Candidate', id);
    return candidate;
  },

  async list() {
    return repositories.candidates.findAll();
  },
});
