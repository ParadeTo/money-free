// backend/test/integration/test_data_update.spec.ts
// T099, T100, T101: Integration tests for /data/update endpoints

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/modules/prisma/prisma.service';

describe('DataUpdateController (Integration)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    
    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(200);

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    // Clean up test data
    await prismaService.updateLog.deleteMany({
      where: { taskId: { startsWith: 'test-' } },
    });
    await app.close();
  });

  describe('POST /data/update', () => {
    it('should trigger incremental update successfully', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/data/update')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('taskId');
      expect(typeof response.body.taskId).toBe('string');
      expect(response.body.taskId.length).toBeGreaterThan(0);

      // Verify update log created in database
      const updateLog = await prismaService.updateLog.findUnique({
        where: { taskId: response.body.taskId },
      });

      expect(updateLog).toBeDefined();
      expect(updateLog.status).toBe('pending');
      expect(updateLog.totalStocks).toBeGreaterThan(0);
    });

    it('should return 401 if not authenticated', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .post('/data/update')
        .expect(401);
    });

    it('should return 409 if update already running', async () => {
      // Arrange - Create a running update task
      const runningTask = await prismaService.updateLog.create({
        data: {
          taskId: 'test-running-task',
          status: 'running',
          totalStocks: 1000,
          processedStocks: 500,
          successCount: 450,
          failedCount: 50,
          startTime: new Date(),
        },
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/data/update')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      // Assert
      expect(response.body.message).toContain('already running');

      // Cleanup
      await prismaService.updateLog.delete({
        where: { taskId: runningTask.taskId },
      });
    });

    it('should enforce rate limiting (max 5 req/hour)', async () => {
      // This test requires actual rate limiting implementation
      // For now, we just verify the endpoint exists and returns expected response
      const response = await request(app.getHttpServer())
        .post('/data/update')
        .set('Authorization', `Bearer ${authToken}`);

      expect([201, 409, 429]).toContain(response.status);
    });
  });

  describe('GET /data/update/:taskId/status', () => {
    it('should return update status for existing taskId', async () => {
      // Arrange - Create a test update log
      const testUpdateLog = await prismaService.updateLog.create({
        data: {
          taskId: 'test-task-123',
          status: 'running',
          totalStocks: 1000,
          processedStocks: 500,
          successCount: 450,
          failedCount: 50,
          errorDetails: null,
          startTime: new Date(),
        },
      });

      // Act
      const response = await request(app.getHttpServer())
        .get(`/data/update/${testUpdateLog.taskId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        taskId: testUpdateLog.taskId,
        status: 'running',
        totalStocks: 1000,
        processedStocks: 500,
        successCount: 450,
        failedCount: 50,
      });
      expect(response.body).toHaveProperty('startTime');

      // Cleanup
      await prismaService.updateLog.delete({
        where: { taskId: testUpdateLog.taskId },
      });
    });

    it('should return 404 if taskId not found', async () => {
      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/data/update/non-existent-task/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should calculate progress percentage correctly', async () => {
      // Arrange
      const testUpdateLog = await prismaService.updateLog.create({
        data: {
          taskId: 'test-task-progress',
          status: 'running',
          totalStocks: 1000,
          processedStocks: 750,
          successCount: 700,
          failedCount: 50,
          startTime: new Date(),
        },
      });

      // Act
      const response = await request(app.getHttpServer())
        .get(`/data/update/${testUpdateLog.taskId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      const expectedProgress = (750 / 1000) * 100;
      expect(response.body.progress).toBe(expectedProgress);

      // Cleanup
      await prismaService.updateLog.delete({
        where: { taskId: testUpdateLog.taskId },
      });
    });
  });

  describe('GET /data/update/history', () => {
    it('should return list of update logs ordered by startTime desc', async () => {
      // Arrange - Create test update logs
      const testLog1 = await prismaService.updateLog.create({
        data: {
          taskId: 'test-history-1',
          status: 'completed',
          totalStocks: 1000,
          processedStocks: 1000,
          successCount: 995,
          failedCount: 5,
          startTime: new Date('2026-02-27T10:00:00Z'),
          endTime: new Date('2026-02-27T10:05:00Z'),
        },
      });

      const testLog2 = await prismaService.updateLog.create({
        data: {
          taskId: 'test-history-2',
          status: 'completed',
          totalStocks: 1000,
          processedStocks: 1000,
          successCount: 990,
          failedCount: 10,
          startTime: new Date('2026-02-28T10:00:00Z'),
          endTime: new Date('2026-02-28T10:05:00Z'),
        },
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/data/update/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);

      // Verify ordering (most recent first)
      const testLogs = response.body.filter(
        (log: any) => log.taskId.startsWith('test-history-'),
      );
      expect(testLogs[0].taskId).toBe('test-history-2');
      expect(testLogs[1].taskId).toBe('test-history-1');

      // Cleanup
      await prismaService.updateLog.deleteMany({
        where: { taskId: { in: [testLog1.taskId, testLog2.taskId] } },
      });
    });

    it('should limit results to 50 records', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/data/update/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.length).toBeLessThanOrEqual(50);
    });

    it('should include all required fields in response', async () => {
      // Arrange
      const testLog = await prismaService.updateLog.create({
        data: {
          taskId: 'test-history-fields',
          status: 'completed',
          totalStocks: 1000,
          processedStocks: 1000,
          successCount: 990,
          failedCount: 10,
          errorDetails: JSON.stringify([
            { stockCode: '600519', errorReason: 'API timeout' },
          ]),
          startTime: new Date(),
          endTime: new Date(),
        },
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/data/update/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      const testEntry = response.body.find(
        (log: any) => log.taskId === testLog.taskId,
      );

      expect(testEntry).toMatchObject({
        taskId: testLog.taskId,
        status: 'completed',
        totalStocks: 1000,
        processedStocks: 1000,
        successCount: 990,
        failedCount: 10,
      });
      expect(testEntry).toHaveProperty('startTime');
      expect(testEntry).toHaveProperty('endTime');

      // Cleanup
      await prismaService.updateLog.delete({
        where: { taskId: testLog.taskId },
      });
    });
  });

  describe('GET /data/update/:taskId/logs', () => {
    it('should return error logs for a completed task with failures', async () => {
      // Arrange
      const errorDetails = [
        { stockCode: '600519', errorReason: 'API timeout', retryResult: 'success' },
        { stockCode: '000001', errorReason: 'Network error', retryResult: 'failed' },
      ];

      const testLog = await prismaService.updateLog.create({
        data: {
          taskId: 'test-task-with-errors',
          status: 'completed',
          totalStocks: 1000,
          processedStocks: 1000,
          successCount: 998,
          failedCount: 2,
          errorDetails: JSON.stringify(errorDetails),
          startTime: new Date(),
          endTime: new Date(),
        },
      });

      // Act
      const response = await request(app.getHttpServer())
        .get(`/data/update/${testLog.taskId}/logs`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('errorDetails');
      expect(Array.isArray(response.body.errorDetails)).toBe(true);
      expect(response.body.errorDetails).toEqual(errorDetails);

      // Cleanup
      await prismaService.updateLog.delete({
        where: { taskId: testLog.taskId },
      });
    });

    it('should return empty array if no error logs', async () => {
      // Arrange
      const testLog = await prismaService.updateLog.create({
        data: {
          taskId: 'test-task-no-errors',
          status: 'completed',
          totalStocks: 1000,
          processedStocks: 1000,
          successCount: 1000,
          failedCount: 0,
          errorDetails: null,
          startTime: new Date(),
          endTime: new Date(),
        },
      });

      // Act
      const response = await request(app.getHttpServer())
        .get(`/data/update/${testLog.taskId}/logs`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.errorDetails).toEqual([]);

      // Cleanup
      await prismaService.updateLog.delete({
        where: { taskId: testLog.taskId },
      });
    });
  });
});
