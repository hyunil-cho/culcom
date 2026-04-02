'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { messageTemplateApi } from '@/lib/api';
import ResultModal from '@/components/ui/ResultModal';
import MessageTemplateForm, { MessageTemplateFormData } from '../../MessageTemplateForm';

export default function MessageTemplateEditPage() {
  const params = useParams();
  const seq = Number(params.seq);

  const [form, setForm] = useState<MessageTemplateFormData>({
    templateName: '',
    description: '',
    messageContext: '',
    isActive: true,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

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
    const res = await messageTemplateApi.update(seq, {
      templateName: form.templateName,
      description: form.description || undefined,
      messageContext: form.messageContext,
      isActive: form.isActive,
    });
    setSubmitting(false);
    setResult({
      success: res.success,
      message: res.success ? '템플릿이 수정되었습니다.' : '수정에 실패했습니다.',
    });
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>로딩 중...</div>;
  }

  return (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/message-templates" style={{ color: '#666', textDecoration: 'none', fontSize: '0.9rem' }}>
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
        cancelHref="/message-templates"
      />

      {result && (
        <ResultModal
          success={result.success}
          message={result.message}
          {...(result.success ? { redirectPath: '/message-templates' } : { onConfirm: () => setResult(null) })}
        />
      )}
    </>
  );
}
