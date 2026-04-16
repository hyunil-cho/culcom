'use client';

import { useState } from 'react';
import FormField from '@/components/ui/FormField';
import FormLayout from '@/components/ui/FormLayout';
import FormErrorBanner from '@/components/ui/FormErrorBanner';
import { Input, Select, Textarea, Checkbox } from '@/components/ui/FormInput';
import { ROUTES } from '@/lib/routes';
import ConsentPreviewModal from './ConsentPreviewModal';

export const CATEGORIES = [
  { value: 'SIGNUP', label: '회원가입' },
  { value: 'TRANSFER', label: '멤버십 양도' },
] as const;

export interface ConsentItemFormData {
  title: string;
  content: string;
  required: boolean;
  category: string;
}

export const emptyForm: ConsentItemFormData = {
  title: '',
  content: '',
  required: true,
  category: '',
};

export function validateForm(form: ConsentItemFormData): string | null {
  if (!form.title.trim()) return '제목을 입력하세요.';
  if (!form.content.trim()) return '내용을 입력하세요.';
  if (!form.category) return '카테고리를 선택하세요.';
  return null;
}

export default function ConsentItemForm({
  form, onChange, onSubmit, isEdit, submitLabel, formError,
}: {
  form: ConsentItemFormData;
  onChange: (form: ConsentItemFormData) => void;
  onSubmit: () => void;
  isEdit?: boolean;
  submitLabel: string;
  formError?: string | null;
}) {
  const [preview, setPreview] = useState(false);

  return (
    <>
      <FormLayout
        title={isEdit ? '동의항목 수정' : '새 동의항목 등록'}
        backHref={ROUTES.CONSENT_ITEMS}
        submitLabel={submitLabel}
        onSubmit={onSubmit}
        isEdit={isEdit}
        headerExtra={
          <button
            type="button"
            onClick={() => setPreview(true)}
            style={{
              padding: '6px 14px', background: '#6366f1', color: '#fff',
              border: 'none', borderRadius: 6, fontSize: '0.85rem',
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            미리보기
          </button>
        }
      >
        <FormErrorBanner error={formError ?? null} />
        <FormField label="제목" required>
          <Input placeholder="예: 개인정보 수집·이용 동의" value={form.title}
            onChange={(e) => onChange({ ...form, title: e.target.value })} required />
        </FormField>

        <FormField label="카테고리" required>
          <Select value={form.category} required
            onChange={(e) => onChange({ ...form, category: e.target.value })}>
            <option value="">-- 카테고리 선택 --</option>
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="필수 여부">
          <Checkbox label="필수 동의항목" hint="체크 해제 시 선택 동의항목이 됩니다."
            checked={form.required}
            onChange={(e) => onChange({ ...form, required: e.target.checked })} />
        </FormField>

        <FormField label="내용" required hint="약관 본문을 작성하세요.">
          <Textarea
            placeholder="동의 내용을 작성하세요..."
            value={form.content}
            onChange={(e) => onChange({ ...form, content: e.target.value })}
            style={{ height: 300, fontFamily: 'inherit', lineHeight: 1.6 }}
            required
          />
        </FormField>
      </FormLayout>

      {preview && (
        <ConsentPreviewModal
          title={form.title || '(제목 없음)'}
          content={form.content || '(내용 없음)'}
          required={form.required}
          onClose={() => setPreview(false)}
        />
      )}
    </>
  );
}
