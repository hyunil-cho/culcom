'use client';

import { useState } from 'react';
import { attendanceViewApi, type AttendanceHistoryDetail, type AttendanceHistorySummary, type PageResponse } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import styles from './AttendanceHistoryModal.module.css';

interface AttendanceHistoryModalProps {
  seq: number;
  name: string;
  type: 'member' | 'staff';
  onClose: () => void;
}

const PAGE_SIZE = 20;

export default function AttendanceHistoryModal({ seq, name, type, onClose }: AttendanceHistoryModalProps) {
  const [page, setPage] = useState(0);

  const { data: summary = null } = useApiQuery<AttendanceHistorySummary>(
    ['attendanceHistorySummary', type, seq],
    () => {
      const fetcher = type === 'staff' ? attendanceViewApi.staffHistorySummary : attendanceViewApi.memberHistorySummary;
      return fetcher(seq) as Promise<import('@/lib/api/client').ApiResponse<AttendanceHistorySummary>>;
    },
  );

  const { data: pageData, isLoading: loading } = useApiQuery<PageResponse<AttendanceHistoryDetail>>(
    ['attendanceHistory', type, seq, page],
    () => {
      const fetcher = type === 'staff' ? attendanceViewApi.staffHistory : attendanceViewApi.memberHistory;
      return fetcher(seq, page, PAGE_SIZE) as Promise<import('@/lib/api/client').ApiResponse<PageResponse<AttendanceHistoryDetail>>>;
    },
  );

  const data = pageData?.content ?? [];
  const totalPages = pageData?.totalPages ?? 0;
  const totalElements = pageData?.totalElements ?? 0;

  const statusClass = (status: string) => {
    if (status === '출석') return styles.statusPresent;
    if (status === '결석') return styles.statusAbsent;
    return styles.statusOther;
  };

  return (
    <div className="modal-overlay">
      <div className={`modal-content ${styles.content}`}>
        <div className={styles.header}>
          <div>
            <h3>{name} - 수업 참여 기록 ({totalElements}건)</h3>
            {summary && (
              <>
                {summary.startDate && summary.endDate && (
                  <div className={styles.periodBar}>{summary.startDate} ~ {summary.endDate}</div>
                )}
                <div className={styles.summaryBar}>
                  <span className={styles.summaryPresent}>출석 {summary.presentCount}</span>
                  <span className={styles.summaryAbsent}>결석 {summary.absentCount}</span>
                  <span className={styles.summaryPostpone}>연기 {summary.postponeCount}</span>
                </div>
              </>
            )}
          </div>
          <button onClick={onClose} className={styles.closeBtn}>&times;</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className={styles.empty}>불러오는 중...</div>
          ) : data.length === 0 ? (
            <div className={styles.empty}>수업 참여 기록이 없습니다.</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>수업</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {data.map(row => (
                  <tr key={row.seq}>
                    <td>{row.attendanceDate}</td>
                    <td>{row.className}</td>
                    <td className={styles.tdCenter}>
                      <span className={statusClass(row.status)}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className={styles.footer}>
          {totalPages > 1 ? (
            <div className={styles.paging}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className={styles.pageBtn}>&laquo; 이전</button>
              <span className={styles.pageInfo}>{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className={styles.pageBtn}>다음 &raquo;</button>
            </div>
          ) : <div />}
          <button onClick={onClose} className={styles.closeFooterBtn}>닫기</button>
        </div>
      </div>
    </div>
  );
}