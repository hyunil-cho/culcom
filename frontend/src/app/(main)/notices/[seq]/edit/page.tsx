'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { noticeApi } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { ROUTES } from '@/lib/routes';
import { useFormState } from '@/hooks/useFormState';
import NoticeForm, { NoticeFormData } from '../../NoticeForm';

export default function NoticeEditPage() {
  const params = useParams();
  const seq = Number(params.seq);

  const { form, setForm, handleChange, submitting, submit, showError, modal } = useFormState<NoticeFormData>(
    { title: '', content: '', category: '공지사항', isPinned: false, createdBy: '', eventStartDate: '', eventEndDate: '' },
    { redirectPath: ROUTES.NOTICE_DETAIL(seq) },
  );

  const { data: noticeData, isLoading: loading } = useApiQuery(
    ['notice', seq],
    () => noticeApi.get(seq),
  );

  useEffect(() => {
    if (noticeData) {
      setForm({
        title: noticeData.title,
        content: noticeData.content,
        category: noticeData.category,
        isPinned: noticeData.isPinned,
        createdBy: noticeData.createdBy,
        eventStartDate: noticeData.eventStartDate || '',
        eventEndDate: noticeData.eventEndDate || '',
      });
    }
  }, [noticeData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      showError('제목과 내용은 필수 입력 항목입니다.');
      return;
    }
    await submit(noticeApi.update(seq, {
      title: form.title,
      content: form.content,
      category: form.category,
      isPinned: form.isPinned,
      eventStartDate: form.eventStartDate || undefined,
      eventEndDate: form.eventEndDate || undefined,
    }), '공지사항이 수정되었습니다.');
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>로딩 중...</div>;
  }

  return (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <Link href={ROUTES.NOTICE_DETAIL(seq)} style={{ color: '#666', textDecoration: 'none', fontSize: '0.9rem' }}>
          &larr; 돌아가기
        </Link>
      </div>

      <NoticeForm
        form={form}
        onChange={handleChange}
        onSubmit={handleSubmit}
        heading="글 수정"
        submitLabel="수정하기"
        submittingLabel="수정 중..."
        submitting={submitting}
        cancelHref={ROUTES.NOTICE_DETAIL(seq)}
        disableCreatedBy
      />

      {modal}
    </>
  );
}
