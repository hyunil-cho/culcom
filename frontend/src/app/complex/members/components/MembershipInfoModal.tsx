'use client';

import { useEffect, useState } from 'react';
import { memberApi, type MemberMembershipResponse } from '@/lib/api';
import styles from './MembershipInfoModal.module.css';

export default function MembershipInfoModal({
  memberSeq, memberName, onClose,
}: {
  memberSeq: number;
  memberName: string;
  onClose: () => void;
}) {
  const [memberships, setMemberships] = useState<MemberMembershipResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    memberApi.getMemberships(memberSeq).then(res => {
      if (res.success) setMemberships(res.data);
      setLoading(false);
    });
  }, [memberSeq]);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal-content ${styles.content}`}>
        <div className={styles.header}>
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{memberName} - 멤버십 정보 ({memberships.length}건)</h3>
        </div>
        <div className="modal-body" style={{ maxHeight: '60vh' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>불러오는 중...</div>
          ) : memberships.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>활성 멤버십이 없습니다.</div>
          ) : memberships.map(ms => {
            const rem = ms.totalCount - ms.usedCount;
            const pctUsed = ms.totalCount > 0 ? Math.round(ms.usedCount / ms.totalCount * 100) : 0;
            return (
              <div key={ms.seq} className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.membershipName}>{ms.membershipName}</span>
                  <span className={`${styles.statusBadge} ${styles['status_' + ms.status] ?? ''}`}>{ms.status}</span>
                </div>
                <div className={styles.infoGrid}>
                  <div><span className={styles.infoLabel}>기간</span><br /><strong>{ms.startDate} ~ {ms.expiryDate}</strong></div>
                  <div><span className={styles.infoLabel}>수업 횟수</span><br /><strong className={styles.infoValue}>{ms.usedCount}회 사용 / {ms.totalCount}회 (잔여 {rem}회)</strong></div>
                  <div><span className={styles.infoLabel}>결제 금액</span><br /><strong>{ms.price || '-'}</strong></div>
                  <div><span className={styles.infoLabel}>연기</span><br /><strong>{ms.postponeUsed}회 사용 / {ms.postponeTotal}회</strong></div>
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${pctUsed}%` }} />
                </div>
                <div className={styles.progressText}>수업 진행률 {pctUsed}%</div>
              </div>
            );
          })}
        </div>
        <div className={styles.footer}>
          <button onClick={onClose} className={styles.closeBtn}>닫기</button>
        </div>
      </div>
    </div>
  );
}