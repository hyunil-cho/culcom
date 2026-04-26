/**
 * 프론트엔드 페이지 라우트 경로 상수.
 * 모든 페이지 경로는 이 파일에서 관리한다.
 * 자식 경로는 부모 경로를 참조하여 중복을 제거한다.
 */

// 페이지 라우트 기본 경로
const R = {
  CUSTOMERS: '/customers',
  BRANCHES: '/branches',
  USERS: '/users',
  NOTICES: '/notices',
  MESSAGE_TEMPLATES: '/message-templates',
  INTEGRATIONS: '/integrations',
  KAKAO_SYNC: '/kakao-sync',
  SETTINGS: '/settings',
  COMPLEX: '/complex',
  CALENDAR: '/calendar',
} as const;

export const ROUTES = {
  ROOT: "/",

  LOGIN: '/login',
  DASHBOARD: '/dashboard',

  // 상담 예약 캘린더
  CALENDAR: R.CALENDAR,

  // 공개 페이지 (단축 URL 통합 진입점)
  PUBLIC_SHORT: (code: string) => `/public/s/${code}`,
  PUBLIC_POSTPONEMENT_SUCCESS: '/public/postponement/success',
  PUBLIC_REFUND_SUCCESS: '/public/refund/success',
  PUBLIC_REFUND_SURVEY: '/public/refund-survey',
  PUBLIC_REFUND_SURVEY_SUCCESS: '/public/refund-survey/success',
  PUBLIC_TRANSFER_INVITE: '/public/transfer/invite',

  // 고객 관리
  CUSTOMERS: R.CUSTOMERS,
  CUSTOMERS_ADD: `${R.CUSTOMERS}/add`,
  CUSTOMER_DETAIL: (seq: number) => `${R.CUSTOMERS}/${seq}`,
  CUSTOMER_EDIT: (seq: number) => `${R.CUSTOMERS}/${seq}/edit`,

  // 지점 관리
  BRANCHES: R.BRANCHES,
  BRANCHES_ADD: `${R.BRANCHES}/add`,
  BRANCH_DETAIL: (seq: number) => `${R.BRANCHES}/${seq}`,
  BRANCH_EDIT: (seq: number) => `${R.BRANCHES}/${seq}/edit`,

  // 사용자 관리
  USERS: R.USERS,
  USERS_CREATE: `${R.USERS}/create`,
  USER_EDIT: (seq: number) => `${R.USERS}/${seq}/edit`,

  // 마이페이지
  MY_PAGE: '/my-page',
  FORCE_PASSWORD_CHANGE: '/force-password-change',

  // 공지사항
  NOTICES: R.NOTICES,
  NOTICES_ADD: `${R.NOTICES}/add`,
  NOTICE_DETAIL: (seq: number) => `${R.NOTICES}/${seq}`,
  NOTICE_EDIT: (seq: number) => `${R.NOTICES}/${seq}/edit`,

  // 메시지 템플릿
  MESSAGE_TEMPLATES: R.MESSAGE_TEMPLATES,
  MESSAGE_TEMPLATES_ADD: `${R.MESSAGE_TEMPLATES}/add`,
  MESSAGE_TEMPLATE_EDIT: (seq: number) => `${R.MESSAGE_TEMPLATES}/${seq}/edit`,

  // 연동 관리
  INTEGRATIONS: R.INTEGRATIONS,
  INTEGRATIONS_SMS_CONFIG: `${R.INTEGRATIONS}/sms-config`,

  // 카카오싱크
  KAKAO_SYNC: R.KAKAO_SYNC,

  // 설정
  SETTINGS: R.SETTINGS,
  SETTINGS_SMS_CONFIG: `${R.SETTINGS}/sms-config`,

  // 복합시설
  COMPLEX: R.COMPLEX,
  COMPLEX_DASHBOARD: `${R.COMPLEX}/dashboard`,
  COMPLEX_CLASSES: `${R.COMPLEX}/classes`,
  COMPLEX_CLASSES_ADD: `${R.COMPLEX}/classes/add`,
  COMPLEX_CLASS_TEAMS: `${R.COMPLEX}/classes/teams`,
  COMPLEX_CLASS_EDIT: (seq: number) => `${R.COMPLEX}/classes/${seq}/edit`,
  COMPLEX_MEMBERS: `${R.COMPLEX}/members`,
  COMPLEX_MEMBERS_ADD: `${R.COMPLEX}/members/add`,
  COMPLEX_MEMBER_LINKS: `${R.COMPLEX}/members/links`,
  COMPLEX_OUTSTANDING: `${R.COMPLEX}/members/outstanding`,
  COMPLEX_SETTINGS: `${R.COMPLEX}/settings`,
  SETTINGS_CATALOGS: `${R.SETTINGS}/catalogs`,
  COMPLEX_MEMBER_EDIT: (seq: number) => `${R.COMPLEX}/members/${seq}/edit`,
  COMPLEX_STAFFS: `${R.COMPLEX}/staffs`,
  COMPLEX_STAFFS_ADD: `${R.COMPLEX}/staffs/add`,
  COMPLEX_STAFF_EDIT: (seq: number) => `${R.COMPLEX}/staffs/${seq}/edit`,
  COMPLEX_ATTENDANCE: `${R.COMPLEX}/attendance`,
  COMPLEX_ATTENDANCE_DETAIL: (slotSeq: number) => `${R.COMPLEX}/attendance/${slotSeq}`,
  COMPLEX_MEMBERSHIPS: `${R.COMPLEX}/memberships`,
  COMPLEX_MEMBERSHIPS_ADD: `${R.COMPLEX}/memberships/add`,
  COMPLEX_MEMBERSHIP_EDIT: (seq: number) => `${R.COMPLEX}/memberships/${seq}/edit`,
  COMPLEX_TIMESLOTS: `${R.COMPLEX}/timeslots`,
  COMPLEX_TIMESLOTS_ADD: `${R.COMPLEX}/timeslots/add`,
  COMPLEX_TIMESLOT_EDIT: (seq: number) => `${R.COMPLEX}/timeslots/${seq}/edit`,
  COMPLEX_POSTPONEMENTS: `${R.COMPLEX}/postponements`,
  COMPLEX_POSTPONEMENT_REASONS: `${R.COMPLEX}/postponements/reasons`,
  COMPLEX_REFUNDS: `${R.COMPLEX}/refunds`,
  COMPLEX_REFUND_REASONS: `${R.COMPLEX}/refunds/reasons`,
  COMPLEX_REFUND_SURVEYS: `${R.COMPLEX}/refunds/surveys`,
  COMPLEX_TRANSFER_REQUESTS: `${R.COMPLEX}/transfer-requests`,
  // 동의항목
  CONSENT_ITEMS: '/consent-items',
  CONSENT_ITEMS_ADD: '/consent-items/add',
  CONSENT_ITEM_EDIT: (seq: number) => `/consent-items/${seq}/edit`,

  SURVEY: '/survey',
  SURVEY_SUBMISSIONS: '/survey/submissions',
  SURVEY_SUBMISSION_DETAIL: (seq: number) => `/survey/submissions/${seq}`,
  SURVEY_OPTIONS: (seq: number) => `/survey/${seq}/options`,
  SURVEY_PREVIEW: (seq: number) => `/survey/${seq}/preview`,
  SURVEY_FILL: (seq: number) => `/survey/${seq}/fill`,
} as const;

