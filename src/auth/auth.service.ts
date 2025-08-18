import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EmailService } from '../email/email.service';
import { getPasswordResetTemplate } from '../email/templates/password-reset.template';
import { getEmailConfirmationTemplate } from '../email/templates/email-confirmation.template';
import { getEmailChangeConfirmationTemplate } from '../email/templates/email-change-confirmation.template';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SseService } from '../sse/sse.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly sseService: SseService,
  ) {}

  private authUser = {
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

  async login(loginDto: LoginDto) {
    const { email, password, storeId } = loginDto;
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        storeId,
      },
      select: this.authUser,
    });
    if (!user) {
      throw new UnauthorizedException('User or password invalid');
    }
    if (user.emailVerified === false) {
      throw new UnauthorizedException('Email not verified');
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('User or password invalid');
    }

    const data = {
      id: user.id,
      storeId: user.storeId,
      email: user.email,
      phone: user.phone,
      documentType: user.documentType,
      documentValue: user.documentValue,
      name: user.name,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(data, {
      expiresIn: '10m',
    });
    const refreshToken = await this.jwtService.signAsync(data, {
      expiresIn: '7d',
    });

    const expiresIn = 10 * 60;

    return {
      access: {
        accessToken,
        refreshToken,
        expiresIn,
      },
      user: data,
    };
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { iat, exp, ...userData } = payload;
      const accessToken = await this.jwtService.signAsync(userData, {
        expiresIn: '10m',
      });
      const expiresIn = 10 * 60;
      const data = {
        id: userData.id,
        storeId: userData.storeId,
        email: userData.email,
        phone: userData.phone,
        documentType: userData.documentType,
        documentValue: userData.documentValue,
        name: userData.name,
        role: userData.role,
      };
      return {
        access: {
          accessToken,
          refreshToken,
          expiresIn,
        },
        user: data,
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async forgotPassword(email: string, storeId: string) {
    // Check if user exists
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        storeId,
      },
    });
    if (!user) {
      throw new BadRequestException('User with this email does not exist');
    }
    if (!user.emailVerified) {
      throw new BadRequestException('Email not verified');
    }
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // Save code and expiration (10min) in user table
    await this.prisma.user.updateMany({
      where: {
        email,
        storeId,
      },
      data: {
        resetPasswordCode: code,
        resetPasswordExpires: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    const html = getPasswordResetTemplate(code);

    await this.emailService.sendEmail(email, 'Confirmação de E-mail', html);
    return { message: 'Password reset code sent to email' };
  }

  async verifyCode(verifyCodeDto: VerifyCodeDto) {
    const { email, code, storeId } = verifyCodeDto;

    // Check if user exists
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        storeId,
      },
    });
    if (!user) {
      throw new BadRequestException('User with this email does not exist');
    }

    // Check if code exists and is not expired
    if (!user.resetPasswordCode || !user.resetPasswordExpires) {
      throw new BadRequestException('No reset code found or code has expired');
    }

    if (user.resetPasswordCode !== code) {
      throw new BadRequestException('Invalid reset code');
    }

    if (new Date() > user.resetPasswordExpires) {
      throw new BadRequestException('Reset code has expired');
    }

    return { message: 'Code is valid', valid: true };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, code, password, confirmPassword, storeId } =
      resetPasswordDto;

    // Validate password confirmation
    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Check if user exists
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        storeId,
      },
    });
    if (!user) {
      throw new BadRequestException('User with this email does not exist');
    }

    // Check if code exists and is not expired
    if (!user.resetPasswordCode || !user.resetPasswordExpires) {
      throw new BadRequestException('No reset code found or code has expired');
    }

    if (user.resetPasswordCode !== code) {
      throw new BadRequestException('Invalid reset code');
    }

    if (new Date() > user.resetPasswordExpires) {
      throw new BadRequestException('Reset code has expired');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and clear reset code
    await this.prisma.user.updateMany({
      where: {
        email,
        storeId,
      },
      data: {
        password: hashedPassword,
        resetPasswordCode: null,
        resetPasswordExpires: null,
      },
    });

    // Fetch updated user
    const updatedUser = await this.prisma.user.findFirst({
      where: {
        email,
        storeId,
      },
      select: this.authUser,
    });
    if (!updatedUser) {
      throw new BadRequestException('User not found after password reset');
    }

    // Build user data (same as login)
    const data = {
      id: updatedUser.id,
      storeId: updatedUser.storeId,
      email: updatedUser.email,
      phone: updatedUser.phone,
      documentType: updatedUser.documentType,
      documentValue: updatedUser.documentValue,
      name: updatedUser.name,
      role: updatedUser.role,
    };

    const accessToken = await this.jwtService.signAsync(data, {
      expiresIn: '10m',
    });
    const refreshToken = await this.jwtService.signAsync(data, {
      expiresIn: '7d',
    });
    const expiresIn = 10 * 60;

    return {
      access: {
        accessToken,
        refreshToken,
        expiresIn,
      },
      user: data,
    };
  }

  async verifyEmail(email: string, code: string, storeId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        storeId,
      },
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

    if (!user) {
      throw new BadRequestException('User with this email does not exist');
    }

    // Check if email is already verified
    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Check if code exists
    if (!user.emailConfirmationCode) {
      throw new BadRequestException('No confirmation code found');
    }

    if (user.emailConfirmationCode !== code) {
      throw new BadRequestException('Invalid confirmation code');
    }

    // Check if code has expired
    const userWithExpiration = await this.prisma.user.findFirst({
      where: {
        email,
        storeId,
      },
      select: {
        emailConfirmationExpires: true,
      },
    });

    if (
      userWithExpiration?.emailConfirmationExpires &&
      new Date() > userWithExpiration.emailConfirmationExpires
    ) {
      throw new BadRequestException('Confirmation code has expired');
    }

    // Update user to verified
    await this.prisma.user.updateMany({
      where: {
        email,
        storeId,
      },
      data: {
        emailVerified: true,
        emailConfirmationCode: null,
        emailConfirmationExpires: null,
      },
    });

    // Generate tokens (same as login)
    const userData = {
      id: user.id,
      storeId: user.storeId,
      email: user.email,
      phone: user.phone,
      documentType: user.documentType,
      documentValue: user.documentValue,
      name: user.name,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(userData, {
      expiresIn: '10m',
    });
    const refreshToken = await this.jwtService.signAsync(userData, {
      expiresIn: '7d',
    });

    const expiresIn = 10 * 60;

    // Notify via SSE that email was verified
    try {
      console.log('Notifying SSE for email verification:', user.email);
      this.sseService.notifyEmailVerified(user.email, {
        user: userData,
        access: {
          accessToken,
          refreshToken,
          expiresIn,
        },
      });
      console.log('SSE notification sent successfully');
    } catch (error) {
      console.error('Failed to notify via SSE:', error);
    }

    return {
      access: {
        accessToken,
        refreshToken,
        expiresIn,
      },
      user: userData,
    };
  }

  async resendEmailConfirmation(email: string, storeId: string) {
    // Check if user exists and is not verified
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        storeId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User with this email does not exist');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate new confirmation code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Set new expiration time to 24 hours from now
    const emailConfirmationExpires = new Date();
    emailConfirmationExpires.setHours(emailConfirmationExpires.getHours() + 24);

    // Update user with new code and expiration
    await this.prisma.user.updateMany({
      where: {
        email,
        storeId,
      },
      data: {
        emailConfirmationCode: code,
        emailConfirmationExpires,
      },
    });

    // Get store domain for email template
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { domain: true },
    });

    if (!store) {
      throw new BadRequestException('Store not found');
    }

    // Send new confirmation email
    const html = getEmailConfirmationTemplate(code, user.name, store.domain, email, storeId);
    await this.emailService.sendEmail(
      email,
      'Confirme seu cadastro - Novo código',
      html,
    );

    return {
      message: 'New confirmation code sent successfully',
    };
  }

  async requestEmailChange(currentEmail: string, newEmail: string, storeId: string) {
    // Check if current user exists and is verified
    const user = await this.prisma.user.findFirst({
      where: { email: currentEmail, storeId },
      select: { id: true, name: true, emailVerified: true },
    });
    if (!user) {
      throw new BadRequestException('User with this email does not exist');
    }
    if (!user.emailVerified) {
      throw new BadRequestException('Email not verified');
    }

    // Ensure new email is not already used in the same store
    const existingNewEmail = await this.prisma.user.findFirst({
      where: { email: newEmail, storeId },
      select: { id: true },
    });
    if (existingNewEmail) {
      throw new BadRequestException('New email is already in use');
    }

    // Generate code and set expiration (10 min similar to reset password)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const emailConfirmationExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Store code and expiration on user
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailConfirmationCode: code,
        emailConfirmationExpires,
      },
    });

    // Send code to NEW email
    const html = getEmailChangeConfirmationTemplate(code);
    await this.emailService.sendEmail(
      newEmail,
      'Confirme a alteração de e-mail',
      html,
    );

    return { message: 'Email change code sent to new email' };
  }

  async confirmEmailChange(
    currentEmail: string,
    newEmail: string,
    code: string,
    storeId: string,
  ) {
    // Find user by current email
    const user = await this.prisma.user.findFirst({
      where: { email: currentEmail, storeId },
      select: {
        id: true,
        email: true,
        emailConfirmationCode: true,
        emailConfirmationExpires: true,
        emailVerified: true,
      },
    });
    if (!user) {
      throw new BadRequestException('User with this email does not exist');
    }
    if (!user.emailVerified) {
      throw new BadRequestException('Email not verified');
    }

    // Validate code
    if (!user.emailConfirmationCode || !user.emailConfirmationExpires) {
      throw new BadRequestException('No confirmation code found or code has expired');
    }
    if (user.emailConfirmationCode !== code) {
      throw new BadRequestException('Invalid confirmation code');
    }
    if (new Date() > user.emailConfirmationExpires) {
      throw new BadRequestException('Confirmation code has expired');
    }

    // Ensure new email is not already used in the same store at confirmation time
    const existingNewEmail = await this.prisma.user.findFirst({
      where: { email: newEmail, storeId },
      select: { id: true },
    });
    if (existingNewEmail) {
      throw new BadRequestException('New email is already in use');
    }

    // Update email and clear confirmation fields
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email: newEmail,
        emailConfirmationCode: null,
        emailConfirmationExpires: null,
      },
    });

    return { message: 'Email updated successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const { currentPassword, newPassword, confirmPassword } = dto;

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentValid) {
      throw new BadRequestException('Current password is invalid');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password updated successfully' };
  }
}
