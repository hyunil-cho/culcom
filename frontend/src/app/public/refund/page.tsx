'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { publicRefundApi, type PublicMemberInfo, type PublicMembershipInfo } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { Input, PhoneInput, Select, Textarea } from '@/components/ui/FormInput';

export default function PublicRefundPage() {
  const router = useRouter();

  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [searchError, setSearchError] = useState('');

  const [member, setMember] = useState<PublicMemberInfo | null>(null);
  const [selectedMembershipSeq, setSelectedMembershipSeq] = useState<number | null>(null);

  const [reason, setReason] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const handleSearch = async () => {
    setSearchError('');
    if (!searchName.trim() || !searchPhone.trim()) { setSearchError('이름과 연락처를 모두 입력해 주세요.'); return; }
    const res = await publicRefundApi.searchMember(searchName.trim(), searchPhone.trim());
    if (!res.success || !res.data.members || res.data.members.length === 0) {
      setSearchError('일치하는 회원 정보를 찾을 수 없습니다.'); return;
    }
    setMember(res.data.members[0]);
    setSelectedMembershipSeq(null);
    setStep(2);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } };

  const selectedMembership = member?.memberships.find(ms => ms.seq === selectedMembershipSeq);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !selectedMembershipSeq || !selectedMembership) return;
    if (!reason.trim()) { alert('환불 사유를 입력해 주세요.'); return; }
    if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) { alert('환불 계좌 정보를 모두 입력해 주세요.'); return; }

    setSubmitting(true);
    const res = await publicRefundApi.submit({
      branchSeq: member.branchSeq, memberSeq: member.seq,
      memberMembershipSeq: selectedMembershipSeq,
      memberName: member.name, phoneNumber: member.phoneNumber,
      membershipName: selectedMembership.membershipName,
      price: '', reason: reason.trim(),
      bankName: bankName.trim(), accountNumber: accountNumber.trim(), accountHolder: accountHolder.trim(),
    });
    setSubmitting(false);
    if (res.success) {
      router.push(`${ROUTES.PUBLIC_REFUND_SUCCESS}?name=${encodeURIComponent(member.name)}`);
    }
  };

  return (
    <div style={{ backgroundColor: '#f4f7f6', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100vh', padding: 20 }}>
      <div style={{ background: 'white', padding: 40, borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '100%', maxWidth: 520, marginTop: 30 }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <h1 style={{ color: '#e03131', fontSize: '1.8rem', marginBottom: 10 }}>환불 요청</h1>
          <p style={{ color: '#666', fontSize: '0.95rem' }}>회원 정보를 확인한 후 환불 요청을 진행합니다.</p>
        </div>

        {step === 1 && (
          <div>
            <FormGroup label="이름">
              <Input placeholder="성함을 입력하세요" value={searchName}
                onChange={(e) => setSearchName(e.target.value)} onKeyDown={handleKeyPress} />
            </FormGroup>
            <FormGroup label="연락처">
              <PhoneInput placeholder="01000000000" value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)} onKeyDown={handleKeyPress} />
            </FormGroup>
            <button onClick={handleSearch} style={btnStyle('#e03131')}>회원 검색</button>
            {searchError && <p style={{ color: '#dc2626', fontSize: '0.9rem', marginTop: 8 }}>{searchError}</p>}
          </div>
        )}

        {step === 2 && member && (
          <div>
            <div style={{ background: '#fff5f5', border: '1.5px solid #ffa8a8', borderRadius: 10, padding: 15, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 10px', color: '#c92a2a', fontSize: '1rem' }}>회원 정보 확인</h3>
              <InfoRow label="이름" value={member.name} />
              <InfoRow label="연락처" value={member.phoneNumber} />
              <InfoRow label="소속지점" value={member.branchName} />
            </div>

            <FormGroup label="환불할 멤버십 선택">
              {member.memberships.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>활성 멤버십이 없습니다.</div>
              ) : member.memberships.map(ms => (
                <div key={ms.seq} onClick={() => setSelectedMembershipSeq(ms.seq)}
                  style={{
                    border: `1.5px solid ${selectedMembershipSeq === ms.seq ? '#e03131' : '#ddd'}`,
                    borderRadius: 8, padding: 12, marginBottom: 10, cursor: 'pointer',
                    background: selectedMembershipSeq === ms.seq ? '#fff5f5' : 'white', transition: 'all 0.2s',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{ms.membershipName}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#666', marginTop: 4 }}>
                    기간: {ms.startDate} ~ {ms.expiryDate} | 수업: {ms.usedCount}/{ms.totalCount}회 사용
                  </div>
                </div>
              ))}
            </FormGroup>

            {selectedMembershipSeq && (
              <form onSubmit={handleSubmit}>
                <FormGroup label="환불 사유">
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)}
                    placeholder="환불 사유를 입력해주세요." required style={{ minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }} />
                </FormGroup>
                <FormGroup label="환불 은행">
                  <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="예: 국민은행" required />
                </FormGroup>
                <FormGroup label="계좌번호">
                  <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="계좌번호 입력" required />
                </FormGroup>
                <FormGroup label="예금주">
                  <Input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="예금주명 입력" required />
                </FormGroup>
                <button type="submit" disabled={submitting} style={btnStyle(submitting ? '#ccc' : '#e03131')}>
                  {submitting ? '제출 중...' : '환불 요청 제출'}
                </button>
              </form>
            )}
            <button onClick={() => { setStep(1); setMember(null); }}
              style={{ width: '100%', padding: 10, background: 'none', border: '1px solid #ddd', borderRadius: 6, color: '#666', cursor: 'pointer', marginTop: 8 }}>
              다시 검색
            </button>
          </div>
        )}

        <div style={{ background: '#fff9db', padding: 15, borderRadius: 6, borderLeft: '4px solid #fcc419', marginTop: 25, fontSize: '0.85rem', color: '#856404' }}>
          <strong>안내사항</strong>
          <ul style={{ margin: '5px 0 0 18px', padding: 0 }}>
            <li>환불 요청은 관리자 확인 후 처리됩니다.</li>
            <li>환불 금액은 멤버십 이용 내역에 따라 결정됩니다.</li>
            <li>처리 결과는 입력하신 연락처로 안내드립니다.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>
        {label} <span style={{ color: '#e74c3c' }}>*</span>
      </label>
      {children}
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

function btnStyle(bg: string): React.CSSProperties {
  return { width: '100%', padding: 14, color: 'white', border: 'none', borderRadius: 6, fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', marginTop: 10, background: bg };
}
