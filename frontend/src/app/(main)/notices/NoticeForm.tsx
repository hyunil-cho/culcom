'use client';

import { Input, Select, Textarea, Checkbox } from '@/components/ui/FormInput';
import { Button, LinkButton } from '@/components/ui/Button';
import st from './NoticeForm.module.css';

export interface NoticeFormData {
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  createdBy: string;
  eventStartDate: string;
  eventEndDate: string;
}

interface NoticeFormProps {
  form: NoticeFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  heading: string;
  submitLabel: string;
  submittingLabel: string;
  submitting: boolean;
  cancelHref: string;
  disableCreatedBy?: boolean;
}

export default function NoticeForm({
  form, onChange, onSubmit, heading, submitLabel, submittingLabel, submitting, cancelHref, disableCreatedBy = false,
}: NoticeFormProps) {
  return (
    <div className={`content-card ${st.formCard}`}>
      <h2 className={st.heading}>{heading}</h2>

      <form onSubmit={onSubmit}>
        <div className={st.twoCol}>
          <div>
            <label className="form-label">카테고리 <span className={st.requiredMark}>*</span></label>
            <Select name="category" value={form.category} onChange={onChange}>
              <option value="스터디시간">스터디시간</option>
              <option value="상담가능시간">상담가능시간</option>
            </Select>
          </div>
          <div>
            <label className="form-label">작성자</label>
            {disableCreatedBy ? (
              <Input type="text" value={form.createdBy} disabled style={{ background: '#f5f5f5' }} />
            ) : (
              <Input type="text" name="createdBy" value={form.createdBy} onChange={onChange} placeholder="작성자 이름" />
            )}
          </div>
        </div>

        <div className={st.fieldGroup}>
          <label className="form-label">제목 <span className={st.requiredMark}>*</span></label>
          <Input type="text" name="title" value={form.title} onChange={onChange} placeholder="제목을 입력하세요" required />
        </div>

        <div className={st.fieldGroup}>
          <label className="form-label">내용 <span className={st.requiredMark}>*</span></label>
          <Textarea name="content" value={form.content} onChange={onChange} rows={12} placeholder="내용을 입력하세요" required style={{ resize: 'vertical' }} />
        </div>

        <div className={st.fieldGroupLg}>
          <Checkbox label="상단 고정" name="isPinned" checked={form.isPinned} onChange={onChange} />
        </div>

        <div className={st.formActions}>
          <LinkButton href={cancelHref} variant="secondary" style={{ padding: '0.6rem 1.5rem' }}>취소</LinkButton>
          <Button type="submit" style={{ padding: '0.6rem 1.5rem' }} disabled={submitting}>
            {submitting ? submittingLabel : submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
