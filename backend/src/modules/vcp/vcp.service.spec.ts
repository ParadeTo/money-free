import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { VcpService } from './vcp.service';
import { PrismaService } from '../prisma/prisma.service';
import { VcpAnalyzerService } from '../../services/vcp/vcp-analyzer.service';
import { VcpEarlyFilterService } from '../../services/vcp/vcp-early-filter.service';
import { 
  createMockPrismaService, 
  createMockVcpAnalyzer, 
  createMockStock, 
  createMockVcpScanResult,
  createMockKLineData,
} from '../../../tests/utils/mock-services';

describe('VcpService - generateAnalysis', () => {
  let service: VcpService;
  let prisma: any;
  let vcpAnalyzer: any;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    vcpAnalyzer = createMockVcpAnalyzer();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VcpService,
        { provide: PrismaService, useValue: prisma },
        { provide: VcpAnalyzerService, useValue: vcpAnalyzer },
        { provide: VcpEarlyFilterService, useValue: {} },
      ],
    }).compile();

    service = module.get<VcpService>(VcpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('T016 [US1] - Cached path', () => {
    it('should return cached VCP analysis when cache exists and forceRefresh is false', async () => {
      // Arrange
      const stockCode = '605117';
      const mockStock = createMockStock({ stockCode });
      const mockScanResult = createMockVcpScanResult({ stockCode });

      prisma.stock.findUnique.mockResolvedValue(mockStock);
      prisma.vcpScanResult.findFirst.mockResolvedValue(mockScanResult);

      // Act
      const result = await service.generateAnalysis(stockCode, false);

      // Assert
      expect(result).toBeDefined();
      expect(result.stockCode).toBe(stockCode);
      expect(result.stockName).toBe(mockStock.stockName);
      expect(result.cached).toBe(true);
      expect(result.hasVcp).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.contractions).toBeDefined();
      expect(result.pullbacks).toBeDefined();
      expect(result.klines).toBeDefined();

      // Verify cache was used (VcpAnalyzerService.analyze should NOT be called)
      expect(vcpAnalyzer.analyze).not.toHaveBeenCalled();
    });

    it('should calculate isExpired correctly when scanDate > 7 days old', async () => {
      // Arrange
      const stockCode = '605117';
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days ago

      const mockStock = createMockStock({ stockCode });
      const mockScanResult = createMockVcpScanResult({ 
        stockCode, 
        scanDate: oldDate,
      });

      prisma.stock.findUnique.mockResolvedValue(mockStock);
      prisma.vcpScanResult.findFirst.mockResolvedValue(mockScanResult);

      // Act
      const result = await service.generateAnalysis(stockCode, false);

      // Assert
      expect(result.isExpired).toBe(true);
      expect(result.cached).toBe(true);
    });

    it('should set isExpired to false when scanDate <= 7 days old', async () => {
      // Arrange
      const stockCode = '605117';
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 5); // 5 days ago

      const mockStock = createMockStock({ stockCode });
      const mockScanResult = createMockVcpScanResult({ 
        stockCode, 
        scanDate: recentDate,
      });

      prisma.stock.findUnique.mockResolvedValue(mockStock);
      prisma.vcpScanResult.findFirst.mockResolvedValue(mockScanResult);

      // Act
      const result = await service.generateAnalysis(stockCode, false);

      // Assert
      expect(result.isExpired).toBe(false);
      expect(result.cached).toBe(true);
    });
  });

  describe('T017 [US1] - Real-time path', () => {
    it('should perform real-time analysis when forceRefresh is true', async () => {
      // Arrange
      const stockCode = '605117';
      const mockStock = createMockStock({ stockCode });
      const mockKLines = createMockKLineData(300);
      const mockAnalysisResult = createMockVcpAnalyzer().analyze();

      prisma.stock.findUnique.mockResolvedValue(mockStock);
      prisma.vcpScanResult.findFirst.mockResolvedValue(null); // No cache
      prisma.kLineData.findMany.mockResolvedValue(
        mockKLines.map(k => ({
          ...k,
          date: new Date(k.date),
          period: 'daily',
        }))
      );
      vcpAnalyzer.analyze.mockResolvedValue(mockAnalysisResult);

      // Act
      const result = await service.generateAnalysis(stockCode, true);

      // Assert
      expect(result).toBeDefined();
      expect(result.stockCode).toBe(stockCode);
      expect(result.cached).toBe(false);
      expect(vcpAnalyzer.analyze).toHaveBeenCalledWith(expect.any(Array));
    });

    it('should perform real-time analysis when cache does not exist', async () => {
      // Arrange
      const stockCode = '605117';
      const mockStock = createMockStock({ stockCode });
      const mockKLines = createMockKLineData(300);
      const mockAnalysisResult = createMockVcpAnalyzer().analyze();

      prisma.stock.findUnique.mockResolvedValue(mockStock);
      prisma.vcpScanResult.findFirst.mockResolvedValue(null); // No cache
      prisma.kLineData.findMany.mockResolvedValue(
        mockKLines.map(k => ({
          ...k,
          date: new Date(k.date),
          period: 'daily',
        }))
      );
      vcpAnalyzer.analyze.mockResolvedValue(mockAnalysisResult);

      // Act
      const result = await service.generateAnalysis(stockCode, false);

      // Assert
      expect(result.cached).toBe(false);
      expect(vcpAnalyzer.analyze).toHaveBeenCalled();
    });
  });

  describe('T018 [US1] - Error handling: Stock not found', () => {
    it('should throw NotFoundException when stock does not exist', async () => {
      // Arrange
      const stockCode = '999999';
      prisma.stock.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.generateAnalysis(stockCode, false)).rejects.toThrow(
        NotFoundException
      );
      await expect(service.generateAnalysis(stockCode, false)).rejects.toThrow(
        `Stock ${stockCode} not found`
      );
    });
  });

  describe('T019 [US1] - Error handling: Insufficient data', () => {
    it('should throw BadRequestException when K-line data < 30 days', async () => {
      // Arrange
      const stockCode = '605117';
      const mockStock = createMockStock({ stockCode });
      const insufficientKLines = createMockKLineData(20); // Only 20 days

      prisma.stock.findUnique.mockResolvedValue(mockStock);
      prisma.vcpScanResult.findFirst.mockResolvedValue(null); // No cache
      prisma.kLineData.findMany.mockResolvedValue(
        insufficientKLines.map(k => ({
          ...k,
          date: new Date(k.date),
          period: 'daily',
        }))
      );

      // Act & Assert
      await expect(service.generateAnalysis(stockCode, false)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.generateAnalysis(stockCode, false)).rejects.toThrow(
        'Insufficient K-line data'
      );
    });
  });
});
