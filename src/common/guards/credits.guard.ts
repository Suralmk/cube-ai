import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class CreditsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { credits?: number } }>();

    const credits = request.user?.credits ?? 0;

    if (credits <= 0) {
      throw new ForbiddenException('Insufficient credits');
    }

    return true;
  }
}
