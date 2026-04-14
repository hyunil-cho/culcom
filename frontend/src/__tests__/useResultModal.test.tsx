import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResultModal } from '@/hooks/useResultModal';
import { queryClient } from '@/lib/queryClient';
import type { ApiResponse } from '@/lib/api';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('useResultModal invalidateKeys', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.restoreAllMocks();
  });

  const successResponse: ApiResponse<string> = { success: true, message: '성공', data: 'ok' };
  const failResponse: ApiResponse<string> = { success: false, message: '실패', data: '' as never };

  it('성공 시 지정된 queryKey들이 invalidate된다', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() =>
      useResultModal({ redirectPath: '/list', invalidateKeys: ['notices', 'customers'] }),
    );

    await act(async () => {
      await result.current.run(Promise.resolve(successResponse), '저장 완료');
    });

    expect(invalidateSpy).toHaveBeenCalledTimes(2);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notices'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['customers'] });
  });

  it('실패 시 invalidateQueries가 호출되지 않는다', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() =>
      useResultModal({ redirectPath: '/list', invalidateKeys: ['notices'] }),
    );

    await act(async () => {
      await result.current.run(Promise.resolve(failResponse), '저장 완료');
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('invalidateKeys가 없으면 invalidateQueries가 호출되지 않는다', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() =>
      useResultModal({ redirectPath: '/list' }),
    );

    await act(async () => {
      await result.current.run(Promise.resolve(successResponse), '저장 완료');
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('invalidateKeys가 빈 배열이면 invalidateQueries가 호출되지 않는다', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() =>
      useResultModal({ redirectPath: '/list', invalidateKeys: [] }),
    );

    await act(async () => {
      await result.current.run(Promise.resolve(successResponse), '저장 완료');
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});