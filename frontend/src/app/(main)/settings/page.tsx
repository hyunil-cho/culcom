import Link from 'next/link';
import { ROUTES } from '@/lib/routes';
import s from './page.module.css';

const settingsItems = [
  {
    href: ROUTES.SETTINGS_SMS_CONFIG,
    title: '자동 문자 발송 설정',
    description: '고객 등록, 회원 등록, 예약 확정 시 자동으로 발송되는 문자 메시지를 설정합니다.',
  },
  {
    href: ROUTES.SETTINGS_RESERVATION_SMS,
    title: '예약 확정 시 문자 발송 (기존)',
    description: '예약 확정 시 자동으로 발송되는 문자 메시지의 템플릿과 발신번호를 설정합니다.',
  },
];

export default function SettingsPage() {
  return (
    <div className={s.container}>
      <div className={s.header}>
        <h1 className={s.title}>설정</h1>
        <p className={s.desc}>백오피스의 다양한 설정을 관리합니다</p>
      </div>

      <div className={s.grid}>
        {settingsItems.map((item) => (
          <Link key={item.href} href={item.href} className={s.card}>
            <div className={s.cardTitle}>{item.title}</div>
            <div className={s.cardDesc}>{item.description}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
