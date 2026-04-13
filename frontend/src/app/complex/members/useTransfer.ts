'use client';

import { useCallback, useRef, useState } from 'react';
import { transferApi, type TransferRequestItem } from '@/lib/api/transfer';
import type { Membership } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import type { MembershipFormData } from './MemberForm';

interface UseTransferOptions {
  memberships: Membership[];
  setForm: React.Dispatch<React.SetStateAction<MembershipFormData>>;
  setEnabled: (v: boolean) => void;
  emptyForm: MembershipFormData;
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
export function useTransfer({ memberships, setForm, setEnabled, emptyForm }: UseTransferOptions) {
  const [mode, setModeState] = useState(false);
  const [manualTransfers, setManualTransfers] = useState<TransferRequestItem[] | null>(null);
  const [selected, setSelected] = useState<TransferRequestItem | null>(null);
  const autoDetectedRef = useRef(false);

  // 양도 모드 ON → 목록 조회
  const { data: queryTransfers = [] } = useApiQuery<TransferRequestItem[]>(
    ['transfers'],
    () => transferApi.list(),
    { enabled: mode },
  );
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
        // 목록도 로드
        const listRes = await transferApi.list();
        setManualTransfers(listRes.data ?? []);
        applyTransfer(res.data);
        autoDetectedRef.current = true;
      }
    } catch {
      // 조회 실패 시 무시 (양도 없는 일반 회원)
    }
  }, [applyTransfer]);

  /** 양도 완료: 양도자 멤버십 비활성화 + 양수자에게 멤버십 이전 */
  const confirmTransfer = useCallback(async (memberSeq: number) => {
    if (mode && selected) {
      await transferApi.complete(selected.seq, memberSeq);
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
