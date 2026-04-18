'use client';

import FormField from '@/components/ui/FormField';
import { Input } from '@/components/ui/FormInput';
import { useCardCompanies } from '@/lib/useCardCompanies';

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
  readOnly?: boolean;
}

const readOnlyStyle = { background: '#f3f4f6', color: '#6b7280' };

export default function CardPaymentFields({ value, onChange, readOnly = false }: Props) {
  const { cardCompanies } = useCardCompanies();
  const update = (field: keyof CardPaymentDetailData, v: string) =>
    onChange({ ...value, [field]: v });
  const options = cardCompanies.filter(c => c.isActive || c.code === value.cardCompany);

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

      <FormField label="카드사" required={!readOnly}>
        {readOnly ? (
          <Input value={value.cardCompany || '-'} readOnly style={readOnlyStyle} />
        ) : (
          <select
            className="form-input"
            value={value.cardCompany}
            required
            onChange={(e) => update('cardCompany', e.target.value)}
          >
            <option value="">-- 선택 --</option>
            {options.map(c => <option key={c.seq} value={c.code}>{c.code}</option>)}
          </select>
        )}
      </FormField>

      <FormField label="카드번호 (앞 8자리)" required={!readOnly}>
        <Input
          type="text"
          inputMode="numeric"
          maxLength={8}
          placeholder="12345678"
          value={value.cardNumber}
          required={!readOnly}
          readOnly={readOnly}
          style={readOnly ? readOnlyStyle : undefined}
          onChange={(e) => update('cardNumber', e.target.value.replace(/\D/g, '').slice(0, 8))}
        />
      </FormField>

      <FormField label="승인 날짜" required={!readOnly}>
        <Input
          type="date"
          value={value.cardApprovalDate}
          required={!readOnly}
          readOnly={readOnly}
          style={readOnly ? readOnlyStyle : undefined}
          onChange={(e) => update('cardApprovalDate', e.target.value)}
        />
      </FormField>

      <FormField label="승인번호" required={!readOnly}>
        <Input
          type="text"
          maxLength={50}
          placeholder="승인번호 입력"
          value={value.cardApprovalNumber}
          required={!readOnly}
          readOnly={readOnly}
          style={readOnly ? readOnlyStyle : undefined}
          onChange={(e) => update('cardApprovalNumber', e.target.value)}
        />
      </FormField>
    </div>
  );
}
