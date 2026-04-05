import { api, type PageResponse } from './client';
import { API } from '@/lib/routes';

export interface NoticeListItem {
  seq: number; branchName: string; title: string; category: string;
  isPinned: boolean; viewCount: number; createdBy: string; createdDate: string;
  eventStartDate: string | null; eventEndDate: string | null;
}

export interface NoticeDetail {
  seq: number; branchName: string; title: string; content: string; category: string;
  isPinned: boolean; isActive: boolean; viewCount: number; createdBy: string;
  createdDate: string; lastUpdateDate: string | null;
  eventStartDate: string | null; eventEndDate: string | null;
}

export interface NoticeCreateRequest {
  title: string; content: string; category: string; isPinned: boolean;
  createdBy?: string; eventStartDate?: string; eventEndDate?: string;
}

export interface NoticeUpdateRequest {
  title: string; content: string; category: string; isPinned: boolean;
  eventStartDate?: string; eventEndDate?: string;
}

export const noticeApi = {
  list: (params?: string) => api.get<PageResponse<NoticeListItem>>(`${API.NOTICES}${params ? `?${params}` : ''}`),
  get: (seq: number) => api.get<NoticeDetail>(API.NOTICE(seq)),
  create: (data: NoticeCreateRequest) => api.post<NoticeDetail>(API.NOTICES, data),
  update: (seq: number, data: NoticeUpdateRequest) => api.put<NoticeDetail>(API.NOTICE(seq), data),
  delete: (seq: number) => api.delete<void>(API.NOTICE(seq)),
};
