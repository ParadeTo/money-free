// backend/test/integration/test_drawings.spec.ts
// T206, T207, T208: Integration tests for /drawings endpoints

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/modules/prisma/prisma.service';

describe('DrawingsController (Integration)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authToken: string;
  let userId: string;

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

    // Get user ID from token
    const meResponse = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    userId = meResponse.body.userId;
  });

  afterAll(async () => {
    // Clean up test drawings
    await prismaService.drawing.deleteMany({
      where: { stockCode: { startsWith: 'test-' } },
    });
    await app.close();
  });

  describe('POST /drawings', () => {
    it('should create a trend line drawing successfully', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/drawings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stockCode: 'test-600519',
          period: 'daily',
          drawingType: 'trend_line',
          coordinates: JSON.stringify([
            { x: '2026-01-01', y: 10.5 },
            { x: '2026-02-01', y: 12.3 },
          ]),
        })
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('drawingId');
      expect(response.body.stockCode).toBe('test-600519');
      expect(response.body.period).toBe('daily');
      expect(response.body.drawingType).toBe('trend_line');
      expect(response.body.stylePreset).toBe('default');

      // Verify in database
      const drawing = await prismaService.drawing.findUnique({
        where: { drawingId: response.body.drawingId },
      });

      expect(drawing).toBeDefined();
      expect(drawing.userId).toBe(userId);
    });

    it('should create a horizontal line drawing successfully', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/drawings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stockCode: 'test-600519',
          period: 'daily',
          drawingType: 'horizontal_line',
          coordinates: JSON.stringify([{ y: 11.0 }]),
        })
        .expect(201);

      // Assert
      expect(response.body.drawingType).toBe('horizontal_line');
    });

    it('should create a vertical line drawing successfully', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/drawings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stockCode: 'test-600519',
          period: 'daily',
          drawingType: 'vertical_line',
          coordinates: JSON.stringify([{ x: '2026-01-15' }]),
        })
        .expect(201);

      // Assert
      expect(response.body.drawingType).toBe('vertical_line');
    });

    it('should create a rectangle drawing successfully', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/drawings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stockCode: 'test-600519',
          period: 'daily',
          drawingType: 'rectangle',
          coordinates: JSON.stringify([
            { x1: '2026-01-01', y1: 10.5, x2: '2026-02-01', y2: 12.3 },
          ]),
        })
        .expect(201);

      // Assert
      expect(response.body.drawingType).toBe('rectangle');
    });

    it('should return 401 if not authenticated', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .post('/drawings')
        .send({
          stockCode: 'test-600519',
          period: 'daily',
          drawingType: 'trend_line',
          coordinates: JSON.stringify([
            { x: '2026-01-01', y: 10.5 },
            { x: '2026-02-01', y: 12.3 },
          ]),
        })
        .expect(401);
    });

    it('should return 400 for invalid trend_line coordinates', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/drawings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stockCode: 'test-600519',
          period: 'daily',
          drawingType: 'trend_line',
          coordinates: JSON.stringify([{ x: '2026-01-01', y: 10.5 }]), // Only 1 point
        })
        .expect(400);

      // Assert
      expect(response.body.message).toContain('trend_line requires exactly 2 points');
    });

    it('should return 400 for malformed JSON coordinates', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/drawings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stockCode: 'test-600519',
          period: 'daily',
          drawingType: 'trend_line',
          coordinates: 'invalid-json',
        })
        .expect(400);

      // Assert
      expect(response.body.message).toContain('Invalid coordinates format');
    });

    it('should return 400 for missing required fields', async () => {
      // Act
      await request(app.getHttpServer())
        .post('/drawings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stockCode: 'test-600519',
          // Missing period, drawingType, coordinates
        })
        .expect(400);
    });
  });

  describe('GET /drawings', () => {
    let testDrawingId1: string;
    let testDrawingId2: string;

    beforeAll(async () => {
      // Create test drawings
      const drawing1 = await prismaService.drawing.create({
        data: {
          drawingId: 'test-drawing-1',
          userId,
          stockCode: 'test-600519',
          period: 'daily',
          drawingType: 'trend_line',
          coordinates: JSON.stringify([
            { x: '2026-01-01', y: 10.5 },
            { x: '2026-02-01', y: 12.3 },
          ]),
          stylePreset: 'default',
        },
      });

      const drawing2 = await prismaService.drawing.create({
        data: {
          drawingId: 'test-drawing-2',
          userId,
          stockCode: 'test-600519',
          period: 'daily',
          drawingType: 'horizontal_line',
          coordinates: JSON.stringify([{ y: 11.0 }]),
          stylePreset: 'default',
        },
      });

      testDrawingId1 = drawing1.drawingId;
      testDrawingId2 = drawing2.drawingId;
    });

    afterAll(async () => {
      await prismaService.drawing.deleteMany({
        where: { drawingId: { in: [testDrawingId1, testDrawingId2] } },
      });
    });

    it('should return all drawings for a stock and period', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/drawings')
        .query({ stockCode: 'test-600519', period: 'daily' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);

      const testDrawings = response.body.filter((d: any) =>
        d.drawingId.startsWith('test-drawing-'),
      );
      expect(testDrawings.length).toBe(2);
    });

    it('should return empty array if no drawings found', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/drawings')
        .query({ stockCode: 'non-existent', period: 'daily' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toEqual([]);
    });

    it('should return 400 if stockCode or period is missing', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .get('/drawings')
        .query({ stockCode: 'test-600519' }) // Missing period
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should only return drawings belonging to authenticated user', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/drawings')
        .query({ stockCode: 'test-600519', period: 'daily' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      const allDrawingsBelongToUser = response.body.every(
        (d: any) => d.userId === userId,
      );
      expect(allDrawingsBelongToUser).toBe(true);
    });
  });

  describe('DELETE /drawings/:drawingId', () => {
    let testDrawingId: string;

    beforeEach(async () => {
      // Create a test drawing
      const drawing = await prismaService.drawing.create({
        data: {
          drawingId: 'test-drawing-delete',
          userId,
          stockCode: 'test-600519',
          period: 'daily',
          drawingType: 'trend_line',
          coordinates: JSON.stringify([
            { x: '2026-01-01', y: 10.5 },
            { x: '2026-02-01', y: 12.3 },
          ]),
          stylePreset: 'default',
        },
      });

      testDrawingId = drawing.drawingId;
    });

    it('should delete a drawing successfully', async () => {
      // Act
      await request(app.getHttpServer())
        .delete(`/drawings/${testDrawingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert - Verify deleted from database
      const drawing = await prismaService.drawing.findUnique({
        where: { drawingId: testDrawingId },
      });

      expect(drawing).toBeNull();
    });

    it('should return 404 if drawing not found', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .delete('/drawings/non-existent-drawing')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      // Assert
      expect(response.body.message).toContain('not found');
    });

    it('should return 401 if not authenticated', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .delete(`/drawings/${testDrawingId}`)
        .expect(401);
    });

    it('should not allow deleting drawings from other users', async () => {
      // Arrange - Create drawing for another user
      const anotherUser = await prismaService.user.create({
        data: {
          userId: 'test-another-user',
          username: 'testuser2',
          passwordHash: 'hash',
        },
      });

      const drawing = await prismaService.drawing.create({
        data: {
          drawingId: 'test-drawing-other-user',
          userId: anotherUser.userId,
          stockCode: 'test-600519',
          period: 'daily',
          drawingType: 'trend_line',
          coordinates: '[]',
          stylePreset: 'default',
        },
      });

      // Act - Try to delete as current user
      await request(app.getHttpServer())
        .delete(`/drawings/${drawing.drawingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404); // Should not find it (user filter applied)

      // Cleanup
      await prismaService.drawing.delete({
        where: { drawingId: drawing.drawingId },
      });
      await prismaService.user.delete({
        where: { userId: anotherUser.userId },
      });
    });
  });

  describe('Drawings persistence and loading', () => {
    it('should persist drawings and load them after page refresh', async () => {
      // Step 1: Create drawings
      const drawing1Response = await request(app.getHttpServer())
        .post('/drawings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stockCode: 'test-persist-600519',
          period: 'daily',
          drawingType: 'trend_line',
          coordinates: JSON.stringify([
            { x: '2026-01-01', y: 10.5 },
            { x: '2026-02-01', y: 12.3 },
          ]),
        })
        .expect(201);

      const drawing2Response = await request(app.getHttpServer())
        .post('/drawings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stockCode: 'test-persist-600519',
          period: 'daily',
          drawingType: 'horizontal_line',
          coordinates: JSON.stringify([{ y: 11.0 }]),
        })
        .expect(201);

      // Step 2: Load drawings (simulating page refresh)
      const loadResponse = await request(app.getHttpServer())
        .get('/drawings')
        .query({ stockCode: 'test-persist-600519', period: 'daily' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(loadResponse.body.length).toBe(2);
      const drawing1 = loadResponse.body.find(
        (d: any) => d.drawingId === drawing1Response.body.drawingId,
      );
      const drawing2 = loadResponse.body.find(
        (d: any) => d.drawingId === drawing2Response.body.drawingId,
      );

      expect(drawing1).toBeDefined();
      expect(drawing2).toBeDefined();

      // Cleanup
      await prismaService.drawing.deleteMany({
        where: { stockCode: 'test-persist-600519' },
      });
    });
  });
});
