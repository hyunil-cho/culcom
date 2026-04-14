import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TimePicker from '@/components/ui/TimePicker';

describe('TimePicker', () => {
  it('placeholder를 표시한다', () => {
    render(<TimePicker value="" onChange={vi.fn()} />);
    expect(screen.getByText('시간 선택')).toBeInTheDocument();
  });

  it('커스텀 placeholder', () => {
    render(<TimePicker value="" onChange={vi.fn()} placeholder="시작 시간" />);
    expect(screen.getByText('시작 시간')).toBeInTheDocument();
  });

  it('값이 있으면 HH:mm 형식으로 표시', () => {
    render(<TimePicker value="09:30" onChange={vi.fn()} />);
    expect(screen.getByText('09:30')).toBeInTheDocument();
  });

  it('클릭하면 드롭다운 열림', () => {
    render(<TimePicker value="" onChange={vi.fn()} />);
    fireEvent.click(screen.getByText('시간 선택'));
    expect(screen.getByText('시')).toBeInTheDocument();
    expect(screen.getByText('분')).toBeInTheDocument();
  });

  it('드롭다운에 24시간 옵션', () => {
    render(<TimePicker value="" onChange={vi.fn()} />);
    fireEvent.click(screen.getByText('시간 선택'));
    // 00은 시/분 두 곳에 있으므로 getAllByText
    expect(screen.getAllByText('00')).toHaveLength(2); // 시 00, 분 00
    expect(screen.getByText('23')).toBeInTheDocument();
  });

  it('드롭다운에 5분 단위 옵션', () => {
    render(<TimePicker value="" onChange={vi.fn()} />);
    fireEvent.click(screen.getByText('시간 선택'));
    expect(screen.getByText('55')).toBeInTheDocument();
  });

  it('시간 선택 시 onChange 호출', () => {
    const onChange = vi.fn();
    render(<TimePicker value="" onChange={onChange} />);
    fireEvent.click(screen.getByText('시간 선택'));

    // "09" 시간 클릭 (시 열에서)
    const hourOptions = screen.getAllByText('09');
    fireEvent.click(hourOptions[0]);
    expect(onChange).toHaveBeenCalledWith('09:00');
  });

  it('값이 이미 있을 때 분 선택', () => {
    const onChange = vi.fn();
    render(<TimePicker value="09:00" onChange={onChange} />);
    fireEvent.click(screen.getByText('09:00'));

    // 분에서 30 클릭
    fireEvent.click(screen.getByText('30'));
    expect(onChange).toHaveBeenCalledWith('09:30');
  });
});
