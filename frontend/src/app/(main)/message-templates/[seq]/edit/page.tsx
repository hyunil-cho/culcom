'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { messageTemplateApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { useFormState } from '@/hooks/useFormState';
import MessageTemplateForm, { MessageTemplateFormData } from '../../MessageTemplateForm';

export default function MessageTemplateEditPage() {
  const params = useParams();
  const seq = Number(params.seq);

  const { form, setForm, handleChange, submitting, submit, showError, modal } = useFormState<MessageTemplateFormData>(
    { templateName: '', description: '', messageContext: '', isActive: true },
    { redirectPath: ROUTES.MESSAGE_TEMPLATES },
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    messageTemplateApi.get(seq).then((res) => {
      if (res.success) {
        const t = res.data;
        setForm({
          templateName: t.templateName,
          description: t.description || '',
          messageContext: t.messageContext || '',
          isActive: t.isActive,
        });
      }
      setLoading(false);
    });
  }, [seq]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.templateName.trim() || !form.messageContext.trim()) {
      showError('템플릿 이름과 메시지 내용은 필수 입력 항목입니다.');
      return;
    }
    await submit(messageTemplateApi.update(seq, {
      templateName: form.templateName,
      description: form.description || undefined,
      messageContext: form.messageContext,
      isActive: form.isActive,
    }), '템플릿이 수정되었습니다.');
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>로딩 중...</div>;
  }

  return (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <Link href={ROUTES.MESSAGE_TEMPLATES} style={{ color: '#666', textDecoration: 'none', fontSize: '0.9rem' }}>
          &larr; 템플릿 목록으로
        </Link>
      </div>

      <MessageTemplateForm
        form={form}
        onChange={handleChange}
        onSubmit={handleSubmit}
        heading="템플릿 수정"
        submitLabel="수정 완료"
        submittingLabel="수정 중..."
        submitting={submitting}
        cancelHref={ROUTES.MESSAGE_TEMPLATES}
      />

      {modal}
    </>
  );
}
