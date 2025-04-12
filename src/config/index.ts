import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // JWT
  JWT_SECRET: z.string().min(1),
  
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // API Configuration
  API_PORT: z.coerce.number().default(3000), // Default to 3000 for development
  API_HOST: z.string().default('0.0.0.0'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // CORS - Make optional for Cloudflare Workers
  CORS_ORIGIN: z.string().url().optional().default('*'),
  
  // Cloudflare - Make optional for local development
  CF_ACCOUNT_ID: z.string().min(1).optional(),
  CF_API_TOKEN: z.string().min(1).optional(),
});

type EnvSchema = z.infer<typeof envSchema>;

class Config {
  private static instance: Config;
  private config: EnvSchema;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  private loadConfig(): EnvSchema {
    try {
      // For Cloudflare Workers, use c.env
      const env = envSchema.parse({
        DATABASE_URL: process.env?.DATABASE_URL,
        JWT_SECRET: process.env?.JWT_SECRET,
        NODE_ENV: process.env?.NODE_ENV,
        API_PORT: process.env?.API_PORT || (process.env?.NODE_ENV === 'production' ? 8787 : 3000),
        API_HOST: process.env?.API_HOST,
        LOG_LEVEL: process.env?.LOG_LEVEL,
        CORS_ORIGIN: process.env?.CORS_ORIGIN,
        CF_ACCOUNT_ID: process.env?.CF_ACCOUNT_ID,
        CF_API_TOKEN: process.env?.CF_API_TOKEN,
      });
      return env;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('❌ Invalid environment variables:', error.errors);
      } else {
        console.error('❌ Error loading environment variables:', error);
      }
      process.exit(1);
    }
  }

  public get<T extends keyof EnvSchema>(key: T): EnvSchema[T] {
    return this.config[key];
  }

  public isDevelopment(): boolean {
    return this.get('NODE_ENV') === 'development';
  }

  public isProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }

  public isTest(): boolean {
    return this.get('NODE_ENV') === 'test';
  }
}

export const config = Config.getInstance(); 