
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { OrderService } from '../order-service/order.service';
import { IncomingHttpHeaders } from 'http';

interface AuthenticatedRequest extends Request {
  headers: IncomingHttpHeaders & {
    authorization?: string; 
  };
  user?: {
    userId: string;
    email?: string;
    deviceId?: string;
    role?: string;
  };
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private userService: OrderService) {}

async canActivate(context: ExecutionContext): Promise<boolean> {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  const token = this.extractTokenFromHeader(request); 
  console.log(`Extracted token: ${token}`); 
  if (!token) {
    throw new UnauthorizedException('Missing access token');
  }
  try {
    const validation = await this.userService.validateAccessToken(token);
    console.log('Token validation response:', validation);
    if (!validation.isValid) {
      throw new UnauthorizedException(validation.message || 'Invalid token');
    }
    request.user = {
      userId: validation.entityId || (validation as any).userId,
   // userId: validation.userId,
      // email: validation.email,
      // deviceId: validation.deviceId,
      // role: validation.role,
    };
    console.log('User set in request:', request.user);
    return true;
  } catch (error) {
    console.error('Token validation error:', error);
    throw new UnauthorizedException('Invalid token');
  }
}

  public extractTokenFromHeader(request: AuthenticatedRequest): string | undefined {
    const authorization = request.headers.authorization;
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return undefined;
    }
    return authorization.substring(7); 
  }
}
