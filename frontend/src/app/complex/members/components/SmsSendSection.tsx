'use client';

import { useEffect, useState } from 'react';
import { smsEventApi, externalApi } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { Select, Textarea } from '@/components/ui/FormInput';
import s from './LinkShared.module.css';

interface Props {
  receiverPhone: string;
  initialMessage: string;
}

export default function SmsSendSection({ receiverPhone, initialMessage }: Props) {
  const [showSms, setShowSms] = useState(false);
  const [senderPhone, setSenderPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; text: string } | null>(null);

  const { data: senderNumbers = [] } = useApiQuery<string[]>(
    ['senderNumbers'],
    () => smsEventApi.getSenderNumbers(),
    { enabled: showSms },
  );
  useEffect(() => {
    if (senderNumbers.length > 0 && !senderPhone) setSenderPhone(senderNumbers[0]);
  }, [senderNumbers, senderPhone]);

  useEffect(() => {
    if (showSms) setMessage(initialMessage);
  }, [showSms, initialMessage]);

  const handleSend = async () => {
    if (!message.trim() || !senderPhone) return;
    setSending(true);
    const res = await externalApi.sendSms({ senderPhone, receiverPhone, message });
    setSending(false);
    if (res.success && res.data?.success) {
      setSendResult({ success: true, text: `전송 완료 (${res.data.msgType})` });
    } else {
      setSendResult({ success: false, text: res.data?.message || '전송 실패' });
    }
  };

  if (!showSms) {
    return (
      <button onClick={() => setShowSms(true)} className={s.smsToggleBtn}>
        문자로 전송하기
      </button>
    );
  }

  return (
    <div className={s.smsSection}>
      <div className={s.smsDivider}>문자 전송</div>

      <div className={s.fieldGroup}>
        <label className={s.fieldLabel}>발신번호</label>
        <Select value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)}>
          <option value="">발신번호를 선택하세요</option>
          {senderNumbers.map((p) => <option key={p} value={p}>{p}</option>)}
        </Select>
      </div>

      <div className={s.fieldGroup}>
        <label className={s.fieldLabel}>메시지 내용</label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          style={{ resize: 'vertical', lineHeight: 1.6 }}
        />
        <div className={s.charCount}>{message.length} / 2000자</div>
      </div>

      {sendResult && (
        <div className={sendResult.success ? s.resultSuccess : s.resultError}>
          {sendResult.text}
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={sending || !senderPhone}
        className={s.sendBtn}
      >
        {sending ? '전송 중...' : '문자 전송'}
      </button>
    </div>
  );
}
