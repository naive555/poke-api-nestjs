import { registerAs } from '@nestjs/config';

// Both globs are anchored to this file, so they resolve under `src/` when the
// app runs from TypeScript and under `dist/` once it is compiled.
const ENTITIES_GLOB = __dirname + '/../**/*.entity{.ts,.js}';
const MIGRATIONS_GLOB = __dirname + '/../database/migrations/*{.ts,.js}';

/**
 * The single source of truth for connection options. Nest reads it through
 * `registerAs` below; the TypeORM CLI reads it through
 * `src/database/data-source.ts`, so both see the same env vars and the same
 * migrations directory.
 */
export const buildSqlConfig = (): ISqlConfig => ({
  type: process.env.DATABASE_TYPE || 'postgres',
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_DB,
  port: +process.env.DATABASE_PORT,
  logging: process.env.DATABASE_LOGGING === 'true',
  entities: [ENTITIES_GLOB],
  migrations: [MIGRATIONS_GLOB],
  migrationsRun: process.env.DATABASE_MIGRATIONS_RUN === 'true',
  synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
});

export default registerAs<ISqlConfig>('database', buildSqlConfig);

export interface ISqlConfig {
  type: string;
  host: string;
  username: string;
  password: string;
  database: string;
  port: number;
  logging: boolean;
  entities: string[];
  migrations: string[];
  migrationsRun: boolean;
  synchronize: boolean;
}
