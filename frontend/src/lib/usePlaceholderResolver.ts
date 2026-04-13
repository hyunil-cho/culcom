import { branchApi, messageTemplateApi, Branch, PlaceholderItem } from '@/lib/api';
import { useSessionStore } from '@/lib/store';
import { resolvePlaceholders, buildPlaceholderValues, PlaceholderContext } from '@/lib/commonUtils';
import { useApiQuery } from '@/hooks/useApiQuery';

/**
 * 플레이스홀더 + 지점 정보를 로드하고, 템플릿 치환 기능을 제공하는 hook.
 * branch/placeholders는 마운트 시 한 번만 로드된다.
 */
export function usePlaceholderResolver() {
  const session = useSessionStore((s) => s.session);
  const branchSeq = session?.selectedBranchSeq;

  const { data: placeholders = [] } = useApiQuery<PlaceholderItem[]>(
    ['placeholders'],
    () => messageTemplateApi.placeholders(),
  );

  const { data: branch = null, isFetched: branchFetched } = useApiQuery<Branch>(
    ['branch', branchSeq],
    () => branchApi.get(branchSeq!),
    { enabled: !!branchSeq },
  );

  const ready = placeholders.length > 0 && (!branchSeq || branchFetched);

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
