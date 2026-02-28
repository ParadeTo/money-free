/**
 * 数据更新服务
 */

import { api } from './api';
import type {
  TriggerUpdateResponse,
  UpdateStatusResponse,
  UpdateHistoryItem,
  UpdateLog,
} from '../types/update';

class UpdateService {
  private readonly baseUrl = '/data/update';

  async triggerUpdate(): Promise<TriggerUpdateResponse> {
    return await api.post<TriggerUpdateResponse>(this.baseUrl);
  }

  async getUpdateStatus(taskId: string): Promise<UpdateStatusResponse> {
    return await api.get<UpdateStatusResponse>(
      `${this.baseUrl}/${taskId}/status`
    );
  }

  async getUpdateHistory(): Promise<UpdateHistoryItem[]> {
    return await api.get<UpdateHistoryItem[]>(
      `${this.baseUrl}/history`
    );
  }

  async getUpdateLogs(taskId: string): Promise<UpdateLog> {
    return await api.get<UpdateLog>(
      `${this.baseUrl}/${taskId}/logs`
    );
  }
}

export const updateService = new UpdateService();
