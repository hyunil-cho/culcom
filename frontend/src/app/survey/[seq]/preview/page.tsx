'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { SurveyQuestion } from '@/lib/api';
import { useSurveyData } from '../_shared/useSurveyData';
import { BASIC_INFO_FIELDS, hintText, questionsForSection } from '../_shared/surveyConstants';
import SurveyShell from '../_shared/SurveyShell';
import fillStyles from '../fill/page.module.css';
import s from './page.module.css';

export default function SurveyPreviewPage() {
  const params = useParams();
  const templateSeq = Number(params.seq);
  const { template, sections, questions, optionsByQ, loading } = useSurveyData(templateSeq);
  const [currentPage, setCurrentPage] = useState(0);

  if (loading) return <div className={fillStyles.loading}>로딩 중...</div>;
  if (!template) return <div className={fillStyles.loading}>설문지를 찾을 수 없습니다.</div>;

  const totalPages = sections.length + 1;
  const goToPage = (idx: number) => { setCurrentPage(idx); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const renderInput = (q: SurveyQuestion) => {
    const opts = optionsByQ[q.seq] || [];
    const inputName = q.questionKey + (q.inputType === 'checkbox' ? '[]' : '');
    const groups = q.isGrouped && q.groupLabel ? q.groupLabel.split(',').map(g => g.trim()).filter(Boolean) : [];

    if (q.inputType === 'text') {
      return <textarea name={q.questionKey} className={fillStyles.textInput} placeholder="직접 입력해주세요." readOnly />;
    }

    if (q.isGrouped && groups.length > 0) {
      const cols = groups.length <= 2 ? 2 : 3;
      return (
        <div className={cols === 2 ? s.groupGrid2 : s.groupGrid3}>
          {groups.map(group => {
            const groupOpts = opts.filter(o => o.groupName === group);
            return (
              <div key={group} className={fillStyles.groupCol}>
                <div className={fillStyles.groupColTitle}>{group}</div>
                <div className={s.groupItems}>
                  {groupOpts.map(o => (
                    <label key={o.seq} className={fillStyles.chipInGroup}>
                      <input type={q.inputType} name={inputName} value={o.label} disabled className={s.hiddenInput} />
                      {o.label}
                    </label>
                  ))}
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
        {opts.map(o => (
          <label key={o.seq} className={fillStyles.chip}>
            <input type={q.inputType} name={inputName} value={o.label} disabled className={s.hiddenInput} />
            {o.label}
          </label>
        ))}
      </div>
    );
  };

  return (
    <SurveyShell
      template={template}
      sections={sections}
      currentPage={currentPage}
      headerExtra={<div className={s.previewNote}>미리보기 모드 -- 실제 입력은 비활성화되어 있습니다.</div>}
      footerText="미리보기 모드입니다. 실제 제출은 되지 않습니다."
    >
      {currentPage === 0 && (
        <div>
          <div className={fillStyles.card}>
            <div className={fillStyles.sectionHeader}>
              <span className={fillStyles.sectionBadge}>Section 1</span>
              <span className={fillStyles.sectionTitle}>고객 기본 정보</span>
            </div>
            {BASIC_INFO_FIELDS.map(field => (
              <div key={field.key} className={fillStyles.fieldGroup}>
                <label className={fillStyles.fieldLabel}>
                  {field.title}
                  <span className={fillStyles.requiredMark}>*</span>
                  {'hint' in field && field.hint && <span className={fillStyles.hint}>{field.hint}</span>}
                </label>
                {field.type === 'radio' && 'options' in field ? (
                  <div className={s.chipRow}>
                    {field.options.map(opt => (
                      <label key={opt} className={fillStyles.chip}>
                        <input type="radio" name={field.key} value={opt} disabled className={s.hiddenInput} />
                        {opt}
                      </label>
                    ))}
                  </div>
                ) : (
                  <input type={field.type === 'tel' ? 'tel' : 'text'} placeholder={'placeholder' in field ? field.placeholder : ''} disabled
                    className={fillStyles.textInputSingle} />
                )}
              </div>
            ))}
          </div>
          <div className={fillStyles.formNav}>
            {totalPages > 1 ? (
              <button type="button" className={fillStyles.btnNext} onClick={() => goToPage(1)}>다음 단계 &rarr;</button>
            ) : (
              <button type="button" className={s.btnSubmit} disabled>설문 제출하기 (미리보기)</button>
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
            <div className={fillStyles.card}>
              <div className={fillStyles.sectionHeader}>
                <span className={fillStyles.sectionBadge}>Section {pageIdx + 1}</span>
                <span className={fillStyles.sectionTitle}>{sec.title}</span>
              </div>
              {secQuestions.length === 0 ? (
                <p className={s.emptySection}>이 섹션에 질문이 없습니다.</p>
              ) : secQuestions.map(q => (
                <div key={q.seq} className={fillStyles.fieldGroup}>
                  <label className={fillStyles.fieldLabel}>
                    {q.title}
                    {q.required && <span className={fillStyles.requiredMark}>*</span>}
                    <span className={fillStyles.hint}>{hintText(q)}</span>
                  </label>
                  {renderInput(q)}
                </div>
              ))}
            </div>
            <div className={fillStyles.formNav}>
              <button type="button" className={fillStyles.btnPrev} onClick={() => goToPage(pageIdx - 1)}>&larr; 이전</button>
              {pageIdx < totalPages - 1 ? (
                <button type="button" className={fillStyles.btnNext} onClick={() => goToPage(pageIdx + 1)}>다음 단계 &rarr;</button>
              ) : (
                <button type="button" className={s.btnSubmit} disabled>설문 제출하기 (미리보기)</button>
              )}
            </div>
          </div>
        );
      })}

      {sections.length === 0 && currentPage !== 0 && (
        <div className={fillStyles.card}><p className={s.emptySection}>섹션이 없습니다. 편집 페이지에서 섹션과 질문을 추가하세요.</p></div>
      )}
    </SurveyShell>
  );
}
