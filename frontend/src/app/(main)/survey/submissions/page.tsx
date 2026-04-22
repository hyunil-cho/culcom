'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { surveyApi, type SurveySubmissionItem } from '@/lib/api';
import type { PageResponse } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useQueryParams } from '@/lib/useQueryParams';
import { ROUTES } from '@/lib/routes';
import Spinner from '@/components/ui/Spinner';
import DataTable, { type Column } from '@/components/ui/DataTable';

const DEFAULTS = { page: '0' };

export default function SurveySubmissionsPage() {
  return <Suspense><SurveySubmissionsContent /></Suspense>;
}

function SurveySubmissionsContent() {
  const router = useRouter();
  const { params, setParams } = useQueryParams(DEFAULTS);
  const page = Number(params.page) || 0;

  const { data: pageData, isLoading: loading } = useApiQuery<PageResponse<SurveySubmissionItem>>(
    ['surveySubmissions', page],
    () => surveyApi.listSubmissions({ page, size: 20 }),
  );
  const submissions = pageData?.content ?? [];
  const totalPages = pageData?.totalPages ?? 0;

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const columns: Column<SurveySubmissionItem>[] = [
    { header: '번호', render: (_, i) => (i ?? 0) + 1, style: { width: '60px', textAlign: 'center' } },
    { header: '이름', render: item => item.name },
    { header: '연락처', render: item => item.phoneNumber },
    { header: '설문지', render: item => item.templateName },
    { header: '제출일시', render: item => formatDate(item.createdDate) },
  ];

  if (loading) return <Spinner />;

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title" style={{ margin: 0 }}>설문 응답 조회</h2>
      </div>
      <DataTable
        columns={columns}
        data={submissions}
        rowKey={item => item.seq}
        headerInfo={`총 ${pageData?.totalElements ?? 0}건`}
        onRowClick={item => router.push(ROUTES.SURVEY_SUBMISSION_DETAIL(item.seq))}
        emptyMessage="제출된 설문이 없습니다."
        pagination={{
          page,
          totalPages,
          onPageChange: (p) => setParams({ page: String(p) }),
        }}
      />
    </>
  );
}
