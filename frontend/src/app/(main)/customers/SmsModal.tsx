'use client';

import { useEffect, useState, useRef } from 'react';
import { messageTemplateApi, settingsApi, externalApi, MessageTemplateItem } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { Select, Textarea } from '@/components/ui/FormInput';
import { Button } from '@/components/ui/Button';
import s from './SmsModal.module.css';

interface SmsModalProps {
  customerName: string;
  customerPhone: string;
  interviewDate?: string;
  onClose: () => void;
  onResult: (success: boolean, message: string) => void;
}

export default function SmsModal({ customerName, customerPhone, interviewDate, onClose, onResult }: SmsModalProps) {
  const [mode, setMode] = useState<'template' | 'direct'>('template');

  const { data: templates = [] } = useApiQuery<MessageTemplateItem[]>(
    ['messageTemplates'],
    () => messageTemplateApi.list(),
  );

  const { data: senderNumbers = [] } = useApiQuery<string[]>(
    ['senderNumbers'],
    () => settingsApi.getSenderNumbers(),
  );

  const [selectedTemplateSeq, setSelectedTemplateSeq] = useState<number | ''>('');
  const [senderPhone, setSenderPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Set defaults when data loads
  useEffect(() => {
    if (templates.length > 0 && selectedTemplateSeq === '') {
      const def = templates.find(t => t.isDefault);
      if (def) setSelectedTemplateSeq(def.seq);
    }
  }, [templates, selectedTemplateSeq]);

  useEffect(() => {
    if (senderNumbers.length > 0 && !senderPhone) {
      setSenderPhone(senderNumbers[0]);
    }
  }, [senderNumbers, senderPhone]);

  useEffect(() => {
    if (mode !== 'template' || !selectedTemplateSeq) return;
    let cancelled = false;
    messageTemplateApi.resolve(selectedTemplateSeq, { customerName, customerPhone, interviewDate })
      .then(res => { if (!cancelled) setMessage(res.success && res.data ? res.data : ''); });
    return () => { cancelled = true; };
  }, [selectedTemplateSeq, mode, customerName, customerPhone, interviewDate]);

  const handleModeChange = (newMode: 'template' | 'direct') => {
    setMode(newMode);
    if (newMode === 'direct') { setMessage(''); setSelectedTemplateSeq(''); }
  };

  const handleSend = async () => {
    if (!message.trim()) { onResult(false, '메시지 내용을 입력해주세요.'); return; }
    if (!senderPhone) { onResult(false, '발신번호를 선택해주세요.'); return; }
    setSending(true);
    const res = await externalApi.sendSms({ senderPhone, receiverPhone: customerPhone, message });
    setSending(false);
    if (res.success && res.data?.success) {
      onResult(true, `메시지가 전송되었습니다. (${res.data.msgType})`);
    } else {
      onResult(false, res.data?.message || res.message || '메시지 전송에 실패했습니다.');
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal-content ${s.content}`}>
        <div className={s.header}>
          <h3 className={s.title}>메시지 전송</h3>
        </div>

        <div className={s.body}>
          <div className={s.recipientInfo}>
            <div>
              <span className={s.infoLabel}>수신자</span>
              <span className={s.infoValue}>{customerName}</span>
            </div>
            <div>
              <span className={s.infoLabel}>전화번호</span>
              <span className={s.infoValue}>{customerPhone}</span>
            </div>
          </div>

          <div className={s.modeRow}>
            {(['template', 'direct'] as const).map(m => (
              <button key={m} onClick={() => handleModeChange(m)}
                className={mode === m ? s.modeBtnActive : s.modeBtnInactive}>
                {m === 'template' ? '템플릿 사용' : '직접입력'}
              </button>
            ))}
          </div>

          {mode === 'template' && (
            <div className={s.fieldGroup}>
              <label className={s.fieldLabel}>템플릿 선택</label>
              <Select value={selectedTemplateSeq}
                onChange={(e) => setSelectedTemplateSeq(e.target.value ? Number(e.target.value) : '')}>
                <option value="">템플릿을 선택하세요</option>
                {templates.map(t => (
                  <option key={t.seq} value={t.seq}>{t.templateName}{t.isDefault ? ' (기본)' : ''}</option>
                ))}
              </Select>
            </div>
          )}

          <div className={s.fieldGroup}>
            <label className={s.fieldLabel}>발신번호</label>
            <Select value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)}>
              <option value="">발신번호를 선택하세요</option>
              {senderNumbers.map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
          </div>

          <div className={s.fieldGroupSm}>
            <label className={s.fieldLabel}>메시지 내용</label>
            <Textarea ref={textareaRef} value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="메시지 내용을 입력하세요..." rows={7}
              style={{ resize: 'vertical', lineHeight: 1.6 }} />
            <div className={s.charCount}>
              <span className={s.charCountValue}>{message.length}</span> / 2000자
            </div>
          </div>
        </div>

        <div className={s.footer}>
          <Button onClick={onClose} variant="secondary" style={{ padding: '0.6rem 1.5rem' }}>닫기</Button>
          <button onClick={handleSend} disabled={sending} className={s.sendBtn}>
            {sending ? '전송 중...' : '전송'}
          </button>
        </div>
      </div>
    </div>
  );
}