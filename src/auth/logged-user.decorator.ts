import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { User } from 'src/user/entities/user.entity';

export const LoggedUser = createParamDecorator((_, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const user: User = request.user;

  const { password, ...data } = user;

    return data;
});