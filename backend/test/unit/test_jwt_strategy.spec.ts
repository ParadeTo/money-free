import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from '../../src/modules/auth/jwt.strategy';
import { PrismaService } from '../../src/modules/prisma/prisma.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should return user when userId exists in database', async () => {
      const payload = { userId: 'test-user-id', username: 'admin' };
      const mockUser = {
        userId: 'test-user-id',
        username: 'admin',
        passwordHash: 'hashed-password',
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: mockUser.userId,
        username: mockUser.username,
      });
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { userId: payload.userId },
        select: {
          userId: true,
          username: true,
          preferences: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const payload = { userId: 'non-existent-user', username: 'unknown' };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { userId: payload.userId },
        select: {
          userId: true,
          username: true,
          preferences: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });
  });
});
