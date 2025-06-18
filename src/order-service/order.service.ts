
import { Inject, Injectable, UnauthorizedException, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { Order, OrderDocument } from '../schema/order.schema';
import { CreateOrderDto, PaymentSuccessDto, AddReviewDto, RefundOrderDto } from './dto/create-order.dto';
import { PaymentService, CartService, ProductService, AuthServiceGrpc } from '../interface/payment.interface';
import { HTTP_STATUS } from './common/constants/http-status';
import { RESPONSE_MESSAGES } from './common/constants/order-message';
import { logger } from './common/logger';

@Injectable()
export class OrderService {
  private paymentService: PaymentService;
  private cartService: CartService;
  private productService: ProductService;
  private authService: AuthServiceGrpc;

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
      logger.log({ level: 'info', message: `Token validation response: ${JSON.stringify(response)}` });
      return response;
    } catch (error) {
      logger.error(`Invalid token: ${error.message}`);
      throw new UnauthorizedException(RESPONSE_MESSAGES.INVALID_TOKEN);
    }
  }

  async createOrder(dto: CreateOrderDto) {
    try {
      logger.log({ level: 'info', message: 'Creating order...' });
      let cartData: any[] = [];
      try {
        const cartResponse = await lastValueFrom(this.cartService.GetCartDetails({ userId: dto.userId }));
        logger.log({ level: 'info', message: `Full Cart response: ${JSON.stringify(cartResponse)}` });
        cartData = cartResponse?.items || [];
      } catch (error) {
        if (error.response && error.response.code === 5) { // gRPC NotFound
          logger.warn('Cart not found, treating as empty');
          cartData = [];
        } else {
          throw error;
        }
      }

      if (cartData.length === 0) {
        logger.warn('Cart is empty');
        throw new NotFoundException(RESPONSE_MESSAGES.CART_EMPTY);
      }

      const totalPrice = cartData.reduce((sum, item) => sum + item.price * item.quantity, 0);

      const order = new this.orderModel({
        userId: dto.userId,
        products: cartData,
        address: dto.address,
        totalPrice,
        status: 'PENDING',
        paymentStatus: 'PENDING',
      });

      const savedOrder = await order.save();
      logger.log({ level: 'info', message: `Order saved: ${JSON.stringify(savedOrder)}` });

      const orderId = String(savedOrder.id);

      let checkoutSession;
      try {
        logger.log({ level: 'info', message: 'Creating checkout session...' });
        checkoutSession = await lastValueFrom(
          this.paymentService.CreateCheckoutSession({
            orderId: orderId,
            amount: Math.round(totalPrice * 100),
            currency: 'usd',
          }),
        );
        logger.log({ level: 'info', message: `Checkout session created: ${JSON.stringify(checkoutSession)}` });
      } catch (error) {
        logger.error(`Error creating checkout session: ${error.message}`, error.stack);
        throw new InternalServerErrorException(RESPONSE_MESSAGES.PAYMENT_FAILED);
      }

      savedOrder.sessionId = checkoutSession.sessionId;
      savedOrder.paymentUrl = checkoutSession.paymentUrl;
      await savedOrder.save();

      logger.log({ level: 'info', message: `Order created successfully with session: ${JSON.stringify({
        orderId: savedOrder._id,
        sessionId: checkoutSession.sessionId,
        paymentUrl: checkoutSession.paymentUrl,
      })}` });

      return {
        orderId: savedOrder._id,
        sessionId: checkoutSession.sessionId,
        paymentUrl: checkoutSession.paymentUrl,
        totalPrice,
        products: cartData,
      };
    } catch (error) {
      logger.error(`Failed to create order: ${error.message}`, error.stack);
      throw new InternalServerErrorException(RESPONSE_MESSAGES.ORDER_CREATION_FAILED);
    }
  }

  async handlePaymentSuccess(dto: PaymentSuccessDto) {
    try {
      const order = await this.orderModel.findById(dto.orderId);
      if (!order) {
        logger.warn(RESPONSE_MESSAGES.ORDER_NOT_FOUND);
        throw new NotFoundException(RESPONSE_MESSAGES.ORDER_NOT_FOUND);
      }

      order.status = 'PLACED';
      order.paymentStatus = 'SUCCEEDED';
      order.sessionId = dto.sessionId;
      await order.save();

      const stockUpdates = order.products.map(product => ({
        productId: product.productId,
        quantity: product.quantity,
        size: product.size,
        color: product.color,
        increase: false,
      }));

      await lastValueFrom(this.cartService.ClearCart({ userId: order.userId }));

      await lastValueFrom(this.productService.UpdateInventoryByOrder({ updates: stockUpdates }));

      return { success: true, orderId: order._id };
    } catch (error) {
      logger.error(`Failed to handle payment success: ${error.message}`, error.stack);
      throw new InternalServerErrorException(RESPONSE_MESSAGES.PAYMENT_SUCCESS_HANDLING_FAILED);
    }
  }
