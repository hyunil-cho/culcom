'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { surveyApi, SurveyTemplate, SurveySection, SurveyQuestion, SurveyOption } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { Button } from '@/components/ui/Button';

type InputType = 'radio' | 'checkbox' | 'text';

interface QuestionForm {
  questionKey: string;
  title: string;
  inputType: InputType;
  required: boolean;
}

const DEFAULT_CUSTOMER_FIELDS = [
  { title: '성함', type: '텍스트' },
  { title: '연락처', type: '텍스트' },
  { title: '성별', type: '단일선택' },
  { title: '사는 곳 (주소)', type: '텍스트' },
  { title: '연령대', type: '단일선택' },
  { title: '현재 직군', type: '단일선택' },
  { title: 'E-UT를 어떻게 알고 오셨나요?', type: '단일선택' },
];

export default function SurveyEditorPage() {
  const params = useParams();
  const router = useRouter();
  const templateSeq = Number(params.seq);

  const [template, setTemplate] = useState<SurveyTemplate | null>(null);
  const [sections, setSections] = useState<SurveySection[]>([]);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [optionsByQ, setOptionsByQ] = useState<Record<number, SurveyOption[]>>({});
  const [openCards, setOpenCards] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  // 폼 상태
  const [addSectionForm, setAddSectionForm] = useState<{ title: string } | null>(null);
  const [editSectionSeq, setEditSectionSeq] = useState<number | null>(null);
  const [editSectionTitle, setEditSectionTitle] = useState('');
  const [editTemplateName, setEditTemplateName] = useState<string | null>(null);
  const [questionAddForms, setQuestionAddForms] = useState<Record<number, QuestionForm>>({});
  const [questionEditForms, setQuestionEditForms] = useState<Record<number, QuestionForm>>({});
  const [optionAddForms, setOptionAddForms] = useState<Record<string, string>>({});

  // 드래그 상태
  const dragItem = useRef<{ seq: number; sectionSeq: number } | null>(null);
  const dragOverItem = useRef<{ seq: number; sectionSeq: number } | null>(null);

  const load = useCallback(async () => {
    const [tplRes, secRes, qRes, oRes] = await Promise.all([
      surveyApi.getTemplate(templateSeq),
      surveyApi.listSections(templateSeq),
      surveyApi.listQuestions(templateSeq),
      surveyApi.listOptions(templateSeq),
    ]);
    if (tplRes.success) setTemplate(tplRes.data);
    if (secRes.success) setSections(secRes.data);
    if (qRes.success) {
      setQuestions(qRes.data);
      if (qRes.data.length > 0 && openCards.size === 0) {
        setOpenCards(new Set([qRes.data[0].seq]));
      }
    }
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

  const questionsForSection = (sectionSeq: number) =>
    questions.filter(q => q.sectionSeq === sectionSeq);

  const toggleCard = (seq: number) => {
    setOpenCards(prev => {
      const next = new Set(prev);
      next.has(seq) ? next.delete(seq) : next.add(seq);
      return next;
    });
  };

  // ── 드래그앤드롭 ──
  const handleDragStart = (q: SurveyQuestion) => {
    dragItem.current = { seq: q.seq, sectionSeq: q.sectionSeq! };
  };

  const handleDragOver = (e: React.DragEvent, q: SurveyQuestion) => {
    e.preventDefault();
    dragOverItem.current = { seq: q.seq, sectionSeq: q.sectionSeq! };
  };

  const handleDrop = async (e: React.DragEvent, sectionSeq: number) => {
    e.preventDefault();
    if (!dragItem.current || !dragOverItem.current) return;
    if (dragItem.current.sectionSeq !== sectionSeq || dragOverItem.current.sectionSeq !== sectionSeq) return;
    if (dragItem.current.seq === dragOverItem.current.seq) return;

    const secQuestions = [...questionsForSection(sectionSeq)];
    const fromIdx = secQuestions.findIndex(q => q.seq === dragItem.current!.seq);
    const toIdx = secQuestions.findIndex(q => q.seq === dragOverItem.current!.seq);
    if (fromIdx === -1 || toIdx === -1) return;

    // 재배열
    const [moved] = secQuestions.splice(fromIdx, 1);
    secQuestions.splice(toIdx, 0, moved);

    // 키 재배정: q1, q2, q3...
    const items = secQuestions.map((q, i) => ({
      seq: q.seq,
      sortOrder: i + 1,
      newQuestionKey: `q${i + 1}`,
    }));

    // 즉시 UI 반영 (낙관적 업데이트)
    setQuestions(prev => {
      const otherQuestions = prev.filter(q => q.sectionSeq !== sectionSeq);
      const reordered = secQuestions.map((q, i) => ({
        ...q,
        sortOrder: i + 1,
        questionKey: `q${i + 1}`,
      }));
      return [...otherQuestions, ...reordered].sort((a, b) => a.sortOrder - b.sortOrder);
    });

    dragItem.current = null;
    dragOverItem.current = null;

    await surveyApi.reorderQuestions(templateSeq, items);
    load();
  };

  // ── 설문지 이름 수정 ──
  const startEditTemplateName = () => {
    if (template) setEditTemplateName(template.name);
  };
  const handleUpdateTemplateName = async () => {
    if (editTemplateName == null || !editTemplateName.trim()) {
      alert('설문지 이름을 입력해주세요.');
      return;
    }
    const res = await surveyApi.updateTemplate(templateSeq, { name: editTemplateName.trim() });
    if (res.success) { setEditTemplateName(null); load(); }
  };

  // ── 섹션 CRUD ──
  const handleAddSection = async () => {
    if (!addSectionForm || !addSectionForm.title.trim()) { alert('섹션 제목을 입력해주세요.'); return; }
    const res = await surveyApi.createSection(templateSeq, { title: addSectionForm.title.trim() });
    if (res.success) { setAddSectionForm(null); load(); }
  };

  const startEditSection = (sec: SurveySection) => {
    setEditSectionSeq(sec.seq);
    setEditSectionTitle(sec.title);
  };

  const handleUpdateSection = async () => {
    if (editSectionSeq == null || !editSectionTitle.trim()) { alert('섹션 제목을 입력해주세요.'); return; }
    const res = await surveyApi.updateSection(templateSeq, editSectionSeq, { title: editSectionTitle.trim() });
    if (res.success) { setEditSectionSeq(null); load(); }
  };

  const handleDeleteSection = async (sec: SurveySection) => {
    const qCount = questionsForSection(sec.seq).length;
    const msg = qCount > 0
      ? `"${sec.title}" 섹션과 포함된 ${qCount}개 질문을 모두 삭제하시겠습니까?`
      : `"${sec.title}" 섹션을 삭제하시겠습니까?`;
    if (!confirm(msg)) return;
    const res = await surveyApi.deleteSection(templateSeq, sec.seq);
    if (res.success) load();
  };

  // ── 질문 CRUD ──
  const toggleQuestionAddForm = (sectionSeq: number) => {
    setQuestionAddForms(prev => {
      if (prev[sectionSeq]) { const next = { ...prev }; delete next[sectionSeq]; return next; }
      return { ...prev, [sectionSeq]: { questionKey: '', title: '', inputType: 'radio', required: false } };
    });
  };

  const handleAddQuestion = async (sectionSeq: number) => {
    const form = questionAddForms[sectionSeq];
    if (!form) return;
    if (!form.questionKey.trim()) { alert('질문 키를 입력해주세요.'); return; }
    if (!form.title.trim()) { alert('질문 제목을 입력해주세요.'); return; }
    const res = await surveyApi.createQuestion(templateSeq, {
      sectionSeq,
      questionKey: form.questionKey.trim(),
      title: form.title.trim(),
      inputType: form.inputType,
      required: form.required,
    });
    if (res.success) { toggleQuestionAddForm(sectionSeq); load(); }
  };

  const toggleEditQuestion = (q: SurveyQuestion) => {
    setQuestionEditForms(prev => {
      if (prev[q.seq]) { const next = { ...prev }; delete next[q.seq]; return next; }
      return { ...prev, [q.seq]: { questionKey: q.questionKey, title: q.title, inputType: q.inputType, required: q.required } };
    });
  };

  const handleUpdateQuestion = async (q: SurveyQuestion) => {
    const form = questionEditForms[q.seq];
    if (!form) return;
    if (!form.title.trim()) { alert('질문 제목을 입력해주세요.'); return; }
    const res = await surveyApi.updateQuestion(templateSeq, q.seq, {
      questionKey: form.questionKey, title: form.title, inputType: form.inputType, required: form.required,
    });
    if (res.success) {
      setQuestionEditForms(prev => { const next = { ...prev }; delete next[q.seq]; return next; });
      load();
    }
  };

  const handleDeleteQuestion = async (q: SurveyQuestion) => {
    if (!confirm(`"${q.title}" 질문과 모든 선택지를 삭제하시겠습니까?`)) return;
    await surveyApi.deleteQuestion(templateSeq, q.seq);
    load();
  };

  const handleToggleRequired = async (q: SurveyQuestion) => {
    await surveyApi.updateQuestion(templateSeq, q.seq, { required: !q.required });
    load();
  };

  const handleTypeChange = async (q: SurveyQuestion, inputType: InputType) => {
    await surveyApi.updateQuestion(templateSeq, q.seq, { inputType });
    load();
  };

  // ── 선택지 CRUD ──
  const handleAddOption = async (questionSeq: number, groupName: string, formId: string) => {
    const label = optionAddForms[formId];
    if (!label?.trim()) return;
    const res = await surveyApi.createOption(templateSeq, {
      questionSeq, groupName: groupName || undefined, label: label.trim(),
    });
    if (res.success) {
      setOptionAddForms(prev => { const n = { ...prev }; delete n[formId]; return n; });
      load();
    }
  };

  const handleDeleteOption = async (optionSeq: number, label: string) => {
    if (!confirm(`"${label}" 선택지를 삭제하시겠습니까?`)) return;
    await surveyApi.deleteOption(templateSeq, optionSeq);
    load();
  };

  // ── 렌더 ──
  if (loading) return <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>로딩 중...</div>;
  if (!template) return <div className="card">설문지를 찾을 수 없습니다.</div>;

  const typeLabel: Record<InputType, string> = { radio: '단일선택', checkbox: '다중선택', text: '주관식' };
  const typeColor: Record<InputType, { bg: string; fg: string }> = {
    radio: { bg: '#e8f0fe', fg: '#1a4aff' },
    checkbox: { bg: '#e8f5ee', fg: '#2d7a4f' },
    text: { bg: '#fff3e0', fg: '#e67300' },
  };

  const renderOptionTags = (opts: SurveyOption[]) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', minHeight: 30, marginBottom: '0.5rem' }}>
      {opts.length > 0 ? opts.map(o => (
        <span key={o.seq} style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
          padding: '0.25rem 0.65rem', background: '#f0f4f8', border: '1px solid #d0d8e0',
          borderRadius: 6, fontSize: '0.84rem', color: '#333',
        }}>
          {o.label}
          <button onClick={() => handleDeleteOption(o.seq, o.label)} title="삭제" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 15, height: 15, background: 'none', border: 'none', cursor: 'pointer',
            color: '#999', fontSize: '0.7rem', padding: 0,
          }}>x</button>
        </span>
      )) : <span style={{ fontSize: '0.84rem', color: '#bbb', fontStyle: 'italic' }}>선택지 없음</span>}
    </div>
  );

  const renderOptionAddInput = (formId: string, questionSeq: number, groupName: string) => {
    const value = optionAddForms[formId];
    if (value === undefined) {
      return (
        <button onClick={() => setOptionAddForms(prev => ({ ...prev, [formId]: '' }))} style={{
          padding: '0.25rem 0.65rem', background: 'none', color: 'var(--primary)',
          border: '1px dashed var(--primary)', borderRadius: 5, fontSize: '0.8rem',
          fontWeight: 600, cursor: 'pointer',
        }}>+ 선택지</button>
      );
    }
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input type="text" value={value} autoFocus placeholder="선택지 입력 후 Enter"
          onChange={e => setOptionAddForms(prev => ({ ...prev, [formId]: e.target.value }))}
          onKeyDown={e => {
            if (e.key === 'Enter') handleAddOption(questionSeq, groupName, formId);
            if (e.key === 'Escape') setOptionAddForms(prev => { const n = { ...prev }; delete n[formId]; return n; });
          }}
          style={{ padding: '0.3rem 0.6rem', border: '1.5px solid var(--primary)', borderRadius: 5, fontSize: '0.84rem', outline: 'none', width: 180 }} />
        <button onClick={() => handleAddOption(questionSeq, groupName, formId)} style={{
          padding: '0.3rem 0.6rem', background: 'var(--primary)', color: 'white', border: 'none',
          borderRadius: 5, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
        }}>추가</button>
        <button onClick={() => setOptionAddForms(prev => { const n = { ...prev }; delete n[formId]; return n; })} style={{
          padding: '0.3rem 0.5rem', background: 'none', color: '#888', border: '1px solid #ddd',
          borderRadius: 5, fontSize: '0.8rem', cursor: 'pointer',
        }}>취소</button>
      </div>
    );
  };

  const renderOptions = (q: SurveyQuestion) => {
    const opts = optionsByQ[q.seq] || [];
    if (q.inputType === 'text') {
      return <div style={{ color: '#999', fontSize: '0.85rem', fontStyle: 'italic', padding: '0.25rem 0' }}>
        주관식 -- 사용자가 직접 입력합니다.
      </div>;
    }
    const groups = q.isGrouped && q.groups ? q.groups.split(',').map(g => g.trim()).filter(Boolean) : [];
    if (groups.length > 0) {
      return groups.map((group, gi) => {
        const groupOpts = opts.filter(o => o.groupName === group);
        const formId = `${q.seq}-g${gi}`;
        return (
          <div key={group} style={{ marginBottom: gi < groups.length - 1 ? '0.75rem' : 0 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#2d7a4f', marginBottom: '0.4rem' }}>{group}</div>
            {renderOptionTags(groupOpts)}
            {renderOptionAddInput(formId, q.seq, group)}
          </div>
        );
      });
    }
    return <>
      {renderOptionTags(opts)}
      {renderOptionAddInput(`q${q.seq}`, q.seq, '')}
    </>;
  };

  const renderQuestionCard = (q: SurveyQuestion, sectionSeq: number) => {
    const opts = optionsByQ[q.seq] || [];
    const isOpen = openCards.has(q.seq);
    const editForm = questionEditForms[q.seq];
    const tc = typeColor[q.inputType];

    return (
      <div key={q.seq}
        draggable
        onDragStart={() => handleDragStart(q)}
        onDragOver={e => handleDragOver(e, q)}
        onDrop={e => handleDrop(e, sectionSeq)}
        className="card" style={{ padding: 0, marginBottom: '0.6rem', overflow: 'hidden', cursor: 'grab' }}
      >
        {/* 헤더 */}
        <div onClick={() => toggleCard(q.seq)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.65rem 1rem', background: isOpen ? '#f8fafe' : '#fafafa',
          borderBottom: isOpen ? '1px solid #eee' : 'none',
          cursor: 'pointer', userSelect: 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
            {/* 드래그 핸들 */}
            <span style={{ color: '#ccc', fontSize: '0.85rem', cursor: 'grab', userSelect: 'none', flexShrink: 0 }}
              onMouseDown={e => e.stopPropagation()}>&#8942;&#8942;</span>
            <span style={{ color: '#aaa', fontSize: '0.75rem', transition: 'transform 0.15s', transform: isOpen ? 'rotate(90deg)' : 'none' }}>&#9654;</span>
            <span style={{ fontSize: '0.72rem', color: '#999', fontFamily: 'monospace', flexShrink: 0 }}>{q.questionKey}</span>
            <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{q.title}</span>
            {q.required && (
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#e03131', background: '#fff0f0', border: '1px solid #ffc9c9', padding: '1px 5px', borderRadius: 3 }}>필수</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: tc.bg, color: tc.fg }}>{typeLabel[q.inputType]}</span>
            {q.inputType !== 'text' && <span style={{ fontSize: '0.72rem', color: '#999' }}>{opts.length}개</span>}
          </div>
        </div>

        {/* 본문 */}
        {isOpen && (
          <div style={{ padding: '0.85rem 1rem' }}>
            {editForm ? (
              <div style={{ background: '#f0f7ff', border: '1px solid #c4d8f0', borderRadius: 8, padding: '0.85rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 8, marginBottom: 8 }}>
                  <div>
                    <label style={lbl}>질문 키</label>
                    <input type="text" value={editForm.questionKey}
                      onChange={e => setQuestionEditForms(p => ({ ...p, [q.seq]: { ...p[q.seq], questionKey: e.target.value } }))}
                      style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>질문 제목</label>
                    <input type="text" value={editForm.title}
                      onChange={e => setQuestionEditForms(p => ({ ...p, [q.seq]: { ...p[q.seq], title: e.target.value } }))}
                      style={inp} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    <label style={lbl}>응답 형식</label>
                    <select value={editForm.inputType}
                      onChange={e => setQuestionEditForms(p => ({ ...p, [q.seq]: { ...p[q.seq], inputType: e.target.value as InputType } }))}
                      style={{ ...inp, width: 'auto' }}>
                      <option value="radio">단일선택</option>
                      <option value="checkbox">다중선택</option>
                      <option value="text">주관식</option>
                    </select>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', marginTop: 16 }}>
                    <input type="checkbox" checked={editForm.required}
                      onChange={e => setQuestionEditForms(p => ({ ...p, [q.seq]: { ...p[q.seq], required: e.target.checked } }))} />
                    <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>필수</span>
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <Button variant="secondary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.82rem' }}
                    onClick={() => toggleEditQuestion(q)}>취소</Button>
                  <Button style={{ padding: '0.35rem 0.8rem', fontSize: '0.82rem' }}
                    onClick={() => handleUpdateQuestion(q)}>저장</Button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 6, marginBottom: '0.65rem', alignItems: 'center', paddingBottom: '0.65rem', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'inline-flex', border: '1px solid #d0d0d0', borderRadius: 5, overflow: 'hidden' }}>
                  {(['radio', 'checkbox', 'text'] as InputType[]).map(type => {
                    const active = q.inputType === type;
                    const c = typeColor[type];
                    return (
                      <button key={type} onClick={() => handleTypeChange(q, type)} style={{
                        padding: '0.2rem 0.55rem', fontSize: '0.74rem', fontWeight: 600,
                        border: 'none', cursor: 'pointer',
                        background: active ? c.bg : 'white', color: active ? c.fg : '#aaa',
                      }}>{typeLabel[type]}</button>
                    );
                  })}
                </div>
                <button onClick={() => handleToggleRequired(q)} style={{
                  padding: '0.2rem 0.55rem', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer', borderRadius: 5,
                  background: q.required ? '#fff0f0' : '#f5f5f5', color: q.required ? '#e03131' : '#999',
                  border: `1px solid ${q.required ? '#ffc9c9' : '#d0d0d0'}`,
                }}>{q.required ? '필수' : '선택'}</button>
                <div style={{ flex: 1 }} />
                <button onClick={() => toggleEditQuestion(q)} style={{
                  background: 'none', border: '1px solid #b0c4de', color: '#4a90e2',
                  padding: '2px 8px', borderRadius: 4, fontSize: '0.73rem', fontWeight: 600, cursor: 'pointer',
                }}>수정</button>
                <button onClick={() => handleDeleteQuestion(q)} style={{
                  background: 'none', border: '1px solid #ffa8a8', color: '#e03131',
                  padding: '2px 8px', borderRadius: 4, fontSize: '0.73rem', fontWeight: 600, cursor: 'pointer',
                }}>삭제</button>
              </div>
            )}
            {renderOptions(q)}
          </div>
        )}
      </div>
    );
  };

  const renderQuestionAddForm = (sectionSeq: number) => {
    const form = questionAddForms[sectionSeq];
    if (!form) return null;
    return (
      <div className="card" style={{ borderColor: 'var(--primary)', background: '#f8fafe', marginBottom: '0.6rem', padding: '0.85rem 1rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--primary)', marginBottom: 10 }}>새 질문</div>
        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 8, marginBottom: 8 }}>
          <div>
            <label style={lbl}>질문 키 <span style={{ color: '#e53e3e' }}>*</span></label>
            <input type="text" value={form.questionKey} placeholder="q1"
              onChange={e => setQuestionAddForms(p => ({ ...p, [sectionSeq]: { ...p[sectionSeq], questionKey: e.target.value } }))}
              style={inp} />
          </div>
          <div>
            <label style={lbl}>질문 제목 <span style={{ color: '#e53e3e' }}>*</span></label>
            <input type="text" value={form.title} placeholder="질문 내용을 입력하세요"
              onChange={e => setQuestionAddForms(p => ({ ...p, [sectionSeq]: { ...p[sectionSeq], title: e.target.value } }))}
              style={inp} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 10 }}>
          <div>
            <label style={lbl}>응답 형식</label>
            <select value={form.inputType}
              onChange={e => setQuestionAddForms(p => ({ ...p, [sectionSeq]: { ...p[sectionSeq], inputType: e.target.value as InputType } }))}
              style={{ ...inp, width: 'auto' }}>
              <option value="radio">단일선택</option>
              <option value="checkbox">다중선택</option>
              <option value="text">주관식</option>
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', marginTop: 16 }}>
            <input type="checkbox" checked={form.required}
              onChange={e => setQuestionAddForms(p => ({ ...p, [sectionSeq]: { ...p[sectionSeq], required: e.target.checked } }))} />
            <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>필수</span>
          </label>
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <Button variant="secondary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.84rem' }}
            onClick={() => toggleQuestionAddForm(sectionSeq)}>취소</Button>
          <Button style={{ padding: '0.35rem 0.8rem', fontSize: '0.84rem' }}
            onClick={() => handleAddQuestion(sectionSeq)}>추가</Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <a onClick={() => router.push(ROUTES.SURVEY)}
          style={{ color: '#666', textDecoration: 'none', fontSize: '0.9rem', cursor: 'pointer' }}>
          &larr; 설문지 목록
        </a>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        {editTemplateName !== null ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="text" value={editTemplateName} autoFocus
              onChange={e => setEditTemplateName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleUpdateTemplateName(); if (e.key === 'Escape') setEditTemplateName(null); }}
              style={{ ...inp, fontSize: '1.1rem', fontWeight: 700, maxWidth: 350 }} />
            <Button style={{ padding: '0.35rem 0.7rem', fontSize: '0.82rem' }}
              onClick={handleUpdateTemplateName}>저장</Button>
            <Button variant="secondary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.82rem' }}
              onClick={() => setEditTemplateName(null)}>취소</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 className="page-title" style={{ margin: 0 }}>{template.name} 편집</h2>
            <button onClick={startEditTemplateName} style={{
              background: 'none', border: '1px solid #b0c4de', color: '#4a90e2',
              padding: '2px 8px', borderRadius: 4, fontSize: '0.73rem', fontWeight: 600, cursor: 'pointer',
            }}>이름 변경</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={ROUTES.SURVEY_PREVIEW(templateSeq)} target="_blank" rel="noopener noreferrer"
             style={{
              padding: '0.45rem 0.9rem', fontSize: '0.88rem', fontWeight: 600,
              color: 'var(--primary)', border: '1px solid var(--primary)',
              borderRadius: 6, textDecoration: 'none', cursor: 'pointer',
            }}>미리보기</a>
          <Button onClick={() => setAddSectionForm(addSectionForm ? null : { title: '' })}>
            + 섹션 추가
          </Button>
        </div>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
        섹션을 나누고, 각 섹션에 질문을 추가하세요. 같은 섹션 안에서 질문을 드래그하여 순서를 변경할 수 있습니다.
      </p>

      {/* ── 고객 기본 정보 (고정 섹션) ── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          marginBottom: '0.6rem', paddingBottom: '0.5rem', borderBottom: '2px solid #2d7a4f',
        }}>
          <span style={{ background: '#2d7a4f', color: 'white', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 4 }}>고정</span>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#333' }}>고객 기본 정보</span>
          <span style={{ fontSize: '0.78rem', color: '#2d7a4f', fontWeight: 600 }}>항상 첫 페이지에 표시됩니다</span>
        </div>
        {DEFAULT_CUSTOMER_FIELDS.map((field, i) => (
          <div key={i} className="card" style={{ padding: 0, marginBottom: '0.6rem', overflow: 'hidden' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.65rem 1rem', background: '#f6faf8',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                <span style={{ color: '#2d7a4f', fontSize: '0.85rem', flexShrink: 0 }}>&#9679;</span>
                <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{field.title}</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#e03131', background: '#fff0f0', border: '1px solid #ffc9c9', padding: '1px 5px', borderRadius: 3 }}>필수</span>
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: '#e8f5ee', color: '#2d7a4f' }}>{field.type}</span>
            </div>
          </div>
        ))}
      </div>

      {addSectionForm && (
        <div className="card" style={{ borderColor: 'var(--primary)', background: '#f8fafe', marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
          <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: 10 }}>새 섹션</div>
          <div style={{ marginBottom: 10 }}>
            <label style={lbl}>섹션 제목 <span style={{ color: '#e53e3e' }}>*</span></label>
            <input type="text" value={addSectionForm.title} autoFocus placeholder="예: 기본 정보"
              onChange={e => setAddSectionForm({ title: e.target.value })}
              onKeyDown={e => { if (e.key === 'Enter') handleAddSection(); }}
              style={{ ...inp, maxWidth: 400 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setAddSectionForm(null)}>취소</Button>
            <Button onClick={handleAddSection}>추가</Button>
          </div>
        </div>
      )}

      {sections.length === 0 && !addSectionForm ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#aaa', border: '1.5px dashed var(--border)' }}>
          섹션이 없습니다. &apos;+ 섹션 추가&apos; 버튼으로 시작하세요.
        </div>
      ) : (
        sections.map(sec => {
          const secQuestions = questionsForSection(sec.seq);
          const isEditing = editSectionSeq === sec.seq;

          return (
            <div key={sec.seq} style={{ marginBottom: '1.75rem' }}>
              {/* 섹션 헤더 */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                marginBottom: '0.6rem', paddingBottom: '0.5rem', borderBottom: '2px solid #e0e0e0',
              }}>
                {isEditing ? (
                  <>
                    <input type="text" value={editSectionTitle} autoFocus
                      onChange={e => setEditSectionTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleUpdateSection(); if (e.key === 'Escape') setEditSectionSeq(null); }}
                      style={{ ...inp, maxWidth: 250, fontSize: '0.95rem', fontWeight: 700 }} />
                    <Button style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }} onClick={handleUpdateSection}>저장</Button>
                    <Button variant="secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }} onClick={() => setEditSectionSeq(null)}>취소</Button>
                  </>
                ) : (
                  <>
                    <span style={{ background: '#1a1a1a', color: 'white', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 4 }}>섹션 {sec.sortOrder}</span>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#333' }}>{sec.title}</span>
                    <span style={{ fontSize: '0.78rem', color: '#999' }}>({secQuestions.length}개 질문)</span>
                    <div style={{ flex: 1 }} />
                    <button onClick={() => startEditSection(sec)} style={{
                      background: 'none', border: '1px solid #b0c4de', color: '#4a90e2',
                      padding: '2px 8px', borderRadius: 4, fontSize: '0.73rem', fontWeight: 600, cursor: 'pointer',
                    }}>이름 변경</button>
                    <button onClick={() => handleDeleteSection(sec)} style={{
                      background: 'none', border: '1px solid #ffa8a8', color: '#e03131',
                      padding: '2px 8px', borderRadius: 4, fontSize: '0.73rem', fontWeight: 600, cursor: 'pointer',
                    }}>섹션 삭제</button>
                    <button onClick={() => toggleQuestionAddForm(sec.seq)} style={{
                      fontSize: '0.78rem', padding: '0.25rem 0.6rem', background: 'white', color: 'var(--primary)',
                      border: '1px dashed var(--primary)', borderRadius: 5, fontWeight: 600, cursor: 'pointer',
                    }}>+ 질문 추가</button>
                  </>
                )}
              </div>

              {renderQuestionAddForm(sec.seq)}

              {secQuestions.length === 0 && !questionAddForms[sec.seq] ? (
                <div style={{
                  textAlign: 'center', padding: '1.5rem', color: '#ccc', fontSize: '0.88rem',
                  border: '1px dashed #e0e0e0', borderRadius: 8, background: '#fcfcfc',
                }}>
                  이 섹션에 질문이 없습니다.
                </div>
              ) : (
                secQuestions.map(q => renderQuestionCard(q, sec.seq))
              )}
            </div>
          );
        })
      )}
    </>
  );
}

const lbl: React.CSSProperties = { display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#555', marginBottom: 3 };
const inp: React.CSSProperties = { width: '100%', padding: '0.35rem 0.6rem', border: '1.5px solid #ddd', borderRadius: 5, fontSize: '0.88rem' };
