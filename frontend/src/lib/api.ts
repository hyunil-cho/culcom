import { API, ROUTES } from '@/lib/routes';

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

const API_BASE = '/api';

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
      window.location.href = ROUTES.LOGIN;
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    let message = `요청 실패 (HTTP ${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch { /* 응답 body 파싱 실패 시 기본 메시지 사용 */ }
    return { success: false, message, data: null as unknown as T };
  }

  return await res.json();
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};

// ── Auth ──

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

export const authApi = {
  login: (userId: string, password: string) =>
    api.post<SessionInfo>(API.AUTH_LOGIN, { userId, password }),
  me: () => api.get<SessionInfo>(API.AUTH_ME),
  logout: () => api.post<void>(API.AUTH_LOGOUT),
  selectBranch: (branchSeq: number) => api.post<void>(API.AUTH_BRANCH(branchSeq)),
};

// ── Branch ──

export interface Branch {
  seq: number;
  branchName: string;
  alias: string;
  branchManager?: string;
  address?: string;
  directions?: string;
  createdDate?: string;
}

export const branchApi = {
  list: () => api.get<Branch[]>(API.BRANCHES),
  get: (seq: number) => api.get<Branch>(API.BRANCH(seq)),
  create: (data: Partial<Branch>) => api.post<Branch>(API.BRANCHES, data),
  update: (seq: number, data: Partial<Branch>) => api.put<Branch>(API.BRANCH(seq), data),
  delete: (seq: number) => api.delete<void>(API.BRANCH(seq)),
};

// ── Customer ──

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
    api.post<{ call_count: number; last_update_date: string }>(API.CUSTOMERS_PROCESS_CALL, { customerSeq, caller }),
  createReservation: (customerSeq: number, caller: string, interviewDate: string) =>
    api.post<{ reservation_id: number }>(API.CUSTOMERS_RESERVATION, { customerSeq, caller, interviewDate }),
  markNoPhoneInterview: (customerSeq: number) =>
    api.post<void>(API.CUSTOMERS_MARK_NO_PHONE, { customerSeq }),
};

// ── Complex ──

export interface ComplexClass {
  seq: number;
  name: string;
  description?: string;
  capacity: number;
  sortOrder: number;
  timeSlot?: {
    seq: number;
    name: string;
    daysOfWeek: string;
    startTime: string;
    endTime: string;
  };
  staff?: {
    seq: number;
    name: string;
  };
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
};

export const memberApi = {
  list: (params?: string) => api.get<PageResponse<ComplexMember>>(`${API.COMPLEX_MEMBERS}${params ? `?${params}` : ''}`),
  get: (seq: number) => api.get<ComplexMember>(API.COMPLEX_MEMBER(seq)),
  create: (data: Partial<ComplexMember>) => api.post<ComplexMember>(API.COMPLEX_MEMBERS, data),
  update: (seq: number, data: Partial<ComplexMember>) => api.put<ComplexMember>(API.COMPLEX_MEMBER(seq), data),
  delete: (seq: number) => api.delete<void>(API.COMPLEX_MEMBER(seq)),
};

export const staffApi = {
  list: () => api.get<ComplexStaff[]>(API.COMPLEX_STAFFS),
  get: (seq: number) => api.get<ComplexStaff>(API.COMPLEX_STAFF(seq)),
  create: (data: Partial<ComplexStaff>) => api.post<ComplexStaff>(API.COMPLEX_STAFFS, data),
  update: (seq: number, data: Partial<ComplexStaff>) => api.put<ComplexStaff>(API.COMPLEX_STAFF(seq), data),
  delete: (seq: number) => api.delete<void>(API.COMPLEX_STAFF(seq)),
};

// ── User ──

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

export const userApi = {
  list: () => api.get<UserResponse[]>(API.USERS),
  create: (data: UserCreateRequest) => api.post<UserResponse>(API.USERS, data),
  update: (seq: number, data: Partial<UserCreateRequest>) => api.put<UserResponse>(API.USER(seq), data),
  delete: (seq: number) => api.delete<void>(API.USER(seq)),
};

// ── Settings ──

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
  getReservationSmsConfig: () => api.get<ReservationSmsConfig | null>(API.SETTINGS_RESERVATION_SMS),
  getTemplates: () => api.get<MessageTemplateSimple[]>(API.SETTINGS_RESERVATION_SMS_TEMPLATES),
  getSenderNumbers: () => api.get<string[]>(API.SETTINGS_RESERVATION_SMS_SENDERS),
  saveReservationSmsConfig: (data: ReservationSmsConfigRequest) =>
    api.post<ReservationSmsConfig>(API.SETTINGS_RESERVATION_SMS, data),
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
  list: () => api.get<IntegrationService[]>(API.INTEGRATIONS),
  getSmsConfig: () => api.get<SmsConfig | null>(API.INTEGRATIONS_SMS_CONFIG),
  saveSmsConfig: (data: SmsConfigSaveRequest) => api.post<void>(API.INTEGRATIONS_SMS_CONFIG, data),
};

// ── Kakao Sync ──

export interface KakaoSyncUrlResponse {
  kakaoSyncUrl: string;
  branchName: string;
}

export const kakaoSyncApi = {
  getUrl: () => api.get<KakaoSyncUrlResponse>(API.KAKAO_SYNC_URL),
};

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
  get: () => api.get<DashboardData>(API.DASHBOARD),
  callerStats: (period: 'day' | 'week' | 'month') =>
    api.get<CallerStats[]>(`${API.DASHBOARD_CALLER_STATS}?period=${period}`),
};

// ── Notices ──

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

export const noticeApi = {
  list: (params?: string) => api.get<PageResponse<NoticeListItem>>(`${API.NOTICES}${params ? `?${params}` : ''}`),
  get: (seq: number) => api.get<NoticeDetail>(API.NOTICE(seq)),
  create: (data: NoticeCreateRequest) => api.post<NoticeDetail>(API.NOTICES, data),
  update: (seq: number, data: NoticeUpdateRequest) => api.put<NoticeDetail>(API.NOTICE(seq), data),
  delete: (seq: number) => api.delete<void>(API.NOTICE(seq)),
};

// ── Message Templates ──

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
  list: () => api.get<MessageTemplateItem[]>(API.MESSAGE_TEMPLATES),
  get: (seq: number) => api.get<MessageTemplateItem>(API.MESSAGE_TEMPLATE(seq)),
  create: (data: MessageTemplateCreateRequest) => api.post<MessageTemplateItem>(API.MESSAGE_TEMPLATES, data),
  update: (seq: number, data: MessageTemplateUpdateRequest) => api.put<MessageTemplateItem>(API.MESSAGE_TEMPLATE(seq), data),
  delete: (seq: number) => api.delete<void>(API.MESSAGE_TEMPLATE(seq)),
  setDefault: (seq: number) => api.post<void>(API.MESSAGE_TEMPLATE_SET_DEFAULT(seq)),
  placeholders: () => api.get<PlaceholderItem[]>(API.MESSAGE_TEMPLATE_PLACEHOLDERS),
};

// ── Memberships ──

export interface Membership {
  seq: number;
  name: string;
  duration: number;
  count: number;
  price: number;
  createdDate: string | null;
  lastUpdateDate: string | null;
}

export interface MembershipRequest {
  name: string;
  duration: number;
  count: number;
  price: number;
}

export const membershipApi = {
  list: () => api.get<Membership[]>(API.MEMBERSHIPS),
  get: (seq: number) => api.get<Membership>(API.MEMBERSHIP(seq)),
  create: (data: MembershipRequest) => api.post<Membership>(API.MEMBERSHIPS, data),
  update: (seq: number, data: MembershipRequest) => api.put<Membership>(API.MEMBERSHIP(seq), data),
  delete: (seq: number) => api.delete<void>(API.MEMBERSHIP(seq)),
};

// ── Class Time Slots ──

export interface ClassTimeSlot {
  seq: number;
  name: string;
  daysOfWeek: string;
  startTime: string;
  endTime: string;
  createdDate: string | null;
}

export interface ClassTimeSlotRequest {
  name: string;
  daysOfWeek: string;
  startTime: string;
  endTime: string;
}

export const timeslotApi = {
  list: () => api.get<ClassTimeSlot[]>(API.COMPLEX_TIMESLOTS),
  create: (data: ClassTimeSlotRequest) => api.post<ClassTimeSlot>(API.COMPLEX_TIMESLOTS, data),
  update: (seq: number, data: ClassTimeSlotRequest) => api.put<ClassTimeSlot>(API.COMPLEX_TIMESLOT(seq), data),
  delete: (seq: number) => api.delete<void>(API.COMPLEX_TIMESLOT(seq)),
};

// ── Refunds ──

export interface RefundRequest {
  seq: number;
  memberName: string;
  phoneNumber: string;
  membershipName: string;
  price: string | null;
  reason: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  status: '대기' | '승인' | '반려';
  rejectReason: string | null;
  createdDate: string;
}

export const refundApi = {
  list: (params?: string) =>
    api.get<PageResponse<RefundRequest>>(`${API.COMPLEX_REFUNDS}${params ? `?${params}` : ''}`),
  updateStatus: (seq: number, status: string, rejectReason?: string) =>
    api.put<RefundRequest>(
      `${API.COMPLEX_REFUND_STATUS(seq)}?status=${encodeURIComponent(status)}${rejectReason ? `&rejectReason=${encodeURIComponent(rejectReason)}` : ''}`
    ),
};

// ── Postponements ──

export interface PostponementRequest {
  seq: number;
  memberName: string;
  phoneNumber: string;
  timeSlot: string;
  currentClass: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: '대기' | '승인' | '반려';
  rejectReason: string | null;
  createdDate: string;
}

export interface PostponementReason {
  seq: number;
  reason: string;
  createdDate: string;
}

export const postponementApi = {
  list: (params?: string) =>
    api.get<PageResponse<PostponementRequest>>(`${API.COMPLEX_POSTPONEMENTS}${params ? `?${params}` : ''}`),
  updateStatus: (seq: number, status: string, rejectReason?: string) =>
    api.put<PostponementRequest>(
      `${API.COMPLEX_POSTPONEMENT_STATUS(seq)}?status=${encodeURIComponent(status)}${rejectReason ? `&rejectReason=${encodeURIComponent(rejectReason)}` : ''}`
    ),
  reasons: () => api.get<PostponementReason[]>(API.COMPLEX_POSTPONEMENT_REASONS),
  addReason: (reason: string) =>
    api.post<PostponementReason>(API.COMPLEX_POSTPONEMENT_REASONS, { reason }),
  deleteReason: (seq: number) =>
    api.delete<void>(API.COMPLEX_POSTPONEMENT_REASON(seq)),
};

// ── Public Postponement ──

export interface PublicMemberInfo {
  seq: number;
  name: string;
  phoneNumber: string;
  branchSeq: number;
  branchName: string;
  level: string | null;
  memberships: PublicMembershipInfo[];
  classes: PublicClassInfo[];
}

export interface PublicMembershipInfo {
  seq: number;
  membershipName: string;
  startDate: string;
  expiryDate: string;
  totalCount: number;
  usedCount: number;
  postponeTotal: number;
  postponeUsed: number;
}

export interface PublicClassInfo {
  name: string;
  timeSlotName: string;
  startTime: string;
  endTime: string;
}

export interface PostponementSubmitRequest {
  name: string;
  phone: string;
  branchSeq: number;
  memberSeq: number;
  memberMembershipSeq: number;
  timeSlot: string;
  currentClass: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface PostponementSubmitResponse {
  name: string;
  phone: string;
  branchName: string;
  timeSlot: string;
  currentClass: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export const publicPostponementApi = {
  searchMember: (name: string, phone: string) =>
    api.get<{ members: PublicMemberInfo[] }>(
      `${API.PUBLIC_POSTPONEMENT_SEARCH}?name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}`
    ),
  submit: (data: PostponementSubmitRequest) =>
    api.post<PostponementSubmitResponse>(API.PUBLIC_POSTPONEMENT_SUBMIT, data),
  reasons: (branchSeq: number) =>
    api.get<string[]>(`${API.PUBLIC_POSTPONEMENT_REASONS}?branchSeq=${branchSeq}`),
};

// ── Webhooks ──

export interface WebhookConfig {
  seq: number;
  name: string;
  sourceName: string;
  sourceDescription: string | null;
  httpMethod: string;
  requestContentType: string;
  requestHeaders: string | null;
  requestBodySchema: string | null;
  responseStatusCode: number;
  responseContentType: string;
  responseBodyTemplate: string | null;
  fieldMapping: string | null;
  authType: string | null;
  authConfig: string | null;
  isActive: boolean;
  createdDate: string;
}

export interface WebhookConfigRequest {
  name: string;
  sourceName: string;
  sourceDescription?: string;
  httpMethod: string;
  requestContentType: string;
  requestHeaders?: string;
  requestBodySchema?: string;
  responseStatusCode: number;
  responseContentType: string;
  responseBodyTemplate?: string;
  fieldMapping?: string;
  authType?: string;
  authConfig?: string;
  isActive: boolean;
}

export interface WebhookLog {
  seq: number;
  sourceName: string;
  rawRequest: string | null;
  status: string;
  errorMessage: string | null;
  remoteIp: string | null;
  createdDate: string;
  webhookConfig?: { seq: number; name: string };
  customer?: { seq: number; name: string };
}

export const webhookApi = {
  list: () => api.get<WebhookConfig[]>(API.WEBHOOKS),
  get: (seq: number) => api.get<WebhookConfig>(API.WEBHOOK(seq)),
  create: (data: WebhookConfigRequest) => api.post<WebhookConfig>(API.WEBHOOKS, data),
  update: (seq: number, data: WebhookConfigRequest) => api.put<WebhookConfig>(API.WEBHOOK(seq), data),
  delete: (seq: number) => api.delete<void>(API.WEBHOOK(seq)),
  logs: (params?: string) =>
    api.get<PageResponse<WebhookLog>>(`${API.WEBHOOK_LOGS}${params ? `?${params}` : ''}`),
};

// ── External Services ──

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

export interface CalendarEventRequest {
  customerName: string;
  phoneNumber: string;
  interviewDate: string;
  comment?: string;
  duration?: number;
  caller?: string;
  callCount?: number;
  commercialName?: string;
  adSource?: string;
}

export interface CalendarEventResponse {
  link: string;
}

export const externalApi = {
  sendSms: (data: SmsSendRequest) => api.post<SmsSendResponse>(API.EXTERNAL_SMS_SEND, data),
  createCalendarEvent: (data: CalendarEventRequest) => api.post<CalendarEventResponse>(API.EXTERNAL_CALENDAR_CREATE, data),
};

// ── Survey ──

export interface SurveyTemplate {
  seq: number;
  name: string;
  description: string | null;
  status: '작성중' | '활성' | '비활성';
  createdDate: string;
  lastUpdateDate: string | null;
  optionCount: number;
}

export interface SurveySection {
  seq: number;
  templateSeq: number;
  title: string;
  sortOrder: number;
}

export interface SurveyQuestion {
  seq: number;
  templateSeq: number;
  sectionSeq: number | null;
  questionKey: string;
  title: string;
  description: string | null;
  inputType: 'radio' | 'checkbox' | 'text';
  isGrouped: boolean;
  groups: string | null;
  sortOrder: number;
  required: boolean;
}

export interface SurveyOption {
  seq: number;
  templateSeq: number;
  questionSeq: number;
  groupName: string;
  label: string;
  sortOrder: number;
  createdDate: string;
}

export const surveyApi = {
  // 템플릿
  listTemplates: () => api.get<SurveyTemplate[]>(API.SURVEY_TEMPLATES),
  getTemplate: (seq: number) => api.get<SurveyTemplate>(API.SURVEY_TEMPLATE(seq)),
  createTemplate: (data: { name: string; description?: string }) =>
    api.post<SurveyTemplate>(API.SURVEY_TEMPLATES, data),
  updateTemplate: (seq: number, data: { name?: string; description?: string }) =>
    api.put<SurveyTemplate>(API.SURVEY_TEMPLATE(seq), data),
  updateStatus: (seq: number, status: string) =>
    api.put<SurveyTemplate>(API.SURVEY_TEMPLATE_STATUS(seq), { status }),
  copyTemplate: (seq: number) => api.post<SurveyTemplate>(API.SURVEY_TEMPLATE_COPY(seq)),
  deleteTemplate: (seq: number) => api.delete<void>(API.SURVEY_TEMPLATE(seq)),

  // 섹션
  listSections: (templateSeq: number) =>
    api.get<SurveySection[]>(API.SURVEY_SECTIONS(templateSeq)),
  createSection: (templateSeq: number, data: { title: string }) =>
    api.post<SurveySection>(API.SURVEY_SECTIONS(templateSeq), data),
  updateSection: (templateSeq: number, sectionSeq: number, data: { title: string }) =>
    api.put<SurveySection>(API.SURVEY_SECTION(templateSeq, sectionSeq), data),
  deleteSection: (templateSeq: number, sectionSeq: number) =>
    api.delete<void>(API.SURVEY_SECTION(templateSeq, sectionSeq)),

  // 질문
  listQuestions: (templateSeq: number) =>
    api.get<SurveyQuestion[]>(API.SURVEY_QUESTIONS(templateSeq)),
  createQuestion: (templateSeq: number, data: Partial<SurveyQuestion> & { sectionSeq?: number }) =>
    api.post<SurveyQuestion>(API.SURVEY_QUESTIONS(templateSeq), data),
  updateQuestion: (templateSeq: number, questionSeq: number, data: Partial<SurveyQuestion>) =>
    api.put<SurveyQuestion>(API.SURVEY_QUESTION(templateSeq, questionSeq), data),
  deleteQuestion: (templateSeq: number, questionSeq: number) =>
    api.delete<void>(API.SURVEY_QUESTION(templateSeq, questionSeq)),
  reorderQuestions: (templateSeq: number, items: { seq: number; sortOrder: number; newQuestionKey: string }[]) =>
    api.put<SurveyQuestion[]>(`${API.SURVEY_QUESTIONS(templateSeq)}/reorder`, { items }),

  // 선택지
  listOptions: (templateSeq: number, questionSeq?: number) =>
    api.get<SurveyOption[]>(`${API.SURVEY_OPTIONS(templateSeq)}${questionSeq ? `?questionSeq=${questionSeq}` : ''}`),
  createOption: (templateSeq: number, data: { questionSeq: number; groupName?: string; label: string }) =>
    api.post<SurveyOption>(API.SURVEY_OPTIONS(templateSeq), data),
  deleteOption: (templateSeq: number, optionSeq: number) =>
    api.delete<void>(API.SURVEY_OPTION(templateSeq, optionSeq)),
};

// ── Calendar ──

export interface CalendarReservation {
  seq: number;
  customerSeq: number | null;
  interviewDate: string;
  customerName: string;
  customerPhone: string;
  caller: string;
  status: string;
  memo?: string;
}

export const calendarApi = {
  getReservations: (startDate: string, endDate: string) =>
    api.get<CalendarReservation[]>(`${API.CALENDAR_RESERVATIONS}?startDate=${startDate}&endDate=${endDate}`),
  updateReservationStatus: (seq: number, status: string) =>
    api.put<CalendarReservation>(API.CALENDAR_RESERVATION_STATUS(seq), { status }),
};

// ── Attendance View (등록현황) ──

export interface AttendanceViewMember {
  memberSeq: number;
  name: string;
  phoneNumber: string;
  level?: string;
  info?: string;
  joinDate?: string;
  expiryDate?: string;
  totalCount?: number;
  usedCount?: number;
  grade?: string;
  staff: boolean;
  postponed: boolean;
  status: string;
  attendanceHistory?: string[];
}

export interface AttendanceViewClass {
  classSeq: number;
  name: string;
  capacity: number;
  members: AttendanceViewMember[];
}

export interface AttendanceViewSlot {
  timeSlotSeq: number;
  slotName: string;
  classes: AttendanceViewClass[];
}

export interface BulkAttendanceResult {
  memberSeq: number;
  name: string;
  status: string;
}

export const attendanceViewApi = {
  getView: () => api.get<AttendanceViewSlot[]>(API.COMPLEX_ATTENDANCE_VIEW),
  getDetail: (slotSeq: number) =>
    api.get<AttendanceViewClass[]>(`${API.COMPLEX_ATTENDANCE_VIEW_DETAIL}?slotSeq=${slotSeq}`),
  bulkAttendance: (classSeq: number, members: { memberSeq: number; staff: boolean; attended: boolean }[]) =>
    api.post<BulkAttendanceResult[]>(API.COMPLEX_ATTENDANCE_BULK, { classSeq, members }),
  reorderClasses: (classOrders: { id: number; sortOrder: number }[]) =>
    api.post<void>(API.COMPLEX_ATTENDANCE_REORDER, { classOrders }),
};
