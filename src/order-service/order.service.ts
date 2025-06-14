
import { Inject, Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { Order, OrderDocument } from '../schema/order.schema';
import { CreateOrderDto, PaymentSuccessDto, AddReviewDto, RefundOrderDto } from './dto/create-order.dto';
import { PaymentService, CartService, ProductService, AuthServiceGrpc } from '../interface/payment.interface';

@Injectable()
export class OrderService {
  private paymentService: PaymentService;
  private cartService: CartService;
  private productService: ProductService;
  private authService : AuthServiceGrpc;

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @Inject('AUTH_PACKAGE') private readonly client: ClientGrpc,
    @Inject('PAYMENT_PACKAGE') private readonly paymentClient: ClientGrpc,
    @Inject('CART_PACKAGE') private readonly cartClient: ClientGrpc,
    @Inject('PRODUCT_PACKAGE') private readonly productClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.paymentService = this.paymentClient.getService<PaymentService>('PaymentService');
        this.authService = this.client.getService<AuthServiceGrpc>('AuthService');
    this.cartService = this.cartClient.getService<CartService>('CartService');
    this.productService = this.productClient.getService<ProductService>('ProductService');
  }


  async validateAccessToken(token: string): Promise<{
    isValid: boolean;
    message?: string;
    entityId: string;
    email?: string;
    deviceId?: string;
    role?: string;
  }> {
    try {
      const response = await lastValueFrom(this.authService.validateToken({ accessToken: token }));
      console.log(response);
      return response;
    } catch (error) {
      throw new UnauthorizedException("Invalid token");
    }
  }


  async createOrder(dto: CreateOrderDto) {
    // Get cart details from cart service
    // console.log("hhsdhdj");
    const cartData = await lastValueFrom(
      this.cartService.GetCartDetails({ userId: dto.userId }),
    );

    console.log('Cart Data:', cartData);

    if (!cartData || cartData.items.length === 0) {
      throw new NotFoundException('Cart is empty');
    }

    const totalPrice = 100;

    // Create order in database
    const order = new this.orderModel({
      userId: dto.userId,
      products: cartData.items,
      address: dto.address,
      totalPrice,
      status: 'PENDING',
      paymentStatus: 'PENDING',
    });

    const savedOrder = await order.save();
    // console.log(order.id);
    // console.log(savedOrder.id);
    const orderId = String(savedOrder.id)
    // Create checkout session
    const checkoutSession = await lastValueFrom(
      this.paymentService.CreateCheckoutSession({
        orderId: orderId,
        amount: Math.round(totalPrice * 100), // Convert to cents
        currency: 'usd',
      }),
    );

    // Update order with session details
    savedOrder.sessionId = checkoutSession.sessionId;
    savedOrder.paymentUrl = checkoutSession.paymentUrl;
    await savedOrder.save();

    return {
      orderId: savedOrder._id,
      sessionId: checkoutSession.sessionId,
      paymentUrl: checkoutSession.paymentUrl,
      totalPrice,
      products: cartData.items,
    };
  }

  async handlePaymentSuccess(dto: PaymentSuccessDto) {
    const order = await this.orderModel.findById(dto.orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Update order status
    order.status = 'PLACED';
    order.paymentStatus = 'SUCCEEDED';
    order.sessionId = dto.sessionId;
    await order.save();

    // Update product stock
    const stockUpdates = order.products.map(product => ({
      productId: product.productId,
      quantity: product.quantity,
      size: product.size,
      color: product.color,
    }));

        // Clear user's cart
    await lastValueFrom(
      this.cartService.ClearCart({ userId: order.userId }),
    );


    await lastValueFrom(
      this.productService.UpdateProductStock({ updates: stockUpdates }),
    );

    return { success: true, orderId: order._id };
  }

  async refundOrder(dto: RefundOrderDto) {
    const order = await this.orderModel.findOne({ 
      _id: dto.orderId, 
      userId: dto.userId 
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'PLACED' && order.status !== 'DELIVERED') {
      throw new BadRequestException('Order cannot be refunded');
    }

    if (order.paymentStatus !== 'SUCCEEDED') {
      throw new BadRequestException('Payment not completed, cannot refund');
    }

    if (!order.sessionId) {
      throw new BadRequestException('Session ID not found');
    }

    // Check if order is within refund period (e.g., 30 days)
    const orderDate = new Date(order.createdAt);
    const currentDate = new Date();
    const daysDiff = Math.floor((currentDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 30) {
      throw new BadRequestException('Refund period has expired (30 days)');
    }

    // Create refund request
    const refundResponse = await lastValueFrom(
      this.paymentService.CreateRefundRequest({
        orderId: String(order._id),
        sessionId: order.sessionId,
      }),
    );

    // Update order status
    order.status = 'REFUNDED';
    order.paymentStatus = 'REFUNDED';
    order.refundId = refundResponse.refundId;
    await order.save();

    // Restore product stock
    const stockUpdates = order.products.map(product => ({
      productId: product.productId,
      quantity: -product.quantity, // Negative to restore stock
      size: product.size,
      color: product.color,
    }));

    await lastValueFrom(
      this.productService.UpdateProductStock({ updates: stockUpdates }),
    );

    return { 
      success: true, 
      orderId: order._id,
      refundId: refundResponse.refundId,
      message: 'Refund processed successfully' 
    };
  }

  async getAllOrdersByUser(userId: string) {
    return this.orderModel.find({ userId }).sort({ createdAt: -1 });
  }

  async getOrderById(orderId: string, userId: string) {
    const order = await this.orderModel.findOne({ _id: orderId, userId });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async cancelOrder(orderId: string, userId: string) {
    const order = await this.orderModel.findOne({ _id: orderId, userId });
    if (!order || order.status !== 'PENDING') {
      throw new BadRequestException('Cannot cancel this order');
    }
    
    order.status = 'CANCELED';
    await order.save();
    
    return { success: true, message: 'Order cancelled successfully' };
  }

  async exchangeOrder(orderId: string, userId: string) {
    const order = await this.orderModel.findOne({ _id: orderId, userId });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    
    const diff = new Date().getTime() - new Date(order.createdAt).getTime();
    const days = diff / (1000 * 3600 * 24);
    
    if (days > 7 || order.status !== 'DELIVERED') {
      throw new BadRequestException('Exchange not allowed');
    }
    
    order.status = 'EXCHANGED';
    await order.save();
    
    return { success: true, message: 'Exchange request submitted' };
  }

  async addReview(dto: AddReviewDto) {
    const order = await this.orderModel.findOne({ 
      _id: dto.orderId, 
      userId: dto.userId 
    });
    
    if (!order) throw new NotFoundException('Order not found');
    
    if (order.status !== 'DELIVERED') {
      throw new BadRequestException('Can only review delivered orders');
    }
    
    order.reviews.push({ 
      productId: dto.productId, 
      review: dto.review 
    });
    
    await order.save();
    
    return { success: true, message: 'Review added successfully' };
  }

  // Admin methods
  async updateOrderStatus(orderId: string, status: string) {
    const validStatuses = ['PENDING', 'PLACED', 'CANCELED', 'DELIVERED', 'EXCHANGED', 'REFUNDED'];
    
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Invalid status');
    }

    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    order.status = status;
    await order.save();

    return { success: true, message: `Order status updated to ${status}` };
  }

  async getAllOrders(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    const orders = await this.orderModel
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await this.orderModel.countDocuments();

    return {
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}