'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { publicTransferApi, type TransferInviteInfo, type ConsentItem } from '@/lib/api';

export default function PublicTransferInvitePage() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}

type Step = 'loading' | 'consent' | 'form' | 'done' | 'error';

function Inner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [step, setStep] = useState<Step>('loading');
  const [info, setInfo] = useState<TransferInviteInfo | null>(null);
  const [error, setError] = useState('');

  // 동의 상태
  const [agreements, setAgreements] = useState<Map<number, boolean>>(new Map());

  // 폼 상태
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [availableTime, setAvailableTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setStep('error'); setError('유효하지 않은 링크입니다.'); return; }
    publicTransferApi.getInviteInfo(token).then(res => {
      if (res.success) {
        setInfo(res.data);
        const map = new Map<number, boolean>();
        res.data.consentItems.forEach(c => map.set(c.seq, false));
        setAgreements(map);
        setStep('consent');
      } else {
        setStep('error');
        setError('양도 초대를 찾을 수 없습니다.');
      }
    }).catch(() => { setStep('error'); setError('오류가 발생했습니다.'); });
  }, [token]);

  const requiredItems = info?.consentItems.filter(c => c.required) ?? [];
  const allRequiredAgreed = requiredItems.every(c => agreements.get(c.seq));

  const handleConsentNext = () => {
    if (!allRequiredAgreed) { alert('필수 동의항목에 모두 동의해주세요.'); return; }
    setStep('form');
  };

  const handleSubmit = async () => {
    if (!name.trim()) { alert('이름을 입력해주세요.'); return; }
    if (!phone.trim()) { alert('전화번호를 입력해주세요.'); return; }
    setSubmitting(true);
    const consents = Array.from(agreements.entries()).map(([seq, agreed]) => ({
      consentItemSeq: seq, agreed,
    }));
    const res = await publicTransferApi.submitInvite(token, {
      name: name.trim(), phoneNumber: phone.trim(),
      availableTime: availableTime.trim() || undefined,
      consents,
    });
    setSubmitting(false);
    if (res.success) setStep('done');
    else alert(res.message || '오류가 발생했습니다.');
  };

  return (
    <div style={{ backgroundColor: '#f4f7f6', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100vh', padding: 20 }}>
      <div style={{ background: 'white', padding: 40, borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '100%', maxWidth: 520, marginTop: 30 }}>

        {step === 'loading' && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>정보를 확인하는 중...</div>
        )}

        {step === 'error' && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>{error}</div>
        )}

        {/* ── 동의 단계 ── */}
        {step === 'consent' && info && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <h1 style={{ color: '#10b981', fontSize: '1.5rem', margin: '0 0 8px' }}>멤버십 양도 수락</h1>
              <p style={{ color: '#666', fontSize: '0.88rem', margin: 0 }}>
                <strong>{info.fromMemberName}</strong>님이 <strong>{info.membershipName}</strong>을(를) 양도합니다.
              </p>
            </div>

            {/* 양도 요약 */}
            <div style={{ padding: 12, background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 8, marginBottom: 16, fontSize: '0.85rem', color: '#1e40af' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <div>잔여: <strong>{info.remainingCount}회</strong></div>
                <div>만료일: <strong>{info.expiryDate}</strong></div>
                <div>양도비: <strong>{info.transferFee.toLocaleString()}원</strong></div>
              </div>
            </div>

            {/* 동의항목 */}
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: '0.95rem', color: '#374151', margin: '0 0 10px' }}>동의항목</h3>
              {info.consentItems.map(item => (
                <ConsentItemBlock
                  key={item.seq}
                  item={item}
                  agreed={agreements.get(item.seq) ?? false}
                  onToggle={(v) => setAgreements(prev => new Map(prev).set(item.seq, v))}
                />
              ))}
            </div>

            <button onClick={handleConsentNext} disabled={!allRequiredAgreed}
              style={{
                width: '100%', padding: '14px 0', border: 'none', borderRadius: 8,
                fontSize: '1rem', fontWeight: 700, cursor: allRequiredAgreed ? 'pointer' : 'not-allowed',
                background: allRequiredAgreed ? '#10b981' : '#d1d5db',
                color: allRequiredAgreed ? '#fff' : '#9ca3af',
                transition: 'all 0.2s',
              }}>
              다음
            </button>
          </>
        )}

        {/* ── 정보 입력 단계 ── */}
        {step === 'form' && info && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <h1 style={{ color: '#10b981', fontSize: '1.5rem', margin: '0 0 8px' }}>정보 입력</h1>
              <p style={{ color: '#666', fontSize: '0.88rem', margin: 0 }}>양수자 본인의 정보를 입력해주세요.</p>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>이름 <span style={{ color: '#dc2626' }}>*</span></label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="이름을 입력하세요"
                style={inputStyle} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>전화번호 <span style={{ color: '#dc2626' }}>*</span></label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000"
                style={inputStyle} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>통화 가능 시각</label>
              <input value={availableTime} onChange={e => setAvailableTime(e.target.value)}
                placeholder="예: 평일 오후 2~5시" style={inputStyle} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep('consent')}
                style={{ flex: 1, padding: '12px 0', background: '#fff', color: '#374151', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' }}>
                이전
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                style={{ flex: 2, padding: '12px 0', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer' }}>
                {submitting ? '제출 중...' : '제출하기'}
              </button>
            </div>
          </>
        )}

        {/* ── 완료 ── */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>✅</div>
            <h2 style={{ color: '#10b981', margin: '0 0 10px' }}>접수 완료</h2>
            <p style={{ color: '#4b5563', fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }}>
              양도 접수가 완료되었습니다.<br />
              담당자가 입력하신 연락처로 연락드리겠습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ConsentItemBlock({
  item, agreed, onToggle,
}: {
  item: ConsentItem;
  agreed: boolean;
  onToggle: (v: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ marginBottom: 10, border: `1.5px solid ${agreed ? '#bbf7d0' : '#e5e7eb'}`, borderRadius: 8, overflow: 'hidden', transition: 'border-color 0.2s' }}>
      {/* 약관 본문 (접기/펼치기) */}
      <button onClick={() => setExpanded(!expanded)}
        style={{ width: '100%', padding: '8px 12px', background: '#f9fafb', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.82rem', color: '#374151' }}>
          {item.title}
          {item.required && <span style={{ color: '#dc2626', fontSize: '0.7rem', marginLeft: 4 }}>(필수)</span>}
        </span>
        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{expanded ? '접기' : '펼치기'}</span>
      </button>
      {expanded && (
        <div style={{ padding: '10px 12px', background: '#fff', maxHeight: 200, overflowY: 'auto', fontSize: '0.8rem', color: '#4b5563', lineHeight: 1.6, whiteSpace: 'pre-wrap', borderTop: '1px solid #e5e7eb' }}>
          {item.content}
        </div>
      )}
      {/* 동의 체크 */}
      <label style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        background: agreed ? '#f0fdf4' : '#fff', cursor: 'pointer', borderTop: '1px solid #f3f4f6',
      }}>
        <input type="checkbox" checked={agreed} onChange={e => onToggle(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: '#10b981' }} />
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: agreed ? '#15803d' : '#6b7280' }}>
          동의합니다
        </span>
      </label>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: 4,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6,
  fontSize: '0.9rem', boxSizing: 'border-box',
};
