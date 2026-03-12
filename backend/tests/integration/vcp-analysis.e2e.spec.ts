import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/modules/prisma/prisma.service';

/**
 * E2E Test for VCP Analysis API
 * 
 * Tests the complete flow: HTTP request → Controller → Service → Database → Response
 */
describe('VCP Analysis API (e2e) - T020 [US1]', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/vcp/:stockCode/analysis', () => {
    it('should return cached VCP analysis for valid stock code', async () => {
      // Use a known stock code that should exist in the database
      const stockCode = '605117';

      const response = await request(app.getHttpServer())
        .get(`/vcp/${stockCode}/analysis`)
        .expect(200);

      // Assert response structure
      expect(response.body).toMatchObject({
        stockCode: expect.any(String),
        stockName: expect.any(String),
        scanDate: expect.any(String),
        cached: expect.any(Boolean),
        isExpired: expect.any(Boolean),
        hasVcp: expect.any(Boolean),
        summary: {
          contractionCount: expect.any(Number),
          lastContractionPct: expect.any(Number),
          volumeDryingUp: expect.any(Boolean),
          rsRating: expect.any(Number),
          inPullback: expect.any(Boolean),
          pullbackCount: expect.any(Number),
          latestPrice: expect.any(Number),
          priceChangePct: expect.any(Number),
          distFrom52WeekHigh: expect.any(Number),
          distFrom52WeekLow: expect.any(Number),
        },
        contractions: expect.any(Array),
        pullbacks: expect.any(Array),
        klines: expect.any(Array),
        trendTemplate: {
          pass: expect.any(Boolean),
          checks: expect.any(Array),
        },
      });

      // Assert contractions structure
      if (response.body.contractions.length > 0) {
        const firstContraction = response.body.contractions[0];
        expect(firstContraction).toMatchObject({
          index: expect.any(Number),
          swingHighDate: expect.any(String),
          swingHighPrice: expect.any(Number),
          swingLowDate: expect.any(String),
          swingLowPrice: expect.any(Number),
          depthPct: expect.any(Number),
          durationDays: expect.any(Number),
          avgVolume: expect.any(Number),
        });
      }

      // Assert pullbacks structure
      if (response.body.pullbacks.length > 0) {
        const firstPullback = response.body.pullbacks[0];
        expect(firstPullback).toMatchObject({
          index: expect.any(Number),
          highDate: expect.any(String),
          highPrice: expect.any(Number),
          lowDate: expect.any(String),
          lowPrice: expect.any(Number),
          pullbackPct: expect.any(Number),
          durationDays: expect.any(Number),
          avgVolume: expect.any(Number),
          isInUptrend: expect.any(Boolean),
          daysSinceLow: expect.any(Number),
        });
      }

      // Assert klines structure
      expect(response.body.klines.length).toBeGreaterThanOrEqual(1);
      expect(response.body.klines.length).toBeLessThanOrEqual(10);
      const firstKLine = response.body.klines[0];
      expect(firstKLine).toMatchObject({
        date: expect.any(String),
        open: expect.any(Number),
        high: expect.any(Number),
        low: expect.any(Number),
        close: expect.any(Number),
        volume: expect.any(Number),
        changePct: expect.any(Number),
      });
    });

    it('should return 404 for non-existent stock code', async () => {
      const response = await request(app.getHttpServer())
        .get('/vcp/999999/analysis')
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should support forceRefresh query parameter', async () => {
      const stockCode = '605117';

      const response = await request(app.getHttpServer())
        .get(`/vcp/${stockCode}/analysis?forceRefresh=true`)
        .expect(200);

      expect(response.body).toBeDefined();
      // With forceRefresh, cached should be false (if implemented correctly)
    });

    it('should return analysis with reasonable response time (< 5 seconds)', async () => {
      const stockCode = '605117';
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get(`/vcp/${stockCode}/analysis`)
        .expect(200);

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(5000); // Should respond within 5 seconds
    }, 10000); // Test timeout 10 seconds
  });
});
