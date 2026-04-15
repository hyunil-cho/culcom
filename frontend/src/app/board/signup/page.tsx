'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import BoardNav from '../_components/BoardNav';
import BoardFooter from '../_components/BoardFooter';
import { useBoardSession } from '../_hooks/useBoardSession';
import type { ConsentItem } from '@/lib/api';

interface ConsentAgreement {
  consentItemSeq: number;
  agreed: boolean;
}

export default function BoardSignupPage() {
  const { session } = useBoardSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [consentItems, setConsentItems] = useState<ConsentItem[]>([]);
  const [agreements, setAgreements] = useState<Record<number, boolean>>({});
  const [expandedSeq, setExpandedSeq] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/public/consent-items?category=SIGNUP', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const items: ConsentItem[] = data.data || [];
        setConsentItems(items);
        const init: Record<number, boolean> = {};
        items.forEach(i => { init[i.seq] = false; });
        setAgreements(init);
      })
      .catch(() => setConsentItems([]));
  }, []);

  const toggleAgreement = (seq: number, value: boolean) => {
    setAgreements(prev => ({ ...prev, [seq]: value }));
  };

  const toggleAll = (value: boolean) => {
    const next: Record<number, boolean> = {};
    consentItems.forEach(i => { next[i.seq] = value; });
    setAgreements(next);
  };

  const requiredAgreed = consentItems
    .filter(i => i.required)
    .every(i => agreements[i.seq]);
  const allAgreed = consentItems.length > 0 && consentItems.every(i => agreements[i.seq]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다');
      return;
    }
    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다');
      return;
    }
    if (!requiredAgreed) {
      setError('필수 약관에 모두 동의해주세요');
      return;
    }

    const consents: ConsentAgreement[] = consentItems.map(i => ({
      consentItemSeq: i.seq,
      agreed: !!agreements[i.seq],
    }));

    setSubmitting(true);
    try {
      const res = await fetch('/api/public/board/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, name, phoneNumber, consents }),
      });
      const data = await res.json();
      if (data.success) {
        alert('회원가입이 완료되었습니다.');
        window.location.href = '/board';
      } else {
        setError(data.message || '회원가입에 실패했습니다');
      }
    } catch {
      setError('회원가입 처리 중 오류가 발생했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <BoardNav isLoggedIn={session.isLoggedIn} memberName={session.memberName} />
      <main className="board-main">
        <div className="board-container" style={{ maxWidth: 460, paddingTop: 40, paddingBottom: 40 }}>
          <div style={{
            background: 'var(--board-surface)',
            border: '1px solid var(--board-border)',
            borderRadius: 'var(--board-radius)',
            boxShadow: 'var(--board-shadow-md)',
            padding: 36,
          }}>
            <h1 style={{ fontSize: 24, marginBottom: 8 }}>회원가입</h1>
            <p style={{ color: 'var(--board-text-sub)', fontSize: 14, marginBottom: 24 }}>
              이메일 계정으로 가입합니다. 카카오 계정이 있다면 카카오 로그인을 이용할 수 있습니다.
            </p>

            {error && (
              <div style={{
                padding: 12, borderRadius: 8, background: '#fef2f2', color: '#b91c1c',
                fontSize: 13, marginBottom: 16,
              }}>{error}</div>
            )}

            <form onSubmit={handleSubmit}>
              <Field label="이메일 (아이디)">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  required style={inputStyle} placeholder="name@example.com" autoComplete="email" />
              </Field>
              <Field label="비밀번호 (8자 이상)">
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  required minLength={8} style={inputStyle} autoComplete="new-password" />
              </Field>
              <Field label="비밀번호 확인">
                <input type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)}
                  required style={inputStyle} autoComplete="new-password" />
              </Field>
              <Field label="이름">
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  required style={inputStyle} />
              </Field>
              <Field label="전화번호">
                <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                  required style={inputStyle} placeholder="010-0000-0000" />
              </Field>

              {consentItems.length > 0 && (
                <div style={{
                  marginTop: 20, marginBottom: 8,
                  borderTop: '1px solid var(--board-border)', paddingTop: 16,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>약관 동의</span>
                    <label style={{ fontSize: 13, color: 'var(--board-text-sub)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="checkbox"
                        checked={allAgreed}
                        onChange={(e) => toggleAll(e.target.checked)}
                      />
                      전체 동의
                    </label>
                  </div>

                  {consentItems.map(item => (
                    <div key={item.seq} style={{
                      border: '1px solid var(--board-border)', borderRadius: 8,
                      padding: '10px 12px', marginBottom: 8, background: '#fafafa',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <label style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 8, width: 'fit-content', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={!!agreements[item.seq]}
                            onChange={(e) => toggleAgreement(item.seq, e.target.checked)}
                            style={{ width: 16, height: 16, margin: 0, flexShrink: 0 }}
                          />
                          <span>
                            <span style={{ color: item.required ? '#b91c1c' : 'var(--board-text-sub)', marginRight: 4 }}>
                              [{item.required ? '필수' : '선택'}]
                            </span>
                            {item.title}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setExpandedSeq(expandedSeq === item.seq ? null : item.seq)}
                          style={{
                            background: 'none', border: 'none', fontSize: 12,
                            color: 'var(--board-primary)', cursor: 'pointer',
                            flexShrink: 0, padding: 0,
                          }}>
                          {expandedSeq === item.seq ? '접기' : '보기'}
                        </button>
                      </div>
                      {expandedSeq === item.seq && (
                        <div style={{
                          marginTop: 8, padding: 10, background: 'white',
                          border: '1px solid var(--board-border)', borderRadius: 6,
                          fontSize: 12, whiteSpace: 'pre-wrap', color: 'var(--board-text-sub)',
                          maxHeight: 200, overflow: 'auto',
                        }}>
                          {item.content}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button type="submit" disabled={submitting || !requiredAgreed} style={{
                width: '100%', padding: '12px 16px',
                background: requiredAgreed ? 'var(--board-primary)' : '#d1d5db',
                color: 'white', border: 'none',
                borderRadius: 8, fontSize: 15, fontWeight: 600,
                cursor: submitting || !requiredAgreed ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--board-font)', marginTop: 16,
              }}>
                {submitting ? '가입 처리 중...' : '회원가입'}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--board-text-sub)', marginTop: 24 }}>
              이미 계정이 있으신가요?{' '}
              <Link href="/board/login" style={{ color: 'var(--board-primary)', fontWeight: 600 }}>로그인</Link>
            </p>
          </div>
        </div>
      </main>
      <BoardFooter />
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--board-text-sub)' }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--board-border)',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'var(--board-font)',
  outline: 'none',
};
