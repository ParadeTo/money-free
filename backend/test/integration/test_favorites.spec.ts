// backend/test/integration/test_favorites.spec.ts
// T178-T179: Integration tests for Favorites API endpoints

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('FavoritesController (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;
  let otherUserAuthToken: string;
  let otherUserId: string;
  let testStockCode: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Create test user
    const passwordHash = await bcrypt.hash('test123', 10);
    const user = await prisma.user.create({
      data: {
        username: 'favorites-test-user',
        passwordHash,
        preferences: null,
      },
    });
    userId = user.userId;

    // Create another user (for testing user isolation)
    const otherPasswordHash = await bcrypt.hash('other123', 10);
    const otherUser = await prisma.user.create({
      data: {
        username: 'favorites-other-user',
        passwordHash: otherPasswordHash,
        preferences: null,
      },
    });
    otherUserId = otherUser.userId;

    // Create or get test stock
    const stock = await prisma.stock.upsert({
      where: { stockCode: '600519' },
      create: {
        stockCode: '600519',
        stockName: '贵州茅台',
        market: 'SH',
        listDate: new Date('2001-08-27'),
      },
      update: {},
    });
    testStockCode = stock.stockCode;

    // Create another stock for tests
    await prisma.stock.upsert({
      where: { stockCode: '000001' },
      create: {
        stockCode: '000001',
        stockName: '平安银行',
        market: 'SZ',
        listDate: new Date('1991-04-03'),
      },
      update: {},
    });

    // Login to get auth tokens
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'favorites-test-user', password: 'test123' })
      .expect(200);
    authToken = loginResponse.body.access_token;

    const otherLoginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'favorites-other-user', password: 'other123' })
      .expect(200);
    otherUserAuthToken = otherLoginResponse.body.access_token;
  });

  afterAll(async () => {
    // Cleanup: delete favorites first (due to FK), then users, then stocks if test-created
    await prisma.favorite.deleteMany({
      where: {
        userId: { in: [userId, otherUserId] },
      },
    });
    await prisma.user.deleteMany({
      where: { userId: { in: [userId, otherUserId] } },
    });
    await app.close();
  });

  describe('POST /favorites', () => {
    it('should add favorite successfully with authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stock_code: testStockCode,
          group_name: '核心持仓',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('user_id', userId);
      expect(response.body).toHaveProperty('stock_code', testStockCode);
      expect(response.body).toHaveProperty('stock_name');
      expect(response.body).toHaveProperty('group_name', '核心持仓');
      expect(response.body).toHaveProperty('sort_order');
      expect(response.body).toHaveProperty('created_at');

      // Cleanup for next test
      await prisma.favorite.deleteMany({
        where: { userId, stockCode: testStockCode },
      });
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/favorites')
        .send({
          stock_code: testStockCode,
          group_name: '核心持仓',
        })
        .expect(401);
    });

    it('should return 409 when adding duplicate favorite', async () => {
      const favorite = await prisma.favorite.create({
        data: {
          userId,
          stockCode: testStockCode,
          groupName: '测试分组',
          sortOrder: 0,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stock_code: testStockCode,
        })
        .expect(409);

      expect(response.body.message).toContain('已在收藏列表中');

      await prisma.favorite.delete({ where: { id: favorite.id } });
    });

    it('should return 400 for invalid stock code', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stock_code: 'INVALID999',
        })
        .expect(400);
    });

    it('should accept request with only stock_code (group_name optional)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stock_code: '000001',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('stock_code', '000001');
      expect(response.body.group_name).toBeNull();

      await prisma.favorite.deleteMany({
        where: { userId, stockCode: '000001' },
      });
    });

    it('should return 400 when stock_code is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          group_name: '核心持仓',
        })
        .expect(400);
    });
  });

  describe('GET /favorites', () => {
    let favoriteId1: number;
    let favoriteId2: number;

    beforeAll(async () => {
      const fav1 = await prisma.favorite.create({
        data: {
          userId,
          stockCode: '600519',
          groupName: '核心持仓',
          sortOrder: 0,
        },
      });
      const fav2 = await prisma.favorite.create({
        data: {
          userId,
          stockCode: '000001',
          groupName: '观察列表',
          sortOrder: 1,
        },
      });
      favoriteId1 = fav1.id;
      favoriteId2 = fav2.id;
    });

    afterAll(async () => {
      await prisma.favorite.deleteMany({
        where: { id: { in: [favoriteId1, favoriteId2] } },
      });
    });

    it('should get favorites list successfully with authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('favorites');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.favorites)).toBe(true);
      expect(response.body.total).toBeGreaterThanOrEqual(2);
    });

    it('should return data with stockCode, stockName, latestPrice, priceChange, priceChangePercent', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const first = response.body.favorites[0];
      expect(first).toHaveProperty('stock_code');
      expect(first).toHaveProperty('stock_name');
      expect(first).toHaveProperty('latest_price');
      expect(first).toHaveProperty('price_change');
      expect(first).toHaveProperty('price_change_percent');
    });

    it('should filter by groupName query parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/favorites')
        .query({ group_name: '核心持仓' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.favorites).toHaveLength(1);
      expect(response.body.favorites[0].group_name).toBe('核心持仓');
    });

    it('should return favorites ordered by sortOrder', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const orders = response.body.favorites.map((f: any) => f.sort_order);
      for (let i = 1; i < orders.length; i++) {
        expect(orders[i]).toBeGreaterThanOrEqual(orders[i - 1]);
      }
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/favorites')
        .expect(401);
    });
  });

  describe('PUT /favorites/:id/sort', () => {
    let favoriteId: number;

    beforeAll(async () => {
      const fav = await prisma.favorite.create({
        data: {
          userId,
          stockCode: '600519',
          groupName: '核心持仓',
          sortOrder: 0,
        },
      });
      favoriteId = fav.id;
    });

    afterAll(async () => {
      await prisma.favorite.deleteMany({
        where: { id: favoriteId },
      });
    });

    it('should update sort order successfully with authentication', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/favorites/${favoriteId}/sort`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sort_order: 5 })
        .expect(200);

      expect(response.body).toHaveProperty('message', '排序更新成功');
      expect(response.body).toHaveProperty('favorite_id', favoriteId);
      expect(response.body).toHaveProperty('sort_order', 5);

      const updated = await prisma.favorite.findUnique({
        where: { id: favoriteId },
      });
      expect(updated?.sortOrder).toBe(5);
    });

    it('should return 404 when favorite does not exist', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/favorites/999999/sort')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sort_order: 1 })
        .expect(404);
    });

    it('should return 404 when user tries to update other user\'s favorite', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/favorites/${favoriteId}/sort`)
        .set('Authorization', `Bearer ${otherUserAuthToken}`)
        .send({ sort_order: 10 })
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/favorites/${favoriteId}/sort`)
        .send({ sort_order: 1 })
        .expect(401);
    });
  });

  describe('DELETE /favorites/:id', () => {
    let favoriteId: number;
    let otherUserFavoriteId: number;

    beforeAll(async () => {
      const fav = await prisma.favorite.create({
        data: {
          userId,
          stockCode: '600519',
          groupName: '待删除',
          sortOrder: 0,
        },
      });
      favoriteId = fav.id;

      const otherFav = await prisma.favorite.create({
        data: {
          userId: otherUserId,
          stockCode: '000001',
          groupName: '其他用户',
          sortOrder: 0,
        },
      });
      otherUserFavoriteId = otherFav.id;
    });

    afterAll(async () => {
      await prisma.favorite.deleteMany({
        where: {
          id: { in: [favoriteId, otherUserFavoriteId] },
        },
      });
    });

    it('should delete favorite successfully with authentication', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/favorites/${favoriteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', '取消收藏成功');
      expect(response.body).toHaveProperty('favorite_id', favoriteId);

      const deleted = await prisma.favorite.findUnique({
        where: { id: favoriteId },
      });
      expect(deleted).toBeNull();
    });

    it('should return 404 when favorite does not exist', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/favorites/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 404 when user tries to delete other user\'s favorite', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/favorites/${otherUserFavoriteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      const stillExists = await prisma.favorite.findUnique({
        where: { id: otherUserFavoriteId },
      });
      expect(stillExists).not.toBeNull();
    });

    it('should return 401 without authentication', async () => {
      const fav = await prisma.favorite.create({
        data: {
          userId,
          stockCode: '000001',
          groupName: '401测试',
          sortOrder: 0,
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/favorites/${fav.id}`)
        .expect(401);

      await prisma.favorite.delete({ where: { id: fav.id } });
    });
  });
});
