'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { surveyApi, SurveyTemplate, SurveySection, SurveyQuestion, SurveyOption } from '@/lib/api';

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

  if (loading) return <div style={styles.loading}>로딩 중...</div>;
  if (!template) return <div style={styles.loading}>설문지를 찾을 수 없습니다.</div>;

  const questionsForSection = (sectionSeq: number) =>
    questions.filter(q => q.sectionSeq === sectionSeq);

  // 총 페이지 = 1(고객 기본 정보) + sections.length
  const totalPages = sections.length + 1;

  const goToPage = (idx: number) => {
    setCurrentPage(idx);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const BASIC_INFO_FIELDS = [
    { key: 'name', title: '성함', type: 'text', placeholder: '홍길동' },
    { key: 'phone', title: '연락처', type: 'tel', placeholder: '010-0000-0000' },
    { key: 'gender', title: '성별', type: 'radio', options: ['남성', '여성'] },
    { key: 'location', title: '사는 곳', type: 'text', placeholder: '예) 서울 강남구 역삼동', hint: '동까지만 입력' },
    { key: 'age_group', title: '연령대', type: 'radio', options: ['10대', '20대', '30대', '40대', '50대 이상'] },
    { key: 'occupation', title: '현재 직군', type: 'radio', options: ['학생', '직장인', '자영업', '프리랜서', '주부', '기타'] },
    { key: 'ad_source', title: 'E-UT를 어떻게 알고 오셨나요?', type: 'radio', options: ['인스타그램', '블로그', '유튜브', '지인 추천', '기타'] },
  ] as const;

  const renderInput = (q: SurveyQuestion) => {
    const opts = optionsByQ[q.seq] || [];
    const inputName = q.questionKey + (q.inputType === 'checkbox' ? '[]' : '');
    const groups = q.isGrouped && q.groups ? q.groups.split(',').map(g => g.trim()).filter(Boolean) : [];

    if (q.inputType === 'text') {
      return <textarea name={q.questionKey} style={styles.textInput} placeholder="직접 입력해주세요." readOnly />;
    }

    // 그룹형
    if (q.isGrouped && groups.length > 0) {
      const cols = groups.length <= 2 ? 2 : 3;
      return (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '1rem' }}>
          {groups.map(group => {
            const groupOpts = opts.filter(o => o.groupName === group);
            return (
              <div key={group} style={styles.groupCol}>
                <div style={styles.groupColTitle}>{group}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {groupOpts.map(o => (
                    <label key={o.seq} style={styles.chipInGroup}>
                      <input type={q.inputType} name={inputName} value={o.label} disabled />
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

    // 플랫형
    if (opts.length === 0) {
      return <span style={{ color: '#aaa', fontSize: '0.9rem' }}>선택지가 없습니다.</span>;
    }

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {opts.map(o => (
          <label key={o.seq} style={styles.chip}>
            <input type={q.inputType} name={inputName} value={o.label} disabled style={{ display: 'none' }} />
            {o.label}
          </label>
        ))}
      </div>
    );
  };

  const hintText = (q: SurveyQuestion) => {
    if (q.inputType === 'text') return '주관식';
    if (q.inputType === 'checkbox') return '중복 선택 가능';
    return '하나만 선택';
  };

  return (
    <div style={styles.body}>
      <div style={styles.wrapper}>
        {/* 헤더 */}
        <div style={styles.header}>
          <div style={styles.title}>{template.name}</div>
          {template.description && (
            <div style={styles.notice}>{template.description}</div>
          )}
          <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: '#e03131', fontWeight: 600 }}>
            미리보기 모드 -- 실제 입력은 비활성화되어 있습니다.
          </div>
        </div>

        {/* 프로그레스 바 */}
        {totalPages > 1 && (
          <div style={styles.progressBar}>
            {/* 고객 기본 정보 스텝 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
              <div style={{
                ...styles.stepDot,
                ...(currentPage === 0 ? styles.stepDotActive : styles.stepDotDone),
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
                <div style={styles.stepLine} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                  <div style={{
                    ...styles.stepDot,
                    ...(i + 1 === currentPage ? styles.stepDotActive : i + 1 < currentPage ? styles.stepDotDone : {}),
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

        {/* 고객 기본 정보 페이지 (항상 첫 페이지) */}
        {currentPage === 0 && (
          <div>
            <div style={styles.card}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionBadge}>Section 1</span>
                <span style={styles.sectionTitle}>고객 기본 정보</span>
              </div>

              {BASIC_INFO_FIELDS.map(field => (
                <div key={field.key} style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>
                    {field.title}
                    <span style={{ color: '#e53e3e', marginLeft: 3 }}>*</span>
                    {'hint' in field && field.hint && <span style={styles.hint}>{field.hint}</span>}
                  </label>
                  {field.type === 'radio' && 'options' in field ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {field.options.map(opt => (
                        <label key={opt} style={styles.chip}>
                          <input type="radio" name={field.key} value={opt} disabled style={{ display: 'none' }} />
                          {opt}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <input type={field.type === 'tel' ? 'tel' : 'text'} placeholder={'placeholder' in field ? field.placeholder : ''} disabled
                      style={{ ...styles.textInput, minHeight: 'auto', resize: 'none', padding: '0.75rem 1rem' } as React.CSSProperties} />
                  )}
                </div>
              ))}
            </div>

            <div style={styles.formNav}>
              {totalPages > 1 && (
                <button type="button" style={styles.btnNext} onClick={() => goToPage(1)}>
                  다음 단계 &rarr;
                </button>
              )}
            </div>
          </div>
        )}

        {/* 섹션 페이지들 */}
        {sections.map((sec, i) => {
          const pageIdx = i + 1;
          if (pageIdx !== currentPage) return null;
          const secQuestions = questionsForSection(sec.seq);

          return (
            <div key={sec.seq}>
              <div style={styles.card}>
                <div style={styles.sectionHeader}>
                  <span style={styles.sectionBadge}>Section {pageIdx + 1}</span>
                  <span style={styles.sectionTitle}>{sec.title}</span>
                </div>

                {secQuestions.length === 0 ? (
                  <p style={{ color: '#aaa', textAlign: 'center', padding: '2rem 0' }}>이 섹션에 질문이 없습니다.</p>
                ) : (
                  secQuestions.map(q => (
                    <div key={q.seq} style={styles.fieldGroup}>
                      <label style={styles.fieldLabel}>
                        {q.title}
                        {q.required && <span style={{ color: '#e53e3e', marginLeft: 3 }}>*</span>}
                        <span style={styles.hint}>{hintText(q)}</span>
                      </label>
                      {renderInput(q)}
                    </div>
                  ))
                )}
              </div>

              {/* 네비게이션 버튼 */}
              <div style={styles.formNav}>
                <button type="button" style={styles.btnPrev} onClick={() => goToPage(pageIdx - 1)}>
                  &larr; 이전
                </button>
                {pageIdx < totalPages - 1 ? (
                  <button type="button" style={styles.btnNext} onClick={() => goToPage(pageIdx + 1)}>
                    다음 단계 &rarr;
                  </button>
                ) : (
                  <button type="button" style={styles.btnSubmit} disabled>
                    설문 제출하기 (미리보기)
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {sections.length === 0 && currentPage !== 0 && (
          <div style={styles.card}>
            <p style={{ color: '#aaa', textAlign: 'center', padding: '2rem 0' }}>섹션이 없습니다. 편집 페이지에서 섹션과 질문을 추가하세요.</p>
          </div>
        )}

        <div style={styles.footer}>
          미리보기 모드입니다. 실제 제출은 되지 않습니다.
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  body: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", sans-serif',
    background: '#f6faf8', color: '#1a1a1a', minHeight: '100vh', padding: '2rem 1rem 4rem',
  },
  wrapper: { maxWidth: 720, margin: '0 auto' },
  loading: { textAlign: 'center', padding: '3rem', color: '#888' },
  header: { textAlign: 'center', marginBottom: '2.5rem' },
  title: { fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' },
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
    minHeight: 80, lineHeight: 1.6, background: '#fafafa',
  },
  chip: {
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.45rem 0.9rem', border: '1.5px solid #dde8e3', borderRadius: 24,
    fontSize: '0.9rem', cursor: 'default', background: 'white', userSelect: 'none',
  },
  chipInGroup: {
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.4rem 0.75rem', borderRadius: 8, fontSize: '0.85rem',
    background: 'white', border: '1px solid transparent', cursor: 'default',
  },
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
  btnSubmit: {
    flex: 1, padding: '1rem', borderRadius: 10, fontSize: '1rem', fontWeight: 700,
    fontFamily: 'inherit', cursor: 'not-allowed', background: '#999', color: 'white', border: 'none',
    opacity: 0.7,
  },
  footer: { textAlign: 'center', marginTop: '2rem', fontSize: '0.82rem', color: '#666' },
};
