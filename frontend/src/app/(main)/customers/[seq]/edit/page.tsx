'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button, LinkButton } from '@/components/ui/Button';
import { customerApi, type Customer } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { cleanPhoneNumber, verifyPhoneNumber } from '@/lib/commonUtils';
import { ROUTES } from '@/lib/routes';
import FormField from '@/components/ui/FormField';
import FormErrorBanner from '@/components/ui/FormErrorBanner';
import { Input, PhoneInput, Textarea } from '@/components/ui/FormInput';
import { useResultModal } from '@/hooks/useResultModal';
import { useFormError } from '@/hooks/useFormError';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function CustomerEditPage() {
  const params = useParams();
  const seq = Number(params.seq);

  const [form, setForm] = useState({ name: '', phoneNumber: '', comment: '', commercialName: '', adSource: '' });
  const { run, modal } = useResultModal({ redirectPath: ROUTES.CUSTOMERS, invalidateKeys: ['customers'] });
  const { error: formError, setError, clear: clearError } = useFormError();
  const [deleting, setDeleting] = useState(false);

  const { data: customerData } = useApiQuery<Customer>(
    ['customer', seq],
    () => customerApi.get(seq),
  );

  useEffect(() => {
    if (customerData) {
      setForm({
        name: customerData.name,
        phoneNumber: customerData.phoneNumber,
        comment: customerData.comment ?? '',
        commercialName: customerData.commercialName ?? '',
        adSource: customerData.adSource ?? '',
      });
    }
  }, [customerData]);

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('이름을 입력해주세요.'); return; }
    if (verifyPhoneNumber(form.phoneNumber)) { setError('전화번호는 010으로 시작하는 11자리 숫자여야 합니다.'); return; }
    clearError();
    await run(customerApi.update(seq, {
      name: form.name,
      phoneNumber: form.phoneNumber,
      comment: form.comment || undefined,
      commercialName: form.commercialName || undefined,
      adSource: form.adSource || undefined,
    }), '고객 정보가 수정되었습니다.');
  };

  return (
    <>
      <div className="detail-actions">
        <Link href={ROUTES.CUSTOMER_DETAIL(seq)} className="btn-back">← 상세로</Link>
        <div className="action-group" style={{ display: 'flex', gap: 8 }}>
          <Button onClick={handleSubmit}>수정</Button>
          <LinkButton href={ROUTES.CUSTOMER_DETAIL(seq)} variant="secondary">취소</LinkButton>
        </div>
      </div>

      <div className="content-card">
        <div className="form-header"><h2>고객 정보 수정</h2></div>
        <div className="form-body">
          <FormErrorBanner error={formError} />
          <FormField label="이름" required>
            <Input value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </FormField>
          <FormField label="전화번호" required hint="하이픈 없이 숫자만 입력">
            <PhoneInput value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: cleanPhoneNumber(e.target.value) })} required />
          </FormField>
          <FormField label="코멘트">
            <Textarea rows={3} maxLength={200} value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })} />
          </FormField>
          <FormField label="광고명">
            <Input value={form.commercialName}
              onChange={(e) => setForm({ ...form, commercialName: e.target.value })} />
          </FormField>
          <FormField label="지원경로">
            <Input value={form.adSource}
              onChange={(e) => setForm({ ...form, adSource: e.target.value })} />
          </FormField>
        </div>
      </div>

      {/* 삭제 기능 비활성화
      {deleting && (
        <ConfirmModal title="삭제 확인" onCancel={() => setDeleting(false)}
          onConfirm={async () => {
            setDeleting(false);
            await run(customerApi.delete(seq), '고객이 삭제되었습니다.');
          }} confirmLabel="삭제" confirmColor="#f44336">
          이 고객을 삭제하시겠습니까?<br />이 작업은 되돌릴 수 없습니다.
        </ConfirmModal>
      )}
      */}

      {modal}
    </>
  );
}
