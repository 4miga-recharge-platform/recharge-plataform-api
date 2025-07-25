import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { LoginDto } from '../dto/login.dto';
import { VerifyCodeDto } from '../dto/verify-code.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';

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

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
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
});
