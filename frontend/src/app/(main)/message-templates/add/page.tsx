'use client';

import Link from 'next/link';
import { messageTemplateApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { useFormState } from '@/hooks/useFormState';
import MessageTemplateForm, { MessageTemplateFormData } from '../MessageTemplateForm';

export default function MessageTemplateAddPage() {
  const { form, handleChange, submitting, submit, showError, modal } = useFormState<MessageTemplateFormData>(
    { templateName: '', description: '', messageContext: '', isActive: true },
    { redirectPath: ROUTES.MESSAGE_TEMPLATES },
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.templateName.trim() || !form.messageContext.trim()) {
      showError('템플릿 이름과 메시지 내용은 필수 입력 항목입니다.');
      return;
    }
    await submit(messageTemplateApi.create({
      templateName: form.templateName,
      description: form.description || undefined,
      messageContext: form.messageContext,
      isActive: form.isActive,
    }), '템플릿이 등록되었습니다.');
  };

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
        heading="새 템플릿 만들기"
        submitLabel="템플릿 저장"
        submittingLabel="저장 중..."
        submitting={submitting}
        cancelHref={ROUTES.MESSAGE_TEMPLATES}
      />

      {modal}
    </>
  );
}
