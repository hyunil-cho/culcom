import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConsentItemBlock from '@/components/ui/ConsentItemBlock';
import type { ConsentItem } from '@/lib/api';

const mockItem: ConsentItem = {
  seq: 1,
  title: '개인정보 수집 동의',
  content: '개인정보를 수집합니다. 동의하시겠습니까?',
  required: true,
  category: 'SIGNUP',
};

describe('ConsentItemBlock', () => {
  it('제목을 표시한다', () => {
    render(<ConsentItemBlock item={mockItem} agreed={false} onToggle={vi.fn()} />);
    expect(screen.getByText('개인정보 수집 동의')).toBeInTheDocument();
  });

  it('필수 항목이면 (필수) 표시', () => {
    render(<ConsentItemBlock item={mockItem} agreed={false} onToggle={vi.fn()} />);
    expect(screen.getByText('(필수)')).toBeInTheDocument();
  });

  it('선택 항목이면 (필수) 미표시', () => {
    const optionalItem = { ...mockItem, required: false };
    render(<ConsentItemBlock item={optionalItem} agreed={false} onToggle={vi.fn()} />);
    expect(screen.queryByText('(필수)')).not.toBeInTheDocument();
  });

  it('초기에는 내용이 접혀있음', () => {
    render(<ConsentItemBlock item={mockItem} agreed={false} onToggle={vi.fn()} />);
    expect(screen.queryByText(mockItem.content)).not.toBeInTheDocument();
    expect(screen.getByText('펼치기')).toBeInTheDocument();
  });

  it('펼치기 클릭 시 내용 표시', () => {
    render(<ConsentItemBlock item={mockItem} agreed={false} onToggle={vi.fn()} />);
    fireEvent.click(screen.getByText('펼치기'));
    expect(screen.getByText(mockItem.content)).toBeInTheDocument();
    expect(screen.getByText('접기')).toBeInTheDocument();
  });

  it('접기 클릭 시 내용 숨김', () => {
    render(<ConsentItemBlock item={mockItem} agreed={false} onToggle={vi.fn()} />);
    fireEvent.click(screen.getByText('펼치기'));
    fireEvent.click(screen.getByText('접기'));
    expect(screen.queryByText(mockItem.content)).not.toBeInTheDocument();
  });

  it('동의 체크박스 토글', () => {
    const onToggle = vi.fn();
    render(<ConsentItemBlock item={mockItem} agreed={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('agreed=true이면 체크 상태', () => {
    render(<ConsentItemBlock item={mockItem} agreed={true} onToggle={vi.fn()} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('agreed=false이면 미체크 상태', () => {
    render(<ConsentItemBlock item={mockItem} agreed={false} onToggle={vi.fn()} />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
});
