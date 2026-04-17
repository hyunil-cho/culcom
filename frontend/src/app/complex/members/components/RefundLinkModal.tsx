'use client';

import { useMemo } from 'react';
import { memberApi, type MemberMembershipResponse } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { useApiQuery } from '@/hooks/useApiQuery';
import { Button } from '@/components/ui/Button';
import UnavailableNotice from './UnavailableNotice';
import CopyableUrlField from './CopyableUrlField';
import SmsSendSection from './SmsSendSection';
import shared from './LinkShared.module.css';
import s from './RefundLinkModal.module.css';

interface Props {
  memberSeq: number;
  memberName: string;
  memberPhone: string;
  onClose: () => void;
}

export default function RefundLinkModal({ memberSeq, memberName, memberPhone, onClose }: Props) {
  const { data: memberships = [], isLoading: msLoading } = useApiQuery<MemberMembershipResponse[]>(
    ['refundLinkMemberships', memberSeq],
    () => memberApi.getMemberships(memberSeq),
  );
  const { canRefund, unavailableReason } = useMemo(() => {
    const activeMemberships = memberships.filter((m) => m.status === '활성');
    if (activeMemberships.length === 0) {
      return { canRefund: false, unavailableReason: '활성 멤버십이 없습니다.' };
    }
    const hasOutstanding = activeMemberships.some((m) => m.outstanding != null && m.outstanding > 0);
    if (hasOutstanding) {
      return { canRefund: false, unavailableReason: '미수금이 남아있어 환불 요청 링크를 생성할 수 없습니다. 미수금을 완납 후 진행해주세요.' };
    }
    return { canRefund: true, unavailableReason: '' };
  }, [memberships]);

  const payload = btoa(encodeURIComponent(JSON.stringify({ memberSeq, name: memberName, phone: memberPhone })));
  const refundUrl = `${window.location.origin}${ROUTES.PUBLIC_REFUND}?d=${payload}`;
  const smsMessage = `[환불 요청 안내]\n\n${memberName}님, 아래 링크에서 환불 요청을 진행해주세요.\n\n${refundUrl}`;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal-content ${s.content}`}>
        <div className={s.header}>
          <h3 className={s.title}>환불 요청 링크</h3>
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

          {msLoading ? (
            <div className={shared.loadingText}>멤버십 정보 확인 중...</div>
          ) : !canRefund ? (
            <UnavailableNotice title="환불 요청이 불가능합니다" description={unavailableReason} />
          ) : (
            <>
              <CopyableUrlField
                label="환불 요청 URL"
                url={refundUrl}
                hint="이 링크를 고객에게 전달하면, 환불 사유와 계좌 정보를 직접 입력할 수 있습니다."
              />
              <SmsSendSection receiverPhone={memberPhone} initialMessage={smsMessage} />
            </>
          )}
        </div>

        <div className={s.footer}>
          <Button onClick={onClose} variant="secondary">닫기</Button>
        </div>
      </div>
    </div>
  );
}
