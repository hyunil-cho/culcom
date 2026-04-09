'use client';

import { useCallback, useEffect, useState } from 'react';
import { memberApi, membershipApi, type Membership, type MemberMembershipResponse } from '@/lib/api';
import type { MembershipStatus } from '@/lib/api/complex';
import { usePaymentOptions } from '@/lib/usePaymentOptions';
import FormField from '@/components/ui/FormField';
import { Select, CurrencyInput, Input } from '@/components/ui/FormInput';
import MembershipInfoModal from './components/MembershipInfoModal';
import { validateMembershipForm, type MembershipFormData } from './MemberForm';

function nowDateTimeLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

const EMPTY_FORM: MembershipFormData = {
  membershipSeq: '', startDate: '', expiryDate: '', price: '',
  paymentDate: nowDateTimeLocal(), depositAmount: '', paymentMethod: '',
  status: '활성',
};

interface UseMembershipOptions {
  /** 수정 모드일 때 회원 seq (기존 멤버십 자동 로드) */
  memberSeq?: number;
  isEdit?: boolean;
}

/**
 * 멤버십 관련 상태·UI·로직을 통합하는 훅.
 *
 * 반환값:
 * - form / setForm / enabled — 멤버십 폼 상태
 * - formSection — 회원 등록/수정 폼에 삽입할 멤버십 섹션 JSX
 * - openInfoModal / infoModal — 멤버십 정보 모달
 * - save(memberSeq) — 멤버십 저장 (생성 또는 수정)
 * - validate() — 폼 검증 (에러 메시지 또는 null)
 */
