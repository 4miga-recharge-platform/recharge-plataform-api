import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '../user.controller';
import { UserService } from '../user.service';
import { UserCleanupService } from '../user-cleanup.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../entities/user.entity';

describe('UserController', () => {
  let controller: UserController;
  let userService: any;
  let userCleanupService: any;

  const mockUser: User = {
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '5511988887777',
    password: 'hashedPassword123',
    documentType: 'cpf',
    documentValue: '123.456.789-00',
    role: 'USER',
    createdAt: new Date(),
    updatedAt: new Date(),
    storeId: 'store-123',
  };

  const createUserDto: CreateUserDto = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '5511988887777',
    password: 'password123',
    documentType: 'cpf',
    documentValue: '123.456.789-00',
    role: 'USER',
    storeId: 'store-123',
  };

  const updateUserDto: UpdateUserDto = {
    name: 'Jane Doe',
    email: 'jane@example.com',
  };

  beforeEach(async () => {
    const mockUserService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const mockUserCleanupService = {
      manualCleanup: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: UserCleanupService,
          useValue: mockUserCleanupService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get(UserService);
    userCleanupService = module.get(UserCleanupService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all users for a store', async () => {
      const storeId = 'store-123';
      const expectedUsers = [mockUser];

      userService.findAll.mockResolvedValue(expectedUsers);

      const result = await controller.findAll(storeId);

      expect(userService.findAll).toHaveBeenCalledWith(storeId);
      expect(result).toEqual(expectedUsers);
    });

    it('should handle empty storeId', async () => {
      const storeId = '';
      const expectedUsers = [];

      userService.findAll.mockResolvedValue(expectedUsers);

      const result = await controller.findAll(storeId);

      expect(userService.findAll).toHaveBeenCalledWith(storeId);
      expect(result).toEqual(expectedUsers);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      const userId = 'user-123';

      userService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne(userId);

      expect(userService.findOne).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockUser);
    });

    it('should handle invalid user id', async () => {
      const userId = 'invalid-id';

      userService.findOne.mockRejectedValue(new Error('User not found'));

      await expect(controller.findOne(userId)).rejects.toThrow('User not found');

      expect(userService.findOne).toHaveBeenCalledWith(userId);
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      userService.create.mockResolvedValue(mockUser);

      const result = await controller.create(createUserDto);

      expect(userService.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(mockUser);
    });

    it('should handle creation with minimal data', async () => {
      const minimalCreateDto: CreateUserDto = {
        name: 'Minimal User',
        email: 'minimal@example.com',
        phone: '5511988887777',
        password: 'password123',
        documentType: 'cpf',
        documentValue: '123.456.789-00',
        storeId: 'store-123',
      };

      const createdUser = { ...mockUser, ...minimalCreateDto };
      userService.create.mockResolvedValue(createdUser);

      const result = await controller.create(minimalCreateDto);

      expect(userService.create).toHaveBeenCalledWith(minimalCreateDto);
      expect(result).toEqual(createdUser);
    });

    it('should handle creation error', async () => {
      userService.create.mockRejectedValue(new Error('Creation failed'));

      await expect(controller.create(createUserDto)).rejects.toThrow('Creation failed');

      expect(userService.create).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const userId = 'user-123';
      const updatedUser = { ...mockUser, ...updateUserDto };

      userService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(userId, updateUserDto);

      expect(userService.update).toHaveBeenCalledWith(userId, updateUserDto);
      expect(result).toEqual(updatedUser);
    });

    it('should handle partial update', async () => {
      const userId = 'user-123';
      const partialUpdateDto: UpdateUserDto = {
        name: 'Updated Name',
      };
      const updatedUser = { ...mockUser, name: 'Updated Name' };

      userService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(userId, partialUpdateDto);

      expect(userService.update).toHaveBeenCalledWith(userId, partialUpdateDto);
      expect(result).toEqual(updatedUser);
    });

    it('should handle update with password', async () => {
      const userId = 'user-123';
      const updateWithPassword: UpdateUserDto = {
        name: 'Jane Doe',
        password: 'newPassword123',
      };
      const updatedUser = { ...mockUser, name: 'Jane Doe' };

      userService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(userId, updateWithPassword);

      expect(userService.update).toHaveBeenCalledWith(userId, updateWithPassword);
      expect(result).toEqual(updatedUser);
    });

    it('should handle update error', async () => {
      const userId = 'user-123';

      userService.update.mockRejectedValue(new Error('Update failed'));

      await expect(controller.update(userId, updateUserDto)).rejects.toThrow('Update failed');

      expect(userService.update).toHaveBeenCalledWith(userId, updateUserDto);
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      const userId = 'user-123';

      userService.remove.mockResolvedValue(mockUser);

      const result = await controller.remove(userId);

      expect(userService.remove).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockUser);
    });

    it('should handle removal error', async () => {
      const userId = 'user-123';

      userService.remove.mockRejectedValue(new Error('Removal failed'));

      await expect(controller.remove(userId)).rejects.toThrow('Removal failed');

      expect(userService.remove).toHaveBeenCalledWith(userId);
    });
  });

  describe('cleanupUnverifiedUsers', () => {
    it('should trigger manual cleanup and return success message', async () => {
      userCleanupService.manualCleanup.mockResolvedValue(undefined);

      const result = await controller.cleanupUnverifiedUsers();

      expect(userCleanupService.manualCleanup).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Cleanup process completed' });
    });

    it('should handle cleanup error', async () => {
      userCleanupService.manualCleanup.mockRejectedValue(new Error('Cleanup failed'));

      await expect(controller.cleanupUnverifiedUsers()).rejects.toThrow('Cleanup failed');

      expect(userCleanupService.manualCleanup).toHaveBeenCalled();
    });
  });
});
