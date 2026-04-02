import {number} from "prop-types";

const API_BASE = '/api';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

async function request<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${url}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (res.status === 401) {
    if (typeof window !== 'undefined' && !url.includes('/auth/')) {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    let message = `요청 실패 (HTTP ${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch { /* 응답 body 파싱 실패 시 기본 메시지 사용 */ }
    showErrorModal(message);
    return { success: false, message, data: null as unknown as T };
  }

  const body: ApiResponse<T> = await res.json();
  if (!body.success && body.message) {
    showErrorModal(body.message);
  }

  return body;
}

function showErrorModal(message: string) {
  if (typeof window === 'undefined') return;

  const existing = document.getElementById('api-error-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'api-error-modal';
  Object.assign(overlay.style, {
    display: 'flex', position: 'fixed', top: '0', left: '0',
    width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)',
    zIndex: '10001', alignItems: 'center', justifyContent: 'center',
  });

  overlay.innerHTML = `
    <div style="background:white;border-radius:12px;width:90%;max-width:400px;box-shadow:0 10px 40px rgba(0,0,0,0.2)">
      <div style="padding:1.5rem 2rem;border-bottom:2px solid #f44336">
        <h3 style="margin:0;font-size:1.25rem;color:#2c3e50">오류</h3>
      </div>
      <div style="padding:2rem;text-align:center;color:#666;font-size:0.95rem;word-break:keep-all">
        ${message.replace(/</g, '&lt;')}
      </div>
      <div style="padding:1rem 2rem;border-top:1px solid #e0e0e0;display:flex">
        <button id="api-error-close" style="flex:1;padding:0.75rem;font-size:1rem;border:none;background:#f44336;color:white;border-radius:6px;cursor:pointer">
          확인
        </button>
      </div>
    </div>
  `;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
  overlay.querySelector('#api-error-close')?.addEventListener('click', () => overlay.remove());
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};

// Auth
export const authApi = {
  login: (userId: string, password: string) =>
    api.post<SessionInfo>('/auth/login', { userId, password }),
  me: () => api.get<SessionInfo>('/auth/me'),
  logout: () => api.post<void>('/auth/logout'),
  selectBranch: (branchSeq: number) => api.post<void>(`/auth/branch/${branchSeq}`),
};

// Types
export interface SessionInfo {
  userSeq: number;
  userId: string;
  name: string | null;
  role: string;
  selectedBranchSeq: number | null;
  selectedBranchName: string | null;
}

export const SessionRole = {
  isRoot: (s: SessionInfo | null) => s?.role === 'ROOT',
  isManager: (s: SessionInfo | null) => s?.role === 'BRANCH_MANAGER',
  isStaff: (s: SessionInfo | null) => s?.role === 'STAFF',
  canManageUsers: (s: SessionInfo | null) => s?.role === 'ROOT' || s?.role === 'BRANCH_MANAGER',
  displayName: (s: SessionInfo | null) =>
    s?.role === 'ROOT' ? '최고관리자' : s?.role === 'BRANCH_MANAGER' ? '지점장' : '직원',
};

export interface UserResponse {
  seq: number;
  userId: string;
  name: string | null;
  role: string;
  createdDate: string;
}

export interface UserCreateRequest {
  userId: string;
  password: string;
  name: string;
  phone: string;
}

export interface Branch {
  seq: number;
  branchName: string;
  alias: string;
  branchManager?: string;
  address?: string;
  directions?: string;
  createdDate?: string;
}

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

export interface ComplexClass {
  seq: number;
  name: string;
  description?: string;
  capacity: number;
  sortOrder: number;
}

export interface ComplexMember {
  seq: number;
  name: string;
  phoneNumber: string;
  level?: string;
  language?: string;
  chartNumber?: string;
  comment?: string;
}

export interface ComplexStaff {
  seq: number;
  name: string;
  phoneNumber?: string;
  email?: string;
  subject?: string;
  status: string;
}

// API shortcuts
export const branchApi = {
  list: () => api.get<Branch[]>('/branches'),
  get: (seq: number) => api.get<Branch>(`/branches/${seq}`),
  create: (data: Partial<Branch>) => api.post<Branch>('/branches', data),
  update: (seq: number, data: Partial<Branch>) => api.put<Branch>(`/branches/${seq}`, data),
  delete: (seq: number) => api.delete<void>(`/branches/${seq}`),
};

export const customerApi = {
  list: (params?: string) => api.get<PageResponse<Customer>>(`/customers${params ? `?${params}` : ''}`),
  create: (data: Partial<Customer>) => api.post<Customer>('/customers', data),
  update: (seq: number, data: Partial<Customer>) => api.put<Customer>(`/customers/${seq}`, data),
  delete: (seq: number) => api.delete<void>(`/customers/${seq}`),
  updateName: (customerSeq: number, name: string) =>
    api.post<void>('/customers/update-name', { customerSeq, name }),
  updateComment: (customerSeq: number, comment: string) =>
    api.post<{ comment: string }>('/customers/comment', { customerSeq, comment }),
  processCall: (customerSeq: number, caller: string) =>
    api.post<{ call_count: number; last_update_date: string }>('/customers/process-call', { customerSeq, caller }),
  createReservation: (customerSeq: number, caller: string, interviewDate: string) =>
    api.post<{ reservation_id: number }>('/customers/reservation', { customerSeq, caller, interviewDate }),
  markNoPhoneInterview: (customerSeq: number) =>
    api.post<void>('/customers/mark-no-phone-interview', { customerSeq }),
};

export const classApi = {
  list: () => api.get<ComplexClass[]>('/complex/classes'),
  get: (seq: number) => api.get<ComplexClass>(`/complex/classes/${seq}`),
  create: (data: Partial<ComplexClass>) => api.post<ComplexClass>('/complex/classes', data),
  update: (seq: number, data: Partial<ComplexClass>) => api.put<ComplexClass>(`/complex/classes/${seq}`, data),
  delete: (seq: number) => api.delete<void>(`/complex/classes/${seq}`),
};

export const memberApi = {
  list: (params?: string) => api.get<PageResponse<ComplexMember>>(`/complex/members${params ? `?${params}` : ''}`),
  get: (seq: number) => api.get<ComplexMember>(`/complex/members/${seq}`),
  create: (data: Partial<ComplexMember>) => api.post<ComplexMember>('/complex/members', data),
  update: (seq: number, data: Partial<ComplexMember>) => api.put<ComplexMember>(`/complex/members/${seq}`, data),
  delete: (seq: number) => api.delete<void>(`/complex/members/${seq}`),
};

export const userApi = {
  list: () => api.get<UserResponse[]>('/users'),
  create: (data: UserCreateRequest) => api.post<UserResponse>('/users', data),
  update: (seq: number, data: Partial<UserCreateRequest>) => api.put<UserResponse>(`/users/${seq}`, data),
  delete: (seq: number) => api.delete<void>(`/users/${seq}`),
};

// Settings
export interface MessageTemplateSimple {
  seq: number;
  templateName: string;
}

export interface ReservationSmsConfig {
  seq: number;
  templateSeq: number;
  templateName: string;
  senderNumber: string;
  autoSend: boolean;
}

export interface ReservationSmsConfigRequest {
  templateSeq: number;
  senderNumber: string;
  autoSend: boolean;
}

export const settingsApi = {
  getReservationSmsConfig: () => api.get<ReservationSmsConfig | null>('/settings/reservation-sms'),
  getTemplates: () => api.get<MessageTemplateSimple[]>('/settings/reservation-sms/templates'),
  getSenderNumbers: () => api.get<string[]>('/settings/reservation-sms/sender-numbers'),
  saveReservationSmsConfig: (data: ReservationSmsConfigRequest) =>
    api.post<ReservationSmsConfig>('/settings/reservation-sms', data),
};

export const staffApi = {
  list: () => api.get<ComplexStaff[]>('/complex/staffs'),
  get: (seq: number) => api.get<ComplexStaff>(`/complex/staffs/${seq}`),
  create: (data: Partial<ComplexStaff>) => api.post<ComplexStaff>('/complex/staffs', data),
  update: (seq: number, data: Partial<ComplexStaff>) => api.put<ComplexStaff>(`/complex/staffs/${seq}`, data),
  delete: (seq: number) => api.delete<void>(`/complex/staffs/${seq}`),
};

export interface KakaoSyncUrlResponse {
  kakaoSyncUrl: string;
  branchName: string;
}

export const kakaoSyncApi = {
  getUrl: () => api.get<KakaoSyncUrlResponse>('/kakao-sync/url'),
};

// Notices
export interface NoticeListItem {
  seq: number;
  branchName: string;
  title: string;
  category: string;
  isPinned: boolean;
  viewCount: number;
  createdBy: string;
  createdDate: string;
  eventStartDate: string | null;
  eventEndDate: string | null;
}

export interface NoticeDetail {
  seq: number;
  branchName: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  isActive: boolean;
  viewCount: number;
  createdBy: string;
  createdDate: string;
  lastUpdateDate: string | null;
  eventStartDate: string | null;
  eventEndDate: string | null;
}

export interface NoticeCreateRequest {
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  createdBy?: string;
  eventStartDate?: string;
  eventEndDate?: string;
}

export interface NoticeUpdateRequest {
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  eventStartDate?: string;
  eventEndDate?: string;
}

// ── Dashboard ──

export interface DailyStats {
  date: string;
  count: number;
  reservationCount: number;
}

export interface CallerStats {
  caller: string;
  selectionCount: number;
  reservationConfirm: number;
  confirmRate: number;
}

export interface DashboardData {
  todayTotalCustomers: number;
  smsRemaining: number;
  lmsRemaining: number;
  dailyStats: DailyStats[];
}

export const dashboardApi = {
  get: () => api.get<DashboardData>('/dashboard'),
  callerStats: (period: 'day' | 'week' | 'month') =>
    api.get<CallerStats[]>(`/dashboard/caller-stats?period=${period}`),
};

// ── Integrations ──

export interface IntegrationService {
  id: number;
  name: string;
  description: string;
  icon: string;
  category: string;
  status: 'active' | 'inactive' | 'not-configured';
  connected: boolean;
}

export interface SmsConfig {
  serviceId: number;
  serviceName: string;
  accountId: string | null;
  senderPhones: string[];
  active: boolean;
  updatedAt: string | null;
}

export interface SmsConfigSaveRequest {
  serviceId: number;
  accountId: string;
  password: string;
  senderPhone: string;
  active: boolean;
}

export const integrationApi = {
  list: () => api.get<IntegrationService[]>('/integrations'),
  getSmsConfig: () => api.get<SmsConfig | null>('/integrations/sms-config'),
  saveSmsConfig: (data: SmsConfigSaveRequest) => api.post<void>('/integrations/sms-config', data),
};

export const noticeApi = {
  list: (params?: string) => api.get<PageResponse<NoticeListItem>>(`/notices${params ? `?${params}` : ''}`),
  get: (seq: number) => api.get<NoticeDetail>(`/notices/${seq}`),
  create: (data: NoticeCreateRequest) => api.post<NoticeDetail>('/notices', data),
  update: (seq: number, data: NoticeUpdateRequest) => api.put<NoticeDetail>(`/notices/${seq}`, data),
  delete: (seq: number) => api.delete<void>(`/notices/${seq}`),
};

// Message Templates
export interface MessageTemplateItem {
  seq: number;
  templateName: string;
  description: string | null;
  messageContext: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdDate: string | null;
  lastUpdateDate: string | null;
}

export interface MessageTemplateCreateRequest {
  templateName: string;
  description?: string;
  messageContext: string;
  isActive: boolean;
}

export interface MessageTemplateUpdateRequest {
  templateName: string;
  description?: string;
  messageContext: string;
  isActive: boolean;
}

export interface PlaceholderItem {
  seq: number;
  name: string;
  comment: string | null;
  examples: string | null;
  value: string | null;
}

export const messageTemplateApi = {
  list: () => api.get<MessageTemplateItem[]>('/message-templates'),
  get: (seq: number) => api.get<MessageTemplateItem>(`/message-templates/${seq}`),
  create: (data: MessageTemplateCreateRequest) => api.post<MessageTemplateItem>('/message-templates', data),
  update: (seq: number, data: MessageTemplateUpdateRequest) => api.put<MessageTemplateItem>(`/message-templates/${seq}`, data),
  delete: (seq: number) => api.delete<void>(`/message-templates/${seq}`),
  setDefault: (seq: number) => api.post<void>(`/message-templates/${seq}/set-default`),
  placeholders: () => api.get<PlaceholderItem[]>('/message-templates/placeholders'),
};

// External Services
export interface SmsSendRequest {
  senderPhone: string;
  receiverPhone: string;
  message: string;
  subject?: string;
}

export interface SmsSendResponse {
  success: boolean;
  message: string;
  code: string;
  nums: string;
  cols: string;
  msgType: string;
}

export const externalApi = {
  sendSms: (data: SmsSendRequest) => api.post<SmsSendResponse>('/external/sms/send', data),
};
