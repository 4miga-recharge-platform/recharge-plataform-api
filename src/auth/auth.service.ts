import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EmailService } from '../email/email.service';
import { getPasswordResetTemplate } from '../email/templates/password-reset.template';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
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
    const { email, password } = loginDto;
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: this.authUser,
    });
    if (!user) {
      throw new UnauthorizedException('User or password invalid');
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('User or password invalid');
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new UnauthorizedException('Email not verified');
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
      const { iat, exp, ...userData } = payload;
      const accessToken = await this.jwtService.signAsync(userData, { expiresIn: '10m' });
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
      }
      return {
        access: {
          accessToken,
          refreshToken,
          expiresIn,
        },
        user: data,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async forgotPassword(email: string) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('User with this email does not exist');
    }
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // Save code and expiration (10min) in user table
    await this.prisma.user.update({
      where: { email },
      data: {
        resetPasswordCode: code,
        resetPasswordExpires: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    const html = getPasswordResetTemplate(code);

    await this.emailService.sendEmail(
      email,
      'Confirmação de E-mail',
      html
    );
    return { message: 'Password reset code sent to email' };
  }

  async verifyCode(verifyCodeDto: VerifyCodeDto) {
    const { email, code } = verifyCodeDto;

    // Check if user exists
    const user = await this.prisma.user.findUnique({ where: { email } });
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
    const { email, code, password, confirmPassword } = resetPasswordDto;

    // Validate password confirmation
    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({ where: { email } });
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
    await this.prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        resetPasswordCode: null,
        resetPasswordExpires: null,
      },
    });

    // Buscar usuário atualizado
    const updatedUser = await this.prisma.user.findUnique({
      where: { email },
      select: this.authUser,
    });
    if (!updatedUser) {
      throw new BadRequestException('User not found after password reset');
    }

    // Montar dados do usuário (igual login)
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

  async verifyEmail(email: string, code: string) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { email },
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
        emailConfirmationExpires: true,
      }
    });

    if (!user) {
      throw new BadRequestException('User with this email does not exist');
    }

    // Check if email is already verified
    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Check if code exists and is not expired
    if (!user.emailConfirmationCode || !user.emailConfirmationExpires) {
      throw new BadRequestException('No confirmation code found or code has expired');
    }

    if (user.emailConfirmationCode !== code) {
      throw new BadRequestException('Invalid confirmation code');
    }

    if (new Date() > user.emailConfirmationExpires) {
      throw new BadRequestException('Confirmation code has expired');
    }

    // Update user to verified
    await this.prisma.user.update({
      where: { email },
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

    return {
      access: {
        accessToken,
        refreshToken,
        expiresIn,
      },
      user: userData,
    };
  }
}
