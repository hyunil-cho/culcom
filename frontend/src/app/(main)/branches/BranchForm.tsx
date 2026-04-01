'use client';

import Link from 'next/link';
import FormField from '@/components/ui/FormField';

export interface BranchFormData {
  branchName: string;
  alias: string;
  branchManager: string;
  address: string;
  directions: string;
}

export const emptyBranchForm: BranchFormData = {
  branchName: '',
  alias: '',
  branchManager: '',
  address: '',
  directions: '',
};

export function validateBranchForm(form: BranchFormData): string | null {
  if (!/^[a-zA-Z]+$/.test(form.alias)) return '별칭은 영문만 입력 가능합니다.';
  return null;
}

export default function BranchForm({
  form,
  onChange,
  onSubmit,
  backHref,
  backLabel,
  cancelHref,
  seq,
}: {
  form: BranchFormData;
  onChange: (form: BranchFormData) => void;
  onSubmit: () => void;
  backHref: string;
  backLabel: string;
  cancelHref: string;
  seq?: number;
}) {
  const set = (field: keyof BranchFormData, value: string) =>
    onChange({ ...form, [field]: value });

  return (
    <>
      <div className="detail-actions">
        <Link href={backHref} className="btn-back">{backLabel}</Link>
      </div>

      <div className="content-card">
        <div className="form-header">
          <h2>기본 정보</h2>
        </div>
        <div className="form-body">
          {seq !== undefined && (
            <FormField label="지점코드">
              <input className="form-input" value={seq} disabled />
            </FormField>
          )}

          <FormField label="지점명" required>
            <input
              className="form-input"
              placeholder="지점명을 입력하세요"
              value={form.branchName}
              onChange={(e) => set('branchName', e.target.value)}
              required
            />
          </FormField>

          <FormField label="별칭" required hint="영문만 입력 가능합니다 (예: gangnam, hongdae)">
            <input
              className="form-input"
              placeholder="영문 별칭을 입력하세요"
              value={form.alias}
              onChange={(e) => set('alias', e.target.value)}
              required
            />
          </FormField>

          <FormField label="매니저">
            <input
              className="form-input"
              placeholder="담당자를 입력하세요"
              value={form.branchManager}
              onChange={(e) => set('branchManager', e.target.value)}
            />
          </FormField>

          <FormField label="주소">
            <input
              className="form-input"
              placeholder="주소를 입력하세요"
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
            />
          </FormField>

          <FormField label="오시는 길">
            <textarea
              className="form-input"
              rows={4}
              placeholder="오시는 길 안내를 입력하세요"
              value={form.directions}
              onChange={(e) => set('directions', e.target.value)}
            />
          </FormField>
        </div>
      </div>

      <div className="form-actions">
        <button className="btn-primary-large" onClick={onSubmit}>저장</button>
        <Link href={cancelHref} className="btn-secondary-large">취소</Link>
      </div>
    </>
  );
}