//
  async refundOrder(dto: RefundOrderDto) {
    try {
      const order = await this.orderModel.findOne({ _id: dto.orderId, userId: dto.userId });

      if (!order) {
        logger.warn(RESPONSE_MESSAGES.ORDER_NOT_FOUND);
        throw new NotFoundException(RESPONSE_MESSAGES.ORDER_NOT_FOUND);
      }

      if (order.status !== 'PLACED' && order.status !== 'DELIVERED') {
        logger.warn(RESPONSE_MESSAGES.ORDER_CANNOT_BE_REFUNDED);
        throw new BadRequestException(RESPONSE_MESSAGES.ORDER_CANNOT_BE_REFUNDED);
      }

      if (order.paymentStatus !== 'SUCCEEDED') {
        logger.warn(RESPONSE_MESSAGES.PAYMENT_NOT_COMPLETED);
        throw new BadRequestException(RESPONSE_MESSAGES.PAYMENT_NOT_COMPLETED);
      }

      if (!order.sessionId) {
        logger.warn(RESPONSE_MESSAGES.SESSION_ID_NOT_FOUND);
        throw new BadRequestException(RESPONSE_MESSAGES.SESSION_ID_NOT_FOUND);
      }

      const orderDate = new Date(order.createdAt);
      const currentDate = new Date();
      const daysDiff = Math.floor((currentDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff > 30) {
        logger.warn(RESPONSE_MESSAGES.REFUND_PERIOD_EXPIRED);
        throw new BadRequestException(RESPONSE_MESSAGES.REFUND_PERIOD_EXPIRED);
      }

      const refundResponse = await lastValueFrom(
        this.paymentService.CreateRefundRequest({
          orderId: String(order._id),
          sessionId: order.sessionId,
        }),
      );

      order.status = 'REFUNDED';
      order.paymentStatus = 'REFUNDED';
      order.refundId = refundResponse.refundId;
      await order.save();

      const stockUpdates = order.products.map(product => ({
        productId: product.productId,
        quantity: -product.quantity,
        size: product.size,
        color: product.color,
        increase: false,
      }));

      await lastValueFrom(this.productService.UpdateInventoryByOrder({ updates: stockUpdates }));

      return {
        success: true,
        orderId: order._id,
        refundId: refundResponse.refundId,
        message: RESPONSE_MESSAGES.ORDER_REFUNDED_SUCCESS,
      };
    } catch (error) {
      logger.error(`Failed to process refund: ${error.message}`, error.stack);
      throw new InternalServerErrorException(RESPONSE_MESSAGES.REFUND_FAILED);
    }
  }

  async getAllOrdersByUser(userId: string) {
    try {
      return await this.orderModel.find({ userId }).sort({ createdAt: -1 });
    } catch (error) {
      logger.error(`Failed to get orders by user: ${error.message}`, error.stack);
      throw new InternalServerErrorException(RESPONSE_MESSAGES.ORDER_FETCH_FAILED);
    }
  }

  async getOrderById(orderId: string, userId: string) {
    try {
      const order = await this.orderModel.findOne({ _id: orderId, userId });
      if (!order) {
        logger.warn(RESPONSE_MESSAGES.ORDER_NOT_FOUND);
        throw new NotFoundException(RESPONSE_MESSAGES.ORDER_NOT_FOUND);
      }
      return order;
    } catch (error) {
      logger.error(`Failed to get order by id: ${error.message}`, error.stack);
      throw new InternalServerErrorException(RESPONSE_MESSAGES.ORDER_FETCH_FAILED);
    }
  }

  async cancelOrder(orderId: string, userId: string) {
    try {
      const order = await this.orderModel.findOne({ _id: orderId, userId });
      if (!order || order.status !== 'PENDING') {
        logger.warn(RESPONSE_MESSAGES.ORDER_CANCEL_FAILED);
        throw new BadRequestException(RESPONSE_MESSAGES.ORDER_CANCEL_FAILED);
      }
      
      order.status = 'CANCELED';
      await order.save();
      
      return { success: true, message: RESPONSE_MESSAGES.ORDER_CANCELLED_SUCCESS };
    } catch (error) {
      logger.error(`Failed to cancel order: ${error.message}`, error.stack);
      throw new InternalServerErrorException(RESPONSE_MESSAGES.ORDER_CANCEL_FAILED);
    }
  }

  async exchangeOrder(orderId: string, userId: string) {
    try {
      const order = await this.orderModel.findOne({ _id: orderId, userId });
      if (!order) {
        logger.warn(RESPONSE_MESSAGES.ORDER_NOT_FOUND);
        throw new NotFoundException(RESPONSE_MESSAGES.ORDER_NOT_FOUND);
      }
      
      const diff = new Date().getTime() - new Date(order.createdAt).getTime();
      const days = diff / (1000 * 3600 * 24);
      
      if (days > 7 || order.status !== 'DELIVERED') {
        logger.warn(RESPONSE_MESSAGES.EXCHANGE_NOT_ALLOWED);
        throw new BadRequestException(RESPONSE_MESSAGES.EXCHANGE_NOT_ALLOWED);
      }
      
      order.status = 'EXCHANGED';
      await order.save();
      
      return { success: true, message: RESPONSE_MESSAGES.ORDER_EXCHANGED_SUCCESS };
    } catch (error) {
      logger.error(`Failed to exchange order: ${error.message}`, error.stack);
      throw new InternalServerErrorException(RESPONSE_MESSAGES.ORDER_EXCHANGE_FAILED);
    }
  }

  async addReview(dto: AddReviewDto) {
    try {
      const order = await this.orderModel.findOne({ _id: dto.orderId, userId: dto.userId });
      
      if (!order) {
        logger.warn(RESPONSE_MESSAGES.ORDER_NOT_FOUND);
        throw new NotFoundException(RESPONSE_MESSAGES.ORDER_NOT_FOUND);
      }
      
      if (order.status !== 'DELIVERED') {
        logger.warn(RESPONSE_MESSAGES.REVIEW_ADD_FAILED);
        throw new BadRequestException(RESPONSE_MESSAGES.REVIEW_ADD_FAILED);
      }
      
      order.reviews.push({ 
        productId: dto.productId, 
        review: dto.review 
      });
      
      await order.save();
      
      return { success: true, message: RESPONSE_MESSAGES.REVIEW_ADDED_SUCCESS };
    } catch (error) {
      logger.error(`Failed to add review: ${error.message}`, error.stack);
      throw new InternalServerErrorException(RESPONSE_MESSAGES.REVIEW_ADD_FAILED);
    }
  }

  // Admin methods
  async updateOrderStatus(orderId: string, status: string) {
    try {
      const validStatuses = ['PENDING', 'PLACED', 'CANCELED', 'DELIVERED', 'EXCHANGED', 'REFUNDED'];
      
      if (!validStatuses.includes(status)) {
        logger.warn(RESPONSE_MESSAGES.INVALID_STATUS);
        throw new BadRequestException(RESPONSE_MESSAGES.INVALID_STATUS);
      }

      const order = await this.orderModel.findById(orderId);
      if (!order) {
        logger.warn(RESPONSE_MESSAGES.ORDER_NOT_FOUND);
        throw new NotFoundException(RESPONSE_MESSAGES.ORDER_NOT_FOUND);
      }

      order.status = status;
      await order.save();

      return { success: true, message: `Order status updated to ${status}` };
    } catch (error) {
      logger.error(`Failed to update order status: ${error.message}`, error.stack);
      throw new InternalServerErrorException(RESPONSE_MESSAGES.ORDER_STATUS_UPDATE_FAILED);
    }
  }

  async getAllOrders(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const orders = await this.orderModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await this.orderModel.countDocuments();

      return {
        orders:orders || [],
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error(`Failed to get all orders: ${error.message}`, error.stack);
      throw new InternalServerErrorException(RESPONSE_MESSAGES.ORDER_FETCH_ALL_FAILED);
    }
  }
}
