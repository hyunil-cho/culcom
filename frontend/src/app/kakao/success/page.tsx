'use client';

import { useBoardSession } from '../../board/_hooks/useBoardSession';
import s from './page.module.css';

export default function KakaoSuccessPage() {
  const { session } = useBoardSession(true);

  return (
    <div className={s.wrapper}>
      <div className={s.card}>
        <div className={s.logoSection}>
          <h1 className={s.logo}>E-UT</h1>
        </div>

        <div className={s.titleSection}>
          <p className={s.subtitle}>영어로 만나 서로를 알아가는 공간</p>
          <h1 className={s.mainTitle}>영어회화 지원 성공!</h1>
        </div>

        <div className={s.charSection}>
          <div className={s.charRow}>
            <span className={s.charText}>Be cultured 💕   speak better ✨</span>
          </div>
        </div>

        <div className={s.messageBox}>
          <p className={s.messageTitle}>한 걸음 나아가셨군요 :D</p>
          <p className={s.messageBody}>
            <span className={s.userName}>{session.memberName}</span>님, 환영합니다!
            <br /><br />
            교육청에서 허가받은, 7단계 커리큘럼 구미영어회화학원에서 안내 연락드릴게요!
            <br />
            <br />“Experience, You Together”
            <br />
            E:UT
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
