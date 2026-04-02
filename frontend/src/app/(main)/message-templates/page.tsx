'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { messageTemplateApi, MessageTemplateItem } from '@/lib/api';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ResultModal from '@/components/ui/ResultModal';

export default function MessageTemplatesPage() {
  return <Suspense><MessageTemplatesContent /></Suspense>;
}

function MessageTemplatesContent() {
  const [templates, setTemplates] = useState<MessageTemplateItem[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<MessageTemplateItem | null>(null);
  const [defaultTarget, setDefaultTarget] = useState<MessageTemplateItem | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchTemplates = useCallback(async () => {
    const res = await messageTemplateApi.list();
    if (res.success) {
      setTemplates(res.data);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await messageTemplateApi.delete(deleteTarget.seq);
    setDeleteTarget(null);
    setResult({ success: res.success, message: res.success ? '템플릿이 삭제되었습니다.' : '삭제에 실패했습니다.' });
    if (res.success) fetchTemplates();
  };

  const handleSetDefault = async () => {
    if (!defaultTarget) return;
    const res = await messageTemplateApi.setDefault(defaultTarget.seq);
    setDefaultTarget(null);
    setResult({ success: res.success, message: res.success ? '기본 템플릿이 설정되었습니다.' : '설정에 실패했습니다.' });
    if (res.success) fetchTemplates();
  };

  return (
    <>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>메시지 템플릿 관리</h1>
        <Link href="/message-templates/add" className="btn-primary" style={{ padding: '0.6rem 1.2rem', textDecoration: 'none' }}>
          새 템플릿 만들기
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="content-card" style={{ padding: '4rem 2rem', textAlign: 'center', color: '#999' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          <h3 style={{ margin: '0 0 8px', color: '#666' }}>등록된 템플릿이 없습니다</h3>
          <p>새 템플릿을 만들어 메시지를 효율적으로 관리하세요</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
          gap: 20,
        }}>
          {templates.map((t) => (
            <div
              key={t.seq}
              className="content-card"
              style={{
                padding: 20,
                position: 'relative',
                opacity: t.isActive ? 1 : 0.7,
                background: t.isActive ? 'white' : '#f9f9f9',
              }}
            >
              {/* 상태 배지 */}
              <span
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  padding: '4px 10px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 500,
                  background: t.isActive ? '#e8f5e9' : '#f5f5f5',
                  color: t.isActive ? '#2e7d32' : '#666',
                }}
              >
                {t.isActive ? '사용 중' : '비활성'}
              </span>

              {/* 제목 */}
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                {t.templateName}
                {t.isDefault && (
                  <span style={{
                    padding: '3px 10px',
                    background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
                    color: '#8b6914',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 600,
                  }}>
                    기본
                  </span>
                )}
              </h3>

              {/* 설명 */}
              {t.description && (
                <p style={{ color: '#666', fontSize: 13, margin: '8px 0 12px', lineHeight: 1.4 }}>
                  {t.description}
                </p>
              )}

              {/* 메시지 내용 */}
              {t.messageContext && (
                <div style={{
                  background: '#f9f9f9',
                  borderLeft: '3px solid var(--primary, #667eea)',
                  padding: 12,
                  borderRadius: 4,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: '#333',
                  margin: '12px 0',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {t.messageContext}
                </div>
              )}

              {/* 메타 정보 */}
              <div style={{
                display: 'flex',
                gap: 16,
                fontSize: 12,
                color: '#999',
                marginTop: 12,
                paddingTop: 12,
                borderTop: '1px solid #f0f0f0',
              }}>
                <span>생성: {t.createdDate || '-'}</span>
                <span>수정: {t.lastUpdateDate || '-'}</span>
              </div>

              {/* 액션 버튼 */}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                {!t.isDefault && t.isActive && (
                  <button
                    className="btn-secondary"
                    style={{ flex: 1, padding: '8px 16px', fontSize: 13, background: '#fff8e1', borderColor: '#ffc107', color: '#333' }}
                    onClick={() => setDefaultTarget(t)}
                  >
                    기본 설정
                  </button>
                )}
                <Link
                  href={`/message-templates/${t.seq}/edit`}
                  className="btn-primary"
                  style={{ flex: 1, padding: '8px 16px', fontSize: 13, textDecoration: 'none', textAlign: 'center' }}
                >
                  수정
                </Link>
                <button
                  className="btn-secondary"
                  style={{ flex: 1, padding: '8px 16px', fontSize: 13, background: '#ffebee', borderColor: '#f44336', color: '#d32f2f' }}
                  onClick={() => setDeleteTarget(t)}
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="템플릿 삭제"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          confirmLabel="삭제"
          confirmColor="var(--danger)"
        >
          <p>&quot;{deleteTarget.templateName}&quot; 템플릿을 삭제하시겠습니까?</p>
          <p style={{ fontSize: '0.85rem', color: '#999' }}>이 작업은 되돌릴 수 없습니다.</p>
        </ConfirmModal>
      )}

      {defaultTarget && (
        <ConfirmModal
          title="기본 템플릿 설정"
          onCancel={() => setDefaultTarget(null)}
          onConfirm={handleSetDefault}
          confirmLabel="설정"
          confirmColor="var(--success, #4caf50)"
        >
          <p>&quot;{defaultTarget.templateName}&quot; 템플릿을 기본값으로 설정하시겠습니까?</p>
          <p style={{ fontSize: '0.85rem', color: '#666' }}>기존 기본값은 자동으로 해제됩니다.</p>
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
