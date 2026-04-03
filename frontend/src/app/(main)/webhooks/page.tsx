'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { webhookApi, type WebhookConfig } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { Button } from '@/components/ui/Button';
import DataTable, { type Column } from '@/components/ui/DataTable';
import ResultModal from '@/components/ui/ResultModal';

const METHOD_COLORS: Record<string, string> = {
  POST: '#49cc90', PUT: '#fca130', PATCH: '#50e3c2', GET: '#61affe', DELETE: '#f93e3e',
};

export default function WebhooksPage() {
  const router = useRouter();
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const load = () => { webhookApi.list().then(res => setWebhooks(res.data)); };

  useEffect(() => { load(); }, []);


  const columns: Column<WebhookConfig>[] = [
    { header: '이름', render: (w) => <strong>{w.name}</strong> },
    { header: '소스', render: (w) => <span style={{ fontWeight: 600 }}>{w.sourceName}</span> },
    {
      header: '메서드',
      render: (w) => (
        <span style={{
          padding: '2px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 700, color: 'white',
          background: METHOD_COLORS[w.httpMethod] ?? '#888',
        }}>{w.httpMethod}</span>
      ),
    },
    {
      header: '엔드포인트',
      render: (w) => <code style={{ fontSize: '0.85rem', color: '#555' }}>/webhook/{w.seq}</code>,
    },
    {
      header: '상태',
      render: (w) => (
        <span className={`badge ${w.isActive ? 'badge-success' : 'badge-warning'}`}>
          {w.isActive ? '활성' : '비활성'}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title" style={{ marginBottom: 0 }}>웹훅 관리</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={() => router.push(ROUTES.WEBHOOK_LOGS)}>수신 이력</Button>
          <Button onClick={() => router.push(ROUTES.WEBHOOKS_ADD)}>+ 웹훅 추가</Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={webhooks}
        rowKey={(w) => w.seq}
        emptyMessage="등록된 웹훅이 없습니다."
        onRowClick={(w) => router.push(ROUTES.WEBHOOK_EDIT(w.seq))}
      />

      {result && (
        <ResultModal success={result.success} message={result.message}
          onConfirm={() => { setResult(null); load(); }} />
      )}
    </>
  );
}
