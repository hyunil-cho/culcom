'use client';

import { useEffect, useState, useCallback } from 'react';
import { surveyApi, SurveyTemplate, SurveySection, SurveyQuestion, SurveyOption } from '@/lib/api';

export interface SurveyData {
  template: SurveyTemplate | null;
  sections: SurveySection[];
  questions: SurveyQuestion[];
  optionsByQ: Record<number, SurveyOption[]>;
  loading: boolean;
}

export function useSurveyData(templateSeq: number): SurveyData {
  const [template, setTemplate] = useState<SurveyTemplate | null>(null);
  const [sections, setSections] = useState<SurveySection[]>([]);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [optionsByQ, setOptionsByQ] = useState<Record<number, SurveyOption[]>>({});
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

  return { template, sections, questions, optionsByQ, loading };
}
