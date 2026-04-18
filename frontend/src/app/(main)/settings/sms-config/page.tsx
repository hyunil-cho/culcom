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
  { type: '복귀안내', label: '복귀 안내', description: '연기 종료일 하루 전 오전 11시, 복귀 예정 회원에게 자동 발송합니다.', group: '복귀 안내' },
];

const GROUP_ORDER: string[] = ['예약 · 등록', '연기', '환불', '양도', '복귀 안내'];

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
  const [activeGroup, setActiveGroup] = useState<string>(GROUP_ORDER[0]);
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

  /** 그룹별로 설정 상태 통계 → 탭 배지 렌더링에 사용 */
  const groupStats = (group: string) => {
    const events = EVENT_TYPES.filter(e => e.group === group);
    const active = events.filter(e => configs[e.type]?.autoSend).length;
    return { total: events.length, active };
  };

  const activeEvents = EVENT_TYPES.filter(e => e.group === activeGroup);

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

      {/* 탭 바 */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid #e5e7eb',
        marginBottom: 20,
        overflowX: 'auto',
      }}>
        {GROUP_ORDER.map(group => {
          const stats = groupStats(group);
          const isActive = group === activeGroup;
          return (
            <button
              key={group}
              type="button"
              onClick={() => setActiveGroup(group)}
              style={{
                padding: '10px 18px',
                border: 'none',
                background: 'none',
                fontSize: '0.9rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#4a90e2' : '#6b7280',
                borderBottom: isActive ? '3px solid #4a90e2' : '3px solid transparent',
                marginBottom: -2,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
              }}
            >
              {group}
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '1px 7px',
                borderRadius: 10,
                background: stats.active === stats.total ? '#dcfce7' : stats.active > 0 ? '#fef3c7' : '#f3f4f6',
                color: stats.active === stats.total ? '#166534' : stats.active > 0 ? '#b45309' : '#6b7280',
              }}>
                {stats.active}/{stats.total}
              </span>
            </button>
          );
        })}
      </div>

      {/* 활성 탭의 이벤트 카드들 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {activeEvents.map(({ type, label, description }) => (
          <EventCard
            key={type}
            type={type}
            label={label}
            description={description}
            form={forms[type]}
            config={configs[type]}
            isSaving={savingType === type}
            justSaved={savedType === type}
            senderNumbers={senderNumbers}
            onFormChange={(patch) => updateForm(type, patch)}
            onSave={() => handleSave(type)}
          />
        ))}
      </div>
    </div>
  );
}

interface EventCardProps {
  type: SmsEventType;
  label: string;
  description: string;
  form: EventFormState;
  config: SmsEventConfig | null;
  isSaving: boolean;
  justSaved: boolean;
  senderNumbers: string[];
  onFormChange: (patch: Partial<EventFormState>) => void;
  onSave: () => void;
}

function EventCard({
  type, label, description, form, config, isSaving, justSaved, senderNumbers,
  onFormChange, onSave,
}: EventCardProps) {
  const { data: templates = [] } = useApiQuery<MessageTemplateSimple[]>(
    ['smsConfig', 'templates', type],
    () => smsEventApi.getTemplates(type),
  );

  return (
    <div className={s.eventCard}>
      <div className={s.eventCardHeader} style={{ cursor: 'default' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div>
            <span className={s.eventTitle}>{label}</span>
            <p style={{ fontSize: '0.82rem', color: '#999', margin: '4px 0 0' }}>{description}</p>
          </div>
        </div>
        <span className={`${s.eventBadge} ${config?.autoSend ? s.badgeActive : s.badgeInactive}`}>
          {config?.autoSend ? '활성' : config ? '비활성' : '미설정'}
        </span>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className={s.fieldGroup}>
          <label className={s.fieldLabel}>메시지 템플릿<span className={s.requiredMark}>*</span></label>
          <select className={s.selectInput} value={form.templateSeq}
            onChange={(e) => onFormChange({ templateSeq: e.target.value ? Number(e.target.value) : '' })}>
            <option value="">템플릿을 선택하세요</option>
            {templates.map((t) => <option key={t.seq} value={t.seq}>{t.templateName}</option>)}
          </select>
          {templates.length === 0 && (
            <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#b45309' }}>
              이 이벤트용으로 활성화된 템플릿이 없습니다. 템플릿 관리에서 먼저 생성해주세요.
            </div>
          )}
        </div>

        <div className={s.fieldGroup}>
          <label className={s.fieldLabel}>발신번호<span className={s.requiredMark}>*</span></label>
          <select className={s.selectInput} value={form.senderNumber}
            onChange={(e) => onFormChange({ senderNumber: e.target.value })}>
            <option value="">발신번호를 선택하세요</option>
            {senderNumbers.map((num) => <option key={num} value={num}>{num}</option>)}
          </select>
        </div>

        <div className={s.fieldGroup}>
          <Checkbox label="자동 발송 활성화" checked={form.autoSend}
            onChange={(e) => onFormChange({ autoSend: (e.target as HTMLInputElement).checked })} />
        </div>

        <div className={s.cardActions}>
          <Button disabled={isSaving} onClick={onSave}
            style={{ padding: '10px 24px', fontSize: 14 }}>
            {isSaving ? '저장 중...' : justSaved ? '저장 완료' : '저장'}
          </Button>
        </div>
      </div>
    </div>
  );
}
