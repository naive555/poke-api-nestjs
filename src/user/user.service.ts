import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Not, Repository } from 'typeorm';

import { EStatus } from '../utility/common.enum';
import { Encrypt } from '../utility/encrypt';
import { CreateUserDto, UpdateUserDto, UserQueryDto } from './dto/user.dto';
import { User } from './user.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(this.constructor.name);
  private readonly encrypt = new Encrypt(this.configService);

  constructor(
    private readonly configService: ConfigService,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async find(query: UserQueryDto): Promise<User[]> {
    this.logger.log({
      message: {
        function: this.find.name,
        data: { ...query },
      },
    });

    try {
      const findQuery = {
        status: Not(EStatus.DELETED),
      };

      if (query.username) {
        Object.assign(findQuery, { username: Like(`%${query.username}%`) });
      }

      return this.userRepository.find({
        where: findQuery,
        order: { createdAt: -1 },
        cache: true,
      });
    } catch (error) {
      this.logger.error({
        message: {
          function: this.find.name,
          message: error.message,
          data: { ...query },
        },
      });
      throw new InternalServerErrorException();
    }
  }

  async findByUsername(username: string): Promise<User> {
    this.logger.log({
      message: {
        function: this.findByUsername.name,
        data: { username },
      },
    });

    try {
      return this.userRepository.findOne({
        where: { username, status: EStatus.ENABLED },
        select: ['id', 'username', 'password'],
      });
    } catch (error) {
      this.logger.error({
        message: {
          function: this.findByUsername.name,
          message: error.message,
          data: { username },
        },
      });
      throw new InternalServerErrorException();
    }
  }

  async findById(id: number): Promise<User> {
    this.logger.log({
      message: {
        function: this.findById.name,
        data: { id },
      },
    });

    try {
      return this.userRepository.findOneBy({
        id,
        status: Not(EStatus.DELETED),
      });
    } catch (error) {
      this.logger.error({
        message: {
          function: this.findById.name,
          message: error.message,
          data: { id },
        },
      });
      throw new InternalServerErrorException();
    }
  }

  async create(userData: CreateUserDto): Promise<User> {
    this.logger.log({
      message: {
        function: this.create.name,
        data: { username: userData.username },
      },
    });

    await this.validateExistingUser(userData.username);

    try {
      const newUser = this.userRepository.create();
      newUser.username = userData.username;
      newUser.password = await this.encrypt.hashPassword(userData.password);

      const user = await this.userRepository.save(newUser);
      delete user.password;
      return user;
    } catch (error) {
      this.logger.error({
        message: {
          function: this.create.name,
          message: error.message,
          data: { username: userData.username },
        },
      });
      throw new InternalServerErrorException();
    }
  }

  async update(id: number, userData: UpdateUserDto): Promise<void> {
    this.logger.log({
      message: {
        function: this.update.name,
        data: { ...userData },
      },
    });

    await this.validateExistingUser(userData.username, id);

    try {
      await this.userRepository.update(id, userData);
    } catch (error) {
      this.logger.error({
        message: {
          function: this.update.name,
          message: error.message,
          data: { ...userData },
        },
      });
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

  async validateExistingUser(username: string, id?: number): Promise<void> {
    const existedUser = await this.userRepository.findOneBy({
      ...(id && { id: Not(id) }),
      username,
      status: Not(EStatus.DELETED),
    });
    if (existedUser) {
      throw new BadRequestException('User is already exists');
    }
  }
}
