'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { Membership } from '@/lib/api';
import type { MembershipStatus } from '@/lib/api/complex';
import type { TransferRequestItem } from '@/lib/api/transfer';
import type { MembershipFormData } from '../MemberForm';
import FormField from '@/components/ui/FormField';
import { Select, CurrencyInput, Input } from '@/components/ui/FormInput';
import MembershipProductSummary from './MembershipProductSummary';

interface Props {
  form: MembershipFormData;
  setForm: Dispatch<SetStateAction<MembershipFormData>>;
  enabled: boolean;
  onToggle: () => void;
  toggleLocked: boolean;
  isEdit?: boolean;
  isExisting: boolean;
  memberships: Membership[];
  paymentMethods: { value: string; label: string }[];
  onSelect: (membershipSeq: string) => void;
  // 양도 관련
  transferMode?: boolean;
  onTransferModeChange?: (isTransfer: boolean) => void;
  transfers?: TransferRequestItem[];
  selectedTransfer?: TransferRequestItem | null;
  onSelectTransfer?: (transfer: TransferRequestItem) => void;
  /** 기본정보 탭에서 입력한 회원 이름 */
  memberName?: string;
  /** 기본정보 탭에서 입력한 회원 전화번호 */
  memberPhone?: string;
}

function nowDateTimeLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

const readOnlyStyle: React.CSSProperties = {
  backgroundColor: '#f8f9fa', cursor: 'not-allowed',
};