/**
 * 백엔드 API 엔드포인트 경로 상수.
 * api.ts의 모든 fetch 호출에서 이 상수를 참조한다.
 * 자식 경로는 부모 경로를 참조하여 중복을 제거한다.
 */

// API 기본 경로
const A = {
  AUTH: '/auth',
  BRANCHES: '/branches',
  CUSTOMERS: '/customers',
  COMPLEX_CLASSES: '/complex/classes',
  COMPLEX_MEMBERS: '/complex/members',
  COMPLEX_STAFFS: '/complex/staffs',
  USERS: '/users',
  SETTINGS_SMS_EVENTS: '/settings/sms-events',
  INTEGRATIONS: '/integrations',
  KAKAO_SYNC: '/kakao-sync',
  NOTICES: '/notices',
  DASHBOARD: '/dashboard',
  MESSAGE_TEMPLATES: '/message-templates',
  EXTERNAL: '/external',
  CALENDAR: '/calendar',
} as const;

export const API = {
  // 인증
  AUTH_LOGIN: `${A.AUTH}/login`,
  AUTH_LOGOUT: `${A.AUTH}/logout`,
  AUTH_ME: `${A.AUTH}/me`,
  AUTH_BRANCH: (branchSeq: number) => `${A.AUTH}/branch/${branchSeq}`,

  // 지점
  BRANCHES: A.BRANCHES,
  BRANCH: (seq: number) => `${A.BRANCHES}/${seq}`,

  // 고객
  CUSTOMERS: A.CUSTOMERS,
  CUSTOMER: (seq: number) => `${A.CUSTOMERS}/${seq}`,
  CUSTOMERS_UPDATE_NAME: `${A.CUSTOMERS}/update-name`,
  CUSTOMERS_COMMENT: `${A.CUSTOMERS}/comment`,
  CUSTOMERS_PROCESS_CALL: `${A.CUSTOMERS}/process-call`,
  CUSTOMERS_RESERVATION: `${A.CUSTOMERS}/reservation`,
  CUSTOMERS_MARK_NO_PHONE: `${A.CUSTOMERS}/mark-no-phone-interview`,

  // 복합시설
  COMPLEX_CLASSES: A.COMPLEX_CLASSES,
  COMPLEX_CLASS: (seq: number) => `${A.COMPLEX_CLASSES}/${seq}`,
  COMPLEX_CLASS_MEMBERS: (seq: number) => `${A.COMPLEX_CLASSES}/${seq}/members`,
  COMPLEX_CLASS_MEMBER: (seq: number, memberSeq: number) => `${A.COMPLEX_CLASSES}/${seq}/members/${memberSeq}`,
  COMPLEX_CLASS_LEADER: (seq: number) => `${A.COMPLEX_CLASSES}/${seq}/leader`,
  COMPLEX_MEMBERS: A.COMPLEX_MEMBERS,
  COMPLEX_MEMBER: (seq: number) => `${A.COMPLEX_MEMBERS}/${seq}`,
  COMPLEX_MEMBER_MEMBERSHIPS: (seq: number) => `${A.COMPLEX_MEMBERS}/${seq}/memberships`,
  COMPLEX_MEMBER_TIMELINE: (seq: number) => `${A.COMPLEX_MEMBERS}/${seq}/timeline`,
  COMPLEX_MEMBER_MEMBERSHIP: (seq: number, mmSeq: number) => `${A.COMPLEX_MEMBERS}/${seq}/memberships/${mmSeq}`,
  COMPLEX_MEMBER_MEMBERSHIP_CHANGE: (seq: number, mmSeq: number) => `${A.COMPLEX_MEMBERS}/${seq}/memberships/${mmSeq}/change`,
  COMPLEX_STAFFS: A.COMPLEX_STAFFS,
  COMPLEX_STAFF: (seq: number) => `${A.COMPLEX_STAFFS}/${seq}`,
  COMPLEX_STAFF_REFUND: (staffSeq: number) => `${A.COMPLEX_STAFFS}/${staffSeq}/refund`,
  COMPLEX_STAFF_TIMELINE: (staffSeq: number) => `${A.COMPLEX_STAFFS}/${staffSeq}/timeline`,

  // 출석 등록현황
  COMPLEX_ATTENDANCE_VIEW: '/complex/attendance/view',
  COMPLEX_ATTENDANCE_VIEW_DETAIL: '/complex/attendance/view/detail',
  COMPLEX_ATTENDANCE_BULK: '/complex/attendance/bulk',
  COMPLEX_ATTENDANCE_REORDER: '/complex/attendance/reorder',
  COMPLEX_ATTENDANCE_STAFF_RATES: '/complex/attendance/history/staff-rates',

  // 멤버십
  MEMBERSHIPS: '/memberships',
  MEMBERSHIP: (seq: number) => `/memberships/${seq}`,

  // 시간대
  COMPLEX_TIMESLOTS: '/complex/timeslots',
  COMPLEX_TIMESLOT: (seq: number) => `/complex/timeslots/${seq}`,

  // 환불 요청
  COMPLEX_REFUNDS: '/complex/refunds',
  COMPLEX_REFUND_STATUS: (seq: number) => `/complex/refunds/${seq}/status`,
  COMPLEX_REFUND_REASONS: '/complex/refunds/reasons',
  COMPLEX_REFUND_REASON: (seq: number) => `/complex/refunds/reasons/${seq}`,

  // 연기 요청
  COMPLEX_POSTPONEMENTS: '/complex/postponements',
  COMPLEX_POSTPONEMENT_STATUS: (seq: number) => `/complex/postponements/${seq}/status`,
  COMPLEX_POSTPONEMENT_REASONS: '/complex/postponements/reasons',
  COMPLEX_POSTPONEMENT_REASON: (seq: number) => `/complex/postponements/reasons/${seq}`,
  COMPLEX_POSTPONEMENT_MEMBER_HISTORY: (memberSeq: number) => `/complex/postponements/member/${memberSeq}`,

  // 공개 연기 요청
  PUBLIC_POSTPONEMENT_SEARCH: '/public/postponement/search-member',
  PUBLIC_POSTPONEMENT_SUBMIT: '/public/postponement/submit',
  PUBLIC_POSTPONEMENT_REASONS: '/public/postponement/reasons',

  // 공개 설문 제출
  PUBLIC_SURVEY_SUBMIT: '/public/survey/submit',

  // 공개 환불 요청
  PUBLIC_REFUND_SEARCH: '/public/refund/search-member',
  PUBLIC_REFUND_SUBMIT: '/public/refund/submit',
  PUBLIC_REFUND_REASONS: '/public/refund/reasons',
  PUBLIC_REFUND_SURVEY_SUBMIT: '/public/refund-survey/submit',

  // 공개 멤버십 조회
  PUBLIC_MEMBERSHIP_CHECK: '/public/membership/check',

  // 사용자
  USERS: A.USERS,
  USER: (seq: number) => `${A.USERS}/${seq}`,
  USER_ME_PASSWORD: `${A.USERS}/me/password`,

  // 설정
  SETTINGS_SMS_EVENTS: A.SETTINGS_SMS_EVENTS,
  SETTINGS_SMS_EVENTS_TEMPLATES: `${A.SETTINGS_SMS_EVENTS}/templates`,
  SETTINGS_SMS_EVENTS_SENDERS: `${A.SETTINGS_SMS_EVENTS}/sender-numbers`,

  // 연동
  INTEGRATIONS: A.INTEGRATIONS,
  INTEGRATIONS_SMS_CONFIG: `${A.INTEGRATIONS}/sms-config`,

  // 카카오싱크
  KAKAO_SYNC_URL: `${A.KAKAO_SYNC}/url`,

  // 공지사항
  NOTICES: A.NOTICES,
  NOTICE: (seq: number) => `${A.NOTICES}/${seq}`,

  // 대시보드
  DASHBOARD: A.DASHBOARD,
  DASHBOARD_CALLER_STATS: `${A.DASHBOARD}/caller-stats`,

  // 메시지 템플릿
  MESSAGE_TEMPLATES: A.MESSAGE_TEMPLATES,
  MESSAGE_TEMPLATE: (seq: number) => `${A.MESSAGE_TEMPLATES}/${seq}`,
  MESSAGE_TEMPLATE_SET_DEFAULT: (seq: number) => `${A.MESSAGE_TEMPLATES}/${seq}/set-default`,
  MESSAGE_TEMPLATE_RESOLVE: (seq: number) => `${A.MESSAGE_TEMPLATES}/${seq}/resolve`,
  MESSAGE_TEMPLATE_PLACEHOLDERS: `${A.MESSAGE_TEMPLATES}/placeholders`,

  // 설문
  SURVEY_SUBMISSIONS: '/complex/survey/submissions',
  SURVEY_SUBMISSION: (seq: number) => `/complex/survey/submissions/${seq}`,
  SURVEY_TEMPLATES: '/complex/survey/templates',
  SURVEY_TEMPLATE: (seq: number) => `/complex/survey/templates/${seq}`,
  SURVEY_TEMPLATE_STATUS: (seq: number) => `/complex/survey/templates/${seq}/status`,
  SURVEY_TEMPLATE_COPY: (seq: number) => `/complex/survey/templates/${seq}/copy`,
  SURVEY_SECTIONS: (templateSeq: number) => `/complex/survey/templates/${templateSeq}/sections`,
  SURVEY_SECTION: (templateSeq: number, sectionSeq: number) => `/complex/survey/templates/${templateSeq}/sections/${sectionSeq}`,
  SURVEY_QUESTIONS: (templateSeq: number) => `/complex/survey/templates/${templateSeq}/questions`,
  SURVEY_QUESTION: (templateSeq: number, questionSeq: number) => `/complex/survey/templates/${templateSeq}/questions/${questionSeq}`,
  SURVEY_OPTIONS: (templateSeq: number) => `/complex/survey/templates/${templateSeq}/options`,
  SURVEY_OPTION: (templateSeq: number, optionSeq: number) => `/complex/survey/templates/${templateSeq}/options/${optionSeq}`,

  // 캘린더
  CALENDAR_RESERVATIONS: `${A.CALENDAR}/reservations`,
  CALENDAR_RESERVATION_STATUS: (seq: number) => `${A.CALENDAR}/reservations/${seq}/status`,
  CALENDAR_RESERVATION_DATE: (seq: number) => `${A.CALENDAR}/reservations/${seq}/interview-date`,
  CALENDAR_EVENTS: `${A.CALENDAR}/events`,
  CALENDAR_EVENT: (seq: number) => `${A.CALENDAR}/events/${seq}`,

  // 외부 서비스
  EXTERNAL_SMS_SEND: `${A.EXTERNAL}/sms/send`,
} as const;
