'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { publicTransferApi, type TransferPublicInfo } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { queryClient } from '@/lib/queryClient';

export default function PublicTransferPage() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}

function Inner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const { data: info, isLoading: loading, error: queryError } = useApiQuery<TransferPublicInfo>(
    ['publicTransfer', token],
    () => publicTransferApi.getByToken(token),
    { enabled: !!token },
  );

  const error = !token ? '유효하지 않은 링크입니다.'
    : queryError ? (queryError.message || '양도 요청을 찾을 수 없습니다.')
    : '';
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    const res = await publicTransferApi.confirm(token);
    if (res.success) queryClient.invalidateQueries({ queryKey: ['publicTransfer', token] });
    setConfirming(false);
  };

  const inviteUrl = info?.inviteToken
    ? `${window.location.origin}/public/transfer/invite?token=${info.inviteToken}`
    : null;

  const handleCopy = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ backgroundColor: '#f4f7f6', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100vh', padding: 20 }}>
      <div style={{ background: 'white', padding: 40, borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '100%', maxWidth: 520, marginTop: 30 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ color: '#10b981', fontSize: '1.6rem', margin: '0 0 8px' }}>멤버십 양도</h1>
          <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>양도 정보를 확인하고 진행해주세요.</p>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>정보를 확인하는 중...</div>}
        {error && <div style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>{error}</div>}

        {info && (
          <>
            {/* 멤버십 정보 */}
            <div style={{ padding: 14, background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 10, marginBottom: 12 }}>
              <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 700, marginBottom: 6 }}>양도 멤버십</div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1e3a8a', marginBottom: 4 }}>{info.membershipName}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: '0.85rem', color: '#1e40af' }}>
                <div>양도자: <strong>{info.fromMemberName}</strong></div>
                <div>잔여: <strong>{info.remainingCount}회</strong></div>
                <div>만료일: <strong>{info.expiryDate}</strong></div>
              </div>
            </div>

            {/* 양도비 */}
            <div style={{ padding: 14, background: '#fef3c7', border: '1.5px solid #fde68a', borderRadius: 10, marginBottom: 20 }}>
              <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 700, marginBottom: 4 }}>양도비</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#92400e' }}>
                {info.transferFee.toLocaleString()}원
              </div>
            </div>

            {/* 초대 URL 미생성 → 진행 버튼 */}
            {!info.inviteToken && (
              <>
                <div style={{ padding: 12, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 16, fontSize: '0.82rem', color: '#4b5563', lineHeight: 1.5 }}>
                  "진행하기"를 누르면 양수자에게 전달할 초대 링크가 생성됩니다.<br />
                  초대 링크를 통해 양수자가 정보를 입력하면 양도 절차가 시작됩니다.
                </div>
                <button onClick={handleConfirm} disabled={confirming}
                  style={{ width: '100%', padding: '14px 0', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}>
                  {confirming ? '처리 중...' : '진행하기'}
                </button>
              </>
            )}

            {/* 초대 URL 생성됨 → URL 표시 + 복사 */}
            {info.inviteToken && inviteUrl && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 600, marginBottom: 12 }}>
                  아래 링크를 양수자에게 전달해주세요.
                </div>
                <div style={{
                  padding: '10px 14px', background: '#f0fdf4', border: '1.5px solid #bbf7d0',
                  borderRadius: 8, fontSize: '0.78rem', color: '#166534', wordBreak: 'break-all',
                  fontFamily: 'monospace', marginBottom: 12,
                }}>
                  {inviteUrl}
                </div>
                <button onClick={handleCopy}
                  style={{
                    width: '100%', padding: '12px 0', border: 'none', borderRadius: 8,
                    fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
                    background: copied ? '#dcfce7' : '#10b981',
                    color: copied ? '#15803d' : '#fff',
                    transition: 'all 0.2s',
                  }}>
                  {copied ? '복사됨!' : '링크 복사'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
