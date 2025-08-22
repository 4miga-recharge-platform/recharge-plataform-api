import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { LoginDto } from '../dto/login.dto';
import { AdminLoginDto } from '../dto/admin-login.dto';
import { VerifyCodeDto } from '../dto/verify-code.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { SseConfirmEmailService } from '../../sse/sse.confirm-email.service';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

// Mock email templates
jest.mock('../../email/templates/password-reset.template', () => ({
  getPasswordResetTemplate: jest.fn().mockReturnValue('<html>Password reset template</html>'),
}));

jest.mock('../../email/templates/email-confirmation.template', () => ({
  getEmailConfirmationTemplate: jest.fn().mockReturnValue('<html>Email confirmation template</html>'),
}));

jest.mock('../../email/templates/email-change-confirmation.template', () => ({
  getEmailChangeConfirmationTemplate: jest.fn().mockReturnValue('<html>Email change confirmation template</html>'),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: any;
  let jwtService: any;
  let emailService: any;

  const mockUser = {
    id: 'user-123',
    email: 'john@example.com',
    name: 'John Doe',
    role: 'USER',
    storeId: 'store-123',
    phone: '5511988887777',
    documentType: 'cpf',
    documentValue: '123.456.789-00',
    emailVerified: true,
    password: 'hashedPassword123',
  };

  const mockAdminUser = {
    id: 'admin-123',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'RESELLER_ADMIN_4MIGA_USER',
    phone: '5511988887777',
    documentType: 'cpf',
    documentValue: '123.456.789-00',
    emailVerified: true,
    password: 'hashedPassword123',
    store: {
      id: 'store-123',
      name: 'Admin Store',
      email: 'store@example.com',
      domain: 'adminstore.com',
      logoUrl: 'logo.png',
      miniLogoUrl: 'minilogo.png',
      bannersUrl: ['banner1.jpg', 'banner2.jpg'],
      facebookUrl: 'https://facebook.com/adminstore',
      instagramUrl: 'https://instagram.com/adminstore',
      tiktokUrl: 'https://tiktok.com/adminstore',
      wppNumber: '5511988887777',
    },
  };

  const mockUserData = {
    id: mockUser.id,
    storeId: mockUser.storeId,
    email: mockUser.email,
    phone: mockUser.phone,
    documentType: mockUser.documentType,
    documentValue: mockUser.documentValue,
    name: mockUser.name,
    role: mockUser.role,
  };

  const mockAdminUserData = {
    id: mockAdminUser.id,
    email: mockAdminUser.email,
    phone: mockAdminUser.phone,
    documentType: mockAdminUser.documentType,
    documentValue: mockAdminUser.documentValue,
    name: mockAdminUser.name,
    role: mockAdminUser.role,
    store: mockAdminUser.store,
  };

  const mockAuthUser = {
    id: true,
    email: true,
    name: true,
    role: true,
    storeId: true,
    phone: true,
    documentType: true,
    documentValue: true,
    emailVerified: true,
    password: true,
    createdAt: false,
    updatedAt: false,
  };

  const mockAdminAuthUser = {
    id: true,
    email: true,
    name: true,
    role: true,
    phone: true,
    documentType: true,
    documentValue: true,
    emailVerified: true,
    password: true,
    createdAt: false,
    updatedAt: false,
    store: {
      select: {
        id: true,
        name: true,
        email: true,
        domain: true,
        logoUrl: true,
        miniLogoUrl: true,
        bannersUrl: true,
        facebookUrl: true,
        instagramUrl: true,
        tiktokUrl: true,
        wppNumber: true,
      }
    }
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      store: {
        findUnique: jest.fn(),
      },
    };

    const mockJwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };

    const mockEmailService = {
      sendEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: SseConfirmEmailService,
          useValue: { notifyEmailVerified: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);
    emailService = module.get(EmailService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'john@example.com',
      password: 'password123',
      storeId: 'store-123',
    };

    it('should login successfully with valid credentials', async () => {
      const bcrypt = require('bcrypt');
      bcrypt.compare.mockResolvedValue(true);

      prismaService.user.findFirst.mockResolvedValue(mockUser);
      jwtService.signAsync
        .mockResolvedValueOnce('access-token-123')
        .mockResolvedValueOnce('refresh-token-123');

      const result = await service.login(loginDto);

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: loginDto.email,
          storeId: loginDto.storeId,
        },
        select: mockAuthUser,
      });

      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.password);

      expect(jwtService.signAsync).toHaveBeenCalledWith(mockUserData, {
        expiresIn: '10m',
      });

      expect(jwtService.signAsync).toHaveBeenCalledWith(mockUserData, {
        expiresIn: '7d',
      });

      expect(result).toEqual({
        access: {
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-123',
          expiresIn: 600,
        },
        user: mockUserData,
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('User or password invalid'),
      );
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      const bcrypt = require('bcrypt');
      bcrypt.compare.mockResolvedValue(false);

      prismaService.user.findFirst.mockResolvedValue(mockUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('User or password invalid'),
      );
    });

    it('should throw UnauthorizedException when email is not verified', async () => {
      const bcrypt = require('bcrypt');
      bcrypt.compare.mockResolvedValue(true);

      const unverifiedUser = { ...mockUser, emailVerified: false };
      prismaService.user.findFirst.mockResolvedValue(unverifiedUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Email not verified'),
      );
    });
  });

  describe('adminLogin', () => {
    const adminLoginDto: AdminLoginDto = {
      email: 'admin@example.com',
      password: 'admin123',
    };

    it('should login admin successfully with valid credentials', async () => {
      const bcrypt = require('bcrypt');
      bcrypt.compare.mockResolvedValue(true);

      prismaService.user.findFirst.mockResolvedValue(mockAdminUser);
      jwtService.signAsync
        .mockResolvedValueOnce('admin-access-token-123')
        .mockResolvedValueOnce('admin-refresh-token-123');

      const result = await service.adminLogin(adminLoginDto);

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { email: adminLoginDto.email },
        select: mockAdminAuthUser,
      });

      expect(bcrypt.compare).toHaveBeenCalledWith(adminLoginDto.password, mockAdminUser.password);

      // Verify JWT data (should include storeId for token)
      const expectedJwtData = {
        id: mockAdminUser.id,
        email: mockAdminUser.email,
        phone: mockAdminUser.phone,
        documentType: mockAdminUser.documentType,
        documentValue: mockAdminUser.documentValue,
        name: mockAdminUser.name,
        role: mockAdminUser.role,
        storeId: mockAdminUser.store.id,
      };

      expect(jwtService.signAsync).toHaveBeenCalledWith(expectedJwtData, {
        expiresIn: '10m',
      });

      expect(jwtService.signAsync).toHaveBeenCalledWith(expectedJwtData, {
        expiresIn: '7d',
      });

      expect(result).toEqual({
        access: {
          accessToken: 'admin-access-token-123',
          refreshToken: 'admin-refresh-token-123',
          expiresIn: 600,
        },
        user: mockAdminUserData,
      });
    });

    it('should throw UnauthorizedException when admin user not found', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.adminLogin(adminLoginDto)).rejects.toThrow(
        new UnauthorizedException('User or password invalid'),
      );
    });

    it('should throw UnauthorizedException when user is not admin', async () => {
      const regularUser = { ...mockAdminUser, role: 'USER' };
      prismaService.user.findFirst.mockResolvedValue(regularUser);

      await expect(service.adminLogin(adminLoginDto)).rejects.toThrow(
        new UnauthorizedException('Access denied - Admin role required'),
      );
    });

    it('should throw UnauthorizedException when admin email is not verified', async () => {
      const bcrypt = require('bcrypt');
      bcrypt.compare.mockResolvedValue(true);

      const unverifiedAdmin = { ...mockAdminUser, emailVerified: false };
      prismaService.user.findFirst.mockResolvedValue(unverifiedAdmin);

      await expect(service.adminLogin(adminLoginDto)).rejects.toThrow(
        new UnauthorizedException('Email not verified'),
      );
    });

    it('should throw UnauthorizedException when admin password is invalid', async () => {
      const bcrypt = require('bcrypt');
      bcrypt.compare.mockResolvedValue(false);

      prismaService.user.findFirst.mockResolvedValue(mockAdminUser);

      await expect(service.adminLogin(adminLoginDto)).rejects.toThrow(
        new UnauthorizedException('User or password invalid'),
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = { ...mockUserData, iat: 1234567890, exp: 1234567890 };

      jwtService.verifyAsync.mockResolvedValue(payload);
      jwtService.signAsync.mockResolvedValue('new-access-token');

      const result = await service.refreshAccessToken(refreshToken);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith(refreshToken);
      expect(jwtService.signAsync).toHaveBeenCalledWith(mockUserData, { expiresIn: '10m' });

      expect(result).toEqual({
        access: {
          accessToken: 'new-access-token',
          refreshToken: 'valid-refresh-token',
          expiresIn: 600,
        },
        user: mockUserData,
      });
    });

    it('should throw error when refresh token is invalid', async () => {
      const refreshToken = 'invalid-refresh-token';

      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.refreshAccessToken(refreshToken)).rejects.toThrow('Invalid or expired refresh token');
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email successfully', async () => {
      const email = 'john@example.com';
      const storeId = 'store-123';

      prismaService.user.findFirst.mockResolvedValue(mockUser);
      prismaService.user.updateMany.mockResolvedValue({ count: 1 });
      emailService.sendEmail.mockResolvedValue({} as any);

      const result = await service.forgotPassword(email, storeId);

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { email, storeId },
      });

      expect(prismaService.user.updateMany).toHaveBeenCalledWith({
        where: { email, storeId },
        data: {
          resetPasswordCode: expect.any(String),
          resetPasswordExpires: expect.any(Date),
        },
      });

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        email,
        'Confirmação de E-mail',
        '<html>Password reset template</html>',
      );

      expect(result).toEqual({
        message: 'Password reset code sent to email',
      });
    });

    it('should throw BadRequestException when user not found', async () => {
      const email = 'nonexistent@example.com';
      const storeId = 'store-123';

      prismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.forgotPassword(email, storeId)).rejects.toThrow(
        new BadRequestException('User with this email does not exist'),
      );
    });
  });

  describe('verifyCode', () => {
    const verifyCodeDto: VerifyCodeDto = {
      email: 'john@example.com',
      code: '123456',
      storeId: 'store-123',
    };

    it('should verify code successfully', async () => {
      const userWithResetCode = {
        ...mockUser,
        resetPasswordCode: '123456',
        resetPasswordExpires: new Date(Date.now() + 3600000), // 1 hour from now
      };

      prismaService.user.findFirst.mockResolvedValue(userWithResetCode);

      const result = await service.verifyCode(verifyCodeDto);

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: verifyCodeDto.email,
          storeId: verifyCodeDto.storeId,
        },
      });

      expect(result).toEqual({
        message: 'Code is valid',
        valid: true,
      });
    });

    it('should throw BadRequestException when user not found', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.verifyCode(verifyCodeDto)).rejects.toThrow(
        new BadRequestException('User with this email does not exist'),
      );
    });

    it('should throw BadRequestException when code is invalid', async () => {
      const userWithWrongCode = {
        ...mockUser,
        resetPasswordCode: '654321', // Wrong code
        resetPasswordExpires: new Date(Date.now() + 3600000),
      };

      prismaService.user.findFirst.mockResolvedValue(userWithWrongCode);

      await expect(service.verifyCode(verifyCodeDto)).rejects.toThrow(
        new BadRequestException('Invalid reset code'),
      );
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto: ResetPasswordDto = {
      email: 'john@example.com',
      code: '123456',
      password: 'newPassword123',
      confirmPassword: 'newPassword123',
      storeId: 'store-123',
    };

    it('should reset password successfully', async () => {
      const bcrypt = require('bcrypt');
      bcrypt.hash.mockResolvedValue('newHashedPassword');

      const userWithResetCode = {
        ...mockUser,
        resetPasswordCode: '123456',
        resetPasswordExpires: new Date(Date.now() + 3600000),
      };

      prismaService.user.findFirst
        .mockResolvedValueOnce(userWithResetCode) // First call for validation
        .mockResolvedValueOnce(mockUser); // Second call after update
      prismaService.user.updateMany.mockResolvedValue({ count: 1 });
      jwtService.signAsync
        .mockResolvedValueOnce('access-token-123')
        .mockResolvedValueOnce('refresh-token-123');

      const result = await service.resetPassword(resetPasswordDto);

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: resetPasswordDto.email,
          storeId: resetPasswordDto.storeId,
        },
      });

      expect(bcrypt.hash).toHaveBeenCalledWith(resetPasswordDto.password, 10);

      expect(prismaService.user.updateMany).toHaveBeenCalledWith({
        where: {
          email: resetPasswordDto.email,
          storeId: resetPasswordDto.storeId,
        },
        data: {
          password: 'newHashedPassword',
          resetPasswordCode: null,
          resetPasswordExpires: null,
        },
      });

      expect(result).toEqual({
        access: {
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-123',
          expiresIn: 600,
        },
        user: mockUserData,
      });
    });

    it('should throw BadRequestException when passwords do not match', async () => {
      const resetPasswordDtoWithMismatch = {
        ...resetPasswordDto,
        confirmPassword: 'differentPassword',
      };

      await expect(service.resetPassword(resetPasswordDtoWithMismatch)).rejects.toThrow(
        new BadRequestException('Passwords do not match'),
      );
    });
  });

  describe('verifyEmail', () => {
    const email = 'john@example.com';
    const code = '123456';
    const storeId = 'store-123';

    it('should verify email successfully', async () => {
      const unverifiedUser = {
        ...mockUser,
        emailVerified: false,
        emailConfirmationCode: '123456',
      };

      const userWithExpiration = {
        emailConfirmationExpires: new Date(Date.now() + 3600000), // 1 hour from now
      };

      prismaService.user.findFirst
        .mockResolvedValueOnce(unverifiedUser) // First call for user data
        .mockResolvedValueOnce(userWithExpiration); // Second call for expiration check
      prismaService.user.updateMany.mockResolvedValue({ count: 1 });
      jwtService.signAsync
        .mockResolvedValueOnce('access-token-123')
        .mockResolvedValueOnce('refresh-token-123');

      const result = await service.verifyEmail(email, code, storeId);

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { email, storeId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          storeId: true,
          phone: true,
          documentType: true,
          documentValue: true,
          emailVerified: true,
          emailConfirmationCode: true,
        },
      });

      expect(prismaService.user.updateMany).toHaveBeenCalledWith({
        where: { email, storeId },
        data: {
          emailVerified: true,
          emailConfirmationCode: null,
          emailConfirmationExpires: null,
        },
      });

      expect(result).toEqual({
        access: {
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-123',
          expiresIn: 600,
        },
        user: mockUserData,
      });
    });

    it('should throw BadRequestException when user not found', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.verifyEmail(email, code, storeId)).rejects.toThrow(
        new BadRequestException('User with this email does not exist'),
      );
    });

    it('should throw BadRequestException when email is already verified', async () => {
      const verifiedUser = {
        ...mockUser,
        emailVerified: true,
        emailConfirmationCode: '123456',
      };

      prismaService.user.findFirst.mockResolvedValue(verifiedUser);

      await expect(service.verifyEmail(email, code, storeId)).rejects.toThrow(
        new BadRequestException('Email is already verified'),
      );
    });

    it('should throw BadRequestException when no confirmation code found', async () => {
      const userWithoutCode = {
        ...mockUser,
        emailVerified: false,
        emailConfirmationCode: null,
      };

      prismaService.user.findFirst.mockResolvedValue(userWithoutCode);

      await expect(service.verifyEmail(email, code, storeId)).rejects.toThrow(
        new BadRequestException('No confirmation code found'),
      );
    });

    it('should throw BadRequestException when confirmation code is invalid', async () => {
      const userWithWrongCode = {
        ...mockUser,
        emailVerified: false,
        emailConfirmationCode: '654321', // Wrong code
      };

      prismaService.user.findFirst.mockResolvedValue(userWithWrongCode);

      await expect(service.verifyEmail(email, code, storeId)).rejects.toThrow(
        new BadRequestException('Invalid confirmation code'),
      );
    });

    it('should throw BadRequestException when confirmation code has expired', async () => {
      const unverifiedUser = {
        ...mockUser,
        emailVerified: false,
        emailConfirmationCode: '123456',
      };

      const userWithExpiredCode = {
        emailConfirmationExpires: new Date(Date.now() - 3600000), // 1 hour ago
      };

      prismaService.user.findFirst
        .mockResolvedValueOnce(unverifiedUser)
        .mockResolvedValueOnce(userWithExpiredCode);

      await expect(service.verifyEmail(email, code, storeId)).rejects.toThrow(
        new BadRequestException('Confirmation code has expired'),
      );
    });
  });

  describe('resendEmailConfirmation', () => {
    const email = 'john@example.com';
    const storeId = 'store-123';

    it('should resend email confirmation successfully', async () => {
      const unverifiedUser = {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        emailVerified: false,
      };

      prismaService.user.findFirst.mockResolvedValue(unverifiedUser);
      prismaService.user.updateMany.mockResolvedValue({ count: 1 });
      prismaService.store.findUnique.mockResolvedValue({ domain: 'https://www.example.com' });
      emailService.sendEmail.mockResolvedValue({} as any);

      const result = await service.resendEmailConfirmation(email, storeId);

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { email, storeId },
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
        },
      });

      expect(prismaService.user.updateMany).toHaveBeenCalledWith({
        where: { email, storeId },
        data: {
          emailConfirmationCode: expect.any(String),
          emailConfirmationExpires: expect.any(Date),
        },
      });

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        email,
        'Confirme seu cadastro - Novo código',
        '<html>Email confirmation template</html>',
      );

      expect(result).toEqual({
        message: 'New confirmation code sent successfully',
      });
    });

    it('should throw BadRequestException when user not found', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.resendEmailConfirmation(email, storeId)).rejects.toThrow(
        new BadRequestException('User with this email does not exist'),
      );
    });

    it('should throw BadRequestException when email is already verified', async () => {
      const verifiedUser = {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        emailVerified: true,
      };

      prismaService.user.findFirst.mockResolvedValue(verifiedUser);

      await expect(service.resendEmailConfirmation(email, storeId)).rejects.toThrow(
        new BadRequestException('Email is already verified'),
      );
    });
  });

  describe('changePassword', () => {
    it('should change password when current is valid and confirmation matches', async () => {
      const bcrypt = require('bcrypt');
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('hashedNew');

      prismaService.user.findUnique.mockResolvedValue({ id: 'user-123', password: 'oldHashed' });
      prismaService.user.update.mockResolvedValue({});

      const result = await service.changePassword('user-123', {
        currentPassword: 'OldPass123',
        newPassword: 'NewPass123',
        confirmPassword: 'NewPass123',
      });

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: { id: true, password: true },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('OldPass123', 'oldHashed');
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass123', 10);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { password: 'hashedNew' },
      });
      expect(result).toEqual({ message: 'Password updated successfully' });
    });

    it('should throw when passwords do not match', async () => {
      await expect(
        service.changePassword('user-123', {
          currentPassword: 'OldPass123',
          newPassword: 'NewPass123',
          confirmPassword: 'Different',
        }),
      ).rejects.toThrow(new BadRequestException('Passwords do not match'));
    });

    it('should throw when user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      await expect(
        service.changePassword('user-123', {
          currentPassword: 'OldPass123',
          newPassword: 'NewPass123',
          confirmPassword: 'NewPass123',
        }),
      ).rejects.toThrow(new BadRequestException('User not found'));
    });

    it('should throw when current password is invalid', async () => {
      const bcrypt = require('bcrypt');
      bcrypt.compare.mockResolvedValue(false);
      prismaService.user.findUnique.mockResolvedValue({ id: 'user-123', password: 'oldHashed' });

      await expect(
        service.changePassword('user-123', {
          currentPassword: 'Wrong',
          newPassword: 'NewPass123',
          confirmPassword: 'NewPass123',
        }),
      ).rejects.toThrow(new BadRequestException('Current password is invalid'));
    });
  });

  describe('requestEmailChange', () => {
    const currentEmail = 'john@example.com';
    const newEmail = 'new@example.com';
    const storeId = 'store-123';

    it('should request email change and send code to new email', async () => {
      prismaService.user.findFirst
        .mockResolvedValueOnce({ id: 'user-123', name: 'John Doe', emailVerified: true }) // current user
        .mockResolvedValueOnce(null); // no existing new email
      prismaService.user.update.mockResolvedValue({});
      emailService.sendEmail.mockResolvedValue({} as any);

      const result = await service.requestEmailChange(currentEmail, newEmail, storeId);

      expect(prismaService.user.findFirst).toHaveBeenNthCalledWith(1, {
        where: { email: currentEmail, storeId },
        select: { id: true, name: true, emailVerified: true },
      });
      expect(prismaService.user.findFirst).toHaveBeenNthCalledWith(2, {
        where: { email: newEmail, storeId },
        select: { id: true },
      });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          emailConfirmationCode: expect.any(String),
          emailConfirmationExpires: expect.any(Date),
        },
      });
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        newEmail,
        'Confirme a alteração de e-mail',
        '<html>Email change confirmation template</html>',
      );
      expect(result).toEqual({ message: 'Email change code sent to new email' });
    });

    it('should throw when user not found', async () => {
      prismaService.user.findFirst.mockResolvedValueOnce(null);

      await expect(service.requestEmailChange(currentEmail, newEmail, storeId)).rejects.toThrow(
        new BadRequestException('User with this email does not exist'),
      );
    });

    it('should throw when user email not verified', async () => {
      prismaService.user.findFirst.mockResolvedValueOnce({ id: 'user-123', name: 'John Doe', emailVerified: false });

      await expect(service.requestEmailChange(currentEmail, newEmail, storeId)).rejects.toThrow(
        new BadRequestException('Email not verified'),
      );
    });

    it('should throw when new email already in use', async () => {
      prismaService.user.findFirst
        .mockResolvedValueOnce({ id: 'user-123', name: 'John Doe', emailVerified: true })
        .mockResolvedValueOnce({ id: 'other-user' });

      await expect(service.requestEmailChange(currentEmail, newEmail, storeId)).rejects.toThrow(
        new BadRequestException('New email is already in use'),
      );
    });
  });

  describe('confirmEmailChange', () => {
    const currentEmail = 'john@example.com';
    const newEmail = 'new@example.com';
    const code = '123456';
    const storeId = 'store-123';

    it('should confirm email change successfully', async () => {
      prismaService.user.findFirst
        .mockResolvedValueOnce({
          id: 'user-123',
          email: currentEmail,
          emailConfirmationCode: code,
          emailConfirmationExpires: new Date(Date.now() + 3600000),
          emailVerified: true,
        })
        .mockResolvedValueOnce(null); // new email not in use
      prismaService.user.update.mockResolvedValue({});

      const result = await service.confirmEmailChange(currentEmail, newEmail, code, storeId);

      expect(prismaService.user.findFirst).toHaveBeenNthCalledWith(1, {
        where: { email: currentEmail, storeId },
        select: {
          id: true,
          email: true,
          emailConfirmationCode: true,
          emailConfirmationExpires: true,
          emailVerified: true,
        },
      });
      expect(prismaService.user.findFirst).toHaveBeenNthCalledWith(2, {
        where: { email: newEmail, storeId },
        select: { id: true },
      });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          email: newEmail,
          emailConfirmationCode: null,
          emailConfirmationExpires: null,
        },
      });
      expect(result).toEqual({ message: 'Email updated successfully' });
    });

    it('should throw when user not found', async () => {
      prismaService.user.findFirst.mockResolvedValueOnce(null);

      await expect(service.confirmEmailChange(currentEmail, newEmail, code, storeId)).rejects.toThrow(
        new BadRequestException('User with this email does not exist'),
      );
    });

    it('should throw when email not verified', async () => {
      prismaService.user.findFirst.mockResolvedValueOnce({
        id: 'user-123',
        email: currentEmail,
        emailConfirmationCode: code,
        emailConfirmationExpires: new Date(Date.now() + 3600000),
        emailVerified: false,
      });

      await expect(service.confirmEmailChange(currentEmail, newEmail, code, storeId)).rejects.toThrow(
        new BadRequestException('Email not verified'),
      );
    });

    it('should throw when no code or expiration', async () => {
      prismaService.user.findFirst.mockResolvedValueOnce({
        id: 'user-123', email: currentEmail, emailConfirmationCode: null, emailConfirmationExpires: null, emailVerified: true,
      });

      await expect(service.confirmEmailChange(currentEmail, newEmail, code, storeId)).rejects.toThrow(
        new BadRequestException('No confirmation code found or code has expired'),
      );
    });

    it('should throw when code is invalid', async () => {
      prismaService.user.findFirst.mockResolvedValueOnce({
        id: 'user-123',
        email: currentEmail,
        emailConfirmationCode: '654321',
        emailConfirmationExpires: new Date(Date.now() + 3600000),
        emailVerified: true,
      });

      await expect(service.confirmEmailChange(currentEmail, newEmail, code, storeId)).rejects.toThrow(
        new BadRequestException('Invalid confirmation code'),
      );
    });

    it('should throw when code expired', async () => {
      prismaService.user.findFirst.mockResolvedValueOnce({
        id: 'user-123',
        email: currentEmail,
        emailConfirmationCode: code,
        emailConfirmationExpires: new Date(Date.now() - 3600000),
        emailVerified: true,
      });

      await expect(service.confirmEmailChange(currentEmail, newEmail, code, storeId)).rejects.toThrow(
        new BadRequestException('Confirmation code has expired'),
      );
    });

    it('should throw when new email already in use', async () => {
      prismaService.user.findFirst
        .mockResolvedValueOnce({
          id: 'user-123',
          email: currentEmail,
          emailConfirmationCode: code,
          emailConfirmationExpires: new Date(Date.now() + 3600000),
          emailVerified: true,
        })
        .mockResolvedValueOnce({ id: 'other-user' });

      await expect(service.confirmEmailChange(currentEmail, newEmail, code, storeId)).rejects.toThrow(
        new BadRequestException('New email is already in use'),
      );
    });
  });
});
