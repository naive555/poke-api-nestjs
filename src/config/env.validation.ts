import { plainToInstance, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export const ENVIRONMENTS = ['development', 'docker', 'production', 'test'];

/**
 * Only the variables the app cannot start without. Everything optional keeps
 * living in its `registerAs` factory with a default; the point here is to turn
 * a missing or malformed value into one readable error at boot instead of a
 * driver-level failure minutes later.
 */
class EnvironmentVariables {
  @IsOptional()
  @IsIn(ENVIRONMENTS)
  NODE_ENV?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT?: number;

  @IsString()
  @IsNotEmpty()
  DATABASE_HOST: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  DATABASE_PORT: number;

  @IsString()
  @IsNotEmpty()
  DATABASE_USER: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_DB: string;

  @IsString()
  @IsNotEmpty()
  REDIS_HOST: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT: number;

  // Short secrets are brute-forceable offline once a token leaks; 16 is the
  // floor, 32+ bytes of real entropy is what production should carry.
  @IsString()
  @MinLength(16)
  APP_JWT_SECRET: string;
}

export const validateEnv = (config: Record<string, unknown>) => {
  const errors = validateSync(
    plainToInstance(EnvironmentVariables, config, {
      enableImplicitConversion: false,
    }),
    { skipMissingProperties: false, whitelist: false },
  );

  if (errors.length) {
    const details = errors
      .map((error) => {
        const reasons = Object.values(error.constraints ?? {}).join(', ');
        return `  - ${error.property}: ${reasons}`;
      })
      .join('\n');

    throw new Error(
      `Invalid environment configuration:\n${details}\n` +
        `Check your env file or the variables injected by your platform. ` +
        `See .env.example for the full list.`,
    );
  }

  // Return the untouched config so ConfigService still exposes every variable,
  // not just the ones declared above.
  return config;
};
