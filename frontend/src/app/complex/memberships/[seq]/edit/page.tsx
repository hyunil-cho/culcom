'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { membershipApi } from '@/lib/api';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { ROUTES } from '@/lib/routes';
import MembershipForm, {
  emptyMembershipForm,
  validateMembershipForm,
  toDurationDays,
  fromDurationDays,
  type MembershipFormData,
} from '../../MembershipForm';
import ResultModal from '@/components/ui/ResultModal';

export default function MembershipEditPage() {
  const params = useParams();
  const router = useRouter();
  const seq = Number(params.seq);
  const [form, setForm] = useState<MembershipFormData>(emptyMembershipForm);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    membershipApi.get(seq).then(res => {
      const m = res.data;
      const dur = fromDurationDays(m.duration);
      setForm({
        name: m.name,
        durationValue: dur.value,
        durationUnit: dur.unit,
        count: m.count,
        price: m.price,
      });
    });
  }, [seq]);

  const handleSubmit = async () => {
    const error = validateMembershipForm(form);
    if (error) { alert(error); return; }
    const res = await membershipApi.update(seq, {
      name: form.name,
      duration: toDurationDays(form),
      count: form.count,
      price: form.price,
    });
    if (res.success) {
      setResult({ success: true, message: '멤버십이 수정되었습니다.' });
    }
  };

  return (
    <>
      <MembershipForm
        form={form}
        onChange={setForm}
        onSubmit={handleSubmit}
        isEdit
        backHref={ROUTES.COMPLEX_MEMBERSHIPS}
        submitLabel="수정"
      />
      {deleting && (
        <ConfirmModal
          title="삭제 확인"
          onCancel={() => setDeleting(false)}
          onConfirm={async () => {
            const res = await membershipApi.delete(seq);
            setDeleting(false);
            if (res.success) setResult({ success: true, message: '멤버십이 삭제되었습니다.' });
          }}
          confirmLabel="삭제"
          confirmColor="#f44336"
        >
          이 멤버십을 삭제하시겠습니까?<br />이 작업은 되돌릴 수 없습니다.
        </ConfirmModal>
      )}
      {result && (
        <ResultModal
          success={result.success}
          message={result.message}
          redirectPath={ROUTES.COMPLEX_MEMBERSHIPS}
        />
      )}
    </>
  );
}
