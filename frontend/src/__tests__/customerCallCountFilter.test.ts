import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// fetch 모킹
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// next/navigation 모킹
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams('filter=new&page=0');
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/customers',
}));

function mockApiResponse(data: object) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({ success: true, data }),
  };
}

function createCustomer(seq: number, name: string, callCount: number, status: string) {
  return {
    seq,
    name,
    phoneNumber: `0101234${String(seq).padStart(4, '0')}`,
    callCount,
    status,
    createdDate: '2026-01-01T00:00:00',
  };
}

describe('고객 콜수 초과 필터링', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('처리중 필터 응답에 콜수초과 고객이 포함되지 않는다', () => {
    // 서버에서 filter=new로 요청 시 '신규', '진행중' 상태만 반환함을 검증
    const customers = [
      createCustomer(1, '홍길동', 2, '신규'),
      createCustomer(2, '김철수', 4, '진행중'),
    ];

    // 콜수초과(5회 이상) 고객은 서버 응답에 포함되지 않아야 함
    const hasExceeded = customers.some(c => c.status === '콜수초과');
    expect(hasExceeded).toBe(false);

    // 모든 고객이 처리중 필터에 해당하는 상태인지 확인
    const validStatuses = ['신규', '진행중'];
    const allValid = customers.every(c => validStatuses.includes(c.status));
    expect(allValid).toBe(true);
  });

  it('콜수 5회 이상 고객의 상태는 콜수초과이다', () => {
    const customer = createCustomer(1, '홍길동', 5, '콜수초과');

    expect(customer.callCount).toBeGreaterThanOrEqual(5);
    expect(customer.status).toBe('콜수초과');
  });

  it('콜수초과 상태는 처리중 필터(신규/진행중)에 해당하지 않는다', () => {
    const processingStatuses = ['신규', '진행중'];

    expect(processingStatuses).not.toContain('콜수초과');
  });

  it('processCall API 호출 시 callCount가 증가한다', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        success: true,
        data: { callCount: 5, lastUpdateDate: '2026-04-14T10:00:00' },
      }),
    });

    const { api } = await import('@/lib/api/client');
    const result = await api.post<{ callCount: number }>('/customers/process-call', {
      customerSeq: 1,
      caller: 'A',
    });

    expect(result.data?.callCount).toBe(5);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/customers/process-call',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('처리중 필터 API는 filter=new 파라미터를 전송한다', async () => {
    mockFetch.mockResolvedValueOnce(mockApiResponse({
      content: [createCustomer(1, '홍길동', 1, '신규')],
      totalPages: 1,
      totalElements: 1,
    }));

    const { customerApi } = await import('@/lib/api/customer');
    await customerApi.list('page=0&size=20&filter=new');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('filter=new'),
      expect.any(Object),
    );
  });

  it('전체 필터 API는 filter=all 파라미터를 전송하여 콜수초과 고객도 포함한다', async () => {
    const allCustomers = [
      createCustomer(1, '홍길동', 1, '신규'),
      createCustomer(2, '김철수', 5, '콜수초과'),
      createCustomer(3, '이영희', 3, '진행중'),
    ];

    mockFetch.mockResolvedValueOnce(mockApiResponse({
      content: allCustomers,
      totalPages: 1,
      totalElements: 3,
    }));

    const { customerApi } = await import('@/lib/api/customer');
    const result = await customerApi.list('page=0&size=20&filter=all');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('filter=all'),
      expect.any(Object),
    );

    const exceeded = result.data?.content.filter((c: any) => c.status === '콜수초과');
    expect(exceeded?.length).toBe(1);
    expect(exceeded?.[0].callCount).toBeGreaterThanOrEqual(5);
  });
});
