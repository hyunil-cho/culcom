'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BoardNav from '../_components/BoardNav';
import BoardFooter from '../_components/BoardFooter';
import { useBoardSession } from '../_hooks/useBoardSession';

interface MemberInfo {
  name: string;
  phoneNumber: string | null;
  createdDate: string;
  loginMethod: string;
}

export default function BoardMypagePage() {
  const router = useRouter();
  const { session, loaded } = useBoardSession(true);
  const [memberInfo, setMemberInfo] = useState<MemberInfo | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!loaded || !session.isLoggedIn) return;
    fetch('/api/public/board/mypage', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const d = data.data || data;
        setMemberInfo(d);
      })
      .catch(() => {});
  }, [loaded, session.isLoggedIn]);

  const handleWithdraw = async () => {
    try {
      const res = await fetch('/api/public/board/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && (data.success || data.data)) {
        alert('회원탈퇴가 완료되었습니다.');
        window.location.href = '/board';
      } else {
        alert(data.error || data.message || '오류가 발생했습니다.');
      }
    } catch {
      alert('요청 처리 중 오류가 발생했습니다.');
    }
    setShowModal(false);
  };

  if (!memberInfo) {
    return (
      <>
        <BoardNav isLoggedIn={session.isLoggedIn} memberName={session.memberName} activePage="mypage" />
        <main className="board-main">
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
      <BoardNav isLoggedIn={session.isLoggedIn} memberName={session.memberName} activePage="mypage" />

      {/* 메인 콘텐츠 */}
      <main className="board-main">
        <div className="board-container board-container-narrow">

          <h2 className="mypage-title">마이페이지</h2>

          {/* 회원 정보 */}
          <div className="mypage-section">
            <h3 className="mypage-section-title">회원 정보</h3>
            <div className="mypage-info-card">
              <div className="info-row">
                <span className="info-label">이름</span>
                <span className="info-value">{memberInfo.name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">전화번호</span>
                <span className="info-value">{memberInfo.phoneNumber || '미등록'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">가입일</span>
                <span className="info-value">{memberInfo.createdDate}</span>
              </div>
              <div className="info-row">
                <span className="info-label">로그인 방식</span>
                <span className="info-value">
                  <span className="kakao-login-badge">카카오 로그인</span>
                </span>
              </div>
            </div>
          </div>

          {/* 회원탈퇴 */}
          <div className="mypage-section mypage-danger-zone">
            <h3 className="mypage-section-title danger">회원탈퇴</h3>
            <div className="mypage-danger-card">
              <p className="danger-description">
                회원탈퇴 시 모든 회원 정보가 삭제되며, 이 작업은 되돌릴 수 없습니다.
              </p>
              <button type="button" className="btn-withdraw" onClick={() => setShowModal(true)}>
                회원탈퇴
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* 회원탈퇴 확인 모달 */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3 className="modal-title">정말 탈퇴하시겠습니까?</h3>
            <p className="modal-desc">
              탈퇴 후에는 모든 회원 정보가 삭제되며,<br />복구할 수 없습니다.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn-modal-cancel" onClick={() => setShowModal(false)}>
                취소
              </button>
              <button type="button" className="btn-modal-confirm" onClick={handleWithdraw}>
                탈퇴하기
              </button>
            </div>
          </div>
        </div>
      )}

      <BoardFooter />
    </>
  );
}
