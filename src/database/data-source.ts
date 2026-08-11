import { config as loadEnvFile } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

import { buildSqlConfig } from '../config/database.config';
import { getEnvFilePath } from '../utility/common.function';

// The TypeORM CLI runs outside Nest, so nothing has populated process.env yet.
// dotenv never overwrites a variable that is already set, which is what lets a
// container or CI job inject credentials without an env file on disk.
loadEnvFile({ path: getEnvFilePath(process.env.NODE_ENV) });

// `buildSqlConfig` types `type` as a plain string because it is read from the
// environment; DataSourceOptions wants the literal driver union.
export default new DataSource(buildSqlConfig() as DataSourceOptions);
