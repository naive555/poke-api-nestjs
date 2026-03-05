import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { omit } from 'lodash';
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
      message: { function: this.find.name, data: { ...query } },
    });

    try {
      const findQuery: Record<string, unknown> = {
        status: Not(EStatus.DELETED),
      };
      if (query.username) {
        findQuery.username = Like(`%${query.username}%`);
      }

      return await this.userRepository.find({
        where: findQuery,
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error({
        message: { function: this.find.name, error: error.message },
      });
      throw new InternalServerErrorException();
    }
  }

  async findByUsername(username: string): Promise<User> {
    this.logger.log({
      message: { function: this.findByUsername.name, data: { username } },
    });

    try {
      return await this.userRepository.findOne({
        where: { username, status: EStatus.ENABLED },
        select: { id: true, username: true, password: true },
      });
    } catch (error) {
      this.logger.error({
        message: { function: this.findByUsername.name, error: error.message },
      });
      throw new InternalServerErrorException();
    }
  }

  async findById(id: string): Promise<User> {
    this.logger.log({
      message: { function: this.findById.name, data: { id } },
    });

    try {
      return await this.userRepository.findOneBy({
        id,
        status: Not(EStatus.DELETED),
      });
    } catch (error) {
      this.logger.error({
        message: { function: this.findById.name, error: error.message },
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
      const newUser = this.userRepository.create({
        username: userData.username,
        password: await this.encrypt.hashPassword(userData.password),
      });

      const user = await this.userRepository.save(newUser);
      return omit(user, ['password']) as User;
    } catch (error) {
      this.logger.error({
        message: { function: this.create.name, error: error.message },
      });
      throw new InternalServerErrorException();
    }
  }

  async update(id: string, userData: UpdateUserDto): Promise<void> {
    this.logger.log({
      message: { function: this.update.name, data: { ...userData } },
    });

    await this.validateExistingUser(userData.username, id);

    try {
      const updateData = { ...userData };
      if (userData.password) {
        updateData.password = await this.encrypt.hashPassword(
          userData.password,
        );
      }
      await this.userRepository.update(id, updateData);
    } catch (error) {
      this.logger.error({
        message: { function: this.update.name, error: error.message },
      });
      throw new InternalServerErrorException();
    }
  }

  async delete(userId: string): Promise<void> {
    this.logger.log({
      message: { function: this.delete.name, data: { userId } },
    });

    try {
      await this.userRepository.update(
        { id: userId },
        { status: EStatus.DELETED },
      );
    } catch (error) {
      this.logger.error({
        message: { function: this.delete.name, error: error.message },
      });
      throw new InternalServerErrorException();
    }
  }

  async validateExistingUser(username: string, id?: string): Promise<void> {
    const isUserExists = await this.userRepository.exists({
      where: {
        ...(id && { id: Not(id) }),
        username,
        status: Not(EStatus.DELETED),
      },
    });
    if (isUserExists) {
      throw new BadRequestException('User is already exists');
    }
  }
}
