import { ConfigService } from '@nestjs/config';
import { compare, genSalt, hash } from 'bcrypt';

export class Encrypt {
  constructor(private readonly configService: ConfigService) {}

  async encode(s: string): Promise<string> {
    try {
      if (!s) throw new Error('Value for encrypt is empty.');

      const encoded = await hash(s, 10);
      if (!encoded) throw new Error('Encrypted value is invalid.');

      return encoded;
    } catch (error) {
      throw error;
    }
  }

  async verify(s: string, encoded: string): Promise<boolean> {
    if (!s || !encoded) return Promise.resolve(false);

    try {
      return compare(s, encoded);
    } catch (error) {
      throw error;
    }
  }

  async hashPassword(password: string) {
    try {
      const saltRound = this.configService.get('bcrypt.saltRound') as number;
      const salt = await genSalt(Number(saltRound));
      const hashpw = await hash(password, salt);

      return Promise.resolve(hashpw);
    } catch (error) {
      throw error;
    }
  }
}
