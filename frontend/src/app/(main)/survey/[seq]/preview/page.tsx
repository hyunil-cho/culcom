'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { surveyApi, SurveyTemplate, SurveySection, SurveyQuestion, SurveyOption } from '@/lib/api';
import fillStyles from '@/app/survey/[seq]/fill/page.module.css';
import s from './page.module.css';

export default function SurveyPreviewPage() {
  const params = useParams();
  const templateSeq = Number(params.seq);

  const [template, setTemplate] = useState<SurveyTemplate | null>(null);
  const [sections, setSections] = useState<SurveySection[]>([]);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [optionsByQ, setOptionsByQ] = useState<Record<number, SurveyOption[]>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className={fillStyles.loading}>로딩 중...</div>;
  if (!template) return <div className={fillStyles.loading}>설문지를 찾을 수 없습니다.</div>;

  const questionsForSection = (sectionSeq: number) => questions.filter(q => q.sectionSeq === sectionSeq);
  const totalPages = sections.length + 1;
  const goToPage = (idx: number) => { setCurrentPage(idx); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const BASIC_INFO_FIELDS = [
    { key: 'name', title: '성함', type: 'text', placeholder: '홍길동' },
    { key: 'phone', title: '연락처', type: 'tel', placeholder: '010-0000-0000' },
    { key: 'gender', title: '성별', type: 'radio', options: ['남성', '여성'] },
    { key: 'location', title: '사는 곳', type: 'text', placeholder: '예) 서울 강남구 역삼동', hint: '동까지만 입력' },
    { key: 'age_group', title: '연령대', type: 'radio', options: ['10대', '20대', '30대', '40대', '50대 이상'] },
    { key: 'occupation', title: '현재 직군', type: 'radio', options: ['학생', '직장인', '자영업', '프리랜서', '주부', '기타'] },
    { key: 'ad_source', title: 'E-UT를 어떻게 알고 오셨나요?', type: 'radio', options: ['인스타그램', '블로그', '유튜브', '지인 추천', '기타'] },
  ] as const;

  const hintText = (q: SurveyQuestion) => {
    if (q.inputType === 'text') return '주관식';
    if (q.inputType === 'checkbox') return '중복 선택 가능';
    return '하나만 선택';
  };

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
    <div className={fillStyles.body}>
      <div className={fillStyles.wrapper}>
        <div className={fillStyles.header}>
          <div className={fillStyles.templateTitle}>{template.name}</div>
          {template.description && <div className={fillStyles.notice}>{template.description}</div>}
          <div className={s.previewNote}>미리보기 모드 -- 실제 입력은 비활성화되어 있습니다.</div>
        </div>

        {totalPages > 1 && (
          <div className={fillStyles.progressBar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
              <div className={currentPage === 0 ? fillStyles.stepDotActive : fillStyles.stepDotDone}>
                {currentPage > 0 ? '\u2713' : 1}
              </div>
              <span className={currentPage === 0 ? fillStyles.stepLabelActive : fillStyles.stepLabel}>고객 기본 정보</span>
            </div>
            {sections.map((sec, i) => (
              <div key={sec.seq} style={{ display: 'contents' }}>
                <div className={fillStyles.stepLine} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                  <div className={i + 1 === currentPage ? fillStyles.stepDotActive : i + 1 < currentPage ? fillStyles.stepDotDone : fillStyles.stepDot}>
                    {i + 1 < currentPage ? '\u2713' : i + 2}
                  </div>
                  <span className={i + 1 === currentPage ? fillStyles.stepLabelActive : fillStyles.stepLabel}>{sec.title}</span>
                </div>
              </div>
            ))}
          </div>
        )}

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
          const secQuestions = questionsForSection(sec.seq);
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

        <div className={fillStyles.footer}>미리보기 모드입니다. 실제 제출은 되지 않습니다.</div>
      </div>
    </div>
  );
}
