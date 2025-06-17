import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { GrpcExceptionFilter } from './order-service/common/filters/grpc-exception.filter';
import { AllExceptionsFilter } from './order-service/common/filters/order.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply global filters
  app.useGlobalFilters(new GrpcExceptionFilter(), new AllExceptionsFilter());

  const config = new DocumentBuilder()
    .setTitle('Order Service API')
    .setDescription('API documentation for the Order Service')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
      },
      'access-token', // This name should match the security name used in addSecurityRequirements
    )
    .addSecurityRequirements({
      'access-token': [],
    })
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'order',
      protoPath: join(__dirname, './proto/order.proto'),
      url: '0.0.0.0:50053',
    },
  });

  await app.startAllMicroservices();
  await app.listen(3333);
}
bootstrap();
