import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().startsWith("postgresql://"),
  // BIGO integration (optional for now, required at call time)
  BIGO_HOST_DOMAIN: z.string().optional(),
  BIGO_CLIENT_ID: z.string().optional(),
  BIGO_CLIENT_SECRET: z.string().optional(),
  BIGO_RESELLER_BIGOID: z.string().optional(),
  BIGO_ENABLED: z
    .union([z.boolean(), z.string()])
    .transform((v) => (typeof v === 'string' ? v === 'true' : v))
    .optional(),
  // BIGO RSA/ECDSA keys for signature authentication
  BIGO_PRIVATE_KEY: z.string().optional(),
  BIGO_CLIENT_VERSION: z.string().optional(),
});

export const env = envSchema.parse(process.env);
