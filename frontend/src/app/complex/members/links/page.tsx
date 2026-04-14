'use client';

import { useMemo, useState } from 'react';
import { memberApi, type ComplexMember } from '@/lib/api';
import type { PageResponse } from '@/lib/api/client';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useModal } from '@/hooks/useModal';
import MembershipLinkModal from '../components/MembershipLinkModal';
import PostponementLinkModal from '../components/PostponementLinkModal';
import RefundLinkModal from '../components/RefundLinkModal';
import Spinner from '@/components/ui/Spinner';
import TransferLinkModal from '../components/TransferLinkModal';

type LinkKind = 'membership' | 'postponement' | 'refund' | 'transfer';

const LINK_TYPES: {
  kind: LinkKind;
  title: string;
  desc: string;
  icon: string;
  color: string;
}[] = [
  {
    kind: 'membership',
    title: '멤버십 조회 링크',
    desc: '회원이 자신의 멤버십 현황(잔여 횟수, 만료일 등)을 확인할 수 있는 링크입니다.',
    icon: '🎫',
    color: '#8b5cf6',
  },
  {
    kind: 'postponement',
    title: '연기 요청 링크',
    desc: '회원이 직접 수업 연기를 신청할 수 있는 링크입니다.',
    icon: '⏸️',
    color: '#4a90e2',
  },
  {
    kind: 'refund',
    title: '환불 요청 링크',
    desc: '회원이 직접 환불을 신청할 수 있는 링크입니다.',
    icon: '💰',
    color: '#e03131',
  },
  {
    kind: 'transfer',
    title: '멤버십 양도 링크',
    desc: '회원의 멤버십을 다른 사람에게 양도할 수 있는 링크입니다.',
    icon: '🔄',
    color: '#10b981',
  },
];

export default function MemberLinksPage() {
  const [keyword, setKeyword] = useState('');
  const [searched, setSearched] = useState('');
  const [selected, setSelected] = useState<ComplexMember | null>(null);
  const linkModal = useModal<LinkKind>();

  // 검색
  const { data: searchData, isLoading: loading } = useApiQuery<PageResponse<ComplexMember>>(
    ['memberLinks', searched],
    () => memberApi.list(`page=0&size=50&keyword=${encodeURIComponent(searched)}`),
    { enabled: !!searched.trim() },
  );
  const members = searched.trim() ? (searchData?.content ?? []) : [];

  const handleSearch = () => setSearched(keyword);
  const handleReset = () => {
    setKeyword('');
    setSearched('');
    setSelected(null);
  };

  const linkProps = useMemo(
    () =>
      selected
        ? { memberSeq: selected.seq, memberName: selected.name, memberPhone: selected.phoneNumber }
        : null,
    [selected],
  );

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title" style={{ marginBottom: 0 }}>링크 관리</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16, alignItems: 'start' }}>
        {/* 좌: 회원 검색 + 결과 리스트 */}
        <div className="card" style={{ padding: 12 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <input
              type="text"
              placeholder="이름 또는 전화번호로 검색"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              style={{ flex: 1, padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6 }}
            />
            <button
              onClick={handleSearch}
              style={{ padding: '8px 14px', border: 'none', borderRadius: 6, background: '#4a90e2', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
            >
              검색
            </button>
            {searched && (
              <button
                onClick={handleReset}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer' }}
              >
                초기화
              </button>
            )}
          </div>

          <div style={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
            {!searched && (
              <div style={{ padding: 28, color: '#999', textAlign: 'center', fontSize: 13 }}>
                회원을 검색해 주세요.
              </div>
            )}
            {searched && loading && (
              <Spinner />
            )}
            {searched && !loading && members.length === 0 && (
              <div style={{ padding: 28, color: '#999', textAlign: 'center', fontSize: 13 }}>
                검색 결과가 없습니다.
              </div>
            )}
            {!loading && members.length > 0 && (
              <>
                <div style={{ padding: '6px 4px', fontSize: 11, color: '#888' }}>
                  검색결과 {members.length}명
                </div>
                {members.map((m) => {
                  const active = selected?.seq === m.seq;
                  return (
                    <button
                      key={m.seq}
                      onClick={() => setSelected(m)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 12px',
                        marginBottom: 6,
                        borderRadius: 6,
                        border: active ? '1px solid #4a90e2' : '1px solid #eee',
                        background: active ? '#eaf3fd' : '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>
                        {m.name}
                        {m.level && <span className="badge badge-success" style={{ marginLeft: 6 }}>{m.level}</span>}
                      </div>
                      <div style={{ fontSize: 12, color: '#666', fontFamily: 'monospace' }}>{m.phoneNumber}</div>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* 우: 선택 회원 + 액션 카드 */}
        <div className="card" style={{ padding: 20, minHeight: 400 }}>
          {!selected ? (
            <div style={{ color: '#999', textAlign: 'center', padding: 80 }}>
              왼쪽에서 회원을 선택해 주세요.
            </div>
          ) : (
            <>
              {/* 회원 헤더 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                background: '#f8fafc',
                border: '1px solid #e6ecf2',
                borderRadius: 8,
                marginBottom: 20,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: '#4a90e2', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700,
                }}>
                  {selected.name.slice(0, 1)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    {selected.name}
                    {selected.level && <span className="badge badge-success" style={{ marginLeft: 8 }}>{selected.level}</span>}
                  </div>
                  <div style={{ fontSize: 13, color: '#666', fontFamily: 'monospace' }}>{selected.phoneNumber}</div>
                </div>
              </div>

              {/* 액션 카드 그리드 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                {LINK_TYPES.map((lt) => (
                  <div
                    key={lt.kind}
                    style={{
                      border: '1px solid #e6ecf2',
                      borderRadius: 8,
                      padding: 16,
                      background: '#fff',
                      borderTop: `3px solid ${lt.color}`,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 22 }}>{lt.icon}</span>
                      <h4 style={{ margin: 0, fontSize: 15 }}>{lt.title}</h4>
                    </div>
                    <p style={{ margin: '0 0 14px', fontSize: 12, color: '#777', lineHeight: 1.5, flex: 1 }}>
                      {lt.desc}
                    </p>
                    <button
                      onClick={() => linkModal.open(lt.kind)}
                      style={{
                        background: lt.color,
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '9px 14px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      링크 생성 / 전송
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 링크 모달들 */}
      {linkProps && linkModal.data === 'membership' && (
        <MembershipLinkModal {...linkProps} onClose={linkModal.close} />
      )}
      {linkProps && linkModal.data === 'postponement' && (
        <PostponementLinkModal {...linkProps} onClose={linkModal.close} />
      )}
      {linkProps && linkModal.data === 'refund' && (
        <RefundLinkModal {...linkProps} onClose={linkModal.close} />
      )}
      {linkProps && linkModal.data === 'transfer' && (
        <TransferLinkModal {...linkProps} onClose={linkModal.close} />
      )}
    </>
  );
}
