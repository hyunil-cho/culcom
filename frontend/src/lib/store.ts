import { create } from 'zustand';
import { authApi, branchApi, type Branch, type SessionInfo } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

interface SessionState {
  session: SessionInfo | null;
  branches: Branch[];
  loaded: boolean;
  fetchSession: () => Promise<void>;
  refreshBranches: () => Promise<void>;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  session: null,
  branches: [],
  loaded: false,
  fetchSession: async () => {
    if (get().loaded) return;
    try {
      const [sessionRes, branchRes] = await Promise.all([
        queryClient.fetchQuery({
          queryKey: ['session'],
          queryFn: () => authApi.me(),
          staleTime: Infinity,
        }),
        queryClient.fetchQuery({
          queryKey: ['sessionBranches'],
          queryFn: () => branchApi.list(),
          staleTime: Infinity,
        }),
      ]);
      set({ session: sessionRes.data, branches: branchRes.data, loaded: true });
    } catch {
      set({ loaded: true });
      throw new Error('unauthorized');
    }
  },
  refreshBranches: async () => {
    const res = await branchApi.list();
    set({ branches: res.data });
    queryClient.setQueryData(['sessionBranches'], res);
  },
  reset: () => {
    set({ session: null, branches: [], loaded: false });
    queryClient.removeQueries();
  },
}));
