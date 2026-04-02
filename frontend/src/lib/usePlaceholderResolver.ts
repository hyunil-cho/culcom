import { useEffect, useState } from 'react';
import { branchApi, messageTemplateApi, Branch, PlaceholderItem } from '@/lib/api';
import { useSessionStore } from '@/lib/store';
import { resolvePlaceholders, buildPlaceholderValues, PlaceholderContext } from '@/lib/commonUtils';

/**
 * 플레이스홀더 + 지점 정보를 로드하고, 템플릿 치환 기능을 제공하는 hook.
 * branch/placeholders는 마운트 시 한 번만 로드된다.
 */
export function usePlaceholderResolver() {
  const session = useSessionStore((s) => s.session);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [placeholders, setPlaceholders] = useState<PlaceholderItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const promises: Promise<void>[] = [
      messageTemplateApi.placeholders().then((res) => {
        if (res.success) setPlaceholders(res.data);
      }),
    ];

    if (session?.selectedBranchSeq) {
      promises.push(
        branchApi.get(session.selectedBranchSeq).then((res) => {
          if (res.success) setBranch(res.data);
        })
      );
    }

    Promise.all(promises).then(() => setReady(true));
  }, [session?.selectedBranchSeq]);

  /** 템플릿 내용을 컨텍스트 기반으로 치환한다. */
  const resolve = (content: string, ctx: PlaceholderContext) => {
    const fullCtx: PlaceholderContext = {
      ...ctx,
      branchName: ctx.branchName ?? branch?.branchName,
      branchAddress: ctx.branchAddress ?? branch?.address,
      branchManager: ctx.branchManager ?? branch?.branchManager,
      branchDirections: ctx.branchDirections ?? branch?.directions,
    };
    return resolvePlaceholders(content, placeholders, buildPlaceholderValues(fullCtx));
  };

  return { placeholders, branch, ready, resolve };
}
