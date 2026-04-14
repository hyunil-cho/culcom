'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { userApi, type UserResponse } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { ROUTES } from '@/lib/routes';
import UserForm, { emptyUserForm, validateUserForm, type UserFormData } from '../../UserForm';
import { useResultModal } from '@/hooks/useResultModal';
import { useFormError } from '@/hooks/useFormError';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function UserEditPage() {
  const params = useParams();
  const seq = Number(params.seq);
  const [form, setForm] = useState<UserFormData>(emptyUserForm);
  const [role, setRole] = useState('');
  const { run, modal } = useResultModal({ redirectPath: ROUTES.USERS, invalidateKeys: ['users'] });
  const { error: formError, validate, clear: clearError } = useFormError();
  const [deleting, setDeleting] = useState(false);

  const { data: users } = useApiQuery<UserResponse[]>(
    ['users'],
    () => userApi.list(),
  );

  useEffect(() => {
    if (users) {
      const u = users.find(u => u.seq === seq);
      if (u) {
        setForm({ userId: u.userId, password: '', name: u.name ?? '', phone: '' });
        setRole(u.role);
      }
    }
  }, [users, seq]);

  const handleSubmit = async () => {
    if (!validate(validateUserForm(form, true))) return;
    clearError();
    const data: Partial<UserFormData> = { name: form.name, phone: form.phone || undefined };
    if (form.password.trim()) data.password = form.password;
    await run(userApi.update(seq, data), '사용자 정보가 수정되었습니다.');
  };

  return (
    <>
      <UserForm form={form} onChange={setForm} onSubmit={handleSubmit}
        isEdit
        backHref={ROUTES.USERS} submitLabel="수정" formError={formError} />
      {/* 삭제 기능 비활성화
      {deleting && (
        <ConfirmModal title="삭제 확인" onCancel={() => setDeleting(false)}
          onConfirm={async () => {
            setDeleting(false);
            await run(userApi.delete(seq), '사용자가 삭제되었습니다.');
          }} confirmLabel="삭제" confirmColor="#f44336">
          <strong>{form.userId}</strong> 계정을 삭제하시겠습니까?<br /><br />이 작업은 되돌릴 수 없습니다.
        </ConfirmModal>
      )}
      */}
      {modal}
    </>
  );
}
