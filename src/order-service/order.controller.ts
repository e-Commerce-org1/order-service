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

import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('orders')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiTags('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  //Creates a new order from cart contents
  //@param req Automatically populated with user info from 
  
  @Post('create')
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully.' })
  async createOrder(@Body() dto: CreateOrderDto, @Req() req: any) {
    const userId = req.user?.userId;
    return this.orderService.createOrder({ ...dto, userId });
  }

  //@param dto Contains payment confirmation details

  @Post('payment-success')
  @ApiOperation({ summary: 'Handle payment success' })
  @ApiResponse({ status: 200, description: 'Payment success handled.' })
  async paymentSuccess(@Body() dto: PaymentSuccessDto) {
    return this.orderService.handlePaymentSuccess(dto);
  }

  /*
      Initiates refund process for an order
   * @param dto Contains refund reason/details
   * @param req For getting user ID from JWT
  */

  @Post('refund')
  @ApiOperation({ summary: 'Request a refund for an order' })
  @ApiResponse({ status: 200, description: 'Refund request processed.' })
  async refundOrder(
    @Body() dto: Omit<RefundOrderDto, 'userId'>,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;
    return this.orderService.refundOrder({ ...dto, userId });
  }

    // Gets all orders for the authenticated user

  @Get('user')
  @ApiOperation({ summary: 'Get orders for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of user orders.' })
  async getUserOrders(@Req() req: any) {
    const userId = req.user?.userId;
    return this.orderService.getAllOrdersByUser(userId);
  }

  //Gets specific order details

  @Get(':orderId')
  @ApiOperation({ summary: 'Get order details by order ID' })
  @ApiResponse({ status: 200, description: 'Order details retrieved.' })
  async getOrder(@Param('orderId') orderId: string, @Req() req: any) {
    const userId = req.user?.userId;
    return this.orderService.getOrderById(orderId, userId);
  }

  //Cancels a pending order

  @Post(':orderId/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully.' })
  async cancelOrder(@Param('orderId') orderId: string, @Req() req: any) {
    const userId = req.user?.userId;
    return this.orderService.cancelOrder(orderId, userId);
  }

  //Requests exchange for delivered order

  @Post(':orderId/exchange')
  @ApiOperation({ summary: 'Exchange an order' })
  @ApiResponse({ status: 200, description: 'Order exchange processed.' })
  async exchangeOrder(@Param('orderId') orderId: string, @Req() req: any) {
    const userId = req.user?.userId;
    return this.orderService.exchangeOrder(orderId, userId);
  }

  //dds product review to order
  // Only for delivered orders

  @Post('review')
  @ApiOperation({ summary: 'Add a review for a product in an order' })
  @ApiResponse({ status: 200, description: 'Review added successfully.' })
  async addReview(@Body() dto: Omit<AddReviewDto, 'userId'>, @Req() req: any) {
    const userId = req.user?.userId;
    return this.orderService.addReview({ ...dto, userId });
  }

  // Admin routes

  //Gets paginated list of all orders (Admin only)
  @Get()
  @ApiOperation({ summary: 'Get all orders (admin)' })
  @ApiResponse({ status: 200, description: 'List of all orders.' })
  async getAllOrders(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.orderService.getAllOrders(page, limit);
  }

  // Admin-only endpoint to update order status

  @Put(':orderId/status')
  @ApiOperation({ summary: 'Update order status (admin)' })
  @ApiResponse({ status: 200, description: 'Order status updated.' })
  async updateOrderStatus(
    @Param('orderId') orderId: string,
    @Body() body: { status: string },
  ) {
    return this.orderService.updateOrderStatus(orderId, body.status);
  }

}