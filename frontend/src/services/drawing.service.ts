/**
 * 绘图服务
 */

import { api } from './api';
import type { Drawing, CreateDrawingRequest } from '../types/drawing';

class DrawingService {
  private readonly baseUrl = '/drawings';

  async createDrawing(request: CreateDrawingRequest): Promise<Drawing> {
    return await api.post<Drawing>(this.baseUrl, request);
  }

  async getDrawings(stockCode: string, period: 'daily' | 'weekly'): Promise<Drawing[]> {
    return await api.get<Drawing[]>(this.baseUrl, { params: { stockCode, period } });
  }

  async deleteDrawing(drawingId: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${drawingId}`);
  }
}

export const drawingService = new DrawingService();
