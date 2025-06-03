import { Module } from '@nestjs/common';
import { AppController } from './app.controller';

import { MongooseModule } from '@nestjs/mongoose';
import { Order, orderSchema } from './schema/order.schema';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { OrderService } from './app.service';

@Module({
  imports: [
    ClientsModule.register([ {
      name:'CART_PACKAGE',
      transport: Transport.GRPC,
      options: {
        package:'cart',
        protoPath: join(__dirname, '../../proto/cart.proto'),
        // url: '0.0.0.0:50054',
      }
      
    } 
    ,{
      name:'USER_PACKAGE',
      transport: Transport.GRPC,
      options: {
        package:'user',
        protoPath: join(__dirname, '../../proto/user.proto'),
        // url: '0.0.0.0:50051',
      }
      
    }, {
      name:'AUTH_PACKAGE',
      transport: Transport.GRPC,
      options: {
        package:'auth',
        protoPath: join(__dirname, '../../proto/auth.proto'),
        // url: '0.0.0.0:50054',
      }
      
    },
  ]),
    MongooseModule.forRoot('mongodb://localhost:27017/ecomm2'),
    MongooseModule.forFeature([{name:Order.name ,schema:orderSchema}])
  ],
  controllers: [AppController],
  providers: [OrderService],
})
export class AppModule {}
