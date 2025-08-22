/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { EmailService } from '../../email/email.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from '../dto/login.dto';
import { AdminLoginDto } from '../dto/admin-login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { VerifyCodeDto } from '../dto/verify-code.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { ResendEmailConfirmationDto } from '../dto/resend-email-confirmation.dto';
import { RequestEmailChangeDto } from '../dto/request-email-change.dto';
import { ConfirmEmailChangeDto } from '../dto/confirm-email-change.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;
  let emailService: any;
  let prismaService: any;

  const mockUser = {
    id: 'user-123',
    email: 'john@example.com',
    name: 'John Doe',
    role: 'USER' as const,
    storeId: 'store-123',
    phone: '5511988887777',
    documentType: 'cpf' as const,
    documentValue: '123.456.789-00',
    password: 'hashedPassword',
    createdAt: new Date(),
    updatedAt: new Date(),
    emailVerified: true,
  };

  const mockLoginResponse = {
    access: {
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-123',
      expiresIn: 600,
    },
    user: mockUser,
  };

  beforeEach(async () => {
    const mockAuthService = {
      login: jest.fn(),
      adminLogin: jest.fn(),
      refreshAccessToken: jest.fn(),
      forgotPassword: jest.fn(),
      verifyCode: jest.fn(),
      resetPassword: jest.fn(),
      verifyEmail: jest.fn(),
      resendEmailConfirmation: jest.fn(),
      requestEmailChange: jest.fn(),
      confirmEmailChange: jest.fn(),
      changePassword: jest.fn(),
    };

    const mockEmailService = {
      sendEmail: jest.fn(),
    };

    const mockPrismaService = {
      user: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    emailService = module.get(EmailService);
    prismaService = module.get(PrismaService);

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

    it('should login successfully', async () => {
      authService.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(mockLoginResponse);
    });

    it('should handle login errors', async () => {
      const error = new Error('Login failed');
      authService.login.mockRejectedValue(error);

      await expect(controller.login(loginDto)).rejects.toThrow('Login failed');
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('adminLogin', () => {
    const adminLoginDto: AdminLoginDto = {
      email: 'admin@example.com',
      password: 'admin123',
    };

    const mockAdminLoginResponse = {
      access: {
        accessToken: 'admin-access-token-123',
        refreshToken: 'admin-refresh-token-123',
        expiresIn: 600,
      },
      user: {
        id: 'admin-123',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'RESELLER_ADMIN_4MIGA_USER',
        phone: '5511988887777',
        documentType: 'cpf',
        documentValue: '123.456.789-00',
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
      },
    };

    it('should login admin successfully', async () => {
      authService.adminLogin.mockResolvedValue(mockAdminLoginResponse);

      const result = await controller.adminLogin(adminLoginDto);

      expect(authService.adminLogin).toHaveBeenCalledWith(adminLoginDto);
      expect(result).toEqual(mockAdminLoginResponse);
    });

    it('should handle admin login errors', async () => {
      const error = new Error('Admin login failed');
      authService.adminLogin.mockRejectedValue(error);

      await expect(controller.adminLogin(adminLoginDto)).rejects.toThrow('Admin login failed');
      expect(authService.adminLogin).toHaveBeenCalledWith(adminLoginDto);
    });
  });

  describe('refresh', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: 'refresh-token-123',
    };

    it('should refresh access token successfully', async () => {
      const refreshResponse = {
        access: {
          accessToken: 'new-access-token-123',
          refreshToken: 'refresh-token-123',
          expiresIn: 600,
        },
        user: mockUser,
      };

      authService.refreshAccessToken.mockResolvedValue(refreshResponse);

      const result = await controller.refresh(refreshTokenDto);

      expect(authService.refreshAccessToken).toHaveBeenCalledWith(refreshTokenDto.refreshToken);
      expect(result).toEqual(refreshResponse);
    });

    it('should handle refresh token errors', async () => {
      const error = new Error('Invalid refresh token');
      authService.refreshAccessToken.mockRejectedValue(error);

      await expect(controller.refresh(refreshTokenDto)).rejects.toThrow('Invalid refresh token');
      expect(authService.refreshAccessToken).toHaveBeenCalledWith(refreshTokenDto.refreshToken);
    });
  });

  describe('forgotPassword', () => {
    const forgotPasswordDto: ForgotPasswordDto = {
      email: 'john@example.com',
      storeId: 'store-123',
    };

    it('should send password reset email successfully', async () => {
      const forgotPasswordResponse = {
        message: 'Password reset code sent to email',
      };

      authService.forgotPassword.mockResolvedValue(forgotPasswordResponse);

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(authService.forgotPassword).toHaveBeenCalledWith(
        forgotPasswordDto.email,
        forgotPasswordDto.storeId,
      );
      expect(result).toEqual(forgotPasswordResponse);
    });

    it('should handle forgot password errors', async () => {
      const error = new Error('User not found');
      authService.forgotPassword.mockRejectedValue(error);

      await expect(controller.forgotPassword(forgotPasswordDto)).rejects.toThrow('User not found');
      expect(authService.forgotPassword).toHaveBeenCalledWith(
        forgotPasswordDto.email,
        forgotPasswordDto.storeId,
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
      const verifyCodeResponse = {
        message: 'Code is valid',
        valid: true,
      };

      authService.verifyCode.mockResolvedValue(verifyCodeResponse);

      const result = await controller.verifyCode(verifyCodeDto);

      expect(authService.verifyCode).toHaveBeenCalledWith(verifyCodeDto);
      expect(result).toEqual(verifyCodeResponse);
    });

    it('should handle verify code errors', async () => {
      const error = new Error('Invalid code');
      authService.verifyCode.mockRejectedValue(error);

      await expect(controller.verifyCode(verifyCodeDto)).rejects.toThrow('Invalid code');
      expect(authService.verifyCode).toHaveBeenCalledWith(verifyCodeDto);
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
      const resetPasswordResponse = {
        access: {
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-123',
          expiresIn: 600,
        },
        user: mockUser,
      };

      authService.resetPassword.mockResolvedValue(resetPasswordResponse);

      const result = await controller.resetPassword(resetPasswordDto);

      expect(authService.resetPassword).toHaveBeenCalledWith(resetPasswordDto);
      expect(result).toEqual(resetPasswordResponse);
    });

    it('should handle reset password errors', async () => {
      const error = new Error('Passwords do not match');
      authService.resetPassword.mockRejectedValue(error);

      await expect(controller.resetPassword(resetPasswordDto)).rejects.toThrow('Passwords do not match');
      expect(authService.resetPassword).toHaveBeenCalledWith(resetPasswordDto);
    });
  });

  describe('verifyEmail', () => {
    const verifyEmailDto: VerifyEmailDto = {
      email: 'john@example.com',
      code: '123456',
      storeId: 'store-123',
    };

    it('should verify email successfully', async () => {
      const verifyEmailResponse = {
        access: {
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-123',
          expiresIn: 600,
        },
        user: mockUser,
      };

      authService.verifyEmail.mockResolvedValue(verifyEmailResponse);

      const result = await controller.verifyEmail(verifyEmailDto);

      expect(authService.verifyEmail).toHaveBeenCalledWith(
        verifyEmailDto.email,
        verifyEmailDto.code,
        verifyEmailDto.storeId,
      );
      expect(result).toEqual(verifyEmailResponse);
    });

    it('should handle verify email errors', async () => {
      const error = new Error('Invalid verification code');
      authService.verifyEmail.mockRejectedValue(error);

      await expect(controller.verifyEmail(verifyEmailDto)).rejects.toThrow('Invalid verification code');
      expect(authService.verifyEmail).toHaveBeenCalledWith(
        verifyEmailDto.email,
        verifyEmailDto.code,
        verifyEmailDto.storeId,
      );
    });
  });

  describe('resendEmailConfirmation', () => {
    const resendEmailConfirmationDto: ResendEmailConfirmationDto = {
      email: 'john@example.com',
      storeId: 'store-123',
    };

    it('should resend email confirmation successfully', async () => {
      const resendEmailConfirmationResponse = {
        message: 'New confirmation code sent successfully',
      };

      authService.resendEmailConfirmation.mockResolvedValue(resendEmailConfirmationResponse);

      const result = await controller.resendEmailConfirmation(resendEmailConfirmationDto);

      expect(authService.resendEmailConfirmation).toHaveBeenCalledWith(
        resendEmailConfirmationDto.email,
        resendEmailConfirmationDto.storeId,
      );
      expect(result).toEqual(resendEmailConfirmationResponse);
    });

    it('should handle resend email confirmation errors', async () => {
      const error = new Error('User not found');
      authService.resendEmailConfirmation.mockRejectedValue(error);

      await expect(controller.resendEmailConfirmation(resendEmailConfirmationDto)).rejects.toThrow('User not found');
      expect(authService.resendEmailConfirmation).toHaveBeenCalledWith(
        resendEmailConfirmationDto.email,
        resendEmailConfirmationDto.storeId,
      );
    });
  });

  describe('requestEmailChange', () => {
    const dto: RequestEmailChangeDto = {
      newEmail: 'new@example.com',
    };

    it('should request email change successfully', async () => {
      const response = { message: 'Email change code sent to new email' };
      authService.requestEmailChange.mockResolvedValue(response);

      const result = await controller.requestEmailChange(mockUser as any, dto);

      expect(authService.requestEmailChange).toHaveBeenCalledWith(
        mockUser.email,
        dto.newEmail,
        mockUser.storeId,
      );
      expect(result).toEqual(response);
    });

    it('should handle request email change errors', async () => {
      const error = new Error('New email is already in use');
      authService.requestEmailChange.mockRejectedValue(error);

      await expect(controller.requestEmailChange(mockUser as any, dto)).rejects.toThrow(
        'New email is already in use',
      );
      expect(authService.requestEmailChange).toHaveBeenCalledWith(
        mockUser.email,
        dto.newEmail,
        mockUser.storeId,
      );
    });
  });

  describe('confirmEmailChange', () => {
    const dto: ConfirmEmailChangeDto = {
      newEmail: 'new@example.com',
      code: '123456',
    } as any;

    it('should confirm email change successfully', async () => {
      const response = { message: 'Email updated successfully' };
      authService.confirmEmailChange.mockResolvedValue(response);

      const result = await controller.confirmEmailChange(mockUser as any, dto);

      expect(authService.confirmEmailChange).toHaveBeenCalledWith(
        mockUser.email,
        dto.newEmail,
        dto.code,
        mockUser.storeId,
      );
      expect(result).toEqual(response);
    });

    it('should handle confirm email change errors', async () => {
      const error = new Error('Invalid confirmation code');
      authService.confirmEmailChange.mockRejectedValue(error);

      await expect(controller.confirmEmailChange(mockUser as any, dto)).rejects.toThrow(
        'Invalid confirmation code',
      );
      expect(authService.confirmEmailChange).toHaveBeenCalledWith(
        mockUser.email,
        dto.newEmail,
        dto.code,
        mockUser.storeId,
      );
    });
  });

  describe('changePassword', () => {
    const dto: ChangePasswordDto = {
      currentPassword: 'OldPass123',
      newPassword: 'NewPass123',
      confirmPassword: 'NewPass123',
    } as any;

    it('should change password successfully', async () => {
      const response = { message: 'Password updated successfully' };
      authService.changePassword.mockResolvedValue(response);

      const result = await controller.changePassword(mockUser as any, dto);

      expect(authService.changePassword).toHaveBeenCalledWith(mockUser.id, dto);
      expect(result).toEqual(response);
    });

    it('should handle change password errors', async () => {
      const error = new Error('Current password is invalid');
      authService.changePassword.mockRejectedValue(error);

      await expect(controller.changePassword(mockUser as any, dto)).rejects.toThrow(
        'Current password is invalid',
      );
      expect(authService.changePassword).toHaveBeenCalledWith(mockUser.id, dto);
    });
  });

  describe('profile', () => {
    it('should return user profile successfully', async () => {
      const result = await controller.profile(mockUser);

      const expectedFilteredUser = {
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        phone: mockUser.phone,
        documentType: mockUser.documentType,
        documentValue: mockUser.documentValue,
        role: mockUser.role,
        storeId: mockUser.storeId,
      };

      expect(result).toEqual({
        user: expectedFilteredUser,
      });
    });

    it('should filter user data correctly', async () => {
      const userWithExtraFields = {
        ...mockUser,
        createdAt: new Date(),
        updatedAt: new Date(),
        password: 'hashedPassword',
        emailVerified: true,
        // Add any other fields that should be filtered out
      };

      const result = await controller.profile(userWithExtraFields);

      const expectedFilteredUser = {
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        phone: mockUser.phone,
        documentType: mockUser.documentType,
        documentValue: mockUser.documentValue,
        role: mockUser.role,
        storeId: mockUser.storeId,
      };

      expect(result).toEqual({
        user: expectedFilteredUser,
      });

      // Verify that extra fields are not included
      expect(result.user).not.toHaveProperty('createdAt');
      expect(result.user).not.toHaveProperty('updatedAt');
      expect(result.user).not.toHaveProperty('password');
      expect(result.user).not.toHaveProperty('emailVerified');
    });
  });
});
