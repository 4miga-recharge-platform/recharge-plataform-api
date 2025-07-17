import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { User } from 'src/user/entities/user.entity';
import { LoggedUser } from './logged-user.decorator';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({summary: 'Make login and get auth token'})
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('token')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Return auth user',
  })
  profile(@LoggedUser() user: User) {
    // Filtrar apenas os campos necessários, excluindo dados sensíveis
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
}
