'use client';

import { useState } from 'react';
import { userApi, SessionRole, branchApi, type Branch } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useSessionStore } from '@/lib/store';
import { ROUTES } from '@/lib/routes';
import { useResultModal } from '@/hooks/useResultModal';
import { useFormError } from '@/hooks/useFormError';
import UserForm, { emptyUserForm, validateUserForm, type UserFormData } from '../UserForm';

export default function UserCreatePage() {
  const session = useSessionStore((st) => st.session);
  const isManager = SessionRole.isManager(session);

  const [form, setForm] = useState<UserFormData>(emptyUserForm);
  const { run, modal } = useResultModal({ redirectPath: ROUTES.USERS, invalidateKeys: ['users'] });
  const { error: formError, validate, clear: clearError } = useFormError();

  const { data: branches } = useApiQuery<Branch[]>(['branches'], () => branchApi.list());

  const handleSubmit = async () => {
    if (!validate(validateUserForm(form, false, { requireBranches: isManager }))) return;
    clearError();
    const payload = {
      userId: form.userId,
      password: form.password,
      name: form.name,
      phone: form.phone,
      ...(isManager ? { branchSeqs: form.branchSeqs } : {}),
    };
    await run(userApi.create(payload), '사용자가 생성되었습니다.');
  };

  return (
    <>
      <UserForm
        form={form}
        onChange={setForm}
        onSubmit={handleSubmit}
        backHref={ROUTES.USERS}
        submitLabel="생성"
        formError={formError}
        showBranchSelector={isManager}
        branches={branches}
      />
      {modal}
    </>
  );
}
