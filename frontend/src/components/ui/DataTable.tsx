'use client';

import { ReactNode } from 'react';

export interface Column<T> {
  header: string;
  render: (item: T) => ReactNode;
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
  /** 페이지네이션 */
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
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
  page,
  totalPages,
  onPageChange,
}: DataTableProps<T>) {
  const showHeader = headerInfo || headerRight;
  const showPagination = totalPages !== undefined && totalPages > 1 && page !== undefined && onPageChange;

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
                  <th key={i}>{col.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr
                  key={rowKey(item)}
                  style={{ ...rowStyle?.(item), ...(onRowClick ? { cursor: 'pointer' } : {}) }}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                >
                  {columns.map((col, i) => (
                    <td key={i}>{col.render(item)}</td>
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
          <button className="btn-secondary" disabled={page === 0} onClick={() => onPageChange(page - 1)}>이전</button>
          <span className="pagination-info">{page + 1} / {totalPages}</span>
          <button className="btn-secondary" disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)}>다음</button>
        </div>
      )}
    </>
  );
}
