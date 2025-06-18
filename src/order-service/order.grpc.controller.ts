import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { OrderService } from './order.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from 'src/middleware/auth.guard';

@Controller()
@UseGuards(AuthGuard)
export class OrderGrpcController {
  constructor(private readonly orderService: OrderService) {}

  @GrpcMethod('OrderService', 'GetOrderDetails')
  @ApiOperation({ summary: 'gRPC: Get order details' })
  @ApiResponse({ status: 200, description: 'Order details retrieved.' })
  async getOrderDetails(data: { orderId: string; user?: { userId: string } }) {
    const userId = data.user?.userId || '';
    const order = await this.orderService.getOrderById(data.orderId, userId);
    return order;
  }

  @GrpcMethod('OrderService', 'GetAllOrders')
  @ApiOperation({ summary: 'gRPC: Get all orders' })
  @ApiResponse({ status: 200, description: 'List of orders retrieved.' })
  async getOrders(data: { page: number; limit: number }) {
    const orders = await this.orderService.getAllOrders(data.page, data.limit);
    return { orders };
  }

  @GrpcMethod('OrderService', 'UpdateOrderStatus')
  @ApiOperation({ summary: 'gRPC: Update order status' })
  @ApiResponse({ status: 200, description: 'Order status updated.' })
  async updateOrderStatus(data: { orderId: string; status: string }) {
    const result = await this.orderService.updateOrderStatus(data.orderId, data.status);
    return {
      success: result ? true : false,
      message: result ? 'Order status updated successfully' : 'Failed to update order status',
    };
  }
}
