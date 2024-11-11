import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  isCluster: process.env.REDIS_CLUSTER === 'true',
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  db: process.env.REDIS_DB,
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
}));
