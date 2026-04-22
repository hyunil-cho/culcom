'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BoardNav from './_components/BoardNav';
import BoardFooter from './_components/BoardFooter';
import { useBoardSession } from './_hooks/useBoardSession';

interface Notice {
  seq: number;
  branchName: string;
  title: string;
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

interface PageData {
  content: Notice[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

function BoardListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useBoardSession();

  const filter = searchParams.get('filter') || 'all';
  const q = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '0', 10);

  const [pageData, setPageData] = useState<PageData | null>(null);
  const [keyword, setKeyword] = useState(q);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('size', '12');
    if (filter && filter !== 'all') params.set('filter', filter);
    if (q) params.set('q', q);

    fetch(`/api/public/board/notices?${params.toString()}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const d = data.data || data;
        setPageData(d);
      })
      .catch(() => {});
  }, [page, filter, q]);

  useEffect(() => {
    setKeyword(q);
  }, [q]);

  const navigate = (params: Record<string, string>) => {
    const sp = new URLSearchParams();
    if (params.filter && params.filter !== 'all') sp.set('filter', params.filter);
    if (params.q) sp.set('q', params.q);
    if (params.page && params.page !== '0') sp.set('page', params.page);
    router.push(`/board?${sp.toString()}`);
  };

  const handleFilterClick = (f: string) => {
    navigate({ filter: f, q, page: '0' });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ filter, q: keyword, page: '0' });
  };

  const handleReset = () => {
    setKeyword('');
    navigate({ filter, q: '', page: '0' });
  };

  const handlePageChange = (p: number) => {
    navigate({ filter, q, page: String(p) });
  };

  const notices = pageData?.content || [];
  const totalElements = pageData?.totalElements || 0;
  const totalPages = pageData?.totalPages || 0;
  const currentPage = pageData?.number || 0;

  // Build page numbers
  const pageNumbers: number[] = [];
  if (totalPages > 0) {
    const startPage = Math.max(0, currentPage - 4);
    const endPage = Math.min(totalPages - 1, currentPage + 4);
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
  }

  return (
    <>
      <BoardNav isLoggedIn={session.isLoggedIn} memberName={session.memberName} />

      {/* 히어로 */}
      <section className="board-hero">
        <div className="board-container">
          <div className="hero-content">
            <h1 className="hero-title">스터디시간 · 상담가능시간</h1>
            <p className="hero-subtitle">각 지점의 새로운 소식과 특별한 상담가능시간을 확인하세요</p>
          </div>
          <div className="hero-visual">
            <div className="hero-shape hero-shape-1"></div>
            <div className="hero-shape hero-shape-2"></div>
            <div className="hero-shape hero-shape-3"></div>
          </div>
        </div>
      </section>

      {/* 메인 콘텐츠 */}
      <main className="board-main">
        <div className="board-container">

          {/* 필터 + 검색 */}
          <div className="board-toolbar">
            <div className="toolbar-tabs">
              <a
                href="#"
                className={`tab-item${filter === 'all' ? ' active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleFilterClick('all'); }}
              >
                전체
              </a>
              <a
                href="#"
                className={`tab-item${filter === '스터디시간' ? ' active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleFilterClick('스터디시간'); }}
              >
                📌 스터디시간
              </a>
              <a
                href="#"
                className={`tab-item${filter === '상담가능시간' ? ' active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleFilterClick('상담가능시간'); }}
              >
                🎉 상담가능시간
              </a>
            </div>
            <form className="toolbar-search" onSubmit={handleSearch}>
              <div className="search-wrap">
                <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="검색어를 입력하세요"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="search-input"
                />
                <button type="submit" className="search-btn">검색</button>
              </div>
              {q && (
                <a href="#" className="search-reset" onClick={(e) => { e.preventDefault(); handleReset(); }}>
                  ✕ 초기화
                </a>
              )}
            </form>
          </div>

          {/* 결과 요약 */}
          <div className="board-summary">
            <span>총 <strong>{totalElements}</strong>건</span>
            {q && <span className="summary-tag">&ldquo;{q}&rdquo; 검색 결과</span>}
          </div>

          {/* 게시글 테이블 */}
          {notices.length > 0 ? (
            <div className="board-table-wrap">
              <table className="board-table">
                <thead>
                  <tr>
                    <th className="col-no">번호</th>
                    <th className="col-category">분류</th>
                    <th className="col-title">제목</th>
                    <th className="col-branch">지점</th>
                    <th className="col-author">작성자</th>
                    <th className="col-date">작성일</th>
                    <th className="col-views">조회</th>
                  </tr>
                </thead>
                <tbody>
                  {notices.map((notice) => (
                    <tr
                      key={notice.seq}
                      className={`board-row${notice.isPinned ? ' row-pinned' : ''}`}
                      onClick={() => router.push(`/board/detail/${notice.seq}`)}
                    >
                      <td className="col-no">
                        {notice.isPinned ? <span className="pin-icon">📌</span> : notice.seq}
                      </td>
                      <td className="col-category">
                        <span className={`table-badge ${notice.categoryClass}`}>{notice.category}</span>
                      </td>
                      <td className="col-title">
                        <span className="row-title">{notice.title}</span>
                        {notice.hasEventDate && (
                          <span className="row-event-date">
                            {notice.eventStartDate} ~ {notice.eventEndDate}
                          </span>
                        )}
                      </td>
                      <td className="col-branch">{notice.branchName}</td>
                      <td className="col-author">{notice.createdBy}</td>
                      <td className="col-date">{notice.createdDate}</td>
                      <td className="col-views">{notice.viewCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="board-empty">
              <div className="empty-illustration">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
              </div>
              <h3>등록된 게시글이 없습니다</h3>
              <p>새로운 소식이 등록되면 여기에 표시됩니다.</p>
            </div>
          )}

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="board-pagination">
              {currentPage > 0 && (
                <a
                  href="#"
                  className="pg-btn pg-prev"
                  onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </a>
              )}
              {pageNumbers.map((p) => (
                <a
                  key={p}
                  href="#"
                  className={`pg-btn${p === currentPage ? ' pg-active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handlePageChange(p); }}
                >
                  {p + 1}
                </a>
              ))}
              {currentPage < totalPages - 1 && (
                <a
                  href="#"
                  className="pg-btn pg-next"
                  onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </a>
              )}
            </div>
          )}

        </div>
      </main>

      <BoardFooter />
    </>
  );
}

export default function BoardListPage() {
  return (
    <Suspense>
      <BoardListContent />
    </Suspense>
  );
}
