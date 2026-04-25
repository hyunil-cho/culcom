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
  type MembershipChangeRequest,
  type MembershipStatus, type PaymentKind, type PaymentMethod, type OutstandingItem,
  type PublicMemberInfo, type PublicMembershipInfo, type PublicClassInfo,
} from './members';
export { staffApi, type ComplexStaff, type StaffRefundInfo } from './staffs';
export { membershipApi, publicMembershipApi, type Membership, type MembershipRequest, type MembershipCheckMember, type MembershipCheckDetail } from './memberships';
export { timeslotApi, type ClassTimeSlot, type ClassTimeSlotRequest } from './timeslots';
export { refundApi, publicRefundApi, publicRefundSurveyApi, refundSurveyApi, type RefundRequest, type RefundReason, type RefundSubmitRequest, type RefundSurveyResponse, type RefundSurveySubmitRequest } from './refunds';
export {
  postponementApi, publicPostponementApi,
  type PostponementRequest, type PostponementReason,
  type PostponementSubmitRequest, type PostponementSubmitResponse,
} from './postponements';
export {
  complexDashboardApi,
  type MembershipAlertItem, type MembershipAlertsResponse, type AutoExpiredItem,
  type TrendResponse, type TrendItem, type TrendPeriod,
  type ReturnScanLogItem, type ReturnScanStatusResponse,
} from './complex-dashboard';
export {
  paymentMethodConfigApi, bankConfigApi, signupChannelConfigApi, cardCompanyConfigApi,
  type ConfigItem, type ConfigCreateRequest, type ConfigUpdateRequest,
} from './complex-config';
export {
  attendanceViewApi,
  type AttendanceViewMember, type AttendanceViewClass, type AttendanceViewSlot,
  type BulkAttendanceResult, type BulkAttendanceResultStatus,
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
  type MessageTemplateUpdateRequest, type MessageTemplateResolveRequest, type PlaceholderItem,
} from './message';
export {
  integrationApi, kakaoSyncApi, dashboardApi, userApi, smsEventApi,
  type MessageTemplateSimple,
  type SmsEventType, type SmsEventConfig, type SmsEventConfigRequest,
  type IntegrationService, type SmsConfig, type SmsConfigSaveRequest,
  type KakaoSyncUrlResponse, type DailyStats, type CallerStats, type DashboardData,
  type UserResponse, type UserCreateRequest, type PasswordChangeRequest,
} from './settings';
export { calendarApi, type CalendarReservation, type CalendarEvent, type CalendarEventRequest } from './calendar';
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
export {
  publicLinkApi,
  type PublicLinkKind, type PublicLinkCreateGeneralRequest,
  type PublicLinkCreateResponse, type PublicLinkTransferCreateResponse,
  type PublicLinkResolveResponse,
} from './publicLinks';
