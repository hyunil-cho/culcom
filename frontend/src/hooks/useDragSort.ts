'use client';

import { useCallback, useRef } from 'react';

/**
 * HTML5 드래그앤드롭으로 리스트 아이템 순서 변경을 위한 훅.
 *
 * @param getId - 아이템에서 고유 식별자를 추출하는 함수
 * @param onReorder - from→to 이동 후 새 배열을 받는 콜백
 */
export function useDragSort<T>(
  getId: (item: T) => string | number,
  onReorder: (reordered: T[]) => void,
) {
  const dragFrom = useRef<string | number | null>(null);
  const dragTo = useRef<string | number | null>(null);

  const onDragStart = useCallback((item: T) => {
    dragFrom.current = getId(item);
  }, [getId]);

  const onDragOver = useCallback((e: React.DragEvent, item: T) => {
    e.preventDefault();
    dragTo.current = getId(item);
  }, [getId]);

  const onDrop = useCallback((e: React.DragEvent, items: T[]) => {
    e.preventDefault();
    if (dragFrom.current == null || dragTo.current == null) return;
    if (dragFrom.current === dragTo.current) return;
    const arr = [...items];
    const fromIdx = arr.findIndex(i => getId(i) === dragFrom.current);
    const toIdx = arr.findIndex(i => getId(i) === dragTo.current);
    dragFrom.current = null;
    dragTo.current = null;
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    onReorder(arr);
  }, [getId, onReorder]);

  return { onDragStart, onDragOver, onDrop };
}
