import { api } from './client';
import { API } from '@/lib/routes';

export interface MessageTemplateItem {
  seq: number; templateName: string; description: string | null;
  messageContext: string | null; isDefault: boolean; isActive: boolean;
  createdDate: string | null; lastUpdateDate: string | null;
}

export interface MessageTemplateCreateRequest {
  templateName: string; description?: string; messageContext: string; isActive: boolean;
}

export interface MessageTemplateUpdateRequest {
  templateName: string; description?: string; messageContext: string; isActive: boolean;
}

export interface MessageTemplateResolveRequest {
  customerName?: string;
  customerPhone?: string;
  interviewDate?: string;
}

export interface PlaceholderItem {
  seq: number; name: string; comment: string | null; examples: string | null; value: string | null;
}

export const messageTemplateApi = {
  list: () => api.get<MessageTemplateItem[]>(API.MESSAGE_TEMPLATES),
  get: (seq: number) => api.get<MessageTemplateItem>(API.MESSAGE_TEMPLATE(seq)),
  create: (data: MessageTemplateCreateRequest) => api.post<MessageTemplateItem>(API.MESSAGE_TEMPLATES, data),
  update: (seq: number, data: MessageTemplateUpdateRequest) => api.put<MessageTemplateItem>(API.MESSAGE_TEMPLATE(seq), data),
  delete: (seq: number) => api.delete<void>(API.MESSAGE_TEMPLATE(seq)),
  setDefault: (seq: number) => api.post<void>(API.MESSAGE_TEMPLATE_SET_DEFAULT(seq)),
  resolve: (seq: number, data: MessageTemplateResolveRequest) => api.post<string>(API.MESSAGE_TEMPLATE_RESOLVE(seq), data),
  placeholders: () => api.get<PlaceholderItem[]>(API.MESSAGE_TEMPLATE_PLACEHOLDERS),
};
