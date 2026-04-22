'use client';

import { ReactNode, useEffect, useState } from 'react';
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
  /** 클라이언트 페이징 (외부 pagination 미지정 시 이 크기로 자동 슬라이스). 기본 20 */
  pageSize?: number;
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
  pageSize = 20,
}: DataTableProps<T>) {
  const showHeader = headerInfo || headerRight;

  const [clientPage, setClientPage] = useState(0);
  const clientTotalPages = Math.ceil(data.length / pageSize);
  useEffect(() => {
    if (clientPage > 0 && clientPage >= clientTotalPages) setClientPage(Math.max(0, clientTotalPages - 1));
  }, [clientPage, clientTotalPages]);

  const effectivePagination: PaginationProps | undefined = pagination ?? (
    clientTotalPages > 1
      ? { page: clientPage, totalPages: clientTotalPages, onPageChange: setClientPage }
      : undefined
  );
  const visibleData = pagination
    ? data
    : (clientTotalPages > 1 ? data.slice(clientPage * pageSize, (clientPage + 1) * pageSize) : data);
  const showPagination = effectivePagination && effectivePagination.totalPages > 1;

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
                  <th key={i} style={{ textAlign: 'center', ...col.style }}>{col.header}</th>
                ))}
                {onRowClick && <th style={{ width: 100, textAlign: 'center' }}>관리</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length + (onRowClick ? 1 : 0)}>
                    <Spinner message="데이터를 불러오는 중..." />
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (onRowClick ? 1 : 0)} className="table-empty">
                    <div>{emptyMessage}</div>
                    {emptyAction && <div style={{ marginTop: '0.75rem' }}>{emptyAction}</div>}
                  </td>
                </tr>
              ) : (
                visibleData.map((item, rowIdx) => {
                  const absoluteIdx = pagination ? rowIdx : (clientTotalPages > 1 ? clientPage * pageSize + rowIdx : rowIdx);
                  return (
                  <tr key={rowKey(item)} style={rowStyle?.(item)}>
                    {columns.map((col, i) => (
                      <td key={i} style={{ textAlign: 'center', ...col.style }}>{col.render(item, absoluteIdx)}</td>
                    ))}
                    {onRowClick && (
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn-inline btn-inline-info"
                          onClick={(e) => { e.stopPropagation(); onRowClick(item); }}
                        >
                          상세
                        </button>
                      </td>
                    )}
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showPagination && effectivePagination && (
        <div className="pagination">
          <Button variant="secondary" disabled={effectivePagination.page === 0} onClick={() => effectivePagination.onPageChange(effectivePagination.page - 1)}>이전</Button>
          {pageNumbers(effectivePagination.page, effectivePagination.totalPages).map((p, i) =>
            p === -1 ? <span key={`dot-${i}`} className="pagination-dots">…</span> : (
              <button key={p} className={`pagination-num${p === effectivePagination.page ? ' pagination-num-active' : ''}`}
                onClick={() => effectivePagination.onPageChange(p)}>{p + 1}</button>
            )
          )}
          <Button variant="secondary" disabled={effectivePagination.page >= effectivePagination.totalPages - 1} onClick={() => effectivePagination.onPageChange(effectivePagination.page + 1)}>다음</Button>
        </div>
      )}
    </>
  );
}
