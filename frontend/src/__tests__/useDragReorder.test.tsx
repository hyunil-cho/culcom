import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useRef } from 'react';
import { swapNodes, useDragReorder } from '@/hooks/useDragReorder';

describe('swapNodes (DOM swap)', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  const makeItems = (ids: string[]) => {
    container.innerHTML = '';
    return ids.map(id => {
      const el = document.createElement('div');
      el.dataset.id = id;
      container.appendChild(el);
      return el;
    });
  };

  const ids = () =>
    Array.from(container.children).map(c => (c as HTMLElement).dataset.id);

  it('비인접 노드 두 개를 교환한다 (가운데 노드는 그대로)', () => {
    const [a, , c] = makeItems(['A', 'B', 'C']);
    swapNodes(a, c);
    expect(ids()).toEqual(['C', 'B', 'A']);
  });

  it('a 가 b 바로 앞에 있을 때 교환 (인접, a-b → b-a)', () => {
    const [a, b] = makeItems(['A', 'B']);
    swapNodes(a, b);
    expect(ids()).toEqual(['B', 'A']);
  });

  it('b 가 a 바로 앞에 있을 때 교환 (인접, b-a → a-b)', () => {
    const [, a] = makeItems(['B', 'A']);
    const b = container.children[0] as HTMLElement;
    swapNodes(a, b);
    expect(ids()).toEqual(['A', 'B']);
  });

  it('첫 노드와 마지막 노드를 교환', () => {
    const [first, , , last] = makeItems(['1', '2', '3', '4']);
    swapNodes(first, last);
    expect(ids()).toEqual(['4', '2', '3', '1']);
  });
});

// ── useDragReorder hook 시뮬레이션 ──
function HookHarness({ onReorder }: { onReorder: (ids: (number | string)[], container: HTMLElement) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { start } = useDragReorder({
    itemSelector: '.item',
    getItemId: (el) => el.dataset.id ?? null,
    onReorder,
  });
  return (
    <div ref={containerRef} data-testid="c">
      <div className="item" data-id="A" style={{ width: 100, height: 20 }}
        onPointerDown={(e) => {
          const el = e.currentTarget as HTMLElement;
          start(e, el, el.parentElement!);
        }}>A</div>
      <div className="item" data-id="B" style={{ width: 100, height: 20 }} />
      <div className="item" data-id="C" style={{ width: 100, height: 20 }} />
    </div>
  );
}

describe('useDragReorder — 드래그 → 드롭 시 자리바꿈(swap)', () => {
  it('A 를 드래그해서 C 위에서 놓으면 A 와 C 만 자리가 바뀌고 onReorder 에 스왑된 순서로 전달된다', () => {
    const onReorder = vi.fn();
    const { getByTestId } = render(<HookHarness onReorder={onReorder} />);
    const container = getByTestId('c');
    const [a, b, c] = Array.from(container.querySelectorAll('.item')) as HTMLElement[];

    // 각 아이템의 위치를 가짜로 지정 (jsdom 은 layout 이 없으므로 getBoundingClientRect 를 stub).
    const rects: Record<string, { left: number; right: number; top: number; bottom: number; width: number; height: number }> = {
      A: { left: 0, right: 100, top: 0, bottom: 20, width: 100, height: 20 },
      B: { left: 0, right: 100, top: 20, bottom: 40, width: 100, height: 20 },
      C: { left: 0, right: 100, top: 40, bottom: 60, width: 100, height: 20 },
    };
    for (const el of [a, b, c]) {
      const r = rects[el.dataset.id!];
      el.getBoundingClientRect = () => ({ ...r, x: r.left, y: r.top, toJSON: () => ({}) }) as DOMRect;
    }

    // pointerdown 으로 A 드래그 시작 (clientX/Y 는 A 영역 내)
    act(() => {
      a.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, clientX: 10, clientY: 10, pointerId: 1,
      } as PointerEventInit));
    });

    // 커서를 C 영역으로 이동 → hoverTarget = C
    act(() => {
      document.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true, clientX: 10, clientY: 50, pointerId: 1,
      } as PointerEventInit));
    });

    // 드롭
    act(() => {
      document.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true, clientX: 10, clientY: 50, pointerId: 1,
      } as PointerEventInit));
    });

    expect(onReorder).toHaveBeenCalledTimes(1);
    const [orderedIds] = onReorder.mock.calls[0];
    // A 와 C 만 자리바꿈. B 는 중간에 그대로.
    expect(orderedIds).toEqual(['C', 'B', 'A']);
  });

  it('드롭 대상이 없으면(빈 공간에 드롭) 순서가 유지된다', () => {
    const onReorder = vi.fn();
    const { getByTestId } = render(<HookHarness onReorder={onReorder} />);
    const container = getByTestId('c');
    const [a, b, c] = Array.from(container.querySelectorAll('.item')) as HTMLElement[];

    const rects: Record<string, { left: number; right: number; top: number; bottom: number; width: number; height: number }> = {
      A: { left: 0, right: 100, top: 0, bottom: 20, width: 100, height: 20 },
      B: { left: 0, right: 100, top: 20, bottom: 40, width: 100, height: 20 },
      C: { left: 0, right: 100, top: 40, bottom: 60, width: 100, height: 20 },
    };
    for (const el of [a, b, c]) {
      const r = rects[el.dataset.id!];
      el.getBoundingClientRect = () => ({ ...r, x: r.left, y: r.top, toJSON: () => ({}) }) as DOMRect;
    }

    act(() => {
      a.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, clientX: 10, clientY: 10, pointerId: 1,
      } as PointerEventInit));
    });
    // 아무 아이템 위에도 올라가지 않음 (y=1000 은 모든 아이템 밖)
    act(() => {
      document.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true, clientX: 10, clientY: 1000, pointerId: 1,
      } as PointerEventInit));
    });
    act(() => {
      document.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true, clientX: 10, clientY: 1000, pointerId: 1,
      } as PointerEventInit));
    });

    const [orderedIds] = onReorder.mock.calls[0];
    expect(orderedIds).toEqual(['A', 'B', 'C']);
  });
});
