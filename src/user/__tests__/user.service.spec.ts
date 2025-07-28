import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
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
  validateRequiredFields: jest.fn(),
}));

// Mock email template
jest.mock('../../email/templates/email-confirmation.template', () => ({
  getEmailConfirmationTemplate: jest.fn().mockReturnValue('<html>Email template</html>'),
}));

describe('UserService', () => {
  let service: UserService;
  let prismaService: any;
  let emailService: any;

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
    role: true,
    phone: true,
    documentType: true,
    documentValue: true,
    emailVerified: true,
    password: false,
    createdAt: false,
    updatedAt: false,
    storeId: true,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const mockEmailService = {
      sendEmail: jest.fn(),
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
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prismaService = module.get(PrismaService);
    emailService = module.get(EmailService);

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

      prismaService.user.findMany.mockRejectedValue(new Error('Database error'));

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

      prismaService.user.findUnique.mockRejectedValue(new Error('Database error'));

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
      role: 'USER',
      storeId: 'store-123',
    };

    it('should create a new user successfully', async () => {
      const { validateRequiredFields } = require('../../utils/validation.util');
      const { getEmailConfirmationTemplate } = require('../../email/templates/email-confirmation.template');

      prismaService.user.create.mockResolvedValue(mockUser);
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
          role: createUserDto.role,
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
      );

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        createUserDto.email,
        'Confirme seu cadastro',
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

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      name: 'Jane Doe',
      email: 'jane@example.com',
    };

    it('should update a user successfully', async () => {
      const userId = 'user-123';
      const { validateRequiredFields } = require('../../utils/validation.util');

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.user.update.mockResolvedValue({ ...mockUser, ...updateUserDto });

      const result = await service.update(userId, updateUserDto);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: mockUserSelect,
      });

      expect(validateRequiredFields).toHaveBeenCalledWith(updateUserDto, ['name', 'email']);

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
      prismaService.user.update.mockResolvedValue({ ...mockUser, name: 'Jane Doe' });

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
});
