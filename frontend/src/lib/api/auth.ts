import { api } from './client';
import { API } from '@/lib/routes';

export interface SessionInfo {
  userSeq: number;
  userId: string;
  name: string | null;
  role: string;
  selectedBranchSeq: number | null;
  selectedBranchName: string | null;
  requirePasswordChange: boolean;
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
