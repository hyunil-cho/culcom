'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState, useCallback } from 'react';
import { customerApi, type Customer, type PageResponse } from '@/lib/api';
import { toServerDateTime, formatDateTime } from '@/lib/dateUtils';
import { useQueryParams } from '@/lib/useQueryParams';
import ResultModal from '@/components/ui/ResultModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import SearchBar from '@/components/ui/SearchBar';
import DataTable, { type Column } from '@/components/ui/DataTable';
import SmsModal from './SmsModal';

const CALLERS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P'];

interface CallerModal {
  customerSeq: number;
  customerName: string;
  caller: string;
}

interface InterviewModal {
  customerSeq: number;
  customerName: string;
  caller: string;
}

const CUSTOMER_DEFAULTS = { page: '0', filter: 'new', searchType: 'name', keyword: '' };

export default function CustomersPage() {
  return <Suspense><CustomersContent /></Suspense>;
}

function CustomersContent() {
  const { params: qp, setParams } = useQueryParams(CUSTOMER_DEFAULTS);
  const page = Number(qp.page);
  const filter = qp.filter;
  const searchType = qp.searchType;
  const searchedKeyword = qp.keyword;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [keyword, setKeyword] = useState(searchedKeyword);
  const [deleting, setDeleting] = useState<number | null>(null);

  // 인라인 편집 상태
  const [nameInputs, setNameInputs] = useState<Record<number, string>>({});
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});

  // CALLER 선택 상태
  const [selectedCallers, setSelectedCallers] = useState<Record<number, string>>({});
  const [phoneVisible, setPhoneVisible] = useState<Record<number, boolean>>({});
  const [callerModal, setCallerModal] = useState<CallerModal | null>(null);

  // 인터뷰 확정 상태
  const [interviewInputs, setInterviewInputs] = useState<Record<number, string>>({});
  const [interviewModal, setInterviewModal] = useState<InterviewModal | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // SMS 모달
  const [smsTarget, setSmsTarget] = useState<{ name: string; phone: string; interviewDate?: string } | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), size: '20', filter });
    if (searchedKeyword) {
      params.set('keyword', searchedKeyword);
      params.set('searchType', searchType);
    }
    const res = await customerApi.list(params.toString());
    const data = res.data as PageResponse<Customer>;
    setCustomers(data.content);
    setTotalPages(data.totalPages);
    setTotalCount(data.totalElements);
  }, [page, filter, searchedKeyword, searchType]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => { setKeyword(searchedKeyword); }, [searchedKeyword]);

  const handleSearch = () => {
    setParams({ page: '0', keyword, searchType });
  };

  const handleReset = () => {
    setKeyword('');
    setParams({ page: '0', keyword: '' });
  };

  // 이름 수정
  const handleNameUpdate = async (seq: number) => {
    const newName = nameInputs[seq]?.trim();
    if (!newName) { alert('이름을 입력해주세요.'); return; }
    const customer = customers.find(c => c.seq === seq);
    if (customer?.name === newName) { alert('변경된 내용이 없습니다.'); return; }
    await customerApi.updateName(seq, newName);
    setCustomers(prev => prev.map(c => c.seq === seq ? { ...c, name: newName } : c));
    setNameInputs(prev => ({ ...prev, [seq]: '' }));
  };

  // 코멘트 등록
  const handleCommentUpdate = async (seq: number) => {
    const comment = commentInputs[seq]?.trim() ?? '';
    await customerApi.updateComment(seq, comment);
    setCustomers(prev => prev.map(c => c.seq === seq ? { ...c, comment } : c));
    setCommentInputs(prev => ({ ...prev, [seq]: '' }));
  };

  // CALLER 선택
  const handleCallerClick = (seq: number, caller: string) => {
    const customer = customers.find(c => c.seq === seq);
    if (!customer) return;
    setCallerModal({ customerSeq: seq, customerName: customer.name, caller });
  };

  const confirmCaller = async () => {
    if (!callerModal) return;
    const { customerSeq, caller } = callerModal;
    const res = await customerApi.processCall(customerSeq, caller);
    const data = res.data;

    setSelectedCallers(prev => ({ ...prev, [customerSeq]: caller }));
    setPhoneVisible(prev => ({ ...prev, [customerSeq]: true }));
    setCustomers(prev => prev.map(c => {
      if (c.seq !== customerSeq) return c;
      const newCount = data.call_count;
      let newStatus = c.status;
      if (newCount >= 5) newStatus = '콜수초과';
      else if (c.status === '신규') newStatus = '진행중';
      return { ...c, callCount: newCount, status: newStatus, lastUpdateDate: data.last_update_date };
    }));
    setCallerModal(null);

    if (filter === 'new' && data.call_count >= 5) {
      setCustomers(prev => prev.filter(c => c.seq !== customerSeq));
    }
  };

  // 인터뷰 확정
  const handleInterviewConfirm = (seq: number) => {
    const input = interviewInputs[seq]?.trim();
    if (!input) { alert('인터뷰 일시를 입력해주세요.'); return; }
    const customer = customers.find(c => c.seq === seq);
    const caller = selectedCallers[seq];
    if (!caller) { alert('먼저 CALLER를 선택해주세요.'); return; }
    if (!customer) return;
    setInterviewModal({ customerSeq: seq, customerName: customer.name, caller });
  };

  const confirmInterview = async () => {
    if (!interviewModal) return;
    const { customerSeq, caller } = interviewModal;
    const input = interviewInputs[customerSeq]?.trim();
    if (!input) return;

    const normalized = toServerDateTime(input);
    const res = await customerApi.createReservation(customerSeq, caller, normalized);
    if (res.success) {
      setCustomers(prev => prev.map(c =>
        c.seq === customerSeq ? { ...c, status: '예약확정' } : c
      ));
      setInterviewInputs(prev => ({ ...prev, [customerSeq]: '' }));
      setInterviewModal(null);

      if (filter === 'new') {
        setCustomers(prev => prev.filter(c => c.seq !== customerSeq));
      }
      setResult({ success: true, message: '예약이 생성되었습니다.' });
    }
  };

  // 전화상안함
  const handleMarkNoPhone = async (seq: number) => {
    const caller = selectedCallers[seq];
    if (!caller) { alert('먼저 CALLER를 선택해주세요.'); return; }
    if (!confirm('전화상 안함으로 처리하시겠습니까?')) return;
    await customerApi.markNoPhoneInterview(seq);
    setCustomers(prev => prev.map(c =>
      c.seq === seq ? { ...c, status: '전화상거절' } : c
    ));
    if (filter === 'new') {
      setCustomers(prev => prev.filter(c => c.seq !== seq));
    }
  };

  // 삭제
  const confirmDelete = async () => {
    if (deleting === null) return;
    const res = await customerApi.delete(deleting);
    setDeleting(null);
    if (res.success) setResult({ success: true, message: '고객이 삭제되었습니다.' });
  };

  const customerColumns: Column<Customer>[] = [
    { header: '누적콜수', render: (c) => <strong>{c.callCount}회</strong> },
    { header: '이름', render: (c) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        <div style={{ padding: '0.4rem 0.6rem', background: '#f8f9fa', borderRadius: 4, fontSize: '1.3rem', fontWeight: 700, minWidth: 120 }}>
          {c.name}
        </div>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          <input
            placeholder="이름 입력"
            value={nameInputs[c.seq] ?? ''}
            onChange={(e) => setNameInputs(prev => ({ ...prev, [c.seq]: e.target.value }))}
            style={{ padding: '0.4rem 0.6rem', border: '1px solid #ddd', borderRadius: 4, fontSize: '0.85rem', width: 120 }}
          />
          <button className="btn-inline btn-inline-success" onClick={() => handleNameUpdate(c.seq)}>수정</button>
        </div>
      </div>
    )},
    { header: '코멘트', render: (c) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {c.comment && (
          <div style={{ padding: '0.4rem 0.6rem', background: '#f8f9fa', borderRadius: 4, fontSize: '0.85rem', minWidth: 120 }}>
            {c.comment}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          <input
            placeholder="코멘트 입력"
            value={commentInputs[c.seq] ?? ''}
            onChange={(e) => setCommentInputs(prev => ({ ...prev, [c.seq]: e.target.value }))}
            style={{ padding: '0.4rem 0.6rem', border: '1px solid #ddd', borderRadius: 4, fontSize: '0.85rem', width: 120 }}
          />
          <button className="btn-inline btn-inline-primary" onClick={() => handleCommentUpdate(c.seq)}>등록</button>
        </div>
      </div>
    )},
    { header: '전화번호', render: (c) => (
      <div style={{ textAlign: 'center' }}>
        {phoneVisible[c.seq]
          ? <span style={{ fontSize: '1.3rem', fontWeight: 700 }}>{c.phoneNumber}</span>
          : <span style={{ color: '#999' }}>***-****-****</span>
        }
      </div>
    )},
    { header: 'TEXT', render: (c) => (
      <button
        onClick={() => setSmsTarget({ name: c.name, phone: c.phoneNumber, interviewDate: interviewInputs[c.seq] || undefined })}
        style={{
          padding: '0.4rem 0.8rem', background: '#10b981', color: 'white',
          border: 'none', borderRadius: 4, cursor: 'pointer',
          fontSize: '0.85rem', fontWeight: 600,
        }}
      >
        TEXT
      </button>
    )},
    { header: 'CALLER', render: (c) => (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, width: 'fit-content' }}>
        {CALLERS.map(letter => (
          <button
            key={letter}
            className={`btn-caller ${selectedCallers[c.seq] === letter ? 'btn-caller-active' : 'btn-caller-inactive'}`}
            onClick={() => handleCallerClick(c.seq, letter)}
          >
            {letter}
          </button>
        ))}
      </div>
    )},
    { header: '인터뷰확정일시', render: (c) => (
      <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
        <input
          type="datetime-local"
          value={interviewInputs[c.seq] ?? ''}
          onChange={(e) => setInterviewInputs(prev => ({ ...prev, [c.seq]: e.target.value }))}
          style={{ padding: '0.4rem 0.6rem', border: '1px solid #ddd', borderRadius: 4, fontSize: '0.85rem', width: 180 }}
        />
        <button className="btn-inline btn-inline-info" onClick={() => handleInterviewConfirm(c.seq)}>확정</button>
        <button className="btn-inline btn-inline-purple" onClick={() => handleMarkNoPhone(c.seq)}>전화상안함</button>
      </div>
    )},
    { header: '광고명', render: (c) => c.commercialName ?? '-' },
    { header: '지원경로', render: (c) => c.adSource ?? '-' },
    { header: '등록일', render: (c) => c.createdDate?.split('T')[0] },
    { header: '회신일시', render: (c) => formatDateTime(c.lastUpdateDate) },
    { header: '삭제', render: (c) => (
      <button className="btn-table-delete" onClick={() => setDeleting(c.seq)}>삭제</button>
    )},
  ];

  return (
    <>
      <SearchBar
        keyword={keyword}
        onKeywordChange={setKeyword}
        onSearch={handleSearch}
        onReset={handleReset}
        searchOptions={[
          { value: 'name', label: '이름' },
          { value: 'phone', label: '전화번호' },
        ]}
        searchType={searchType}
        onSearchTypeChange={(v) => setParams({ searchType: v })}
        actions={<Link href="/customers/add" className="btn-primary btn-nav">+ 워크인 추가</Link>}
      />

      <DataTable
        columns={customerColumns}
        data={customers}
        rowKey={(c) => c.seq}
        headerInfo={
          <span style={{ fontSize: '1rem', fontWeight: 600, color: '#333' }}>
            전체 <span style={{ color: '#4a90e2', fontSize: '1.2rem' }}>{totalCount}</span>명
          </span>
        }
        headerRight={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['new', 'all'] as const).map(f => (
              <button
                key={f}
                className={`btn-filter ${filter === f ? 'btn-filter-active' : 'btn-filter-inactive'}`}
                onClick={() => setParams({ filter: f, page: '0' })}
              >
                {f === 'new' ? '처리중' : '전체'}
              </button>
            ))}
          </div>
        }
        rowStyle={(c) => c.lastUpdateDate ? { backgroundColor: '#f3e8ff' } : undefined}
        emptyMessage="고객이 없습니다."
        page={page}
        totalPages={totalPages}
        onPageChange={(p) => setParams({ page: String(p) })}
      />

      {/* CALLER 확인 모달 */}
      {callerModal && (
        <ConfirmModal
          title="CALLER 선택 확인"
          onCancel={() => setCallerModal(null)}
          onConfirm={confirmCaller}
          confirmColor="#667eea"
        >
          <div style={{ fontSize: '1.1rem', color: '#333', marginBottom: '1rem' }}>
            <strong style={{ color: '#667eea', fontSize: '1.3rem' }}>{callerModal.customerName}</strong>님의
          </div>
          <div style={{ fontSize: '0.95rem', color: '#666', marginBottom: '0.5rem' }}>선택한 CALLER</div>
          <div style={{ background: '#f5f3ff', padding: '1.5rem', borderRadius: 8, border: '2px solid #667eea', marginTop: '1rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#667eea' }}>{callerModal.caller}</div>
          </div>
          <div style={{ marginTop: '1rem', color: '#666', fontSize: '0.95rem' }}>이 CALLER로 선택하시겠습니까?</div>
        </ConfirmModal>
      )}

      {/* 인터뷰 확정 모달 */}
      {interviewModal && (
        <ConfirmModal
          title="인터뷰 확정"
          onCancel={() => setInterviewModal(null)}
          onConfirm={confirmInterview}
          confirmLabel="확정"
          confirmColor="#4a90e2"
        >
          <strong>{interviewModal.customerName}</strong>님의 인터뷰를 확정하시겠습니까?
          <br /><br />
          CALLER: <strong style={{ color: '#667eea' }}>{interviewModal.caller}</strong>
          <br />
          일시: <strong>{interviewInputs[interviewModal.customerSeq]}</strong>
        </ConfirmModal>
      )}

      {/* 삭제 확인 모달 */}
      {deleting !== null && (
        <ConfirmModal
          title="삭제 확인"
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
          confirmLabel="삭제"
          confirmColor="#f44336"
        >
          <strong>{customers.find(c => c.seq === deleting)?.name}</strong> 고객을 삭제하시겠습니까?
          <br /><br />이 작업은 되돌릴 수 없습니다.
        </ConfirmModal>
      )}

      {/* SMS 전송 모달 */}
      {smsTarget && (
        <SmsModal
          customerName={smsTarget.name}
          customerPhone={smsTarget.phone}
          interviewDate={smsTarget.interviewDate}
          onClose={() => setSmsTarget(null)}
          onResult={(success, message) => {
            setSmsTarget(null);
            setResult({ success, message });
          }}
        />
      )}

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
