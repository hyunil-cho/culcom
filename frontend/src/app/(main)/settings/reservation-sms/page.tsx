'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { settingsApi, type MessageTemplateSimple, type ReservationSmsConfig } from '@/lib/api';
import { Checkbox } from '@/components/ui/FormInput';
import { ROUTES } from '@/lib/routes';
import { useResultModal } from '@/hooks/useResultModal';
import { Button, LinkButton } from '@/components/ui/Button';
import s from './page.module.css';

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
      settingsApi.getTemplates(), settingsApi.getSenderNumbers(), settingsApi.getReservationSmsConfig(),
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
    if (templateSeq === '' || !senderNumber) { showError('필수 항목을 모두 입력해주세요.'); return; }
    setSaving(true);
    await run(settingsApi.saveReservationSmsConfig({ templateSeq: templateSeq as number, senderNumber, autoSend }), '설정이 성공적으로 저장되었습니다.');
    setSaving(false);
  };

  if (loading) return <div className={s.loading}>로딩 중...</div>;

  return (
    <div className={s.container}>
      <div className={s.backRow}>
        <Link href={ROUTES.SETTINGS} className={s.backLink}>← 설정으로 돌아가기</Link>
      </div>

      <div className={s.headerSection}>
        <h1 className={s.title}>예약 확정 시 문자 발송 설정</h1>
        <p className={s.desc}>예약 확정 시 자동으로 발송되는 문자 메시지를 설정합니다</p>
      </div>

      <div className={s.infoBox}>
        <div className={s.infoTitle}>안내사항</div>
        <div className={s.infoDesc}>
          이 설정을 활성화하면 고객의 예약이 확정될 때 자동으로 문자 메시지가 발송됩니다.
          발송되는 메시지는 선택한 템플릿의 내용을 사용하며, 고객 정보는 자동으로 치환됩니다.
        </div>
      </div>

      <div className={s.formCard}>
        <form onSubmit={handleSubmit}>
          <div className={s.fieldGroup}>
            <label className={s.fieldLabel}>메시지 템플릿<span className={s.requiredMark}>*</span></label>
            <select value={templateSeq} onChange={(e) => setTemplateSeq(e.target.value ? Number(e.target.value) : '')}
              required className={s.selectInput}>
              <option value="">템플릿을 선택하세요</option>
              {templates.map((t) => <option key={t.seq} value={t.seq}>{t.templateName}</option>)}
            </select>
          </div>

          <div className={s.fieldGroup}>
            <label className={s.fieldLabel}>발신번호<span className={s.requiredMark}>*</span></label>
            <select value={senderNumber} onChange={(e) => setSenderNumber(e.target.value)}
              required className={s.selectInput}>
              <option value="">발신번호를 선택하세요</option>
              {senderNumbers.map((num) => <option key={num} value={num}>{num}</option>)}
            </select>
          </div>

          <div className={s.fieldGroup}>
            <Checkbox label="예약 확정 시 자동으로 문자 발송" checked={autoSend}
              onChange={(e) => setAutoSend((e.target as HTMLInputElement).checked)} />
          </div>

          <div className={s.formActions}>
            <Button type="submit" disabled={saving} style={{ padding: '12px 24px', fontSize: 14 }}>
              {saving ? '저장 중...' : '저장'}
            </Button>
            <LinkButton href={ROUTES.SETTINGS} variant="secondary" style={{ padding: '12px 24px', fontSize: 14 }}>
              취소
            </LinkButton>
          </div>
        </form>
      </div>

      {modal}
    </div>
  );
}