export default function MembershipFormSection({
  form, setForm, enabled, onToggle, toggleLocked,
  isEdit, isExisting, memberships, paymentMethods, onSelect,
  transferMode, onTransferModeChange,
  transfers, selectedTransfer, onSelectTransfer,
  memberName, memberPhone,
}: Props) {
  const locked = isEdit && isExisting;
  const selectedMs = form.membershipSeq
    ? memberships.find(m => m.seq === Number(form.membershipSeq))
    : null;

  // 양도 요청 필터 (확인/거절 제외, 입력된 이름/전화번호로 자동 필터)
  const filteredTransfers = (transfers ?? [])
    .filter(t => t.status === '생성' || t.status === '접수')
    .filter(t => {
      const name = (memberName ?? '').trim().toLowerCase();
      const phone = (memberPhone ?? '').trim();
      if (!name && !phone) return true;
      return (name && t.fromMemberName.toLowerCase().includes(name))
        || (phone && t.fromMemberPhone.includes(phone));
    });

  return (
    <>
      {/* 토글 헤더 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        margin: '0 0 1rem', paddingBottom: '0.5rem',
      }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: '#495057' }}>멤버십 할당</h3>
        <div
          onClick={() => { if (!toggleLocked) onToggle(); }}
          title={toggleLocked
            ? '기존 멤버십은 토글할 수 없습니다.'
            : enabled ? '멤버십 할당을 끄면 입력한 내용이 무시됩니다.' : '클릭하여 멤버십을 할당합니다.'}
          style={{
            width: 44, height: 24, borderRadius: 12, position: 'relative',
            background: enabled ? '#4a90e2' : '#dee2e6',
            transition: 'background 0.2s',
            cursor: toggleLocked ? 'not-allowed' : 'pointer',
            opacity: toggleLocked ? 0.6 : 1,
          }}
        >
          <div style={{
            width: 20, height: 20, borderRadius: '50%', background: '#fff',
            position: 'absolute', top: 2,
            left: enabled ? 22 : 2,
            transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </div>
      </div>

      {/* 토글 OFF 안내 */}
      {!enabled && (
        <div style={{
          padding: '1rem', marginBottom: '1rem',
          background: '#f8f9fa', border: '1px dashed #dee2e6', borderRadius: 8,
          fontSize: '0.85rem', color: '#888', textAlign: 'center',
        }}>
          멤버십을 지금 할당하지 않습니다. 우측 토글을 켜서 할당할 수 있습니다.
        </div>
      )}

      {/* 폼 필드 */}
      {enabled && (
        <>
          {/* 가입 유형 (신규/양도) - 신규 등록일 때만 */}
          {!locked && onTransferModeChange && (
            <FormField label="가입 유형">
              <Select value={transferMode ? '양도' : '신규'}
                onChange={(e) => onTransferModeChange(e.target.value === '양도')}>
                <option value="신규">신규</option>
                <option value="양도">양도</option>
              </Select>
            </FormField>
          )}

          {/* 양도 모드: 양도 요청 검색/선택 */}
          {transferMode && onSelectTransfer && (
            <>
              <FormField label="양도 요청 선택" required
                hint="기본정보에 입력한 이름/전화번호로 자동 검색됩니다.">
                {filteredTransfers.length > 0 ? (
                  <div style={{
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    marginTop: '8px',
                  }}>
                    {filteredTransfers.map(t => {
                      const isSelected = selectedTransfer?.seq === t.seq;
                      return (
                        <div key={t.seq}
                          onClick={() => onSelectTransfer(t)}
                          style={{
                            padding: '10px 14px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f0f0f0',
                            backgroundColor: isSelected ? '#eef2ff' : 'transparent',
                            display: 'flex', alignItems: 'center', gap: '10px',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8f9fa'; }}
                          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = ''; }}
                        >
                          <span style={{
                            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                            border: isSelected ? '2px solid #4a90e2' : '2px solid #ccc',
                            backgroundColor: isSelected ? '#4a90e2' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '12px', color: '#fff', transition: 'all 0.15s',
                          }}>
                            {isSelected && '✓'}
                          </span>
                          <div>
                            <span style={{ fontWeight: 600 }}>{t.fromMemberName}</span>
                            <span style={{ color: '#888', marginLeft: '8px', fontSize: '0.9em' }}>
                              {t.fromMemberPhone} · {t.membershipName} · 잔여 {t.remainingCount}회
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ color: '#888', marginTop: '8px', fontSize: '0.85rem' }}>
                    선택 가능한 양도 요청이 없습니다.
                  </p>
                )}
              </FormField>

              {/* 선택된 양도 정보 카드 */}
              {selectedTransfer && (
                <div style={{
                  backgroundColor: '#eef2ff',
                  border: '1px solid #c7d2fe',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px',
                }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', fontWeight: 600, color: '#495057' }}>
                    양도 멤버십 정보
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
                    <div><span style={{ color: '#888' }}>멤버십:</span> {selectedTransfer.membershipName}</div>
                    <div><span style={{ color: '#888' }}>양도자:</span> {selectedTransfer.fromMemberName}</div>
                    <div><span style={{ color: '#888' }}>연락처:</span> {selectedTransfer.fromMemberPhone}</div>
                    <div><span style={{ color: '#888' }}>잔여 횟수:</span> {selectedTransfer.remainingCount}회</div>
                    <div><span style={{ color: '#888' }}>만료일:</span> {selectedTransfer.expiryDate ?? '-'}</div>
                    <div>
                      <span style={{ color: '#888' }}>양수비:</span>{' '}
                      <span style={{ fontWeight: 700, color: '#4a90e2', fontSize: '1rem' }}>
                        {selectedTransfer.transferFee.toLocaleString()}원
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 멤버십 등급 선택 — 양도 모드에서는 카드에 표시되므로 숨김 */}
          {!transferMode && (
            <FormField label="등급 (멤버십)" required>
              <Select value={form.membershipSeq} required disabled={!!locked}
                onChange={(e) => onSelect(e.target.value)}
                style={locked ? readOnlyStyle : undefined}>
                <option value="">-- 멤버십 선택 --</option>
                {memberships.map(ms => (
                  <option key={ms.seq} value={ms.seq}>{ms.name} ({ms.duration}일)</option>
                ))}
              </Select>
            </FormField>
          )}

          <FormField label="멤버십 상태" required hint="* 환불/만료는 자동 전환됩니다 (여기서 직접 변경 불가).">
            <Select
              value={form.status} required
              disabled={form.status === '환불' || form.status === '만료'}
              onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value as MembershipStatus }))}
            >
              <option value="활성">활성</option>
              <option value="정지">정지</option>
              <option value="만료" disabled>만료</option>
              <option value="환불" disabled>환불</option>
            </Select>
          </FormField>

          {selectedMs && <MembershipProductSummary membership={selectedMs} status={form.status} />}

          {/* ── 신규 모드 필드 ── */}
          {!transferMode && (
            <>
              <FormField label="만료일" hint="* 멤버십 선택 시 자동으로 기간이 산정됩니다.">
                <Input type="date" value={form.expiryDate} readOnly style={readOnlyStyle} />
              </FormField>

              <FormField label="금액" required={!isEdit}>
                {locked ? (
                  <Input value={form.price ? `${Number(form.price.replace(/,/g, '')).toLocaleString()}원` : '-'} readOnly style={readOnlyStyle} />
                ) : (
                  <CurrencyInput placeholder="예: 450,000" value={form.price} required
                    onValueChange={(v) => setForm(prev => ({ ...prev, price: v }))} />
                )}
              </FormField>

              <FormField label="납부일" required={!isEdit}>
                {locked ? (
                  <Input value={form.paymentDate?.replace('T', ' ') ?? '-'} readOnly style={readOnlyStyle} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Input type="datetime-local" style={{ flex: 1 }} value={form.paymentDate} required
                      onChange={(e) => setForm(prev => ({ ...prev, paymentDate: e.target.value }))} />
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', fontSize: '0.85rem', color: '#555', cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!form.paymentDate}
                        onChange={(e) => {
                          if (e.target.checked) setForm(prev => ({ ...prev, paymentDate: nowDateTimeLocal() }));
                          else setForm(prev => ({ ...prev, paymentDate: '' }));
                        }} /> 현재시간
                    </label>
                  </div>
                )}
              </FormField>

              {!isEdit && (
                <FormField label="첫 납부 금액" required hint="* 등록 시 입력한 금액이 첫 납부 기록으로 자동 추가됩니다. 추가 납부는 미수금 관리에서 할 수 있습니다.">
                  <CurrencyInput placeholder="예: 100,000" value={form.depositAmount} required
                    onValueChange={(v) => setForm(prev => ({ ...prev, depositAmount: v }))} />
                </FormField>
              )}

              <FormField label="결제방법" required={!isEdit}>
                {locked ? (
                  <Input value={form.paymentMethod || '-'} readOnly style={readOnlyStyle} />
                ) : (
                  <Select value={form.paymentMethod ?? ''} required
                    onChange={(e) => setForm(prev => ({ ...prev, paymentMethod: e.target.value }))}>
                    <option value="">-- 선택 --</option>
                    {paymentMethods.map(pm => <option key={pm.value} value={pm.value}>{pm.label}</option>)}
                  </Select>
                )}
              </FormField>
            </>
          )}

          {/* ── 양도 모드 필드 ── */}
          {transferMode && selectedTransfer && (
            <>
              <FormField label="양수금 납부일" required>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Input type="datetime-local" style={{ flex: 1 }} value={form.paymentDate} required
                    onChange={(e) => setForm(prev => ({ ...prev, paymentDate: e.target.value }))} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', fontSize: '0.85rem', color: '#555', cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!form.paymentDate}
                      onChange={(e) => {
                        if (e.target.checked) setForm(prev => ({ ...prev, paymentDate: nowDateTimeLocal() }));
                        else setForm(prev => ({ ...prev, paymentDate: '' }));
                      }} /> 현재시간
                  </label>
                </div>
              </FormField>

              <FormField label="양수금 결제방법" required>
                <Select value={form.paymentMethod ?? ''} required
                  onChange={(e) => setForm(prev => ({ ...prev, paymentMethod: e.target.value }))}>
                  <option value="">-- 선택 --</option>
                  {paymentMethods.map(pm => <option key={pm.value} value={pm.value}>{pm.label}</option>)}
                </Select>
              </FormField>
            </>
          )}
        </>
      )}
    </>
  );
}
