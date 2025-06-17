import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { Order, OrderSchema } from '../schema/order.schema';
import { AuthGuard } from 'src/middleware/auth.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    ClientsModule.register([
      {
        name: 'PAYMENT_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'payment',
          protoPath: join(__dirname, '../proto/payment.proto'),
         // url: '172.50.5.83:5059',
         url:'0.0.0.0:5059',
        },
      },
      {
        name: 'AUTH_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'auth',
          protoPath: join(__dirname, '../proto/auth.proto'),
          //  url:'172.50.3.60:5052'
        //  url: '172.50.0.217:5052',
          // url:'172.50.0.217:5052'
        url:  '0.0.0.0:5052'
        },
      },
      {
        name: 'CART_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'cart',
          protoPath: join(__dirname, '../proto/cart.proto'),
        //  url: '172.50.0.217:7777',
        url: '0.0.0.0:7777',
        },
      },
      {
        name: 'PRODUCT_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'product',
          protoPath: join(__dirname, '../proto/product.proto'),
        //  url: '172.50.0.217:5001',
        url: '0.0.0.0:5001',
        },
      },
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService, AuthGuard],
})
export class OrderModule {}
