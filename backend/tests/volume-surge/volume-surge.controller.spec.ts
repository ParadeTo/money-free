import { Test, TestingModule } from '@nestjs/testing';
import { VolumeSurgeController } from '../../src/modules/volume-surge/volume-surge.controller';
import { VolumeSurgeService } from '../../src/modules/volume-surge/volume-surge.service';
import { ScanMode, ScanStatus } from '../../src/types/scan.types';

describe('VolumeSurgeController', () => {
  let controller: VolumeSurgeController;
  let service: VolumeSurgeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VolumeSurgeController],
      providers: [
        {
          provide: VolumeSurgeService,
          useValue: {
            scan: jest.fn(),
            getScanStatus: jest.fn(),
            getScans: jest.fn(),
            getScanResults: jest.fn(),
            cancelScan: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<VolumeSurgeController>(VolumeSurgeController);
    service = module.get<VolumeSurgeService>(VolumeSurgeService);
  });

  describe('POST /scan', () => {
    it('应接受自动模式扫描请求', async () => {
      const mockResponse = { scanId: 'scan-123', status: ScanStatus.RUNNING };
      jest.spyOn(service, 'scan').mockResolvedValue(mockResponse as any);

      const result = await controller.triggerScan({
        mode: ScanMode.AUTO,
        source: 'web',
      });

      expect(result.success).toBe(true);
      expect(result.data.scanId).toBe('scan-123');
      expect(result.data.status).toBe('running');
    });

    it('应接受手动模式扫描请求（带参考日期）', async () => {
      const mockResponse = { scanId: 'scan-456', status: ScanStatus.RUNNING };
      jest.spyOn(service, 'scan').mockResolvedValue(mockResponse as any);

      const result = await controller.triggerScan({
        mode: ScanMode.MANUAL,
        referenceDate: '2026-03-02',
        source: 'cli',
      });

      expect(result.success).toBe(true);
      expect(result.data.scanId).toBe('scan-456');
      expect(service.scan).toHaveBeenCalledWith({
        mode: ScanMode.MANUAL,
        referenceDate: '2026-03-02',
        source: 'cli',
      });
    });

    it('应拒绝手动模式但未提供参考日期的请求', async () => {
      await expect(
        controller.triggerScan({
          mode: ScanMode.MANUAL,
        }),
      ).rejects.toThrow();
    });

    it('应拒绝未来日期作为参考日期', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      await expect(
        controller.triggerScan({
          mode: ScanMode.MANUAL,
          referenceDate: futureDate.toISOString().split('T')[0],
        }),
      ).rejects.toThrow();
    });
  });

  describe('GET /scans/:scanId', () => {
    it('应返回扫描状态', async () => {
      const mockScan = {
        scanId: 'scan-123',
        scanDate: new Date(),
        status: ScanStatus.COMPLETED,
        totalStocks: 3000,
        matchedStocks: 42,
      };

      jest.spyOn(service, 'getScanStatus').mockResolvedValue(mockScan as any);

      const result = await controller.getScanStatus('scan-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockScan);
    });

    it('应返回404如果扫描不存在', async () => {
      jest.spyOn(service, 'getScanStatus').mockResolvedValue(null);

      const result = await controller.getScanStatus('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('SCAN_NOT_FOUND');
    });
  });

  describe('POST /scans/:scanId/cancel', () => {
    it('应成功取消运行中的扫描', async () => {
      const mockResponse = { scanId: 'scan-123', status: ScanStatus.CANCELLED };
      jest.spyOn(service, 'cancelScan').mockResolvedValue(mockResponse as any);

      const result = await controller.cancelScan('scan-123');

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('cancelled');
    });

    it('应拒绝取消已完成的扫描', async () => {
      jest.spyOn(service, 'cancelScan').mockRejectedValue(
        new Error('Cannot cancel completed scan'),
      );

      await expect(controller.cancelScan('scan-123')).rejects.toThrow();
    });
  });
});
