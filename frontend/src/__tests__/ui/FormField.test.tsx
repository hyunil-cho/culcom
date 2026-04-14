import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FormField from '@/components/ui/FormField';

describe('FormField', () => {
  it('라벨을 표시한다', () => {
    render(<FormField label="이름"><input /></FormField>);
    expect(screen.getByText('이름')).toBeInTheDocument();
  });

  it('required이면 * 표시', () => {
    render(<FormField label="이름" required><input /></FormField>);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('required가 아니면 * 미표시', () => {
    const { container } = render(<FormField label="비고"><input /></FormField>);
    expect(container.querySelector('.required')).toBeNull();
  });

  it('children을 렌더링한다', () => {
    render(<FormField label="이름"><input placeholder="입력" /></FormField>);
    expect(screen.getByPlaceholderText('입력')).toBeInTheDocument();
  });

  it('error가 있으면 에러 메시지 표시', () => {
    render(<FormField label="이름" error="필수 입력"><input /></FormField>);
    expect(screen.getByText('필수 입력')).toBeInTheDocument();
  });

  it('error가 없고 hint가 있으면 힌트 표시', () => {
    render(<FormField label="이름" hint="2자 이상"><input /></FormField>);
    expect(screen.getByText('2자 이상')).toBeInTheDocument();
  });

  it('error가 있으면 hint 대신 error 우선 표시', () => {
    render(<FormField label="이름" error="필수" hint="2자 이상"><input /></FormField>);
    expect(screen.getByText('필수')).toBeInTheDocument();
    expect(screen.queryByText('2자 이상')).not.toBeInTheDocument();
  });
});
