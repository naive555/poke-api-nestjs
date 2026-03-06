import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { User } from '../user/user.entity';
import { UserService } from '../user/user.service';
import { USER_SESSION_KEY } from '../utility/common.constant';
import { EStatus } from '../utility/common.enum';
import { IAuthPayload } from './auth.interface';
import { AuthService } from './auth.service';

const mockUser: User = {
  id: 'uuid-1234',
  username: 'testuser',
  password: 'hashed_password',
  status: EStatus.ENABLED,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockAccessToken = 'mock.jwt.token';

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};

const mockUserService = {
  findByUsername: jest.fn(),
  create: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
};

const mockEncrypt = {
  verify: jest.fn(),
  hashPassword: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    (service as any).encrypt = mockEncrypt;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // -------------------------------------------------- //
  describe('validateUser', () => {
    it('should return user without password when credentials are valid', async () => {
      mockUserService.findByUsername.mockResolvedValue({ ...mockUser });
      mockEncrypt.verify.mockResolvedValue(true);

      const result = await service.validateUser('testuser', 'password123');

      expect(result).not.toHaveProperty('password');
      expect(result.username).toBe(mockUser.username);
      expect(mockUserService.findByUsername).toHaveBeenCalledWith('testuser');
    });

    it('should return null when user not found', async () => {
      mockUserService.findByUsername.mockResolvedValue(null);

      const result = await service.validateUser('unknown', 'password123');

      expect(result).toBeNull();
      expect(mockEncrypt.verify).not.toHaveBeenCalled();
    });

    it('should return null when password is invalid', async () => {
      mockUserService.findByUsername.mockResolvedValue({ ...mockUser });
      mockEncrypt.verify.mockResolvedValue(false);

      const result = await service.validateUser('testuser', 'wrongpassword');

      expect(result).toBeNull();
    });

    it('should throw BadRequestException when username or password is empty', async () => {
      await expect(service.validateUser('', 'password123')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateUser('testuser', '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      mockUserService.findByUsername.mockRejectedValue(new Error('DB error'));

      await expect(
        service.validateUser('testuser', 'password123'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  // -------------------------------------------------- //
  describe('login', () => {
    it('should return cached token when available', async () => {
      mockCacheManager.get.mockResolvedValue(mockAccessToken);

      const result = await service.login(mockUser);

      expect(result).toEqual({ accessToken: mockAccessToken });
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should generate and cache new token when no cache', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockJwtService.sign.mockReturnValue(mockAccessToken);
      mockConfigService.get.mockReturnValue({ expiresIn: 3600 });
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.login(mockUser);

      expect(result).toEqual({ accessToken: mockAccessToken });
      expect(mockJwtService.sign).toHaveBeenCalledTimes(1);
      expect(mockCacheManager.set).toHaveBeenCalledTimes(1);
    });

    it('should throw InternalServerErrorException on error', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Cache error'));

      await expect(service.login(mockUser)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // -------------------------------------------------- //
  describe('register', () => {
    it('should create user and return access token', async () => {
      const createDto = { username: 'newuser', password: 'password123' };
      const createdUser = { ...mockUser, username: 'newuser' };

      mockUserService.create.mockResolvedValue(createdUser);
      mockCacheManager.get.mockResolvedValue(null);
      mockJwtService.sign.mockReturnValue(mockAccessToken);
      mockConfigService.get.mockReturnValue({ expiresIn: 3600 });
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.register(createDto);

      expect(result).toEqual({ accessToken: mockAccessToken });
      expect(mockUserService.create).toHaveBeenCalledWith(createDto);
    });

    it('should propagate BadRequestException from userService.create', async () => {
      mockUserService.create.mockRejectedValue(
        new BadRequestException('User already exists'),
      );

      await expect(
        service.register({ username: 'existing', password: 'pass' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -------------------------------------------------- //
  describe('getTokenCache', () => {
    it('should return cached token', async () => {
      mockCacheManager.get.mockResolvedValue(mockAccessToken);

      const result = await service.getTokenCache('uuid-1234');

      expect(result).toBe(mockAccessToken);
      expect(mockCacheManager.get).toHaveBeenCalledWith(
        `${USER_SESSION_KEY}:uuid-1234`,
      );
    });

    it('should return null when no cache', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.getTokenCache('uuid-1234');

      expect(result).toBeNull();
    });

    it('should throw InternalServerErrorException on cache error', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Cache error'));

      await expect(service.getTokenCache('uuid-1234')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // -------------------------------------------------- //
  describe('setTokenCache', () => {
    it('should set token in cache with correct key and TTL', async () => {
      mockConfigService.get.mockReturnValue(3600);
      mockCacheManager.set.mockResolvedValue(undefined);

      await expect(
        service.setTokenCache('uuid-1234', mockAccessToken),
      ).resolves.toBeUndefined();
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        `${USER_SESSION_KEY}:uuid-1234`,
        mockAccessToken,
        3600000, // 3600 * 1000
      );
    });

    it('should throw InternalServerErrorException on cache error', async () => {
      mockConfigService.get.mockReturnValue(3600);
      mockCacheManager.set.mockRejectedValue(new Error('Cache error'));

      await expect(
        service.setTokenCache('uuid-1234', mockAccessToken),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  // -------------------------------------------------- //
  describe('clearTokenCache', () => {
    const authPayload: IAuthPayload = {
      sub: 'uuid-1234',
      username: 'testuser',
    };

    it('should delete token from cache', async () => {
      mockCacheManager.del.mockResolvedValue(undefined);

      await expect(
        service.clearTokenCache(authPayload),
      ).resolves.toBeUndefined();
      expect(mockCacheManager.del).toHaveBeenCalledWith(
        `${USER_SESSION_KEY}:uuid-1234`,
      );
    });

    it('should throw InternalServerErrorException on cache error', async () => {
      mockCacheManager.del.mockRejectedValue(new Error('Cache error'));

      await expect(service.clearTokenCache(authPayload)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // -------------------------------------------------- //
  describe('validatePassword', () => {
    it('should return true when password matches', async () => {
      mockEncrypt.verify.mockResolvedValue(true);

      const result = await service.validatePassword(
        'plaintext',
        'hashed_password',
      );

      expect(result).toBe(true);
      expect(mockEncrypt.verify).toHaveBeenCalledWith(
        'plaintext',
        'hashed_password',
      );
    });

    it('should return false when password does not match', async () => {
      mockEncrypt.verify.mockResolvedValue(false);

      const result = await service.validatePassword(
        'wrongpassword',
        'hashed_password',
      );

      expect(result).toBe(false);
    });
  });
});
