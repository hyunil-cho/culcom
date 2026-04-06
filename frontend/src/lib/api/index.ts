/**
 * API 모듈 통합 re-export.
 * 기존 `import { xxxApi, XxxType } from '@/lib/api'` 경로를 유지하기 위한 배럴 파일.
 * 각 도메인별 모듈은 lib/api/ 하위에 분리되어 있음.
 */

export { api, type ApiResponse, type PageResponse } from './client';
export { authApi, SessionRole, type SessionInfo } from './auth';
export { branchApi, type Branch } from './branch';
export { customerApi, type Customer } from './customer';
export {
  classApi, memberApi, staffApi, membershipApi, timeslotApi, refundApi,
  postponementApi, publicPostponementApi,
  type ComplexClass, type ComplexClassRequest,
  type ComplexMember, type MemberMembershipRequest, type MemberMembershipResponse, type MemberActivityTimelineItem,
  type ComplexStaff, type StaffRefundInfo,
  type Membership, type MembershipRequest,
  type ClassTimeSlot, type ClassTimeSlotRequest,
  type RefundRequest, type RefundReason, type PostponementRequest, type PostponementReason,
  type PublicMemberInfo, type PublicMembershipInfo, type PublicClassInfo,
  type PostponementSubmitRequest, type PostponementSubmitResponse,
  publicRefundApi, type RefundSubmitRequest,
  publicMembershipApi, type MembershipCheckMember, type MembershipCheckDetail,
} from './complex';
export {
  attendanceViewApi,
  type AttendanceViewMember, type AttendanceViewClass, type AttendanceViewSlot,
  type BulkAttendanceResult, type AttendanceHistoryDetail, type AttendanceHistorySummary,
} from './attendance';
export {
  surveyApi, publicSurveyApi,
  type SurveyTemplate, type SurveySection, type SurveyQuestion, type SurveyOption,
  type SurveySubmitData, type SurveySubmissionItem,
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
  settingsApi, integrationApi, kakaoSyncApi, dashboardApi, userApi,
  type MessageTemplateSimple, type ReservationSmsConfig, type ReservationSmsConfigRequest,
  type IntegrationService, type SmsConfig, type SmsConfigSaveRequest,
  type KakaoSyncUrlResponse, type DailyStats, type CallerStats, type DashboardData,
  type UserResponse, type UserCreateRequest,
} from './settings';
export { calendarApi, type CalendarReservation } from './calendar';
export {
  externalApi,
  type SmsSendRequest, type SmsSendResponse, type CalendarEventRequest, type CalendarEventResponse,
} from './external';
