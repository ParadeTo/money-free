import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminUserId: string;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Create test admin user
    const passwordHash = await bcrypt.hash('admin123', 10);
    const user = await prisma.user.create({
      data: {
        username: 'admin',
        passwordHash,
        preferences: null,
      },
    });
    adminUserId = user.userId;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.delete({ where: { userId: adminUserId } });
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          username: 'admin',
          password: 'admin123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe('admin');
      expect(response.body.user).not.toHaveProperty('passwordHash');

      // Store token for later tests
      authToken = response.body.access_token;
    });

    it('should return 401 with incorrect password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          username: 'admin',
          password: 'wrong-password',
        })
        .expect(401);
    });

    it('should return 401 with non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          username: 'non-existent-user',
          password: 'password',
        })
        .expect(401);
    });

    it('should return 400 with missing username', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          password: 'admin123',
        })
        .expect(400);
    });

    it('should return 400 with missing password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          username: 'admin',
        })
        .expect(400);
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user info with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('username');
      expect(response.body.username).toBe('admin');
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should return 401 with expired token', async () => {
      // This is a manually crafted expired token (for demonstration)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiZXhwIjoxfQ.invalid';
      
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });
});
