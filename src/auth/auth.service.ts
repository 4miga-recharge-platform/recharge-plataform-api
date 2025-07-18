import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
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
}
