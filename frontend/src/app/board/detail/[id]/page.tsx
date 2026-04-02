'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import BoardNav from '../../_components/BoardNav';
import BoardFooter from '../../_components/BoardFooter';
import { useBoardSession } from '../../_hooks/useBoardSession';

interface Notice {
  seq: number;
  branchName: string;
  title: string;
  content: string;
  category: string;
  categoryClass: string;
  isPinned: boolean;
  viewCount: number;
  eventStartDate: string | null;
  eventEndDate: string | null;
  hasEventDate: boolean;
  createdBy: string;
  createdDate: string;
}

export default function BoardDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { session } = useBoardSession();

  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/public/board/notices/${id}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const d = data.data || data;
        setNotice(d);
      })
      .catch(() => {});
  }, [id]);

  if (!notice) {
    return (
      <>
        <BoardNav isLoggedIn={session.isLoggedIn} memberName={session.memberName} />
        <main className="board-main board-main-detail">
          <div className="board-container board-container-narrow">
            <p style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>로딩 중...</p>
          </div>
        </main>
        <BoardFooter />
      </>
    );
  }

  return (
    <>
      <BoardNav isLoggedIn={session.isLoggedIn} memberName={session.memberName} />

      {/* 상세 콘텐츠 */}
      <main className="board-main board-main-detail">
        <div className="board-container board-container-narrow">

          {/* 뒤로가기 */}
          <Link href="/board" className="detail-back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            목록으로 돌아가기
          </Link>

          {/* 게시글 아티클 */}
          <article className="detail-article">
            {/* 헤더 */}
            <header className="detail-header">
              <div className="detail-badges">
                <span className={`card-badge ${notice.categoryClass}`}>{notice.category}</span>
                {notice.isPinned && (
                  <span className="detail-pin-badge">📌 고정</span>
                )}
                <span className="detail-branch-badge">🏢 {notice.branchName}</span>
              </div>
              <h1 className="detail-title">{notice.title}</h1>
              <div className="detail-meta">
                <div className="detail-meta-group">
                  <span className="meta-item">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    {notice.createdBy}
                  </span>
                  <span className="meta-dot">·</span>
                  <span className="meta-item">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {notice.createdDate}
                  </span>
                  <span className="meta-dot">·</span>
                  <span className="meta-item">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    조회 {notice.viewCount}
                  </span>
                </div>
                {notice.hasEventDate && (
                  <div className="detail-event-period">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    이벤트 기간: {notice.eventStartDate} ~ {notice.eventEndDate}
                  </div>
                )}
              </div>
            </header>

            {/* 본문 */}
            <div className="detail-body">{notice.content}</div>

            {/* 하단 액션 */}
            <footer className="detail-footer">
              <Link href="/board" className="btn-back-list">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                목록으로
              </Link>
            </footer>
          </article>

        </div>
      </main>

      <BoardFooter />
    </>
  );
}
