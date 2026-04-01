'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { branchApi, SessionRole, type Branch } from '@/lib/api';
import { useSessionStore } from '@/lib/store';

export default function BranchDetailPage() {
  const params = useParams();
  const seq = Number(params.seq);
  const session = useSessionStore((s) => s.session);
  const [branch, setBranch] = useState<Branch | null>(null);

  useEffect(() => {
    branchApi.get(seq).then(res => setBranch(res.data));
  }, [seq]);

  if (!branch) return null;

  return (
    <>
      {/* 액션 버튼 */}
      <div className="detail-actions">
        <Link href="/branches" className="btn-back">← 목록으로</Link>
        {SessionRole.isManager(session) && (
          <div className="action-group">
            <Link href={`/branches/${seq}/edit`} className="btn-primary" style={{
              padding: '0.75rem 1.5rem',
              borderRadius: 8,
              fontSize: '0.95rem',
              fontWeight: 500,
              color: 'white',
              textDecoration: 'none',
            }}>
              수정
            </Link>
          </div>
        )}
      </div>

      {/* 지점 상세 정보 */}
      <div className="content-card">
        <div className="detail-header">
          <h2>기본 정보</h2>
        </div>
        <div className="detail-body">
          <div className="detail-row">
            <div className="detail-label">지점명</div>
            <div className="detail-value"><strong>{branch.branchName}</strong></div>
          </div>
          <div className="detail-row">
            <div className="detail-label">영문코드</div>
            <div className="detail-value">{branch.alias}</div>
          </div>
          <div className="detail-row">
            <div className="detail-label">매니저</div>
            <div className="detail-value">{branch.branchManager ?? '-'}</div>
          </div>
          <div className="detail-row">
            <div className="detail-label">주소</div>
            <div className="detail-value">{branch.address ?? '-'}</div>
          </div>
          <div className="detail-row">
            <div className="detail-label">오시는 길</div>
            <div className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>
              {branch.directions ?? '-'}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
