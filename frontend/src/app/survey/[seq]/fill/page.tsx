'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { surveyApi, publicSurveyApi, SurveyTemplate, SurveySection, SurveyQuestion, SurveyOption } from '@/lib/api';
import SurveyComplete from './SurveyComplete';
import s from './page.module.css';

export default function SurveyFillPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const templateSeq = Number(params.seq);

  const decoded = (() => {
    try {
      const d = searchParams.get('d');
      if (!d) return { name: '', phone: '', reservationSeq: '' };
      return JSON.parse(decodeURIComponent(atob(d))) as { name: string; phone: string; reservationSeq: string | number };
    } catch { return { name: '', phone: '', reservationSeq: '' }; }
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
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [basicInfo, setBasicInfo] = useState({
    name: customerName || '', phone: customerPhone || '',
    gender: '', location: '', age_group: '', occupation: '', ad_source: '',
  });

  const load = useCallback(async () => {
    const [tplRes, secRes, qRes, oRes] = await Promise.all([
      surveyApi.getTemplate(templateSeq), surveyApi.listSections(templateSeq),
      surveyApi.listQuestions(templateSeq), surveyApi.listOptions(templateSeq),
    ]);
    if (tplRes.success) setTemplate(tplRes.data);
    if (secRes.success) setSections(secRes.data);
    if (qRes.success) setQuestions(qRes.data);
    if (oRes.success) {
      const grouped: Record<number, SurveyOption[]> = {};
      for (const o of oRes.data) { if (!grouped[o.questionSeq]) grouped[o.questionSeq] = []; grouped[o.questionSeq].push(o); }
      setOptionsByQ(grouped);
    }
    setLoading(false);
  }, [templateSeq]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { document.title = template ? template.name : '설문'; }, [template]);

  if (loading) return <div className={s.loading}>로딩 중...</div>;
  if (!template) return <div className={s.loading}>설문지를 찾을 수 없습니다.</div>;
  if (submitted) return <SurveyComplete name={basicInfo.name || customerName} />;

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
      if (!val || !val.trim()) { alert(`"${field.title}" 항목은 필수입니다.`); return false; }
    }
    return true;
  };

  const formatPhone = (v: string) => {
    const digits = v.replace(/[^0-9]/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return digits.slice(0, 3) + '-' + digits.slice(3);
    return digits.slice(0, 3) + '-' + digits.slice(3, 7) + '-' + digits.slice(7, 11);
  };

  const questionsForSection = (sectionSeq: number) => questions.filter(q => q.sectionSeq === sectionSeq);
  const setAnswer = (key: string, value: string | string[]) => setAnswers(prev => ({ ...prev, [key]: value }));
  const toggleCheckbox = (key: string, value: string) => {
    setAnswers(prev => {
      const arr = (prev[key] as string[]) || [];
      return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  };

  const goToPage = (idx: number) => {
    if (idx > currentPage) {
      if (currentPage === 0) { if (!validateBasicInfo()) return; }
      else {
        const sec = sections[currentPage - 1];
        const secQ = questionsForSection(sec.seq);
        for (const q of secQ) {
          if (!q.required) continue;
          const ans = answers[q.questionKey];
          if (!ans || (Array.isArray(ans) && ans.length === 0) || (typeof ans === 'string' && !ans.trim())) {
            alert(`"${q.title}" 항목은 필수입니다.`); return;
          }
        }
      }
    }
    setCurrentPage(idx);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    const sec = sections[currentPage - 1];
    if (sec) {
      const secQ = questionsForSection(sec.seq);
      for (const q of secQ) {
        if (!q.required) continue;
        const ans = answers[q.questionKey];
        if (!ans || (Array.isArray(ans) && ans.length === 0) || (typeof ans === 'string' && !ans.trim())) {
          alert(`"${q.title}" 항목은 필수입니다.`); return;
        }
      }
    }
    await publicSurveyApi.submit({
      templateSeq,
      reservationSeq: reservationSeq ? Number(reservationSeq) : undefined,
      name: basicInfo.name,
      phoneNumber: basicInfo.phone,
      gender: basicInfo.gender,
      location: basicInfo.location,
      ageGroup: basicInfo.age_group,
      occupation: basicInfo.occupation,
      adSource: basicInfo.ad_source,
      answers,
    });
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      return <textarea value={(answers[q.questionKey] as string) || ''} onChange={e => setAnswer(q.questionKey, e.target.value)}
        className={s.textInput} placeholder="직접 입력해주세요." />;
    }

    const inputType = q.inputType as 'radio' | 'checkbox';

    if (q.isGrouped && groups.length > 0) {
      const cols = groups.length <= 2 ? 2 : 3;
      return (
        <div className={cols === 2 ? s.groupGrid2 : s.groupGrid3}>
          {groups.map(group => {
            const groupOpts = opts.filter(o => o.groupName === group);
            return (
              <div key={group} className={s.groupCol}>
                <div className={s.groupColTitle}>{group}</div>
                <div className={s.groupItems}>
                  {groupOpts.map(o => {
                    const checked = inputType === 'radio' ? answers[q.questionKey] === o.label : ((answers[q.questionKey] as string[]) || []).includes(o.label);
                    return (
                      <label key={o.seq} className={checked ? s.chipInGroupChecked : s.chipInGroup}
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

    if (opts.length === 0) return <span className={s.noOptions}>선택지가 없습니다.</span>;

    return (
      <div className={s.chipRow}>
        {opts.map(o => {
          const checked = inputType === 'radio' ? answers[q.questionKey] === o.label : ((answers[q.questionKey] as string[]) || []).includes(o.label);
          return (
            <label key={o.seq} className={checked ? s.chipChecked : s.chip}
              onClick={() => inputType === 'radio' ? setAnswer(q.questionKey, o.label) : toggleCheckbox(q.questionKey, o.label)}>
              {o.label}
            </label>
          );
        })}
      </div>
    );
  };

  return (
    <div className={s.body}>
      <div className={s.wrapper}>
        <div className={s.header}>
          <div className={s.templateTitle}>{template.name}</div>
          {template.description && <div className={s.notice}>{template.description}</div>}
          {(customerName || customerPhone) && (
            <div className={s.noticeCustomer}>
              <strong>예약 고객:</strong> {customerName} {customerPhone && `(${customerPhone})`}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className={s.progressBar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
              <div className={currentPage === 0 ? s.stepDotActive : s.stepDotDone}>
                {currentPage > 0 ? '\u2713' : 1}
              </div>
              <span className={currentPage === 0 ? s.stepLabelActive : s.stepLabel}>고객 기본 정보</span>
            </div>
            {sections.map((sec, i) => (
              <div key={sec.seq} style={{ display: 'contents' }}>
                <div className={s.stepLine} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                  <div className={i + 1 === currentPage ? s.stepDotActive : i + 1 < currentPage ? s.stepDotDone : s.stepDot}>
                    {i + 1 < currentPage ? '\u2713' : i + 2}
                  </div>
                  <span className={i + 1 === currentPage ? s.stepLabelActive : s.stepLabel}>{sec.title}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <input type="hidden" name="reservation_seq" value={reservationSeq} />
        <input type="hidden" name="customer_name" value={customerName} />
        <input type="hidden" name="customer_phone" value={customerPhone} />

        {currentPage === 0 && (
          <div>
            <div className={s.card}>
              <div className={s.sectionHeader}>
                <span className={s.sectionBadge}>Section 1</span>
                <span className={s.sectionTitle}>고객 기본 정보</span>
              </div>
              {BASIC_INFO_FIELDS.map(field => (
                <div key={field.key} className={s.fieldGroup}>
                  <label className={s.fieldLabel}>
                    {field.title}
                    <span className={s.requiredMark}>*</span>
                    {'hint' in field && field.hint && <span className={s.hint}>{field.hint}</span>}
                  </label>
                  {field.type === 'radio' && 'options' in field && field.options ? (
                    <div className={s.chipRow}>
                      {field.options.map(opt => {
                        const checked = basicInfo[field.key] === opt;
                        return (
                          <label key={opt} className={checked ? s.chipChecked : s.chip}
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
                      className={s.textInputSingle}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className={s.formNav}>
              {totalPages > 1 && (
                <button type="button" className={s.btnNext} onClick={() => goToPage(1)}>다음 단계 &rarr;</button>
              )}
            </div>
          </div>
        )}

        {sections.map((sec, i) => {
          const pageIdx = i + 1;
          if (pageIdx !== currentPage) return null;
          const secQuestions = questionsForSection(sec.seq);
          return (
            <div key={sec.seq}>
              <div className={s.card}>
                <div className={s.sectionHeader}>
                  <span className={s.sectionBadge}>Section {pageIdx + 1}</span>
                  <span className={s.sectionTitle}>{sec.title}</span>
                </div>
                {secQuestions.length === 0 ? (
                  <p className={s.emptySection}>이 섹션에 질문이 없습니다.</p>
                ) : secQuestions.map(q => (
                  <div key={q.seq} className={s.fieldGroup}>
                    <label className={s.fieldLabel}>
                      {q.title}
                      {q.required && <span className={s.requiredMark}>*</span>}
                      <span className={s.hint}>{hintText(q)}</span>
                    </label>
                    {renderInput(q)}
                  </div>
                ))}
              </div>
              <div className={s.formNav}>
                <button type="button" className={s.btnPrev} onClick={() => goToPage(pageIdx - 1)}>&larr; 이전</button>
                {pageIdx < totalPages - 1 ? (
                  <button type="button" className={s.btnNext} onClick={() => goToPage(pageIdx + 1)}>다음 단계 &rarr;</button>
                ) : (
                  <button type="button" className={s.btnNext} onClick={handleSubmit}>설문 제출하기</button>
                )}
              </div>
            </div>
          );
        })}

        {sections.length === 0 && currentPage !== 0 && (
          <div className={s.card}><p className={s.emptySection}>섹션이 없습니다.</p></div>
        )}

        <div className={s.footer}>입력하신 정보는 상담 목적으로만 사용됩니다.</div>
      </div>
    </div>
  );
}
