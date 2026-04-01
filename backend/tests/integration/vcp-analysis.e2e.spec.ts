import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
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

  // Test stock code isolated from production data
  const TEST_STOCK_CODE = 'TEST01';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);

    // -------------------------------------------------------------------------
    // Seed isolated test data
    // -------------------------------------------------------------------------

    // 1. Stock record
    await prisma.stock.upsert({
      where: { stockCode: TEST_STOCK_CODE },
      create: {
        stockCode: TEST_STOCK_CODE,
        stockName: '测试股票',
        market: 'SH',
        currency: 'CNY',
        listDate: new Date('2020-01-01'),
        admissionStatus: 'active',
      },
      update: {},
    });

    // 2. KLineData – 35 daily bars so real-time analysis path has enough data
    //    (service requires >= 30 bars; we insert 35 for safety)
    const baseDate = new Date('2025-10-01');
    const klineRows = Array.from({ length: 35 }, (_, i) => {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + i);
      const close = 40 + i * 0.2; // slowly rising price
      return {
        stockCode: TEST_STOCK_CODE,
        date,
        period: 'daily',
        open: close - 0.1,
        high: close + 0.3,
        low: close - 0.3,
        close,
        volume: 500000 + i * 1000,
        amount: (500000 + i * 1000) * close,
        source: 'test',
      };
    });

    // Delete existing test klines then insert fresh ones
    await prisma.kLineData.deleteMany({ where: { stockCode: TEST_STOCK_CODE } });
    await prisma.kLineData.createMany({ data: klineRows });

    // 3. No VcpScanResult – this forces the service into the real-time analysis
    //    path, which populates analysisData.latestKLines = bars.slice(-10).
    //    If a cached VcpScanResult existed, the service would skip fetching
    //    klines and latestKLines would be undefined, producing an empty klines
    //    array in the response.
    await prisma.vcpScanResult.deleteMany({ where: { stockCode: TEST_STOCK_CODE } });
  });

  afterAll(async () => {
    // Clean up test data in dependency order
    await prisma.vcpScanResult.deleteMany({ where: { stockCode: TEST_STOCK_CODE } });
    await prisma.kLineData.deleteMany({ where: { stockCode: TEST_STOCK_CODE } });
    await prisma.stock.deleteMany({ where: { stockCode: TEST_STOCK_CODE } });

    await app.close();
  });

  describe('GET /api/vcp/:stockCode/analysis', () => {
    it('should return VCP analysis with klines for valid stock code', async () => {
      const response = await request(app.getHttpServer())
        .get(`/vcp/${TEST_STOCK_CODE}/analysis`)
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

      // Assert klines are populated (real-time path slices the last 10 bars)
      // The service sets latestKLines = bars.slice(-10) only in the real-time
      // path.  With 35 inserted bars and no cached VcpScanResult the real-time
      // path is taken, so klines must have between 1 and 10 entries.
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
      const response = await request(app.getHttpServer())
        .get(`/vcp/${TEST_STOCK_CODE}/analysis?forceRefresh=true`)
        .expect(200);

      expect(response.body).toBeDefined();
      // forceRefresh skips the cache, so cached must be false
      expect(response.body.cached).toBe(false);
    });

    it('should return analysis with reasonable response time (< 5 seconds)', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get(`/vcp/${TEST_STOCK_CODE}/analysis`)
        .expect(200);

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(5000); // Should respond within 5 seconds
    }, 10000); // Test timeout 10 seconds
  });
});
