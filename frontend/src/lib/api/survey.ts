import { api } from './client';
import type { PageResponse } from './client';
import { API } from '@/lib/routes';

export interface SurveyTemplate {
  seq: number; name: string; description: string | null;
  status: '작성중' | '활성' | '비활성'; createdDate: string;
  lastUpdateDate: string | null; optionCount: number;
  customerFieldOptions: Record<string, string[]> | null;
  customerFieldOrder: string[] | null;
}

export interface SurveySection {
  seq: number; templateSeq: number; title: string; sortOrder: number;
}

export interface SurveyQuestion {
  seq: number; templateSeq: number; sectionSeq: number | null;
  questionKey: string; title: string; description: string | null;
  inputType: 'radio' | 'checkbox' | 'text';
  isGrouped: boolean; groupLabel: string | null; sortOrder: number; required: boolean;
}

export interface SurveyOption {
  seq: number; templateSeq: number; questionSeq: number;
  groupName: string; label: string; sortOrder: number; createdDate: string;
}

export interface SurveySubmissionItem {
  seq: number; name: string; phoneNumber: string; templateName: string; createdDate: string;
}

export interface SurveySubmissionDetail {
  seq: number; templateSeq: number; templateName: string;
  name: string; phoneNumber: string; gender: string | null;
  location: string | null; ageGroup: string | null;
  occupation: string | null; adSource: string | null;
  answers: string | null; questionSnapshot: string | null;
  createdDate: string; customerComment: string | null;
}

export const surveyApi = {
  listSubmissions: (params?: { page?: number; size?: number }) => {
    const sp = new URLSearchParams();
    if (params?.page != null) sp.set('page', String(params.page));
    if (params?.size != null) sp.set('size', String(params.size));
    const qs = sp.toString();
    return api.get<PageResponse<SurveySubmissionItem>>(
      `${API.SURVEY_SUBMISSIONS}${qs ? `?${qs}` : ''}`
    );
  },
  getSubmission: (seq: number) => api.get<SurveySubmissionDetail>(API.SURVEY_SUBMISSION(seq)),
  listTemplates: () => api.get<SurveyTemplate[]>(API.SURVEY_TEMPLATES),
  getTemplate: (seq: number) => api.get<SurveyTemplate>(API.SURVEY_TEMPLATE(seq)),
  createTemplate: (data: { name: string; description?: string }) =>
    api.post<SurveyTemplate>(API.SURVEY_TEMPLATES, data),
  updateTemplate: (seq: number, data: { name?: string; description?: string; customerFieldOptions?: Record<string, string[]>; customerFieldOrder?: string[] }) =>
    api.put<SurveyTemplate>(API.SURVEY_TEMPLATE(seq), data),
  updateStatus: (seq: number, status: string) =>
    api.put<SurveyTemplate>(API.SURVEY_TEMPLATE_STATUS(seq), { status }),
  copyTemplate: (seq: number) => api.post<SurveyTemplate>(API.SURVEY_TEMPLATE_COPY(seq)),
  deleteTemplate: (seq: number) => api.delete<void>(API.SURVEY_TEMPLATE(seq)),

  listSections: (templateSeq: number) => api.get<SurveySection[]>(API.SURVEY_SECTIONS(templateSeq)),
  createSection: (templateSeq: number, data: { title: string }) =>
    api.post<SurveySection>(API.SURVEY_SECTIONS(templateSeq), data),
  updateSection: (templateSeq: number, sectionSeq: number, data: { title: string }) =>
    api.put<SurveySection>(API.SURVEY_SECTION(templateSeq, sectionSeq), data),
  deleteSection: (templateSeq: number, sectionSeq: number) =>
    api.delete<void>(API.SURVEY_SECTION(templateSeq, sectionSeq)),

  listQuestions: (templateSeq: number) => api.get<SurveyQuestion[]>(API.SURVEY_QUESTIONS(templateSeq)),
  createQuestion: (templateSeq: number, data: Partial<SurveyQuestion> & { sectionSeq?: number }) =>
    api.post<SurveyQuestion>(API.SURVEY_QUESTIONS(templateSeq), data),
  updateQuestion: (templateSeq: number, questionSeq: number, data: Partial<SurveyQuestion>) =>
    api.put<SurveyQuestion>(API.SURVEY_QUESTION(templateSeq, questionSeq), data),
  deleteQuestion: (templateSeq: number, questionSeq: number) =>
    api.delete<void>(API.SURVEY_QUESTION(templateSeq, questionSeq)),
  reorderQuestions: (templateSeq: number, items: { seq: number; sortOrder: number; newQuestionKey: string }[]) =>
    api.put<SurveyQuestion[]>(`${API.SURVEY_QUESTIONS(templateSeq)}/reorder`, { items }),

  listOptions: (templateSeq: number, questionSeq?: number) =>
    api.get<SurveyOption[]>(`${API.SURVEY_OPTIONS(templateSeq)}${questionSeq ? `?questionSeq=${questionSeq}` : ''}`),
  createOption: (templateSeq: number, data: { questionSeq: number; groupName?: string; label: string }) =>
    api.post<SurveyOption>(API.SURVEY_OPTIONS(templateSeq), data),
  deleteOption: (templateSeq: number, optionSeq: number) =>
    api.delete<void>(API.SURVEY_OPTION(templateSeq, optionSeq)),
  reorderOptions: (templateSeq: number, items: { seq: number; sortOrder: number }[]) =>
    api.put<SurveyOption[]>(`${API.SURVEY_OPTIONS(templateSeq)}/reorder`, { items }),
};

export interface SurveySubmitData {
  templateSeq: number;
  reservationSeq?: number;
  name: string;
  phoneNumber: string;
  gender: string;
  location: string;
  ageGroup: string;
  occupation: string;
  adSource: string;
  answers: Record<string, string | string[]>;
  consents?: { consentItemSeq: number; agreed: boolean }[];
}

export const publicSurveyApi = {
  submit: (data: SurveySubmitData) => api.post<void>(API.PUBLIC_SURVEY_SUBMIT, data),
};
