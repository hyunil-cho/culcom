import { api } from './client';
import { API } from '@/lib/routes';

// ── Settings ──

export interface MessageTemplateSimple {
  seq: number; templateName: string;
}

// ── SMS 이벤트 설정 ──

export type SmsEventType = '예약확정' | '고객등록' | '회원등록';

export interface SmsEventConfig {
  seq: number; eventType: SmsEventType; templateSeq: number;
  templateName: string; senderNumber: string; autoSend: boolean;
}

export interface SmsEventConfigRequest {
  eventType: SmsEventType; templateSeq: number; senderNumber: string; autoSend: boolean;
}

export const smsEventApi = {
  list: () => api.get<SmsEventConfig[]>(API.SETTINGS_SMS_EVENTS),
  get: (eventType: SmsEventType) => api.get<SmsEventConfig | null>(`${API.SETTINGS_SMS_EVENTS}/${eventType}`),
  save: (data: SmsEventConfigRequest) => api.post<SmsEventConfig>(API.SETTINGS_SMS_EVENTS, data),
  delete: (eventType: SmsEventType) => api.delete<void>(`${API.SETTINGS_SMS_EVENTS}/${eventType}`),
  getTemplates: () => api.get<MessageTemplateSimple[]>(API.SETTINGS_SMS_EVENTS_TEMPLATES),
  getSenderNumbers: () => api.get<string[]>(API.SETTINGS_SMS_EVENTS_SENDERS),
};

// ── Integrations ──

export interface IntegrationService {
  id: number; name: string; description: string; icon: string;
  category: string; status: 'active' | 'inactive' | 'not-configured'; connected: boolean;
}

export interface SmsConfig {
  serviceId: number; serviceName: string; accountId: string | null;
  password: string | null; senderPhones: string[]; active: boolean; updatedAt: string | null;
}

export interface SmsConfigSaveRequest {
  serviceId: number; accountId: string; password: string; senderPhone: string; active: boolean;
}

export const integrationApi = {
  list: () => api.get<IntegrationService[]>(API.INTEGRATIONS),
  getSmsConfig: () => api.get<SmsConfig | null>(API.INTEGRATIONS_SMS_CONFIG),
  saveSmsConfig: (data: SmsConfigSaveRequest) => api.post<void>(API.INTEGRATIONS_SMS_CONFIG, data),
};

// ── Kakao Sync ──

export interface KakaoSyncUrlResponse {
  kakaoSyncUrl: string; branchName: string;
}

export const kakaoSyncApi = {
  getUrl: () => api.get<KakaoSyncUrlResponse>(API.KAKAO_SYNC_URL),
};

// ── Dashboard ──

export interface DailyStats { date: string; count: number; reservationCount: number; }
export interface CallerStats { caller: string; selectionCount: number; reservationConfirm: number; confirmRate: number; }
export interface DashboardData { todayTotalCustomers: number; smsRemaining: number; lmsRemaining: number; dailyStats: DailyStats[]; }

export const dashboardApi = {
  get: () => api.get<DashboardData>(API.DASHBOARD),
  callerStats: (period: 'day' | 'week' | 'month') =>
    api.get<CallerStats[]>(`${API.DASHBOARD_CALLER_STATS}?period=${period}`),
};

// ── User ──

export interface UserResponse {
  seq: number; userId: string; name: string | null; role: string; createdDate: string;
}

export interface UserCreateRequest {
  userId: string; password: string; name: string; phone: string;
}

export const userApi = {
  list: () => api.get<UserResponse[]>(API.USERS),
  create: (data: UserCreateRequest) => api.post<UserResponse>(API.USERS, data),
  update: (seq: number, data: Partial<UserCreateRequest>) => api.put<UserResponse>(API.USER(seq), data),
  delete: (seq: number) => api.delete<void>(API.USER(seq)),
};
