import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from './user.entity';
import { UserDto } from './dto/user.dto';
import { Encrypt } from '../utility/encrypt';
import { EStatus } from '../utility/common.enum';

@Injectable()
export class UserService {
  private readonly logger = new Logger(this.constructor.name);
  private readonly encrypt = new Encrypt(this.configService);

  constructor(
    private readonly configService: ConfigService,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getByUsername(username: string): Promise<User> {
    this.logger.log({
      message: {
        function: this.getByUsername.name,
        data: { username },
      },
    });

    try {
      return this.userRepository.findOneBy({ username });
    } catch (error) {
      this.logger.error({
        message: {
          function: this.getByUsername.name,
          message: error.message,
          data: { username },
        },
      });
      throw new InternalServerErrorException();
    }
  }

  async create(userData: UserDto): Promise<User> {
    this.logger.log({
      message: {
        function: this.create.name,
        data: { username: userData.username },
      },
    });

    try {
      const existedUser = await this.userRepository.findOneBy({
        username: userData.username,
      });
      if (existedUser) {
        throw new BadRequestException('User is already exists');
      }

      const newUser = this.userRepository.create();
      newUser.username = userData.username;
      newUser.password = await this.encrypt.hashPassword(userData.password);

      return this.userRepository.save(newUser);
    } catch (error) {
      this.logger.error({
        message: {
          function: this.create.name,
          message: error.message,
          data: { username: userData.username },
        },
      });
      if (error.status === 400) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException();
    }
  }

  async delete(userId: number): Promise<void> {
    this.logger.log({
      message: {
        function: this.delete.name,
        data: { userId },
      },
    });

    try {
      await this.userRepository.update(
        { id: userId },
        { status: EStatus.DELETED },
      );
    } catch (error) {
      this.logger.error({
        message: {
          function: this.delete.name,
          message: error.message,
          data: { userId },
        },
      });
      throw new InternalServerErrorException();
    }
  }
}
