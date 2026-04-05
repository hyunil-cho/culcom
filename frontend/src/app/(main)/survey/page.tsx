'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { surveyApi, SurveyTemplate } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { Button } from '@/components/ui/Button';
import styles from './page.module.css';

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

  const statusBadgeClass = (status: string) => {
    if (status === '활성') return styles.badgeActive;
    if (status === '비활성') return styles.badgeInactive;
    return styles.badgeDraft;
  };

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString('ko-KR');
  };

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title" style={{ margin: 0 }}>설문지 관리</h2>
        <Button onClick={() => setShowCreate(!showCreate)}>+ 새 설문지</Button>
      </div>

      {showCreate && (
        <div className={`card ${styles.createCard}`}>
          <div className={styles.createTitle}>새 설문지 생성</div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              설문지 이름 <span className={styles.requiredMark}>*</span>
            </label>
            <input type="text" value={createName} onChange={e => setCreateName(e.target.value)}
              placeholder="예: 2026년 4월 설문" className={styles.textInput} autoFocus />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              설명 <span className={styles.optionalMark}>(선택)</span>
            </label>
            <input type="text" value={createDesc} onChange={e => setCreateDesc(e.target.value)}
              placeholder="설문지에 대한 간단한 설명" className={styles.textInput} />
          </div>
          <div className={styles.createActions}>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>취소</Button>
            <Button onClick={handleCreate}>생성</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className={`card ${styles.loadingCard}`}>로딩 중...</div>
      ) : templates.length === 0 ? (
        <div className={`card ${styles.emptyCard}`}>
          설문지가 없습니다. 위의 &apos;+ 새 설문지&apos; 버튼으로 생성하세요.
        </div>
      ) : (
        <div className={styles.templateList}>
          {templates.map(t => (
            <div key={t.seq} className={`card ${styles.templateCard}`}>
              <div className={styles.templateHeader}>
                <a onClick={() => router.push(ROUTES.SURVEY_OPTIONS(t.seq))} className={styles.templateName}>
                  {t.name}
                </a>
                <span className={statusBadgeClass(t.status)}>{t.status}</span>
              </div>
              {t.description && (
                <div className={styles.templateDesc}>{t.description}</div>
              )}
              <div className={styles.templateMeta}>
                <span>선택지 {t.optionCount}개</span>
                <span>생성일 {formatDate(t.createdDate)}</span>
                {t.lastUpdateDate && <span>수정일 {formatDate(t.lastUpdateDate)}</span>}
              </div>
              <div className={styles.templateActions}>
                <Button className={styles.smallBtn} onClick={() => router.push(ROUTES.SURVEY_OPTIONS(t.seq))}>
                  선택지 편집
                </Button>
                {t.status === '작성중' || t.status === '비활성' ? (
                  <Button variant="secondary" className={styles.activateBtn}
                    onClick={() => handleStatusChange(t.seq, '활성')}>
                    활성화
                  </Button>
                ) : (
                  <Button variant="secondary" className={styles.smallBtn}
                    onClick={() => handleStatusChange(t.seq, '비활성')}>
                    비활성화
                  </Button>
                )}
                <Button variant="secondary" className={styles.smallBtn} onClick={() => handleCopy(t.seq)}>
                  복제
                </Button>
                <Button variant="secondary" className={styles.deleteBtn} onClick={() => handleDelete(t.seq, t.name)}>
                  삭제
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}