'use client';

import { useState } from 'react';
import Link from 'next/link';
import { noticeApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { useResultModal } from '@/hooks/useResultModal';
import NoticeForm, { NoticeFormData } from '../NoticeForm';

export default function NoticeAddPage() {
  const [form, setForm] = useState<NoticeFormData>({
    title: '',
    content: '',
    category: '공지사항',
    isPinned: false,
    createdBy: '',
    eventStartDate: '',
    eventEndDate: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const { run, showError, modal } = useResultModal({ redirectPath: ROUTES.NOTICES });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      showError('제목과 내용은 필수 입력 항목입니다.');
      return;
    }
    setSubmitting(true);
    await run(noticeApi.create({
      title: form.title,
      content: form.content,
      category: form.category,
      isPinned: form.isPinned,
      createdBy: form.createdBy || undefined,
      eventStartDate: form.eventStartDate || undefined,
      eventEndDate: form.eventEndDate || undefined,
    }), '공지사항이 등록되었습니다.');
    setSubmitting(false);
  };

  return (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <Link href={ROUTES.NOTICES} style={{ color: '#666', textDecoration: 'none', fontSize: '0.9rem' }}>
          &larr; 목록으로
        </Link>
      </div>

      <NoticeForm
        form={form}
        onChange={handleChange}
        onSubmit={handleSubmit}
        heading="새 글 작성"
        submitLabel="등록하기"
        submittingLabel="등록 중..."
        submitting={submitting}
        cancelHref={ROUTES.NOTICES}
      />

      {modal}
    </>
  );
}
