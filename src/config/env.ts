import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

/**
 * Schema for environment variables.
 * Validates required configuration parameters before server initialization.
 */
const envSchema = z.object({
  PORT: z
    .string({ required_error: 'PORT is required in environment variables' })
    .transform((val) => val.trim())
    .refine((val) => val.length > 0, 'PORT cannot be empty')
    .transform((val, ctx) => {
      const parsedPort = Number(val);
      if (isNaN(parsedPort) || parsedPort <= 0 || !Number.isInteger(parsedPort)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'PORT must be a valid positive integer (e.g., 3000)',
        });
        return z.NEVER;
      }
      return parsedPort;
    }),
  NODE_ENV: z
    .string({ required_error: 'NODE_ENV is required in environment variables' })
    .transform((val) => val.trim())
    .refine((val) => val.length > 0, 'NODE_ENV cannot be empty'),
  MONGODB_URI: z
    .string({ required_error: 'MONGODB_URI is required in environment variables' })
    .transform((val) => val.trim())
    .refine((val) => val.length > 0, 'MONGODB_URI cannot be empty'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('\n❌ Environment Configuration Error:');
  for (const issue of result.error.issues) {
    const field = issue.path.join('.') || 'Configuration';
    console.error(`   • [${field}]: ${issue.message}`);
  }
  console.error('\nPlease verify your .env file and ensure all required variables are set.\n');
  process.exit(1);
}

export const env = result.data;
export type Env = z.infer<typeof envSchema>;
