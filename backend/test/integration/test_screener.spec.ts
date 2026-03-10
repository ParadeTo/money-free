// backend/test/integration/test_screener.spec.ts
// T134 [P] [US2] Integration test for POST /screener/execute endpoint

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/services/prisma/prisma.service';

describe('ScreenerController (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // 登录获取 token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /screener/execute', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/screener/execute')
        .send({
          conditions: [
            {
              conditionType: 'indicator_value',
              indicatorName: 'rsi',
              operator: '<',
              targetValue: 30,
            },
          ],
        });

      expect(response.status).toBe(401);
    });

    it('should execute filter with single condition', async () => {
      const response = await request(app.getHttpServer())
        .post('/screener/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          conditions: [
            {
              conditionType: 'indicator_value',
              indicatorName: 'rsi',
              operator: '<',
              targetValue: 30,
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('stocks');
      expect(response.body).toHaveProperty('isTruncated');
      expect(response.body).toHaveProperty('totalCount');
      expect(Array.isArray(response.body.stocks)).toBe(true);
    });

    it('should execute filter with multiple conditions', async () => {
      const response = await request(app.getHttpServer())
        .post('/screener/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          conditions: [
            {
              conditionType: 'indicator_value',
              indicatorName: 'rsi',
              operator: '<',
              targetValue: 30,
            },
            {
              conditionType: 'indicator_value',
              indicatorName: 'volume',
              operator: '>',
              targetValue: 1000000,
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.stocks).toBeDefined();
    });

    it('should support pattern conditions', async () => {
      const response = await request(app.getHttpServer())
        .post('/screener/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          conditions: [
            {
              conditionType: 'pattern',
              pattern: 'kdj_golden_cross',
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.stocks).toBeDefined();
    });

    it('should support sorting by stockCode', async () => {
      const response = await request(app.getHttpServer())
        .post('/screener/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          conditions: [
            {
              conditionType: 'indicator_value',
              indicatorName: 'volume',
              operator: '>',
              targetValue: 100000,
            },
          ],
          sortBy: 'stockCode',
          sortOrder: 'asc',
        });

      expect(response.status).toBe(200);
      expect(response.body.stocks).toBeDefined();
    });

    it('should return 400 for invalid condition type', async () => {
      const response = await request(app.getHttpServer())
        .post('/screener/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          conditions: [
            {
              conditionType: 'invalid_type',
              indicatorName: 'rsi',
              operator: '<',
              targetValue: 30,
            },
          ],
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/screener/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          conditions: [
            {
              conditionType: 'indicator_value',
              // Missing indicatorName, operator, targetValue
            },
          ],
        });

      expect(response.status).toBe(400);
    });
  });
});
