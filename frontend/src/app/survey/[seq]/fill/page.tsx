'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { surveyApi, SurveyTemplate, SurveySection, SurveyQuestion, SurveyOption } from '@/lib/api';

export default function SurveyFillPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const templateSeq = Number(params.seq);

  const decoded = (() => {
    try {
      const d = searchParams.get('d');
      if (!d) return { name: '', phone: '', reservationSeq: '' };
      return JSON.parse(decodeURIComponent(atob(d))) as { name: string; phone: string; reservationSeq: string | number };
    } catch {
      return { name: '', phone: '', reservationSeq: '' };
    }
  })();
  const customerName = decoded.name || '';
  const customerPhone = decoded.phone || '';
  const reservationSeq = String(decoded.reservationSeq || '');

  const [template, setTemplate] = useState<SurveyTemplate | null>(null);
  const [sections, setSections] = useState<SurveySection[]>([]);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [optionsByQ, setOptionsByQ] = useState<Record<number, SurveyOption[]>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [basicInfo, setBasicInfo] = useState({
    name: customerName || '',
    phone: customerPhone || '',
    gender: '',
    location: '',
    age_group: '',
    occupation: '',
    ad_source: '',
  });

  const load = useCallback(async () => {
    const [tplRes, secRes, qRes, oRes] = await Promise.all([
      surveyApi.getTemplate(templateSeq),
      surveyApi.listSections(templateSeq),
      surveyApi.listQuestions(templateSeq),
      surveyApi.listOptions(templateSeq),
    ]);
    if (tplRes.success) setTemplate(tplRes.data);
    if (secRes.success) setSections(secRes.data);
    if (qRes.success) setQuestions(qRes.data);
    if (oRes.success) {
      const grouped: Record<number, SurveyOption[]> = {};
      for (const o of oRes.data) {
        if (!grouped[o.questionSeq]) grouped[o.questionSeq] = [];
        grouped[o.questionSeq].push(o);
      }
      setOptionsByQ(grouped);
    }
    setLoading(false);
  }, [templateSeq]);

  useEffect(() => { load(); }, [load]);

  // 고객용 페이지 — 백오피스 타이틀 숨김
  useEffect(() => {
    document.title = template ? template.name : '설문';
  }, [template]);

  if (loading) return <div style={S.loading}>로딩 중...</div>;
  if (!template) return <div style={S.loading}>설문지를 찾을 수 없습니다.</div>;

  // 총 페이지 = 1(고객 기본 정보) + sections.length
  const totalPages = sections.length + 1;

  const BASIC_INFO_FIELDS = [
    { key: 'name' as const, title: '성함', type: 'text', placeholder: '홍길동' },
    { key: 'phone' as const, title: '연락처', type: 'tel', placeholder: '010-0000-0000' },
    { key: 'gender' as const, title: '성별', type: 'radio', options: ['남성', '여성'] },
    { key: 'location' as const, title: '사는 곳', type: 'text', placeholder: '예) 서울 강남구 역삼동', hint: '동까지만 입력' },
    { key: 'age_group' as const, title: '연령대', type: 'radio', options: ['10대', '20대', '30대', '40대', '50대 이상'] },
    { key: 'occupation' as const, title: '현재 직군', type: 'radio', options: ['학생', '직장인', '자영업', '프리랜서', '주부', '기타'] },
    { key: 'ad_source' as const, title: 'E-UT를 어떻게 알고 오셨나요?', type: 'radio', options: ['인스타그램', '블로그', '유튜브', '지인 추천', '기타'] },
  ];

  const validateBasicInfo = (): boolean => {
    for (const field of BASIC_INFO_FIELDS) {
      const val = basicInfo[field.key];
      if (!val || !val.trim()) {
        alert(`"${field.title}" 항목은 필수입니다.`);
        return false;
      }
    }
    return true;
  };

  const formatPhone = (v: string) => {
    const digits = v.replace(/[^0-9]/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return digits.slice(0, 3) + '-' + digits.slice(3);
    return digits.slice(0, 3) + '-' + digits.slice(3, 7) + '-' + digits.slice(7, 11);
  };

  const questionsForSection = (sectionSeq: number) =>
    questions.filter(q => q.sectionSeq === sectionSeq);

  const setAnswer = (key: string, value: string | string[]) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const toggleCheckbox = (key: string, value: string) => {
    setAnswers(prev => {
      const arr = (prev[key] as string[]) || [];
      return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  };

  const goToPage = (idx: number) => {
    // 현재 페이지 필수 검증
    if (idx > currentPage) {
      if (currentPage === 0) {
        // 고객 기본 정보 검증
        if (!validateBasicInfo()) return;
      } else {
        const sec = sections[currentPage - 1];
        const secQ = questionsForSection(sec.seq);
        for (const q of secQ) {
          if (!q.required) continue;
          const ans = answers[q.questionKey];
          if (!ans || (Array.isArray(ans) && ans.length === 0) || (typeof ans === 'string' && !ans.trim())) {
            alert(`"${q.title}" 항목은 필수입니다.`);
            return;
          }
        }
      }
    }
    setCurrentPage(idx);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = () => {
    // 마지막 페이지 필수 검증
    const sec = sections[currentPage - 1];
    if (sec) {
      const secQ = questionsForSection(sec.seq);
      for (const q of secQ) {
        if (!q.required) continue;
        const ans = answers[q.questionKey];
        if (!ans || (Array.isArray(ans) && ans.length === 0) || (typeof ans === 'string' && !ans.trim())) {
          alert(`"${q.title}" 항목은 필수입니다.`);
          return;
        }
      }
    }
    // TODO: 실제 제출 API 연동
    alert('설문이 제출되었습니다. 감사합니다!');
  };

  const hintText = (q: SurveyQuestion) => {
    if (q.inputType === 'text') return '주관식';
    if (q.inputType === 'checkbox') return '중복 선택 가능';
    return '하나만 선택';
  };

  const renderInput = (q: SurveyQuestion) => {
    const opts = optionsByQ[q.seq] || [];
    const groups = q.isGrouped && q.groups ? q.groups.split(',').map(g => g.trim()).filter(Boolean) : [];

    if (q.inputType === 'text') {
      return (
        <textarea
          value={(answers[q.questionKey] as string) || ''}
          onChange={e => setAnswer(q.questionKey, e.target.value)}
          style={S.textInput} placeholder="직접 입력해주세요."
        />
      );
    }

    const inputType = q.inputType as 'radio' | 'checkbox';

    // 그룹형
    if (q.isGrouped && groups.length > 0) {
      const cols = groups.length <= 2 ? 2 : 3;
      return (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '1rem' }}>
          {groups.map(group => {
            const groupOpts = opts.filter(o => o.groupName === group);
            return (
              <div key={group} style={S.groupCol}>
                <div style={S.groupColTitle}>{group}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {groupOpts.map(o => {
                    const checked = inputType === 'radio'
                      ? answers[q.questionKey] === o.label
                      : ((answers[q.questionKey] as string[]) || []).includes(o.label);
                    return (
                      <label key={o.seq} style={{ ...S.chipInGroup, ...(checked ? S.chipChecked : {}) }}
                        onClick={() => inputType === 'radio' ? setAnswer(q.questionKey, o.label) : toggleCheckbox(q.questionKey, o.label)}>
                        {o.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // 플랫형
    if (opts.length === 0) {
      return <span style={{ color: '#aaa', fontSize: '0.9rem' }}>선택지가 없습니다.</span>;
    }

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {opts.map(o => {
          const checked = inputType === 'radio'
            ? answers[q.questionKey] === o.label
            : ((answers[q.questionKey] as string[]) || []).includes(o.label);
          return (
            <label key={o.seq} style={{ ...S.chip, ...(checked ? S.chipChecked : {}) }}
              onClick={() => inputType === 'radio' ? setAnswer(q.questionKey, o.label) : toggleCheckbox(q.questionKey, o.label)}>
              {o.label}
            </label>
          );
        })}
      </div>
    );
  };

  return (
    <div style={S.body}>
      <div style={S.wrapper}>
        {/* 헤더 */}
        <div style={S.header}>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#2d7a4f', letterSpacing: -1, marginBottom: '0.5rem' }}>
            {template.name}
          </div>
          {template.description && <div style={S.notice}>{template.description}</div>}
          {(customerName || customerPhone) && (
            <div style={{ ...S.notice, background: '#fff8e1', borderLeftColor: '#f59e0b', color: '#92400e', marginTop: '0.75rem' }}>
              <strong>예약 고객:</strong> {customerName} {customerPhone && `(${customerPhone})`}
            </div>
          )}
        </div>

        {/* 프로그레스 바 */}
        {totalPages > 1 && (
          <div style={S.progressBar}>
            {/* 고객 기본 정보 스텝 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
              <div style={{
                ...S.stepDot,
                ...(currentPage === 0 ? S.stepDotActive : S.stepDotDone),
              }}>
                {currentPage > 0 ? '\u2713' : 1}
              </div>
              <span style={{
                fontSize: '0.85rem', fontWeight: currentPage === 0 ? 700 : 500,
                color: currentPage === 0 ? '#2d7a4f' : '#666',
              }}>고객 기본 정보</span>
            </div>
            {sections.map((sec, i) => (
              <div key={sec.seq} style={{ display: 'contents' }}>
                <div style={S.stepLine} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                  <div style={{
                    ...S.stepDot,
                    ...(i + 1 === currentPage ? S.stepDotActive : i + 1 < currentPage ? S.stepDotDone : {}),
                  }}>
                    {i + 1 < currentPage ? '\u2713' : i + 2}
                  </div>
                  <span style={{
                    fontSize: '0.85rem', fontWeight: i + 1 === currentPage ? 700 : 500,
                    color: i + 1 === currentPage ? '#2d7a4f' : '#666',
                  }}>{sec.title}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* hidden fields */}
        <input type="hidden" name="reservation_seq" value={reservationSeq} />
        <input type="hidden" name="customer_name" value={customerName} />
        <input type="hidden" name="customer_phone" value={customerPhone} />

        {/* 고객 기본 정보 페이지 (항상 첫 페이지) */}
        {currentPage === 0 && (
          <div>
            <div style={S.card}>
              <div style={S.sectionHeader}>
                <span style={S.sectionBadge}>Section 1</span>
                <span style={S.sectionTitle}>고객 기본 정보</span>
              </div>

              {BASIC_INFO_FIELDS.map(field => (
                <div key={field.key} style={S.fieldGroup}>
                  <label style={S.fieldLabel}>
                    {field.title}
                    <span style={{ color: '#e53e3e', marginLeft: 3 }}>*</span>
                    {'hint' in field && field.hint && <span style={S.hint}>{field.hint}</span>}
                  </label>
                  {field.type === 'radio' && 'options' in field && field.options ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {field.options.map(opt => {
                        const checked = basicInfo[field.key] === opt;
                        return (
                          <label key={opt} style={{ ...S.chip, ...(checked ? S.chipChecked : {}) }}
                            onClick={() => setBasicInfo(prev => ({ ...prev, [field.key]: opt }))}>
                            {opt}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      type={field.type === 'tel' ? 'tel' : 'text'}
                      value={basicInfo[field.key]}
                      placeholder={'placeholder' in field ? field.placeholder : ''}
                      onChange={e => {
                        const val = field.key === 'phone' ? formatPhone(e.target.value) : e.target.value;
                        setBasicInfo(prev => ({ ...prev, [field.key]: val }));
                      }}
                      style={{ ...S.textInput, minHeight: 'auto', resize: 'none', padding: '0.75rem 1rem' } as React.CSSProperties}
                    />
                  )}
                </div>
              ))}
            </div>

            <div style={S.formNav}>
              {totalPages > 1 && (
                <button type="button" style={S.btnNext} onClick={() => goToPage(1)}>
                  다음 단계 &rarr;
                </button>
              )}
            </div>
          </div>
        )}

        {/* 섹션 페이지 */}
        {sections.map((sec, i) => {
          const pageIdx = i + 1;
          if (pageIdx !== currentPage) return null;
          const secQuestions = questionsForSection(sec.seq);

          return (
            <div key={sec.seq}>
              <div style={S.card}>
                <div style={S.sectionHeader}>
                  <span style={S.sectionBadge}>Section {pageIdx + 1}</span>
                  <span style={S.sectionTitle}>{sec.title}</span>
                </div>

                {secQuestions.length === 0 ? (
                  <p style={{ color: '#aaa', textAlign: 'center', padding: '2rem 0' }}>이 섹션에 질문이 없습니다.</p>
                ) : (
                  secQuestions.map(q => (
                    <div key={q.seq} style={S.fieldGroup}>
                      <label style={S.fieldLabel}>
                        {q.title}
                        {q.required && <span style={{ color: '#e53e3e', marginLeft: 3 }}>*</span>}
                        <span style={S.hint}>{hintText(q)}</span>
                      </label>
                      {renderInput(q)}
                    </div>
                  ))
                )}
              </div>

              <div style={S.formNav}>
                <button type="button" style={S.btnPrev} onClick={() => goToPage(pageIdx - 1)}>
                  &larr; 이전
                </button>
                {pageIdx < totalPages - 1 ? (
                  <button type="button" style={S.btnNext} onClick={() => goToPage(pageIdx + 1)}>
                    다음 단계 &rarr;
                  </button>
                ) : (
                  <button type="button" style={S.btnNext} onClick={handleSubmit}>
                    설문 제출하기
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {sections.length === 0 && currentPage !== 0 && (
          <div style={S.card}>
            <p style={{ color: '#aaa', textAlign: 'center', padding: '2rem 0' }}>섹션이 없습니다.</p>
          </div>
        )}

        <div style={S.footer}>
          입력하신 정보는 상담 목적으로만 사용됩니다.
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  body: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", sans-serif',
    background: '#f6faf8', color: '#1a1a1a', minHeight: '100vh', padding: '2rem 1rem 4rem',
  },
  wrapper: { maxWidth: 720, margin: '0 auto' },
  loading: { textAlign: 'center', padding: '3rem', color: '#888' },
  header: { textAlign: 'center', marginBottom: '2.5rem' },
  notice: {
    background: '#e8f5ee', borderLeft: '4px solid #2d7a4f', borderRadius: 8,
    padding: '1rem 1.25rem', textAlign: 'left', fontSize: '0.95rem',
    color: '#2d7a4f', lineHeight: 1.6, marginTop: '1rem',
  },
  progressBar: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' },
  stepDot: {
    width: 32, height: 32, borderRadius: '50%', background: '#dde8e3', color: '#666',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.85rem', fontWeight: 700, flexShrink: 0,
  },
  stepDotActive: { background: '#2d7a4f', color: 'white' },
  stepDotDone: { background: '#4caf78', color: 'white' },
  stepLine: { flex: 1, height: 2, background: '#dde8e3', borderRadius: 2 },
  card: {
    background: 'white', borderRadius: 12, boxShadow: '0 2px 16px rgba(45,122,79,0.08)',
    padding: '2rem', marginBottom: '1.5rem', border: '1px solid #dde8e3',
  },
  sectionHeader: {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    marginBottom: '1.75rem', paddingBottom: '1rem', borderBottom: '2px solid #e8f5ee',
  },
  sectionBadge: {
    background: '#2d7a4f', color: 'white', fontSize: '0.75rem', fontWeight: 700,
    padding: '0.3rem 0.75rem', borderRadius: 20,
  },
  sectionTitle: { fontSize: '1.15rem', fontWeight: 700 },
  fieldGroup: { marginBottom: '1.75rem' },
  fieldLabel: { display: 'block', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.6rem' },
  hint: { fontSize: '0.8rem', color: '#666', fontWeight: 400, marginLeft: 6 },
  textInput: {
    width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #dde8e3', borderRadius: 8,
    fontSize: '1rem', fontFamily: 'inherit', color: '#1a1a1a', resize: 'vertical',
    minHeight: 80, lineHeight: 1.6,
  },
  chip: {
    display: 'inline-flex', alignItems: 'center', padding: '0.45rem 0.9rem',
    border: '1.5px solid #dde8e3', borderRadius: 24, fontSize: '0.9rem',
    cursor: 'pointer', background: 'white', userSelect: 'none', transition: 'all 0.2s',
  },
  chipInGroup: {
    display: 'inline-flex', alignItems: 'center', padding: '0.4rem 0.75rem',
    borderRadius: 8, fontSize: '0.85rem', background: 'white', border: '1px solid transparent',
    cursor: 'pointer', transition: 'all 0.2s',
  },
  chipChecked: { background: '#2d7a4f', borderColor: '#2d7a4f', color: 'white', fontWeight: 600 },
  groupCol: { background: '#e8f5ee', borderRadius: 10, padding: '1rem' },
  groupColTitle: {
    fontSize: '0.8rem', fontWeight: 700, color: '#2d7a4f',
    marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  formNav: { display: 'flex', gap: '1rem', marginTop: '2rem' },
  btnPrev: {
    flex: 1, padding: '1rem', borderRadius: 10, fontSize: '1rem', fontWeight: 700,
    fontFamily: 'inherit', cursor: 'pointer', background: 'white', color: '#666',
    border: '1.5px solid #dde8e3',
  },
  btnNext: {
    flex: 1, padding: '1rem', borderRadius: 10, fontSize: '1rem', fontWeight: 700,
    fontFamily: 'inherit', cursor: 'pointer', background: '#2d7a4f', color: 'white', border: 'none',
  },
  footer: { textAlign: 'center', marginTop: '2rem', fontSize: '0.82rem', color: '#666' },
};
