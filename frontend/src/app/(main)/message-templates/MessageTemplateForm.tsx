'use client';

import { useEffect, useState, useRef } from 'react';
import { messageTemplateApi, PlaceholderItem, type SmsEventType } from '@/lib/api';
import { Input, Textarea, Checkbox } from '@/components/ui/FormInput';
import { Button, LinkButton } from '@/components/ui/Button';
import styles from './MessageTemplateForm.module.css';

export interface MessageTemplateFormData {
  templateName: string;
  description: string;
  messageContext: string;
  isActive: boolean;
  eventType: SmsEventType | '';
}

const EVENT_TYPE_OPTIONS: { value: SmsEventType; label: string; group: string }[] = [
  { value: '예약확정', label: '예약 확정', group: '예약 · 등록' },
  { value: '고객등록', label: '고객 등록', group: '예약 · 등록' },
  { value: '회원등록', label: '회원 등록', group: '예약 · 등록' },
  { value: '연기승인', label: '연기 승인', group: '연기' },
  { value: '연기반려', label: '연기 반려', group: '연기' },
  { value: '환불승인', label: '환불 승인', group: '환불' },
  { value: '환불반려', label: '환불 반려', group: '환불' },
  { value: '양도완료', label: '양도 완료', group: '양도' },
  { value: '양도거절', label: '양도 거절', group: '양도' },
];

interface MessageTemplateFormProps {
  form: MessageTemplateFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  heading: string;
  submitLabel: string;
  submittingLabel: string;
  submitting: boolean;
  cancelHref: string;
}

export default function MessageTemplateForm({
  form, onChange, onSubmit, heading, submitLabel, submittingLabel, submitting, cancelHref,
}: MessageTemplateFormProps) {
  const [placeholders, setPlaceholders] = useState<PlaceholderItem[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const eventType = form.eventType || undefined;
    messageTemplateApi.placeholders(eventType).then((res) => {
      if (res.success) setPlaceholders(res.data);
    });
  }, [form.eventType]);

  const insertPlaceholder = (value: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = form.messageContext.substring(0, start);
    const after = form.messageContext.substring(end);
    const newValue = before + value + after;
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    nativeInputValueSetter?.call(el, newValue);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    requestAnimationFrame(() => {
      const pos = start + value.length;
      el.setSelectionRange(pos, pos);
      el.focus();
    });
  };

  const previewText = form.messageContext.trim()
    ? placeholders.reduce((text, ph) => text.replaceAll(ph.name || '', ph.examples || ph.name || ''), form.messageContext)
    : '';

  const groupedOptions: Record<string, typeof EVENT_TYPE_OPTIONS> = EVENT_TYPE_OPTIONS.reduce((acc, opt) => {
    (acc[opt.group] ??= []).push(opt);
    return acc;
  }, {} as Record<string, typeof EVENT_TYPE_OPTIONS>);

  return (
    <div className={styles.grid}>
      <div className={`content-card ${styles.formCard}`}>
        <h2 className={styles.heading}>{heading}</h2>

        <div className={styles.infoBox}>
          <div className={styles.infoTitle}>플레이스홀더 사용하기</div>
          <div className={styles.infoDesc}>
            이벤트 타입을 먼저 선택하면, 해당 이벤트에서 허용된 플레이스홀더만 오른쪽 패널에 표시됩니다.<br />
            플레이스홀더는 실제 발송 시 고객 정보로 자동 치환됩니다.
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <div className={styles.fieldGroup}>
            <label className="form-label">이벤트 타입 <span style={{ color: 'var(--danger)' }}>*</span></label>
            <select name="eventType" value={form.eventType} onChange={onChange} required
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #ccc', borderRadius: 4, fontSize: 14 }}>
              <option value="">이벤트 타입을 선택하세요</option>
              {Object.entries(groupedOptions).map(([group, opts]) => (
                <optgroup key={group} label={group}>
                  {opts.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div className={styles.hint}>이 템플릿이 사용될 이벤트를 지정합니다. 이벤트별로 허용되는 플레이스홀더가 다릅니다.</div>
          </div>

          <div className={styles.fieldGroup}>
            <label className="form-label">템플릿 이름 <span style={{ color: 'var(--danger)' }}>*</span></label>
            <Input type="text" name="templateName" value={form.templateName} onChange={onChange}
              placeholder="예: 예약 확인 메시지" required />
            <div className={styles.hint}>템플릿을 쉽게 식별할 수 있는 이름을 입력하세요</div>
          </div>

          <div className={styles.fieldGroup}>
            <label className="form-label">설명</label>
            <Input type="text" name="description" value={form.description} onChange={onChange}
              placeholder="이 템플릿의 용도를 간단히 설명하세요" />
          </div>

          <div className={styles.fieldGroup}>
            <label className="form-label">메시지 내용 <span style={{ color: 'var(--danger)' }}>*</span></label>
            <Textarea ref={textareaRef} name="messageContext" value={form.messageContext} onChange={onChange}
              rows={8} placeholder="메시지 내용을 입력하세요. 오른쪽 패널에서 플레이스홀더를 클릭하여 삽입할 수 있습니다."
              required style={{ resize: 'vertical', lineHeight: 1.6 }} />
            <div className={styles.charCount}>
              <span className={styles.charCountValue}>{form.messageContext.length}</span> / 2000자
            </div>
            <div className={styles.hint}>SMS는 90자(한글 45자), LMS는 2000자까지 전송 가능합니다</div>
          </div>

          <div className={styles.fieldGroupLg}>
            <Checkbox label="이 템플릿을 활성화" name="isActive" checked={form.isActive} onChange={onChange}
              hint="활성화된 템플릿만 발송 시 사용할 수 있습니다" />
          </div>

          {previewText && (
            <div className={styles.previewBox}>
              <div className={styles.previewTitle}>실시간 미리보기</div>
              <div className={styles.previewContent}>{previewText}</div>
            </div>
          )}

          <div className={styles.formActions}>
            <LinkButton href={cancelHref} variant="secondary" style={{ padding: '0.6rem 1.5rem' }}>취소</LinkButton>
            <Button type="submit" style={{ padding: '0.6rem 1.5rem' }} disabled={submitting}>
              {submitting ? submittingLabel : submitLabel}
            </Button>
          </div>
        </form>
      </div>

      <div className={`content-card ${styles.placeholderPanel}`}>
        <h3 className={styles.panelTitle}>
          사용 가능한 플레이스홀더
          {form.eventType && <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#999', marginLeft: 8 }}>({form.eventType})</span>}
        </h3>
        <div className={styles.panelScroll}>
          {!form.eventType ? (
            <div className={styles.emptyPh}>이벤트 타입을 먼저 선택해 주세요.</div>
          ) : placeholders.length === 0 ? (
            <div className={styles.emptyPh}>사용 가능한 플레이스홀더가 없습니다</div>
          ) : (
            placeholders.map((ph) => (
              <div key={ph.seq} onClick={() => ph.name && insertPlaceholder(ph.name)} className={styles.phCard}>
                {ph.value && <span className={styles.phValue}>{ph.value}</span>}
                <div className={styles.phName}>{ph.name}</div>
                {ph.comment && <div className={styles.phComment}>{ph.comment}</div>}
                {ph.examples && <div className={styles.phExample}>예시: {ph.examples}</div>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
