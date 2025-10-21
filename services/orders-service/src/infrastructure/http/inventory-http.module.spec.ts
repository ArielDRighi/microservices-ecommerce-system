import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { InventoryHttpModule } from './inventory-http.module';
import { InventoryHttpClient } from './inventory.client';

describe('InventoryHttpModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        InventoryHttpModule,
      ],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide InventoryHttpClient', () => {
    const client = module.get<InventoryHttpClient>(InventoryHttpClient);
    expect(client).toBeDefined();
    expect(client).toBeInstanceOf(InventoryHttpClient);
  });

  it('should provide HttpModule', () => {
    const httpModule = module.get(HttpModule);
    expect(httpModule).toBeDefined();
  });
});
