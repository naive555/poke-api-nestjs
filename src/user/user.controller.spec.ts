import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { CreateUserDto, UpdateUserDto, UserQueryDto } from './dto/user.dto';
import { User } from './user.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';

const mockUser = { id: 'user-1', username: 'testuser' } as User;

const mockUserService = {
  find: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('UserController', () => {
  let controller: UserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('find', () => {
    it('passes the query through to the service', async () => {
      const query: UserQueryDto = { username: 'testuser' };
      mockUserService.find.mockResolvedValue([mockUser]);

      await expect(controller.find(query)).resolves.toEqual([mockUser]);
      expect(mockUserService.find).toHaveBeenCalledWith(query);
    });
  });

  describe('findById', () => {
    it('returns the user when one is found', async () => {
      mockUserService.findById.mockResolvedValue(mockUser);

      await expect(controller.findById('user-1')).resolves.toEqual(mockUser);
      expect(mockUserService.findById).toHaveBeenCalledWith('user-1');
    });

    // The only branch in this controller that is not straight delegation: the
    // service reports "no such user" by returning null, and the 404 is the
    // controller's job.
    it('throws NotFoundException when the service finds nothing', async () => {
      mockUserService.findById.mockResolvedValue(null);

      await expect(controller.findById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('delegates the dto to the service', async () => {
      const dto: CreateUserDto = { username: 'testuser', password: 'secret' };
      mockUserService.create.mockResolvedValue(mockUser);

      await expect(controller.create(dto)).resolves.toEqual(mockUser);
      expect(mockUserService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('passes the id alongside the dto', async () => {
      const dto: UpdateUserDto = { username: 'renamed' };
      mockUserService.update.mockResolvedValue(undefined);

      await controller.update('user-1', dto);

      expect(mockUserService.update).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('delete', () => {
    it('passes the id to the service', async () => {
      mockUserService.delete.mockResolvedValue(undefined);

      await controller.delete('user-1');

      expect(mockUserService.delete).toHaveBeenCalledWith('user-1');
    });
  });
});
