'use client';

import { useApiQuery } from '@/hooks/useApiQuery';
import { publicLinkApi } from '@/lib/api';
import MembershipFeature from '../../_features/MembershipFeature';
import PostponementFeature from '../../_features/PostponementFeature';
import RefundFeature from '../../_features/RefundFeature';
import TransferFeature from '../../_features/TransferFeature';

interface Props {
  params: { code: string };
}

export default function PublicShortLinkPage({ params }: Props) {
  const { code } = params;

  const { data, isLoading, error } = useApiQuery(
    ['publicLink', code],
    () => publicLinkApi.resolve(code),
    { enabled: !!code },
  );

  if (isLoading) {
    return <Centered>회원 정보를 확인하는 중...</Centered>;
  }

  if (error || !data) {
    return <ErrorCard message={error?.message || '유효하지 않은 링크입니다.'} />;
  }

  switch (data.kind) {
    case '멤버십':
      return <MembershipFeature memberName={data.memberName} memberPhone={data.memberPhone} />;
    case '연기':
      return <PostponementFeature memberName={data.memberName} memberPhone={data.memberPhone} />;
    case '환불':
      return (
        <RefundFeature
          memberName={data.memberName}
          memberPhone={data.memberPhone}
          memberMembershipSeq={data.memberMembershipSeq}
          refundAmount={data.refundAmount}
        />
      );
    case '양도':
      if (!data.transferToken) {
        return <ErrorCard message="양도 링크 정보가 손상되었습니다. 관리자에게 문의해주세요." />;
      }
      return <TransferFeature transferToken={data.transferToken} />;
    default:
      return <ErrorCard message="알 수 없는 링크 종류입니다." />;
  }
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: '#999' }}>
      {children}
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div style={{ backgroundColor: '#f4f7f6', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100vh', padding: 20 }}>
      <div style={{ background: 'white', padding: 40, borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '100%', maxWidth: 480, marginTop: 40, textAlign: 'center' }}>
        <p style={{ color: '#dc2626', fontSize: '1rem', margin: 0 }}>{message}</p>
      </div>
    </div>
  );
}
