'use client';

import { useState } from 'react';
import type { ConfigItem, ConfigCreateRequest, ConfigUpdateRequest } from '@/lib/api';
import type { ApiResponse } from '@/lib/api/client';
import { useApiQuery } from '@/hooks/useApiQuery';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/Button';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ResultModal from '@/components/ui/ResultModal';
import Spinner from '@/components/ui/Spinner';

interface CatalogApi {
  list: () => Promise<ApiResponse<ConfigItem[]>>;
  create: (data: ConfigCreateRequest) => Promise<ApiResponse<ConfigItem>>;
  update: (seq: number, data: ConfigUpdateRequest) => Promise<ApiResponse<ConfigItem>>;
  delete: (seq: number) => Promise<ApiResponse<void>>;
}

interface Props {
  title: string;
  description: string;
  api: CatalogApi;
  showHeader?: boolean;
}

export default function ConfigCatalogPage({ title, description, api, showHeader = true }: Props) {
  const configQueryKey = ['configCatalog', title];

  const { data: items = [], isLoading: loading } = useApiQuery<ConfigItem[]>(
    configQueryKey,
    () => api.list(),
  );

  const [adding, setAdding] = useState(false);
  const [newCode, setNewCode] = useState('');

  const [confirmDelete, setConfirmDelete] = useState<ConfigItem | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const load = () => queryClient.invalidateQueries({ queryKey: configQueryKey });

  const toggleActive = async (it: ConfigItem) => {
    try {
      await api.update(it.seq, { isActive: !it.isActive });
      load();
    } catch (e: any) {
      setResult({ success: false, message: e?.message ?? '저장 실패' });
    }
  };

  const handleAdd = async () => {
    if (!newCode.trim()) {
      setResult({ success: false, message: '코드를 입력해 주세요' });
      return;
    }
    try {
      await api.create({ code: newCode.trim(), isActive: true });
      setAdding(false);
      setNewCode('');
      load();
    } catch (e: any) {
      setResult({ success: false, message: e?.message ?? '추가 실패' });
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(confirmDelete.seq);
      setConfirmDelete(null);
      load();
    } catch (e: any) {
      setResult({ success: false, message: e?.message ?? '삭제 실패' });
    }
  };

  return (
    <>
      {showHeader && (
        <div className="page-toolbar">
          <h2 className="page-title" style={{ marginBottom: 0 }}>{title}</h2>
          {!adding && <Button onClick={() => setAdding(true)}>+ 추가</Button>}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ color: '#888', fontSize: 13, margin: 0 }}>{description}</p>
        {!showHeader && !adding && <Button onClick={() => setAdding(true)}>+ 추가</Button>}
      </div>

      {adding && (
        <div className="card" style={{ padding: 14, marginBottom: 14, border: '1px solid #4a90e2' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              placeholder="코드 (예: CARD)"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              style={{ ...inputStyle, width: 180, fontFamily: 'monospace' }}
            />
            <Button onClick={handleAdd}>저장</Button>
            <button onClick={() => { setAdding(false); setNewCode(''); }}
              style={{ padding: '8px 14px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>
              취소
            </button>
          </div>
          <small style={{ color: '#888', display: 'block', marginTop: 8 }}>
            * 코드는 시스템 식별자로 생성 후 변경할 수 없습니다.
          </small>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>등록된 항목이 없습니다.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#fafbfc', color: '#888', fontSize: 12 }}>
                <th style={th}>코드</th>
                <th style={{ ...th, width: 100 }}>상태</th>
                <th style={{ ...th, width: 220, textAlign: 'right' }}>액션</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.seq} style={{ borderTop: '1px solid #f1f3f5' }}>
                  <td style={{ ...td, fontFamily: 'monospace', color: '#666' }}>
                    {it.code}
                    {it.locked && (
                      <span style={{
                        marginLeft: 8, fontSize: 10, fontWeight: 700,
                        padding: '2px 6px', borderRadius: 8,
                        background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe',
                        fontFamily: 'inherit',
                      }}>
                        기본
                      </span>
                    )}
                  </td>
                  <td style={td}>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      padding: '2px 8px', borderRadius: 10,
                      background: it.isActive ? '#f0fdf4' : '#f1f3f5',
                      color: it.isActive ? '#2e7d32' : '#999',
                      border: `1px solid ${it.isActive ? '#bbf7d0' : '#dee2e6'}`,
                    }}>
                      {it.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    {it.locked ? (
                      <span style={{ fontSize: 12, color: '#888' }}>변경 불가</span>
                    ) : (
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          onClick={() => toggleActive(it)}
                          style={btnStyle(it.isActive ? '#888' : '#2e7d32')}
                        >
                          {it.isActive ? '비활성화' : '활성화'}
                        </button>
                        <button onClick={() => setConfirmDelete(it)} style={btnStyle('#e03131')}>삭제</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirmDelete && (
        <ConfirmModal
          title="삭제 확인"
          confirmLabel="삭제"
          confirmColor="#e03131"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
        >
          <p style={{ margin: 0 }}>
            <strong>{confirmDelete.code}</strong> 을(를) 삭제하시겠습니까?
            <br />
            <small style={{ color: '#888' }}>
              * 이미 이 항목을 참조하는 결제 기록이 있다면 표시에 영향이 갈 수 있습니다.
              비활성화로 대체하는 것을 권장합니다.
            </small>
          </p>
        </ConfirmModal>
      )}

      {result && (
        <ResultModal
          success={result.success}
          message={result.message}
          onConfirm={() => setResult(null)}
        />
      )}
    </>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6,
  fontFamily: 'inherit', fontSize: 14,
};

const th: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontWeight: 600 };
const td: React.CSSProperties = { padding: '12px 14px' };

function btnStyle(color: string): React.CSSProperties {
  return {
    background: 'transparent',
    border: `1px solid ${color}`,
    color,
    borderRadius: 4,
    padding: '5px 12px',
    fontSize: 12,
    cursor: 'pointer',
    fontWeight: 600,
  };
}
