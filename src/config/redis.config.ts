import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  isCluster: process.env.REDIS_CLUSTER === 'true',
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT || 6379),
  db: Number(process.env.REDIS_DB || 0),
  username: process.env.REDIS_USERNAME || undefined,
  password: process.env.REDIS_PASSWORD || undefined,
}));
