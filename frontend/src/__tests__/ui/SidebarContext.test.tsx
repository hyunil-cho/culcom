import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SidebarProvider, useSidebar } from '@/components/layout/SidebarContext';

function TestConsumer() {
  const { open, toggle, close } = useSidebar();
  return (
    <div>
      <span data-testid="status">{open ? 'open' : 'closed'}</span>
      <button onClick={toggle}>토글</button>
      <button onClick={close}>닫기</button>
    </div>
  );
}

describe('SidebarContext', () => {
  it('초기 상태는 closed', () => {
    render(
      <SidebarProvider><TestConsumer /></SidebarProvider>
    );
    expect(screen.getByTestId('status').textContent).toBe('closed');
  });

  it('toggle로 열기/닫기 전환', () => {
    render(
      <SidebarProvider><TestConsumer /></SidebarProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: '토글' }));
    expect(screen.getByTestId('status').textContent).toBe('open');

    fireEvent.click(screen.getByRole('button', { name: '토글' }));
    expect(screen.getByTestId('status').textContent).toBe('closed');
  });

  it('close로 닫기', () => {
    render(
      <SidebarProvider><TestConsumer /></SidebarProvider>
    );
    // 먼저 열기
    fireEvent.click(screen.getByRole('button', { name: '토글' }));
    expect(screen.getByTestId('status').textContent).toBe('open');

    // 닫기
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(screen.getByTestId('status').textContent).toBe('closed');
  });

  it('Provider 없이 사용 시 기본값', () => {
    render(<TestConsumer />);
    expect(screen.getByTestId('status').textContent).toBe('closed');
  });
});
