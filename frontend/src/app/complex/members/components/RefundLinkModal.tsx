'use client';

import { useEffect, useState } from 'react';
import { settingsApi, externalApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { Select, Textarea } from '@/components/ui/FormInput';
import { Button } from '@/components/ui/Button';
import s from './RefundLinkModal.module.css';

interface Props {
  memberSeq: number;
  memberName: string;
  memberPhone: string;
  onClose: () => void;
}

export default function RefundLinkModal({ memberSeq, memberName, memberPhone, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [showSms, setShowSms] = useState(false);
  const [senderNumbers, setSenderNumbers] = useState<string[]>([]);
  const [senderPhone, setSenderPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; text: string } | null>(null);

  const payload = btoa(encodeURIComponent(JSON.stringify({ memberSeq, name: memberName, phone: memberPhone })));
  const refundUrl = `${window.location.origin}${ROUTES.PUBLIC_REFUND}?d=${payload}`;

  useEffect(() => {
    if (!showSms) return;
    settingsApi.getSenderNumbers().then(res => {
      if (res.success && res.data?.length > 0) {
        setSenderNumbers(res.data);
        setSenderPhone(res.data[0]);
      }
    });
  }, [showSms]);

  useEffect(() => {
    if (showSms) {
      setMessage(`[환불 요청 안내]\n\n${memberName}님, 아래 링크에서 환불 요청을 진행해주세요.\n\n${refundUrl}`);
    }
  }, [showSms, memberName, refundUrl]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(refundUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!message.trim() || !senderPhone) return;
    setSending(true);
    const res = await externalApi.sendSms({ senderPhone, receiverPhone: memberPhone, message });
    setSending(false);
    if (res.success && res.data?.success) {
      setSendResult({ success: true, text: `전송 완료 (${res.data.msgType})` });
    } else {
      setSendResult({ success: false, text: res.data?.message || '전송 실패' });
    }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal-content ${s.content}`}>
        <div className={s.header}>
          <h3 className={s.title}>환불 요청 링크</h3>
        </div>

        <div className={s.body}>
          <div className={s.recipientInfo}>
            <div>
              <span className={s.infoLabel}>회원</span>
              <span className={s.infoValue}>{memberName}</span>
            </div>
            <div>
              <span className={s.infoLabel}>연락처</span>
              <span className={s.infoValue}>{memberPhone}</span>
            </div>
          </div>

          <div className={s.fieldGroup}>
            <label className={s.fieldLabel}>환불 요청 URL</label>
            <div className={s.urlRow}>
              <input readOnly value={refundUrl} className={s.urlInput} onClick={e => (e.target as HTMLInputElement).select()} />
              <button onClick={handleCopy} className={s.copyBtn}>
                {copied ? '복사됨!' : '복사'}
              </button>
            </div>
            <p className={s.urlHint}>이 링크를 고객에게 전달하면, 환불 사유와 계좌 정보를 직접 입력할 수 있습니다.</p>
          </div>

          {!showSms ? (
            <button onClick={() => setShowSms(true)} className={s.smsToggleBtn}>
              문자로 전송하기
            </button>
          ) : (
            <div className={s.smsSection}>
              <div className={s.smsDivider}>문자 전송</div>

              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}>발신번호</label>
                <Select value={senderPhone} onChange={e => setSenderPhone(e.target.value)}>
                  <option value="">발신번호를 선택하세요</option>
                  {senderNumbers.map(p => <option key={p} value={p}>{p}</option>)}
                </Select>
              </div>

              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}>메시지 내용</label>
                <Textarea value={message} onChange={e => setMessage(e.target.value)}
                  rows={6} style={{ resize: 'vertical', lineHeight: 1.6 }} />
                <div className={s.charCount}>{message.length} / 2000자</div>
              </div>

              {sendResult && (
                <div className={sendResult.success ? s.resultSuccess : s.resultError}>
                  {sendResult.text}
                </div>
              )}

              <button onClick={handleSend} disabled={sending || !senderPhone}
                className={s.sendBtn}>
                {sending ? '전송 중...' : '문자 전송'}
              </button>
            </div>
          )}
        </div>

        <div className={s.footer}>
          <Button onClick={onClose} variant="secondary">닫기</Button>
        </div>
      </div>
    </div>
  );
}
