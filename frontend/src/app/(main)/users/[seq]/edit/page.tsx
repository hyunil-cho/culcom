'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { userApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import UserForm, { emptyUserForm, validateUserForm, type UserFormData } from '../../UserForm';
import ResultModal from '@/components/ui/ResultModal';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function UserEditPage() {
  const params = useParams();
  const router = useRouter();
  const seq = Number(params.seq);
  const [form, setForm] = useState<UserFormData>(emptyUserForm);
  const [role, setRole] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    userApi.list().then(res => {
      const u = res.data.find(u => u.seq === seq);
      if (u) {
        setForm({ userId: u.userId, password: '', name: u.name ?? '', phone: '' });
        setRole(u.role);
      }
    });
  }, [seq]);

  const handleSubmit = async () => {
    const error = validateUserForm(form, true);
    if (error) { alert(error); return; }
    const data: Partial<UserFormData> = { name: form.name, phone: form.phone || undefined };
    if (form.password.trim()) data.password = form.password;
    const res = await userApi.update(seq, data);
    if (res.success) setResult({ success: true, message: '사용자 정보가 수정되었습니다.' });
  };

  return (
    <>
      <UserForm form={form} onChange={setForm} onSubmit={handleSubmit}
        isEdit
        backHref={ROUTES.USERS} submitLabel="수정" />
      {deleting && (
        <ConfirmModal title="삭제 확인" onCancel={() => setDeleting(false)}
          onConfirm={async () => {
            const res = await userApi.delete(seq);
            setDeleting(false);
            if (res.success) setResult({ success: true, message: '사용자가 삭제되었습니다.' });
          }} confirmLabel="삭제" confirmColor="#f44336">
          <strong>{form.userId}</strong> 계정을 삭제하시겠습니까?<br /><br />이 작업은 되돌릴 수 없습니다.
        </ConfirmModal>
      )}
      {result && <ResultModal success={result.success} message={result.message} redirectPath={ROUTES.USERS} />}
    </>
  );
}
