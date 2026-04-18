'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { publicSurveyApi, SurveyQuestion } from '@/lib/api';
import { useSurveyData } from '../_shared/useSurveyData';
import { BASIC_INFO_FIELDS, getFieldOptions, hintText, questionsForSection } from '../_shared/surveyConstants';
import SurveyShell from '../_shared/SurveyShell';
import SurveyComplete from './SurveyComplete';
import SurveyConsentStep from './SurveyConsentStep';
import s from './page.module.css';

export default function SurveyFillPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const templateSeq = Number(params.seq);
  const { template, sections, questions, optionsByQ, loading } = useSurveyData(templateSeq);

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

  const [consentData, setConsentData] = useState<{ consentItemSeq: number; agreed: boolean }[] | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [basicInfo, setBasicInfo] = useState({
    name: customerName || '', phone: customerPhone || '',
    gender: '', location: '', age_group: '', occupation: '', ad_source: '',
  });

  useEffect(() => { document.title = template ? template.name : '설문'; }, [template]);

  if (loading) return <div className={s.loading}>로딩 중...</div>;
  if (!template) return <div className={s.loading}>설문지를 찾을 수 없습니다.</div>;
  if (submitted) return <SurveyComplete name={basicInfo.name || customerName} phone={basicInfo.phone || customerPhone} />;

  if (!consentData) {
    return <SurveyConsentStep templateName={template.name} onConsented={(data) => setConsentData(data)} />;
  }

  const totalPages = sections.length + 1;

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
        const secQ = questionsForSection(questions, sec.seq);
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
      const secQ = questionsForSection(questions, sec.seq);
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
      consents: consentData,
    });
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderInput = (q: SurveyQuestion) => {
    const opts = optionsByQ[q.seq] || [];
    const groups = q.isGrouped && q.groupLabel ? q.groupLabel.split(',').map(g => g.trim()).filter(Boolean) : [];

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
    <SurveyShell
      template={template}
      sections={sections}
      currentPage={currentPage}
      headerExtra={(customerName || customerPhone) ? (
        <div className={s.noticeCustomer}>
          <strong>예약 고객:</strong> {customerName} {customerPhone && `(${customerPhone})`}
        </div>
      ) : undefined}
      footerText="입력하신 정보는 상담 목적으로만 사용됩니다."
    >
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
            {BASIC_INFO_FIELDS.map(field => {
              const options = getFieldOptions(template, field.key);
              return (
                <div key={field.key} className={s.fieldGroup}>
                  <label className={s.fieldLabel}>
                    {field.title}
                    <span className={s.requiredMark}>*</span>
                    {'hint' in field && field.hint && <span className={s.hint}>{field.hint}</span>}
                  </label>
                  {options ? (
                    <div className={s.chipRow}>
                      {options.map(opt => {
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
              );
            })}
          </div>
          <div className={s.formNav}>
            {totalPages > 1 ? (
              <button type="button" className={s.btnNext} onClick={() => goToPage(1)}>다음 단계 &rarr;</button>
            ) : (
              <button type="button" className={s.btnNext} onClick={() => { if (validateBasicInfo()) handleSubmit(); }}>설문 제출하기</button>
            )}
          </div>
        </div>
      )}

      {sections.map((sec, i) => {
        const pageIdx = i + 1;
        if (pageIdx !== currentPage) return null;
        const secQuestions = questionsForSection(questions, sec.seq);
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
    </SurveyShell>
  );
}
