'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { customerApi, type Customer } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { formatDateTime } from '@/lib/dateUtils';
import DetailCard from '@/components/ui/DetailCard';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ResultModal from '@/components/ui/ResultModal';

const STATUS_BADGE: Record<string, string> = {
  '신규': 'status-active',
  '진행중': 'status-warning',
  '예약확정': 'status-active',
  '콜수초과': 'status-inactive',
  '전화상거절': 'status-inactive',
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const seq = Number(params.seq);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    customerApi.get(seq).then(res => {
      if (res.success) setCustomer(res.data);
    });
  }, [seq]);

  if (!customer) return null;

  return (
    <>
      <div className="detail-actions">
        <Link href={ROUTES.CUSTOMERS} className="btn-back">← 목록으로</Link>
        <div className="action-group" style={{ display: 'flex', gap: 8 }}>
          <Link href={ROUTES.CUSTOMER_EDIT(seq)} className="btn-primary btn-nav">수정</Link>
          <button className="btn-secondary" style={{ color: 'var(--danger)' }} onClick={() => setDeleting(true)}>삭제</button>
        </div>
      </div>

      <DetailCard
        title="기본 정보"
        fields={[
          { label: '이름', value: <strong style={{ fontSize: '1.1rem' }}>{customer.name}</strong> },
          { label: '전화번호', value: customer.phoneNumber },
          { label: '상태', value: <span className={`status-badge ${STATUS_BADGE[customer.status] ?? ''}`}>{customer.status}</span> },
          { label: '누적 콜 수', value: `${customer.callCount}회` },
          { label: '코멘트', value: customer.comment || '-' },
          { label: '광고명', value: customer.commercialName || '-' },
          { label: '지원경로', value: customer.adSource || '-' },
          { label: '등록일', value: customer.createdDate?.split('T')[0] ?? '-' },
          { label: '최종 업데이트', value: formatDateTime(customer.lastUpdateDate) || '-' },
        ]}
      />

      {deleting && (
        <ConfirmModal
          title="삭제 확인"
          onCancel={() => setDeleting(false)}
          onConfirm={async () => {
            const res = await customerApi.delete(seq);
            setDeleting(false);
            if (res.success) setResult({ success: true, message: '고객이 삭제되었습니다.' });
          }}
          confirmLabel="삭제"
          confirmColor="#f44336"
        >
          <strong>{customer.name}</strong> 고객을 삭제하시겠습니까?<br />이 작업은 되돌릴 수 없습니다.
        </ConfirmModal>
      )}

      {result && (
        <ResultModal success={result.success} message={result.message} redirectPath={ROUTES.CUSTOMERS} />
      )}
    </>
  );
}
