import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '../user.controller';
import { UserService } from '../user.service';
import { UserCleanupService } from '../user-cleanup.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../entities/user.entity';
import { ConfirmRoleChangeDto } from '../dto/confirm-role-change.dto';

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
      findEmailsByStore: jest.fn(),
      findAdminsByStore: jest.fn(),
      promoteToAdmin: jest.fn(),
      demoteToUser: jest.fn(),
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

  describe('findEmails', () => {
    it('should return all user emails for the logged admin store', async () => {
      const loggedUser = { ...mockUser, role: 'RESELLER_ADMIN_4MIGA_USER' };
      const expectedEmails = [
        { id: 'user-1', email: 'user1@example.com' },
        { id: 'user-2', email: 'user2@example.com' },
      ];

      userService.findEmailsByStore.mockResolvedValue(expectedEmails);

      const result = await controller.findEmails(loggedUser as User);

      expect(userService.findEmailsByStore).toHaveBeenCalledWith(loggedUser.storeId, undefined);
      expect(result).toEqual(expectedEmails);
    });

    it('should return filtered emails when search parameter is provided', async () => {
      const loggedUser = { ...mockUser, role: 'RESELLER_ADMIN_4MIGA_USER' };
      const search = 'john';
      const expectedEmails = [
        { id: 'user-1', email: 'john@example.com' },
      ];

      userService.findEmailsByStore.mockResolvedValue(expectedEmails);

      const result = await controller.findEmails(loggedUser as User, search);

      expect(userService.findEmailsByStore).toHaveBeenCalledWith(loggedUser.storeId, search);
      expect(result).toEqual(expectedEmails);
    });

    it('should handle error when fetching emails', async () => {
      const loggedUser = { ...mockUser, role: 'RESELLER_ADMIN_4MIGA_USER' };

      userService.findEmailsByStore.mockRejectedValue(new Error('Failed to fetch emails'));

      await expect(controller.findEmails(loggedUser as User)).rejects.toThrow('Failed to fetch emails');

      expect(userService.findEmailsByStore).toHaveBeenCalledWith(loggedUser.storeId, undefined);
    });
  });

  describe('findAdmins', () => {
    it('should return all admin emails for the logged admin store', async () => {
      const loggedUser = { ...mockUser, role: 'RESELLER_ADMIN_4MIGA_USER' };
      const expectedAdmins = [
        { id: 'admin-1', email: 'admin1@example.com' },
        { id: 'admin-2', email: 'admin2@example.com' },
      ];

      userService.findAdminsByStore.mockResolvedValue(expectedAdmins);

      const result = await controller.findAdmins(loggedUser as User);

      expect(userService.findAdminsByStore).toHaveBeenCalledWith(loggedUser.storeId);
      expect(result).toEqual(expectedAdmins);
    });

    it('should handle error when fetching admins', async () => {
      const loggedUser = { ...mockUser, role: 'RESELLER_ADMIN_4MIGA_USER' };

      userService.findAdminsByStore.mockRejectedValue(new Error('Failed to fetch admins'));

      await expect(controller.findAdmins(loggedUser as User)).rejects.toThrow('Failed to fetch admins');

      expect(userService.findAdminsByStore).toHaveBeenCalledWith(loggedUser.storeId);
    });
  });

  describe('promoteToAdmin', () => {
    it('should promote a user to admin successfully', async () => {
      const loggedUser = { ...mockUser, role: 'RESELLER_ADMIN_4MIGA_USER' };
      const userToPromote = 'user-456';
      const promotedUser = { ...mockUser, id: userToPromote, role: 'RESELLER_ADMIN_4MIGA_USER' };

      userService.validatePassword = jest.fn().mockResolvedValue(true);
      userService.promoteToAdmin.mockResolvedValue(promotedUser);

      const confirmDto: ConfirmRoleChangeDto = { password: 'valid-pass' } as any;
      const result = await controller.promoteToAdmin(userToPromote, loggedUser as User, confirmDto);

      expect(userService.validatePassword).toHaveBeenCalledWith(loggedUser.id, confirmDto.password);
      expect(userService.promoteToAdmin).toHaveBeenCalledWith(userToPromote, loggedUser.storeId, loggedUser.id);
      expect(result).toEqual(promotedUser);
    });

    it('should handle error when user not found', async () => {
      const loggedUser = { ...mockUser, role: 'RESELLER_ADMIN_4MIGA_USER' };
      const userToPromote = 'invalid-user';

      userService.validatePassword = jest.fn().mockResolvedValue(true);
      userService.promoteToAdmin.mockRejectedValue(new Error('User not found'));

      const confirmDto: ConfirmRoleChangeDto = { password: 'valid-pass' } as any;
      await expect(controller.promoteToAdmin(userToPromote, loggedUser as User, confirmDto)).rejects.toThrow('User not found');

      expect(userService.validatePassword).toHaveBeenCalledWith(loggedUser.id, confirmDto.password);
      expect(userService.promoteToAdmin).toHaveBeenCalledWith(userToPromote, loggedUser.storeId, loggedUser.id);
    });

    it('should handle error when user is from different store', async () => {
      const loggedUser = { ...mockUser, role: 'RESELLER_ADMIN_4MIGA_USER' };
      const userToPromote = 'user-456';

      userService.validatePassword = jest.fn().mockResolvedValue(true);
      userService.promoteToAdmin.mockRejectedValue(new Error('Cannot promote users from different stores'));

      const confirmDto: ConfirmRoleChangeDto = { password: 'valid-pass' } as any;
      await expect(controller.promoteToAdmin(userToPromote, loggedUser as User, confirmDto)).rejects.toThrow('Cannot promote users from different stores');

      expect(userService.validatePassword).toHaveBeenCalledWith(loggedUser.id, confirmDto.password);
      expect(userService.promoteToAdmin).toHaveBeenCalledWith(userToPromote, loggedUser.storeId, loggedUser.id);
    });

    it('should handle error when user is already an admin', async () => {
      const loggedUser = { ...mockUser, role: 'RESELLER_ADMIN_4MIGA_USER' };
      const userToPromote = 'user-456';

      userService.validatePassword = jest.fn().mockResolvedValue(true);
      userService.promoteToAdmin.mockRejectedValue(new Error('User is already an admin'));

      const confirmDto: ConfirmRoleChangeDto = { password: 'valid-pass' } as any;
      await expect(controller.promoteToAdmin(userToPromote, loggedUser as User, confirmDto)).rejects.toThrow('User is already an admin');

      expect(userService.validatePassword).toHaveBeenCalledWith(loggedUser.id, confirmDto.password);
      expect(userService.promoteToAdmin).toHaveBeenCalledWith(userToPromote, loggedUser.storeId, loggedUser.id);
    });
  });

  describe('demoteToUser', () => {
    it('should demote an admin to user successfully', async () => {
      const loggedUser = { ...mockUser, role: 'RESELLER_ADMIN_4MIGA_USER' };
      const adminToDemote = 'admin-456';
      const demotedUser = { ...mockUser, id: adminToDemote, role: 'USER' };

      userService.validatePassword = jest.fn().mockResolvedValue(true);
      userService.demoteToUser.mockResolvedValue(demotedUser);

      const confirmDto: ConfirmRoleChangeDto = { password: 'valid-pass' } as any;
      const result = await controller.demoteToUser(adminToDemote, loggedUser as User, confirmDto);

      expect(userService.validatePassword).toHaveBeenCalledWith(loggedUser.id, confirmDto.password);
      expect(userService.demoteToUser).toHaveBeenCalledWith(adminToDemote, loggedUser.storeId, loggedUser.id);
      expect(result).toEqual(demotedUser);
    });

    it('should handle error when trying to demote self', async () => {
      const loggedUser = { ...mockUser, role: 'RESELLER_ADMIN_4MIGA_USER' };

      userService.validatePassword = jest.fn().mockResolvedValue(true);
      userService.demoteToUser.mockRejectedValue(new Error('Cannot demote yourself'));

      const confirmDto: ConfirmRoleChangeDto = { password: 'valid-pass' } as any;
      await expect(controller.demoteToUser(loggedUser.id, loggedUser as User, confirmDto)).rejects.toThrow('Cannot demote yourself');

      expect(userService.validatePassword).toHaveBeenCalledWith(loggedUser.id, confirmDto.password);
      expect(userService.demoteToUser).toHaveBeenCalledWith(loggedUser.id, loggedUser.storeId, loggedUser.id);
    });

    it('should handle error when admin not found', async () => {
      const loggedUser = { ...mockUser, role: 'RESELLER_ADMIN_4MIGA_USER' };
      const adminToDemote = 'invalid-admin';

      userService.validatePassword = jest.fn().mockResolvedValue(true);
      userService.demoteToUser.mockRejectedValue(new Error('User not found'));

      const confirmDto: ConfirmRoleChangeDto = { password: 'valid-pass' } as any;
      await expect(controller.demoteToUser(adminToDemote, loggedUser as User, confirmDto)).rejects.toThrow('User not found');

      expect(userService.validatePassword).toHaveBeenCalledWith(loggedUser.id, confirmDto.password);
      expect(userService.demoteToUser).toHaveBeenCalledWith(adminToDemote, loggedUser.storeId, loggedUser.id);
    });

    it('should handle error when admin is from different store', async () => {
      const loggedUser = { ...mockUser, role: 'RESELLER_ADMIN_4MIGA_USER' };
      const adminToDemote = 'admin-456';

      userService.validatePassword = jest.fn().mockResolvedValue(true);
      userService.demoteToUser.mockRejectedValue(new Error('Cannot demote users from different stores'));

      const confirmDto: ConfirmRoleChangeDto = { password: 'valid-pass' } as any;
      await expect(controller.demoteToUser(adminToDemote, loggedUser as User, confirmDto)).rejects.toThrow('Cannot demote users from different stores');

      expect(userService.validatePassword).toHaveBeenCalledWith(loggedUser.id, confirmDto.password);
      expect(userService.demoteToUser).toHaveBeenCalledWith(adminToDemote, loggedUser.storeId, loggedUser.id);
    });

    it('should handle error when user is not a reseller admin', async () => {
      const loggedUser = { ...mockUser, role: 'RESELLER_ADMIN_4MIGA_USER' };
      const adminToDemote = 'user-456';

      userService.validatePassword = jest.fn().mockResolvedValue(true);
      userService.demoteToUser.mockRejectedValue(new Error('User is not a reseller admin'));

      const confirmDto: ConfirmRoleChangeDto = { password: 'valid-pass' } as any;
      await expect(controller.demoteToUser(adminToDemote, loggedUser as User, confirmDto)).rejects.toThrow('User is not a reseller admin');

      expect(userService.validatePassword).toHaveBeenCalledWith(loggedUser.id, confirmDto.password);
      expect(userService.demoteToUser).toHaveBeenCalledWith(adminToDemote, loggedUser.storeId, loggedUser.id);
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
