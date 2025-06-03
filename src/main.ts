import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Options } from '@nestjs/common';
import { join } from 'path';

async function bootstrap() {
  // const app = await NestFactory.create(AppModule);
  // await app.listen(process.env.PORT ?? 3000);

  
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: 'order', // Matches the package in user.proto
      protoPath: join(__dirname, '../../proto/order.proto'),
      url: '0.0.0.0:50053', // gRPC server address (0.0.0.0 for external access)
    },
  });
  await app.listen();
  console.log('User Service gRPC server running on localhost:50053');
}
bootstrap();
