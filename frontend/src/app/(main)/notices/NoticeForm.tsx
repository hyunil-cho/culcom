'use client';

import { Input, Select, Textarea } from '@/components/ui/FormInput';
import { Button, LinkButton } from '@/components/ui/Button';

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
  /** true이면 작성자 필드를 disabled로 표시 (수정 모드) */
  disableCreatedBy?: boolean;
}

export default function NoticeForm({
  form,
  onChange,
  onSubmit,
  heading,
  submitLabel,
  submittingLabel,
  submitting,
  cancelHref,
  disableCreatedBy = false,
}: NoticeFormProps) {
  const showEventDate = form.category === '이벤트';

  return (
    <div className="content-card" style={{ padding: '2rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>{heading}</h2>

      <form onSubmit={onSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label className="form-label">카테고리 <span style={{ color: 'var(--danger)' }}>*</span></label>
            <Select name="category" value={form.category} onChange={onChange} style={{ width: '100%' }}>
              <option value="공지사항">공지사항</option>
              <option value="이벤트">이벤트</option>
            </Select>
          </div>
          <div>
            <label className="form-label">작성자</label>
            {disableCreatedBy ? (
              <Input type="text" value={form.createdBy} disabled style={{ width: '100%', background: '#f5f5f5' }} />
            ) : (
              <Input type="text" name="createdBy" value={form.createdBy} onChange={onChange} placeholder="작성자 이름" style={{ width: '100%' }} />
            )}
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label className="form-label">제목 <span style={{ color: 'var(--danger)' }}>*</span></label>
          <Input type="text" name="title" value={form.title} onChange={onChange} placeholder="제목을 입력하세요" required style={{ width: '100%' }} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label className="form-label">내용 <span style={{ color: 'var(--danger)' }}>*</span></label>
          <Textarea name="content" value={form.content} onChange={onChange} rows={12} placeholder="내용을 입력하세요" required style={{ width: '100%', resize: 'vertical' }} />
        </div>

        {showEventDate && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">이벤트 시작일</label>
              <Input type="date" name="eventStartDate" value={form.eventStartDate} onChange={onChange} style={{ width: '100%' }} />
            </div>
            <div>
              <label className="form-label">이벤트 종료일</label>
              <Input type="date" name="eventEndDate" value={form.eventEndDate} onChange={onChange} style={{ width: '100%' }} />
            </div>
          </div>
        )}

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" name="isPinned" checked={form.isPinned} onChange={onChange} />
            상단 고정
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <LinkButton href={cancelHref} variant="secondary" style={{ padding: '0.6rem 1.5rem' }}>
            취소
          </LinkButton>
          <Button type="submit" style={{ padding: '0.6rem 1.5rem' }} disabled={submitting}>
            {submitting ? submittingLabel : submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
