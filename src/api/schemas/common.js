import { z } from 'zod';

export const identifier = z.string().trim().min(1).max(64);

export const nonEmptyText = (max = 200) => z.string().trim().min(1).max(max);

export const money = z.number().int().nonnegative().max(1_000_000_000);

export const ratio = z.coerce.number().min(0).max(1);

export const idParamSchema = z.object({ id: identifier });
