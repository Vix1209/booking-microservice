import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from 'apps/booking-microservice/src/authentication/users/entities/user.entity';

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as User;
  },
);
