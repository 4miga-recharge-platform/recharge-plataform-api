import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z
    .string()
    .url()
    .refine((val) => val.startsWith('postgresql://'), {
      message: 'DATABASE_URL must start with postgresql://',
    }),
});

export const env = envSchema.parse(process.env);
