'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  publicPostponementApi,
  type PublicMemberInfo,
  type PublicMembershipInfo,
} from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { Input, PhoneInput, Select, Textarea } from '@/components/ui/FormInput';

export default function PublicPostponementPage() {
  const router = useRouter();

  // Step 1: 회원 검색
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [searchError, setSearchError] = useState('');

  // Step 2: 회원 확인 + 멤버십 선택
  const [member, setMember] = useState<PublicMemberInfo | null>(null);
  const [selectedMembershipSeq, setSelectedMembershipSeq] = useState<number | null>(null);

  // Step 3: 연기 상세
  const [currentClass, setCurrentClass] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reasonSelect, setReasonSelect] = useState('');
  const [reasonCustom, setReasonCustom] = useState('');
  const [reasons, setReasons] = useState<string[]>([]);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const handleSearch = async () => {
    setSearchError('');
    if (!searchName.trim() || !searchPhone.trim()) {
      setSearchError('이름과 연락처를 모두 입력해 주세요.');
      return;
    }
    const res = await publicPostponementApi.searchMember(searchName.trim(), searchPhone.trim());
    if (!res.success || !res.data.members || res.data.members.length === 0) {
      setSearchError('일치하는 회원 정보를 찾을 수 없습니다. 이름과 연락처를 다시 확인해 주세요.');
      return;
    }
    setMember(res.data.members[0]);
    setSelectedMembershipSeq(null);
    setStep(2);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSearch(); }
  };

  const goToStep3 = async () => {
    if (!member || !selectedMembershipSeq) return;
    // 사유 목록 로드
    const res = await publicPostponementApi.reasons(member.branchSeq);
    if (res.success) setReasons(res.data);
    setCurrentClass('');
    setTimeSlot('');
    setStartDate('');
    setEndDate('');
    setReasonSelect('');
    setReasonCustom('');
    setStep(3);
  };

  const handleClassChange = (className: string) => {
    setCurrentClass(className);
    const cls = member?.classes.find(c => c.name === className);
    if (cls) {
      setTimeSlot(`${cls.timeSlotName} (${cls.startTime} ~ ${cls.endTime})`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !selectedMembershipSeq) return;

    const reason = reasonSelect === '기타' ? reasonCustom.trim() : reasonSelect;
    if (!reason) { alert('연기 사유를 선택해 주세요.'); return; }

    setSubmitting(true);
    const res = await publicPostponementApi.submit({
      name: member.name,
      phone: member.phoneNumber,
      branchSeq: member.branchSeq,
      memberSeq: member.seq,
      memberMembershipSeq: selectedMembershipSeq,
      timeSlot,
      currentClass,
      startDate,
      endDate,
      reason,
    });
    setSubmitting(false);

    if (res.success) {
      const d = res.data;
      const params = new URLSearchParams({
        name: d.name, phone: d.phone, branchName: d.branchName,
        timeSlot: d.timeSlot, currentClass: d.currentClass,
        startDate: d.startDate, endDate: d.endDate, reason: d.reason,
      });
      router.push(`${ROUTES.PUBLIC_POSTPONEMENT_SUCCESS}?${params.toString()}`);
    }
  };

  const selectedMembership = member?.memberships.find(ms => ms.seq === selectedMembershipSeq);

  return (
    <div style={{
      backgroundColor: '#f4f7f6', display: 'flex', justifyContent: 'center',
      alignItems: 'flex-start', minHeight: '100vh', padding: 20,
    }}>
      <div style={{
        background: 'white', padding: 40, borderRadius: 12,
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '100%', maxWidth: 520, marginTop: 30,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <h1 style={{ color: '#4a90e2', fontSize: '1.8rem', marginBottom: 10 }}>수업 연기 요청</h1>
          <p style={{ color: '#666', fontSize: '0.95rem' }}>회원 정보를 확인한 후 연기 요청을 진행합니다.</p>
        </div>

        {/* STEP 1: 회원 검색 */}
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
            <button onClick={handleSearch} style={btnStyle('#10b981', '#059669')}>회원 검색</button>
            {searchError && <p style={{ color: '#dc2626', fontSize: '0.9rem', marginTop: 8 }}>{searchError}</p>}
          </div>
        )}

        {/* STEP 2: 회원 확인 + 멤버십 선택 */}
        {step === 2 && member && (
          <div>
            <MemberInfoCard member={member} />

            <FormGroup label="연기할 멤버십 선택">
              {member.memberships.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>활성 멤버십이 없습니다.</div>
              ) : member.memberships.map(ms => (
                <MembershipCard key={ms.seq} ms={ms}
                  selected={selectedMembershipSeq === ms.seq}
                  onSelect={() => {
                    if (ms.postponeTotal - ms.postponeUsed > 0) setSelectedMembershipSeq(ms.seq);
                  }}
                />
              ))}
            </FormGroup>

            <hr style={{ border: 'none', borderTop: '1px dashed #ddd', margin: '25px 0' }} />
            <button onClick={goToStep3} disabled={!selectedMembershipSeq}
              style={btnStyle('#4a90e2', '#357abd', !selectedMembershipSeq)}>
              다음: 연기 상세 입력
            </button>
            <button onClick={() => { setStep(1); setMember(null); }}
              style={secondaryBtnStyle}>다시 검색</button>
          </div>
        )}

        {/* STEP 3: 연기 상세 입력 */}
        {step === 3 && member && (
          <div>
            <div style={{
              background: '#e0f2fe', border: '1.5px solid #93c5fd', borderRadius: 10, padding: 15, marginBottom: 20,
            }}>
              <h3 style={{ margin: '0 0 8px', color: '#1e40af', fontSize: '1rem' }}>요청 요약</h3>
              <InfoRow label="회원" value={`${member.name} (${member.phoneNumber})`} />
              <InfoRow label="지점" value={member.branchName} />
              <InfoRow label="멤버십" value={selectedMembership?.membershipName ?? ''} />
            </div>

            <form onSubmit={handleSubmit}>
              <FormGroup label="수강 중인 수업">
                <Select value={currentClass} onChange={(e) => handleClassChange(e.target.value)} required>
                  <option value="">수업을 선택해 주세요</option>
                  {member.classes.map(c => (
                    <option key={c.name} value={c.name}>{c.name} [{c.timeSlotName}]</option>
                  ))}
                </Select>
              </FormGroup>

              <FormGroup label="연기 요청 기간">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Input type="date" value={startDate}
                    onChange={(e) => setStartDate(e.target.value)} required />
                  <span>~</span>
                  <Input type="date" value={endDate}
                    onChange={(e) => setEndDate(e.target.value)} required />
                </div>
              </FormGroup>

              <FormGroup label="연기 사유">
                <Select value={reasonSelect}
                  onChange={(e) => { setReasonSelect(e.target.value); setReasonCustom(''); }} required>
                  <option value="">사유를 선택해 주세요</option>
                  {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                  <option value="기타">기타 (직접 입력)</option>
                </Select>
                {reasonSelect === '기타' && (
                  <Textarea placeholder="연기 사유를 직접 입력해주세요."
                    value={reasonCustom} onChange={(e) => setReasonCustom(e.target.value)}
                    required style={{ marginTop: 10, minHeight: 90, resize: 'vertical', fontFamily: 'inherit' }} />
                )}
              </FormGroup>

              <button type="submit" disabled={submitting}
                style={btnStyle('#4a90e2', '#357abd', submitting)}>
                {submitting ? '제출 중...' : '요청 제출하기'}
              </button>
            </form>
            <button onClick={() => setStep(2)} style={secondaryBtnStyle}>멤버십 선택으로</button>
          </div>
        )}

        <div style={{
          background: '#fff9db', padding: 15, borderRadius: 6,
          borderLeft: '4px solid #fcc419', marginTop: 25, fontSize: '0.85rem', color: '#856404',
        }}>
          <strong>안내사항</strong>
          <ul style={{ margin: '5px 0 0 18px', padding: 0 }}>
            <li>연기 요청은 관리자 확인 후 승인됩니다.</li>
            <li>연기 가능 횟수 및 기간은 멤버십에 따릅니다.</li>
            <li>승인 결과는 입력하신 연락처로 안내드립니다.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── 하위 컴포넌트 ──

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

function MemberInfoCard({ member }: { member: PublicMemberInfo }) {
  return (
    <div style={{
      background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: 15, marginBottom: 20,
    }}>
      <h3 style={{ margin: '0 0 10px', color: '#166534', fontSize: '1rem' }}>회원 정보 확인</h3>
      <InfoRow label="이름" value={member.name} />
      <InfoRow label="연락처" value={member.phoneNumber} />
      <InfoRow label="소속지점" value={member.branchName} />
      {member.level && <InfoRow label="레벨" value={member.level} />}
    </div>
  );
}

function MembershipCard({ ms, selected, onSelect }: {
  ms: PublicMembershipInfo; selected: boolean; onSelect: () => void;
}) {
  const remaining = ms.postponeTotal - ms.postponeUsed;
  const canPostpone = remaining > 0;
  const badgeColor = remaining >= 2 ? { bg: '#dcfce7', color: '#166534' }
    : remaining === 1 ? { bg: '#fef9c3', color: '#854d0e' }
    : { bg: '#fee2e2', color: '#991b1b' };

  return (
    <div
      onClick={canPostpone ? onSelect : undefined}
      style={{
        border: `1.5px solid ${selected ? '#4a90e2' : '#ddd'}`,
        borderRadius: 8, padding: 12, marginBottom: 10,
        cursor: canPostpone ? 'pointer' : 'not-allowed',
        background: selected ? '#e0f2fe' : canPostpone ? 'white' : '#f9f9f9',
        opacity: canPostpone ? 1 : 0.5,
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, color: '#333', fontSize: '0.95rem' }}>{ms.membershipName}</span>
        <span style={{
          display: 'inline-block', padding: '2px 8px', borderRadius: 10,
          fontSize: '0.75rem', fontWeight: 600,
          background: badgeColor.bg, color: badgeColor.color,
        }}>
          연기 {remaining}/{ms.postponeTotal}회 남음
        </span>
      </div>
      <div style={{ fontSize: '0.82rem', color: '#666', marginTop: 4 }}>
        기간: {ms.startDate} ~ {ms.expiryDate} | 수업: {ms.usedCount}/{ms.totalCount}회 사용
        {!canPostpone && (
          <><br /><span style={{ color: '#dc2626', fontWeight: 600 }}>연기 가능 횟수를 모두 사용했습니다.</span></>
        )}
      </div>
    </div>
  );
}

// ── 스타일 헬퍼 ──

function btnStyle(bg: string, hover: string, disabled = false): React.CSSProperties {
  return {
    width: '100%', padding: 14, color: 'white', border: 'none', borderRadius: 6,
    fontSize: '1.1rem', fontWeight: 'bold', cursor: disabled ? 'not-allowed' : 'pointer',
    marginTop: 10, background: disabled ? '#ccc' : bg,
  };
}

const secondaryBtnStyle: React.CSSProperties = {
  width: '100%', padding: 10, background: 'none', border: '1px solid #ddd',
  borderRadius: 6, color: '#666', cursor: 'pointer', marginTop: 8,
};
