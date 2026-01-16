import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../entities/user.entity';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword123'),
}));

// Mock validation utility
jest.mock('../../utils/validation.util', () => ({
  validateRequiredFields: jest.fn().mockReturnValue(true),
}));

// Mock email template
jest.mock('../../email/templates/email-confirmation.template', () => ({
  getEmailConfirmationTemplate: jest
    .fn()
    .mockReturnValue('<html>Email template</html>'),
}));

// Mock account created template
jest.mock('../../email/templates/account-created.template', () => ({
  getAccountCreatedTemplate: jest
    .fn()
    .mockReturnValue('<html>Account created template</html>'),
}));

describe('UserService', () => {
  let service: UserService;
  let prismaService: any;
  let emailService: any;
  let jwtService: any;

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

  const mockUserSelect = {
    id: true,
    name: true,
    email: true,
    role: false, // Role is private to backend and should not be returned in GET routes
    phone: true,
    documentType: true,
    documentValue: true,
    emailVerified: true,
    password: false,
    createdAt: false,
    updatedAt: false,
    storeId: true,
    rechargeBigoId: true,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      store: {
        findUnique: jest.fn(),
      },
    };

    const mockEmailService = {
      sendEmail: jest.fn(),
    };

    const mockJwtService = {
      signAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prismaService = module.get(PrismaService);
    emailService = module.get(EmailService);
    jwtService = module.get(JwtService);

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

      prismaService.user.findMany.mockResolvedValue(expectedUsers);

      const result = await service.findAll(storeId);

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: { storeId },
        select: mockUserSelect,
      });
      expect(result).toEqual(expectedUsers);
    });

    it('should throw BadRequestException when database error occurs', async () => {
      const storeId = 'store-123';

      prismaService.user.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findAll(storeId)).rejects.toThrow(
        new BadRequestException('Failed to fetch users'),
      );
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      const userId = 'user-123';

      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne(userId);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: mockUserSelect,
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw BadRequestException when user not found', async () => {
      const userId = 'user-123';

      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne(userId)).rejects.toThrow(
        new BadRequestException('Failed to fetch user'),
      );
    });

    it('should throw BadRequestException when database error occurs', async () => {
      const userId = 'user-123';

      prismaService.user.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findOne(userId)).rejects.toThrow(
        new BadRequestException('Failed to fetch user'),
      );
    });
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '5511988887777',
      password: 'password123',
      documentType: 'cpf',
      documentValue: '123.456.789-00',
      storeId: 'store-123',
    };

    it('should create a new user successfully', async () => {
      const { validateRequiredFields } = require('../../utils/validation.util');
      const {
        getEmailConfirmationTemplate,
      } = require('../../email/templates/email-confirmation.template');

      // Mock findFirst to return null (user doesn't exist)
      prismaService.user.findFirst.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue(mockUser);
      prismaService.store.findUnique.mockResolvedValue({
        domain: 'https://www.example.com',
      });
      emailService.sendEmail.mockResolvedValue({} as any);

      const result = await service.create(createUserDto);

      expect(validateRequiredFields).toHaveBeenCalledWith(createUserDto, [
        'name',
        'email',
        'phone',
        'password',
        'documentType',
        'documentValue',
        'storeId',
      ]);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: createUserDto.name,
          email: createUserDto.email,
          phone: createUserDto.phone,
          password: 'hashedPassword123',
          documentType: createUserDto.documentType,
          documentValue: createUserDto.documentValue,
          role: 'USER',
          storeId: createUserDto.storeId,
          emailConfirmationCode: expect.any(String),
          emailVerified: false,
          emailConfirmationExpires: expect.any(Date),
        }),
        select: mockUserSelect,
      });

      expect(getEmailConfirmationTemplate).toHaveBeenCalledWith(
        expect.any(String),
        createUserDto.name,
        'https://www.example.com',
        createUserDto.email,
        createUserDto.storeId,
      );

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        createUserDto.email,
        'Confirm your registration',
        '<html>Email template</html>',
      );

      expect(result).toEqual(mockUser);
    });

    it('should throw BadRequestException when database error occurs', async () => {
      prismaService.user.create.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createUserDto)).rejects.toThrow(
        new BadRequestException('Failed to create user'),
      );
    });
  });

  describe('createDirect', () => {
    const createUserDto: CreateUserDto = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '5511988887777',
      password: 'password123',
      documentType: 'cpf',
      documentValue: '123.456.789-00',
      storeId: 'store-123',
    };

    const mockUserWithRechargeBigoId = {
      ...mockUser,
      rechargeBigoId: null,
    };

    it('should create a new user with emailVerified: true and return tokens', async () => {
      const { validateRequiredFields } = require('../../utils/validation.util');
      const {
        getAccountCreatedTemplate,
      } = require('../../email/templates/account-created.template');

      // Mock findFirst to return null (user doesn't exist)
      prismaService.user.findFirst.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue(mockUserWithRechargeBigoId);
      prismaService.store.findUnique.mockResolvedValue({
        domain: 'https://www.example.com',
      });
      emailService.sendEmail.mockResolvedValue({} as any);
      jwtService.signAsync
        .mockResolvedValueOnce('access-token-123')
        .mockResolvedValueOnce('refresh-token-123');

      const result = await service.createDirect(createUserDto);

      expect(validateRequiredFields).toHaveBeenCalledWith(createUserDto, [
        'name',
        'email',
        'phone',
        'password',
        'documentType',
        'documentValue',
        'storeId',
      ]);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: createUserDto.name,
          email: createUserDto.email,
          phone: createUserDto.phone,
          password: 'hashedPassword123',
          documentType: createUserDto.documentType,
          documentValue: createUserDto.documentValue,
          role: 'USER',
          storeId: createUserDto.storeId,
          emailVerified: true,
          emailConfirmationCode: null,
          emailConfirmationExpires: null,
        }),
        select: mockUserSelect,
      });

      expect(getAccountCreatedTemplate).toHaveBeenCalledWith(
        createUserDto.name,
        createUserDto.email,
        'https://www.example.com',
      );

      // sendEmailWithRetry calls emailService.sendEmail internally
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        createUserDto.email,
        'Conta criada com sucesso',
        '<html>Account created template</html>',
      );

      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        {
          id: mockUserWithRechargeBigoId.id,
          storeId: mockUserWithRechargeBigoId.storeId,
          email: mockUserWithRechargeBigoId.email,
          phone: mockUserWithRechargeBigoId.phone,
          rechargeBigoId: null,
          documentType: mockUserWithRechargeBigoId.documentType,
          documentValue: mockUserWithRechargeBigoId.documentValue,
          name: mockUserWithRechargeBigoId.name,
        },
        { expiresIn: '10m' },
      );
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        2,
        {
          id: mockUserWithRechargeBigoId.id,
          storeId: mockUserWithRechargeBigoId.storeId,
          email: mockUserWithRechargeBigoId.email,
          phone: mockUserWithRechargeBigoId.phone,
          rechargeBigoId: null,
          documentType: mockUserWithRechargeBigoId.documentType,
          documentValue: mockUserWithRechargeBigoId.documentValue,
          name: mockUserWithRechargeBigoId.name,
        },
        { expiresIn: '7d' },
      );

      expect(result).toEqual({
        access: {
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-123',
          expiresIn: 600,
        },
        user: {
          id: mockUserWithRechargeBigoId.id,
          storeId: mockUserWithRechargeBigoId.storeId,
          email: mockUserWithRechargeBigoId.email,
          phone: mockUserWithRechargeBigoId.phone,
          rechargeBigoId: null,
          documentType: mockUserWithRechargeBigoId.documentType,
          documentValue: mockUserWithRechargeBigoId.documentValue,
          name: mockUserWithRechargeBigoId.name,
        },
      });
    });

    it('should throw BadRequestException when email already exists', async () => {
      prismaService.user.findFirst.mockResolvedValue(mockUser);

      await expect(service.createDirect(createUserDto)).rejects.toThrow(
        new BadRequestException('User with this email already exists'),
      );

      expect(prismaService.user.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when document already exists', async () => {
      prismaService.user.findFirst
        .mockResolvedValueOnce(null) // First call for email check
        .mockResolvedValueOnce(mockUser); // Second call for document check

      await expect(service.createDirect(createUserDto)).rejects.toThrow(
        new BadRequestException('User with this document already exists'),
      );

      expect(prismaService.user.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when store not found', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue(mockUserWithRechargeBigoId);
      prismaService.store.findUnique.mockResolvedValue(null);

      await expect(service.createDirect(createUserDto)).rejects.toThrow(
        new BadRequestException('Store not found'),
      );
    });

    it('should use getAccountCreatedTemplate instead of email confirmation template', async () => {
      const {
        getAccountCreatedTemplate,
      } = require('../../email/templates/account-created.template');
      const {
        getEmailConfirmationTemplate,
      } = require('../../email/templates/email-confirmation.template');

      prismaService.user.findFirst.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue(mockUserWithRechargeBigoId);
      prismaService.store.findUnique.mockResolvedValue({
        domain: 'https://www.example.com',
      });
      emailService.sendEmail.mockResolvedValue({} as any);
      jwtService.signAsync
        .mockResolvedValueOnce('access-token-123')
        .mockResolvedValueOnce('refresh-token-123');

      await service.createDirect(createUserDto);

      expect(getAccountCreatedTemplate).toHaveBeenCalled();
      expect(getEmailConfirmationTemplate).not.toHaveBeenCalled();
    });

    it('should send email with correct subject', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue(mockUserWithRechargeBigoId);
      prismaService.store.findUnique.mockResolvedValue({
        domain: 'https://www.example.com',
      });
      emailService.sendEmail.mockResolvedValue({} as any);
      jwtService.signAsync
        .mockResolvedValueOnce('access-token-123')
        .mockResolvedValueOnce('refresh-token-123');

      await service.createDirect(createUserDto);

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        createUserDto.email,
        'Conta criada com sucesso',
        expect.any(String),
      );
    });

    it('should throw BadRequestException when database error occurs', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);
      prismaService.user.create.mockRejectedValue(new Error('Database error'));

      await expect(service.createDirect(createUserDto)).rejects.toThrow(
        new BadRequestException('Failed to create user'),
      );
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      name: 'Jane Doe',
      email: 'jane@example.com',
    };

    it('should update a user successfully', async () => {
      const userId = 'user-123';
      const { validateRequiredFields } = require('../../utils/validation.util');

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.user.update.mockResolvedValue({
        ...mockUser,
        ...updateUserDto,
      });

      const result = await service.update(userId, updateUserDto);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: mockUserSelect,
      });

      expect(validateRequiredFields).toHaveBeenCalledWith(updateUserDto, [
        'name',
        'email',
      ]);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateUserDto,
        select: mockUserSelect,
      });

      expect(result).toEqual({ ...mockUser, ...updateUserDto });
    });

    it('should update user with password when provided', async () => {
      const userId = 'user-123';
      const updateWithPassword: UpdateUserDto = {
        name: 'Jane Doe',
        password: 'newPassword123',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.user.update.mockResolvedValue({
        ...mockUser,
        name: 'Jane Doe',
      });

      const result = await service.update(userId, updateWithPassword);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          name: 'Jane Doe',
          password: 'hashedPassword123',
        },
        select: mockUserSelect,
      });

      expect(result).toEqual({ ...mockUser, name: 'Jane Doe' });
    });

    it('should throw BadRequestException when user not found', async () => {
      const userId = 'user-123';

      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.update(userId, updateUserDto)).rejects.toThrow(
        new BadRequestException('Failed to update user'),
      );
    });

    it('should throw BadRequestException when database error occurs', async () => {
      const userId = 'user-123';

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.user.update.mockRejectedValue(new Error('Database error'));

      await expect(service.update(userId, updateUserDto)).rejects.toThrow(
        new BadRequestException('Failed to update user'),
      );
    });
  });

  describe('remove', () => {
    it('should remove a user successfully', async () => {
      const userId = 'user-123';

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.user.delete.mockResolvedValue(mockUser);

      const result = await service.remove(userId);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: mockUserSelect,
      });

      expect(prismaService.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
        select: mockUserSelect,
      });

      expect(result).toEqual(mockUser);
    });

    it('should throw BadRequestException when user not found', async () => {
      const userId = 'user-123';

      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.remove(userId)).rejects.toThrow(
        new BadRequestException('Failed to remove user'),
      );
    });

    it('should throw BadRequestException when database error occurs', async () => {
      const userId = 'user-123';

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.user.delete.mockRejectedValue(new Error('Database error'));

      await expect(service.remove(userId)).rejects.toThrow(
        new BadRequestException('Failed to remove user'),
      );
    });
  });

  describe('findEmailsByStore', () => {
    it('should return all user emails from a store', async () => {
      const storeId = 'store-123';
      const expectedEmails = [
        { id: 'user-1', email: 'user1@example.com' },
        { id: 'user-2', email: 'user2@example.com' },
      ];

      prismaService.user.findMany.mockResolvedValue(expectedEmails);

      const result = await service.findEmailsByStore(storeId);

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          storeId,
          role: 'USER',
        },
        select: {
          id: true,
          email: true,
        },
        orderBy: {
          email: 'asc',
        },
      });
      expect(result).toEqual(expectedEmails);
    });

    it('should return filtered emails when search parameter is provided', async () => {
      const storeId = 'store-123';
      const search = 'john';
      const expectedEmails = [{ id: 'user-1', email: 'john@example.com' }];

      prismaService.user.findMany.mockResolvedValue(expectedEmails);

      const result = await service.findEmailsByStore(storeId, search);

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          storeId,
          role: 'USER',
          email: {
            contains: search,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          email: true,
        },
        orderBy: {
          email: 'asc',
        },
      });
      expect(result).toEqual(expectedEmails);
    });

    it('should throw BadRequestException when database error occurs', async () => {
      const storeId = 'store-123';

      prismaService.user.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findEmailsByStore(storeId)).rejects.toThrow(
        new BadRequestException('Failed to fetch emails'),
      );
    });
  });

  describe('findAdminsByStore', () => {
    it('should return all admin emails from a store', async () => {
      const storeId = 'store-123';
      const expectedAdmins = [
        { id: 'admin-1', email: 'admin1@example.com' },
        { id: 'admin-2', email: 'admin2@example.com' },
      ];

      prismaService.user.findMany.mockResolvedValue(expectedAdmins);

      const result = await service.findAdminsByStore(storeId);

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          storeId,
          role: 'RESELLER_ADMIN_4MIGA_USER',
        },
        select: {
          id: true,
          email: true,
        },
        orderBy: {
          email: 'asc',
        },
      });
      expect(result).toEqual(expectedAdmins);
    });

    it('should throw BadRequestException when database error occurs', async () => {
      const storeId = 'store-123';

      prismaService.user.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findAdminsByStore(storeId)).rejects.toThrow(
        new BadRequestException('Failed to fetch admins'),
      );
    });
  });

  describe('promoteToAdmin', () => {
    it('should promote a user to admin successfully', async () => {
      const userId = 'user-456';
      const adminStoreId = 'store-123';
      const currentUserId = 'current-admin-123';
      const userToPromote = { ...mockUser, id: userId };
      const promotedUser = {
        ...mockUser,
        id: userId,
        role: 'RESELLER_ADMIN_4MIGA_USER',
      };

      prismaService.user.findUnique.mockResolvedValue(userToPromote);
      prismaService.user.findFirst.mockResolvedValue(null); // No admin in other store
      prismaService.user.update.mockResolvedValue(promotedUser);

      const result = await service.promoteToAdmin(
        userId,
        adminStoreId,
        currentUserId,
      );

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: userToPromote.email,
          role: 'RESELLER_ADMIN_4MIGA_USER',
          storeId: { not: adminStoreId },
        },
      });

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          role: 'RESELLER_ADMIN_4MIGA_USER',
          roleChangedBy: currentUserId,
          roleChangedAt: expect.any(Date),
        },
        select: mockUserSelect,
      });

      expect(result).toEqual(promotedUser);
    });

    it('should throw BadRequestException when user not found', async () => {
      const userId = 'user-456';
      const adminStoreId = 'store-123';
      const currentUserId = 'current-admin-123';

      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.promoteToAdmin(userId, adminStoreId, currentUserId),
      ).rejects.toThrow(new BadRequestException('User not found'));
    });

    it('should throw BadRequestException when user is from different store', async () => {
      const userId = 'user-456';
      const adminStoreId = 'store-123';
      const currentUserId = 'current-admin-123';
      const userFromDifferentStore = {
        ...mockUser,
        id: userId,
        storeId: 'different-store',
      };

      prismaService.user.findUnique.mockResolvedValue(userFromDifferentStore);

      await expect(
        service.promoteToAdmin(userId, adminStoreId, currentUserId),
      ).rejects.toThrow(
        new BadRequestException('Cannot promote users from different stores'),
      );
    });

    it('should throw BadRequestException when user is already an admin', async () => {
      const userId = 'user-456';
      const adminStoreId = 'store-123';
      const currentUserId = 'current-admin-123';
      const adminUser = {
        ...mockUser,
        id: userId,
        role: 'RESELLER_ADMIN_4MIGA_USER',
      };

      prismaService.user.findUnique.mockResolvedValue(adminUser);

      await expect(
        service.promoteToAdmin(userId, adminStoreId, currentUserId),
      ).rejects.toThrow(new BadRequestException('User is already an admin'));
    });

    it('should throw BadRequestException when email is already admin in another store', async () => {
      const userId = 'user-456';
      const adminStoreId = 'store-123';
      const currentUserId = 'current-admin-123';
      const userToPromote = { ...mockUser, id: userId, email: 'test@example.com' };
      const existingAdminInOtherStore = {
        ...mockUser,
        id: 'other-admin-id',
        email: 'test@example.com',
        storeId: 'other-store-456',
        role: 'RESELLER_ADMIN_4MIGA_USER',
      };

      prismaService.user.findUnique.mockResolvedValue(userToPromote);
      prismaService.user.findFirst.mockResolvedValue(existingAdminInOtherStore);

      await expect(
        service.promoteToAdmin(userId, adminStoreId, currentUserId),
      ).rejects.toThrow(
        new BadRequestException(
          'This email is already an administrator in another store',
        ),
      );

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'test@example.com',
          role: 'RESELLER_ADMIN_4MIGA_USER',
          storeId: { not: adminStoreId },
        },
      });
    });

    it('should throw BadRequestException when database error occurs during update', async () => {
      const userId = 'user-456';
      const adminStoreId = 'store-123';
      const currentUserId = 'current-admin-123';
      const userToPromote = { ...mockUser, id: userId };

      prismaService.user.findUnique.mockResolvedValue(userToPromote);
      prismaService.user.update.mockRejectedValue(new Error('Database error'));

      await expect(
        service.promoteToAdmin(userId, adminStoreId, currentUserId),
      ).rejects.toThrow(new BadRequestException('Failed to promote user'));
    });
  });

  describe('demoteToUser', () => {
    it('should demote an admin to user successfully', async () => {
      const userId = 'admin-456';
      const adminStoreId = 'store-123';
      const currentUserId = 'current-admin-123';
      const adminToDemote = {
        ...mockUser,
        id: userId,
        role: 'RESELLER_ADMIN_4MIGA_USER',
      };
      const demotedUser = { ...mockUser, id: userId, role: 'USER' };

      prismaService.user.findUnique.mockResolvedValue(adminToDemote);
      prismaService.user.update.mockResolvedValue(demotedUser);

      const result = await service.demoteToUser(
        userId,
        adminStoreId,
        currentUserId,
      );

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          role: 'USER',
          roleChangedBy: currentUserId,
          roleChangedAt: expect.any(Date),
        },
        select: mockUserSelect,
      });

      expect(result).toEqual(demotedUser);
    });

    it('should throw BadRequestException when trying to demote self', async () => {
      const userId = 'admin-123';
      const adminStoreId = 'store-123';
      const currentUserId = userId;

      await expect(
        service.demoteToUser(userId, adminStoreId, currentUserId),
      ).rejects.toThrow(new BadRequestException('Cannot demote yourself'));
    });

    it('should throw BadRequestException when user not found', async () => {
      const userId = 'admin-456';
      const adminStoreId = 'store-123';
      const currentUserId = 'current-admin-123';

      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.demoteToUser(userId, adminStoreId, currentUserId),
      ).rejects.toThrow(new BadRequestException('User not found'));
    });

    it('should throw BadRequestException when user is from different store', async () => {
      const userId = 'admin-456';
      const adminStoreId = 'store-123';
      const currentUserId = 'current-admin-123';
      const adminFromDifferentStore = {
        ...mockUser,
        id: userId,
        storeId: 'different-store',
        role: 'RESELLER_ADMIN_4MIGA_USER',
      };

      prismaService.user.findUnique.mockResolvedValue(adminFromDifferentStore);

      await expect(
        service.demoteToUser(userId, adminStoreId, currentUserId),
      ).rejects.toThrow(
        new BadRequestException('Cannot demote users from different stores'),
      );
    });

    it('should throw BadRequestException when user is not a reseller admin', async () => {
      const userId = 'user-456';
      const adminStoreId = 'store-123';
      const currentUserId = 'current-admin-123';
      const regularUser = { ...mockUser, id: userId, role: 'USER' };

      prismaService.user.findUnique.mockResolvedValue(regularUser);

      await expect(
        service.demoteToUser(userId, adminStoreId, currentUserId),
      ).rejects.toThrow(
        new BadRequestException('User is not a reseller admin'),
      );
    });

    it('should throw BadRequestException when database error occurs during update', async () => {
      const userId = 'admin-456';
      const adminStoreId = 'store-123';
      const currentUserId = 'current-admin-123';
      const adminToDemote = {
        ...mockUser,
        id: userId,
        role: 'RESELLER_ADMIN_4MIGA_USER',
      };

      prismaService.user.findUnique.mockResolvedValue(adminToDemote);
      prismaService.user.update.mockRejectedValue(new Error('Database error'));

      await expect(
        service.demoteToUser(userId, adminStoreId, currentUserId),
      ).rejects.toThrow(new BadRequestException('Failed to demote user'));
    });
  });
});
