'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { noticeApi, NoticeDetail } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useResultModal } from '@/hooks/useResultModal';
import { Button, LinkButton } from '@/components/ui/Button';
import s from './page.module.css';

export default function NoticeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const seq = Number(params.seq);

  const [notice, setNotice] = useState<NoticeDetail | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { run, modal } = useResultModal({ redirectPath: ROUTES.NOTICES });

  useEffect(() => { noticeApi.get(seq).then((res) => { if (res.success) setNotice(res.data); }); }, [seq]);

  const handleDelete = async () => { setDeleting(false); await run(noticeApi.delete(seq), '공지사항이 삭제되었습니다.'); };

  if (!notice) return <div className={s.loading}>로딩 중...</div>;

  return (
    <>
      <div className={s.backRow}>
        <Link href={ROUTES.NOTICES} className={s.backLink}>&larr; 목록으로</Link>
      </div>

      <div className={`content-card ${s.detailCard}`}>
        <div className={s.metaSection}>
          <div className={s.badges}>
            <span className={`status-badge ${notice.category === '이벤트' ? 'status-warning' : 'status-active'}`}>
              {notice.category}
            </span>
            {notice.isPinned && <span className={`status-badge ${s.pinnedBadge}`}>📌 고정글</span>}
            <span className={`status-badge ${s.branchBadge}`}>{notice.branchName}</span>
          </div>
          <h1 className={s.title}>{notice.title}</h1>
          <div className={s.metaInfo}>
            <span>{notice.createdBy}</span>
            <span>{notice.createdDate}</span>
            <span>조회 {notice.viewCount}</span>
            {notice.eventStartDate && <span>이벤트 기간: {notice.eventStartDate} ~ {notice.eventEndDate}</span>}
          </div>
        </div>

        <div className={s.content}>{notice.content}</div>

        <div className={s.actionsRow}>
          <div className={s.actionBtns}>
            <LinkButton href={ROUTES.NOTICE_EDIT(seq)} style={{ padding: '0.6rem 1.2rem' }}>수정</LinkButton>
            <Button variant="danger" style={{ padding: '0.6rem 1.2rem' }} onClick={() => setDeleting(true)}>삭제</Button>
          </div>
          {notice.lastUpdateDate && <span className={s.lastUpdate}>최종 수정: {notice.lastUpdateDate}</span>}
        </div>
      </div>

      {deleting && (
        <ConfirmModal title="공지사항 삭제" onCancel={() => setDeleting(false)} onConfirm={handleDelete}
          confirmLabel="삭제" confirmColor="var(--danger)">
          <p>삭제된 게시글은 복구할 수 없습니다.</p>
        </ConfirmModal>
      )}

      {modal}
    </>
  );
}
