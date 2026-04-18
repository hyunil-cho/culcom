'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, userApi, SessionRole } from '@/lib/api';
import { useSessionStore } from '@/lib/store';
import { useResultModal } from '@/hooks/useResultModal';
import { useFormError } from '@/hooks/useFormError';
import { ROUTES } from '@/lib/routes';
import FormLayout from '@/components/ui/FormLayout';
import FormField from '@/components/ui/FormField';
import FormErrorBanner from '@/components/ui/FormErrorBanner';
import { Input, PasswordInput } from '@/components/ui/FormInput';

export default function MyPage() {
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const reset = useSessionStore((s) => s.reset);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  // 성공 모달의 확인 버튼 클릭 시 보안을 위해 로그아웃 후 로그인 페이지로 이동한다.
  const { run, modal } = useResultModal({
    onConfirm: async () => {
      try { await authApi.logout(); } catch { /* ignore */ }
      reset();
      router.push(ROUTES.LOGIN);
    },
  });
  const { error: formError, validate, clear } = useFormError();

  const handleSubmit = async () => {
    let errorMessage: string | null = null;
    if (!currentPassword.trim()) errorMessage = '현재 비밀번호를 입력하세요.';
    else if (newPassword.length < 4) errorMessage = '새 비밀번호는 4자 이상이어야 합니다.';
    else if (newPassword !== confirm) errorMessage = '새 비밀번호 확인이 일치하지 않습니다.';
    else if (newPassword === currentPassword) errorMessage = '새 비밀번호는 현재 비밀번호와 달라야 합니다.';
    if (!validate(errorMessage)) return;
    clear();

    await run(
      userApi.changeMyPassword({ currentPassword, newPassword }),
      '비밀번호가 변경되었습니다.',
    );
  };

  return (
    <>
      <FormLayout
        title="마이페이지"
        backHref={ROUTES.DASHBOARD}
        backLabel="← 대시보드로"
        submitLabel="비밀번호 변경"
        onSubmit={handleSubmit}
      >
        <FormErrorBanner error={formError} />

        <FormField label="아이디">
          <Input value={session?.userId ?? ''} disabled />
        </FormField>
        <FormField label="이름">
          <Input value={session?.name ?? ''} disabled />
        </FormField>
        <FormField label="역할">
          <Input value={SessionRole.displayName(session)} disabled />
        </FormField>

        <div className="form-row">
          <label className="form-label" style={{ fontWeight: 600, marginTop: 16 }}>비밀번호 변경</label>
        </div>

        <FormField label="현재 비밀번호" required>
          <PasswordInput
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="현재 비밀번호"
            autoComplete="current-password"
            required
          />
        </FormField>
        <FormField label="새 비밀번호" required>
          <PasswordInput
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="새 비밀번호"
            autoComplete="new-password"
            required
          />
        </FormField>
        <FormField label="새 비밀번호 확인" required>
          <PasswordInput
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="새 비밀번호 확인"
            autoComplete="new-password"
            required
          />
        </FormField>
      </FormLayout>
      {modal}
    </>
  );
}
