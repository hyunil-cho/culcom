'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { integrationApi, SmsConfig } from '@/lib/api';
import { Checkbox } from '@/components/ui/FormInput';
import { ROUTES } from '@/lib/routes';
import { useResultModal } from '@/hooks/useResultModal';
import s from './page.module.css';

export default function SmsConfigPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceId = searchParams.get('serviceId');
  const [config, setConfig] = useState<SmsConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const [accountId, setAccountId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [senderPhone, setSenderPhone] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const { run, showError, modal } = useResultModal({ redirectPath: ROUTES.INTEGRATIONS });

  useEffect(() => {
    if (!serviceId) { router.replace(ROUTES.INTEGRATIONS); return; }
    integrationApi.getSmsConfig().then((res) => {
      if (res.success && res.data) {
        setConfig(res.data);
        setAccountId(res.data.accountId ?? '');
        setPassword(res.data.password ?? '');
        setSenderPhone(res.data.senderPhones?.[0] ?? '');
        setActive(res.data.active);
      } else {
        setConfig({ serviceId: Number(serviceId), serviceName: 'SMS 서비스', accountId: null, password: null, senderPhones: [], active: true, updatedAt: null });
      }
      setLoading(false);
    });
  }, [serviceId]);

  const handleSave = async () => {
    if (!accountId.trim() || !password.trim() || !senderPhone.trim()) { showError('모든 필수 항목을 입력해주세요.'); return; }
    if (!config?.serviceId) { showError('SMS 서비스 정보를 찾을 수 없습니다.'); return; }
    setSaving(true);
    await run(integrationApi.saveSmsConfig({ serviceId: config.serviceId, accountId: accountId.trim(), password: password.trim(), senderPhone: senderPhone.trim(), active }), 'SMS 설정이 저장되었습니다.');
    setSaving(false);
  };

  if (loading) {
    return (
      <>
        <h2 className="page-title">SMS 연동 설정</h2>
        <div className={s.loading}>로딩 중...</div>
      </>
    );
  }

  return (
    <>
      <h2 className="page-title">SMS 연동 설정</h2>

      <button onClick={() => router.push(ROUTES.INTEGRATIONS)} className={s.backBtn}>
        &larr; 연동 관리로 돌아가기
      </button>

      <div className={`card ${s.heroCard}`}>
        <div className={s.heroInner}>
          <div className={s.heroIcon}>💬</div>
          <div>
            <h3 className={s.heroTitle}>{config?.serviceName ?? 'SMS 서비스'}</h3>
            <span className={config?.active ? s.heroBadgeActive : s.heroBadgeInactive}>
              {config?.active ? '연동 중' : '비활성'}
            </span>
          </div>
        </div>
      </div>

      <div className={`card ${s.infoBox}`}>
        <p className={s.infoText}>
          마이문자 서비스의 계정 정보를 입력하세요. 계정 ID, API 비밀번호, 발신번호가 필요합니다.
        </p>
      </div>

      <div className={`card ${s.formCard}`}>
        <div className={s.fieldGroup}>
          <label className={s.fieldLabel}>계정 ID (사용자명) <span className={s.requiredMark}>*</span></label>
          <input type="text" value={accountId} onChange={(e) => setAccountId(e.target.value)}
            placeholder="마이문자 계정 ID" className={s.textInput} />
        </div>

        <div className={s.fieldGroup}>
          <label className={s.fieldLabel}>비밀번호 (API Key) <span className={s.requiredMark}>*</span></label>
          <div className={s.passwordWrap}>
            <input type={showPassword ? 'text' : 'password'} value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="API 비밀번호"
              className={s.passwordInput} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className={s.togglePasswordBtn}>
              {showPassword ? '숨기기' : '보기'}
            </button>
          </div>
        </div>

        <div className={s.fieldGroup}>
          <label className={s.fieldLabel}>발신번호 <span className={s.requiredMark}>*</span></label>
          <input type="text" value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)}
            placeholder="예: 01012345678" className={s.textInput} />
        </div>

        <div className={s.fieldGroupLg}>
          <Checkbox label="활성화" checked={active}
            onChange={(e) => setActive((e.target as HTMLInputElement).checked)} />
        </div>

        {config?.updatedAt && <div className={s.lastModified}>마지막 수정: {config.updatedAt}</div>}

        <div className={s.actions}>
          <button onClick={handleSave} disabled={saving} className={s.saveBtn}>
            {saving ? '저장 중...' : '설정 저장'}
          </button>
          <button onClick={() => router.push(ROUTES.INTEGRATIONS)} className={s.cancelBtn}>취소</button>
        </div>
      </div>

      {modal}
    </>
  );
}
