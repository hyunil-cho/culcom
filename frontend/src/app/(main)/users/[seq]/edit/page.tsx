'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { userApi, branchApi, SessionRole, type UserResponse, type Branch } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useSessionStore } from '@/lib/store';
import { ROUTES } from '@/lib/routes';
import UserForm, { emptyUserForm, validateUserForm, type UserFormData } from '../../UserForm';
import { useResultModal } from '@/hooks/useResultModal';
import { useFormError } from '@/hooks/useFormError';

export default function UserEditPage() {
  const params = useParams();
  const seq = Number(params.seq);
  const session = useSessionStore((st) => st.session);
  const isManager = SessionRole.isManager(session);

  const [form, setForm] = useState<UserFormData>(emptyUserForm);
  const [role, setRole] = useState('');
  const { run, modal } = useResultModal({ redirectPath: ROUTES.USERS, invalidateKeys: ['users'] });
  const { error: formError, validate, clear: clearError } = useFormError();

  const { data: user } = useApiQuery<UserResponse>(
    ['user', seq],
    () => userApi.get(seq),
  );
  const { data: branches } = useApiQuery<Branch[]>(['branches'], () => branchApi.list());

  useEffect(() => {
    if (user) {
      setForm({
        userId: user.userId,
        password: '',
        name: user.name ?? '',
        phone: '',
        branchSeqs: user.branchSeqs ?? [],
      });
      setRole(user.role);
    }
  }, [user]);

  const showBranchSelector = isManager && role === 'STAFF';

  const handleSubmit = async () => {
    if (!validate(validateUserForm(form, true, { requireBranches: showBranchSelector }))) return;
    clearError();
    const data: Partial<UserFormData> = {
      name: form.name,
      phone: form.phone || undefined,
    };
    if (form.password.trim()) data.password = form.password;
    if (showBranchSelector) data.branchSeqs = form.branchSeqs;
    await run(userApi.update(seq, data), '사용자 정보가 수정되었습니다.');
  };

  return (
    <>
      <UserForm
        form={form}
        onChange={setForm}
        onSubmit={handleSubmit}
        isEdit
        backHref={ROUTES.USERS}
        submitLabel="수정"
        formError={formError}
        showBranchSelector={showBranchSelector}
        branches={branches}
      />
      {modal}
    </>
  );
}
