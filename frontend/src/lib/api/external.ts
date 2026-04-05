import { api } from './client';
import { API } from '@/lib/routes';

export interface SmsSendRequest {
  senderPhone: string; receiverPhone: string; message: string; subject?: string;
}

export interface SmsSendResponse {
  success: boolean; message: string; code: string; nums: string; cols: string; msgType: string;
}

export interface CalendarEventRequest {
  customerName: string; phoneNumber: string; interviewDate: string; comment?: string;
  duration?: number; caller?: string; callCount?: number; commercialName?: string; adSource?: string;
}

export interface CalendarEventResponse { link: string; }

export const externalApi = {
  sendSms: (data: SmsSendRequest) => api.post<SmsSendResponse>(API.EXTERNAL_SMS_SEND, data),
  createCalendarEvent: (data: CalendarEventRequest) => api.post<CalendarEventResponse>(API.EXTERNAL_CALENDAR_CREATE, data),
};
