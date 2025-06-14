import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';

interface AuthService {
  validateToken(request: { accessToken: string }): Observable<{
    isValid: boolean;
    entityId: string;
  }>;
}

@Injectable()
export class AuthGrpcService implements OnModuleInit {
  private authService: AuthService;

  constructor(
    @Inject('AUTH_PACKAGE') private client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.authService = this.client.getService<AuthService>('AuthService');
  }

  validateToken(accessToken: string): Observable<{
    isValid: boolean;
    entityId: string;
  }> {
    return this.authService.validateToken({ accessToken });
  }
}