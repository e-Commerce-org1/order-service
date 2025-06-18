
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
  constructor(private orderService: OrderService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Detect if HTTP or gRPC context
    const ctxType = context.getType<'http' | 'rpc' | 'ws'>();
    let token: string | undefined;
    if (ctxType === 'http') {
      const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
      token = this.extractTokenFromHeader(request);
      if (!token) {
        throw new UnauthorizedException('Missing access token');
      }
      try {
        const validation = await this.orderService.validateAccessToken(token);
        if (!validation.isValid) {
          throw new UnauthorizedException(validation.message || 'Invalid token');
        }
        request.user = {
          userId: validation.entityId || (validation as any).userId,
        };
        return true;
      } catch (error) {
        throw new UnauthorizedException('Invalid token');
      }
    } else if (ctxType === 'rpc') {
      const rpcContext = context.switchToRpc();
      const data = rpcContext.getData();
      const metadata = rpcContext.getContext();
      // Extract token from metadata
      token = metadata?.authorization || metadata?.Authorization;
      if (!token && metadata?.get) {
        // For grpc-js metadata object
        token = metadata.get('authorization')[0] || metadata.get('Authorization')[0];
      }
      if (!token) {
        throw new UnauthorizedException('Missing access token');
      }
      if (token.startsWith('Bearer ')) {
        token = token.substring(7);
      }
      try {
        const validation = await this.orderService.validateAccessToken(token);
        if (!validation.isValid) {
          throw new UnauthorizedException(validation.message || 'Invalid token');
        }
        // Attach user info to data or context for controller access
        data.user = {
          userId: validation.entityId || (validation as any).userId,
        };
        return true;
      } catch (error) {
        throw new UnauthorizedException('Invalid token');
      }
    } else {
      // For other context types, deny access
      throw new UnauthorizedException('Unsupported context type');
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
