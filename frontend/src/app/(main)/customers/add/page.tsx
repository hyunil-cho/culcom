'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { customerApi } from '@/lib/api';
import {verifyPhoneNumber} from "@/lib/commonUtils";

export default function CustomerAddPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    phoneNumber: '',
    comment: '',
  });

  const handlePhoneChange = (value: string) => {
    // 숫자만 남기고 11자리 제한
    const cleaned = value.replace(/[^0-9]/g, '').slice(0, 11);
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
    await customerApi.create(form);
    router.push('/customers');
  };

  return (
    <>
      {/* 액션 버튼 */}
      <div className="detail-actions">
        <Link href="/customers" className="btn-back">← 목록으로</Link>
      </div>

      {/* 고객 추가 폼 */}
      <div className="content-card">
        <div className="form-header">
          <h2>기본 정보</h2>
        </div>
        <div className="form-body">
          <div className="form-row">
            <label className="form-label">이름 <span className="required">*</span></label>
            <input
              className="form-input"
              placeholder="이름을 입력하세요"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <label className="form-label">전화번호 <span className="required">*</span></label>
            <input
              className="form-input"
              type="tel"
              placeholder="01012345678"
              maxLength={11}
              value={form.phoneNumber}
              onChange={(e) => handlePhoneChange(e.target.value)}
              required
            />
            <span className="form-hint">하이픈 없이 숫자만 입력해주세요 (예: 01012345678)</span>
          </div>

          <div className="form-row">
            <label className="form-label">코멘트</label>
            <textarea
              className="form-input"
              rows={4}
              placeholder="고객에 대한 메모를 입력하세요 (선택사항)"
              maxLength={200}
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
            />
            <span className="form-hint">최대 200자까지 입력 가능합니다.</span>
          </div>
        </div>
      </div>

      {/* 저장 버튼 */}
      <div className="form-actions">
        <button className="btn-primary-large" onClick={handleSubmit}>저장</button>
        <Link href="/customers" className="btn-secondary-large">취소</Link>
      </div>
    </>
  );
}
