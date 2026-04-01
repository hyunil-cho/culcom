const API_BASE = '/api';

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
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};

// Auth
export const authApi = {
  login: (userId: string, password: string) =>
    api.post<SessionInfo>('/auth/login', { userId, password }),
  me: () => api.get<SessionInfo>('/auth/me'),
  logout: () => api.post<void>('/auth/logout'),
  selectBranch: (branchSeq: number) => api.post<void>(`/auth/branch/${branchSeq}`),
};

// Types
export interface SessionInfo {
  userSeq: number;
  userId: string;
  selectedBranchSeq: number | null;
  selectedBranchName: string | null;
}

export interface Branch {
  seq: number;
  branchName: string;
  alias: string;
  branchManager?: string;
  address?: string;
  directions?: string;
}

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
}

export interface ComplexClass {
  seq: number;
  name: string;
  description?: string;
  capacity: number;
  sortOrder: number;
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

// API shortcuts
export const branchApi = {
  list: () => api.get<Branch[]>('/branches'),
  get: (seq: number) => api.get<Branch>(`/branches/${seq}`),
  create: (data: Partial<Branch>) => api.post<Branch>('/branches', data),
  update: (seq: number, data: Partial<Branch>) => api.put<Branch>(`/branches/${seq}`, data),
  delete: (seq: number) => api.delete<void>(`/branches/${seq}`),
};

export const customerApi = {
  list: (params?: string) => api.get<PageResponse<Customer>>(`/customers${params ? `?${params}` : ''}`),
  create: (data: Partial<Customer>) => api.post<Customer>('/customers', data),
  update: (seq: number, data: Partial<Customer>) => api.put<Customer>(`/customers/${seq}`, data),
  delete: (seq: number) => api.delete<void>(`/customers/${seq}`),
};

export const classApi = {
  list: () => api.get<ComplexClass[]>('/complex/classes'),
  get: (seq: number) => api.get<ComplexClass>(`/complex/classes/${seq}`),
  create: (data: Partial<ComplexClass>) => api.post<ComplexClass>('/complex/classes', data),
  update: (seq: number, data: Partial<ComplexClass>) => api.put<ComplexClass>(`/complex/classes/${seq}`, data),
  delete: (seq: number) => api.delete<void>(`/complex/classes/${seq}`),
};

export const memberApi = {
  list: (params?: string) => api.get<PageResponse<ComplexMember>>(`/complex/members${params ? `?${params}` : ''}`),
  get: (seq: number) => api.get<ComplexMember>(`/complex/members/${seq}`),
  create: (data: Partial<ComplexMember>) => api.post<ComplexMember>('/complex/members', data),
  update: (seq: number, data: Partial<ComplexMember>) => api.put<ComplexMember>(`/complex/members/${seq}`, data),
  delete: (seq: number) => api.delete<void>(`/complex/members/${seq}`),
};

export const staffApi = {
  list: () => api.get<ComplexStaff[]>('/complex/staffs'),
  get: (seq: number) => api.get<ComplexStaff>(`/complex/staffs/${seq}`),
  create: (data: Partial<ComplexStaff>) => api.post<ComplexStaff>('/complex/staffs', data),
  update: (seq: number, data: Partial<ComplexStaff>) => api.put<ComplexStaff>(`/complex/staffs/${seq}`, data),
  delete: (seq: number) => api.delete<void>(`/complex/staffs/${seq}`),
};
