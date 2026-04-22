/**
 * 양도 완료 시 양수자의 양도비 결제정보(결제수단/결제일/카드 상세)가
 * 프론트 폼 → `useTransfer.confirmTransfer` → `transferApi.complete` 의 요청 body로
 * 정상 전달되는지 검증.
 *
 * 회귀 가드: 기존엔 `transferApi.complete(seq, memberSeq)` 만 호출해 결제정보가
 * 완전히 누락되고 있었다 (양수자 납부기록의 method/cardDetail=null).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { TransferRequestItem } from '@/lib/api/transfer';
import type { MembershipFormData } from '@/app/complex/members/memberFormTypes';

const { completeMock, listSelectableMock } = vi.hoisted(() => ({
  completeMock: vi.fn(),
  listSelectableMock: vi.fn(),
}));

vi.mock('@/lib/api/transfer', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/transfer')>('@/lib/api/transfer');
  return {
    ...actual,
    transferApi: {
      ...actual.transferApi,
      listSelectable: (...args: unknown[]) => listSelectableMock(...args),
      complete: (...args: unknown[]) => completeMock(...args),
    },
  };
});

import { useTransfer } from '@/app/complex/members/useTransfer';

const EMPTY_FORM: MembershipFormData = {
  membershipSeq: '', startDate: '', expiryDate: '', price: '',
  paymentDate: '', depositAmount: '', paymentMethod: '',
  status: '활성',
  cardDetail: { cardCompany: '', cardNumber: '', cardApprovalDate: '', cardApprovalNumber: '' },
};

const fakeTransfer: TransferRequestItem = {
  seq: 42,
  memberMembershipSeq: 100,
  membershipSeq: 10,
  membershipName: '3개월권',
  expiryDate: '2026-07-01',
  fromMemberSeq: 50,
  fromMemberName: '양도자A',
  fromMemberPhone: '01011111111',
  status: '확인',
  transferFee: 30000,
  remainingCount: 26,
  token: 'tok',
  inviteToken: null,
  toCustomerSeq: 77,
  toCustomerName: '양수자B',
  toCustomerPhone: '01022222222',
  adminMessage: null,
  referenced: false,
  createdDate: '2026-04-18T10:00:00',
};

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function renderTransferHook() {
  return renderHook(() => useTransfer({
    setForm: vi.fn(),
    setEnabled: vi.fn(),
    emptyForm: EMPTY_FORM,
  }), { wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  listSelectableMock.mockResolvedValue({ success: true, data: [fakeTransfer] });
  completeMock.mockResolvedValue({ success: true, data: fakeTransfer });
});

describe('useTransfer.confirmTransfer — 결제정보 전달', () => {
  it('결제정보 없이 호출되면 complete 에 undefined(또는 없음)가 전달된다', async () => {
    const { result } = renderTransferHook();
    act(() => result.current.setMode(true));
    act(() => result.current.select(fakeTransfer));

    await act(async () => {
      await result.current.confirmTransfer(99);
    });

    expect(completeMock).toHaveBeenCalledTimes(1);
    const [seq, memberSeq, payment] = completeMock.mock.calls[0];
    expect(seq).toBe(42);
    expect(memberSeq).toBe(99);
    expect(payment).toBeUndefined();
  });

  it('결제수단/결제일이 complete 요청 body 에 그대로 실려 전달된다', async () => {
    const { result } = renderTransferHook();
    act(() => result.current.setMode(true));
    act(() => result.current.select(fakeTransfer));

    await act(async () => {
      await result.current.confirmTransfer(99, {
        paymentMethod: '현금',
        paymentDate: '2026-04-22T15:30',
      });
    });

    expect(completeMock).toHaveBeenCalledWith(42, 99, {
      paymentMethod: '현금',
      paymentDate: '2026-04-22T15:30',
    });
  });

  it('카드 결제 시 카드 상세가 complete 요청 body 에 함께 전달된다', async () => {
    const { result } = renderTransferHook();
    act(() => result.current.setMode(true));
    act(() => result.current.select(fakeTransfer));

    const cardDetail = {
      cardCompany: '삼성',
      cardNumber: '12345678',
      cardApprovalDate: '2026-04-22',
      cardApprovalNumber: 'A12345',
    };

    await act(async () => {
      await result.current.confirmTransfer(99, {
        paymentMethod: '카드',
        paymentDate: '2026-04-22T15:30',
        cardDetail,
      });
    });

    expect(completeMock).toHaveBeenCalledWith(42, 99, {
      paymentMethod: '카드',
      paymentDate: '2026-04-22T15:30',
      cardDetail,
    });
  });

  it('양도 모드가 off 이거나 selected 가 없으면 complete 가 호출되지 않는다', async () => {
    const { result } = renderTransferHook();

    // mode off 인 상태에서 호출
    await act(async () => {
      await result.current.confirmTransfer(99, { paymentMethod: '현금' });
    });
    expect(completeMock).not.toHaveBeenCalled();

    // mode on, selected 없음
    act(() => result.current.setMode(true));
    await act(async () => {
      await result.current.confirmTransfer(99, { paymentMethod: '현금' });
    });
    expect(completeMock).not.toHaveBeenCalled();
  });

  it('complete 가 실패 응답을 주면 서버 메시지로 Error 를 던진다', async () => {
    completeMock.mockResolvedValueOnce({ success: false, message: '미수금이 있어 양도를 완료할 수 없습니다.' });
    const { result } = renderTransferHook();
    act(() => result.current.setMode(true));
    act(() => result.current.select(fakeTransfer));

    await expect(
      result.current.confirmTransfer(99, { paymentMethod: '현금' }),
    ).rejects.toThrow('미수금이 있어 양도를 완료할 수 없습니다.');
  });

  it('양도 요청 선택 시 멤버십/양수비/만료일/납부일이 폼에 자동 반영된다', async () => {
    const setForm = vi.fn();
    const setEnabled = vi.fn();
    const { result } = renderHook(() => useTransfer({
      setForm, setEnabled, emptyForm: EMPTY_FORM,
    }), { wrapper });

    act(() => result.current.setMode(true));
    act(() => result.current.select(fakeTransfer));

    // setForm 이 updater 함수로 호출되었고, 양도 정보가 채워진다
    expect(setForm).toHaveBeenCalled();
    const updater = setForm.mock.calls[setForm.mock.calls.length - 1][0] as
      (prev: MembershipFormData) => MembershipFormData;
    const next = updater(EMPTY_FORM);
    expect(next.membershipSeq).toBe('10');
    expect(next.price).toBe('30000'); // 양도비
    expect(next.expiryDate).toBe('2026-07-01');
    expect(next.paymentDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(setEnabled).toHaveBeenCalledWith(true);
  });
});

describe('transferApi.complete — 리스트 서버 필터 연동', () => {
  it('양도 모드 ON 시 listSelectable 호출로 선택 가능한 양도 목록을 조회한다', async () => {
    const { result } = renderTransferHook();
    act(() => result.current.setMode(true));

    await waitFor(() => {
      expect(listSelectableMock).toHaveBeenCalled();
      expect(result.current.transfers).toEqual([fakeTransfer]);
    });
  });
});
