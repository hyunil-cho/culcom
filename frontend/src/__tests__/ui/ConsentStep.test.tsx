import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConsentStep from '@/components/ui/ConsentStep';

// useConsent 반환값 모킹
function mockConsent(overrides: Record<string, any> = {}) {
  return {
    items: [
      { seq: 1, title: '개인정보 수집', content: '내용1', required: true, category: '개인정보', version: 1 },
      { seq: 2, title: '마케팅 수신', content: '내용2', required: false, category: '마케팅', version: 1 },
    ],
    loading: false,
    error: null,
    agreements: new Map([[1, false], [2, false]]),
    toggle: vi.fn(),
    allRequiredAgreed: false,
    validate: vi.fn(() => false),
    toSubmitData: vi.fn(() => [
      { consentItemSeq: 1, agreed: true },
      { consentItemSeq: 2, agreed: false },
    ]),
    ...overrides,
  } as any;
}

describe('ConsentStep', () => {
  it('동의항목 목록을 렌더링한다', () => {
    render(<ConsentStep consent={mockConsent()} onNext={vi.fn()} />);
    expect(screen.getByText('개인정보 수집')).toBeInTheDocument();
    expect(screen.getByText('마케팅 수신')).toBeInTheDocument();
  });

  it('description이 있으면 안내 문구 표시', () => {
    render(<ConsentStep consent={mockConsent()} onNext={vi.fn()} description="아래 항목에 동의해주세요." />);
    expect(screen.getByText('아래 항목에 동의해주세요.')).toBeInTheDocument();
  });

  it('항목이 없으면 빈 메시지 표시', () => {
    render(<ConsentStep consent={mockConsent({ items: [] })} onNext={vi.fn()} />);
    expect(screen.getByText('등록된 동의항목이 없습니다.')).toBeInTheDocument();
  });

  it('커스텀 빈 메시지', () => {
    render(<ConsentStep consent={mockConsent({ items: [] })} onNext={vi.fn()} emptyMessage="항목 없음" />);
    expect(screen.getByText('항목 없음')).toBeInTheDocument();
  });

  it('로딩 중이면 로딩 표시', () => {
    render(<ConsentStep consent={mockConsent({ loading: true })} onNext={vi.fn()} />);
    expect(screen.getByText('로딩 중...')).toBeInTheDocument();
  });

  it('에러 시 에러 메시지 표시', () => {
    render(<ConsentStep consent={mockConsent({ error: '불러오기 실패' })} onNext={vi.fn()} />);
    expect(screen.getByText('불러오기 실패')).toBeInTheDocument();
  });

  it('필수 동의가 안되면 버튼 비활성화', () => {
    render(<ConsentStep consent={mockConsent({ allRequiredAgreed: false })} onNext={vi.fn()} />);
    expect(screen.getByRole('button', { name: '동의하고 계속하기' })).toBeDisabled();
  });

  it('필수 동의 완료 시 버튼 활성화', () => {
    render(<ConsentStep consent={mockConsent({ allRequiredAgreed: true })} onNext={vi.fn()} />);
    expect(screen.getByRole('button', { name: '동의하고 계속하기' })).not.toBeDisabled();
  });

  it('커스텀 버튼 텍스트', () => {
    render(<ConsentStep consent={mockConsent()} onNext={vi.fn()} buttonText="다음" />);
    expect(screen.getByRole('button', { name: '다음' })).toBeInTheDocument();
  });

  it('validate 성공 시 onNext 호출', () => {
    const onNext = vi.fn();
    const consent = mockConsent({ allRequiredAgreed: true, validate: vi.fn(() => true) });

    render(<ConsentStep consent={consent} onNext={onNext} />);
    fireEvent.click(screen.getByRole('button', { name: '동의하고 계속하기' }));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('validate 실패 시 alert 표시', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const onNext = vi.fn();
    const consent = mockConsent({ allRequiredAgreed: true, validate: vi.fn(() => false) });

    render(<ConsentStep consent={consent} onNext={onNext} />);
    fireEvent.click(screen.getByRole('button', { name: '동의하고 계속하기' }));
    expect(alertSpy).toHaveBeenCalledWith('필수 동의항목에 모두 동의해주세요.');
    expect(onNext).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
