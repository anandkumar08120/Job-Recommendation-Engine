import { z } from 'zod';
import { identifier, money, nonEmptyText } from './common.js';

/**
 * `strictObject` rejects unknown keys instead of silently dropping them. A typo
 * like `yearsOfExperiance` should be a loud 400, not a candidate quietly stored
 * with zero years of experience.
 */
export const createCandidateSchema = z.strictObject({
  id: identifier.optional(),
  name: nonEmptyText(200),
  skills: z.array(nonEmptyText(100)).min(1, 'At least one skill is required').max(100),
  yearsOfExperience: z.number().min(0).max(70),
  location: nonEmptyText(200),
  expectedSalary: money,
});
