'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ROUTES } from '@/lib/routes';

function SuccessContent() {
  const params = useSearchParams();
  const name = params.get('name') ?? '';
  const phone = params.get('phone') ?? '';
  const branchName = params.get('branchName') ?? '';
  const timeSlot = params.get('timeSlot') ?? '';
  const currentClass = params.get('currentClass') ?? '';
  const startDate = params.get('startDate') ?? '';
  const endDate = params.get('endDate') ?? '';
  const reason = params.get('reason') ?? '';

  return (
    <div style={{
      backgroundColor: '#f4f7f6', display: 'flex', justifyContent: 'center',
      alignItems: 'center', minHeight: '100dvh', padding: 20,
    }}>
      <div style={{
        background: 'white', padding: 40, borderRadius: 12,
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '100%', maxWidth: 500, textAlign: 'center',
      }}>
        <div style={{ fontSize: '4rem', marginBottom: 15 }}>&#x2705;</div>
        <div style={{ color: '#10b981', fontSize: '1.6rem', fontWeight: 800, marginBottom: 8 }}>
          연기 요청이 접수되었습니다
        </div>
        <div style={{ color: '#666', fontSize: '0.95rem', marginBottom: 30 }}>
          관리자 확인 후 결과를 안내드리겠습니다.
        </div>

        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginBottom: 25 }}>
          <tbody>
            <InfoRow label="이름" value={name} />
            <InfoRow label="연락처" value={phone} />
            <InfoRow label="참여 지점" value={branchName} />
            <InfoRow label="수업 시간대" value={timeSlot} />
            <InfoRow label="수강 수업" value={currentClass} />
            <InfoRow label="연기 기간" value={`${startDate} ~ ${endDate}`} />
            <InfoRow label="연기 사유" value={reason} />
            <tr>
              <th style={thStyle}>처리 상태</th>
              <td style={tdStyle}>
                <span style={{
                  display: 'inline-block', padding: '4px 12px', borderRadius: 20,
                  fontSize: '0.8rem', fontWeight: 700,
                  background: '#fff3cd', color: '#856404', border: '1px solid #ffc107',
                }}>대기</span>
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{
          background: '#f0fdf4', padding: 15, borderRadius: 6,
          borderLeft: '4px solid #10b981', marginTop: 20,
          fontSize: '0.85rem', color: '#166534', textAlign: 'left',
        }}>
          <strong>안내</strong>
          <ul style={{ margin: '5px 0 0 18px', padding: 0 }}>
            <li>승인 결과는 입력하신 연락처로 안내드립니다.</li>
            <li>문의사항은 참여 지점으로 연락해주세요.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <th style={thStyle}>{label}</th>
      <td style={tdStyle}>{value}</td>
    </tr>
  );
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px', background: '#f8f9fa', color: '#555',
  fontSize: '0.85rem', fontWeight: 600, borderBottom: '1px solid #eee',
  width: 110, whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px', color: '#333', fontSize: '0.9rem', borderBottom: '1px solid #eee',
};

export default function PostponementSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
