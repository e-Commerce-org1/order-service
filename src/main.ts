import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { GrpcExceptionFilter } from "./order-service/common/filters/grpc-exception.filter";
import { AllExceptionsFilter } from './order-service/common/filters/order.filter';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Apply global filters
  app.useGlobalFilters(new GrpcExceptionFilter(), new AllExceptionsFilter());

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Order Service API')
    .setDescription('API documentation for the Order Service')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addSecurityRequirements({ 'JWT-auth': [] })
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Microservice configuration
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'order',
      protoPath: join(__dirname, './proto/order.proto'),
      url: configService.get<string>('ORDER_GRPC_URL'),
    },
  });

  await app.startAllMicroservices();
  
  // HTTP server
  const httpPort = configService.get<number>('HTTP_PORT');
  if (httpPort === undefined) {
    throw new Error('HTTP_PORT environment variable is not defined');
  }
  await app.listen(httpPort);
  console.log(`Application is running on HTTP port ${httpPort}`);
}
bootstrap();
