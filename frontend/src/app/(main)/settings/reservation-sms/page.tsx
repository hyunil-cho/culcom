'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  settingsApi,
  type MessageTemplateSimple,
  type ReservationSmsConfig,
} from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { useResultModal } from '@/hooks/useResultModal';
import { Button, LinkButton } from '@/components/ui/Button';

export default function ReservationSmsConfigPage() {
  const [templates, setTemplates] = useState<MessageTemplateSimple[]>([]);
  const [senderNumbers, setSenderNumbers] = useState<string[]>([]);
  const [config, setConfig] = useState<ReservationSmsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { run, showError, modal } = useResultModal({ redirectPath: ROUTES.SETTINGS });

  const [templateSeq, setTemplateSeq] = useState<number | ''>('');
  const [senderNumber, setSenderNumber] = useState('');
  const [autoSend, setAutoSend] = useState(false);

  useEffect(() => {
    Promise.all([
      settingsApi.getTemplates(),
      settingsApi.getSenderNumbers(),
      settingsApi.getReservationSmsConfig(),
    ]).then(([templatesRes, numbersRes, configRes]) => {
      setTemplates(templatesRes.data ?? []);
      setSenderNumbers(numbersRes.data ?? []);
      if (configRes.data) {
        setConfig(configRes.data);
        setTemplateSeq(configRes.data.templateSeq);
        setSenderNumber(configRes.data.senderNumber);
        setAutoSend(configRes.data.autoSend);
      }
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (templateSeq === '' || !senderNumber) {
      showError('필수 항목을 모두 입력해주세요.');
      return;
    }
    setSaving(true);
    await run(settingsApi.saveReservationSmsConfig({
      templateSeq: templateSeq as number,
      senderNumber,
      autoSend,
    }), '설정이 성공적으로 저장되었습니다.');
    setSaving(false);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>로딩 중...</div>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <Link
          href={ROUTES.SETTINGS}
          style={{
            fontSize: 14,
            color: '#666',
            textDecoration: 'none',
          }}
        >
          ← 설정으로 돌아가기
        </Link>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#333', marginBottom: 8 }}>
          예약 확정 시 문자 발송 설정
        </h1>
        <p style={{ fontSize: 14, color: '#666' }}>
          예약 확정 시 자동으로 발송되는 문자 메시지를 설정합니다
        </p>
      </div>

      <div
        style={{
          background: '#e3f2fd',
          borderLeft: '4px solid #2196f3',
          padding: 16,
          borderRadius: 4,
          marginBottom: 24,
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 14, color: '#1976d2', marginBottom: 8 }}>
          안내사항
        </div>
        <div style={{ fontSize: 13, color: '#0d47a1', lineHeight: 1.6 }}>
          이 설정을 활성화하면 고객의 예약이 확정될 때 자동으로 문자 메시지가 발송됩니다.
          발송되는 메시지는 선택한 템플릿의 내용을 사용하며, 고객 정보는 자동으로 치환됩니다.
        </div>
      </div>

      <div
        style={{
          background: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: 8,
          padding: 32,
        }}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontWeight: 500, color: '#333', marginBottom: 8, fontSize: 14 }}>
              메시지 템플릿<span style={{ color: '#dc3545', marginLeft: 4 }}>*</span>
            </label>
            <select
              value={templateSeq}
              onChange={(e) => setTemplateSeq(e.target.value ? Number(e.target.value) : '')}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: 6,
                fontSize: 14,
              }}
            >
              <option value="">템플릿을 선택하세요</option>
              {templates.map((t) => (
                <option key={t.seq} value={t.seq}>
                  {t.templateName}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontWeight: 500, color: '#333', marginBottom: 8, fontSize: 14 }}>
              발신번호<span style={{ color: '#dc3545', marginLeft: 4 }}>*</span>
            </label>
            <select
              value={senderNumber}
              onChange={(e) => setSenderNumber(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: 6,
                fontSize: 14,
              }}
            >
              <option value="">발신번호를 선택하세요</option>
              {senderNumbers.map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoSend}
                onChange={(e) => setAutoSend(e.target.checked)}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 14, color: '#333' }}>예약 확정 시 자동으로 문자 발송</span>
            </label>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              marginTop: 32,
              paddingTop: 24,
              borderTop: '1px solid #e0e0e0',
            }}
          >
            <Button
              type="submit"
              disabled={saving}
              style={{ padding: '12px 24px', fontSize: 14 }}
            >
              {saving ? '저장 중...' : '저장'}
            </Button>
            <LinkButton
              href={ROUTES.SETTINGS}
              variant="secondary"
              style={{ padding: '12px 24px', fontSize: 14 }}
            >
              취소
            </LinkButton>
          </div>
        </form>
      </div>

      {modal}
    </div>
  );
}