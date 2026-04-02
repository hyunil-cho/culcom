import { useEffect, useState, useCallback } from 'react';
import { branchApi, messageTemplateApi, Branch, PlaceholderItem } from '@/lib/api';
import { useSessionStore } from '@/lib/store';
import { resolvePlaceholders } from '@/lib/commonUtils';

interface ResolverContext {
  customerName?: string;
  customerPhone?: string;
  interviewDate?: string;
}

/**
 * 메시지 템플릿 플레이스홀더 치환 hook.
 * - 현재 선택된 지점 정보를 서버에서 자동 조회
 * - 플레이스홀더 목록 자동 로드
 * - resolve(content, context) 호출 시 치환된 문자열 반환
 */
export function usePlaceholderResolver() {
  const session = useSessionStore((s) => s.session);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [placeholders, setPlaceholders] = useState<PlaceholderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const promises: Promise<void>[] = [];

    // 지점 정보 조회
    if (session?.selectedBranchSeq) {
      promises.push(
        branchApi.get(session.selectedBranchSeq).then((res) => {
          if (res.success) setBranch(res.data);
        })
      );
    }

    // 플레이스홀더 조회
    promises.push(
      messageTemplateApi.placeholders().then((res) => {
        if (res.success) setPlaceholders(res.data);
      })
    );

    Promise.all(promises).finally(() => setLoading(false));
  }, [session?.selectedBranchSeq]);

  const resolve = useCallback((content: string, context: ResolverContext = {}) => {
    const now = new Date();
    const values: Record<string, string> = {
      '{customer.name}': context.customerName ?? '',
      '{customer.phone_number}': context.customerPhone ?? '',
      '{branch.name}': branch?.branchName ?? '',
      '{branch.address}': branch?.address ?? '',
      '{branch.manager}': branch?.branchManager ?? '',
      '{branch.directions}': branch?.directions ?? '',
      '{system.current_date}': now.toISOString().split('T')[0],
      '{system.current_time}': now.toTimeString().slice(0, 5),
      '{system.current_datetime}': `${now.toISOString().split('T')[0]} ${now.toTimeString().slice(0, 5)}`,
      '{reservation.interview_date}': context.interviewDate ?? '',
      '{reservation.interview_datetime}': context.interviewDate ?? '',
    };
    return resolvePlaceholders(content, placeholders, values);
  }, [branch, placeholders]);

  return { resolve, placeholders, branch, loading };
}
