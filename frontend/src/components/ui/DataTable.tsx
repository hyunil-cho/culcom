'use client';

import { ReactNode } from 'react';
import { Button } from './Button';
import Spinner from './Spinner';

function pageNumbers(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const pages: number[] = [0];
  const start = Math.max(1, current - 1);
  const end = Math.min(total - 2, current + 1);
  if (start > 1) pages.push(-1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 2) pages.push(-1);
  pages.push(total - 1);
  return pages;
}

export interface Column<T> {
  header: string;
  render: (item: T, index?: number) => ReactNode;
  style?: React.CSSProperties;
}

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (item: T) => string | number;
  /** 테이블 상단 정보 텍스트 (예: "총 10개 지점") */
  headerInfo?: ReactNode;
  /** 테이블 상단 우측 영역 (예: 필터 버튼) */
  headerRight?: ReactNode;
  /** 행별 스타일 */
  rowStyle?: (item: T) => React.CSSProperties | undefined;
  /** 행 클릭 핸들러 */
  onRowClick?: (item: T) => void;
  /** 빈 데이터 메시지 */
  emptyMessage?: string;
  /** 빈 상태 액션 (예: "새 회원 등록" 버튼) */
  emptyAction?: ReactNode;
  /** 데이터 로딩 중 여부 */
  loading?: boolean;
  /** 페이지네이션 (usePagination().paginationProps) */
  pagination?: PaginationProps;
}

export default function DataTable<T>({
  columns,
  data,
  rowKey,
  headerInfo,
  headerRight,
  rowStyle,
  onRowClick,
  emptyMessage = '데이터가 없습니다.',
  emptyAction,
  loading,
  pagination,
}: DataTableProps<T>) {
  const showHeader = headerInfo || headerRight;
  const showPagination = pagination && pagination.totalPages > 1;

  return (
    <>
      <div className="content-card">
        {showHeader && (
          <div className="table-header" style={headerRight ? { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } : undefined}>
            {headerInfo && <div className="table-info">{headerInfo}</div>}
            {headerRight}
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                {columns.map((col, i) => (
                  <th key={i} style={col.style}>{col.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length}>
                    <Spinner message="데이터를 불러오는 중..." />
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="table-empty">
                    <div>{emptyMessage}</div>
                    {emptyAction && <div style={{ marginTop: '0.75rem' }}>{emptyAction}</div>}
                  </td>
                </tr>
              ) : (
                data.map((item, rowIdx) => (
                  <tr
                    key={rowKey(item)}
                    style={{ ...rowStyle?.(item), ...(onRowClick ? { cursor: 'pointer' } : {}) }}
                    onClick={onRowClick ? () => onRowClick(item) : undefined}
                  >
                    {columns.map((col, i) => (
                      <td key={i} style={col.style}>{col.render(item, rowIdx)}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showPagination && (
        <div className="pagination">
          <Button variant="secondary" disabled={pagination.page === 0} onClick={() => pagination.onPageChange(pagination.page - 1)}>이전</Button>
          {pageNumbers(pagination.page, pagination.totalPages).map((p, i) =>
            p === -1 ? <span key={`dot-${i}`} className="pagination-dots">…</span> : (
              <button key={p} className={`pagination-num${p === pagination.page ? ' pagination-num-active' : ''}`}
                onClick={() => pagination.onPageChange(p)}>{p + 1}</button>
            )
          )}
          <Button variant="secondary" disabled={pagination.page >= pagination.totalPages - 1} onClick={() => pagination.onPageChange(pagination.page + 1)}>다음</Button>
        </div>
      )}
    </>
  );
}
