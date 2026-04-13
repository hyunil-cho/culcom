/**
 * API 모듈 통합 re-export.
 * 기존 `import { xxxApi, XxxType } from '@/lib/api'` 경로를 유지하기 위한 배럴 파일.
 * 각 도메인별 모듈은 lib/api/ 하위에 분리되어 있음.
 */

export { api, type ApiResponse, type PageResponse } from './client';
export { authApi, SessionRole, type SessionInfo } from './auth';
export { branchApi, type Branch } from './branch';
export { customerApi, type Customer } from './customer';
export { classApi, type ComplexClass, type ComplexClassRequest } from './classes';
export {
  memberApi, outstandingApi,
  type ComplexMember, type MemberMembershipRequest, type MemberMembershipResponse, type MemberActivityTimelineItem,
  type MembershipPaymentRequest, type MembershipPaymentResponse,
  type MembershipStatus, type PaymentKind, type PaymentMethod, type OutstandingItem,
  type PublicMemberInfo, type PublicMembershipInfo, type PublicClassInfo,
} from './members';
export { staffApi, type ComplexStaff, type StaffRefundInfo } from './staffs';
export { membershipApi, publicMembershipApi, type Membership, type MembershipRequest, type MembershipCheckMember, type MembershipCheckDetail } from './memberships';
export { timeslotApi, type ClassTimeSlot, type ClassTimeSlotRequest } from './timeslots';
export { refundApi, publicRefundApi, type RefundRequest, type RefundReason, type RefundSubmitRequest } from './refunds';
export {
  postponementApi, publicPostponementApi,
  type PostponementRequest, type PostponementReason,
  type PostponementSubmitRequest, type PostponementSubmitResponse,
} from './postponements';
export {
  complexDashboardApi,
  type MembershipAlertItem, type MembershipAlertsResponse, type AutoExpiredItem,
  type TrendResponse, type TrendItem, type TrendPeriod,
} from './complex-dashboard';
export {
  paymentMethodConfigApi, bankConfigApi, signupChannelConfigApi,
  type ConfigItem, type ConfigCreateRequest, type ConfigUpdateRequest,
} from './complex-config';
export {
  attendanceViewApi,
  type AttendanceViewMember, type AttendanceViewClass, type AttendanceViewSlot,
  type BulkAttendanceResult, type AttendanceHistoryDetail, type AttendanceHistorySummary,
  type StaffAttendanceRateSummary,
} from './attendance';
export {
  surveyApi, publicSurveyApi,
  type SurveyTemplate, type SurveySection, type SurveyQuestion, type SurveyOption,
  type SurveySubmitData, type SurveySubmissionItem, type SurveySubmissionDetail,
} from './survey';
export {
  noticeApi,
  type NoticeListItem, type NoticeDetail, type NoticeCreateRequest, type NoticeUpdateRequest,
} from './notice';
export {
  messageTemplateApi,
  type MessageTemplateItem, type MessageTemplateCreateRequest,
  type MessageTemplateUpdateRequest, type PlaceholderItem,
} from './message';
export {
  settingsApi, integrationApi, kakaoSyncApi, dashboardApi, userApi, smsEventApi,
  type MessageTemplateSimple, type ReservationSmsConfig, type ReservationSmsConfigRequest,
  type SmsEventType, type SmsEventConfig, type SmsEventConfigRequest,
  type IntegrationService, type SmsConfig, type SmsConfigSaveRequest,
  type KakaoSyncUrlResponse, type DailyStats, type CallerStats, type DashboardData,
  type UserResponse, type UserCreateRequest,
} from './settings';
export { calendarApi, type CalendarReservation } from './calendar';
export { consentItemApi, type ConsentItem, type ConsentItemRequest } from './consent';
export {
  transferApi, publicTransferApi,
  type TransferRequestItem, type TransferStatus, type TransferPublicInfo,
  type TransferInviteInfo, type TransferInviteSubmitData,
} from './transfer';
export {
  externalApi,
  type SmsSendRequest, type SmsSendResponse,
} from './external';
