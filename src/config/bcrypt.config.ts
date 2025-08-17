import { registerAs } from '@nestjs/config';

export default registerAs('bcrypt', () => ({
  saltRound: process.env.BCRYPT_SALT || 10,
}));
