import { Test, TestingModule } from '@nestjs/testing';
import { PythonBridgeService } from '../../src/services/python-bridge/python-bridge.service';

describe('PythonBridgeService', () => {
  let service: PythonBridgeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PythonBridgeService],
    }).compile();

    service = module.get<PythonBridgeService>(PythonBridgeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Python Environment Health Check', () => {
    it('should check Python environment', async () => {
      const result = await service.checkHealth();
      
      expect(result).toHaveProperty('available');
      expect(result).toHaveProperty('pythonPath');
      
      if (result.available) {
        console.log('✅ Python environment is available');
        console.log(`Python path: ${result.pythonPath}`);
      } else {
        console.warn('⚠️  Python environment is not available');
        console.warn(`Error: ${result.error}`);
      }
    }, 10000); // 10s timeout
  });

  describe('KDJ Calculation', () => {
    it('should calculate KDJ from price data', async () => {
      const testData = {
        high: [10.5, 10.8, 11.2, 11.0, 10.9, 11.3, 11.5, 11.2, 11.0, 11.4],
        low: [10.1, 10.3, 10.5, 10.6, 10.5, 10.8, 11.0, 10.8, 10.6, 11.0],
        close: [10.3, 10.6, 10.9, 10.8, 10.7, 11.1, 11.3, 11.0, 10.8, 11.2],
        period: 9,
        k_period: 3,
        d_period: 3,
      };

      const result = await service.execute<{
        k: number[];
        d: number[];
        j: number[];
      }>('calculate_kdj.py', testData);

      expect(result).toHaveProperty('k');
      expect(result).toHaveProperty('d');
      expect(result).toHaveProperty('j');
      expect(Array.isArray(result.k)).toBe(true);
      expect(Array.isArray(result.d)).toBe(true);
      expect(Array.isArray(result.j)).toBe(true);
      expect(result.k.length).toBe(testData.close.length);
      expect(result.d.length).toBe(testData.close.length);
      expect(result.j.length).toBe(testData.close.length);

      console.log('✅ KDJ calculation successful');
      console.log(`K: ${result.k.slice(-3)}`);
      console.log(`D: ${result.d.slice(-3)}`);
      console.log(`J: ${result.j.slice(-3)}`);
    }, 10000); // 10s timeout

    it('should handle invalid input', async () => {
      const invalidData = {
        high: [10.5, 10.8],
        low: [10.1], // 长度不匹配
        close: [10.3, 10.6],
      };

      await expect(
        service.execute('calculate_kdj.py', invalidData),
      ).rejects.toThrow();
    }, 10000);
  });

  describe('Error Handling', () => {
    it('should handle non-existent script', async () => {
      await expect(
        service.execute('non_existent_script.py', {}),
      ).rejects.toThrow();
    }, 10000);

    it('should handle script timeout', async () => {
      // 注意：这个测试需要一个会超时的脚本
      // 这里只是示例，实际环境中可能需要创建一个特殊的测试脚本
      await expect(
        service.execute('health_check.py', {}, 100), // 100ms 超时
      ).rejects.toThrow(/timeout/);
    }, 10000);
  });
});
