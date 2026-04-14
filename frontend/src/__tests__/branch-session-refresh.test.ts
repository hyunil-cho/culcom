import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSessionStore } from '@/lib/store';
import { queryClient } from '@/lib/queryClient';

// branchApi.list 모킹
vi.mock('@/lib/api', () => {
  const initialBranches = [
    { seq: 1, branchName: '강남점', alias: 'gangnam' },
  ];
  const afterAddBranches = [
    { seq: 1, branchName: '강남점', alias: 'gangnam' },
    { seq: 2, branchName: '홍대점', alias: 'hongdae' },
  ];

  let callCount = 0;

  return {
    authApi: {
      me: vi.fn().mockResolvedValue({
        success: true,
        data: { userSeq: 1, userId: 'root', role: 'ROOT', selectedBranchSeq: 1 },
      }),
    },
    branchApi: {
      list: vi.fn().mockImplementation(() => {
        callCount++;
        // 첫 번째 호출: 기존 1개 지점, 이후: 새 지점 추가된 2개
        const data = callCount <= 1 ? initialBranches : afterAddBranches;
        return Promise.resolve({ success: true, data });
      }),
      create: vi.fn().mockResolvedValue({
        success: true,
        data: { seq: 2, branchName: '홍대점', alias: 'hongdae' },
      }),
    },
  };
});

describe('지점 추가 후 세션 branches 갱신', () => {
  beforeEach(() => {
    // 스토어 초기화
    useSessionStore.setState({ session: null, branches: [], loaded: false });
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('fetchSession으로 초기 지점 1개 로드 → refreshBranches로 2개로 갱신', async () => {
    const store = useSessionStore.getState();

    // 1) 초기 세션 로드
    await store.fetchSession();

    const afterFetch = useSessionStore.getState();
    expect(afterFetch.loaded).toBe(true);
    expect(afterFetch.session).not.toBeNull();
    expect(afterFetch.branches).toHaveLength(1);
    expect(afterFetch.branches[0].branchName).toBe('강남점');

    // 2) 새 지점 추가 후 refreshBranches 호출 (지점 추가 페이지의 플로우)
    await useSessionStore.getState().refreshBranches();

    const afterRefresh = useSessionStore.getState();
    expect(afterRefresh.branches).toHaveLength(2);
    expect(afterRefresh.branches[1].branchName).toBe('홍대점');

    // 3) React Query 캐시도 동기화되었는지 확인
    const cachedBranches = queryClient.getQueryData(['sessionBranches']);
    expect(cachedBranches).toBeDefined();
  });

  it('reset 후 세션과 캐시가 모두 초기화됨', async () => {
    const store = useSessionStore.getState();
    await store.fetchSession();

    expect(useSessionStore.getState().loaded).toBe(true);

    // reset 호출
    useSessionStore.getState().reset();

    const afterReset = useSessionStore.getState();
    expect(afterReset.session).toBeNull();
    expect(afterReset.branches).toHaveLength(0);
    expect(afterReset.loaded).toBe(false);

    // React Query 캐시도 비워졌는지 확인
    expect(queryClient.getQueryData(['session'])).toBeUndefined();
    expect(queryClient.getQueryData(['sessionBranches'])).toBeUndefined();
  });
});
