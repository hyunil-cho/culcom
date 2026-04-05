'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { userApi, SessionRole } from '@/lib/api';
import { useSessionStore } from '@/lib/store';
import { ROUTES } from '@/lib/routes';
import { useResultModal } from '@/hooks/useResultModal';
import s from './page.module.css';

export default function UserCreatePage() {
  const router = useRouter();
  const session = useSessionStore((st) => st.session);
  const creatingRole = SessionRole.isRoot(session) ? '지점장' : '직원';

  const [form, setForm] = useState({ userId: '', password: '', name: '', phone: '' });
  const { run, modal } = useResultModal({ redirectPath: ROUTES.USERS });

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [field]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await run(userApi.create(form), '사용자가 생성되었습니다.');
  };

  return (
    <>
      <div className={`content-card ${s.card}`}>
        <div className={s.header}>
          <h3 className={s.title}>{creatingRole} 계정 생성</h3>
        </div>
        <form onSubmit={handleSubmit} className={s.form}>
          {[
            { field: 'userId', label: '아이디', type: 'text', placeholder: '아이디를 입력하세요' },
            { field: 'password', label: '비밀번호', type: 'password', placeholder: '비밀번호를 입력하세요' },
            { field: 'name', label: '이름', type: 'text', placeholder: '이름을 입력하세요' },
            { field: 'phone', label: '전화번호', type: 'tel', placeholder: '전화번호를 입력하세요' },
          ].map(({ field, label, type, placeholder }) => (
            <div key={field} className={s.fieldGroup}>
              <label className={s.label}>{label}</label>
              <input type={type} value={form[field as keyof typeof form]} onChange={handleChange(field)}
                placeholder={placeholder} required className={s.input} />
            </div>
          ))}
          <div className={s.actions}>
            <button type="button" className="btn-modal btn-modal-cancel" onClick={() => router.push(ROUTES.USERS)}>취소</button>
            <button type="submit" className="btn-modal btn-modal-confirm" style={{ background: '#4a90e2' }}>생성</button>
          </div>
        </form>
      </div>
      {modal}
    </>
  );
}
