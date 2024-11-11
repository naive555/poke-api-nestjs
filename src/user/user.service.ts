import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class UserService {
  async getUserByUsername(username: string) {
    if (username !== 'non_n') throw new NotFoundException('User not found');
    return { id: 1, username, password: '123456' };
  }
}
