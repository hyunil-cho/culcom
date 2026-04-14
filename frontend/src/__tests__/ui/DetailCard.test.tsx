import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DetailCard from '@/components/ui/DetailCard';

describe('DetailCard', () => {
  it('제목을 렌더링한다', () => {
    render(<DetailCard title="회원 정보" fields={[]} />);
    expect(screen.getByText('회원 정보')).toBeInTheDocument();
  });

  it('필드 목록을 렌더링한다', () => {
    const fields = [
      { label: '이름', value: '홍길동' },
      { label: '전화번호', value: '01012345678' },
    ];
    render(<DetailCard title="정보" fields={fields} />);
    expect(screen.getByText('이름')).toBeInTheDocument();
    expect(screen.getByText('홍길동')).toBeInTheDocument();
    expect(screen.getByText('전화번호')).toBeInTheDocument();
    expect(screen.getByText('01012345678')).toBeInTheDocument();
  });

  it('preWrap 필드는 whiteSpace: pre-wrap 스타일 적용', () => {
    const fields = [{ label: '비고', value: '줄바꿈테스트', preWrap: true }];
    render(<DetailCard title="정보" fields={fields} />);
    const valueEl = screen.getByText('줄바꿈테스트');
    expect(valueEl.style.whiteSpace).toBe('pre-wrap');
  });

  it('preWrap이 아니면 whiteSpace 없음', () => {
    const fields = [{ label: '이름', value: '홍길동' }];
    render(<DetailCard title="정보" fields={fields} />);
    const valueEl = screen.getByText('홍길동');
    expect(valueEl.style.whiteSpace).toBe('');
  });

  it('value가 ReactNode일 수 있다', () => {
    const fields = [{ label: '상태', value: <span data-testid="badge">활성</span> }];
    render(<DetailCard title="정보" fields={fields} />);
    expect(screen.getByTestId('badge')).toBeInTheDocument();
  });

  it('빈 필드 배열이면 본문만 빈 상태', () => {
    const { container } = render(<DetailCard title="정보" fields={[]} />);
    expect(container.querySelectorAll('.detail-row')).toHaveLength(0);
  });
});
