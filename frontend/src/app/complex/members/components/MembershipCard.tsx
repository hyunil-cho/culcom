'use client';

import { type MemberMembershipResponse } from '@/lib/api';
import styles from './MembershipCard.module.css';

/**
 * 할당된 멤버십 정보를 표시하는 카드 컴포넌트.
 * MembershipInfoModal, 기타 멤버십 표시가 필요한 곳에서 사용.
 * 멤버십 표시 필드 변경 시 이 컴포넌트만 수정하면 된다.
 */
export default function MembershipCard({ ms }: { ms: MemberMembershipResponse }) {
  const rem = ms.totalCount - ms.usedCount;
  const pctUsed = ms.totalCount > 0 ? Math.round(ms.usedCount / ms.totalCount * 100) : 0;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.membershipName}>{ms.membershipName}</span>
        <span className={`${styles.statusBadge} ${styles['status_' + ms.status] ?? ''}`}>{ms.status}</span>
      </div>
      <div className={styles.infoGrid}>
        <div><span className={styles.infoLabel}>기간</span><br /><strong>{ms.startDate} ~ {ms.expiryDate}</strong></div>
        <div><span className={styles.infoLabel}>수업 횟수</span><br /><strong className={styles.infoValue}>{ms.usedCount}회 사용 / {ms.totalCount}회 (잔여 {rem}회)</strong></div>
        <div><span className={styles.infoLabel}>결제 금액</span><br /><strong>{ms.price || '-'}</strong></div>
        <div><span className={styles.infoLabel}>연기</span><br /><strong>{ms.postponeUsed}회 사용 / {ms.postponeTotal}회</strong></div>
        <div><span className={styles.infoLabel}>양도</span><br /><strong style={{ color: ms.transferable ? '#16a34a' : '#dc2626' }}>{ms.transferable ? '가능' : '불가'}</strong></div>
      </div>
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${pctUsed}%` }} />
      </div>
      <div className={styles.progressText}>수업 진행률 {pctUsed}%</div>
    </div>
  );
}
