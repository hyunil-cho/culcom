'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { consentItemApi, type ConsentItem } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';

interface UseConsentOptions {
  /** consent item category (예: SIGNUP, TRANSFER, SURVEY 등) */
  category: string;
  /** 외부에서 직접 주입할 동의항목 목록 (API 호출 대신 사용) */
  items?: ConsentItem[];
}

interface UseConsentReturn {
  /** 동의항목 목록 */
  items: ConsentItem[];
  /** 로딩 상태 */
  loading: boolean;
  /** API 호출 실패 메시지 (없으면 null) */
  error: string | null;
  /** 각 항목별 동의 여부 */
  agreements: Map<number, boolean>;
  /** 개별 항목 동의 토글 */
  toggle: (seq: number, value: boolean) => void;
  /** 필수 항목 모두 동의했는지 여부 */
  allRequiredAgreed: boolean;
  /** 필수 항목 미동의 시 false, 모두 동의 시 true */
  validate: () => boolean;
  /** 제출용 동의 데이터 (consentItemSeq, agreed) 배열 */
  toSubmitData: () => { consentItemSeq: number; agreed: boolean }[];
}

export function useConsent({ category, items: externalItems }: UseConsentOptions): UseConsentReturn {
  const [items, setItems] = useState<ConsentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [agreements, setAgreements] = useState<Map<number, boolean>>(new Map());

  // externalItems 참조 안정화: seq 목록 기준으로 실제 변경 여부 판단
  const prevExternalSeqsRef = useRef<string>('');

  const { data: fetchedItems, isLoading: queryLoading, error: queryError } = useApiQuery<ConsentItem[]>(
    ['consentItems', category],
    () => consentItemApi.list(category),
    { enabled: !externalItems },
  );

  const loading = externalItems ? false : queryLoading;

  useEffect(() => {
    if (externalItems) {
      const seqKey = externalItems.map(i => i.seq).join(',');
      if (seqKey === prevExternalSeqsRef.current) return;
      prevExternalSeqsRef.current = seqKey;

      setItems(externalItems);
      setAgreements(new Map(externalItems.map(c => [c.seq, false])));
      setError(null);
      return;
    }

    if (fetchedItems) {
      setItems(fetchedItems);
      setAgreements(new Map(fetchedItems.map(c => [c.seq, false])));
      setError(null);
    } else if (queryError) {
      setError(queryError.message || '동의항목을 불러오지 못했습니다.');
    }
  }, [category, externalItems, fetchedItems, queryError]);

  const toggle = useCallback((seq: number, value: boolean) => {
    setAgreements(prev => new Map(prev).set(seq, value));
  }, []);

  const allRequiredAgreed = useMemo(() => {
    const requiredItems = items.filter(c => c.required);
    return requiredItems.length > 0
      ? requiredItems.every(c => agreements.get(c.seq))
      : true;
  }, [items, agreements]);

  const validate = useCallback((): boolean => {
    return allRequiredAgreed;
  }, [allRequiredAgreed]);

  const toSubmitData = useCallback(() =>
    Array.from(agreements.entries()).map(([seq, agreed]) => ({
      consentItemSeq: seq, agreed,
    })),
  [agreements]);

  return { items, loading, error, agreements, toggle, allRequiredAgreed, validate, toSubmitData };
}
