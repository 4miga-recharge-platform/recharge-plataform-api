import { z } from 'zod';
import { config } from 'dotenv';
config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().startsWith("postgresql://"),
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
  BRAVIVE_BASE_URL: z.string().url().optional().default('https://app.bravive.com/api/v1'),
  BRAVIVE_API_TOKEN: z.string().optional(), // Temporary token for testing
  BRAVIVE_WEBHOOK_SECRET: z.string().optional(), // For webhook validation (future)
});

export const env = envSchema.parse(process.env);
