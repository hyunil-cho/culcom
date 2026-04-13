import { api } from './client';
import { API } from '@/lib/routes';

export interface Membership {
  seq: number;
  name: string;
  duration: number;
  count: number;
  price: number;
  transferable: boolean;
  createdDate: string | null;
  lastUpdateDate: string | null;
}

export interface MembershipRequest {
  name: string;
  duration: number;
  count: number;
  price: number;
  transferable: boolean;
}

export const membershipApi = {
  list: () => api.get<Membership[]>(API.MEMBERSHIPS),
  get: (seq: number) => api.get<Membership>(API.MEMBERSHIP(seq)),
  create: (data: MembershipRequest) => api.post<Membership>(API.MEMBERSHIPS, data),
  update: (seq: number, data: MembershipRequest) => api.put<Membership>(API.MEMBERSHIP(seq), data),
  delete: (seq: number) => api.delete<void>(API.MEMBERSHIP(seq)),
};

// ── 공개 멤버십 조회 ──

export interface MembershipCheckMember {
  name: string; phoneNumber: string; branchName: string; level: string | null;
  memberships: MembershipCheckDetail[];
}

export interface MembershipCheckDetail {
  membershipName: string; status: string; startDate: string; expiryDate: string;
  totalCount: number; usedCount: number; postponeTotal: number; postponeUsed: number;
  presentCount: number; absentCount: number; totalAttendance: number; attendanceRate: number;
}

export const publicMembershipApi = {
  check: (name: string, phone: string) =>
    api.get<{ member: MembershipCheckMember | null }>(
      `${API.PUBLIC_MEMBERSHIP_CHECK}?name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}`
    ),
};
