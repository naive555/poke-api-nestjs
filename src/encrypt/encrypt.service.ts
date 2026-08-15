import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compare, genSalt, hash } from 'bcryptjs';

@Injectable()
export class EncryptService {
  constructor(private readonly configService: ConfigService) {}

  async hashPassword(password: string): Promise<string> {
    const saltRound = +this.configService.get<number>('bcrypt.saltRound');
    const salt = await genSalt(saltRound);

    return hash(password, salt);
  }

  async verify(text: string, encoded: string): Promise<boolean> {
    if (!text || !encoded) return false;

    return compare(text, encoded);
  }
}
