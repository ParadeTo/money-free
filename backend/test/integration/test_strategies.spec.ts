// backend/test/integration/test_strategies.spec.ts
// T135 [P] [US2] Integration test for strategy CRUD endpoints

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/services/prisma/prisma.service';

describe('StrategiesController (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testStrategyId: string;

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
    // 清理测试数据
    if (testStrategyId) {
      await prisma.screenerStrategy.delete({
        where: { strategyId: testStrategyId },
      });
    }
    await app.close();
  });

  describe('POST /strategies', () => {
    it('should create a new strategy', async () => {
      const response = await request(app.getHttpServer())
        .post('/strategies')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          strategyName: '超跌反弹策略',
          description: 'RSI < 30 且成交量放大',
          conditions: [
            {
              conditionType: 'indicator_value',
              indicatorName: 'rsi',
              operator: '<',
              targetValue: 30,
              sortOrder: 0,
            },
            {
              conditionType: 'indicator_value',
              indicatorName: 'volume',
              operator: '>',
              targetValue: 1000000,
              sortOrder: 1,
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('strategyId');
      expect(response.body.strategyName).toBe('超跌反弹策略');
      expect(response.body.conditions).toHaveLength(2);

      testStrategyId = response.body.strategyId;
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/strategies')
        .send({
          strategyName: 'Test Strategy',
          conditions: [],
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 with invalid data', async () => {
      const response = await request(app.getHttpServer())
        .post('/strategies')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing strategyName
          conditions: [],
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /strategies', () => {
    it('should return all strategies for authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/strategies')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app.getHttpServer()).get('/strategies');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /strategies/:strategyId', () => {
    it('should return strategy by ID', async () => {
      // 先创建一个策略
      const createResponse = await request(app.getHttpServer())
        .post('/strategies')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          strategyName: 'Test Get Strategy',
          conditions: [
            {
              conditionType: 'indicator_value',
              indicatorName: 'rsi',
              operator: '<',
              targetValue: 30,
              sortOrder: 0,
            },
          ],
        });

      const strategyId = createResponse.body.strategyId;

      const response = await request(app.getHttpServer())
        .get(`/strategies/${strategyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.strategyId).toBe(strategyId);
      expect(response.body.strategyName).toBe('Test Get Strategy');
      expect(response.body.conditions).toBeDefined();
    });

    it('should return 404 for non-existent strategy', async () => {
      const response = await request(app.getHttpServer())
        .get('/strategies/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /strategies/:strategyId', () => {
    it('should update strategy', async () => {
      // 先创建一个策略
      const createResponse = await request(app.getHttpServer())
        .post('/strategies')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          strategyName: 'Original Strategy',
          conditions: [],
        });

      const strategyId = createResponse.body.strategyId;

      const response = await request(app.getHttpServer())
        .put(`/strategies/${strategyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          strategyName: 'Updated Strategy',
          description: 'Updated description',
        });

      expect(response.status).toBe(200);
      expect(response.body.strategyName).toBe('Updated Strategy');
      expect(response.body.description).toBe('Updated description');
    });
  });

  describe('DELETE /strategies/:strategyId', () => {
    it('should delete strategy', async () => {
      // 先创建一个策略
      const createResponse = await request(app.getHttpServer())
        .post('/strategies')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          strategyName: 'To Be Deleted',
          conditions: [],
        });

      const strategyId = createResponse.body.strategyId;

      const response = await request(app.getHttpServer())
        .delete(`/strategies/${strategyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // 验证已删除
      const getResponse = await request(app.getHttpServer())
        .get(`/strategies/${strategyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });
  });

  describe('POST /strategies/:strategyId/execute', () => {
    it('should execute saved strategy', async () => {
      // 先创建一个策略
      const createResponse = await request(app.getHttpServer())
        .post('/strategies')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          strategyName: 'Executable Strategy',
          conditions: [
            {
              conditionType: 'indicator_value',
              indicatorName: 'volume',
              operator: '>',
              targetValue: 100000,
              sortOrder: 0,
            },
          ],
        });

      const strategyId = createResponse.body.strategyId;

      const response = await request(app.getHttpServer())
        .post(`/strategies/${strategyId}/execute`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('stocks');
      expect(response.body).toHaveProperty('isTruncated');
      expect(response.body).toHaveProperty('totalCount');
    });
  });
});
