import { z } from 'zod';
import { identifier, money, nonEmptyText } from './common.js';

const requiredSkillSchema = z.strictObject({
  name: nonEmptyText(100),
  /**
   * Defaults to false: an unmarked skill is treated as nice-to-have. Must-haves
   * eliminate candidates outright, so the safe default is the one that cannot
   * silently hide people from results.
   */
  mustHave: z.boolean().default(false),
});

const salaryRangeSchema = z
  .strictObject({ min: money, max: money })
  .refine((range) => range.max >= range.min, {
    message: 'salaryRange.max must be greater than or equal to salaryRange.min',
    path: ['max'],
  });

export const createJobSchema = z.strictObject({
  id: identifier.optional(),
  title: nonEmptyText(200),
  requiredSkills: z
    .array(requiredSkillSchema)
    .min(1, 'At least one required skill is needed')
    .max(100),
  minYearsExperience: z.number().min(0).max(70),
  location: nonEmptyText(200),
  salaryRange: salaryRangeSchema,
  remoteAllowed: z.boolean().default(false),
});
