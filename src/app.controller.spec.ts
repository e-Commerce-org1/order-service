import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { OrderService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [OrderService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

 
});
