import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { env } from '../env';
import { normalizeEmailRequired } from '../utils/email.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.JWT_SECRET,
    });
  }

  async validate(payload: { email: string; storeId: string }) {
    const normalizedEmail = normalizeEmailRequired(payload.email);
    const user = await this.prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        storeId: payload.storeId,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Login is required');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...data } = user;

    return data;
  }
}
