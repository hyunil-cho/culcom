'use client';

import { useState } from 'react';
import Link from 'next/link';
import { messageTemplateApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import ResultModal from '@/components/ui/ResultModal';
import MessageTemplateForm, { MessageTemplateFormData } from '../MessageTemplateForm';

export default function MessageTemplateAddPage() {
  const [form, setForm] = useState<MessageTemplateFormData>({
    templateName: '',
    description: '',
    messageContext: '',
    isActive: true,
  });
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.templateName.trim() || !form.messageContext.trim()) {
      setResult({ success: false, message: '템플릿 이름과 메시지 내용은 필수 입력 항목입니다.' });
      return;
    }
    setSubmitting(true);
    const res = await messageTemplateApi.create({
      templateName: form.templateName,
      description: form.description || undefined,
      messageContext: form.messageContext,
      isActive: form.isActive,
    });
    setSubmitting(false);
    setResult({
      success: res.success,
      message: res.success ? '템플릿이 등록되었습니다.' : '등록에 실패했습니다.',
    });
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

      {result && (
        <ResultModal
          success={result.success}
          message={result.message}
          {...(result.success ? { redirectPath: ROUTES.MESSAGE_TEMPLATES } : { onConfirm: () => setResult(null) })}
        />
      )}
    </>
  );
}
