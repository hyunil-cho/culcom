'use client';

import Link from 'next/link';
import { noticeApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { useFormState } from '@/hooks/useFormState';
import NoticeForm, { NoticeFormData } from '../NoticeForm';

export default function NoticeAddPage() {
  const { form, handleChange, submitting, submit, showError, modal } = useFormState<NoticeFormData>(
    { title: '', content: '', category: '스터디시간', isPinned: false, createdBy: '', eventStartDate: '', eventEndDate: '' },
    { redirectPath: ROUTES.NOTICES, invalidateKeys: ['notices'] },
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      showError('제목과 내용은 필수 입력 항목입니다.');
      return;
    }
    await submit(noticeApi.create({
      title: form.title,
      content: form.content,
      category: form.category,
      isPinned: form.isPinned,
      createdBy: form.createdBy || undefined,
      eventStartDate: form.eventStartDate || undefined,
      eventEndDate: form.eventEndDate || undefined,
    }), '스터디시간이 등록되었습니다.');
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
