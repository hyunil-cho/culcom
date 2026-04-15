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
import s from './page.module.css';

const BELONGING_LABELS: Record<number, string> = {
  1: '전혀 그렇지 않다', 2: '조금 그렇다', 3: '보통이다', 4: '그렇다', 5: '매우 그렇다',
};

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

function SurveyDetailView({ survey, onClose }: { survey: RefundSurveyResponse; onClose: () => void }) {
  return (
    <div className={s.detailContainer}>
      <div className={s.detailHeader}>
        <h3 className={s.detailTitle}>설문 응답 상세</h3>
        <span className={s.detailDate}>{survey.createdDate?.split('T')[0]}</span>
      </div>
      <div className={s.detailInfo}>
        <span><strong>{survey.memberName}</strong></span>
        <span className={s.detailPhone}>{survey.phoneNumber}</span>
      </div>
      <div className={s.detailBody}>
        <DetailRow label="1. E-UT에 참여한 기간은 얼마나 되셨나요?" value={survey.participationPeriod} />
        <DetailRow label="2. E-UT에서 소속감을 느끼셨나요?"
          value={`${survey.belongingScore}점 - ${BELONGING_LABELS[survey.belongingScore] ?? ''}`} />
        <DetailRow label="3. 팀 구성(합병/분리)이 참여 경험에 영향을 주었나요?" value={survey.teamImpact} />
        <DetailRow label="4. E-UT 등록 당시와 가장 달랐던 점" value={survey.differenceComment || '-'} long />
        <DetailRow label="5. 개선해야 할 부분" value={survey.improvementComment || '-'} long />
        <DetailRow label="6. 재수강 의향"
          value={`${'★'.repeat(survey.reEnrollScore)}${'☆'.repeat(5 - survey.reEnrollScore)} (${survey.reEnrollScore}점)`} />
      </div>
      <div className={s.detailFooter}>
        <button onClick={onClose} className={s.closeBtn}>닫기</button>
      </div>
    </div>
  );
}

function DetailRow({ label, value, long }: { label: string; value: string; long?: boolean }) {
  return (
    <div className={s.detailRow}>
      <div className={s.detailLabel}>{label}</div>
      <div className={long ? s.detailValueLong : s.detailValue}>{value}</div>
    </div>
  );
}
