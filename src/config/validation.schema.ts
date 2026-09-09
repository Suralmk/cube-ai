import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(8000),
  DATABASE_URL: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().optional(),
  BETTER_AUTH_URL: z.string().url().optional(),

  QDRANT_URL: z.string().url().optional(),
  QDRANT_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_CHAT_MODEL: z
    .string()
    .default('meta-llama/llama-3.3-70b-instruct:free'),
  OPENROUTER_EMBEDDING_MODEL: z
    .string()
    .default('nvidia/llama-nemotron-embed-vl-1b-v2:free'),
  OPENROUTER_FALLBACK_MODELS: z.string().optional(),
  RAG_TOP_K: z.coerce.number().default(5),
  RAG_CHUNK_SIZE: z.coerce.number().default(1000),
  RAG_CHUNK_OVERLAP: z.coerce.number().default(200),
  CHAT_HISTORY_LIMIT: z.coerce.number().default(5),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./storage'),
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET_NAME: z.string().optional(),
  FRONTEND_URL: z.string().url().optional(),
  API_PREFIX: z.string().default('api/v1'),
});

export type EnvSchema = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvSchema {
  return envSchema.parse(config);
}
