'use client';

import { useMemo } from 'react';
import { memberApi, publicLinkApi, type MemberMembershipResponse } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { Button } from '@/components/ui/Button';
import UnavailableNotice from './UnavailableNotice';
import CopyableUrlField from './CopyableUrlField';
import SmsSendSection from './SmsSendSection';
import shared from './LinkShared.module.css';
import s from './MembershipLinkModal.module.css';

interface Props {
  memberSeq: number;
  memberName: string;
  memberPhone: string;
  onClose: () => void;
}

export default function MembershipLinkModal({ memberSeq, memberName, memberPhone, onClose }: Props) {
  const { data: memberships = [], isLoading: msLoading } = useApiQuery<MemberMembershipResponse[]>(
    ['membershipLinkMemberships', memberSeq],
    () => memberApi.getMemberships(memberSeq),
  );
  const { canView, unavailableReason } = useMemo(() => {
    const activeMemberships = memberships.filter((m) => m.status === '활성');
    if (activeMemberships.length === 0) {
      return { canView: false, unavailableReason: '활성 멤버십이 없습니다.' };
    }
    return { canView: true, unavailableReason: '' };
  }, [memberships]);

  const { data: link, isLoading: linkLoading } = useApiQuery(
    ['membershipLinkCode', memberSeq],
    () => publicLinkApi.create({ memberSeq, kind: '멤버십' }),
    { enabled: canView },
  );

  const membershipUrl = link
    ? `${window.location.origin}/public/s/${link.code}`
    : '';
  const smsMessage = `[멤버십 조회 안내]\n\n${memberName}님, 아래 링크에서 멤버십 현황을 확인하실 수 있습니다.\n\n${membershipUrl}`;

  return (
    <div className="modal-overlay">
      <div className={`modal-content ${s.content}`}>
        <div className={s.header}>
          <h3 className={s.title}>멤버십 조회 링크</h3>
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

          {msLoading || linkLoading ? (
            <div className={shared.loadingText}>멤버십 정보 확인 중...</div>
          ) : !canView ? (
            <UnavailableNotice title="멤버십 조회가 불가능합니다" description={unavailableReason} />
          ) : link ? (
            <>
              <CopyableUrlField
                label="멤버십 조회 URL"
                url={membershipUrl}
                hint="이 링크를 고객에게 전달하면, 본인의 멤버십 현황을 확인할 수 있습니다."
              />
              <SmsSendSection receiverPhone={memberPhone} initialMessage={smsMessage} />
            </>
          ) : null}
        </div>

        <div className={s.footer}>
          <Button onClick={onClose} variant="secondary">닫기</Button>
        </div>
      </div>
    </div>
  );
}
