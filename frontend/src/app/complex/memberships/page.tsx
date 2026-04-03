'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { membershipApi, type Membership } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { Button } from '@/components/ui/Button';
import DataTable, { type Column } from '@/components/ui/DataTable';
import ResultModal from '@/components/ui/ResultModal';

function formatDuration(days: number): string {
  if (days > 0 && days % 365 === 0) return `${days / 365}년`;
  if (days > 0 && days % 30 === 0) return `${days / 30}개월`;
  return `${days}일`;
}

function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR') + '원';
}

export default function MembershipsPage() {
  const router = useRouter();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => { load(); }, []);

  const load = () => { membershipApi.list().then(res => setMemberships(res.data)); };


  const columns: Column<Membership>[] = [
    { header: '멤버십 이름', render: (m) => m.name },
    { header: '유효 기간', render: (m) => formatDuration(m.duration) },
    { header: '수강 횟수', render: (m) => `${m.count}회` },
    { header: '판매 가격', render: (m) => formatPrice(m.price) },
    { header: '등록일', render: (m) => m.createdDate?.split('T')[0] ?? '-' },
  ];

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title" style={{ marginBottom: 0 }}>멤버십 관리</h2>
        <Button onClick={() => router.push(ROUTES.COMPLEX_MEMBERSHIPS_ADD)}>+ 신규 멤버십 등록</Button>
      </div>

      <DataTable
        columns={columns}
        data={memberships}
        rowKey={(m) => m.seq}
        emptyMessage="등록된 멤버십 정보가 없습니다."
        onRowClick={(m) => router.push(ROUTES.COMPLEX_MEMBERSHIP_EDIT(m.seq))}
      />

      {result && (
        <ResultModal
          success={result.success}
          message={result.message}
          onConfirm={() => { setResult(null); load(); }}
        />
      )}
    </>
  );
}
