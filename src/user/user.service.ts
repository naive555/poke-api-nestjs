import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { omit } from 'lodash';
import { Like, Not, Repository } from 'typeorm';

import { EncryptService } from '../encrypt/encrypt.service';
import { EStatus } from '../utility/common.enum';
import { CreateUserDto, UpdateUserDto, UserQueryDto } from './dto/user.dto';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    private readonly encrypt: EncryptService,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async find(query: UserQueryDto): Promise<User[]> {
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
      throw new InternalServerErrorException(undefined, { cause: error });
    }
  }

  async findByUsername(username: string): Promise<User> {
    try {
      return await this.userRepository.findOne({
        where: { username, status: EStatus.ENABLED },
        select: { id: true, username: true, password: true },
      });
    } catch (error) {
      throw new InternalServerErrorException(undefined, { cause: error });
    }
  }

  async findById(id: string): Promise<User> {
    try {
      return await this.userRepository.findOneBy({
        id,
        status: Not(EStatus.DELETED),
      });
    } catch (error) {
      throw new InternalServerErrorException(undefined, { cause: error });
    }
  }

  async create(userData: CreateUserDto): Promise<User> {
    await this.validateExistingUser(userData.username);

    try {
      const newUser = this.userRepository.create({
        username: userData.username,
        password: await this.encrypt.hashPassword(userData.password),
      });

      const user = await this.userRepository.save(newUser);
      return omit(user, ['password']) as User;
    } catch (error) {
      throw new InternalServerErrorException(undefined, { cause: error });
    }
  }

  async update(id: string, userData: UpdateUserDto): Promise<void> {
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
      throw new InternalServerErrorException(undefined, { cause: error });
    }
  }

  async delete(userId: string): Promise<void> {
    try {
      await this.userRepository.update(
        { id: userId },
        { status: EStatus.DELETED },
      );
    } catch (error) {
      throw new InternalServerErrorException(undefined, { cause: error });
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
