import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from 'src/user/entities/user.entity';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendEmailConfirmationDto } from './dto/resend-email-confirmation.dto';
import { LoggedUser } from './logged-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RequestEmailChangeDto } from './dto/request-email-change.dto';
import { ConfirmEmailChangeDto } from './dto/confirm-email-change.dto';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Make login and get auth token' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refreshAccessToken(body.refreshToken);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset code by email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email, dto.storeId);
  }

  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify password reset code' })
  async verifyCode(@Body() dto: VerifyCodeDto) {
    return this.authService.verifyCode(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with code' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify user email with confirmation code' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.email, dto.code, dto.storeId);
  }

  @Post('resend-email-confirmation')
  @ApiOperation({ summary: 'Resend email confirmation code' })
  async resendEmailConfirmation(@Body() dto: ResendEmailConfirmationDto) {
    return this.authService.resendEmailConfirmation(dto.email, dto.storeId);
  }

  @Get('token')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Return auth user',
  })
  profile(@LoggedUser() user: User) {
    const filteredUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      documentType: user.documentType,
      documentValue: user.documentValue,
      role: user.role,
      storeId: user.storeId,
    };

    return {
      user: filteredUser,
    };
  }

  @Post('request-email-change')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar alteração de e-mail (envia código para o novo e-mail)' })
  async requestEmailChange(@LoggedUser() user: User, @Body() dto: RequestEmailChangeDto) {
    return this.authService.requestEmailChange(user.email, dto.newEmail, user.storeId);
  }

  @Post('confirm-email-change')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar alteração de e-mail com código' })
  async confirmEmailChange(@LoggedUser() user: User, @Body() dto: ConfirmEmailChangeDto) {
    // Preferimos `user` do token para currentEmail e storeId
    return this.authService.confirmEmailChange(user.email, dto.newEmail, dto.code, user.storeId);
  }

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar senha do usuário autenticado' })
  async changePassword(@LoggedUser() user: User, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto);
  }
}
