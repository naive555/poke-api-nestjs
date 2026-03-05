import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Like, Not } from 'typeorm';

import { EStatus } from '../utility/common.enum';
import { Encrypt } from '../utility/encrypt';
import { CreateUserDto, UpdateUserDto, UserQueryDto } from './dto/user.dto';
import { User } from './user.entity';
import { UserService } from './user.service';

const mockUser: User = {
  id: 'uuid-1234',
  username: 'testuser',
  password: 'hashed_password',
  status: EStatus.ENABLED,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockUserRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  exists: jest.fn(),
};

const mockConfigService = { get: jest.fn() };
const mockEncrypt = { hashPassword: jest.fn() };

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    })
      .overrideProvider(Encrypt)
      .useValue(mockEncrypt)
      .compile();

    service = module.get<UserService>(UserService);
    (service as any).encrypt = mockEncrypt;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // -------------------------------------------------- //
  describe('find', () => {
    it('should return all users without username filter', async () => {
      const query: UserQueryDto = {};
      mockUserRepository.find.mockResolvedValue([mockUser]);

      const result = await service.find(query);

      expect(result).toEqual([mockUser]);
      expect(mockUserRepository.find).toHaveBeenCalledWith({
        where: { status: Not(EStatus.DELETED) },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return filtered users with username query', async () => {
      const query: UserQueryDto = { username: 'test' };
      mockUserRepository.find.mockResolvedValue([mockUser]);

      const result = await service.find(query);

      expect(result).toEqual([mockUser]);
      expect(mockUserRepository.find).toHaveBeenCalledWith({
        where: { status: Not(EStatus.DELETED), username: Like('%test%') },
        order: { createdAt: 'DESC' },
      });
    });

    it('should throw InternalServerErrorException on error', async () => {
      mockUserRepository.find.mockRejectedValue(new Error('DB error'));

      await expect(service.find({})).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // -------------------------------------------------- //
  describe('findByUsername', () => {
    it('should return user with password field', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByUsername('testuser');

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'testuser', status: EStatus.ENABLED },
        select: { id: true, username: true, password: true },
      });
    });

    it('should return null when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findByUsername('unknown');

      expect(result).toBeNull();
    });

    it('should throw InternalServerErrorException on error', async () => {
      mockUserRepository.findOne.mockRejectedValue(new Error('DB error'));

      await expect(service.findByUsername('testuser')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // -------------------------------------------------- //
  describe('findById', () => {
    it('should return user by id', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);

      const result = await service.findById('uuid-1234');

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({
        id: 'uuid-1234',
        status: Not(EStatus.DELETED),
      });
    });

    it('should return null when user not found', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      const result = await service.findById('unknown-uuid');

      expect(result).toBeNull();
    });

    it('should throw InternalServerErrorException on error', async () => {
      mockUserRepository.findOneBy.mockRejectedValue(new Error('DB error'));

      await expect(service.findById('uuid-1234')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // -------------------------------------------------- //
  describe('create', () => {
    const createDto: CreateUserDto = {
      username: 'newuser',
      password: 'password123',
    };

    it('should create and return user without password', async () => {
      mockUserRepository.exists.mockResolvedValue(false);
      mockEncrypt.hashPassword.mockResolvedValue('hashed_password');
      mockUserRepository.create.mockReturnValue({ ...mockUser });
      mockUserRepository.save.mockResolvedValue({ ...mockUser });

      const result = await service.create(createDto);

      expect(result).not.toHaveProperty('password');
      expect(result.username).toBe(mockUser.username);
      expect(mockEncrypt.hashPassword).toHaveBeenCalledWith('password123');
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when username already exists', async () => {
      mockUserRepository.exists.mockResolvedValue(true);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException on DB error', async () => {
      mockUserRepository.exists.mockResolvedValue(false);
      mockEncrypt.hashPassword.mockResolvedValue('hashed_password');
      mockUserRepository.create.mockReturnValue({ ...mockUser });
      mockUserRepository.save.mockRejectedValue(new Error('DB error'));

      await expect(service.create(createDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // -------------------------------------------------- //
  describe('update', () => {
    const updateDto: UpdateUserDto = {
      username: 'updateduser',
      password: 'newpassword',
    };

    it('should update user successfully', async () => {
      mockUserRepository.exists.mockResolvedValue(false);
      mockEncrypt.hashPassword.mockResolvedValue('new_hashed_password');
      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      await expect(
        service.update('uuid-1234', updateDto),
      ).resolves.toBeUndefined();
      expect(mockEncrypt.hashPassword).toHaveBeenCalledWith('newpassword');
      expect(mockUserRepository.update).toHaveBeenCalledWith('uuid-1234', {
        username: 'updateduser',
        password: 'new_hashed_password',
      });
    });

    it('should update without hashing when no password provided', async () => {
      const dtoWithoutPassword: UpdateUserDto = {
        username: 'updateduser',
        password: undefined,
      };
      mockUserRepository.exists.mockResolvedValue(false);
      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      await service.update('uuid-1234', dtoWithoutPassword);

      expect(mockEncrypt.hashPassword).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when username already taken', async () => {
      mockUserRepository.exists.mockResolvedValue(true);

      await expect(service.update('uuid-1234', updateDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException on DB error', async () => {
      mockUserRepository.exists.mockResolvedValue(false);
      mockEncrypt.hashPassword.mockResolvedValue('hashed');
      mockUserRepository.update.mockRejectedValue(new Error('DB error'));

      await expect(service.update('uuid-1234', updateDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // -------------------------------------------------- //
  describe('delete', () => {
    it('should soft delete user by setting status to DELETED', async () => {
      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      await expect(service.delete('uuid-1234')).resolves.toBeUndefined();
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        { id: 'uuid-1234' },
        { status: EStatus.DELETED },
      );
    });

    it('should throw InternalServerErrorException on DB error', async () => {
      mockUserRepository.update.mockRejectedValue(new Error('DB error'));

      await expect(service.delete('uuid-1234')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // -------------------------------------------------- //
  describe('validateExistingUser', () => {
    it('should pass when user does not exist', async () => {
      mockUserRepository.exists.mockResolvedValue(false);

      await expect(
        service.validateExistingUser('newuser'),
      ).resolves.toBeUndefined();
    });

    it('should pass when updating same user (exclude own id)', async () => {
      mockUserRepository.exists.mockResolvedValue(false);

      await expect(
        service.validateExistingUser('testuser', 'uuid-1234'),
      ).resolves.toBeUndefined();
      expect(mockUserRepository.exists).toHaveBeenCalledWith({
        where: {
          id: Not('uuid-1234'),
          username: 'testuser',
          status: Not(EStatus.DELETED),
        },
      });
    });

    it('should throw BadRequestException when user already exists', async () => {
      mockUserRepository.exists.mockResolvedValue(true);

      await expect(service.validateExistingUser('testuser')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
