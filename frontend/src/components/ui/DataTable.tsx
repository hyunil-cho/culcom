'use client';

import { ReactNode } from 'react';
import { Button } from './Button';

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
              {data.map((item, rowIdx) => (
                <tr
                  key={rowKey(item)}
                  style={{ ...rowStyle?.(item), ...(onRowClick ? { cursor: 'pointer' } : {}) }}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                >
                  {columns.map((col, i) => (
                    <td key={i} style={col.style}>{col.render(item, rowIdx)}</td>
                  ))}
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={columns.length} className="table-empty">{emptyMessage}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showPagination && (
        <div className="pagination">
          <Button variant="secondary" disabled={pagination.page === 0} onClick={() => pagination.onPageChange(pagination.page - 1)}>이전</Button>
          <span className="pagination-info">{pagination.page + 1} / {pagination.totalPages}</span>
          <Button variant="secondary" disabled={pagination.page >= pagination.totalPages - 1} onClick={() => pagination.onPageChange(pagination.page + 1)}>다음</Button>
        </div>
      )}
    </>
  );
}