export function useMembership(options?: UseMembershipOptions) {
  const { memberSeq, isEdit } = options ?? {};
  const { methods: paymentMethods } = usePaymentOptions();

  // ── 멤버십 상품 목록 ──
  const [memberships, setMemberships] = useState<Membership[]>([]);
  useEffect(() => {
    membershipApi.list().then(res => { if (res.success) setMemberships(res.data); });
  }, []);

  // ── 폼 상태 ──
  const [form, setForm] = useState<MembershipFormData>(EMPTY_FORM);
  const [enabled, setEnabled] = useState(false);
  const [memberMembershipSeq, setMemberMembershipSeq] = useState<number | null>(null);

  // 수정 모드: 기존 멤버십 로드
  useEffect(() => {
    if (!memberSeq) return;
    memberApi.getMemberships(memberSeq).then(res => {
      if (res.success && res.data.length > 0) {
        const ms = res.data[0];
        setForm({
          membershipSeq: String(ms.membershipSeq),
          startDate: ms.startDate ?? '',
          expiryDate: ms.expiryDate ?? '',
          price: ms.price ?? '',
          paymentDate: ms.paymentDate ?? '',
          depositAmount: '',
          paymentMethod: ms.paymentMethod ?? '',
          status: ms.status ?? '활성',
        });
        setMemberMembershipSeq(ms.seq);
      }
    });
  }, [memberSeq]);

  // membershipSeq가 채워지면 토글 자동 ON
  useEffect(() => {
    if (form.membershipSeq) setEnabled(true);
  }, [form.membershipSeq]);

  // ── 토글 ──
  const toggle = useCallback((on: boolean) => {
    setEnabled(on);
    if (!on) setForm(prev => ({ ...prev, membershipSeq: '' }));
  }, []);

  // ── 멤버십 선택 시 만료일 자동 계산 ──
  const handleSelect = useCallback((membershipSeq: string) => {
    setForm(prev => {
      const updated = { ...prev, membershipSeq };
      if (membershipSeq) {
        const ms = memberships.find(m => m.seq === Number(membershipSeq));
        if (ms) {
          const d = new Date();
          d.setDate(d.getDate() + ms.duration);
          updated.expiryDate = d.toISOString().split('T')[0];
        }
      } else {
        updated.expiryDate = '';
      }
      return updated;
    });
  }, [memberships]);

  // ── 검증 ──
  const validate = useCallback((): string | null => {
    if (!form.membershipSeq) return null; // 토글 꺼진 상태 — 검증 불필요
    return validateMembershipForm(form, !!isEdit);
  }, [form, isEdit]);

  // ── 저장 ──
  const save = useCallback(async (targetMemberSeq: number) => {
    if (!form.membershipSeq) return;
    const msData = {
      membershipSeq: Number(form.membershipSeq),
      startDate: form.startDate || undefined,
      expiryDate: form.expiryDate || undefined,
      price: form.price || undefined,
      paymentDate: form.paymentDate || undefined,
      depositAmount: form.depositAmount || undefined,
      paymentMethod: (form.paymentMethod && form.paymentMethod !== '기타') ? form.paymentMethod : undefined,
      status: form.status,
    };
    if (memberMembershipSeq) {
      await memberApi.updateMembership(targetMemberSeq, memberMembershipSeq, msData);
    } else {
      await memberApi.assignMembership(targetMemberSeq, msData);
    }
  }, [form, memberMembershipSeq]);

  // ── 멤버십 정보 모달 ──
  const [infoModalState, setInfoModalState] = useState<{ seq: number; name: string } | null>(null);
  const openInfoModal = useCallback((seq: number, name: string) => setInfoModalState({ seq, name }), []);
  const infoModal = infoModalState ? (
    <MembershipInfoModal
      memberSeq={infoModalState.seq}
      memberName={infoModalState.name}
      onClose={() => setInfoModalState(null)}
    />
  ) : null;

  // ── 멤버십 상품 요약 카드 ──
  const selectedMs = form.membershipSeq ? memberships.find(m => m.seq === Number(form.membershipSeq)) : null;

  const productSummary = selectedMs ? (
    <div style={{
      margin: '0 0 1rem', padding: '0.9rem 1rem',
      background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: 8,
    }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4a90e2', marginBottom: 8 }}>
        멤버십 정보
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: '0.85rem', color: '#495057' }}>
        <div><strong>등급:</strong> {selectedMs.name}</div>
        <div><strong>상태:</strong> {(() => {
          const color = form.status === '환불' || form.status === '만료' ? '#dc2626'
            : form.status === '정지' ? '#b45309' : '#16a34a';
          return <span style={{ color, fontWeight: 700 }}>{form.status}</span>;
        })()}</div>
        <div><strong>기간:</strong> {selectedMs.duration}일</div>
        <div><strong>횟수:</strong> {selectedMs.count}회</div>
        <div><strong>기준 금액:</strong> {selectedMs.price.toLocaleString()}원</div>
        <div><strong>양도:</strong> <span style={{ color: selectedMs.transferable ? '#16a34a' : '#dc2626', fontWeight: 700 }}>{selectedMs.transferable ? '가능' : '불가'}</span></div>
      </div>
    </div>
  ) : null;

  // ── 폼 섹션 JSX ──
  const formSection = (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        margin: '0 0 1rem', paddingBottom: '0.5rem',
      }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: '#495057' }}>멤버십 할당</h3>
        <div
          onClick={() => { if (!(isEdit && memberMembershipSeq)) toggle(!enabled); }}
          title={isEdit && memberMembershipSeq
            ? '기존 멤버십은 토글할 수 없습니다.'
            : enabled ? '멤버십 할당을 끄면 입력한 내용이 무시됩니다.' : '클릭하여 멤버십을 할당합니다.'}
          style={{
            width: 44, height: 24, borderRadius: 12, position: 'relative',
            background: enabled ? '#4a90e2' : '#dee2e6',
            transition: 'background 0.2s',
            cursor: isEdit && memberMembershipSeq ? 'not-allowed' : 'pointer',
            opacity: isEdit && memberMembershipSeq ? 0.6 : 1,
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

      {!enabled && (
        <div style={{
          padding: '1rem', marginBottom: '1rem',
          background: '#f8f9fa', border: '1px dashed #dee2e6', borderRadius: 8,
          fontSize: '0.85rem', color: '#888', textAlign: 'center',
        }}>
          멤버십을 지금 할당하지 않습니다. 우측 토글을 켜서 할당할 수 있습니다.
        </div>
      )}

      {enabled && (
        <>
          <FormField label="등급 (멤버십)" required>
            <Select value={form.membershipSeq} required disabled={isEdit && !!memberMembershipSeq}
              onChange={(e) => handleSelect(e.target.value)}
              style={isEdit && memberMembershipSeq ? readOnlyStyle : undefined}>
              <option value="">-- 멤버십 선택 --</option>
              {memberships.map(ms => (
                <option key={ms.seq} value={ms.seq}>{ms.name} ({ms.duration}일)</option>
              ))}
            </Select>
          </FormField>
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
          {productSummary}
          <FormField label="만료일" hint="* 멤버십 선택 시 자동으로 기간이 산정됩니다.">
            <Input type="date" value={form.expiryDate} readOnly
              style={readOnlyStyle} />
          </FormField>
          <FormField label="금액" required={!isEdit}>
            {isEdit && memberMembershipSeq ? (
              <Input value={form.price ? `${Number(form.price.replace(/,/g, '')).toLocaleString()}원` : '-'} readOnly style={readOnlyStyle} />
            ) : (
              <CurrencyInput placeholder="예: 450,000" value={form.price} required
                onValueChange={(v) => setForm(prev => ({ ...prev, price: v }))} />
            )}
          </FormField>
          <FormField label="납부일" required={!isEdit}>
            {isEdit && memberMembershipSeq ? (
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
            {isEdit && memberMembershipSeq ? (
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
    </>
  );

  return {
    // 폼 상태
    form, setForm, enabled,
    // 폼 섹션 JSX
    formSection,
    // 멤버십 정보 모달
    openInfoModal, infoModal,
    // 저장 · 검증
    save, validate,
  };
}

const readOnlyStyle: React.CSSProperties = {
  backgroundColor: '#f8f9fa', cursor: 'not-allowed',
};
