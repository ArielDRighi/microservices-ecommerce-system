import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('Smoke Tests - Health & Basic Checks (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Application Health', () => {
    it('GET / should return app info', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body.statusCode).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    it('GET /health should return health status', async () => {
      const response = await request(app.getHttpServer()).get('/health').expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
      expect(response.body).toHaveProperty('info');
      expect(response.body.info).toHaveProperty('database');
      expect(response.body.info.database).toHaveProperty('status');
      expect(response.body.info.database.status).toBe('up');
      expect(response.body).toHaveProperty('details');
      expect(response.body.details).toHaveProperty('database');
    });
  });

  describe('Error Handling', () => {
    it('GET /nonexistent should return 404', async () => {
      const response = await request(app.getHttpServer()).get('/nonexistent-endpoint').expect(404);

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body.statusCode).toBe(404);
      expect(response.body).toHaveProperty('message');
    });
  });
});
