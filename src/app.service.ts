import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom, Observable } from 'rxjs';
import { OrderDocument, OrderStatus } from './schema/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';

export interface CartItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface GetCartResponse {
  userId: string;
  items: CartItem[];
}

export interface CartServiceGrpc {
  getCart(userId: string): Observable<GetCartResponse>;
}

export interface AuthServiceGrpc {
  validateToken(data: string): Observable<ValidateTokenResponse>;
}

export interface UserServiceGrpc {
  getUser(userId: string): Observable<GetUserResponse>;
}

export interface ValidateTokenResponse {
  isValid: boolean;
  userId: string;
}

export interface GetUserResponse {
  id: string;
  username: string;
  email: string;
}

@Injectable()
export class OrderService implements OnModuleInit {
  private authServiceGrpc: AuthServiceGrpc;
  private userServiceGrpc: UserServiceGrpc;
  private cartServiceGrpc: CartServiceGrpc;

  constructor(
    @Inject('AUTH_PACKAGE') private authClient: ClientGrpc,
    @Inject('USER_PACKAGE') private userClient: ClientGrpc,
    @Inject('CART_PACKAGE') private cartClient: ClientGrpc,
    @InjectModel('Order') private orderModel: Model<OrderDocument>,
  ) {}

  onModuleInit() {
    this.authServiceGrpc = this.authClient.getService<AuthServiceGrpc>('AuthService');
    this.userServiceGrpc = this.userClient.getService<UserServiceGrpc>('UserService');
    this.cartServiceGrpc = this.cartClient.getService<CartServiceGrpc>('CartService');
  }

  private async validateToken(token: string): Promise<{ userId: string }> {
    try {
      const response = await lastValueFrom(
        this.authServiceGrpc.validateToken(token),
      );
      if (!response.isValid || !response.userId) {
        throw new UnauthorizedException('Invalid token');
      }
      return { userId: response.userId };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private async validateUser(userId: string): Promise<void> {
    try {
      const user = await lastValueFrom(this.userServiceGrpc.getUser(userId));
      if (!user.id) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
    } catch (error) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
  }

  async createOrder(data: { createOrderDto: CreateOrderDto; token: string }) {
    const { createOrderDto, token } = data;
    if (!createOrderDto || !createOrderDto.idempotenceKey) {
      throw new BadRequestException('Missing idempotence key or invalid input');
    }

    const { userId } = await this.validateToken(token);
    // Check for duplicate order (idempotency)
    const existingOrder = await this.orderModel.findOne({
      idempotenceKey: createOrderDto.idempotenceKey,
    });
    if (existingOrder) {
      return {
        message: 'Order already exists',
        orderId: existingOrder._id,
      };
    }

    // Fetch cart details
    let cart: GetCartResponse;
    try {
      cart = await lastValueFrom(this.cartServiceGrpc.getCart(userId));
      if (!cart.items || cart.items.length === 0) {
        throw new BadRequestException('Cart is empty');
      }
    } catch (error) {
      throw new BadRequestException('Unable to retrieve cart details');
    }

    await this.validateUser(userId);

    // Create order with cart details and additional data
    const orderData = {
      ...createOrderDto,
      userId,
      items: cart.items,
      status: OrderStatus.PENDING,
      isCancelled: false,
    };

    const order = new this.orderModel(orderData);
    await order.save();

    return {
      message: 'Order has been created',
      orderId: order._id,
      order: {
        ...orderData,
        _id: order._id,
      },
    };
  }

  async cancelOrder(data: { cancelOrderDto: CancelOrderDto }) {
    const order = await this.orderModel.findById(data.cancelOrderDto.orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.isCancelled) {
      throw new BadRequestException('Order is already cancelled');
    }
    if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.SHIPPED) {
      throw new BadRequestException('Cannot cancel order in current status');
    }

    order.isCancelled = true;
    order.status = OrderStatus.CANCELLED;
    // updatedAt is managed by mongoose timestamps, no need to set manually
    await order.save();

    return {
      message: 'Order cancelled successfully',
      orderId: order._id,
    };
  }

  async getOrderStatus(data: { orderId: string }) {
    const order = await this.orderModel.findById(data.orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      message: 'Order status retrieved successfully',
      orderId: order._id,
      status: order.status,
      isCancelled: order.isCancelled,
    };
  }

  async updateOrderStatus(data: { orderId: string; statusValue: OrderStatus }) {
    const order = await this.orderModel.findById(data.orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.isCancelled) {
      throw new BadRequestException('Cannot update status of cancelled order');
    }
    if (data.statusValue === order.status) {
      throw new BadRequestException('Order already in requested status');
    }

    order.status = data.statusValue;
    // updatedAt is managed by mongoose timestamps, no need to set manually
    await order.save();

    return {
      message: 'Order status updated successfully',
      orderId: order._id,
      status: order.status,
    };
  }

  async getOrderHistory(data: { userId: string; token: string }) {
    // Validate token and user
    await this.validateToken(data.token);
    await this.validateUser(data.userId);

    const orders = await this.orderModel
      .find({
        userId: data.userId,
      })
      .sort({ createdAt: -1 }); // Sort by creation date, newest first

    if (!orders || orders.length === 0) {
      return {
        message: 'No orders found for this user',
        orders: [],
      };
    }

    return {
      message: 'Order history retrieved successfully',
      orders: orders.map((order) => ({
        orderId: order._id,
        userId: order.userId,
        items: order.items,
        status: order.status,
        isCancelled: order.isCancelled,
        // createdAt: order.createdAt,
        // updatedAt: order.updatedAt,
        // idempotencyKey: order.idempotencyKey,
      })),
    };
  }
}
