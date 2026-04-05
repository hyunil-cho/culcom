'use client';

import { useEffect, useState, useCallback } from 'react';
import { attendanceViewApi, type AttendanceHistoryDetail, type PageResponse } from '@/lib/api';

interface AttendanceHistoryModalProps {
  seq: number;
  name: string;
  type: 'member' | 'staff';
  onClose: () => void;
}

const PAGE_SIZE = 20;

export default function AttendanceHistoryModal({ seq, name, type, onClose }: AttendanceHistoryModalProps) {
  const [data, setData] = useState<AttendanceHistoryDetail[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const fetcher = type === 'staff' ? attendanceViewApi.staffHistory : attendanceViewApi.memberHistory;
    const res = await fetcher(seq, page, PAGE_SIZE);
    if (res.success) {
      const d = res.data as PageResponse<AttendanceHistoryDetail>;
      setData(d.content);
      setTotalPages(d.totalPages);
      setTotalElements(d.totalElements);
    }
    setLoading(false);
  }, [seq, type, page]);

  useEffect(() => { load(); }, [load]);

  const statusBadge = (status: string) => {
    if (status === '출석') return { background: '#d4edda', color: '#155724' };
    if (status === '결석') return { background: '#f8d7da', color: '#721c24' };
    return { background: '#fff3cd', color: '#856404' };
  };

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 12, width: '90%', maxWidth: 640,
        maxHeight: '85vh', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* 헤더 */}
        <div style={{
          padding: '1rem 1.5rem', background: '#4a90e2', color: '#fff',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>
            {name} - 수업 참여 기록 ({totalElements}건)
          </h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer',
          }}>&times;</button>
        </div>

        {/* 본문 */}
        <div style={{ padding: '12px 16px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>불러오는 중...</div>
          ) : data.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>수업 참여 기록이 없습니다.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                  <th style={thStyle}>날짜</th>
                  <th style={thStyle}>수업</th>
                  <th style={thStyle}>상태</th>
                  {type === 'member' && <th style={thStyle}>비고</th>}
                </tr>
              </thead>
              <tbody>
                {data.map(row => (
                  <tr key={row.seq} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={tdStyle}>{row.attendanceDate}</td>
                    <td style={tdStyle}>{row.className}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 10px', borderRadius: 12,
                        fontSize: '0.78rem', fontWeight: 600, ...statusBadge(row.status),
                      }}>
                        {row.status}
                      </span>
                    </td>
                    {type === 'member' && <td style={{ ...tdStyle, color: '#888' }}>{row.note || '-'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 페이징 + 닫기 */}
        <div style={{
          padding: '0.75rem 1.5rem', borderTop: '1px solid #e0e0e0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {totalPages > 1 ? (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                style={pageBtnStyle(page === 0)}>&laquo; 이전</button>
              <span style={{ fontSize: '0.85rem', color: '#666', margin: '0 8px' }}>
                {page + 1} / {totalPages}
              </span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                style={pageBtnStyle(page >= totalPages - 1)}>다음 &raquo;</button>
            </div>
          ) : <div />}
          <button onClick={onClose} style={{
            padding: '8px 20px', border: '1px solid #ccc', borderRadius: 6,
            background: '#fff', cursor: 'pointer',
          }}>닫기</button>
        </div>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '10px 8px', fontWeight: 700, color: '#555',
};
const tdStyle: React.CSSProperties = {
  padding: '10px 8px', verticalAlign: 'middle',
};
const pageBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '6px 14px', border: '1px solid #ccc', borderRadius: 6,
  background: disabled ? '#f5f5f5' : '#fff', color: disabled ? '#bbb' : '#333',
  cursor: disabled ? 'default' : 'pointer', fontSize: '0.82rem',
});
