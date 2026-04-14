import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSessionStore } from '@/lib/store';
import { queryClient } from '@/lib/queryClient';

vi.mock('@/lib/api', () => ({
  authApi: {
    me: vi.fn().mockResolvedValue({
      success: true,
      data: { userSeq: 1, userId: 'root', role: 'ROOT', selectedBranchSeq: 1 },
    }),
  },
  branchApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      data: [
        { seq: 1, branchName: '강남점', alias: 'gangnam' },
        { seq: 2, branchName: '홍대점', alias: 'hongdae' },
      ],
    }),
  },
}));

describe('useSessionStore', () => {
  beforeEach(() => {
    useSessionStore.setState({ session: null, branches: [], loaded: false });
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('초기 상태', () => {
    const state = useSessionStore.getState();
    expect(state.session).toBeNull();
    expect(state.branches).toEqual([]);
    expect(state.loaded).toBe(false);
  });

  it('fetchSession: 세션과 지점 목록을 로드한다', async () => {
    await useSessionStore.getState().fetchSession();

    const state = useSessionStore.getState();
    expect(state.loaded).toBe(true);
    expect(state.session).not.toBeNull();
    expect(state.session!.userId).toBe('root');
    expect(state.session!.role).toBe('ROOT');
    expect(state.branches).toHaveLength(2);
    expect(state.branches[0].branchName).toBe('강남점');
  });

  it('fetchSession: loaded=true이면 재호출하지 않는다', async () => {
    await useSessionStore.getState().fetchSession();
    const { authApi } = await import('@/lib/api');

    // 두 번째 호출
    await useSessionStore.getState().fetchSession();
    // authApi.me는 처음 한 번만 호출됨 (queryClient 캐시)
    expect(useSessionStore.getState().loaded).toBe(true);
  });

  it('refreshBranches: 지점 목록만 갱신한다', async () => {
    await useSessionStore.getState().fetchSession();
    await useSessionStore.getState().refreshBranches();

    const state = useSessionStore.getState();
    expect(state.branches).toHaveLength(2);
    // queryClient 캐시도 업데이트됨
    const cached = queryClient.getQueryData(['sessionBranches']);
    expect(cached).toBeDefined();
  });

  it('reset: 세션과 캐시를 모두 초기화한다', async () => {
    await useSessionStore.getState().fetchSession();
    expect(useSessionStore.getState().loaded).toBe(true);

    useSessionStore.getState().reset();

    const state = useSessionStore.getState();
    expect(state.session).toBeNull();
    expect(state.branches).toEqual([]);
    expect(state.loaded).toBe(false);
    expect(queryClient.getQueryData(['session'])).toBeUndefined();
    expect(queryClient.getQueryData(['sessionBranches'])).toBeUndefined();
  });
});
