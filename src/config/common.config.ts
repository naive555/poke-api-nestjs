import { registerAs } from '@nestjs/config';

export default registerAs('common', () => ({
  name: process.env.NAME || 'MKT Cloud One Id: SSO API',
  version: process.env.VERSION || '0.0.1',
  environment: process.env.NODE_ENV || 'development',
  port: +process.env.PORT || 3000,
  cors: process.env.CORS === 'true',
}));
