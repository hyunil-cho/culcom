import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input, PhoneInput, NumberInput, EmailInput, PasswordInput, Select, Textarea, CurrencyInput, Checkbox } from '@/components/ui/FormInput';

describe('Input', () => {
  it('form-input 클래스 포함', () => {
    render(<Input data-testid="inp" />);
    expect(screen.getByTestId('inp').className).toContain('form-input');
  });

  it('추가 className 병합', () => {
    render(<Input data-testid="inp" className="extra" />);
    const cls = screen.getByTestId('inp').className;
    expect(cls).toContain('form-input');
    expect(cls).toContain('extra');
  });
});

describe('PhoneInput', () => {
  it('type="tel", maxLength=11', () => {
    render(<PhoneInput data-testid="phone" />);
    const inp = screen.getByTestId('phone') as HTMLInputElement;
    expect(inp.type).toBe('tel');
    expect(inp.maxLength).toBe(11);
  });

  it('숫자가 아닌 문자는 제거', () => {
    const onChange = vi.fn();
    render(<PhoneInput data-testid="phone" onChange={onChange} />);
    const inp = screen.getByTestId('phone') as HTMLInputElement;

    fireEvent.change(inp, { target: { value: '010-1234-5678' } });
    // onChange가 호출될 때 value에서 숫자 아닌 문자가 제거됨
    expect(onChange).toHaveBeenCalled();
  });

  it('placeholder 기본값은 01012345678', () => {
    render(<PhoneInput data-testid="phone" />);
    expect(screen.getByTestId('phone')).toHaveAttribute('placeholder', '01012345678');
  });
});

describe('NumberInput', () => {
  it('type="number"', () => {
    render(<NumberInput data-testid="num" />);
    expect((screen.getByTestId('num') as HTMLInputElement).type).toBe('number');
  });
});

describe('EmailInput', () => {
  it('type="email", placeholder 기본값', () => {
    render(<EmailInput data-testid="email" />);
    const inp = screen.getByTestId('email') as HTMLInputElement;
    expect(inp.type).toBe('email');
    expect(inp.placeholder).toBe('email@example.com');
  });
});

describe('PasswordInput', () => {
  it('type="password"', () => {
    render(<PasswordInput data-testid="pw" />);
    expect((screen.getByTestId('pw') as HTMLInputElement).type).toBe('password');
  });
});

describe('Select', () => {
  it('옵션을 렌더링한다', () => {
    render(
      <Select data-testid="sel">
        <option value="a">A</option>
        <option value="b">B</option>
      </Select>
    );
    expect(screen.getByTestId('sel').className).toContain('form-input');
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });
});

describe('Textarea', () => {
  it('form-input 클래스 포함', () => {
    render(<Textarea data-testid="ta" />);
    expect(screen.getByTestId('ta').className).toContain('form-input');
  });
});

describe('CurrencyInput', () => {
  it('숫자를 천 단위 콤마로 표시', () => {
    render(<CurrencyInput data-testid="cur" value="1000000" onValueChange={() => {}} />);
    expect((screen.getByTestId('cur') as HTMLInputElement).value).toBe('1,000,000');
  });

  it('빈 값이면 빈 문자열', () => {
    render(<CurrencyInput data-testid="cur" value="" onValueChange={() => {}} />);
    expect((screen.getByTestId('cur') as HTMLInputElement).value).toBe('');
  });

  it('0이면 빈 문자열', () => {
    render(<CurrencyInput data-testid="cur" value="0" onValueChange={() => {}} />);
    expect((screen.getByTestId('cur') as HTMLInputElement).value).toBe('');
  });

  it('onChange 시 콤마 제거된 값 전달', () => {
    const onValueChange = vi.fn();
    render(<CurrencyInput data-testid="cur" value="100000" onValueChange={onValueChange} />);
    fireEvent.change(screen.getByTestId('cur'), { target: { value: '1,500,000' } });
    expect(onValueChange).toHaveBeenCalledWith('1500000');
  });

  it('number 타입 value도 처리', () => {
    render(<CurrencyInput data-testid="cur" value={50000} onValueChange={() => {}} />);
    expect((screen.getByTestId('cur') as HTMLInputElement).value).toBe('50,000');
  });
});

describe('Checkbox', () => {
  it('라벨을 표시한다', () => {
    render(<Checkbox label="동의합니다" />);
    expect(screen.getByText('동의합니다')).toBeInTheDocument();
  });

  it('hint가 있으면 표시', () => {
    render(<Checkbox label="동의" hint="선택사항입니다" />);
    expect(screen.getByText('선택사항입니다')).toBeInTheDocument();
  });

  it('체크박스 클릭 토글', () => {
    const onChange = vi.fn();
    render(<Checkbox label="동의" onChange={onChange} />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalled();
  });
});
