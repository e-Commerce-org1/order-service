import { Controller, Get } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { GrpcMethod } from '@nestjs/microservices';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { OrderService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly orderService: OrderService) {}

  @GrpcMethod('OrderService', 'CreateOrder')
  async createOrder(data: { createOrderDto: CreateOrderDto; token: string }) {
    return this.orderService.createOrder(data);
  }

  @GrpcMethod('OrderService', 'CancelOrder')
  async cancelOrder(data: { cancelOrderDto: CancelOrderDto }) {
    return this.orderService.cancelOrder(data);
  }

  @GrpcMethod('OrderService', 'GetOrderStatus')
  async getOrderStatus(data: { userId: string }) {
    return this.orderService.getOrderStatus(data);
  }

  @GrpcMethod('OrderService', 'UpdateOrderStatus')
  async updateOrderStatus(data: { userId: string; statusValue: any }) {
    return this.orderService.updateOrderStatus(data);
  }

  @GrpcMethod('OrderService', 'GetOrderHistory')
  async getOrderHistory(data: { userId: string; token?: string }) {
    // Ensure token is provided since OrderService expects it
    if (!data.token) {
      throw new Error('Token is required');
    }
    return this.orderService.getOrderHistory({
      userId: data.userId,
      token: data.token,
    });
  }
}
