'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { integrationApi, SmsConfig } from '@/lib/api';
import ResultModal from '@/components/ui/ResultModal';

export default function SmsConfigPage() {
  const router = useRouter();
  const [config, setConfig] = useState<SmsConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const [accountId, setAccountId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [senderPhone, setSenderPhone] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const [result, setResult] = useState<{ success: boolean; message: string; redirect?: boolean } | null>(null);

  useEffect(() => {
    integrationApi.getSmsConfig().then((res) => {
      if (res.success && res.data) {
        setConfig(res.data);
        setAccountId(res.data.accountId ?? '');
        setSenderPhone(res.data.senderPhones?.[0] ?? '');
        setActive(res.data.active);
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (!accountId.trim() || !password.trim() || !senderPhone.trim()) {
      setResult({ success: false, message: '모든 필수 항목을 입력해주세요.' });
      return;
    }
    if (!config?.serviceId) {
      setResult({ success: false, message: 'SMS 서비스 정보를 찾을 수 없습니다.' });
      return;
    }

    setSaving(true);
    const res = await integrationApi.saveSmsConfig({
      serviceId: config.serviceId,
      accountId: accountId.trim(),
      password: password.trim(),
      senderPhone: senderPhone.trim(),
      active,
    });
    setSaving(false);

    setResult({
      success: res.success,
      message: res.success ? 'SMS 설정이 저장되었습니다.' : (res.message ?? '저장에 실패했습니다.'),
      redirect: res.success,
    });
  };

  if (loading) {
    return (
      <>
        <h2 className="page-title">SMS 연동 설정</h2>
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>로딩 중...</div>
      </>
    );
  }

  return (
    <>
      <h2 className="page-title">SMS 연동 설정</h2>

      <button
        onClick={() => router.push('/integrations')}
        style={{
          padding: '8px 16px', borderRadius: 6, border: '1px solid #ddd',
          background: 'white', cursor: 'pointer', marginBottom: 20, fontSize: 14,
        }}
      >
        &larr; 연동 관리로 돌아가기
      </button>

      {/* 서비스 헤더 카드 */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white', padding: 24, marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 48 }}>💬</div>
          <div>
            <h3 style={{ margin: 0, fontSize: 20 }}>{config?.serviceName ?? 'SMS 서비스'}</h3>
            <span style={{
              display: 'inline-block', marginTop: 8, padding: '4px 12px',
              borderRadius: 12, fontSize: 12, fontWeight: 500,
              background: config?.active ? 'rgba(76,175,80,0.3)' : 'rgba(255,255,255,0.2)',
              color: 'white',
            }}>
              {config?.active ? '연동 중' : '비활성'}
            </span>
          </div>
        </div>
      </div>

      {/* 안내 박스 */}
      <div className="card" style={{
        background: '#e3f2fd', borderLeft: '4px solid #2196f3',
        padding: 16, marginBottom: 24,
      }}>
        <p style={{ margin: 0, fontSize: 14, color: '#1565c0' }}>
          마이문자 서비스의 계정 정보를 입력하세요. 계정 ID, API 비밀번호, 발신번호가 필요합니다.
        </p>
      </div>

      {/* 설정 폼 */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
            계정 ID (사용자명) <span style={{ color: '#f44336' }}>*</span>
          </label>
          <input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="마이문자 계정 ID"
            style={{
              width: '100%', padding: '10px 12px', border: '1px solid #ddd',
              borderRadius: 6, fontSize: 14, boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
            비밀번호 (API Key) <span style={{ color: '#f44336' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="API 비밀번호"
              style={{
                width: '100%', padding: '10px 12px', paddingRight: 80,
                border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#666',
              }}
            >
              {showPassword ? '숨기기' : '보기'}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
            발신번호 <span style={{ color: '#f44336' }}>*</span>
          </label>
          <input
            type="text"
            value={senderPhone}
            onChange={(e) => setSenderPhone(e.target.value)}
            placeholder="예: 01012345678"
            style={{
              width: '100%', padding: '10px 12px', border: '1px solid #ddd',
              borderRadius: 6, fontSize: 14, boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            <span style={{ fontWeight: 600, fontSize: 14 }}>활성화</span>
          </label>
        </div>

        {config?.updatedAt && (
          <div style={{ marginBottom: 16, fontSize: 13, color: '#999' }}>
            마지막 수정: {config.updatedAt}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '12px 32px', borderRadius: 6, fontSize: 14, fontWeight: 600,
              background: '#2196f3', color: 'white', border: 'none', cursor: 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? '저장 중...' : '설정 저장'}
          </button>
          <button
            onClick={() => router.push('/integrations')}
            style={{
              padding: '12px 32px', borderRadius: 6, fontSize: 14,
              background: 'white', color: '#666', border: '1px solid #ddd', cursor: 'pointer',
            }}
          >
            취소
          </button>
        </div>
      </div>

      {result && (
        <ResultModal
          success={result.success}
          message={result.message}
          {...(result.redirect
            ? { redirectPath: '/integrations' }
            : { onConfirm: () => setResult(null) })}
        />
      )}
    </>
  );
}
