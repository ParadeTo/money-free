import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';

/**
 * Python Bridge 服务
 * 用于调用 Python 脚本进行数据处理
 * 
 * 通信方式:
 * - 通过 stdin 发送 JSON 数据
 * - 通过 stdout 接收 JSON 结果
 * - 通过 stderr 接收错误信息
 */
@Injectable()
export class PythonBridgeService {
  private readonly logger = new Logger(PythonBridgeService.name);
  private readonly pythonPath: string;
  private readonly bridgeDir: string;

  constructor() {
    // Python 可执行文件路径 (使用虚拟环境)
    this.bridgeDir = path.join(process.cwd(), '..', 'bridge');
    this.pythonPath = path.join(this.bridgeDir, 'venv', 'bin', 'python');
  }

  /**
   * 执行 Python 脚本
   * 
   * @param scriptName - Python 脚本名称 (例如: 'calculate_kdj.py')
   * @param data - 要发送给 Python 脚本的数据 (将被转换为 JSON)
   * @param timeout - 超时时间 (毫秒), 默认 30 秒
   * @returns Python 脚本的输出结果 (JSON 解析后)
   */
  async execute<T = any>(
    scriptName: string,
    data: any,
    timeout: number = 30000,
  ): Promise<T> {
    const scriptPath = path.join(this.bridgeDir, scriptName);

    this.logger.debug(`Executing Python script: ${scriptPath}`);
    this.logger.debug(`Input data: ${JSON.stringify(data)}`);

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        pythonProcess.kill();
        reject(new InternalServerErrorException(
          `Python script timeout after ${timeout}ms: ${scriptName}`,
        ));
      }, timeout);

      const pythonProcess = spawn(this.pythonPath, [scriptPath], {
        cwd: this.bridgeDir,
      });

      let stdoutData = '';
      let stderrData = '';

      // 监听 stdout (正常输出)
      pythonProcess.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString();
      });

      // 监听 stderr (错误输出)
      pythonProcess.stderr.on('data', (chunk) => {
        stderrData += chunk.toString();
        this.logger.warn(`Python stderr: ${chunk.toString()}`);
      });

      // 发送输入数据到 Python 脚本
      const inputJson = JSON.stringify(data);
      pythonProcess.stdin.write(inputJson);
      pythonProcess.stdin.end();

      // 进程结束
      pythonProcess.on('close', (code) => {
        clearTimeout(timeoutId);

        if (code !== 0) {
          this.logger.error(`Python script failed with code ${code}`);
          this.logger.error(`stderr: ${stderrData}`);
          reject(new InternalServerErrorException(
            `Python script error: ${stderrData || 'Unknown error'}`,
          ));
          return;
        }

        try {
          const result = JSON.parse(stdoutData);
          this.logger.debug(`Python script output: ${JSON.stringify(result)}`);
          resolve(result);
        } catch (error) {
          this.logger.error(`Failed to parse Python output: ${stdoutData}`);
          reject(new InternalServerErrorException(
            'Failed to parse Python script output',
          ));
        }
      });

      // 进程错误
      pythonProcess.on('error', (error) => {
        clearTimeout(timeoutId);
        this.logger.error(`Failed to execute Python script: ${error.message}`);
        reject(new InternalServerErrorException(
          `Failed to execute Python script: ${error.message}`,
        ));
      });
    });
  }

  /**
   * 检查 Python 环境是否可用
   */
  async checkHealth(): Promise<{ available: boolean; pythonPath: string; error?: string }> {
    try {
      const result = await this.execute<{ version: string }>('health_check.py', {});
      return {
        available: true,
        pythonPath: this.pythonPath,
        ...result,
      };
    } catch (error) {
      return {
        available: false,
        pythonPath: this.pythonPath,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
