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
} as const;

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',

  // 고객 관리
  CUSTOMERS: R.CUSTOMERS,
  CUSTOMERS_ADD: `${R.CUSTOMERS}/add`,

  // 지점 관리
  BRANCHES: R.BRANCHES,
  BRANCHES_ADD: `${R.BRANCHES}/add`,
  BRANCH_DETAIL: (seq: number) => `${R.BRANCHES}/${seq}`,
  BRANCH_EDIT: (seq: number) => `${R.BRANCHES}/${seq}/edit`,

  // 사용자 관리
  USERS: R.USERS,
  USERS_CREATE: `${R.USERS}/create`,

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
  SETTINGS_RESERVATION_SMS: `${R.SETTINGS}/reservation-sms`,

  // 복합시설
  COMPLEX_CLASSES: `${R.COMPLEX}/classes`,
  COMPLEX_MEMBERS: `${R.COMPLEX}/members`,
  COMPLEX_STAFFS: `${R.COMPLEX}/staffs`,
  COMPLEX_ATTENDANCE: `${R.COMPLEX}/attendance`,
  COMPLEX_MEMBERSHIPS: `${R.COMPLEX}/memberships`,
  COMPLEX_TIMESLOTS: `${R.COMPLEX}/timeslots`,
  COMPLEX_POSTPONEMENTS: `${R.COMPLEX}/postponements`,
  COMPLEX_REFUNDS: `${R.COMPLEX}/refunds`,
  COMPLEX_SURVEY: `${R.COMPLEX}/survey`,
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
  SETTINGS_RESERVATION_SMS: '/settings/reservation-sms',
  INTEGRATIONS: '/integrations',
  KAKAO_SYNC: '/kakao-sync',
  NOTICES: '/notices',
  DASHBOARD: '/dashboard',
  MESSAGE_TEMPLATES: '/message-templates',
  EXTERNAL: '/external',
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
  COMPLEX_MEMBERS: A.COMPLEX_MEMBERS,
  COMPLEX_MEMBER: (seq: number) => `${A.COMPLEX_MEMBERS}/${seq}`,
  COMPLEX_STAFFS: A.COMPLEX_STAFFS,
  COMPLEX_STAFF: (seq: number) => `${A.COMPLEX_STAFFS}/${seq}`,

  // 사용자
  USERS: A.USERS,
  USER: (seq: number) => `${A.USERS}/${seq}`,

  // 설정
  SETTINGS_RESERVATION_SMS: A.SETTINGS_RESERVATION_SMS,
  SETTINGS_RESERVATION_SMS_TEMPLATES: `${A.SETTINGS_RESERVATION_SMS}/templates`,
  SETTINGS_RESERVATION_SMS_SENDERS: `${A.SETTINGS_RESERVATION_SMS}/sender-numbers`,

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
  MESSAGE_TEMPLATE_PLACEHOLDERS: `${A.MESSAGE_TEMPLATES}/placeholders`,

  // 외부 서비스
  EXTERNAL_SMS_SEND: `${A.EXTERNAL}/sms/send`,
  EXTERNAL_CALENDAR_CREATE: `${A.EXTERNAL}/calendar/create-event`,
} as const;
