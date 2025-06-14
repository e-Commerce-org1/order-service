import { Observable } from 'rxjs';

// Payment Service Interface
export interface PaymentService {
  CreateCheckoutSession(data: {
    orderId: string;
    amount: number;
    currency: string;
  }): Observable<{
    sessionId: string;
    paymentUrl: string;
  }>;

  CreateRefundRequest(data: {
    orderId: string;
    sessionId: string;
  }): Observable<{
    refundId: string;
    status: number;
  }>;
}

export interface AuthServiceGrpc {
 
  validateToken(data: { accessToken: string }): Observable<{
    isValid: boolean;
    message?: string;
    entityId: string;
    email?: string;
    deviceId?: string;
    role?: string;
  }>;
}

// Cart Service Interface
export interface CartService {
  GetCartDetails(data: { userId: string }): Observable<{
    items: {
      productId: string;
      description: string;
      color: string;
      size: string;
      quantity: number;
      price: number;
    }[];
  }>;

  ClearCart(data: { userId: string }): Observable<{ success: boolean }>;
}

// Product Service Interface
export interface ProductService {
  UpdateProductStock(data: {
    updates: {
      productId: string;
      quantity: number;
      size: string;
      color: string;
    }[];
  }): Observable<{ success: boolean }>;
}