/**
 * 绘图服务
 */

import { api } from './api';
import type { Drawing, CreateDrawingRequest } from '../types/drawing';

class DrawingService {
  private readonly baseUrl = '/drawings';

  async createDrawing(request: CreateDrawingRequest): Promise<Drawing> {
    const response = await api.post(this.baseUrl, request);
    return response.data;
  }

  async getDrawings(stockCode: string, period: 'daily' | 'weekly'): Promise<Drawing[]> {
    const response = await api.get(this.baseUrl, { params: { stockCode, period } });
    return response.data;
  }

  async deleteDrawing(drawingId: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${drawingId}`);
  }
}

export const drawingService = new DrawingService();
