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
  UpdateInventoryByOrder(data: {
    updates: {
      productId: string;
      size: string;
      color: string;
      quantity: number;
      increase:boolean;
    }[];
  }): Observable<{ code:number,status:string,timestamp:string,data:string,error:string }>;
}

// OrderResponse interface based on proto order.OrderResponse
export interface OrderResponse {
  orderId: string;
  userId: string;
  products: ProductItem[];
  address: Address;
  totalPrice: number;
  status: string;
  paymentStatus?: string;
  sessionId?: string;
  paymentUrl?: string;
  refundId?: string;
  reviews?: ReviewItem[];
  createdAt: string; // ISO 8601 string
}

export interface ProductItem {
  productId: string;
  description: string;
  color: string;
  size: string;
  quantity: number;
  price: number;
}

export interface Address {
  name?: string;
  phoneNumber?: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface ReviewItem {
  productId: string;
  review: string;
}

// GetAllOrdersResponse interface based on proto order.GetAllOrdersResponse
export interface GetAllOrdersResponse {
  orders: OrderResponse[];
  total: number;
  page: number;
  totalPages: number;
}

// UpdateOrderStatusResponse interface based on proto order.UpdateOrderStatusResponse
export interface UpdateOrderStatusResponse {
  success: boolean;
  message: string;
}

// Order gRPC Service Interface for admin
export interface OrderGrpcServiceInterface {
  getOrderDetails(data: { orderId: string }): Observable<OrderResponse>;
  getOrders(page: number, limit: number): Observable<GetAllOrdersResponse>;
  updateOrderStatusGrpc(data: { orderId: string; status: string }): Observable<UpdateOrderStatusResponse>;
}
