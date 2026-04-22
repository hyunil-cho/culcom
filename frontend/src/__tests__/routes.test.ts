import { describe, it, expect } from 'vitest';
import { ROUTES, API } from '@/lib/routes';

describe('ROUTES - 정적 경로', () => {
  it('ROOT는 "/"', () => {
    expect(ROUTES.ROOT).toBe('/');
  });

  it('LOGIN', () => {
    expect(ROUTES.LOGIN).toBe('/login');
  });

  it('DASHBOARD', () => {
    expect(ROUTES.DASHBOARD).toBe('/dashboard');
  });

  it('COMPLEX 관련 경로가 /complex 하위', () => {
    expect(ROUTES.COMPLEX).toBe('/complex');
    expect(ROUTES.COMPLEX_CLASSES).toBe('/complex/classes');
    expect(ROUTES.COMPLEX_MEMBERS).toBe('/complex/members');
    expect(ROUTES.COMPLEX_STAFFS).toBe('/complex/staffs');
    expect(ROUTES.COMPLEX_ATTENDANCE).toBe('/complex/attendance');
    expect(ROUTES.COMPLEX_MEMBERSHIPS).toBe('/complex/memberships');
    expect(ROUTES.COMPLEX_TIMESLOTS).toBe('/complex/timeslots');
    expect(ROUTES.COMPLEX_POSTPONEMENTS).toBe('/complex/postponements');
    expect(ROUTES.COMPLEX_REFUNDS).toBe('/complex/refunds');
  });
});

describe('ROUTES - 동적 경로 함수', () => {
  it('CUSTOMER_DETAIL(1)', () => {
    expect(ROUTES.CUSTOMER_DETAIL(1)).toBe('/customers/1');
  });

  it('CUSTOMER_EDIT(5)', () => {
    expect(ROUTES.CUSTOMER_EDIT(5)).toBe('/customers/5/edit');
  });

  it('BRANCH_DETAIL(3)', () => {
    expect(ROUTES.BRANCH_DETAIL(3)).toBe('/branches/3');
  });

  it('BRANCH_EDIT(3)', () => {
    expect(ROUTES.BRANCH_EDIT(3)).toBe('/branches/3/edit');
  });

  it('USER_EDIT(10)', () => {
    expect(ROUTES.USER_EDIT(10)).toBe('/users/10/edit');
  });

  it('NOTICE_DETAIL / NOTICE_EDIT', () => {
    expect(ROUTES.NOTICE_DETAIL(7)).toBe('/notices/7');
    expect(ROUTES.NOTICE_EDIT(7)).toBe('/notices/7/edit');
  });

  it('MESSAGE_TEMPLATE_EDIT(2)', () => {
    expect(ROUTES.MESSAGE_TEMPLATE_EDIT(2)).toBe('/message-templates/2/edit');
  });

  it('COMPLEX_CLASS_EDIT(4)', () => {
    expect(ROUTES.COMPLEX_CLASS_EDIT(4)).toBe('/complex/classes/4/edit');
  });

  it('COMPLEX_MEMBER_EDIT(8)', () => {
    expect(ROUTES.COMPLEX_MEMBER_EDIT(8)).toBe('/complex/members/8/edit');
  });

  it('COMPLEX_MEMBERSHIP_EDIT(12)', () => {
    expect(ROUTES.COMPLEX_MEMBERSHIP_EDIT(12)).toBe('/complex/memberships/12/edit');
  });

  it('COMPLEX_TIMESLOT_EDIT(6)', () => {
    expect(ROUTES.COMPLEX_TIMESLOT_EDIT(6)).toBe('/complex/timeslots/6/edit');
  });

  it('COMPLEX_ATTENDANCE_DETAIL(99)', () => {
    expect(ROUTES.COMPLEX_ATTENDANCE_DETAIL(99)).toBe('/complex/attendance/99');
  });

  it('SURVEY_OPTIONS / SURVEY_PREVIEW / SURVEY_FILL', () => {
    expect(ROUTES.SURVEY_OPTIONS(3)).toBe('/survey/3/options');
    expect(ROUTES.SURVEY_PREVIEW(3)).toBe('/survey/3/preview');
    expect(ROUTES.SURVEY_FILL(3)).toBe('/survey/3/fill');
  });

  it('CONSENT_ITEM_EDIT(5)', () => {
    expect(ROUTES.CONSENT_ITEM_EDIT(5)).toBe('/consent-items/5/edit');
  });
});

