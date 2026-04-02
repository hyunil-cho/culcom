'use client';

import Link from 'next/link';

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
            <select name="category" value={form.category} onChange={onChange} className="form-input" style={{ width: '100%' }}>
              <option value="공지사항">공지사항</option>
              <option value="이벤트">이벤트</option>
            </select>
          </div>
          <div>
            <label className="form-label">작성자</label>
            {disableCreatedBy ? (
              <input type="text" value={form.createdBy} className="form-input" disabled style={{ width: '100%', background: '#f5f5f5' }} />
            ) : (
              <input type="text" name="createdBy" value={form.createdBy} onChange={onChange} className="form-input" placeholder="작성자 이름" style={{ width: '100%' }} />
            )}
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label className="form-label">제목 <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input type="text" name="title" value={form.title} onChange={onChange} className="form-input" placeholder="제목을 입력하세요" required style={{ width: '100%' }} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label className="form-label">내용 <span style={{ color: 'var(--danger)' }}>*</span></label>
          <textarea name="content" value={form.content} onChange={onChange} className="form-input" rows={12} placeholder="내용을 입력하세요" required style={{ width: '100%', resize: 'vertical' }} />
        </div>

        {showEventDate && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">이벤트 시작일</label>
              <input type="date" name="eventStartDate" value={form.eventStartDate} onChange={onChange} className="form-input" style={{ width: '100%' }} />
            </div>
            <div>
              <label className="form-label">이벤트 종료일</label>
              <input type="date" name="eventEndDate" value={form.eventEndDate} onChange={onChange} className="form-input" style={{ width: '100%' }} />
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
          <Link href={cancelHref} className="btn-secondary" style={{ padding: '0.6rem 1.5rem', textDecoration: 'none' }}>
            취소
          </Link>
          <button type="submit" className="btn-primary" style={{ padding: '0.6rem 1.5rem' }} disabled={submitting}>
            {submitting ? submittingLabel : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
