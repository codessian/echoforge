import { z } from 'zod';

// Base environment configuration schema
export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  API_BASE_URL: z.string().default('http://localhost:3000'),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
});

export type Config = z.infer<typeof configSchema>;

// Parse and validate environment variables
export const env = configSchema.parse(process.env);

// Export individual config values for convenience
export const {
  NODE_ENV,
  PORT,
  LOG_LEVEL,
  DATABASE_URL,
  REDIS_URL,
  JWT_SECRET,
  API_BASE_URL,
  CORS_ORIGIN,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
} = env;

// Helper functions
export const isDevelopment = () => NODE_ENV === 'development';
export const isProduction = () => NODE_ENV === 'production';
export const isTest = () => NODE_ENV === 'test';

// Default export
export default env;