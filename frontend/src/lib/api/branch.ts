import { api } from './client';
import { API } from '@/lib/routes';

export interface Branch {
  seq: number;
  branchName: string;
  alias: string;
  branchManager?: string;
  address?: string;
  directions?: string;
  createdDate?: string;
}

export const branchApi = {
  list: () => api.get<Branch[]>(API.BRANCHES),
  get: (seq: number) => api.get<Branch>(API.BRANCH(seq)),
  create: (data: Partial<Branch>) => api.post<Branch>(API.BRANCHES, data),
  update: (seq: number, data: Partial<Branch>) => api.put<Branch>(API.BRANCH(seq), data),
  delete: (seq: number) => api.delete<void>(API.BRANCH(seq)),
};
