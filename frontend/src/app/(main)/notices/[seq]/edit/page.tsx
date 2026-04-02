'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { noticeApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import ResultModal from '@/components/ui/ResultModal';
import NoticeForm, { NoticeFormData } from '../../NoticeForm';

export default function NoticeEditPage() {
  const params = useParams();
  const seq = Number(params.seq);

  const [form, setForm] = useState<NoticeFormData>({
    title: '',
    content: '',
    category: '공지사항',
    isPinned: false,
    createdBy: '',
    eventStartDate: '',
    eventEndDate: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    noticeApi.get(seq).then((res) => {
      if (res.success) {
        const n = res.data;
        setForm({
          title: n.title,
          content: n.content,
          category: n.category,
          isPinned: n.isPinned,
          createdBy: n.createdBy,
          eventStartDate: n.eventStartDate || '',
          eventEndDate: n.eventEndDate || '',
        });
      }
      setLoading(false);
    });
  }, [seq]);

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
      setResult({ success: false, message: '제목과 내용은 필수 입력 항목입니다.' });
      return;
    }
    setSubmitting(true);
    const res = await noticeApi.update(seq, {
      title: form.title,
      content: form.content,
      category: form.category,
      isPinned: form.isPinned,
      eventStartDate: form.eventStartDate || undefined,
      eventEndDate: form.eventEndDate || undefined,
    });
    setSubmitting(false);
    setResult({
      success: res.success,
      message: res.success ? '공지사항이 수정되었습니다.' : '수정에 실패했습니다.',
    });
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

      {result && (
        <ResultModal
          success={result.success}
          message={result.message}
          {...(result.success ? { redirectPath: ROUTES.NOTICE_DETAIL(seq) } : { onConfirm: () => setResult(null) })}
        />
      )}
    </>
  );
}
