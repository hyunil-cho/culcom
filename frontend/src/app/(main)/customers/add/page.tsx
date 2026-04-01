'use client';

import { useState } from 'react';
import Link from 'next/link';
import { customerApi } from '@/lib/api';
import { cleanPhoneNumber, verifyPhoneNumber } from '@/lib/commonUtils';
import ResultModal from '@/components/ui/ResultModal';
import FormField from '@/components/ui/FormField';

export default function CustomerAddPage() {
  const [form, setForm] = useState({
    name: '',
    phoneNumber: '',
    comment: '',
  });
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handlePhoneChange = (value: string) => {
    const cleaned = cleanPhoneNumber(value);
    setForm({ ...form, phoneNumber: cleaned });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }
    if (verifyPhoneNumber(form.phoneNumber)) {
      alert('전화번호는 010으로 시작하는 11자리 숫자여야 합니다.');
      return;
    }
    const res = await customerApi.create(form);
    if (res.success) setResult({ success: true, message: '고객이 등록되었습니다.' });
  };

  return (
    <>
      <div className="detail-actions">
        <Link href="/customers" className="btn-back">← 목록으로</Link>
      </div>

      <div className="content-card">
        <div className="form-header">
          <h2>기본 정보</h2>
        </div>
        <div className="form-body">
          <FormField label="이름" required>
            <input
              className="form-input"
              placeholder="이름을 입력하세요"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </FormField>

          <FormField label="전화번호" required hint="하이픈 없이 숫자만 입력해주세요 (예: 01012345678)">
            <input
              className="form-input"
              type="tel"
              placeholder="01012345678"
              maxLength={11}
              value={form.phoneNumber}
              onChange={(e) => handlePhoneChange(e.target.value)}
              required
            />
          </FormField>

          <FormField label="코멘트" hint="최대 200자까지 입력 가능합니다.">
            <textarea
              className="form-input"
              rows={4}
              placeholder="고객에 대한 메모를 입력하세요 (선택사항)"
              maxLength={200}
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
            />
          </FormField>
        </div>
      </div>

      <div className="form-actions">
        <button className="btn-primary-large" onClick={handleSubmit}>저장</button>
        <Link href="/customers" className="btn-secondary-large">취소</Link>
      </div>

      {result && (
        <ResultModal
          success={result.success}
          message={result.message}
          redirectPath="/customers"
        />
      )}
    </>
  );
}
