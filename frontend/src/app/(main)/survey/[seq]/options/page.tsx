'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { surveyApi, SurveyTemplate, SurveySection, SurveyQuestion, SurveyOption } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useModal } from '@/hooks/useModal';
import { queryClient } from '@/lib/queryClient';
import { ROUTES } from '@/lib/routes';
import { Button } from '@/components/ui/Button';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Checkbox } from '@/components/ui/FormInput';
import { useResultModal } from '@/hooks/useResultModal';
import Spinner from '@/components/ui/Spinner';
import { BASIC_INFO_FIELDS, getFieldOptions } from '@/app/survey/[seq]/_shared/surveyConstants';
import s from './page.module.css';

type InputType = 'radio' | 'checkbox' | 'text';

interface QuestionForm {
  questionKey: string;
  title: string;
  inputType: InputType;
  required: boolean;
}

const DEFAULT_CUSTOMER_FIELDS = [
  { key: 'name', title: '성함', type: '텍스트' },
  { key: 'phone', title: '연락처', type: '텍스트' },
  { key: 'gender', title: '성별', type: '단일선택' },
  { key: 'location', title: '사는 곳 (주소)', type: '텍스트' },
  { key: 'age_group', title: '연령대', type: '단일선택' },
  { key: 'occupation', title: '현재 직군', type: '단일선택' },
  { key: 'ad_source', title: 'E-UT를 어떻게 알고 오셨나요?', type: '단일선택' },
];

