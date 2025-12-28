import { z } from 'zod';
import { config } from 'dotenv';
config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().startsWith('postgresql://'),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters long'),
  BASE_URL: z.string().url(),
  // BIGO integration (optional for development)
  BIGO_HOST_DOMAIN: z.string().optional(),
  BIGO_HOST_BACKUP_DOMAIN: z.string().optional(),
  BIGO_CLIENT_ID: z.string().optional(),
  BIGO_PRIVATE_KEY: z.string().optional(),
  BIGO_RESELLER_BIGOID: z.string().optional(), //NOT USED
  // GCP Storage
  GCP_PROJECT_ID: z.string().optional(),
  GCP_BUCKET_NAME: z.string().optional(),
  GCP_CLIENT_EMAIL: z.string().optional(),
  GCP_PRIVATE_KEY: z.string().optional(),
  // Webhooks for frontend revalidation
  STORE_WEBHOOKS: z.string().optional(),
  REVALIDATE_TOKEN: z.string().optional(),
  // Bravive Payment integration
  BRAVIVE_BASE_URL: z
    .string()
    .url()
    .optional()
    .default('https://app.bravive.com/api/v1'),
  BRAVIVE_API_TOKEN: z.string().optional(), // Temporary token for testing
  BRAVIVE_WEBHOOK_SECRET: z.string().optional(), // For webhook validation (future)
  // Encryption
  ENCRYPTION_KEY: z
    .string()
    .min(32, 'ENCRYPTION_KEY must be at least 32 characters long'),
  // Order expiration
  ORDER_EXPIRATION_HOURS: z.coerce.number().int().positive().default(24),
  // Bigo exchange rate (USD to BRL)
  BIGO_USD_TO_BRL_RATE: z.coerce.number().positive().default(5.5),
  // Bigo diamonds per USD average (range: 25-100, average: 62.5)
  BIGO_DIAMONDS_PER_USD_AVERAGE: z.coerce.number().positive().default(62.5),
});

export const env = envSchema.parse(process.env);
