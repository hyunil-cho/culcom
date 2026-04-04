'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { userApi, SessionRole } from '@/lib/api';
import { useSessionStore } from '@/lib/store';
import { ROUTES } from '@/lib/routes';
import { useResultModal } from '@/hooks/useResultModal';

export default function UserCreatePage() {
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
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
      <div className="content-card" style={{ maxWidth: 520, margin: '0 auto' }}>
        <div style={{ padding: '1.5rem 2rem', borderBottom: '2px solid #4a90e2' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#2c3e50' }}>{creatingRole} 계정 생성</h3>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '2rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>아이디</label>
            <input
              type="text"
              value={form.userId}
              onChange={handleChange('userId')}
              placeholder="아이디를 입력하세요"
              required
              style={{ width: '100%', padding: '0.75rem', borderRadius: 6, border: '1px solid #ddd', fontSize: '0.95rem', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>비밀번호</label>
            <input
              type="password"
              value={form.password}
              onChange={handleChange('password')}
              placeholder="비밀번호를 입력하세요"
              required
              style={{ width: '100%', padding: '0.75rem', borderRadius: 6, border: '1px solid #ddd', fontSize: '0.95rem', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>이름</label>
            <input
              type="text"
              value={form.name}
              onChange={handleChange('name')}
              placeholder="이름을 입력하세요"
              required
              style={{ width: '100%', padding: '0.75rem', borderRadius: 6, border: '1px solid #ddd', fontSize: '0.95rem', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>전화번호</label>
            <input
              type="tel"
              value={form.phone}
              onChange={handleChange('phone')}
              placeholder="전화번호를 입력하세요"
              required
              style={{ width: '100%', padding: '0.75rem', borderRadius: 6, border: '1px solid #ddd', fontSize: '0.95rem', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn-modal btn-modal-cancel" onClick={() => router.push(ROUTES.USERS)}>취소</button>
            <button type="submit" className="btn-modal btn-modal-confirm" style={{ background: '#4a90e2' }}>생성</button>
          </div>
        </form>
      </div>

      {modal}
    </>
  );
}
