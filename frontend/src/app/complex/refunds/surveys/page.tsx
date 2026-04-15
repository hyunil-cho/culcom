'use client';

import { useState } from 'react';
import Link from 'next/link';
import { refundSurveyApi, type RefundSurveyResponse } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { useListPageQuery } from '@/hooks/useListPageQuery';
import { useModal } from '@/hooks/useModal';
import DataTable, { type Column } from '@/components/ui/DataTable';
import SearchBar from '@/components/ui/SearchBar';
import ModalOverlay from '@/components/ui/ModalOverlay';
import SurveyDetailView from '../SurveyDetailView';
import s from './page.module.css';

export default function RefundSurveysPage() {
  const list = useListPageQuery<RefundSurveyResponse>('refundSurveys', (q) => refundSurveyApi.list(q));
  const [keyword, setKeyword] = useState('');
  const detailModal = useModal<RefundSurveyResponse>();

  const handleSearch = () => { list.load(0, { keyword }); };

  const columns: Column<RefundSurveyResponse>[] = [
    { header: '제출일', render: (r) => r.createdDate?.split('T')[0] ?? '-' },
    { header: '회원명', render: (r) => <strong>{r.memberName}</strong> },
    { header: '연락처', render: (r) => r.phoneNumber },
    { header: '참여기간', render: (r) => r.participationPeriod },
    { header: '소속감', render: (r) => <span>{r.belongingScore}점</span> },
    { header: '팀구성 영향', render: (r) => <span className={s.truncate}>{r.teamImpact}</span> },
    { header: '재수강 의향', render: (r) => (
      <span className={s.starScore}>{'★'.repeat(r.reEnrollScore)}{'☆'.repeat(5 - r.reEnrollScore)}</span>
    )},
    { header: '상세', render: (r) => (
      <button className={s.detailBtn} onClick={(e) => { e.stopPropagation(); detailModal.open(r); }}>보기</button>
    ), style: { width: 70, textAlign: 'center' } },
  ];

  return (
    <>
      <div className="page-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href={ROUTES.COMPLEX_REFUNDS} className={s.backLink}>← 환불관리</Link>
          <h2 className="page-title" style={{ marginBottom: 0 }}>설문 응답 관리</h2>
        </div>
      </div>

      <SearchBar keyword={keyword} onKeywordChange={setKeyword} onSearch={handleSearch}
        onReset={keyword ? () => { setKeyword(''); list.load(0); } : undefined}
        placeholder="회원명 또는 연락처 검색"
      />

      <DataTable columns={columns} data={list.items} rowKey={(r) => r.seq}
        emptyMessage="설문 응답이 없습니다." pagination={list.pagination} />

      {detailModal.isOpen && detailModal.data && (
        <ModalOverlay onClose={detailModal.close}>
          <SurveyDetailView survey={detailModal.data} onClose={detailModal.close} />
        </ModalOverlay>
      )}
    </>
  );
}

