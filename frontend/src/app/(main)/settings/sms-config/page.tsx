'use client';

import { useEffect, useState } from 'react';
import { useApiQuery } from '@/hooks/useApiQuery';
import Link from 'next/link';
import { smsEventApi, type MessageTemplateSimple, type SmsEventConfig, type SmsEventType } from '@/lib/api';
import { Checkbox } from '@/components/ui/FormInput';
import { ROUTES } from '@/lib/routes';
import { Button } from '@/components/ui/Button';
import { useFormError } from '@/hooks/useFormError';
import FormErrorBanner from '@/components/ui/FormErrorBanner';
import Spinner from '@/components/ui/Spinner';
import s from './page.module.css';

interface EventDef {
  type: SmsEventType;
  label: string;
  description: string;
  group: string;
}

const EVENT_TYPES: EventDef[] = [
  { type: '예약확정', label: '예약 확정', description: '고객의 예약이 확정될 때 자동으로 문자를 발송합니다.', group: '예약 · 등록' },
  { type: '고객등록', label: '고객 등록', description: '새 고객이 등록될 때 자동으로 문자를 발송합니다.', group: '예약 · 등록' },
  { type: '회원등록', label: '회원 등록', description: '새 회원이 등록될 때 자동으로 문자를 발송합니다.', group: '예약 · 등록' },
  { type: '연기승인', label: '연기 승인', description: '연기 요청이 승인되었을 때 요청 회원에게 발송합니다.', group: '연기' },
  { type: '연기반려', label: '연기 반려', description: '연기 요청이 반려되었을 때 요청 회원에게 발송합니다.', group: '연기' },
  { type: '환불승인', label: '환불 승인', description: '환불 요청이 승인되었을 때 요청 회원에게 발송합니다.', group: '환불' },
  { type: '환불반려', label: '환불 반려', description: '환불 요청이 반려되었을 때 요청 회원에게 발송합니다.', group: '환불' },
  { type: '양도완료', label: '양도 완료', description: '양도가 완료되었을 때 양도자·양수자 양측에 발송합니다.', group: '양도' },
  { type: '양도거절', label: '양도 거절', description: '관리자가 양도를 거절했을 때 양도자에게 발송합니다.', group: '양도' },
];

const GROUP_ORDER = ['예약 · 등록', '연기', '환불', '양도'];

interface EventFormState {
  templateSeq: number | '';
  senderNumber: string;
  autoSend: boolean;
}

const emptyForm: EventFormState = { templateSeq: '', senderNumber: '', autoSend: false };

function initialMap<V>(value: () => V): Record<SmsEventType, V> {
  return EVENT_TYPES.reduce((acc, e) => { acc[e.type] = value(); return acc; }, {} as Record<SmsEventType, V>);
}

