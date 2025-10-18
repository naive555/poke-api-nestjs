import { ConfigService } from '@nestjs/config';
import { compare, genSalt, hash } from 'bcryptjs';

export class Encrypt {
  constructor(private readonly configService: ConfigService) {}

  async encode(text: string): Promise<string> {
    try {
      if (!text) throw new Error('Value for encrypt is empty.');

      const encoded = await hash(text, 10);
      if (!encoded) throw new Error('Encrypted value is invalid.');

      return encoded;
    } catch (error) {
      throw error;
    }
  }

  async verify(text: string, encoded: string): Promise<boolean> {
    if (!text || !encoded) return false;

    try {
      return compare(text, encoded);
    } catch (error) {
      throw error;
    }
  }

  async hashPassword(password: string) {
    try {
      const saltRound = this.configService.get<number>('bcrypt.saltRound');
      const salt = await genSalt(saltRound);
      const hashpw = await hash(password, salt);

      return hashpw;
    } catch (error) {
      throw error;
    }
  }
}
