import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoleNames = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );

    if (!requiredRoleNames) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('No user or role found');
    }

    // Get the user's role name directly
    const userRoleName = user.role;

    if (!userRoleName) {
      throw new ForbiddenException("User's role not found");
    }

    if (!requiredRoleNames.includes(userRoleName)) {
      throw new ForbiddenException(
        `Access denied! This route requires one of these roles: ${requiredRoleNames.join(', ')}`,
      );
    }

    return true;
  }
}
