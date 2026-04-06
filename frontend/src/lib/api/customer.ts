import { api, type PageResponse } from './client';
import { API } from '@/lib/routes';

export interface Customer {
  seq: number;
  name: string;
  phoneNumber: string;
  comment?: string;
  commercialName?: string;
  adSource?: string;
  callCount: number;
  status: string;
  createdDate: string;
  lastUpdateDate?: string;
}

export const customerApi = {
  list: (params?: string) => api.get<PageResponse<Customer>>(`${API.CUSTOMERS}${params ? `?${params}` : ''}`),
  get: (seq: number) => api.get<Customer>(API.CUSTOMER(seq)),
  create: (data: Partial<Customer>) => api.post<Customer>(API.CUSTOMERS, data),
  update: (seq: number, data: Partial<Customer>) => api.put<Customer>(API.CUSTOMER(seq), data),
  delete: (seq: number) => api.delete<void>(API.CUSTOMER(seq)),
  updateName: (customerSeq: number, name: string) =>
    api.post<void>(API.CUSTOMERS_UPDATE_NAME, { customerSeq, name }),
  updateComment: (customerSeq: number, comment: string) =>
    api.post<{ comment: string }>(API.CUSTOMERS_COMMENT, { customerSeq, comment }),
  processCall: (customerSeq: number, caller: string) =>
    api.post<{ callCount: number; lastUpdateDate: string }>(API.CUSTOMERS_PROCESS_CALL, { customerSeq, caller }),
  createReservation: (customerSeq: number, caller: string, interviewDate: string) =>
    api.post<{ reservation_id: number }>(API.CUSTOMERS_RESERVATION, { customerSeq, caller, interviewDate }),
  markNoPhoneInterview: (customerSeq: number) =>
    api.post<void>(API.CUSTOMERS_MARK_NO_PHONE, { customerSeq }),
};
