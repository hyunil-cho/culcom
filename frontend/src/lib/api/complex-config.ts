import { api } from './client';

export interface ConfigItem {
  seq: number;
  code: string;
  isActive: boolean;
}

export interface ConfigCreateRequest {
  code: string;
  isActive?: boolean;
}

export interface ConfigUpdateRequest {
  isActive?: boolean;
}

export const paymentMethodConfigApi = {
  list: () => api.get<ConfigItem[]>('/complex/settings/payment-methods'),
  create: (data: ConfigCreateRequest) => api.post<ConfigItem>('/complex/settings/payment-methods', data),
  update: (seq: number, data: ConfigUpdateRequest) => api.put<ConfigItem>(`/complex/settings/payment-methods/${seq}`, data),
  delete: (seq: number) => api.delete<void>(`/complex/settings/payment-methods/${seq}`),
};

export const bankConfigApi = {
  list: () => api.get<ConfigItem[]>('/complex/settings/banks'),
  create: (data: ConfigCreateRequest) => api.post<ConfigItem>('/complex/settings/banks', data),
  update: (seq: number, data: ConfigUpdateRequest) => api.put<ConfigItem>(`/complex/settings/banks/${seq}`, data),
  delete: (seq: number) => api.delete<void>(`/complex/settings/banks/${seq}`),
};

export const signupChannelConfigApi = {
  list: () => api.get<ConfigItem[]>('/complex/settings/signup-channels'),
  create: (data: ConfigCreateRequest) => api.post<ConfigItem>('/complex/settings/signup-channels', data),
  update: (seq: number, data: ConfigUpdateRequest) => api.put<ConfigItem>(`/complex/settings/signup-channels/${seq}`, data),
  delete: (seq: number) => api.delete<void>(`/complex/settings/signup-channels/${seq}`),
};
