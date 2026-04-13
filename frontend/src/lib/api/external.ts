import { api } from './client';
import { API } from '@/lib/routes';

export interface SmsSendRequest {
  senderPhone: string; receiverPhone: string; message: string; subject?: string;
}

export interface SmsSendResponse {
  success: boolean; message: string; code: string; nums: string; cols: string; msgType: string;
}

export const externalApi = {
  sendSms: (data: SmsSendRequest) => api.post<SmsSendResponse>(API.EXTERNAL_SMS_SEND, data),
};
