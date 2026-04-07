'use client';

import { useEffect, useRef } from 'react';

interface Options {
  /** 드래그 대상 요소를 찾기 위한 셀렉터 (컨테이너 내) */
  itemSelector: string;
  /** 각 아이템에서 식별자를 추출 (보통 data-* 속성) */
  getItemId: (el: HTMLElement) => number | string | null;
  /** 정렬 종료 시 호출. 새 순서대로 id 배열과 컨테이너 요소 전달 */
  onReorder: (orderedIds: (number | string)[], container: HTMLElement) => void;
}

interface DragState {
  el: HTMLElement;
  container: HTMLElement;
  clone: HTMLElement;
  offsetX: number;
  offsetY: number;
}

export function useDragReorder({ itemSelector, getItemId, onReorder }: Options) {
  const dragRef = useRef<DragState | null>(null);

  const start = (e: React.PointerEvent, item: HTMLElement, container: HTMLElement) => {
    if ((e.target as HTMLElement).closest('button, a, input')) return;
    e.preventDefault();
    const rect = item.getBoundingClientRect();
    const clone = item.cloneNode(true) as HTMLElement;
    clone.style.cssText = `position:fixed;pointer-events:none;z-index:10000;opacity:0.9;box-shadow:0 12px 32px rgba(74,144,226,0.3);border-radius:8px;transform:rotate(2deg);width:${rect.width}px;height:${rect.height}px;left:${rect.left}px;top:${rect.top}px;overflow:hidden;`;
    document.body.appendChild(clone);
    item.style.opacity = '0.3';
    item.style.border = '2px dashed #4a90e2';
    dragRef.current = { el: item, container, clone, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
    document.body.style.cursor = 'grabbing';
  };

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      e.preventDefault();
      const { clone, offsetX, offsetY, container, el } = dragRef.current;
      clone.style.left = (e.clientX - offsetX) + 'px';
      clone.style.top = (e.clientY - offsetY) + 'px';
      const siblings = Array.from(container.querySelectorAll(itemSelector)) as HTMLElement[];
      for (const sib of siblings) {
        if (sib === el) continue;
        const r = sib.getBoundingClientRect();
        if (e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom) {
          if (e.clientX < r.left + r.width / 2) container.insertBefore(el, sib);
          else container.insertBefore(el, sib.nextSibling);
          break;
        }
      }
    };
    const handleUp = () => {
      if (!dragRef.current) return;
      const { el, clone, container } = dragRef.current;
      clone.remove();
      el.style.opacity = '';
      el.style.border = '';
      document.body.style.cursor = '';
      const ids: (number | string)[] = [];
      container.querySelectorAll(itemSelector).forEach((node) => {
        const id = getItemId(node as HTMLElement);
        if (id != null) ids.push(id);
      });
      if (ids.length > 0) onReorder(ids, container);
      dragRef.current = null;
    };
    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
    return () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
    };
  }, [itemSelector, getItemId, onReorder]);

  return { start };
}
