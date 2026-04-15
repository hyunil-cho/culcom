'use client';

import FormField from '@/components/ui/FormField';
import { Input } from '@/components/ui/FormInput';

export interface CardPaymentDetailData {
  cardCompany: string;
  cardNumber: string;
  cardApprovalDate: string;
  cardApprovalNumber: string;
}

export const emptyCardDetail: CardPaymentDetailData = {
  cardCompany: '',
  cardNumber: '',
  cardApprovalDate: '',
  cardApprovalNumber: '',
};

interface Props {
  value: CardPaymentDetailData;
  onChange: (value: CardPaymentDetailData) => void;
}

const CARD_COMPANIES = [
  '삼성', '현대', 'KB국민', '신한', '롯데', '하나', 'BC', 'NH농협', '우리', '씨티',
];

export default function CardPaymentFields({ value, onChange }: Props) {
  const update = (field: keyof CardPaymentDetailData, v: string) =>
    onChange({ ...value, [field]: v });

  return (
    <div style={{
      border: '1px solid #e0e7ef',
      borderRadius: 8,
      padding: '14px 16px',
      marginTop: 4,
      marginBottom: 8,
      background: '#f8fafc',
    }}>
      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#4a90e2', marginBottom: 10 }}>
        카드 결제 정보
      </div>

      <FormField label="카드사" required>
        <select
          className="form-input"
          value={value.cardCompany}
          required
          onChange={(e) => update('cardCompany', e.target.value)}
        >
          <option value="">-- 선택 --</option>
          {CARD_COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </FormField>

      <FormField label="카드번호 (앞 8자리)" required>
        <Input
          type="text"
          inputMode="numeric"
          maxLength={8}
          placeholder="12345678"
          value={value.cardNumber}
          required
          onChange={(e) => update('cardNumber', e.target.value.replace(/\D/g, '').slice(0, 8))}
        />
      </FormField>

      <FormField label="승인 날짜" required>
        <Input
          type="date"
          value={value.cardApprovalDate}
          required
          onChange={(e) => update('cardApprovalDate', e.target.value)}
        />
      </FormField>

      <FormField label="승인번호" required>
        <Input
          type="text"
          maxLength={50}
          placeholder="승인번호 입력"
          value={value.cardApprovalNumber}
          required
          onChange={(e) => update('cardApprovalNumber', e.target.value)}
        />
      </FormField>
    </div>
  );
}
