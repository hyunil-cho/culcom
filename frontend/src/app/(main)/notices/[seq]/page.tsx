'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { noticeApi, NoticeDetail } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ResultModal from '@/components/ui/ResultModal';

export default function NoticeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const seq = Number(params.seq);

  const [notice, setNotice] = useState<NoticeDetail | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    noticeApi.get(seq).then((res) => {
      if (res.success) setNotice(res.data);
    });
  }, [seq]);

  const handleDelete = async () => {
    setDeleting(false);
    const res = await noticeApi.delete(seq);
    setResult({
      success: res.success,
      message: res.success ? '공지사항이 삭제되었습니다.' : '삭제에 실패했습니다.',
    });
  };

  if (!notice) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>로딩 중...</div>;
  }

  return (
    <>
      {/* 뒤로가기 */}
      <div style={{ marginBottom: '1rem' }}>
        <Link href={ROUTES.NOTICES} style={{ color: '#666', textDecoration: 'none', fontSize: '0.9rem' }}>
          &larr; 목록으로
        </Link>
      </div>

      <div className="content-card" style={{ padding: '2rem' }}>
        {/* 상단 메타 */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <span className={`status-badge ${notice.category === '이벤트' ? 'status-warning' : 'status-active'}`}>
              {notice.category}
            </span>
            {notice.isPinned && (
              <span className="status-badge" style={{ background: '#fff3e0', color: '#e65100' }}>📌 고정글</span>
            )}
            <span className="status-badge" style={{ background: '#e8f5e9', color: '#2e7d32' }}>
              {notice.branchName}
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.75rem' }}>{notice.title}</h1>
          <div style={{ display: 'flex', gap: 16, color: '#888', fontSize: '0.85rem', flexWrap: 'wrap' }}>
            <span>{notice.createdBy}</span>
            <span>{notice.createdDate}</span>
            <span>조회 {notice.viewCount}</span>
            {notice.eventStartDate && (
              <span>이벤트 기간: {notice.eventStartDate} ~ {notice.eventEndDate}</span>
            )}
          </div>
        </div>

        {/* 본문 */}
        <div style={{
          padding: '1.5rem 0',
          borderTop: '1px solid #eee',
          borderBottom: '1px solid #eee',
          minHeight: 200,
          whiteSpace: 'pre-wrap',
          lineHeight: 1.8,
          fontSize: '0.95rem',
          color: '#333',
        }}>
          {notice.content}
        </div>

        {/* 하단 액션 */}
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href={ROUTES.NOTICE_EDIT(seq)} className="btn-primary" style={{ padding: '0.6rem 1.2rem', textDecoration: 'none' }}>
              수정
            </Link>
            <button
              className="btn-secondary"
              style={{ padding: '0.6rem 1.2rem', color: 'var(--danger)' }}
              onClick={() => setDeleting(true)}
            >
              삭제
            </button>
          </div>
          {notice.lastUpdateDate && (
            <span style={{ fontSize: '0.8rem', color: '#999' }}>최종 수정: {notice.lastUpdateDate}</span>
          )}
        </div>
      </div>

      {deleting && (
        <ConfirmModal
          title="공지사항 삭제"
          onCancel={() => setDeleting(false)}
          onConfirm={handleDelete}
          confirmLabel="삭제"
          confirmColor="var(--danger)"
        >
          <p>삭제된 게시글은 복구할 수 없습니다.</p>
        </ConfirmModal>
      )}

      {result && (
        <ResultModal
          success={result.success}
          message={result.message}
          redirectPath={ROUTES.NOTICES}
        />
      )}
    </>
  );
}
