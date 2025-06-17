
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { Order, OrderSchema } from '../schema/order.schema';
import { AuthGuard } from '../middleware/auth.guard';
import { OrderGrpcController } from './order.grpc.controller';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    ClientsModule.registerAsync([
      {
        name: 'PAYMENT_PACKAGE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'payment',
            protoPath: join(__dirname, '../proto/payment.proto'),
            url: configService.get<string>('PAYMENT_GRPC_URL'),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'AUTH_PACKAGE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'auth',
            protoPath: join(__dirname, '../proto/auth.proto'),
            url: configService.get<string>('AUTH_GRPC_URL'),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'CART_PACKAGE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'cart',
            protoPath: join(__dirname, '../proto/cart.proto'),
            url: configService.get<string>('CART_GRPC_URL'),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'PRODUCT_PACKAGE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'product',
            protoPath: join(__dirname, '../proto/product.proto'),
            url: configService.get<string>('PRODUCT_GRPC_URL'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [OrderController,OrderGrpcController],
  providers: [OrderService, AuthGuard],
})
export class OrderModule {}