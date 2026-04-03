'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { surveyApi, SurveyTemplate } from '@/lib/api';
import { ROUTES } from '@/lib/routes';

export default function SurveyPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<SurveyTemplate[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await surveyApi.listTemplates();
    if (res.success) setTemplates(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!createName.trim()) return;
    const res = await surveyApi.createTemplate({ name: createName.trim(), description: createDesc.trim() || undefined });
    if (res.success) {
      setCreateName('');
      setCreateDesc('');
      setShowCreate(false);
      load();
    }
  };

  const handleStatusChange = async (seq: number, status: string) => {
    const res = await surveyApi.updateStatus(seq, status);
    if (res.success) load();
  };

  const handleCopy = async (seq: number) => {
    const res = await surveyApi.copyTemplate(seq);
    if (res.success) load();
  };

  const handleDelete = async (seq: number, name: string) => {
    if (!confirm(`"${name}" 설문지를 삭제하시겠습니까?\n포함된 모든 선택지와 설정이 함께 삭제됩니다.`)) return;
    const res = await surveyApi.deleteTemplate(seq);
    if (res.success) load();
  };

  const statusBadgeStyle = (status: string): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: 'inline-block', padding: '3px 12px', borderRadius: 20,
      fontSize: '0.75rem', fontWeight: 700,
    };
    if (status === '활성') return { ...base, background: '#d4edda', color: '#155724' };
    if (status === '비활성') return { ...base, background: '#f0f0f0', color: '#666' };
    return { ...base, background: '#fff3cd', color: '#856404' }; // 작성중
  };

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString('ko-KR');
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2 className="page-title" style={{ margin: 0 }}>설문지 관리</h2>
        <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>+ 새 설문지</button>
      </div>

      {showCreate && (
        <div className="card" style={{ borderColor: 'var(--primary)', marginBottom: '1.25rem', background: '#f8fafe' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 14, color: 'var(--primary)' }}>새 설문지 생성</div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
              설문지 이름 <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="text" value={createName} onChange={e => setCreateName(e.target.value)}
              placeholder="예: 2026년 4월 설문"
              style={{ width: '100%', padding: '0.55rem 0.85rem', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: '0.92rem' }}
              autoFocus
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
              설명 <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>(선택)</span>
            </label>
            <input
              type="text" value={createDesc} onChange={e => setCreateDesc(e.target.value)}
              placeholder="설문지에 대한 간단한 설명"
              style={{ width: '100%', padding: '0.55rem 0.85rem', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: '0.92rem' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => setShowCreate(false)}>취소</button>
            <button className="btn-primary" onClick={handleCreate}>생성</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>로딩 중...</div>
      ) : templates.length === 0 ? (
        <div className="card" style={{
          textAlign: 'center', padding: '3rem', color: '#aaa',
          border: '1.5px dashed var(--border)', background: 'var(--card-bg)',
        }}>
          설문지가 없습니다. 위의 &apos;+ 새 설문지&apos; 버튼으로 생성하세요.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {templates.map(t => (
            <div key={t.seq} className="card" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <a
                  onClick={() => router.push(ROUTES.COMPLEX_SURVEY_OPTIONS(t.seq))}
                  style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1a1a1a', cursor: 'pointer', textDecoration: 'none' }}
                >
                  {t.name}
                </a>
                <span style={statusBadgeStyle(t.status)}>{t.status}</span>
              </div>
              {t.description && (
                <div style={{ fontSize: '0.88rem', color: '#555', marginBottom: 14, lineHeight: 1.5 }}>
                  {t.description}
                </div>
              )}
              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.83rem', color: '#888', marginBottom: 12 }}>
                <span>선택지 {t.optionCount}개</span>
                <span>생성일 {formatDate(t.createdDate)}</span>
                {t.lastUpdateDate && <span>수정일 {formatDate(t.lastUpdateDate)}</span>}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn-primary" style={{ fontSize: '0.8rem', padding: '5px 14px' }}
                  onClick={() => router.push(ROUTES.COMPLEX_SURVEY_OPTIONS(t.seq))}>
                  선택지 편집
                </button>
                {t.status === '작성중' || t.status === '비활성' ? (
                  <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '5px 14px', background: '#2d7a4f', color: 'white', borderColor: '#2d7a4f' }}
                    onClick={() => handleStatusChange(t.seq, '활성')}>
                    활성화
                  </button>
                ) : (
                  <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '5px 14px' }}
                    onClick={() => handleStatusChange(t.seq, '비활성')}>
                    비활성화
                  </button>
                )}
                <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '5px 14px' }}
                  onClick={() => handleCopy(t.seq)}>
                  복제
                </button>
                <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '5px 14px', borderColor: '#ffa8a8', color: '#e03131' }}
                  onClick={() => handleDelete(t.seq, t.name)}>
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
