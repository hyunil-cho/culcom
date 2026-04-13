'use client';

import { useState } from 'react';
import { memberApi, staffApi, type MemberActivityTimelineItem } from '@/lib/api';
import type { PageResponse } from '@/lib/api/client';
import { useApiQuery } from '@/hooks/useApiQuery';
import s from './MemberTimelineModal.module.css';

interface Props {
  memberSeq: number;
  memberName: string;
  type?: 'member' | 'staff';
  onClose: () => void;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ATTENDANCE:            { label: '출석',       color: '#065f46', bg: '#ecfdf5' },
  MEMBER_CREATE:         { label: '회원등록',   color: '#1e40af', bg: '#dbeafe' },
  MEMBERSHIP_ASSIGN:     { label: '멤버십등록', color: '#4338ca', bg: '#eef2ff' },
  MEMBERSHIP_UPDATE:     { label: '멤버십변경', color: '#6d28d9', bg: '#f5f3ff' },
  MEMBERSHIP_DELETE:     { label: '멤버십삭제', color: '#991b1b', bg: '#fef2f2' },
  POSTPONEMENT_REQUEST:  { label: '연기요청',   color: '#92400e', bg: '#fef3c7' },
  POSTPONEMENT_APPROVE:  { label: '연기승인',   color: '#78350f', bg: '#fde68a' },
  POSTPONEMENT_REJECT:   { label: '연기반려',   color: '#78350f', bg: '#fde68a' },
  REFUND_REQUEST:        { label: '환불요청',   color: '#991b1b', bg: '#fef2f2' },
  REFUND_APPROVE:        { label: '환불승인',   color: '#7f1d1d', bg: '#fecaca' },
  REFUND_REJECT:         { label: '환불반려',   color: '#7f1d1d', bg: '#fecaca' },
  CLASS_ASSIGN:          { label: '수업배정',   color: '#0e7490', bg: '#ecfeff' },
  STATUS_CHANGE:         { label: '상태변경',   color: '#7c3aed', bg: '#ede9fe' },
  INFO_CHANGE:           { label: '정보변경',   color: '#0369a1', bg: '#e0f2fe' },
  REFUND_CHANGE:         { label: '환불정보',   color: '#b45309', bg: '#fef3c7' },
  PAYMENT_ADD:           { label: '납부',       color: '#15803d', bg: '#dcfce7' },
  PAYMENT_REFUND:        { label: '환불정정',   color: '#b91c1c', bg: '#fee2e2' },
  TRANSFER_OUT:          { label: '양도',       color: '#b45309', bg: '#fef3c7' },
  TRANSFER_IN:           { label: '양수',       color: '#059669', bg: '#ecfdf5' },
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
  '등록': { color: '#1e40af', bg: '#dbeafe' },
  '삭제': { color: '#991b1b', bg: '#fee2e2' },
  '배정': { color: '#0e7490', bg: '#ecfeff' },
  '양도': { color: '#b45309', bg: '#fef3c7' },
  '양수': { color: '#059669', bg: '#ecfdf5' },
};

const PAGE_SIZE = 20;

export default function MemberTimelineModal({ memberSeq, memberName, type = 'member', onClose }: Props) {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('');

  const fetcher = type === 'staff' ? staffApi.timeline : memberApi.timeline;
  const { data: timelineData, isLoading: loading } = useApiQuery<PageResponse<MemberActivityTimelineItem>>(
    ['memberTimeline', type, memberSeq, page],
    () => fetcher(memberSeq, page, PAGE_SIZE),
  );
  const items = timelineData?.content ?? [];
  const totalPages = timelineData?.totalPages ?? 0;
  const totalElements = timelineData?.totalElements ?? 0;

  const FILTER_GROUPS: { key: string; label: string; types: string[]; color: string; bg: string }[] = [
    { key: 'ATTENDANCE', label: '출석', types: ['ATTENDANCE'], color: '#065f46', bg: '#ecfdf5' },
    { key: 'MEMBERSHIP', label: '멤버십', types: ['MEMBERSHIP_ASSIGN', 'MEMBERSHIP_UPDATE', 'MEMBERSHIP_DELETE'], color: '#4338ca', bg: '#eef2ff' },
    { key: 'POSTPONEMENT', label: '연기', types: ['POSTPONEMENT_REQUEST', 'POSTPONEMENT_APPROVE', 'POSTPONEMENT_REJECT'], color: '#92400e', bg: '#fef3c7' },
    { key: 'REFUND', label: '환불', types: ['REFUND_REQUEST', 'REFUND_APPROVE', 'REFUND_REJECT'], color: '#991b1b', bg: '#fef2f2' },
    { key: 'PAYMENT', label: '납부', types: ['PAYMENT_ADD', 'PAYMENT_REFUND'], color: '#15803d', bg: '#dcfce7' },
    { key: 'INFO_CHANGE', label: '정보변경', types: ['INFO_CHANGE'], color: '#0369a1', bg: '#e0f2fe' },
    { key: 'CLASS_ASSIGN', label: '수업배정', types: ['CLASS_ASSIGN'], color: '#0e7490', bg: '#ecfeff' },
    { key: 'TRANSFER', label: '양도', types: ['TRANSFER_OUT', 'TRANSFER_IN'], color: '#b45309', bg: '#fef3c7' },
    ...(type === 'member' ? [
      { key: 'MEMBER_CREATE', label: '등록', types: ['MEMBER_CREATE'], color: '#1e40af', bg: '#dbeafe' },
    ] : []),
    ...(type === 'staff' ? [
      { key: 'STATUS_CHANGE', label: '상태변경', types: ['STATUS_CHANGE'], color: '#7c3aed', bg: '#ede9fe' },
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
                        <span className={s.timelineDate}>{item.date?.replace(/[.:]\d+$/, '').replace(/(\d{2}:\d{2}):\d{2}/, '$1')}</span>
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
