'use client';

import { useState } from 'react';
import Link from 'next/link';
import { customerApi } from '@/lib/api';
import { cleanPhoneNumber, verifyPhoneNumber } from '@/lib/commonUtils';
import { ROUTES } from '@/lib/routes';
import { useResultModal } from '@/hooks/useResultModal';
import { useFormError } from '@/hooks/useFormError';
import { useSignupChannels } from '@/lib/useSignupChannels';
import FormField from '@/components/ui/FormField';
import FormErrorBanner from '@/components/ui/FormErrorBanner';
import { Input, PhoneInput, Select, Textarea } from '@/components/ui/FormInput';

export default function CustomerAddPage() {
  const [form, setForm] = useState({
    name: '',
    phoneNumber: '',
    comment: '',
    adSource: '',
  });
  const { run, modal } = useResultModal({ redirectPath: ROUTES.CUSTOMERS, invalidateKeys: ['customers'] });
  const { error: formError, setError, clear: clearError } = useFormError();
  const { channels: signupChannelConfigs } = useSignupChannels();
  const signupChannelLabels = signupChannelConfigs.map(c => c.code);
  const adSourceSelectValue = signupChannelLabels.includes(form.adSource) ? form.adSource : (form.adSource ? '기타' : '');

  const handlePhoneChange = (value: string) => {
    const cleaned = cleanPhoneNumber(value);
    setForm({ ...form, phoneNumber: cleaned });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }
    if (verifyPhoneNumber(form.phoneNumber)) {
      setError('전화번호는 010으로 시작하는 11자리 숫자여야 합니다.');
      return;
    }
    clearError();
    const res = await customerApi.create(form);
    if (!res.success) { run(Promise.resolve(res), ''); return; }
    const msg = res.data.smsWarning
      ? `고객이 등록되었습니다.\n(${res.data.smsWarning})`
      : '고객이 등록되었습니다.';
    await run(Promise.resolve(res), msg);
  };

  return (
    <>
      <div className="detail-actions">
        <Link href={ROUTES.CUSTOMERS} className="btn-back">← 목록으로</Link>
      </div>

      <div className="content-card">
        <div className="form-header">
          <h2>기본 정보</h2>
        </div>
        <div className="form-body">
          <FormErrorBanner error={formError} />
          <FormField label="이름" required>
            <Input placeholder="이름을 입력하세요" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </FormField>

          <FormField label="전화번호" required hint="하이픈 없이 숫자만 입력해주세요 (예: 01012345678)">
            <PhoneInput value={form.phoneNumber}
              onChange={(e) => handlePhoneChange(e.target.value)} required />
          </FormField>

          <FormField label="가입 경로">
            <div>
              <Select value={adSourceSelectValue}
                onChange={(e) => {
                  if (e.target.value === '기타') setForm({ ...form, adSource: '기타' });
                  else setForm({ ...form, adSource: e.target.value });
                }}>
                <option value="">-- 선택 --</option>
                {signupChannelLabels.map(ch => <option key={ch} value={ch}>{ch}</option>)}
                <option value="기타">기타 (직접입력)</option>
              </Select>
              {form.adSource && !signupChannelLabels.includes(form.adSource) && form.adSource !== '' && (
                <Input style={{ marginTop: 8 }} placeholder="가입 경로를 직접 입력하세요"
                  value={form.adSource === '기타' ? '' : form.adSource}
                  onChange={(e) => setForm({ ...form, adSource: e.target.value || '기타' })} />
              )}
            </div>
          </FormField>

          <FormField label="코멘트" hint="최대 200자까지 입력 가능합니다.">
            <Textarea rows={4} placeholder="고객에 대한 메모를 입력하세요 (선택사항)"
              maxLength={200} value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })} />
          </FormField>
        </div>
      </div>

      <div className="form-actions">
        <button className="btn-primary-large" onClick={handleSubmit}>저장</button>
        <Link href={ROUTES.CUSTOMERS} className="btn-secondary-large">취소</Link>
      </div>

      {modal}
    </>
  );
}
