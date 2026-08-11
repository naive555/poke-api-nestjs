import { Test, TestingModule } from '@nestjs/testing';

import { CreateUserDto } from '../user/dto/user.dto';
import { User } from '../user/user.entity';
import { AuthController } from './auth.controller';
import { IAuthPayload } from './auth.interface';
import { AuthService } from './auth.service';

const mockAuthService = {
  login: jest.fn(),
  register: jest.fn(),
  clearTokenCache: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('passes the user attached by the guard to the service', async () => {
      const user = { id: 'user-1', username: 'testuser' } as User;
      const token = { accessToken: 'token' };
      mockAuthService.login.mockResolvedValue(token);

      await expect(controller.login({ user })).resolves.toEqual(token);
      expect(mockAuthService.login).toHaveBeenCalledWith(user);
    });
  });

  describe('register', () => {
    it('delegates the dto to the service', async () => {
      const dto: CreateUserDto = { username: 'testuser', password: 'secret' };
      const token = { accessToken: 'token' };
      mockAuthService.register.mockResolvedValue(token);

      await expect(controller.register(dto)).resolves.toEqual(token);
      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('logout', () => {
    it('clears the token cache for the authenticated payload', async () => {
      const payload: IAuthPayload = { sub: 'user-1', username: 'testuser' };
      mockAuthService.clearTokenCache.mockResolvedValue(undefined);

      await controller.logout(payload);

      expect(mockAuthService.clearTokenCache).toHaveBeenCalledWith(payload);
    });
  });
});
