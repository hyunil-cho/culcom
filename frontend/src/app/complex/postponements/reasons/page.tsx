'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { postponementApi, type PostponementReason } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import ResultModal from '@/components/ui/ResultModal';

export default function PostponementReasonsPage() {
  const [reasons, setReasons] = useState<PostponementReason[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [reasonText, setReasonText] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const load = () => {
    postponementApi.reasons().then(res => setReasons(res.data));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!reasonText.trim()) { alert('사유 텍스트를 입력하세요.'); return; }
    const res = await postponementApi.addReason(reasonText.trim());
    if (res.success) {
      setReasonText('');
      setShowForm(false);
      setResult({ success: true, message: '연기사유가 추가되었습니다.' });
    }
  };

  const handleDelete = async (seq: number) => {
    if (!confirm('이 사유를 삭제하시겠습니까?')) return;
    const res = await postponementApi.deleteReason(seq);
    if (res.success) {
      setResult({ success: true, message: '연기사유가 삭제되었습니다.' });
    }
  };

  return (
    <>
      <div className="detail-actions" style={{ marginBottom: '1rem' }}>
        <Link href={ROUTES.COMPLEX_POSTPONEMENTS} style={{ color: '#666', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← 연기 요청 현황으로
        </Link>
      </div>

      <div style={{
        background: '#fff', borderRadius: 10,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)', maxWidth: 720,
      }}>
        {/* 헤더 */}
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid #eee',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#333' }}>연기사유 관리</h2>
          <span style={{ fontSize: '0.82rem', color: '#888' }}>총 {reasons.length}개</span>
        </div>

        {/* 사유 목록 */}
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {reasons.length === 0 ? (
            <li style={{ textAlign: 'center', padding: '2.5rem', color: '#adb5bd', fontSize: '0.95rem' }}>
              등록된 연기사유가 없습니다.
            </li>
          ) : reasons.map((r, i) => (
            <li key={r.seq} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 1.5rem', borderBottom: '1px solid #f5f5f5', gap: 8,
            }}>
              <span style={{ color: '#adb5bd', fontSize: '0.82rem', width: 28, flexShrink: 0 }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: '0.95rem', color: '#333' }}>{r.reason}</span>
              <button
                onClick={() => handleDelete(r.seq)}
                style={{
                  background: 'none', border: '1px solid #ffa8a8', color: '#e03131',
                  padding: '3px 10px', borderRadius: 4, fontSize: '0.78rem',
                  fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                }}
              >삭제</button>
            </li>
          ))}
        </ul>

        {/* 추가 영역 */}
        {!showForm ? (
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #eee', background: '#fafafa' }}>
            <button
              onClick={() => setShowForm(true)}
              style={{
                width: '100%', padding: '0.6rem', background: 'white', color: '#4a90e2',
                border: '1.5px dashed #4a90e2', borderRadius: 7, fontSize: '0.9rem',
                fontWeight: 600, cursor: 'pointer',
              }}
            >+ 연기사유 추가</button>
          </div>
        ) : (
          <div style={{
            padding: '1.25rem 1.5rem', borderTop: '1px solid #eee',
            background: '#f8faf9', borderRadius: '0 0 10px 10px',
          }}>
            <div style={{ marginBottom: '0.9rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#333', marginBottom: '0.4rem' }}>
                사유 텍스트 <span style={{ color: '#e53e3e' }}>*</span>
              </label>
              <input
                type="text"
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder="예) 개인 사정 (출장/여행)"
                style={{
                  width: '100%', padding: '0.55rem 0.85rem',
                  border: '1.5px solid #ddd', borderRadius: 7,
                  fontSize: '0.92rem', boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowForm(false); setReasonText(''); }}
                style={{
                  padding: '0.5rem 1.1rem', background: 'white', color: '#666',
                  border: '1.5px solid #ddd', borderRadius: 7, fontSize: '0.88rem',
                  fontWeight: 600, cursor: 'pointer',
                }}
              >취소</button>
              <button
                onClick={handleAdd}
                style={{
                  padding: '0.5rem 1.25rem', background: '#4a90e2', color: 'white',
                  border: 'none', borderRadius: 7, fontSize: '0.88rem',
                  fontWeight: 700, cursor: 'pointer',
                }}
              >저장</button>
            </div>
          </div>
        )}
      </div>

      <div style={{
        marginTop: '1rem', maxWidth: 720, padding: '12px 16px',
        background: '#fff9db', borderLeft: '4px solid #fcc419', borderRadius: 6,
        fontSize: '0.83rem', color: '#856404', lineHeight: 1.6,
      }}>
        <strong>안내:</strong> 여기서 관리하는 사유 목록은 고객이 수업 연기 요청 시 선택할 수 있는 항목입니다.
        &quot;기타 (직접 입력)&quot; 옵션은 자동으로 포함됩니다.
      </div>

      {result && (
        <ResultModal
          success={result.success}
          message={result.message}
          onConfirm={() => { setResult(null); load(); }}
        />
      )}
    </>
  );
}
