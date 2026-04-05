import { api, type PageResponse } from './client';
import { API } from '@/lib/routes';

export interface WebhookConfig {
  seq: number; name: string; sourceName: string; sourceDescription: string | null;
  httpMethod: string; requestContentType: string; requestHeaders: string | null;
  requestBodySchema: string | null; responseStatusCode: number; responseContentType: string;
  responseBodyTemplate: string | null; fieldMapping: string | null;
  authType: string | null; authConfig: string | null; isActive: boolean; createdDate: string;
}

export interface WebhookConfigRequest {
  name: string; sourceName: string; sourceDescription?: string;
  httpMethod: string; requestContentType: string; requestHeaders?: string;
  requestBodySchema?: string; responseStatusCode: number; responseContentType: string;
  responseBodyTemplate?: string; fieldMapping?: string; authType?: string;
  authConfig?: string; isActive: boolean;
}

export interface WebhookLog {
  seq: number; sourceName: string; rawRequest: string | null; status: string;
  errorMessage: string | null; remoteIp: string | null; createdDate: string;
  webhookConfig?: { seq: number; name: string }; customer?: { seq: number; name: string };
}

export const webhookApi = {
  list: () => api.get<WebhookConfig[]>(API.WEBHOOKS),
  get: (seq: number) => api.get<WebhookConfig>(API.WEBHOOK(seq)),
  create: (data: WebhookConfigRequest) => api.post<WebhookConfig>(API.WEBHOOKS, data),
  update: (seq: number, data: WebhookConfigRequest) => api.put<WebhookConfig>(API.WEBHOOK(seq), data),
  delete: (seq: number) => api.delete<void>(API.WEBHOOK(seq)),
  logs: (params?: string) =>
    api.get<PageResponse<WebhookLog>>(`${API.WEBHOOK_LOGS}${params ? `?${params}` : ''}`),
};
