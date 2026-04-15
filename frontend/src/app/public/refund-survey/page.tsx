'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { publicRefundSurveyApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';

export default function PublicRefundSurveyPage() {
  return <Suspense fallback={null}><PublicRefundSurveyInner /></Suspense>;
}

const PERIOD_OPTIONS = ['1주 이내', '1개월 이내', '3개월 이내', '4개월 이상'];
const BELONGING_OPTIONS = [
  { value: 1, label: '전혀 그렇지 않다' },
  { value: 2, label: '조금 그렇다' },
  { value: 3, label: '보통이다' },
  { value: 4, label: '그렇다' },
  { value: 5, label: '매우 그렇다' },
];
const TEAM_IMPACT_OPTIONS = ['영향 없었다', '혼란스러웠다', '소속감이 줄었다', '새로 적응해야 해서 피로했다'];

function PublicRefundSurveyInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const decoded = (() => {
    try {
      const d = searchParams.get('d');
      if (!d) return null;
      return JSON.parse(decodeURIComponent(atob(d))) as {
        branchSeq: number; refundRequestSeq?: number; name: string; phone: string;
      };
    } catch { return null; }
  })();

  const [participationPeriod, setParticipationPeriod] = useState('');
  const [belongingScore, setBelongingScore] = useState<number | null>(null);
  const [teamImpact, setTeamImpact] = useState('');
  const [differenceComment, setDifferenceComment] = useState('');
  const [improvementComment, setImprovementComment] = useState('');
  const [reEnrollScore, setReEnrollScore] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!decoded) {
    return (
      <PageShell>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: '#dc2626', fontSize: '1rem' }}>유효하지 않은 링크입니다. 관리자에게 문의해주세요.</p>
        </div>
      </PageShell>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participationPeriod) { setError('참여 기간을 선택해주세요.'); return; }
    if (belongingScore == null) { setError('소속감을 선택해주세요.'); return; }
    if (!teamImpact) { setError('팀 구성 영향을 선택해주세요.'); return; }
    if (reEnrollScore == null) { setError('재수강 의향 점수를 선택해주세요.'); return; }
    setError('');
    setSubmitting(true);

    const res = await publicRefundSurveyApi.submit({
      branchSeq: decoded.branchSeq,
      refundRequestSeq: decoded.refundRequestSeq,
      memberName: decoded.name,
      phoneNumber: decoded.phone,
      participationPeriod,
      belongingScore,
      teamImpact,
      differenceComment: differenceComment.trim(),
      improvementComment: improvementComment.trim(),
      reEnrollScore,
    });

    setSubmitting(false);
    if (res.success) {
      const from = searchParams.get('from');
      const successRoute = from === 'refund' ? ROUTES.PUBLIC_REFUND_SUCCESS : ROUTES.PUBLIC_REFUND_SURVEY_SUCCESS;
      router.push(`${successRoute}?name=${encodeURIComponent(decoded.name)}`);
    } else {
      setError(res.message || '제출에 실패했습니다.');
    }
  };

  return (
    <PageShell>
      <div style={{ textAlign: 'center', marginBottom: 30 }}>
        <h1 style={{ color: '#2563eb', fontSize: '1.6rem', marginBottom: 8 }}>E-UT 환불 설문조사</h1>
        <p style={{ color: '#666', fontSize: '0.95rem', margin: 0 }}>
          <strong style={{ color: '#333' }}>{decoded.name}</strong>님, 소중한 의견을 남겨주세요.
        </p>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#dc2626', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Q1 */}
        <QuestionBlock number={1} title="E-UT에 참여한 기간은 얼마나 되셨나요?">
          <RadioGroup options={PERIOD_OPTIONS} value={participationPeriod} onChange={setParticipationPeriod} name="period" />
        </QuestionBlock>

        {/* Q2 */}
        <QuestionBlock number={2} title="E-UT에서 소속감을 느끼셨나요?">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {BELONGING_OPTIONS.map(opt => (
              <label key={opt.value} style={radioLabelStyle(belongingScore === opt.value)}>
                <input type="radio" name="belonging" value={opt.value} checked={belongingScore === opt.value}
                  onChange={() => setBelongingScore(opt.value)} style={{ display: 'none' }} />
                <span style={radioCircle(belongingScore === opt.value)} />
                <span style={{ fontWeight: 600, minWidth: 20 }}>{opt.value}</span>
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </QuestionBlock>

        {/* Q3 */}
        <QuestionBlock number={3} title="팀 구성(합병/분리)이 참여 경험에 영향을 주었나요?">
          <RadioGroup options={TEAM_IMPACT_OPTIONS} value={teamImpact} onChange={setTeamImpact} name="teamImpact" />
        </QuestionBlock>

        {/* Q4 */}
        <QuestionBlock number={4} title="E-UT 등록 당시와 가장 달랐던 점이 무엇인가요?">
          <textarea value={differenceComment} onChange={(e) => setDifferenceComment(e.target.value)}
            placeholder="자유롭게 작성해주세요."
            style={textareaStyle} />
        </QuestionBlock>

        {/* Q5 */}
        <QuestionBlock number={5} title="E-UT이 한 가지 개선해야 한다면 꼭 바뀌면 좋겠다는 부분이 있을까요?">
          <textarea value={improvementComment} onChange={(e) => setImprovementComment(e.target.value)}
            placeholder="자유롭게 작성해주세요."
            style={textareaStyle} />
        </QuestionBlock>

        {/* Q6 */}
        <QuestionBlock number={6} title="위 부분이 바뀐다면 계속 수강하실 마음이 있으신가요?">
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '10px 0' }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" onClick={() => setReEnrollScore(n)}
                style={{
                  width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  fontSize: '1.5rem', transition: 'all 0.2s',
                  background: reEnrollScore != null && n <= reEnrollScore ? '#facc15' : '#e5e7eb',
                  color: reEnrollScore != null && n <= reEnrollScore ? '#92400e' : '#9ca3af',
                }}>
                ★
              </button>
            ))}
          </div>
          {reEnrollScore != null && (
            <p style={{ textAlign: 'center', color: '#666', fontSize: '0.85rem', margin: '4px 0 0' }}>
              {reEnrollScore}점 / 5점
            </p>
          )}
        </QuestionBlock>

        <button type="submit" disabled={submitting}
          style={{
            width: '100%', padding: 14, color: 'white', border: 'none', borderRadius: 8,
            fontSize: '1.1rem', fontWeight: 'bold', cursor: submitting ? 'default' : 'pointer',
            marginTop: 10, background: submitting ? '#ccc' : '#2563eb', transition: 'background 0.2s',
          }}>
          {submitting ? '제출 중...' : '설문 제출하기'}
        </button>
      </form>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: '#f0f4ff', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100vh', padding: 20 }}>
      <div style={{ background: 'white', padding: '36px 32px', borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.08)', width: '100%', maxWidth: 540, marginTop: 20 }}>
        {children}
      </div>
    </div>
  );
}

