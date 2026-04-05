'use client';

import { ROUTES } from '@/lib/routes';
import s from './ErrorPage.module.css';

const icons: Record<string, string> = { '404': '🔍', '403': '🚫', '500': '💥', '503': '⏸️' };

export default function ErrorPage({ code, title, message, detail }: {
  code: string; title: string; message: string; detail?: string;
}) {
  const icon = icons[code] ?? '⚠️';
  const timestamp = new Date().toLocaleString('ko-KR');

  return (
    <div className={s.wrapper}>
      <div className={s.card}>
        <div className={s.icon}>{icon}</div>
        <h1 className={s.code}>{code}</h1>
        <h2 className={s.title}>{title}</h2>
        <p className={s.message}>{message}</p>

        {detail && (
          <div className={s.detailBox}>
            <div className={s.detailLabel}>상세 정보</div>
            <div className={s.detailText}>{detail}</div>
          </div>
        )}

        <div className={s.actions}>
          <a href={ROUTES.DASHBOARD} className={s.homeLink}>홈으로</a>
          <button onClick={() => history.back()} className={s.backBtn}>← 이전 페이지</button>
        </div>

        <div className={s.footer}>
          <p>문제가 지속되면 시스템 관리자에게 문의해주세요.</p>
          <div className={s.timestamp}>오류 발생 시간: {timestamp}</div>
        </div>
      </div>
    </div>
  );
}
