import { api, type PageResponse } from './client';
import { API } from '@/lib/routes';

export interface ComplexClass {
  seq: number;
  name: string;
  description?: string;
  capacity: number;
  sortOrder: number;
  timeSlotSeq?: number;
  timeSlotName?: string;
  staffSeq?: number;
  staffName?: string;
  memberCount?: number;
  createdDate?: string;
}

export interface ComplexClassRequest {
  name: string;
  description?: string;
  capacity?: number;
  sortOrder?: number;
  timeSlotSeq?: number;
  staffSeq?: number;
}

export const classApi = {
  list: (params?: string) => api.get<PageResponse<ComplexClass>>(`${API.COMPLEX_CLASSES}${params ? `?${params}` : ''}`),
  get: (seq: number) => api.get<ComplexClass>(API.COMPLEX_CLASS(seq)),
  create: (data: ComplexClassRequest) => api.post<ComplexClass>(API.COMPLEX_CLASSES, data),
  update: (seq: number, data: ComplexClassRequest) => api.put<ComplexClass>(API.COMPLEX_CLASS(seq), data),
  delete: (seq: number) => api.delete<void>(API.COMPLEX_CLASS(seq)),
  listMembers: (seq: number) => api.get<import('./members').ComplexMember[]>(API.COMPLEX_CLASS_MEMBERS(seq)),
  addMember: (seq: number, memberSeq: number) => api.post<void>(API.COMPLEX_CLASS_MEMBER(seq, memberSeq)),
  removeMember: (seq: number, memberSeq: number) => api.delete<void>(API.COMPLEX_CLASS_MEMBER(seq, memberSeq)),
  setLeader: (seq: number, staffSeq: number | null) =>
    api.put<ComplexClass>(API.COMPLEX_CLASS_LEADER(seq), { staffSeq }),
};
