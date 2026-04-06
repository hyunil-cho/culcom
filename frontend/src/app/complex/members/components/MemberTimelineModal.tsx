'use client';

import { useEffect, useState, useCallback } from 'react';
import { memberApi, staffApi, type MemberActivityTimelineItem, type PageResponse } from '@/lib/api';
import s from './MemberTimelineModal.module.css';

interface Props {
  memberSeq: number;
  memberName: string;
  type?: 'member' | 'staff';
  onClose: () => void;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  MEMBERSHIP:          { label: '멤버십',   color: '#4338ca', bg: '#eef2ff' },
  POSTPONEMENT:        { label: '연기요청', color: '#92400e', bg: '#fef3c7' },
  POSTPONEMENT_RESULT: { label: '연기처리', color: '#78350f', bg: '#fde68a' },
  REFUND:              { label: '환불요청', color: '#991b1b', bg: '#fef2f2' },
  REFUND_RESULT:       { label: '환불처리', color: '#7f1d1d', bg: '#fecaca' },
  ATTENDANCE:          { label: '출석',     color: '#065f46', bg: '#ecfdf5' },
  STAFF_REGISTER:      { label: '등록',     color: '#1e40af', bg: '#dbeafe' },
  STATUS_CHANGE:       { label: '상태변경', color: '#7c3aed', bg: '#ede9fe' },
  INFO_CHANGE:         { label: '정보변경', color: '#0369a1', bg: '#e0f2fe' },
  REFUND_CHANGE:       { label: '환불정보', color: '#b45309', bg: '#fef3c7' },
};

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  '출석': { color: '#155724', bg: '#d4edda' },
  '결석': { color: '#721c24', bg: '#f8d7da' },
  '연기': { color: '#856404', bg: '#fff3cd' },
  '활성': { color: '#065f46', bg: '#dcfce7' },
  '만료': { color: '#6b7280', bg: '#f3f4f6' },
  '환불': { color: '#991b1b', bg: '#fee2e2' },
  '대기': { color: '#4f46e5', bg: '#eef2ff' },
  '승인': { color: '#065f46', bg: '#ecfdf5' },
  '반려': { color: '#991b1b', bg: '#fef2f2' },
  '변경': { color: '#0369a1', bg: '#e0f2fe' },
};

const PAGE_SIZE = 20;

export default function MemberTimelineModal({ memberSeq, memberName, type = 'member', onClose }: Props) {
  const [items, setItems] = useState<MemberActivityTimelineItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const fetcher = type === 'staff' ? staffApi.timeline : memberApi.timeline;
    const res = await fetcher(memberSeq, page, PAGE_SIZE);
    if (res.success) {
      const d = res.data as PageResponse<MemberActivityTimelineItem>;
      setItems(d.content);
      setTotalPages(d.totalPages);
      setTotalElements(d.totalElements);
    }
    setLoading(false);
  }, [memberSeq, type, page]);

  useEffect(() => { load(); }, [load]);

  const FILTER_GROUPS: { key: string; label: string; types: string[]; color: string; bg: string }[] = [
    { key: 'MEMBERSHIP', label: '멤버십', types: ['MEMBERSHIP'], color: '#4338ca', bg: '#eef2ff' },
    { key: 'POSTPONEMENT', label: '연기', types: ['POSTPONEMENT', 'POSTPONEMENT_RESULT'], color: '#92400e', bg: '#fef3c7' },
    { key: 'REFUND', label: '환불', types: ['REFUND', 'REFUND_RESULT'], color: '#991b1b', bg: '#fef2f2' },
    { key: 'ATTENDANCE', label: '출석', types: ['ATTENDANCE'], color: '#065f46', bg: '#ecfdf5' },
    ...(type === 'staff' ? [
      { key: 'STAFF_REGISTER', label: '등록', types: ['STAFF_REGISTER'], color: '#1e40af', bg: '#dbeafe' },
      { key: 'STATUS_CHANGE', label: '상태변경', types: ['STATUS_CHANGE'], color: '#7c3aed', bg: '#ede9fe' },
      { key: 'INFO_CHANGE', label: '정보변경', types: ['INFO_CHANGE'], color: '#0369a1', bg: '#e0f2fe' },
      { key: 'REFUND_CHANGE', label: '환불정보', types: ['REFUND_CHANGE'], color: '#b45309', bg: '#fef3c7' },
    ] : []),
  ];

  const activeGroup = FILTER_GROUPS.find(g => g.key === filter);
  const filtered = activeGroup ? items.filter(i => activeGroup.types.includes(i.type)) : items;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal-content ${s.content}`}>
        <div className={s.header}>
          <div>
            <h3 className={s.title}>{memberName} - 활동 히스토리 ({totalElements}건)</h3>
          </div>
          <button onClick={onClose} className={s.closeBtn}>&times;</button>
        </div>

        <div className={s.filterRow}>
          <button onClick={() => setFilter('')} className={!filter ? s.filterBtnActive : s.filterBtn}>전체</button>
          {FILTER_GROUPS.map(g => (
            <button key={g.key} onClick={() => setFilter(g.key)}
              className={filter === g.key ? s.filterBtnActive : s.filterBtn}
              style={filter === g.key ? { background: g.bg, color: g.color, borderColor: g.color } : {}}>
              {g.label}
            </button>
          ))}
        </div>

        <div className={s.body}>
          {loading ? (
            <div className={s.empty}>불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <div className={s.empty}>활동 기록이 없습니다.</div>
          ) : (
            <div className={s.timeline}>
              {filtered.map((item, i) => {
                const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.ATTENDANCE;
                const st = STATUS_STYLE[item.status] || { color: '#6b7280', bg: '#f3f4f6' };
                return (
                  <div key={i} className={s.timelineItem}>
                    <div className={s.timelineDot} style={{ background: cfg.color }} />
                    <div className={s.timelineCard}>
                      <div className={s.timelineTop}>
                        <span className={s.typeBadge} style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                        <span className={s.timelineDate}>{item.date}</span>
                      </div>
                      <div className={s.timelineTitle}>{item.title}</div>
                      {item.detail && <div className={s.timelineDetail}>{item.detail}</div>}
                      <span className={s.statusBadge} style={{ background: st.bg, color: st.color }}>{item.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={s.footer}>
          {totalPages > 1 ? (
            <div className={s.paging}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className={s.pageBtn}>&laquo; 이전</button>
              <span className={s.pageInfo}>{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className={s.pageBtn}>다음 &raquo;</button>
            </div>
          ) : <div />}
          <button onClick={onClose} className={s.closeFooterBtn}>닫기</button>
        </div>
      </div>
    </div>
  );
}
