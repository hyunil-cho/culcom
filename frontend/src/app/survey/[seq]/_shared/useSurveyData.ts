'use client';

import { useMemo } from 'react';
import { surveyApi, SurveyTemplate, SurveySection, SurveyQuestion, SurveyOption } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';

export interface SurveyData {
  template: SurveyTemplate | null;
  sections: SurveySection[];
  questions: SurveyQuestion[];
  optionsByQ: Record<number, SurveyOption[]>;
  loading: boolean;
}

export function useSurveyData(templateSeq: number): SurveyData {
  const { data: template = null, isLoading: tplLoading } = useApiQuery<SurveyTemplate>(
    ['surveyTemplate', templateSeq],
    () => surveyApi.getTemplate(templateSeq),
  );

  const { data: sections = [], isLoading: secLoading } = useApiQuery<SurveySection[]>(
    ['surveySections', templateSeq],
    () => surveyApi.listSections(templateSeq),
  );

  const { data: questions = [], isLoading: qLoading } = useApiQuery<SurveyQuestion[]>(
    ['surveyQuestions', templateSeq],
    () => surveyApi.listQuestions(templateSeq),
  );

  const { data: rawOptions = [], isLoading: oLoading } = useApiQuery<SurveyOption[]>(
    ['surveyOptions', templateSeq],
    () => surveyApi.listOptions(templateSeq),
  );

  const optionsByQ = useMemo(() => {
    const grouped: Record<number, SurveyOption[]> = {};
    for (const o of rawOptions) {
      if (!grouped[o.questionSeq]) grouped[o.questionSeq] = [];
      grouped[o.questionSeq].push(o);
    }
    return grouped;
  }, [rawOptions]);

  const loading = tplLoading || secLoading || qLoading || oLoading;

  return { template, sections, questions, optionsByQ, loading };
}
