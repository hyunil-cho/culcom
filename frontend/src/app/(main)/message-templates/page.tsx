'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { messageTemplateApi, MessageTemplateItem } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useResultModal } from '@/hooks/useResultModal';
import { Button, LinkButton } from '@/components/ui/Button';
import s from './page.module.css';

export default function MessageTemplatesPage() {
  return <Suspense><MessageTemplatesContent /></Suspense>;
}

function MessageTemplatesContent() {
  const [templates, setTemplates] = useState<MessageTemplateItem[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<MessageTemplateItem | null>(null);
  const [defaultTarget, setDefaultTarget] = useState<MessageTemplateItem | null>(null);
  const { run, modal } = useResultModal();

  const fetchTemplates = useCallback(async () => {
    const res = await messageTemplateApi.list();
    if (res.success) setTemplates(res.data);
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await run(messageTemplateApi.delete(deleteTarget.seq), '템플릿이 삭제되었습니다.');
    setDeleteTarget(null);
    if (res.success) fetchTemplates();
  };

  const handleSetDefault = async () => {
    if (!defaultTarget) return;
    const res = await run(messageTemplateApi.setDefault(defaultTarget.seq), '기본 템플릿이 설정되었습니다.');
    setDefaultTarget(null);
    if (res.success) fetchTemplates();
  };

  return (
    <>
      <div className={s.header}>
        <h1 className={s.title}>메시지 템플릿 관리</h1>
        <LinkButton href={ROUTES.MESSAGE_TEMPLATES_ADD} style={{ padding: '0.6rem 1.2rem' }}>새 템플릿 만들기</LinkButton>
      </div>

      {templates.length === 0 ? (
        <div className={`content-card ${s.emptyCard}`}>
          <div className={s.emptyIcon}>📭</div>
          <h3 className={s.emptyTitle}>등록된 템플릿이 없습니다</h3>
          <p>새 템플릿을 만들어 메시지를 효율적으로 관리하세요</p>
        </div>
      ) : (
        <div className={s.grid}>
          {templates.map((t) => (
            <div key={t.seq} className={`content-card ${t.isActive ? s.templateCard : s.templateCardInactive}`}>
              <span className={t.isActive ? s.statusActive : s.statusInactive}>
                {t.isActive ? '사용 중' : '비활성'}
              </span>

              <h3 className={s.templateTitle}>
                {t.templateName}
                {t.isDefault && <span className={s.defaultBadge}>기본</span>}
              </h3>

              {t.description && <p className={s.templateDesc}>{t.description}</p>}

              {t.messageContext && <div className={s.messageContent}>{t.messageContext}</div>}

              <div className={s.meta}>
                <span>생성: {t.createdDate || '-'}</span>
                <span>수정: {t.lastUpdateDate || '-'}</span>
              </div>

              <div className={s.actions}>
                {!t.isDefault && t.isActive && (
                  <Button variant="secondary"
                    style={{ flex: 1, padding: '8px 16px', fontSize: 13, background: '#fff8e1', borderColor: '#ffc107', color: '#333' }}
                    onClick={() => setDefaultTarget(t)}>기본 설정</Button>
                )}
                <LinkButton href={ROUTES.MESSAGE_TEMPLATE_EDIT(t.seq)}
                  style={{ flex: 1, padding: '8px 16px', fontSize: 13, textAlign: 'center' }}>수정</LinkButton>
                <Button variant="secondary"
                  style={{ flex: 1, padding: '8px 16px', fontSize: 13, background: '#ffebee', borderColor: '#f44336', color: '#d32f2f' }}
                  onClick={() => setDeleteTarget(t)}>삭제</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal title="템플릿 삭제" onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete}
          confirmLabel="삭제" confirmColor="var(--danger)">
          <p>&quot;{deleteTarget.templateName}&quot; 템플릿을 삭제하시겠습니까?</p>
          <p className={s.subNote}>이 작업은 되돌릴 수 없습니다.</p>
        </ConfirmModal>
      )}

      {defaultTarget && (
        <ConfirmModal title="기본 템플릿 설정" onCancel={() => setDefaultTarget(null)} onConfirm={handleSetDefault}
          confirmLabel="설정" confirmColor="var(--success, #4caf50)">
          <p>&quot;{defaultTarget.templateName}&quot; 템플릿을 기본값으로 설정하시겠습니까?</p>
          <p className={s.subNoteAlt}>기존 기본값은 자동으로 해제됩니다.</p>
        </ConfirmModal>
      )}

      {modal}
    </>
  );
}
