import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DataTable, { type Column } from '@/components/ui/DataTable';

interface TestItem {
  seq: number;
  name: string;
  phone: string;
}

const columns: Column<TestItem>[] = [
  { header: '이름', render: (item) => item.name },
  { header: '전화번호', render: (item) => item.phone },
];

const testData: TestItem[] = [
  { seq: 1, name: '홍길동', phone: '01012345678' },
  { seq: 2, name: '김철수', phone: '01099998888' },
];

describe('DataTable', () => {
  it('헤더를 렌더링한다', () => {
    render(<DataTable columns={columns} data={testData} rowKey={(item) => item.seq} />);
    expect(screen.getByText('이름')).toBeInTheDocument();
    expect(screen.getByText('전화번호')).toBeInTheDocument();
  });

  it('데이터 행을 렌더링한다', () => {
    render(<DataTable columns={columns} data={testData} rowKey={(item) => item.seq} />);
    expect(screen.getByText('홍길동')).toBeInTheDocument();
    expect(screen.getByText('김철수')).toBeInTheDocument();
    expect(screen.getByText('01012345678')).toBeInTheDocument();
  });

  it('데이터가 없으면 빈 메시지 표시', () => {
    render(<DataTable columns={columns} data={[]} rowKey={(item) => item.seq} />);
    expect(screen.getByText('데이터가 없습니다.')).toBeInTheDocument();
  });

  it('커스텀 빈 메시지', () => {
    render(<DataTable columns={columns} data={[]} rowKey={(item) => item.seq} emptyMessage="회원이 없습니다." />);
    expect(screen.getByText('회원이 없습니다.')).toBeInTheDocument();
  });

  it('emptyAction 렌더링', () => {
    render(
      <DataTable columns={columns} data={[]} rowKey={(item) => item.seq}
        emptyAction={<button>회원 등록</button>} />
    );
    expect(screen.getByRole('button', { name: '회원 등록' })).toBeInTheDocument();
  });

  it('loading 시 스피너 표시', () => {
    render(<DataTable columns={columns} data={[]} rowKey={(item) => item.seq} loading />);
    expect(screen.getByText('데이터를 불러오는 중...')).toBeInTheDocument();
  });

  it('상세 버튼 클릭 시 onRowClick 호출', () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} data={testData} rowKey={(item) => item.seq} onRowClick={onRowClick} />);
    // onRowClick가 지정된 경우 DataTable은 각 행에 "상세" 버튼을 노출한다.
    const detailButtons = screen.getAllByRole('button', { name: '상세' });
    fireEvent.click(detailButtons[0]);
    expect(onRowClick).toHaveBeenCalledWith(testData[0]);
  });

  it('headerInfo 표시', () => {
    render(<DataTable columns={columns} data={testData} rowKey={(item) => item.seq} headerInfo="총 2명" />);
    expect(screen.getByText('총 2명')).toBeInTheDocument();
  });

  it('headerRight 표시', () => {
    render(
      <DataTable columns={columns} data={testData} rowKey={(item) => item.seq}
        headerRight={<button>필터</button>} />
    );
    expect(screen.getByRole('button', { name: '필터' })).toBeInTheDocument();
  });

  it('pagination이 totalPages <= 1이면 미표시', () => {
    const { container } = render(
      <DataTable columns={columns} data={testData} rowKey={(item) => item.seq}
        pagination={{ page: 0, totalPages: 1, onPageChange: vi.fn() }} />
    );
    expect(container.querySelector('.pagination')).toBeNull();
  });

  it('pagination이 totalPages > 1이면 표시', () => {
    const { container } = render(
      <DataTable columns={columns} data={testData} rowKey={(item) => item.seq}
        pagination={{ page: 0, totalPages: 3, onPageChange: vi.fn() }} />
    );
    expect(container.querySelector('.pagination')).toBeTruthy();
  });

  it('pagination 이전/다음 버튼', () => {
    const onPageChange = vi.fn();
    render(
      <DataTable columns={columns} data={testData} rowKey={(item) => item.seq}
        pagination={{ page: 1, totalPages: 3, onPageChange }} />
    );
    fireEvent.click(screen.getByRole('button', { name: '이전' }));
    expect(onPageChange).toHaveBeenCalledWith(0);

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('첫 페이지에서 이전 버튼 disabled', () => {
    render(
      <DataTable columns={columns} data={testData} rowKey={(item) => item.seq}
        pagination={{ page: 0, totalPages: 3, onPageChange: vi.fn() }} />
    );
    expect(screen.getByRole('button', { name: '이전' })).toBeDisabled();
  });

  it('마지막 페이지에서 다음 버튼 disabled', () => {
    render(
      <DataTable columns={columns} data={testData} rowKey={(item) => item.seq}
        pagination={{ page: 2, totalPages: 3, onPageChange: vi.fn() }} />
    );
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();
  });
});