export default function SurveyEditorPage() {
  const params = useParams();
  const router = useRouter();
  const templateSeq = Number(params.seq);

  const [openCards, setOpenCards] = useState<Set<number>>(new Set());
  const openCardsInitialized = useRef(false);

  const [addSectionForm, setAddSectionForm] = useState<{ title: string } | null>(null);
  const [editSectionSeq, setEditSectionSeq] = useState<number | null>(null);
  const [editSectionTitle, setEditSectionTitle] = useState('');
  const [editTemplateName, setEditTemplateName] = useState<string | null>(null);
  const [editTemplateDesc, setEditTemplateDesc] = useState<string | null>(null);
  const [questionAddForms, setQuestionAddForms] = useState<Record<number, QuestionForm>>({});
  const [questionEditForms, setQuestionEditForms] = useState<Record<number, QuestionForm>>({});
  const [optionAddForms, setOptionAddForms] = useState<Record<string, string>>({});
  const [expandedFixed, setExpandedFixed] = useState<Set<string>>(new Set());
  const [fixedOptionAddForms, setFixedOptionAddForms] = useState<Record<string, string>>({});

  const dragItem = useRef<{ seq: number; sectionSeq: number } | null>(null);
  const dragOverItem = useRef<{ seq: number; sectionSeq: number } | null>(null);
  const dragOption = useRef<{ seq: number; questionSeq: number } | null>(null);
  const dragOverOption = useRef<{ seq: number; questionSeq: number } | null>(null);
  const dragFixedField = useRef<string | null>(null);
  const dragOverFixedField = useRef<string | null>(null);
  const dragFixedOption = useRef<{ key: string; label: string } | null>(null);
  const dragOverFixedOption = useRef<{ key: string; label: string } | null>(null);
  const { showError, modal: resultModal } = useResultModal();
  const deleteSectionModal = useModal<SurveySection>();
  const deleteQuestionModal = useModal<SurveyQuestion>();
  const deleteOptionModal = useModal<{ seq: number; label: string }>();

  const surveyKey = ['surveyEditor', templateSeq];

  const { data: template = null, isLoading: tplLoading } = useApiQuery<SurveyTemplate>(
    [...surveyKey, 'template'],
    () => surveyApi.getTemplate(templateSeq),
  );

  const { data: sections = [], isLoading: secLoading } = useApiQuery<SurveySection[]>(
    [...surveyKey, 'sections'],
    () => surveyApi.listSections(templateSeq),
  );

  const { data: questions = [], isLoading: qLoading } = useApiQuery<SurveyQuestion[]>(
    [...surveyKey, 'questions'],
    () => surveyApi.listQuestions(templateSeq),
  );

  const { data: allOptions = [], isLoading: oLoading } = useApiQuery<SurveyOption[]>(
    [...surveyKey, 'options'],
    () => surveyApi.listOptions(templateSeq),
  );

  const loading = tplLoading || secLoading || qLoading || oLoading;

  const optionsByQ: Record<number, SurveyOption[]> = {};
  for (const o of allOptions) {
    if (!optionsByQ[o.questionSeq]) optionsByQ[o.questionSeq] = [];
    optionsByQ[o.questionSeq].push(o);
  }

  useEffect(() => {
    if (!openCardsInitialized.current && questions.length > 0 && openCards.size === 0) {
      openCardsInitialized.current = true;
      setOpenCards(new Set([questions[0].seq]));
    }
  }, [questions]);

  const load = () => queryClient.invalidateQueries({ queryKey: surveyKey });

  const questionsForSection = (sectionSeq: number) =>
    questions.filter(q => q.sectionSeq === sectionSeq);

  const toggleCard = (seq: number) => {
    setOpenCards(prev => {
      const next = new Set(prev);
      next.has(seq) ? next.delete(seq) : next.add(seq);
      return next;
    });
  };

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
    const [moved] = secQuestions.splice(fromIdx, 1);
    secQuestions.splice(toIdx, 0, moved);
    const items = secQuestions.map((q, i) => ({ seq: q.seq, sortOrder: i + 1, newQuestionKey: `q${i + 1}` }));
    dragItem.current = null;
    dragOverItem.current = null;
    await surveyApi.reorderQuestions(templateSeq, items);
    load();
  };

  const startEditTemplateName = () => {
    if (template) {
      setEditTemplateName(template.name);
      setEditTemplateDesc(template.description ?? '');
    }
  };
  const cancelEditTemplate = () => { setEditTemplateName(null); setEditTemplateDesc(null); };
  const handleUpdateTemplateName = async () => {
    if (editTemplateName == null || !editTemplateName.trim()) { showError('설문지 이름을 입력해주세요.'); return; }
    const res = await surveyApi.updateTemplate(templateSeq, { name: editTemplateName.trim(), description: editTemplateDesc?.trim() || undefined });
    if (res.success) { cancelEditTemplate(); load(); }
    else showError(res.message || '설문지 이름 변경에 실패했습니다.');
  };

  const handleAddSection = async () => {
    if (!addSectionForm || !addSectionForm.title.trim()) { showError('섹션 제목을 입력해주세요.'); return; }
    const res = await surveyApi.createSection(templateSeq, { title: addSectionForm.title.trim() });
    if (res.success) { setAddSectionForm(null); load(); }
    else showError(res.message || '섹션 추가에 실패했습니다.');
  };
  const startEditSection = (sec: SurveySection) => { setEditSectionSeq(sec.seq); setEditSectionTitle(sec.title); };
  const handleUpdateSection = async () => {
    if (editSectionSeq == null || !editSectionTitle.trim()) { showError('섹션 제목을 입력해주세요.'); return; }
    const res = await surveyApi.updateSection(templateSeq, editSectionSeq, { title: editSectionTitle.trim() });
    if (res.success) { setEditSectionSeq(null); load(); }
    else showError(res.message || '섹션 수정에 실패했습니다.');
  };
  const handleDeleteSection = (sec: SurveySection) => {
    deleteSectionModal.open(sec);
  };

  const confirmDeleteSection = async () => {
    if (!deleteSectionModal.data) return;
    const sec = deleteSectionModal.data;
    deleteSectionModal.close();
    const res = await surveyApi.deleteSection(templateSeq, sec.seq);
    if (res.success) load();
  };

  const toggleQuestionAddForm = (sectionSeq: number) => {
    setQuestionAddForms(prev => {
      if (prev[sectionSeq]) { const next = { ...prev }; delete next[sectionSeq]; return next; }
      return { ...prev, [sectionSeq]: { questionKey: '', title: '', inputType: 'radio', required: false } };
    });
  };
  const handleAddQuestion = async (sectionSeq: number) => {
    const form = questionAddForms[sectionSeq];
    if (!form) return;
    if (!form.questionKey.trim()) { showError('질문 키를 입력해주세요.'); return; }
    if (!form.title.trim()) { showError('질문 제목을 입력해주세요.'); return; }
    const res = await surveyApi.createQuestion(templateSeq, { sectionSeq, questionKey: form.questionKey.trim(), title: form.title.trim(), inputType: form.inputType, required: form.required });
    if (res.success) { toggleQuestionAddForm(sectionSeq); load(); }
    else showError(res.message || '질문 추가에 실패했습니다.');
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
    if (!form.title.trim()) { showError('질문 제목을 입력해주세요.'); return; }
    const res = await surveyApi.updateQuestion(templateSeq, q.seq, { sectionSeq: q.sectionSeq!, questionKey: form.questionKey, title: form.title, inputType: form.inputType, required: form.required });
    if (res.success) { setQuestionEditForms(prev => { const next = { ...prev }; delete next[q.seq]; return next; }); load(); }
    else showError(res.message || '질문 수정에 실패했습니다.');
  };
  const handleDeleteQuestion = (q: SurveyQuestion) => {
    deleteQuestionModal.open(q);
  };

  const confirmDeleteQuestion = async () => {
    if (!deleteQuestionModal.data) return;
    const q = deleteQuestionModal.data;
    deleteQuestionModal.close();
    await surveyApi.deleteQuestion(templateSeq, q.seq);
    load();
  };
  const handleToggleRequired = async (q: SurveyQuestion) => { await surveyApi.updateQuestion(templateSeq, q.seq, { required: !q.required }); load(); };
  const handleTypeChange = async (q: SurveyQuestion, inputType: InputType) => { await surveyApi.updateQuestion(templateSeq, q.seq, { inputType }); load(); };

  // ── 고정 필드 선택지 관리 ──
  const toggleFixedField = (key: string) => {
    setExpandedFixed(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const saveFixedOptions = async (key: string, options: string[]) => {
    const current = template?.customerFieldOptions ?? {};
    const updated = { ...current, [key]: options };
    await surveyApi.updateTemplate(templateSeq, { customerFieldOptions: updated });
    load();
  };

  const handleAddFixedOption = async (key: string) => {
    const label = fixedOptionAddForms[key];
    if (!label?.trim()) return;
    const currentOptions = getFieldOptions(template, key) ?? [];
    if (currentOptions.includes(label.trim())) { showError('이미 존재하는 선택지입니다.'); return; }
    await saveFixedOptions(key, [...currentOptions, label.trim()]);
    setFixedOptionAddForms(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const handleDeleteFixedOption = async (key: string, label: string) => {
    const currentOptions = getFieldOptions(template, key) ?? [];
    await saveFixedOptions(key, currentOptions.filter(o => o !== label));
  };

  const handleResetFixedOptions = async (key: string) => {
    const current = template?.customerFieldOptions ?? {};
    const updated = { ...current };
    delete updated[key];
    await surveyApi.updateTemplate(templateSeq, { customerFieldOptions: Object.keys(updated).length > 0 ? updated : {} });
    load();
  };

  const handleFixedFieldDragStart = (key: string) => { dragFixedField.current = key; };
  const handleFixedFieldDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    dragFixedField.current && (dragOverFixedField.current = key);
  };
  const handleFixedFieldDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragFixedField.current;
    const to = dragOverFixedField.current;
    dragFixedField.current = null;
    dragOverFixedField.current = null;
    if (!from || !to || from === to) return;
    const current = (template?.customerFieldOrder && template.customerFieldOrder.length > 0)
      ? template.customerFieldOrder.filter(k => DEFAULT_CUSTOMER_FIELDS.some(f => f.key === k))
      : DEFAULT_CUSTOMER_FIELDS.map(f => f.key);
    for (const f of DEFAULT_CUSTOMER_FIELDS) if (!current.includes(f.key)) current.push(f.key);
    const fromIdx = current.indexOf(from);
    const toIdx = current.indexOf(to);
    if (fromIdx === -1 || toIdx === -1) return;
    const next = [...current];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    await surveyApi.updateTemplate(templateSeq, { customerFieldOrder: next });
    load();
  };

  const handleFixedOptionDragStart = (key: string, label: string) => { dragFixedOption.current = { key, label }; };
  const handleFixedOptionDragOver = (e: React.DragEvent, key: string, label: string) => {
    e.preventDefault();
    if (dragFixedOption.current?.key === key) dragOverFixedOption.current = { key, label };
  };
  const handleFixedOptionDrop = async (e: React.DragEvent, key: string) => {
    e.preventDefault();
    const from = dragFixedOption.current;
    const to = dragOverFixedOption.current;
    dragFixedOption.current = null;
    dragOverFixedOption.current = null;
    if (!from || !to || from.key !== key || to.key !== key || from.label === to.label) return;
    const currentOptions = getFieldOptions(template, key) ?? [];
    const fromIdx = currentOptions.indexOf(from.label);
    const toIdx = currentOptions.indexOf(to.label);
    if (fromIdx === -1 || toIdx === -1) return;
    const next = [...currentOptions];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    await saveFixedOptions(key, next);
  };

  const handleOptionDragStart = (o: SurveyOption) => {
    dragOption.current = { seq: o.seq, questionSeq: o.questionSeq };
  };
  const handleOptionDragOver = (e: React.DragEvent, o: SurveyOption) => {
    e.preventDefault();
    dragOverOption.current = { seq: o.seq, questionSeq: o.questionSeq };
  };
  const handleOptionDrop = async (e: React.DragEvent, questionSeq: number) => {
    e.preventDefault();
    if (!dragOption.current || !dragOverOption.current) return;
    if (dragOption.current.questionSeq !== questionSeq || dragOverOption.current.questionSeq !== questionSeq) return;
    if (dragOption.current.seq === dragOverOption.current.seq) return;
    const opts = [...(optionsByQ[questionSeq] || [])];
    const fromIdx = opts.findIndex(o => o.seq === dragOption.current!.seq);
    const toIdx = opts.findIndex(o => o.seq === dragOverOption.current!.seq);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = opts.splice(fromIdx, 1);
    opts.splice(toIdx, 0, moved);
    const items = opts.map((o, i) => ({ seq: o.seq, sortOrder: i + 1 }));
    dragOption.current = null;
    dragOverOption.current = null;
    await surveyApi.reorderOptions(templateSeq, items);
    load();
  };

  const handleAddOption = async (questionSeq: number, groupName: string, formId: string) => {
    const label = optionAddForms[formId];
    if (!label?.trim()) return;
    const res = await surveyApi.createOption(templateSeq, { questionSeq, groupName: groupName || undefined, label: label.trim() });
    if (res.success) { setOptionAddForms(prev => { const n = { ...prev }; delete n[formId]; return n; }); load(); }
  };
  const handleDeleteOption = async (optionSeq: number, label: string) => {
    if (!confirm(`"${label}" 선택지를 삭제하시겠습니까?`)) return;
    await surveyApi.deleteOption(templateSeq, optionSeq);
    load();
  };

  if (loading) return <Spinner />;
  if (!template) return <div className="card">설문지를 찾을 수 없습니다.</div>;

  const typeLabel: Record<InputType, string> = { radio: '단일선택', checkbox: '다중선택', text: '주관식' };
  const typeColor: Record<InputType, { bg: string; fg: string }> = {
    radio: { bg: '#e8f0fe', fg: '#1a4aff' },
    checkbox: { bg: '#e8f5ee', fg: '#2d7a4f' },
    text: { bg: '#fff3e0', fg: '#e67300' },
  };

  const renderOptionTags = (opts: SurveyOption[], questionSeq: number) => (
    <div className={s.optionTags} onDrop={e => handleOptionDrop(e, questionSeq)} onDragOver={e => e.preventDefault()}>
      {opts.length > 0 ? opts.map(o => (
        <span key={o.seq} className={s.optionTag} draggable
          onDragStart={() => handleOptionDragStart(o)}
          onDragOver={e => handleOptionDragOver(e, o)}>
          {o.label}
          <button onClick={() => handleDeleteOption(o.seq, o.label)} title="삭제" className={s.optionDeleteBtn}>x</button>
        </span>
      )) : <span className={s.optionEmpty}>선택지 없음</span>}
    </div>
  );

  const renderOptionAddInput = (formId: string, questionSeq: number, groupName: string) => {
    const value = optionAddForms[formId];
    if (value === undefined) {
      return <button onClick={() => setOptionAddForms(prev => ({ ...prev, [formId]: '' }))} className={s.btnAddOption}>+ 선택지</button>;
    }
    return (
      <div className={s.optionInputRow}>
        <input type="text" value={value} autoFocus placeholder="선택지 입력 후 Enter"
          onChange={e => setOptionAddForms(prev => ({ ...prev, [formId]: e.target.value }))}
          onKeyDown={e => {
            if (e.key === 'Enter') handleAddOption(questionSeq, groupName, formId);
            if (e.key === 'Escape') setOptionAddForms(prev => { const n = { ...prev }; delete n[formId]; return n; });
          }}
          className={s.optionInput} />
        <button onClick={() => handleAddOption(questionSeq, groupName, formId)} className={s.btnOptionSubmit}>추가</button>
        <button onClick={() => setOptionAddForms(prev => { const n = { ...prev }; delete n[formId]; return n; })} className={s.btnOptionCancel}>취소</button>
      </div>
    );
  };

  const renderOptions = (q: SurveyQuestion) => {
    const opts = optionsByQ[q.seq] || [];
    if (q.inputType === 'text') {
      return <div className={s.textHint}>주관식 -- 사용자가 직접 입력합니다.</div>;
    }
    const groups = q.isGrouped && q.groupLabel ? q.groupLabel.split(',').map(g => g.trim()).filter(Boolean) : [];
    if (groups.length > 0) {
      return groups.map((group, gi) => {
        const groupOpts = opts.filter(o => o.groupName === group);
        const formId = `${q.seq}-g${gi}`;
        return (
          <div key={group} className={gi < groups.length - 1 ? s.groupWrap : undefined}>
            <div className={s.groupTitle}>{group}</div>
            {renderOptionTags(groupOpts, q.seq)}
            {renderOptionAddInput(formId, q.seq, group)}
          </div>
        );
      });
    }
    return <>{renderOptionTags(opts, q.seq)}{renderOptionAddInput(`q${q.seq}`, q.seq, '')}</>;
  };

  const renderQuestionCard = (q: SurveyQuestion, sectionSeq: number) => {
    const opts = optionsByQ[q.seq] || [];
    const isOpen = openCards.has(q.seq);
    const editForm = questionEditForms[q.seq];
    const tc = typeColor[q.inputType];

    return (
      <div key={q.seq} draggable onDragStart={() => handleDragStart(q)}
        onDragOver={e => handleDragOver(e, q)} onDrop={e => handleDrop(e, sectionSeq)}
        className={`card ${s.questionCard}`}>
        <div onClick={() => toggleCard(q.seq)} className={isOpen ? s.questionHeaderOpen : s.questionHeaderClosed}>
          <div className={s.questionHeaderLeft}>
            <span className={s.dragHandle} onMouseDown={e => e.stopPropagation()}>&#8942;&#8942;</span>
            <span className={isOpen ? s.arrowOpen : s.arrowClosed}>&#9654;</span>
            <span className={s.questionKey}>{q.questionKey}</span>
            <span className={s.questionTitle}>{q.title}</span>
            {q.required && <span className={s.requiredBadge}>필수</span>}
          </div>
          <div className={s.questionHeaderRight} onClick={e => e.stopPropagation()}>
            <span className={s.typeBadge} style={{ background: tc.bg, color: tc.fg }}>{typeLabel[q.inputType]}</span>
            {q.inputType !== 'text' && <span className={s.optionCount}>{opts.length}개</span>}
          </div>
        </div>

        {isOpen && (
          <div className={s.questionBody}>
            {editForm ? (
              <div className={s.editFormBox}>
                <div className={s.formGrid}>
                  <div>
                    <label className={s.lbl}>질문 키</label>
                    <input type="text" value={editForm.questionKey}
                      onChange={e => setQuestionEditForms(p => ({ ...p, [q.seq]: { ...p[q.seq], questionKey: e.target.value } }))}
                      className={s.inp} />
                  </div>
                  <div>
                    <label className={s.lbl}>질문 제목</label>
                    <input type="text" value={editForm.title}
                      onChange={e => setQuestionEditForms(p => ({ ...p, [q.seq]: { ...p[q.seq], title: e.target.value } }))}
                      className={s.inp} />
                  </div>
                </div>
                <div className={s.formRow}>
                  <div>
                    <label className={s.lbl}>응답 형식</label>
                    <select value={editForm.inputType}
                      onChange={e => setQuestionEditForms(p => ({ ...p, [q.seq]: { ...p[q.seq], inputType: e.target.value as InputType } }))}
                      className={s.inpAuto}>
                      <option value="radio">단일선택</option><option value="checkbox">다중선택</option><option value="text">주관식</option>
                    </select>
                  </div>
                  <div className={s.formCheckboxWrap}>
                    <Checkbox label="필수" checked={editForm.required}
                      onChange={e => setQuestionEditForms(p => ({ ...p, [q.seq]: { ...p[q.seq], required: (e.target as HTMLInputElement).checked } }))} />
                  </div>
                </div>
                <div className={s.flexEnd}>
                  <Button variant="secondary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.82rem' }} onClick={() => toggleEditQuestion(q)}>취소</Button>
                  <Button style={{ padding: '0.35rem 0.8rem', fontSize: '0.82rem' }} onClick={() => handleUpdateQuestion(q)}>저장</Button>
                </div>
              </div>
            ) : (
              <div className={s.toolbar}>
                <div className={s.typeToggle}>
                  {(['radio', 'checkbox', 'text'] as InputType[]).map(type => {
                    const active = q.inputType === type;
                    const c = typeColor[type];
                    return (
                      <button key={type} onClick={() => handleTypeChange(q, type)}
                        className={active ? s.typeBtnActive : s.typeBtnInactive}
                        style={active ? { background: c.bg, color: c.fg } : undefined}>
                        {typeLabel[type]}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => handleToggleRequired(q)}
                  className={q.required ? s.requiredToggleOn : s.requiredToggleOff}>
                  {q.required ? '필수' : '선택'}
                </button>
                <div className={s.spacer} />
                <button onClick={() => toggleEditQuestion(q)} className={s.btnEdit}>수정</button>
                <button onClick={() => handleDeleteQuestion(q)} className={s.btnDelete}>삭제</button>
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
      <div className={`card ${s.questionAddCard}`}>
        <div className={s.questionAddTitle}>새 질문</div>
        <div className={s.formGrid}>
          <div>
            <label className={s.lbl}>질문 키 <span className={s.requiredMark}>*</span> <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(같은 섹션 내에서 중복 불가)</span></label>
            <input type="text" value={form.questionKey} placeholder="q1"
              onChange={e => setQuestionAddForms(p => ({ ...p, [sectionSeq]: { ...p[sectionSeq], questionKey: e.target.value } }))}
              className={s.inp} />
          </div>
          <div>
            <label className={s.lbl}>질문 제목 <span className={s.requiredMark}>*</span></label>
            <input type="text" value={form.title} placeholder="질문 내용을 입력하세요"
              onChange={e => setQuestionAddForms(p => ({ ...p, [sectionSeq]: { ...p[sectionSeq], title: e.target.value } }))}
              className={s.inp} />
          </div>
        </div>
        <div className={s.formRow}>
          <div>
            <label className={s.lbl}>응답 형식</label>
            <select value={form.inputType}
              onChange={e => setQuestionAddForms(p => ({ ...p, [sectionSeq]: { ...p[sectionSeq], inputType: e.target.value as InputType } }))}
              className={s.inpAuto}>
              <option value="radio">단일선택</option><option value="checkbox">다중선택</option><option value="text">주관식</option>
            </select>
          </div>
          <div className={s.formCheckboxWrap}>
            <Checkbox label="필수" checked={form.required}
              onChange={e => setQuestionAddForms(p => ({ ...p, [sectionSeq]: { ...p[sectionSeq], required: (e.target as HTMLInputElement).checked } }))} />
          </div>
        </div>
        <div className={s.flexEnd}>
          <Button variant="secondary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.84rem' }} onClick={() => toggleQuestionAddForm(sectionSeq)}>취소</Button>
          <Button style={{ padding: '0.35rem 0.8rem', fontSize: '0.84rem' }} onClick={() => handleAddQuestion(sectionSeq)}>추가</Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={s.backRow}>
        <a onClick={() => router.push(ROUTES.SURVEY)} className={s.backLink}>&larr; 설문지 목록</a>
      </div>

      {resultModal}

      <div className={s.headerRow}>
        {editTemplateName !== null ? (
          <div className={s.editNameRow} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
            <input type="text" value={editTemplateName} autoFocus placeholder="설문지 이름"
              onChange={e => setEditTemplateName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') cancelEditTemplate(); }}
              className={s.editNameInput} />
            <input type="text" value={editTemplateDesc ?? ''} placeholder="설명 (선택사항)"
              onChange={e => setEditTemplateDesc(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') cancelEditTemplate(); }}
              className={s.editNameInput} />
            <div style={{ display: 'flex', gap: 6 }}>
              <Button style={{ padding: '0.35rem 0.7rem', fontSize: '0.82rem' }} onClick={handleUpdateTemplateName}>저장</Button>
              <Button variant="secondary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.82rem' }} onClick={cancelEditTemplate}>취소</Button>
            </div>
          </div>
        ) : (
          <div className={s.titleRow}>
            <h2 className="page-title" style={{ margin: 0 }}>{template.name} 편집</h2>
            <button onClick={startEditTemplateName} className={s.btnEdit}>이름 변경</button>
          </div>
        )}
        <div className={s.actionRow}>
          <a href={ROUTES.SURVEY_PREVIEW(templateSeq)} target="_blank" rel="noopener noreferrer" className={s.previewLink}>미리보기</a>
          <Button onClick={() => setAddSectionForm(addSectionForm ? null : { title: '' })}>+ 섹션 추가</Button>
        </div>
      </div>
      <p className={s.desc}>섹션을 나누고, 각 섹션에 질문을 추가하세요. 같은 섹션 안에서 질문을 드래그하여 순서를 변경할 수 있습니다.</p>

      {/* 고객 기본 정보 (고정 섹션) */}
      <div className={s.sectionWrap} onDrop={handleFixedFieldDrop} onDragOver={e => e.preventDefault()}>
        <div className={s.sectionHeaderFixed}>
          <span className={s.sectionBadgeFixed}>고정</span>
          <span className={s.sectionTitle}>고객 기본 정보</span>
          <span className={s.sectionMetaFixed}>항상 첫 페이지에 표시됩니다 · 드래그로 순서 변경</span>
        </div>
        {(() => {
          const orderedKeys = (template?.customerFieldOrder && template.customerFieldOrder.length > 0)
            ? [
                ...template.customerFieldOrder.filter(k => DEFAULT_CUSTOMER_FIELDS.some(f => f.key === k)),
                ...DEFAULT_CUSTOMER_FIELDS.filter(f => !template.customerFieldOrder!.includes(f.key)).map(f => f.key),
              ]
            : DEFAULT_CUSTOMER_FIELDS.map(f => f.key);
          const orderedFields = orderedKeys.map(k => DEFAULT_CUSTOMER_FIELDS.find(f => f.key === k)!).filter(Boolean);
          return orderedFields.map((field) => {
          const isChoice = field.type === '단일선택';
          const isExpanded = isChoice && expandedFixed.has(field.key);
          const fieldOptions = isChoice ? getFieldOptions(template, field.key) ?? [] : [];
          const hasCustom = isChoice && !!template?.customerFieldOptions?.[field.key];

          return (
            <div key={field.key} className={`card ${s.questionCard}`} draggable
              onDragStart={() => handleFixedFieldDragStart(field.key)}
              onDragOver={e => handleFixedFieldDragOver(e, field.key)}>
              <div className={s.fixedCardHeader}
                onClick={isChoice ? () => toggleFixedField(field.key) : undefined}
                style={isChoice ? { cursor: 'pointer' } : undefined}>
                <div className={s.fixedCardLeft}>
                  {isChoice
                    ? <span className={isExpanded ? s.arrowOpen : s.arrowClosed}>&#9654;</span>
                    : <span className={s.fixedDot}>&#9679;</span>}
                  <span className={s.questionTitle}>{field.title}</span>
                  <span className={s.requiredBadge}>필수</span>
                </div>
                <div className={s.questionHeaderRight} onClick={e => e.stopPropagation()}>
                  <span className={s.fixedTypeBadge}>{field.type}</span>
                  {isChoice && <span className={s.optionCount}>{fieldOptions.length}개</span>}
                </div>
              </div>
              {isExpanded && (
                <div className={s.questionBody}>
                  {hasCustom && (
                    <div style={{ marginBottom: 8 }}>
                      <button onClick={() => handleResetFixedOptions(field.key)} className={s.btnEdit} style={{ fontSize: '0.78rem' }}>기본값 복원</button>
                    </div>
                  )}
                  <div className={s.optionTags} onDrop={e => handleFixedOptionDrop(e, field.key)} onDragOver={e => e.preventDefault()}>
                    {fieldOptions.map(opt => (
                      <span key={opt} className={s.optionTag} draggable
                        onDragStart={() => handleFixedOptionDragStart(field.key, opt)}
                        onDragOver={e => handleFixedOptionDragOver(e, field.key, opt)}>
                        {opt}
                        <button onClick={() => handleDeleteFixedOption(field.key, opt)} title="삭제" className={s.optionDeleteBtn}>x</button>
                      </span>
                    ))}
                    {fieldOptions.length === 0 && <span className={s.optionEmpty}>선택지 없음</span>}
                  </div>
                  {fixedOptionAddForms[field.key] !== undefined ? (
                    <div className={s.optionInputRow}>
                      <input type="text" value={fixedOptionAddForms[field.key]} autoFocus placeholder="선택지 입력 후 Enter"
                        onChange={e => setFixedOptionAddForms(prev => ({ ...prev, [field.key]: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAddFixedOption(field.key);
                          if (e.key === 'Escape') setFixedOptionAddForms(prev => { const n = { ...prev }; delete n[field.key]; return n; });
                        }}
                        className={s.optionInput} />
                      <button onClick={() => handleAddFixedOption(field.key)} className={s.btnOptionSubmit}>추가</button>
                      <button onClick={() => setFixedOptionAddForms(prev => { const n = { ...prev }; delete n[field.key]; return n; })} className={s.btnOptionCancel}>취소</button>
                    </div>
                  ) : (
                    <button onClick={() => setFixedOptionAddForms(prev => ({ ...prev, [field.key]: '' }))} className={s.btnAddOption}>+ 선택지</button>
                  )}
                </div>
              )}
            </div>
          );
        });
        })()}
      </div>

      {sections.length === 0 && !addSectionForm ? (
        <div className={`card ${s.emptyCard}`}>섹션이 없습니다. &apos;+ 섹션 추가&apos; 버튼으로 시작하세요.</div>
      ) : (
        sections.map(sec => {
          const secQuestions = questionsForSection(sec.seq);
          const isEditing = editSectionSeq === sec.seq;

          return (
            <div key={sec.seq} className={s.sectionWrap}>
              <div className={s.sectionHeader}>
                {isEditing ? (
                  <>
                    <input type="text" value={editSectionTitle} autoFocus
                      onChange={e => setEditSectionTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleUpdateSection(); if (e.key === 'Escape') setEditSectionSeq(null); }}
                      className={s.editSectionInput} />
                    <Button style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }} onClick={handleUpdateSection}>저장</Button>
                    <Button variant="secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }} onClick={() => setEditSectionSeq(null)}>취소</Button>
                  </>
                ) : (
                  <>
                    <span className={s.sectionBadge}>섹션 {sec.sortOrder}</span>
                    <span className={s.sectionTitle}>{sec.title}</span>
                    <span className={s.sectionMeta}>({secQuestions.length}개 질문)</span>
                    <div className={s.spacer} />
                    <button onClick={() => startEditSection(sec)} className={s.btnEdit}>이름 변경</button>
                    <button onClick={() => handleDeleteSection(sec)} className={s.btnDelete}>섹션 삭제</button>
                    <button onClick={() => toggleQuestionAddForm(sec.seq)} className={s.btnAddQuestion}>+ 질문 추가</button>
                  </>
                )}
              </div>

              {secQuestions.length === 0 && !questionAddForms[sec.seq] ? (
                <div className={s.emptySection}>이 섹션에 질문이 없습니다.</div>
              ) : (
                secQuestions.map(q => renderQuestionCard(q, sec.seq))
              )}

              {renderQuestionAddForm(sec.seq)}
            </div>
          );
        })
      )}

      {addSectionForm && (
        <div className={`card ${s.addCard}`}>
          <div className={s.addCardTitle}>새 섹션</div>
          <div className={s.addCardBody}>
            <label className={s.lbl}>섹션 제목 <span className={s.requiredMark}>*</span></label>
            <input type="text" value={addSectionForm.title} autoFocus placeholder="예: 기본 정보"
              onChange={e => setAddSectionForm({ title: e.target.value })}
              onKeyDown={e => { if (e.key === 'Enter') handleAddSection(); }}
              className={s.addSectionInput} />
          </div>
          <div className={s.flexEnd}>
            <Button variant="secondary" onClick={() => setAddSectionForm(null)}>취소</Button>
            <Button onClick={handleAddSection}>추가</Button>
          </div>
        </div>
      )}

      {deleteSectionModal.isOpen && (
        <ConfirmModal
          title="삭제 확인"
          confirmLabel="삭제"
          confirmColor="#e03131"
          onCancel={deleteSectionModal.close}
          onConfirm={confirmDeleteSection}
        >
          {(() => {
            const qCount = questionsForSection(deleteSectionModal.data!.seq).length;
            return qCount > 0
              ? `"${deleteSectionModal.data!.title}" 섹션과 포함된 ${qCount}개 질문을 모두 삭제하시겠습니까?`
              : `"${deleteSectionModal.data!.title}" 섹션을 삭제하시겠습니까?`;
          })()}
        </ConfirmModal>
      )}

      {deleteQuestionModal.isOpen && (
        <ConfirmModal
          title="삭제 확인"
          confirmLabel="삭제"
          confirmColor="#e03131"
          onCancel={deleteQuestionModal.close}
          onConfirm={confirmDeleteQuestion}
        >
          &quot;{deleteQuestionModal.data!.title}&quot; 질문과 모든 선택지를 삭제하시겠습니까?
        </ConfirmModal>
      )}

      {deleteOptionModal.isOpen && (
        <ConfirmModal
          title="삭제 확인"
          confirmLabel="삭제"
          confirmColor="#e03131"
          onCancel={deleteOptionModal.close}
          onConfirm={confirmDeleteOption}
        >
          &quot;{deleteOptionModal.data!.label}&quot; 선택지를 삭제하시겠습니까?
        </ConfirmModal>
      )}
    </>
  );
}