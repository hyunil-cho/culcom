'use client';

import { memberApi, type MemberMembershipResponse } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import Spinner from '@/components/ui/Spinner';
import MembershipCard from './MembershipCard';
import MembershipPostponementHistorySection from './MembershipPostponementHistorySection';
import styles from './MembershipInfoModal.module.css';

export default function MembershipInfoModal({
  memberSeq, memberName, onClose,
}: {
  memberSeq: number;
  memberName: string;
  onClose: () => void;
}) {
  const { data: memberships = [], isLoading: loading } = useApiQuery<MemberMembershipResponse[]>(
    ['memberMemberships', memberSeq],
    () => memberApi.getMemberships(memberSeq),
  );

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal-content ${styles.content}`}>
        <div className={styles.header}>
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{memberName} - 멤버십 정보 ({memberships.length}건)</h3>
        </div>
        <div className="modal-body" style={{ maxHeight: '60vh' }}>
          {loading ? (
            <Spinner />
          ) : (
            <>
              {memberships.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>활성 멤버십이 없습니다.</div>
              ) : memberships.map(ms => (
                <MembershipCard key={ms.seq} ms={ms} />
              ))}
              <MembershipPostponementHistorySection memberSeq={memberSeq} />
            </>
          )}
        </div>
        <div className={styles.footer}>
          <button onClick={onClose} className={styles.closeBtn}>닫기</button>
        </div>
      </div>
    </div>
  );
}
