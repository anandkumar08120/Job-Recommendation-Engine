import { z } from 'zod';

export const identifier = z.string().trim().min(1).max(64);

export const nonEmptyText = (max = 200) => z.string().trim().min(1).max(max);

/** Money is validated as a non-negative integer -- currency-agnostic minor/major units. */
export const money = z.number().int().nonnegative().max(1_000_000_000);

/** A 0..1 share used by the scoring tuning knobs. */
export const ratio = z.coerce.number().min(0).max(1);

export const idParamSchema = z.object({ id: identifier });
