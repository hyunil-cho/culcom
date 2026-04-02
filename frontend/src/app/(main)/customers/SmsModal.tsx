'use client';

import { useEffect, useState, useRef } from 'react';
import { branchApi, messageTemplateApi, settingsApi, externalApi, MessageTemplateItem, PlaceholderItem, Branch } from '@/lib/api';
import { useSessionStore } from '@/lib/store';
import { resolvePlaceholders } from '@/lib/commonUtils';

interface SmsModalProps {
  customerName: string;
  customerPhone: string;
  interviewDate?: string;
  onClose: () => void;
  onResult: (success: boolean, message: string) => void;
}

export default function SmsModal({ customerName, customerPhone, interviewDate, onClose, onResult }: SmsModalProps) {
  const session = useSessionStore((s) => s.session);

  const [mode, setMode] = useState<'template' | 'direct'>('template');
  const [templates, setTemplates] = useState<MessageTemplateItem[]>([]);
  const [placeholders, setPlaceholders] = useState<PlaceholderItem[]>([]);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [senderNumbers, setSenderNumbers] = useState<string[]>([]);
  const [dataReady, setDataReady] = useState(false);

  const [selectedTemplateSeq, setSelectedTemplateSeq] = useState<number | ''>('');
  const [senderPhone, setSenderPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 모든 데이터를 한번에 로드
  useEffect(() => {
    const promises: Promise<void>[] = [
      messageTemplateApi.list().then((res) => {
        if (res.success) {
          setTemplates(res.data);
          const def = res.data.find(t => t.isDefault);
          if (def) setSelectedTemplateSeq(def.seq);
        }
      }),
      messageTemplateApi.placeholders().then((res) => {
        if (res.success) setPlaceholders(res.data);
      }),
      settingsApi.getSenderNumbers().then((res) => {
        if (res.success) {
          setSenderNumbers(res.data ?? []);
          if (res.data?.length > 0) setSenderPhone(res.data[0]);
        }
      }),
    ];

    if (session?.selectedBranchSeq) {
      promises.push(
        branchApi.get(session.selectedBranchSeq).then((res) => {
          if (res.success) setBranch(res.data);
        })
      );
    }

    Promise.all(promises).then(() => setDataReady(true));
  }, [session?.selectedBranchSeq]);

  // 데이터 준비 완료 후 또는 템플릿 변경 시 치환
  useEffect(() => {
    if (!dataReady || mode !== 'template' || !selectedTemplateSeq) return;
    const tmpl = templates.find(t => t.seq === selectedTemplateSeq);
    if (!tmpl?.messageContext) { setMessage(''); return; }

    const now = new Date();
    const values: Record<string, string> = {
      '{customer.name}': customerName,
      '{customer.phone_number}': customerPhone,
      '{branch.name}': branch?.branchName ?? '',
      '{branch.address}': branch?.address ?? '',
      '{branch.manager}': branch?.branchManager ?? '',
      '{branch.directions}': branch?.directions ?? '',
      '{system.current_date}': now.toISOString().split('T')[0],
      '{system.current_time}': now.toTimeString().slice(0, 5),
      '{system.current_datetime}': `${now.toISOString().split('T')[0]} ${now.toTimeString().slice(0, 5)}`,
      '{reservation.interview_date}': interviewDate ?? '',
      '{reservation.interview_datetime}': interviewDate ?? '',
    };
    setMessage(resolvePlaceholders(tmpl.messageContext, placeholders, values));
  }, [dataReady, selectedTemplateSeq, mode, templates, placeholders, branch, customerName, customerPhone, interviewDate]);

  const handleModeChange = (newMode: 'template' | 'direct') => {
    setMode(newMode);
    if (newMode === 'direct') {
      setMessage('');
      setSelectedTemplateSeq('');
    }
  };

  const handleSend = async () => {
    if (!message.trim()) { onResult(false, '메시지 내용을 입력해주세요.'); return; }
    if (!senderPhone) { onResult(false, '발신번호를 선택해주세요.'); return; }

    setSending(true);
    const res = await externalApi.sendSms({
      senderPhone,
      receiverPhone: customerPhone,
      message,
    });
    setSending(false);

    if (res.success && res.data?.success) {
      onResult(true, `메시지가 전송되었습니다. (${res.data.msgType})`);
    } else {
      onResult(false, res.data?.message || res.message || '메시지 전송에 실패했습니다.');
    }
  };``

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        display: 'flex', position: 'fixed', top: 0, left: 0,
        width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.5)', zIndex: 10000,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        background: 'white', borderRadius: 12,
        width: '90%', maxWidth: 560,
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
      }}>
        {/* 헤더 */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '2px solid #10b981' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#2c3e50' }}>메시지 전송</h3>
        </div>

        <div style={{ padding: '1.25rem 1.5rem' }}>
          {/* 수신자 정보 */}
          <div style={{
            background: '#f0f8ff', padding: '0.75rem', borderRadius: 8,
            marginBottom: '1rem', borderLeft: '4px solid #4a90e2',
            display: 'flex', gap: '2rem',
          }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: '#666', display: 'block', marginBottom: 2 }}>수신자</span>
              <span style={{ fontWeight: 600, fontSize: '1rem' }}>{customerName}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.85rem', color: '#666', display: 'block', marginBottom: 2 }}>전화번호</span>
              <span style={{ fontWeight: 600, fontSize: '1rem' }}>{customerPhone}</span>
            </div>
          </div>

          {/* 입력 방식 선택 */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            {(['template', 'direct'] as const).map(m => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                style={{
                  flex: 1, padding: '0.7rem', borderRadius: 8, cursor: 'pointer',
                  fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s',
                  border: `2px solid ${mode === m ? '#4a90e2' : '#ddd'}`,
                  background: mode === m ? '#4a90e2' : 'white',
                  color: mode === m ? 'white' : '#666',
                }}
              >
                {m === 'template' ? '템플릿 사용' : '직접입력'}
              </button>
            ))}
          </div>

          {/* 템플릿 선택 */}
          {mode === 'template' && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: '0.9rem' }}>템플릿 선택</label>
              <select
                value={selectedTemplateSeq}
                onChange={(e) => setSelectedTemplateSeq(e.target.value ? Number(e.target.value) : '')}
                className="form-input"
                style={{ width: '100%' }}
              >
                <option value="">템플릿을 선택하세요</option>
                {templates.map(t => (
                  <option key={t.seq} value={t.seq}>
                    {t.templateName}{t.isDefault ? ' (기본)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 발신번호 */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: '0.9rem' }}>발신번호</label>
            <select
              value={senderPhone}
              onChange={(e) => setSenderPhone(e.target.value)}
              className="form-input"
              style={{ width: '100%' }}
            >
              <option value="">발신번호를 선택하세요</option>
              {senderNumbers.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* 메시지 내용 */}
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: '0.9rem' }}>메시지 내용</label>
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="메시지 내용을 입력하세요..."
              className="form-input"
              rows={7}
              style={{ width: '100%', resize: 'vertical', lineHeight: 1.6 }}
            />
            <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#999', marginTop: 4 }}>
              <span style={{ fontWeight: 600, color: 'var(--primary, #667eea)' }}>{message.length}</span> / 2000자
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div style={{
          padding: '1rem 1.5rem', borderTop: '1px solid #e0e0e0',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '0.6rem 1.5rem' }}
          >
            닫기
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            style={{
              padding: '0.6rem 1.5rem', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.9rem',
              background: '#10b981', color: 'white',
              opacity: sending ? 0.6 : 1,
            }}
          >
            {sending ? '전송 중...' : '전송'}
          </button>
        </div>
      </div>
    </div>
  );
}