function QuestionBlock({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28, padding: '18px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
      <div style={{ marginBottom: 14 }}>
        <span style={{ display: 'inline-block', background: '#2563eb', color: 'white', borderRadius: '50%', width: 26, height: 26, textAlign: 'center', lineHeight: '26px', fontSize: '0.8rem', fontWeight: 700, marginRight: 8 }}>
          {number}
        </span>
        <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function RadioGroup({ options, value, onChange, name }: {
  options: string[]; value: string; onChange: (v: string) => void; name: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {options.map(opt => (
        <label key={opt} style={radioLabelStyle(value === opt)}>
          <input type="radio" name={name} value={opt} checked={value === opt}
            onChange={() => onChange(opt)} style={{ display: 'none' }} />
          <span style={radioCircle(value === opt)} />
          <span>{opt}</span>
        </label>
      ))}
    </div>
  );
}

function radioLabelStyle(selected: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
    borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
    background: selected ? '#eff6ff' : 'white',
    border: `1.5px solid ${selected ? '#2563eb' : '#d1d5db'}`,
    fontSize: '0.9rem', color: '#333',
  };
}

function radioCircle(selected: boolean): React.CSSProperties {
  return {
    display: 'inline-block', width: 18, height: 18, borderRadius: '50%',
    border: `2px solid ${selected ? '#2563eb' : '#aaa'}`,
    background: selected ? '#2563eb' : 'white', flexShrink: 0,
    boxShadow: selected ? 'inset 0 0 0 3px white' : 'none',
  };
}

const textareaStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1.5px solid #d1d5db', borderRadius: 8,
  fontSize: '0.9rem', lineHeight: 1.5, resize: 'vertical', minHeight: 80,
  fontFamily: 'inherit', boxSizing: 'border-box',
};
