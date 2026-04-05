'use client';

import { useBoardSession } from '../../board/_hooks/useBoardSession';
import s from './page.module.css';

export default function KakaoSuccessPage() {
  const { session } = useBoardSession(true);

  return (
    <div className={s.wrapper}>
      <div className={s.card}>
        <div className={s.logoSection}>
          <h1 className={s.logo}>CulCom</h1>
        </div>

        <div className={s.titleSection}>
          <p className={s.subtitle}>20년 된 컬컴 영어, 일어, 중국어</p>
          <h1 className={s.mainTitle}>스터디 지원 성공!</h1>
        </div>

        <div className={s.charSection}>
          <div className={s.charEmoji}>💗🐱</div>
          <div className={s.charRow}>
            <span className={s.charText}>Be cultured 💕</span>
            <span className={s.charText}>speak better ✨</span>
          </div>
        </div>

        <div className={s.messageBox}>
          <p className={s.messageTitle}>한 걸음 나아가셨군요 :D</p>
          <p className={s.messageBody}>
            <span className={s.userName}>{session.memberName}</span>님, 환영합니다!
            <br />스터디 안내 연락드릴게요!
            <br /><br />
            교육청 인가받은, 16단계 레벨별 커리큘럼으로
            <br />영어, 일어, 중국어를 잘 갖춰서!
          </p>
        </div>

        <div className={s.photoGrid}>
          {['📚', '🎓', '✨'].map((emoji) => (
            <div key={emoji} className={s.photoCell}>{emoji}</div>
          ))}
        </div>

        <a href="/board" className={s.backBtn}>처음으로 돌아가기</a>
      </div>
    </div>
  );
}
