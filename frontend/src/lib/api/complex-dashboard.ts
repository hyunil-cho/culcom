import { api } from './client';

export interface MembershipAlertItem {
  memberSeq: number;
  memberName: string;
  phoneNumber: string;
  memberMembershipSeq: number;
  membershipName: string | null;
  expiryDate: string | null;
  daysFromToday: number | null;
  totalCount: number | null;
  usedCount: number | null;
  remainingCount: number | null;
}

export interface AutoExpiredItem {
  memberSeq: number;
  memberName: string;
  phoneNumber: string;
  memberMembershipSeq: number;
  reason: string;
  expiredAt: string;
  note: string;
}

export interface MembershipAlertsResponse {
  expiringSoon: MembershipAlertItem[];
  recentlyExpired: MembershipAlertItem[];
  lowRemaining: MembershipAlertItem[];
  autoExpiredToday: AutoExpiredItem[];
  windowDays: number;
  countThreshold: number;
}

export type TrendPeriod = 'day' | 'week' | 'month' | 'year';

export interface TrendItem {
  bucket: string;
  count: number;
}

export interface TrendResponse {
  period: TrendPeriod;
  count: number;
  members: TrendItem[];
  staffs: TrendItem[];
  postponements: TrendItem[];
  refunds: TrendItem[];
  transfers: TrendItem[];
  postponementReturns: TrendItem[];
}

export const complexDashboardApi = {
  membershipAlerts: (windowDays: number, countThreshold: number) =>
    api.get<MembershipAlertsResponse>(`/complex/dashboard/membership-alerts?windowDays=${windowDays}&countThreshold=${countThreshold}`),
  trends: (period: TrendPeriod = 'month', count = 6) =>
    api.get<TrendResponse>(`/complex/dashboard/trends?period=${period}&count=${count}`),
};
