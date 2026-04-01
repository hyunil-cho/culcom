'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { customerApi, type Customer, type PageResponse } from '@/lib/api';
import { toServerDateTime, formatDateTime } from '@/lib/dateUtils';
import ResultModal from '@/components/ui/ResultModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import SearchBar from '@/components/ui/SearchBar';

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

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filter, setFilter] = useState('new');
  const [searchType, setSearchType] = useState('name');
  const [keyword, setKeyword] = useState('');
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

  const load = async () => {
    const params = new URLSearchParams({ page: String(page), size: '20', filter });
    if (keyword) {
      params.set('keyword', keyword);
      params.set('searchType', searchType);
    }
    const res = await customerApi.list(params.toString());
    const data = res.data as PageResponse<Customer>;
    setCustomers(data.content);
    setTotalPages(data.totalPages);
    setTotalCount(data.totalElements);
  };

  useEffect(() => { load(); }, [page, filter]);

  const handleSearch = () => { setPage(0); load(); };

  const handleReset = () => {
    setKeyword('');
    setPage(0);
    const params = new URLSearchParams({ page: '0', size: '20', filter });
    customerApi.list(params.toString()).then(res => {
      const data = res.data as PageResponse<Customer>;
      setCustomers(data.content);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalElements);
    });
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
        onSearchTypeChange={setSearchType}
        actions={<Link href="/customers/add" className="btn-primary btn-nav">+ 워크인 추가</Link>}
      />

      {/* 고객 테이블 */}
      <div className="content-card">
        <div className="table-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '1rem', fontWeight: 600, color: '#333' }}>
            전체 <span style={{ color: '#4a90e2', fontSize: '1.2rem' }}>{totalCount}</span>명
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['new', 'all'] as const).map(f => (
              <button
                key={f}
                className={`btn-filter ${filter === f ? 'btn-filter-active' : 'btn-filter-inactive'}`}
                onClick={() => { setFilter(f); setPage(0); }}
              >
                {f === 'new' ? '처리중' : '전체'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>누적콜수</th>
                <th>이름</th>
                <th>코멘트</th>
                <th>전화번호</th>
                <th>CALLER</th>
                <th>인터뷰확정일시</th>
                <th>광고명</th>
                <th>지원경로</th>
                <th>등록일</th>
                <th>회신일시</th>
                <th>삭제</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.seq} style={c.lastUpdateDate ? { backgroundColor: '#f3e8ff' } : undefined}>
                  <td><strong>{c.callCount}회</strong></td>

                  {/* 이름 */}
                  <td>
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
                        <button className="btn-inline btn-inline-success" onClick={() => handleNameUpdate(c.seq)}>
                          수정
                        </button>
                      </div>
                    </div>
                  </td>

                  {/* 코멘트 */}
                  <td>
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
                        <button className="btn-inline btn-inline-primary" onClick={() => handleCommentUpdate(c.seq)}>
                          등록
                        </button>
                      </div>
                    </div>
                  </td>

                  {/* 전화번호 */}
                  <td style={{ textAlign: 'center' }}>
                    {phoneVisible[c.seq] ? (
                      <span style={{ fontSize: '1.3rem', fontWeight: 700 }}>{c.phoneNumber}</span>
                    ) : (
                      <span style={{ color: '#999' }}>***-****-****</span>
                    )}
                  </td>

                  {/* CALLER */}
                  <td>
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
                  </td>

                  {/* 인터뷰 확정일시 */}
                  <td>
                    <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                      <input
                        type="datetime-local"
                        value={interviewInputs[c.seq] ?? ''}
                        onChange={(e) => setInterviewInputs(prev => ({ ...prev, [c.seq]: e.target.value }))}
                        style={{ padding: '0.4rem 0.6rem', border: '1px solid #ddd', borderRadius: 4, fontSize: '0.85rem', width: 180 }}
                      />
                      <button className="btn-inline btn-inline-info" onClick={() => handleInterviewConfirm(c.seq)}>
                        확정
                      </button>
                      <button className="btn-inline btn-inline-purple" onClick={() => handleMarkNoPhone(c.seq)}>
                        전화상안함
                      </button>
                    </div>
                  </td>

                  <td>{c.commercialName ?? '-'}</td>
                  <td>{c.adSource ?? '-'}</td>
                  <td>{c.createdDate?.split('T')[0]}</td>
                  <td>{formatDateTime(c.lastUpdateDate)}</td>
                  <td>
                    <button className="btn-table-delete" onClick={() => setDeleting(c.seq)}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr><td colSpan={11} className="table-empty">고객이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button className="btn-secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>이전</button>
            <span className="pagination-info">{page + 1} / {totalPages}</span>
            <button className="btn-secondary" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>다음</button>
          </div>
        )}
      </div>

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
