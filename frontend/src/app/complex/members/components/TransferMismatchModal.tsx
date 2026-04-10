'use client';

import type { TransferRequestItem } from '@/lib/api/transfer';

interface Props {
  memberName: string;
  memberPhone: string;
  transfer: TransferRequestItem;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function TransferMismatchModal({
  memberName, memberPhone, transfer, onConfirm, onCancel,
}: Props) {
  const nameMatch = memberName.trim() === transfer.fromMemberName;
  const phoneMatch = memberPhone === transfer.fromMemberPhone;

  const diffStyle: React.CSSProperties = { color: '#e53e3e', fontWeight: 600 };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '28px',
        maxWidth: '440px',
        width: '90%',
        border: '2px solid #e53e3e',
      }}>
        <h3 style={{ color: '#e53e3e', margin: '0 0 16px', fontSize: '1.05rem' }}>
          회원 정보 불일치
        </h3>
        <div style={{ fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '20px' }}>
          <p style={{ margin: '0 0 12px' }}>
            등록하려는 회원 정보가 양도 요청의 회원 정보와 다릅니다.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}></th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>양도 회원</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>등록 회원</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '6px 8px', fontWeight: 600 }}>이름</td>
                <td style={{ padding: '6px 8px' }}>{transfer.fromMemberName}</td>
                <td style={{ padding: '6px 8px', ...(nameMatch ? {} : diffStyle) }}>
                  {memberName || '-'}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '6px 8px', fontWeight: 600 }}>전화번호</td>
                <td style={{ padding: '6px 8px' }}>{transfer.fromMemberPhone}</td>
                <td style={{ padding: '6px 8px', ...(phoneMatch ? {} : diffStyle) }}>
                  {memberPhone || '-'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '0.88rem', color: '#e53e3e', fontWeight: 600, margin: '0 0 20px' }}>
          그래도 진행하시겠습니까?
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel}
            style={{
              padding: '8px 20px', borderRadius: '6px',
              border: '1px solid #cbd5e0', backgroundColor: '#fff',
              cursor: 'pointer', fontSize: '0.88rem',
            }}>
            취소
          </button>
          <button onClick={onConfirm}
            style={{
              padding: '8px 20px', borderRadius: '6px',
              border: 'none', backgroundColor: '#e53e3e', color: '#fff',
              cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600,
            }}>
            진행
          </button>
        </div>
      </div>
    </div>
  );
}
