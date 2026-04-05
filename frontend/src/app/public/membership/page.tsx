'use client';

import { useState } from 'react';
import { publicMembershipApi, type MembershipCheckMember } from '@/lib/api';
import { Input, PhoneInput } from '@/components/ui/FormInput';

export default function PublicMembershipPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [member, setMember] = useState<MembershipCheckMember | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setError('');
    if (!name.trim() || !phone.trim()) { setError('이름과 연락처를 모두 입력해 주세요.'); return; }
    setLoading(true);
    const res = await publicMembershipApi.check(name.trim(), phone.trim());
    setLoading(false);
    if (res.success) {
      setMember(res.data.member);
      if (!res.data.member) setError('일치하는 회원 정보를 찾을 수 없습니다.');
    } else {
      setError(res.message || '조회에 실패했습니다.');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } };

  return (
    <div style={{ backgroundColor: '#f4f7f6', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100vh', padding: 20 }}>
      <div style={{ background: 'white', padding: 40, borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '100%', maxWidth: 580, marginTop: 30 }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <h1 style={{ color: '#4a90e2', fontSize: '1.8rem', marginBottom: 10 }}>멤버십 조회</h1>
          <p style={{ color: '#666', fontSize: '0.95rem' }}>이름과 연락처로 멤버십 현황을 확인합니다.</p>
        </div>

        {/* 검색 폼 */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>이름</label>
          <Input placeholder="성함을 입력하세요" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={handleKeyPress} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>연락처</label>
          <PhoneInput placeholder="01000000000" value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={handleKeyPress} />
        </div>
        <button onClick={handleSearch} disabled={loading}
          style={{ width: '100%', padding: 14, color: 'white', border: 'none', borderRadius: 6, fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', background: loading ? '#ccc' : '#4a90e2' }}>
          {loading ? '조회 중...' : '멤버십 조회'}
        </button>
        {error && <p style={{ color: '#dc2626', fontSize: '0.9rem', marginTop: 8 }}>{error}</p>}

        {/* 결과 */}
        {member && (
          <div style={{ marginTop: 30 }}>
            <div style={{ background: '#e0f2fe', border: '1.5px solid #93c5fd', borderRadius: 10, padding: 15, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 10px', color: '#1e40af', fontSize: '1rem' }}>회원 정보</h3>
              <InfoRow label="이름" value={member.name} />
              <InfoRow label="연락처" value={member.phoneNumber} />
              <InfoRow label="소속지점" value={member.branchName} />
              {member.level && <InfoRow label="레벨" value={member.level} />}
            </div>

            {member.memberships.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: '#999', border: '1px dashed #ddd', borderRadius: 8 }}>
                활성 멤버십이 없습니다.
              </div>
            ) : (
              member.memberships.map((ms, i) => {
                const remaining = ms.totalCount - ms.usedCount;
                const pctUsed = ms.totalCount > 0 ? Math.round(ms.usedCount / ms.totalCount * 100) : 0;
                return (
                  <div key={i} style={{ border: '1.5px solid #e0e7ff', borderRadius: 10, padding: 16, marginBottom: 12, background: '#fafaff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: '#4338ca' }}>{ms.membershipName}</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#16a34a', background: '#dcfce7', padding: '2px 10px', borderRadius: 12 }}>{ms.status}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.85rem' }}>
                      <div><span style={{ color: '#888' }}>기간</span><br /><strong>{ms.startDate} ~ {ms.expiryDate}</strong></div>
                      <div><span style={{ color: '#888' }}>수업 횟수</span><br /><strong style={{ color: '#4a90e2' }}>{ms.usedCount}회 사용 / {ms.totalCount}회 (잔여 {remaining}회)</strong></div>
                      <div><span style={{ color: '#888' }}>연기</span><br /><strong>{ms.postponeUsed}회 사용 / {ms.postponeTotal}회</strong></div>
                      <div><span style={{ color: '#888' }}>출석률</span><br /><strong style={{ color: ms.attendanceRate >= 80 ? '#16a34a' : ms.attendanceRate >= 50 ? '#d97706' : '#dc2626' }}>{ms.attendanceRate}%</strong> ({ms.presentCount}/{ms.totalAttendance})</div>
                    </div>
                    <div style={{ marginTop: 10, background: '#e5e7eb', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                      <div style={{ width: `${pctUsed}%`, height: '100%', background: '#6366f1', borderRadius: 6 }} />
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#888', marginTop: 4 }}>수업 진행률 {pctUsed}%</div>
                  </div>
                );
              })
            )}

            <button onClick={() => { setMember(undefined); setName(''); setPhone(''); }}
              style={{ width: '100%', padding: 10, background: 'none', border: '1px solid #ddd', borderRadius: 6, color: '#666', cursor: 'pointer', marginTop: 12 }}>
              다시 조회
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: '0.9rem' }}>
      <span style={{ color: '#555', fontWeight: 600, minWidth: 70 }}>{label}</span>
      <span style={{ color: '#333' }}>{value}</span>
    </div>
  );
}