export default function SmsConfigPage() {
  const { data: templates = [] } = useApiQuery<MessageTemplateSimple[]>(
    ['smsConfig', 'templates'],
    () => smsEventApi.getTemplates(),
  );

  const { data: senderNumbers = [] } = useApiQuery<string[]>(
    ['smsConfig', 'senderNumbers'],
    () => smsEventApi.getSenderNumbers(),
  );

  const { data: configsList = [], isLoading: loading } = useApiQuery<SmsEventConfig[]>(
    ['smsConfig', 'configs'],
    () => smsEventApi.list(),
  );

  const [configs, setConfigs] = useState<Record<SmsEventType, SmsEventConfig | null>>(() => initialMap(() => null));
  const [forms, setForms] = useState<Record<SmsEventType, EventFormState>>(() => initialMap(() => ({ ...emptyForm })));
  const [formsInitialized, setFormsInitialized] = useState(false);
  const [savingType, setSavingType] = useState<SmsEventType | null>(null);
  const [savedType, setSavedType] = useState<SmsEventType | null>(null);
  const [expanded, setExpanded] = useState<Record<SmsEventType, boolean>>(() => initialMap(() => false));
  const { error: formError, setError, clear: clearError } = useFormError();

  useEffect(() => {
    if (configsList.length === 0 && formsInitialized) return;
    if (loading) return;
    const configMap = initialMap<SmsEventConfig | null>(() => null);
    const formMap = initialMap<EventFormState>(() => ({ ...emptyForm }));
    for (const c of configsList) {
      if (EVENT_TYPES.some(e => e.type === c.eventType)) {
        configMap[c.eventType] = c;
        formMap[c.eventType] = {
          templateSeq: c.templateSeq,
          senderNumber: c.senderNumber,
          autoSend: c.autoSend,
        };
      }
    }
    setConfigs(configMap);
    setForms(formMap);
    setFormsInitialized(true);
  }, [configsList, loading, formsInitialized]);

  const updateForm = (type: SmsEventType, patch: Partial<EventFormState>) => {
    setForms(prev => ({ ...prev, [type]: { ...prev[type], ...patch } }));
  };

  const handleSave = async (type: SmsEventType) => {
    const form = forms[type];
    if (form.templateSeq === '' || !form.senderNumber) {
      setError('템플릿과 발신번호를 모두 선택해주세요.');
      return;
    }
    clearError();
    setSavingType(type);
    const res = await smsEventApi.save({
      eventType: type,
      templateSeq: form.templateSeq as number,
      senderNumber: form.senderNumber,
      autoSend: form.autoSend,
    });
    if (res.success) {
      setConfigs(prev => ({ ...prev, [type]: res.data }));
      setSavedType(type);
      setTimeout(() => setSavedType(null), 2000);
    }
    setSavingType(null);
  };

  if (loading) return <Spinner />;

  return (
    <div className={s.container}>
      <div className={s.backRow}>
        <Link href={ROUTES.SETTINGS} className={s.backLink}>← 설정으로 돌아가기</Link>
      </div>

      <div className={s.headerSection}>
        <h1 className={s.title}>자동 문자 발송 설정</h1>
        <p className={s.desc}>각 이벤트 발생 시 자동으로 발송할 문자 메시지를 설정합니다</p>
      </div>

      <div className={s.infoBox}>
        <div className={s.infoTitle}>안내사항</div>
        <div className={s.infoDesc}>
          각 이벤트 유형별로 메시지 템플릿과 발신번호를 설정하고, 자동 발송을 활성화할 수 있습니다.
          템플릿에서 {'{{이름}}'}, {'{{전화번호}}'} 플레이스홀더를 사용하면 발송 시 자동으로 치환됩니다.
        </div>
      </div>

      <FormErrorBanner error={formError} />

      {GROUP_ORDER.map(group => {
        const events = EVENT_TYPES.filter(e => e.group === group);
        if (events.length === 0) return null;
        return (
          <div key={group} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#374151', margin: '0 0 10px', paddingBottom: 6, borderBottom: '2px solid #e5e7eb' }}>
              {group}
            </h2>
            {events.map(({ type, label, description }) => {
              const form = forms[type];
              const config = configs[type];
              const isSaving = savingType === type;
              const justSaved = savedType === type;
              const isOpen = expanded[type];

              return (
                <div key={type} className={s.eventCard}>
            <div className={s.eventCardHeader}
              onClick={() => setExpanded(prev => ({ ...prev, [type]: !prev[type] }))}
              style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={s.toggleIcon}>{isOpen ? '\u25BC' : '\u25B6'}</span>
                <div>
                  <span className={s.eventTitle}>{label}</span>
                  <p style={{ fontSize: '0.82rem', color: '#999', margin: '4px 0 0' }}>{description}</p>
                </div>
              </div>
              <span className={`${s.eventBadge} ${config?.autoSend ? s.badgeActive : s.badgeInactive}`}>
                {config?.autoSend ? '활성' : config ? '비활성' : '미설정'}
              </span>
            </div>

            {isOpen && (
              <div style={{ marginTop: 20 }}>
                <div className={s.fieldGroup}>
                  <label className={s.fieldLabel}>메시지 템플릿<span className={s.requiredMark}>*</span></label>
                  <select className={s.selectInput} value={form.templateSeq}
                    onChange={(e) => updateForm(type, { templateSeq: e.target.value ? Number(e.target.value) : '' })}>
                    <option value="">템플릿을 선택하세요</option>
                    {templates.map((t) => <option key={t.seq} value={t.seq}>{t.templateName}</option>)}
                  </select>
                </div>

                <div className={s.fieldGroup}>
                  <label className={s.fieldLabel}>발신번호<span className={s.requiredMark}>*</span></label>
                  <select className={s.selectInput} value={form.senderNumber}
                    onChange={(e) => updateForm(type, { senderNumber: e.target.value })}>
                    <option value="">발신번호를 선택하세요</option>
                    {senderNumbers.map((num) => <option key={num} value={num}>{num}</option>)}
                  </select>
                </div>

                <div className={s.fieldGroup}>
                  <Checkbox label="자동 발송 활성화" checked={form.autoSend}
                    onChange={(e) => updateForm(type, { autoSend: (e.target as HTMLInputElement).checked })} />
                </div>

                <div className={s.cardActions}>
                  <Button disabled={isSaving} onClick={() => handleSave(type)}
                    style={{ padding: '10px 24px', fontSize: 14 }}>
                    {isSaving ? '저장 중...' : justSaved ? '저장 완료' : '저장'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
