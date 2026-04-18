'use client';

import { useMemo } from 'react';
import {
  memberApi, postponementApi,
  type MemberMembershipResponse, type PostponementRequest,
} from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { useApiQuery } from '@/hooks/useApiQuery';
import { Button } from '@/components/ui/Button';
import UnavailableNotice from './UnavailableNotice';
import CopyableUrlField from './CopyableUrlField';
import SmsSendSection from './SmsSendSection';
import { hasOutstanding, isPostponable } from '../membershipEligibility';
import shared from './LinkShared.module.css';
import s from './PostponementLinkModal.module.css';

interface Props {
  memberSeq: number;
  memberName: string;
  memberPhone: string;
  onClose: () => void;
}

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  '대기': { bg: '#eef2ff', color: '#4f46e5' },
  '승인': { bg: '#ecfdf5', color: '#065f46' },
  '반려': { bg: '#fef2f2', color: '#991b1b' },
};

export default function PostponementLinkModal({ memberSeq, memberName, memberPhone, onClose }: Props) {
  const payload = btoa(encodeURIComponent(JSON.stringify({ memberSeq, name: memberName, phone: memberPhone })));
  const postponementUrl = `${window.location.origin}${ROUTES.PUBLIC_POSTPONEMENT}?d=${payload}`;
  const smsMessage = `[수업 연기 요청 안내]\n\n${memberName}님, 아래 링크에서 수업 연기 요청을 진행해주세요.\n\n${postponementUrl}`;

  const { data: memberships = [], isLoading: msLoading } = useApiQuery<MemberMembershipResponse[]>(
    ['postponementLinkMemberships', memberSeq],
    () => memberApi.getMemberships(memberSeq),
  );
  const { data: history = [], isLoading: histLoading } = useApiQuery<PostponementRequest[]>(
    ['postponementHistory', memberSeq],
    () => postponementApi.memberHistory(memberSeq),
  );
  const loading = msLoading || histLoading;

  /**
   * 연기 가능: 활성 + 미수금 없음 + 연기 잔여 횟수 있음.
   * 하나라도 만족하는 멤버십이 있어야 링크 생성 허용.
   */
  const { canPostpone, unavailableReason, postponableMemberships, activeMemberships } = useMemo(() => {
    const actives = memberships.filter((m) => m.status === '활성');
    if (actives.length === 0) {
      return { canPostpone: false, unavailableReason: '사용 가능한 멤버십이 없습니다.', postponableMemberships: [], activeMemberships: actives };
    }
    const postponables = actives.filter(isPostponable);
    if (postponables.length === 0) {
      const allOutstanding = actives.every(hasOutstanding);
      const reason = allOutstanding
        ? '미수금이 남아있어 연기 신청을 할 수 없습니다. 미수금을 완납 후 진행해주세요.'
        : '연기 가능한 멤버십이 없습니다. (미수금 잔액 또는 연기 가능 횟수 소진)';
      return { canPostpone: false, unavailableReason: reason, postponableMemberships: [], activeMemberships: actives };
    }
    return { canPostpone: true, unavailableReason: '', postponableMemberships: postponables, activeMemberships: actives };
  }, [memberships]);

  const historySection = history.length > 0 && (
    <>
      <div className={s.sectionLabel} style={{ marginTop: '1rem' }}>연기 요청 히스토리 ({history.length}건)</div>
      <div className={s.historyList}>
        {history.map((h) => {
          const badge = STATUS_BADGE[h.status] || STATUS_BADGE['대기'];
          return (
            <div key={h.seq} className={s.historyItem}>
              <div className={s.historyTop}>
                <span className={s.historyBadge} style={{ background: badge.bg, color: badge.color }}>
                  {h.status}
                </span>
                <span className={s.historyDate}>{h.createdDate?.split('T')[0]}</span>
              </div>
              <div className={s.historyDetail}>
                {h.startDate && h.endDate && <span>{h.startDate} ~ {h.endDate}</span>}
              </div>
              <div className={s.historyReason}>{h.reason}</div>
              {h.adminMessage && (
                <div className={s.historyReject}>
                  {h.status === '반려' ? '반려 사유' : '관리자 메시지'}: {h.adminMessage}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal-content ${s.content}`}>
        <div className={s.header}>
          <h3 className={s.title}>수업 연기 요청</h3>
        </div>

        <div className={s.body}>
          <div className={s.recipientInfo}>
            <div>
              <span className={s.infoLabel}>회원</span>
              <span className={s.infoValue}>{memberName}</span>
            </div>
            <div>
              <span className={s.infoLabel}>연락처</span>
              <span className={s.infoValue}>{memberPhone}</span>
            </div>
          </div>

          {loading ? (
            <div className={shared.loadingText}>멤버십 정보 확인 중...</div>
          ) : !canPostpone ? (
            <div>
              <UnavailableNotice title="연기 요청이 불가능합니다" description={unavailableReason} />

              <div className={s.sectionLabel}>멤버십 연기 현황</div>
              {activeMemberships.length === 0 ? (
                <div className={s.emptyText}>활성 멤버십이 없습니다.</div>
              ) : activeMemberships.map((ms) => (
                <div key={ms.seq} className={s.msCard}>
                  <div className={s.msName}>{ms.membershipName}</div>
                  <div className={s.msMeta}>
                    연기: <strong>{ms.postponeUsed}/{ms.postponeTotal}회 사용</strong>
                    {' · '}기간: {ms.startDate} ~ {ms.expiryDate}
                  </div>
                </div>
              ))}

              {historySection}
            </div>
          ) : (
            <div>
              <div className={s.sectionLabel}>멤버십 연기 잔여</div>
              {activeMemberships.map((ms) => {
                const rem = ms.postponeTotal - ms.postponeUsed;
                return (
                  <div key={ms.seq} className={s.msCard}>
                    <div className={s.msName}>
                      {ms.membershipName}
                      <span className={rem > 0 ? s.msRemainOk : s.msRemainOut}>
                        {rem > 0 ? `${rem}회 남음` : '소진'}
                      </span>
                    </div>
                    <div className={s.msMeta}>
                      연기: {ms.postponeUsed}/{ms.postponeTotal}회 · 기간: {ms.startDate} ~ {ms.expiryDate}
                    </div>
                  </div>
                );
              })}

              <div style={{ marginTop: '1rem' }}>
                <CopyableUrlField
                  label="연기 요청 URL"
                  url={postponementUrl}
                  hint="이 링크를 고객에게 전달하면, 수업 연기 요청을 직접 진행할 수 있습니다."
                />
              </div>

              <SmsSendSection receiverPhone={memberPhone} initialMessage={smsMessage} />

              {historySection}
            </div>
          )}
        </div>

        <div className={s.footer}>
          <Button onClick={onClose} variant="secondary">닫기</Button>
        </div>
      </div>
    </div>
  );
}
