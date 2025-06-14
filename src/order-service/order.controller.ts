import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Put,
  UseGuards,
  Req,
} from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Request } from 'express';
import { OrderService } from './order.service';
import {
  CreateOrderDto,
  PaymentSuccessDto,
  AddReviewDto,
  RefundOrderDto,
} from './dto/create-order.dto';
import { AuthGuard } from 'src/middleware/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { request } from 'http';

@Controller('orders')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('create')
  async createOrder(@Body() dto: CreateOrderDto, @Req() req: any) {
    const userId = '684b24af25685f85d1d4f2f4';
    // const userId = req.user?.userId;
    // console.log('User ID from request:', userId);
    return this.orderService.createOrder({ ...dto, userId });
  }

  @Post('payment-success')
  async paymentSuccess(@Body() dto: PaymentSuccessDto) {
    return this.orderService.handlePaymentSuccess(dto);
  }

  @Post('refund')
  async refundOrder(
    @Body() dto: Omit<RefundOrderDto, 'userId'>,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;
    return this.orderService.refundOrder({ ...dto, userId });
  }

  @Get('user')
  async getUserOrders(@Req() req: any) {
    const userId = req.user?.userId;
    return this.orderService.getAllOrdersByUser(userId);
  }

  @Get(':orderId')
  async getOrder(@Param('orderId') orderId: string, @Req() req: any) {
    const userId = req.user?.userId;
    return this.orderService.getOrderById(orderId, userId);
  }

  @Post(':orderId/cancel')
  async cancelOrder(@Param('orderId') orderId: string, @Req() req: any) {
    const userId = req.user?.userId;
    return this.orderService.cancelOrder(orderId, userId);
  }

  @Post(':orderId/exchange')
  async exchangeOrder(@Param('orderId') orderId: string, @Req() req: any) {
    const userId = req.user?.userId;
    return this.orderService.exchangeOrder(orderId, userId);
  }

  @Post('review')
  async addReview(@Body() dto: Omit<AddReviewDto, 'userId'>, @Req() req: any) {
    const userId = req.user?.userId;
    return this.orderService.addReview({ ...dto, userId });
  }

  // Admin routes
  @Get()
  async getAllOrders(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.orderService.getAllOrders(page, limit);
  }

  @Put(':orderId/status')
  async updateOrderStatus(
    @Param('orderId') orderId: string,
    @Body() body: { status: string },
  ) {
    return this.orderService.updateOrderStatus(orderId, body.status);
  }

  // gRPC methods
  @GrpcMethod('OrderService', 'GetOrderDetails')
  async getOrderDetails(data: { orderId: string }) {
    const order = await this.orderService.getOrderById(data.orderId, '');
    return order;
  }
}
