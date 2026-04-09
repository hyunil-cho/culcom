import { api, type ApiResponse } from './client';

export interface ConsentItem {
  seq: number;
  title: string;
  content: string;
  required: boolean;
  category: string;
  version: number;
  createdDate: string | null;
  lastUpdateDate: string | null;
}

export interface ConsentItemRequest {
  title: string;
  content: string;
  required: boolean;
  category: string;
}

const BASE = '/consent-items';

export const consentItemApi = {
  list: (category?: string) =>
    api.get<ConsentItem[]>(category ? `${BASE}?category=${category}` : BASE),
  get: (seq: number) => api.get<ConsentItem>(`${BASE}/${seq}`),
  create: (data: ConsentItemRequest) => api.post<ConsentItem>(BASE, data),
  update: (seq: number, data: ConsentItemRequest) => api.put<ConsentItem>(`${BASE}/${seq}`, data),
  delete: (seq: number) => api.delete<void>(`${BASE}/${seq}`),
};
