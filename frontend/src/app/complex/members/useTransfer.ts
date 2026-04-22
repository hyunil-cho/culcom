'use client';

import { useCallback, useState } from 'react';
import { transferApi, type TransferRequestItem, type TransferCompleteRequest } from '@/lib/api/transfer';
import { useApiQuery } from '@/hooks/useApiQuery';
import type { MembershipFormData } from './MemberForm';

interface UseTransferOptions {
  setForm: React.Dispatch<React.SetStateAction<MembershipFormData>>;
  setEnabled: (v: boolean) => void;
  emptyForm: MembershipFormData;
}

/**
 * 양도 관련 상태·로직 전담 훅.
 *
 * 관리자가 신규 회원 등록 중 가입 유형을 '양도'로 선택하면, 관리자 최종 '확인'을
 * 받은 양도 요청(멤버십 활성 + 미사용)을 리스트로 받아 직접 선택하게 한다.
 *
 * - mode / setMode — 양도 모드 ON/OFF
 * - transfers — 선택 가능한 양도 요청 목록
 * - selected — 선택된 양도 요청
 * - select(transfer) — 양도 요청 선택 → 멤버십 폼 자동 반영
 * - confirmTransfer(seq) — 양도 확정 API 호출
 * - validate() — 양도 모드일 때 추가 검증
 */
export function useTransfer({
  setForm, setEnabled, emptyForm,
}: UseTransferOptions) {
  const [mode, setModeState] = useState(false);
  const [selected, setSelected] = useState<TransferRequestItem | null>(null);

  // 양도 모드 ON → 선택 가능한 양도 요청 조회 (서버가 지점/상태/활성/미사용 필터 적용)
  const { data: transfersData } = useApiQuery<TransferRequestItem[]>(
    ['transfersSelectable'],
    () => transferApi.listSelectable(),
    { enabled: mode },
  );
  const transfers = transfersData ?? [];

  const setMode = useCallback((on: boolean) => {
    setModeState(on);
    if (!on) {
      setSelected(null);
      setForm(emptyForm);
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

  /** 양도 완료: 양도자 멤버십 비활성화 + 양수자에게 멤버십 이전.
   *  양수자의 양도비 결제 정보(결제수단/결제일/카드 상세)를 함께 전달해 납부 기록에 반영한다.
   *  실패 시 백엔드 메시지를 Error로 던져 호출부가 사용자에게 표시하도록 한다. */
  const confirmTransfer = useCallback(async (memberSeq: number, payment?: TransferCompleteRequest) => {
    if (mode && selected) {
      const res = await transferApi.complete(selected.seq, memberSeq, payment);
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
    confirmTransfer, validate,
  };
}
