import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().startsWith("postgresql://"),
  // BIGO integration (optional for now, required at call time)
  BIGO_HOST_DOMAIN: z.string().optional(),
  BIGO_HOST_BACKUP_DOMAIN: z.string().optional(),
  BIGO_CLIENT_ID: z.string().optional(),
  BIGO_PRIVATE_KEY: z.string().optional(),
  BIGO_RESELLER_BIGOID: z.string().optional(), //NOT USED
});

export const env = envSchema.parse(process.env);


// BIGO_HOST_DOMAIN="http://oauth.bigolive.tv"
// BIGO_HOST_BACKUP_DOMAIN="http://oauth.bigoapp.tv"
// BIGO_CLIENT_ID=AcM4fmaL7tr0fPn
// BIGO_PRIVATE_KEY
