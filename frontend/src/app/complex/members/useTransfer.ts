'use client';

import { useCallback, useRef, useState } from 'react';
import { transferApi, type TransferRequestItem } from '@/lib/api/transfer';
import type { Membership, PageResponse } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import type { MembershipFormData } from './MemberForm';

interface UseTransferOptions {
  memberships: Membership[];
  setForm: React.Dispatch<React.SetStateAction<MembershipFormData>>;
  setEnabled: (v: boolean) => void;
  emptyForm: MembershipFormData;
  /** 서버측 필터에 사용할 회원 폼 이름 */
  memberName?: string;
  /** 서버측 필터에 사용할 회원 폼 전화번호 */
  memberPhone?: string;
}

/**
 * 양도 관련 상태·로직 전담 훅.
 *
 * - mode / setMode — 양도 모드 ON/OFF
 * - transfers — 조회된 양도 요청 목록
 * - selected — 선택된 양도 요청
 * - select(transfer) — 양도 요청 선택 → 멤버십 폼 자동 반영
 * - confirmTransfer(seq) — 양도 확정 API 호출
 * - validate() — 양도 모드일 때 추가 검증
 * - checkPending(name, phone) — 이름+전화번호로 대기 양도 자동 감지
 */
export function useTransfer({
  memberships, setForm, setEnabled, emptyForm, memberName, memberPhone,
}: UseTransferOptions) {
  const [mode, setModeState] = useState(false);
  const [manualTransfers, setManualTransfers] = useState<TransferRequestItem[] | null>(null);
  const [selected, setSelected] = useState<TransferRequestItem | null>(null);
  const autoDetectedRef = useRef(false);

  // 양도 모드 ON → 목록 조회 (서버측에서 지점 + 이름/전화 + active 필터 적용)
  // name/phone으로 좁혀진 결과라 결과는 통상 0~수 건 → 첫 페이지만 사용하면 충분
  const filterName = (memberName ?? '').trim();
  const filterPhone = (memberPhone ?? '').trim();
  const { data: queryPage } = useApiQuery<PageResponse<TransferRequestItem>>(
    ['transfers', filterName, filterPhone],
    () => transferApi.list({
      name: filterName || undefined,
      phone: filterPhone || undefined,
      activeOnly: true,
      size: 100,
    }),
    { enabled: mode },
  );
  const queryTransfers = queryPage?.content ?? [];
  const transfers = manualTransfers ?? queryTransfers;

  const setMode = useCallback((on: boolean) => {
    setModeState(on);
    if (!on) {
      setSelected(null);
      setManualTransfers(null);
      setForm(emptyForm);
      autoDetectedRef.current = false;
    }
  }, [setForm, emptyForm]);

  const applyTransfer = useCallback((transfer: TransferRequestItem) => {
    setSelected(transfer);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setForm(prev => ({
      ...prev,
      membershipSeq: String(transfer.membershipSeq),
      price: String(transfer.transferFee),
      expiryDate: transfer.expiryDate ?? '',
      paymentDate: nowStr,
    }));
    setEnabled(true);
  }, [setForm, setEnabled]);

  const select = useCallback((transfer: TransferRequestItem) => {
    // 이미 선택된 항목을 다시 클릭하면 선택 해제
    if (selected?.seq === transfer.seq) {
      setSelected(null);
      setForm(emptyForm);
      return;
    }
    applyTransfer(transfer);
  }, [selected, setForm, emptyForm, applyTransfer]);

  /** 이름+전화번호로 접수 대기 양도 요청을 자동 감지 */
  const checkPending = useCallback(async (name: string, phone: string) => {
    if (!name.trim() || !phone.trim()) return;
    try {
      const res = await transferApi.findPending(name.trim(), phone.trim());
      if (res.data) {
        setModeState(true);
        // 선택 대상과 동일한 조건으로 목록 로드
        const listRes = await transferApi.list({
          name: name.trim(), phone: phone.trim(), activeOnly: true, size: 100,
        });
        setManualTransfers(listRes.data?.content ?? []);
        applyTransfer(res.data);
        autoDetectedRef.current = true;
      }
    } catch {
      // 조회 실패 시 무시 (양도 없는 일반 회원)
    }
  }, [applyTransfer]);

  /** 양도 완료: 양도자 멤버십 비활성화 + 양수자에게 멤버십 이전.
   *  실패 시 백엔드 메시지를 Error로 던져 호출부가 사용자에게 표시하도록 한다. */
  const confirmTransfer = useCallback(async (memberSeq: number) => {
    if (mode && selected) {
      const res = await transferApi.complete(selected.seq, memberSeq);
      if (!res.success) {
        throw new Error(res.message || '양도 완료 처리에 실패했습니다.');
      }
    }
  }, [mode, selected]);

  /** 양도 모드 추가 검증 */
  const validate = useCallback((): string | null => {
    if (mode && !selected) return '양도 요청을 선택하세요.';
    return null;
  }, [mode, selected]);

  return {
    mode, setMode, transfers, selected, select,
    confirmTransfer, validate, checkPending,
    autoDetected: autoDetectedRef.current,
  };
}