describe('API - 정적 엔드포인트', () => {
  it('AUTH 관련', () => {
    expect(API.AUTH_LOGIN).toBe('/auth/login');
    expect(API.AUTH_LOGOUT).toBe('/auth/logout');
    expect(API.AUTH_ME).toBe('/auth/me');
  });

  it('BRANCHES', () => {
    expect(API.BRANCHES).toBe('/branches');
  });

  it('CUSTOMERS', () => {
    expect(API.CUSTOMERS).toBe('/customers');
  });

  it('COMPLEX_MEMBERS', () => {
    expect(API.COMPLEX_MEMBERS).toBe('/complex/members');
  });

  it('DASHBOARD', () => {
    expect(API.DASHBOARD).toBe('/dashboard');
  });

  it('EXTERNAL_SMS_SEND', () => {
    expect(API.EXTERNAL_SMS_SEND).toBe('/external/sms/send');
  });
});

describe('API - 동적 엔드포인트 함수', () => {
  it('AUTH_BRANCH(1)', () => {
    expect(API.AUTH_BRANCH(1)).toBe('/auth/branch/1');
  });

  it('BRANCH(5)', () => {
    expect(API.BRANCH(5)).toBe('/branches/5');
  });

  it('CUSTOMER(10)', () => {
    expect(API.CUSTOMER(10)).toBe('/customers/10');
  });

  it('COMPLEX_MEMBER(3)', () => {
    expect(API.COMPLEX_MEMBER(3)).toBe('/complex/members/3');
  });

  it('COMPLEX_CLASS_MEMBERS(2)', () => {
    expect(API.COMPLEX_CLASS_MEMBERS(2)).toBe('/complex/classes/2/members');
  });

  it('COMPLEX_CLASS_MEMBER(2, 5)', () => {
    expect(API.COMPLEX_CLASS_MEMBER(2, 5)).toBe('/complex/classes/2/members/5');
  });

  it('COMPLEX_MEMBER_MEMBERSHIPS(7)', () => {
    expect(API.COMPLEX_MEMBER_MEMBERSHIPS(7)).toBe('/complex/members/7/memberships');
  });

  it('COMPLEX_MEMBER_MEMBERSHIP(7, 3)', () => {
    expect(API.COMPLEX_MEMBER_MEMBERSHIP(7, 3)).toBe('/complex/members/7/memberships/3');
  });

  it('MEMBERSHIP(9)', () => {
    expect(API.MEMBERSHIP(9)).toBe('/memberships/9');
  });

  it('COMPLEX_TIMESLOT(4)', () => {
    expect(API.COMPLEX_TIMESLOT(4)).toBe('/complex/timeslots/4');
  });

  it('COMPLEX_REFUND_STATUS(6)', () => {
    expect(API.COMPLEX_REFUND_STATUS(6)).toBe('/complex/refunds/6/status');
  });

  it('COMPLEX_POSTPONEMENT_STATUS(8)', () => {
    expect(API.COMPLEX_POSTPONEMENT_STATUS(8)).toBe('/complex/postponements/8/status');
  });

  it('NOTICE(11)', () => {
    expect(API.NOTICE(11)).toBe('/notices/11');
  });

  it('MESSAGE_TEMPLATE(2)', () => {
    expect(API.MESSAGE_TEMPLATE(2)).toBe('/message-templates/2');
  });

  it('MESSAGE_TEMPLATE_RESOLVE(2)', () => {
    expect(API.MESSAGE_TEMPLATE_RESOLVE(2)).toBe('/message-templates/2/resolve');
  });

  it('SURVEY_SUBMISSION(15)', () => {
    expect(API.SURVEY_SUBMISSION(15)).toBe('/complex/survey/submissions/15');
  });

  it('SURVEY_TEMPLATE(3)', () => {
    expect(API.SURVEY_TEMPLATE(3)).toBe('/complex/survey/templates/3');
  });

  it('SURVEY_SECTIONS(3)', () => {
    expect(API.SURVEY_SECTIONS(3)).toBe('/complex/survey/templates/3/sections');
  });

  it('SURVEY_QUESTIONS(3)', () => {
    expect(API.SURVEY_QUESTIONS(3)).toBe('/complex/survey/templates/3/questions');
  });

  it('CALENDAR_RESERVATION_STATUS(20)', () => {
    expect(API.CALENDAR_RESERVATION_STATUS(20)).toBe('/calendar/reservations/20/status');
  });
});
