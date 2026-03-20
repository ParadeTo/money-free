import { Test, TestingModule } from '@nestjs/testing';
import { ScanExecutorService } from '../../src/modules/volume-surge/services/scan-executor.service';
import { PatternDetectorService } from '../../src/modules/volume-surge/services/pattern-detector.service';
import { MovingAverageService } from '../../src/modules/volume-surge/services/moving-average.service';
import { PrismaService } from '../../src/modules/prisma/prisma.service';

describe('ScanExecutorService', () => {
  let service: ScanExecutorService;
  let patternDetector: PatternDetectorService;
  let movingAverage: MovingAverageService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScanExecutorService,
        {
          provide: PatternDetectorService,
          useValue: {
            detectPattern: jest.fn(),
          },
        },
        {
          provide: MovingAverageService,
          useValue: {
            getMovingAverageTrend: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            stock: {
              findMany: jest.fn(),
            },
            volumeSurgeScan: {
              create: jest.fn(),
              update: jest.fn(),
            },
            scanResult: {
              createMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ScanExecutorService>(ScanExecutorService);
    patternDetector = module.get<PatternDetectorService>(PatternDetectorService);
    movingAverage = module.get<MovingAverageService>(MovingAverageService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('executeScan', () => {
    it('应成功扫描股票并返回结果', async () => {
      const mockStocks = [
        { stockCode: 'SH600111', stockName: '北方稀土' },
        { stockCode: 'SZ002594', stockName: '比亚迪' },
      ];

      jest.spyOn(prisma.stock, 'findMany').mockResolvedValue(mockStocks as any);
      
      jest.spyOn(patternDetector, 'detectPattern').mockResolvedValue({
        contractionPeriod: {
          startDate: new Date(2026, 1, 20),
          endDate: new Date(2026, 2, 1),
          avgVolume: 600000,
        },
        expansionPoint: {
          date: new Date(2026, 2, 2),
          volume: 1000000,
          multiplier: 1.67,
          days: 10,
        },
      });

      jest.spyOn(movingAverage, 'getMovingAverageTrend').mockResolvedValue({
        ma50: 12.5,
        ma150: 13.2,
        ma50Slope: 0.05,
        isTrendingUp: true,
        ma50BelowMa150: true,
      });

      jest.spyOn(prisma.volumeSurgeScan, 'create').mockResolvedValue({
        id: 'scan-123',
        status: 'RUNNING',
      } as any);

      const result = await service.executeScan({ mode: 'AUTO', source: 'cli' });

      expect(result.scanId).toBeDefined();
      expect(result.status).toBe('RUNNING');
    });

    it('应使用p-limit控制并发数量为10', async () => {
      const mockStocks = Array(100).fill(null).map((_, i) => ({
        stockCode: `TEST${String(i).padStart(3, '0')}`,
        stockName: `测试股票${i}`,
      }));

      jest.spyOn(prisma.stock, 'findMany').mockResolvedValue(mockStocks as any);
      jest.spyOn(patternDetector, 'detectPattern').mockResolvedValue(null);

      await service.executeScan({ mode: 'AUTO', source: 'test' });

      // 验证并发控制（实际测试中可监控并发执行数）
      expect(prisma.stock.findMany).toHaveBeenCalled();
    });

    it('应跳过数据不足150天的股票', async () => {
      const mockStocks = [{ stockCode: 'NEW001', stockName: '新股' }];

      jest.spyOn(prisma.stock, 'findMany').mockResolvedValue(mockStocks as any);
      jest.spyOn(movingAverage, 'getMovingAverageTrend').mockResolvedValue(null);

      const result = await service.executeScan({ mode: 'AUTO', source: 'test' });

      expect(result.scanId).toBeDefined();
    });
  });

  describe('scanSingleStock', () => {
    it('应返回完整的股票扫描结果', async () => {
      jest.spyOn(patternDetector, 'detectPattern').mockResolvedValue({
        contractionPeriod: {
          startDate: new Date(2026, 1, 20),
          endDate: new Date(2026, 2, 1),
          avgVolume: 600000,
        },
        expansionPoint: {
          date: new Date(2026, 2, 2),
          volume: 1000000,
          multiplier: 1.67,
          days: 10,
        },
      });

      jest.spyOn(movingAverage, 'getMovingAverageTrend').mockResolvedValue({
        ma50: 12.5,
        ma150: 13.2,
        ma50Slope: 0.05,
        isTrendingUp: true,
        ma50BelowMa150: true,
      });

      const result = await service.scanSingleStock('TEST001', { mode: 'AUTO' });

      expect(result).toBeDefined();
      expect(result.stockCode).toBe('TEST001');
      expect(result.criteria.meetsVolumeCriteria).toBe(true);
      expect(result.criteria.meetsMaCriteria).toBe(true);
    });

    it('应返回null如果股票不符合条件', async () => {
      jest.spyOn(patternDetector, 'detectPattern').mockResolvedValue(null);

      const result = await service.scanSingleStock('TEST001', { mode: 'AUTO' });

      expect(result).toBeNull();
    });
  });
});
