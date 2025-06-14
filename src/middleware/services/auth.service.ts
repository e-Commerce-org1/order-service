import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthGrpcService } from './auth-grpc.services';

export interface TokenValidationResponse {
  isValid: boolean;
  message?: string;
  entityId: string;
  email?: string;
  deviceId?: string;
  role?: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly authGrpcService: AuthGrpcService) {}

  validateToken(data: { accessToken: string }): Observable<TokenValidationResponse> {
    return this.authGrpcService.validateToken(data.accessToken);
  }
}