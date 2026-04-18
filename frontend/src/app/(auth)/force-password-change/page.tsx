'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, userApi } from '@/lib/api';
import { useSessionStore } from '@/lib/store';
import { ROUTES } from '@/lib/routes';
import '../login/login.css';

export default function ForcePasswordChangePage() {
  const router = useRouter();
  const reset = useSessionStore((s) => s.reset);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    authApi.me().then((res) => {
      if (!res.success || !res.data) {
        router.replace(ROUTES.LOGIN);
        return;
      }
      if (!res.data.requirePasswordChange) {
        router.replace(ROUTES.DASHBOARD);
      }
    }).catch(() => router.replace(ROUTES.LOGIN));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword.length < 4) {
      setError('새 비밀번호는 4자 이상이어야 합니다.');
      return;
    }
    if (newPassword !== confirm) {
      setError('새 비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('새 비밀번호는 현재 비밀번호와 달라야 합니다.');
      return;
    }

    setSubmitting(true);
    const res = await userApi.changeMyPassword({ currentPassword, newPassword });
    setSubmitting(false);

    if (!res.success) {
      setError(res.message || '비밀번호 변경에 실패했습니다.');
      return;
    }

    setMessage('비밀번호가 변경되었습니다. 보안을 위해 다시 로그인해주세요.');
    await authApi.logout();
    reset();
    setTimeout(() => router.replace(ROUTES.LOGIN), 1200);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-box">
          <div className="login-header">
            <div className="logo">🔒</div>
            <h1>비밀번호 변경</h1>
            <p>최초 로그인입니다. 사용할 비밀번호로 변경해주세요.</p>
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}
          {message && (
            <div className="error-message" style={{ background: '#e8f5e9', color: '#2e7d32' }}>
              <span>✅</span>
              <span>{message}</span>
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="currentPassword">현재 비밀번호</label>
              <div className="input-wrapper">
                <span className="input-icon">🔑</span>
                <input
                  type="password"
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="현재 비밀번호"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">새 비밀번호</label>
              <div className="input-wrapper">
                <span className="input-icon">🆕</span>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="새 비밀번호"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirm">새 비밀번호 확인</label>
              <div className="input-wrapper">
                <span className="input-icon">✅</span>
                <input
                  type="password"
                  id="confirm"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="새 비밀번호 확인"
                  required
                />
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={submitting}>
              {submitting ? '변경 중…' : '비밀번호 변경'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
