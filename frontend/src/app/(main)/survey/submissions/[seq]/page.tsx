'use client';

import { useParams, useRouter } from 'next/navigation';
import { surveyApi, type SurveySubmissionDetail, type SurveyQuestion } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { ROUTES } from '@/lib/routes';
import { Button } from '@/components/ui/Button';
import DataTable, { type Column } from '@/components/ui/DataTable';

interface AnswerRow {
  key: string;
  questionTitle: string;
  answer: string;
}

export default function SurveySubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const seq = Number(params.seq);

  const { data: detail = null, isLoading: detailLoading } = useApiQuery<SurveySubmissionDetail>(
    ['surveySubmission', seq],
    () => surveyApi.getSubmission(seq),
  );

  const { data: questions = [], isLoading: questionsLoading } = useApiQuery<SurveyQuestion[]>(
    ['surveyQuestions', detail?.templateSeq],
    () => surveyApi.listQuestions(detail!.templateSeq),
    { enabled: !!detail?.templateSeq },
  );

  const loading = detailLoading || questionsLoading;

  if (loading) return <div className="content-card" style={{ textAlign: 'center', padding: '2rem' }}>로딩 중...</div>;
  if (!detail) return <div className="content-card" style={{ textAlign: 'center', padding: '2rem' }}>데이터를 찾을 수 없습니다.</div>;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });

  // 기본 정보 행
  const basicInfo: { label: string; value: string }[] = [
    { label: '설문지', value: detail.templateName },
    { label: '이름', value: detail.name },
    { label: '연락처', value: detail.phoneNumber },
    { label: '성별', value: detail.gender || '-' },
    { label: '지역', value: detail.location || '-' },
    { label: '연령대', value: detail.ageGroup || '-' },
    { label: '직업', value: detail.occupation || '-' },
    { label: '광고 유입경로', value: detail.adSource || '-' },
    { label: '제출일시', value: formatDate(detail.createdDate) },
  ];

  const basicColumns: Column<{ label: string; value: string }>[] = [
    { header: '항목', render: item => <strong>{item.label}</strong>, style: { width: '150px' } },
    { header: '내용', render: item => item.value },
  ];

  // 설문 응답 행
  const questionMap = new Map(questions.map(q => [q.questionKey, q.title]));
  let answerRows: AnswerRow[] = [];

  if (detail.answers) {
    try {
      const parsed: Record<string, string | string[]> = JSON.parse(detail.answers);
      answerRows = Object.entries(parsed).map(([key, value]) => ({
        key,
        questionTitle: questionMap.get(key) || key,
        answer: Array.isArray(value) ? value.join(', ') : String(value),
      }));
    } catch {
      answerRows = [{ key: 'raw', questionTitle: '응답 데이터', answer: detail.answers }];
    }
  }

  const answerColumns: Column<AnswerRow>[] = [
    { header: '번호', render: (_, i) => (i ?? 0) + 1, style: { width: '60px', textAlign: 'center' } },
    { header: '질문', render: item => item.questionTitle, style: { width: '40%' } },
    { header: '응답', render: item => item.answer },
  ];

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title" style={{ margin: 0 }}>설문 응답 상세</h2>
        <Button variant="secondary" onClick={() => router.push(ROUTES.SURVEY_SUBMISSIONS)}>목록으로</Button>
      </div>

      <DataTable
        columns={basicColumns}
        data={basicInfo}
        rowKey={item => item.label}
        headerInfo="기본 정보"
      />

      <div style={{ marginTop: '1.5rem' }}>
        <DataTable
          columns={answerColumns}
          data={answerRows}
          rowKey={item => item.key}
          headerInfo={`설문 응답 (${answerRows.length}개 항목)`}
          emptyMessage="응답 데이터가 없습니다."
        />
      </div>
    </>
  );
}
