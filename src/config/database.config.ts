import { registerAs } from '@nestjs/config';

import { ISqlConfig } from '../utility/common.interface';

export default registerAs<ISqlConfig>('database', () => ({
  type: process.env.DATABASE_TYPE || 'mysql',
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_DATABASE,
  port: +process.env.DATABASE_PORT,
  logging: process.env.DATABASE_LOGGING === 'true',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrationsRun: process.env.DATABASE_MIGRATIONS_RUN === 'true',
  synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
}));
