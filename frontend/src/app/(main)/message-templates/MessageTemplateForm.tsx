'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { messageTemplateApi, PlaceholderItem } from '@/lib/api';

export interface MessageTemplateFormData {
  templateName: string;
  description: string;
  messageContext: string;
  isActive: boolean;
}

interface MessageTemplateFormProps {
  form: MessageTemplateFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  heading: string;
  submitLabel: string;
  submittingLabel: string;
  submitting: boolean;
  cancelHref: string;
}

export default function MessageTemplateForm({
  form,
  onChange,
  onSubmit,
  heading,
  submitLabel,
  submittingLabel,
  submitting,
  cancelHref,
}: MessageTemplateFormProps) {
  const [placeholders, setPlaceholders] = useState<PlaceholderItem[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messageTemplateApi.placeholders().then((res) => {
      if (res.success) setPlaceholders(res.data);
    });
  }, []);

  const insertPlaceholder = (value: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = form.messageContext.substring(0, start);
    const after = form.messageContext.substring(end);
    const newValue = before + value + after;

    // onChange를 시뮬레이트
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    )?.set;
    nativeInputValueSetter?.call(el, newValue);
    el.dispatchEvent(new Event('input', { bubbles: true }));

    // 커서 위치 이동
    requestAnimationFrame(() => {
      const pos = start + value.length;
      el.setSelectionRange(pos, pos);
      el.focus();
    });
  };

  const previewText = form.messageContext.trim()
    ? placeholders.reduce(
        (text, ph) => text.replaceAll(ph.name || '', ph.examples || ph.name || ''),
        form.messageContext
      )
    : '';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>
      {/* 왼쪽: 폼 */}
      <div className="content-card" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>{heading}</h2>

        {/* 안내 */}
        <div style={{
          background: '#e3f2fd',
          borderLeft: '4px solid #2196f3',
          padding: 16,
          borderRadius: 4,
          marginBottom: 20,
        }}>
          <div style={{ fontWeight: 600, color: '#1976d2', marginBottom: 8 }}>플레이스홀더 사용하기</div>
          <div style={{ color: '#424242', fontSize: 14, lineHeight: 1.6 }}>
            오른쪽 패널에서 플레이스홀더를 클릭하면 메시지 내용에 자동으로 삽입됩니다.<br />
            플레이스홀더는 실제 발송 시 고객 정보로 자동 치환됩니다.
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label className="form-label">템플릿 이름 <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input
              type="text"
              name="templateName"
              value={form.templateName}
              onChange={onChange}
              className="form-input"
              placeholder="예: 예약 확인 메시지"
              required
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
              템플릿을 쉽게 식별할 수 있는 이름을 입력하세요
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label className="form-label">설명</label>
            <input
              type="text"
              name="description"
              value={form.description}
              onChange={onChange}
              className="form-input"
              placeholder="이 템플릿의 용도를 간단히 설명하세요"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label className="form-label">메시지 내용 <span style={{ color: 'var(--danger)' }}>*</span></label>
            <textarea
              ref={textareaRef}
              name="messageContext"
              value={form.messageContext}
              onChange={onChange}
              className="form-input"
              rows={8}
              placeholder="메시지 내용을 입력하세요. 오른쪽 패널에서 플레이스홀더를 클릭하여 삽입할 수 있습니다."
              required
              style={{ width: '100%', resize: 'vertical', lineHeight: 1.6 }}
            />
            <div style={{ textAlign: 'right', fontSize: 12, color: '#666', marginTop: 6 }}>
              <span style={{ fontWeight: 600, color: 'var(--primary, #667eea)' }}>{form.messageContext.length}</span> / 2000자
            </div>
            <div style={{ fontSize: 12, color: '#666' }}>
              SMS는 90자(한글 45자), LMS는 2000자까지 전송 가능합니다
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" name="isActive" checked={form.isActive} onChange={onChange} />
              이 템플릿을 활성화
            </label>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              활성화된 템플릿만 발송 시 사용할 수 있습니다
            </div>
          </div>

          {/* 미리보기 */}
          {previewText && (
            <div style={{
              background: '#f5f7ff',
              border: '2px solid var(--primary, #667eea)',
              borderRadius: 8,
              padding: 16,
              marginBottom: 24,
            }}>
              <div style={{ fontWeight: 600, color: 'var(--primary, #667eea)', marginBottom: 12 }}>
                실시간 미리보기
              </div>
              <div style={{
                background: 'white',
                border: '1px solid #e0e7ff',
                borderRadius: 6,
                padding: 12,
                fontSize: 14,
                lineHeight: 1.6,
                color: '#333',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {previewText}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid #e0e0e0', paddingTop: 20 }}>
            <Link href={cancelHref} className="btn-secondary" style={{ padding: '0.6rem 1.5rem', textDecoration: 'none' }}>
              취소
            </Link>
            <button type="submit" className="btn-primary" style={{ padding: '0.6rem 1.5rem' }} disabled={submitting}>
              {submitting ? submittingLabel : submitLabel}
            </button>
          </div>
        </form>
      </div>

      {/* 오른쪽: 플레이스홀더 패널 */}
      <div className="content-card" style={{ padding: '1.5rem', position: 'sticky', top: 20 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #f5f5f5' }}>
          사용 가능한 플레이스홀더
        </h3>
        <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
          {placeholders.map((ph) => (
            <div
              key={ph.seq}
              onClick={() => ph.name && insertPlaceholder(ph.name)}
              style={{
                background: '#f9f9f9',
                border: '1px solid #e0e0e0',
                borderRadius: 8,
                padding: 12,
                marginBottom: 10,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f5f7ff';
                e.currentTarget.style.borderColor = 'var(--primary, #667eea)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f9f9f9';
                e.currentTarget.style.borderColor = '#e0e0e0';
              }}
            >
              {ph.value && (
                <span style={{
                  display: 'inline-block',
                  background: '#fff3e0',
                  color: '#e65100',
                  padding: '4px 10px',
                  borderRadius: 4,
                  fontWeight: 600,
                  fontSize: 13,
                  fontFamily: 'monospace',
                  marginBottom: 6,
                }}>
                  {ph.value}
                </span>
              )}
              <div style={{ fontWeight: 600, color: '#333', fontSize: 14, marginBottom: 4 }}>{ph.name}</div>
              {ph.comment && <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{ph.comment}</div>}
              {ph.examples && <div style={{ fontSize: 11, color: '#999', fontStyle: 'italic' }}>예시: {ph.examples}</div>}
            </div>
          ))}
          {placeholders.length === 0 && (
            <div style={{ textAlign: 'center', color: '#999', padding: '2rem 0' }}>
              등록된 플레이스홀더가 없습니다
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
