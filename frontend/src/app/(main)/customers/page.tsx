'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { customerApi, type Customer, type PageResponse } from '@/lib/api';
import { toServerDateTime, formatDateTime } from '@/lib/dateUtils';

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

    // 처리중 필터에서 콜수초과 시 행 제거
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

    // 간단한 날짜 파싱: ISO format 지원
    try {
      const normalized = toServerDateTime(input);
      await customerApi.createReservation(customerSeq, caller, normalized);
      setCustomers(prev => prev.map(c =>
        c.seq === customerSeq ? { ...c, status: '예약확정' } : c
      ));
      setInterviewInputs(prev => ({ ...prev, [customerSeq]: '' }));
      setInterviewModal(null);

      // 처리중 필터에서 예약확정 시 행 제거
      if (filter === 'new') {
        setCustomers(prev => prev.filter(c => c.seq !== customerSeq));
      }
    } catch {
      alert('예약 생성에 실패했습니다.');
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
    await customerApi.delete(deleting);
    setDeleting(null);
    load();
  };

  return (
    <>
      {/* 검색 및 필터 */}
      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <div className="search-section">
          <div style={{ display: 'flex', gap: 0, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 'auto', margin: 0 }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', color: '#5a6c7d', fontWeight: 600 }}>검색 조건</label>
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                style={{ width: 120, padding: '0.6rem', border: '1px solid #ddd', borderRadius: '4px 0 0 4px', fontSize: '0.9rem' }}
              >
                <option value="name">이름</option>
                <option value="phone">전화번호</option>
              </select>
            </div>
            <div style={{ flex: 1, margin: 0, maxWidth: 400 }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', color: '#5a6c7d', fontWeight: 600 }}>검색어</label>
              <input
                placeholder="검색어를 입력하세요"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                style={{ padding: '0.6rem', border: '1px solid #ddd', borderLeft: 'none', borderRadius: '0 4px 4px 0', fontSize: '0.9rem', width: '100%' }}
              />
            </div>
            <div style={{ margin: 0, display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleSearch}
                style={{ padding: '0.6rem 1.2rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
              >
                검색
              </button>
              {keyword && (
                <button onClick={handleReset} className="btn-secondary" style={{ padding: '0.6rem 1.2rem' }}>초기화</button>
              )}
            </div>
          </div>
          <div className="action-buttons" style={{ marginTop: '1rem' }}>
            <Link href="/customers/add" className="btn-primary" style={{ padding: '0.75rem 1.5rem', borderRadius: 8, fontSize: '0.95rem', fontWeight: 500, color: 'white', textDecoration: 'none' }}>
              + 워크인 추가
            </Link>
          </div>
        </div>
      </div>

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
                onClick={() => { setFilter(f); setPage(0); }}
                style={{
                  padding: '0.6rem 1.5rem',
                  border: `2px solid ${filter === f ? '#4a90e2' : '#ddd'}`,
                  background: filter === f ? '#4a90e2' : 'white',
                  color: filter === f ? 'white' : '#666',
                  borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem',
                }}
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
                  {/* 콜수 */}
                  <td><strong>{c.callCount}회</strong></td>

                  {/* 이름 (표시 + 인라인 수정) */}
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
                        <button
                          onClick={() => handleNameUpdate(c.seq)}
                          style={{ padding: '0.4rem 0.7rem', background: '#10b981', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}
                        >
                          수정
                        </button>
                      </div>
                    </div>
                  </td>

                  {/* 코멘트 (표시 + 인라인 등록) */}
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
                        <button
                          onClick={() => handleCommentUpdate(c.seq)}
                          style={{ padding: '0.4rem 0.7rem', background: '#667eea', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}
                        >
                          등록
                        </button>
                      </div>
                    </div>
                  </td>

                  {/* 전화번호 (CALLER 선택 전 숨김) */}
                  <td style={{ textAlign: 'center' }}>
                    {phoneVisible[c.seq] ? (
                      <span style={{ fontSize: '1.3rem', fontWeight: 700 }}>{c.phoneNumber}</span>
                    ) : (
                      <span style={{ color: '#999' }}>***-****-****</span>
                    )}
                  </td>

                  {/* CALLER 선택 */}
                  <td>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, width: 'fit-content' }}>
                      {CALLERS.map(letter => (
                        <button
                          key={letter}
                          onClick={() => handleCallerClick(c.seq, letter)}
                          style={{
                            width: 24, height: 24, padding: 0,
                            border: `1px solid ${selectedCallers[c.seq] === letter ? '#4a90e2' : '#ddd'}`,
                            background: selectedCallers[c.seq] === letter ? '#4a90e2' : 'white',
                            color: selectedCallers[c.seq] === letter ? 'white' : '#333',
                            fontSize: 10, fontWeight: 600, borderRadius: 2, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
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
                      <button
                        onClick={() => handleInterviewConfirm(c.seq)}
                        style={{ padding: '0.4rem 0.6rem', background: '#4a90e2', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}
                      >
                        확정
                      </button>
                      <button
                        onClick={() => handleMarkNoPhone(c.seq)}
                        style={{ padding: '0.4rem 0.6rem', background: '#9333ea', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}
                      >
                        전화상안함
                      </button>
                    </div>
                  </td>

                  <td>{c.commercialName ?? '-'}</td>
                  <td>{c.adSource ?? '-'}</td>
                  <td>{c.createdDate?.split('T')[0]}</td>
                  <td>{formatDateTime(c.lastUpdateDate)}</td>
                  <td>
                    <button
                      className="btn-table-action"
                      onClick={() => setDeleting(c.seq)}
                      style={{ background: '#f44336', color: 'white', border: 'none' }}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                    고객이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '1rem' }}>
            <button className="btn-secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>이전</button>
            <span style={{ padding: '8px 16px', fontSize: 14 }}>{page + 1} / {totalPages}</span>
            <button className="btn-secondary" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>다음</button>
          </div>
        )}
      </div>

      {/* CALLER 확인 모달 */}
      {callerModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setCallerModal(null); }}
          style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 10000, alignItems: 'center', justifyContent: 'center' }}
        >
          <div style={{ background: 'white', borderRadius: 12, width: '90%', maxWidth: 400, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '2px solid #667eea' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#2c3e50' }}>CALLER 선택 확인</h3>
            </div>
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.1rem', color: '#333', marginBottom: '1rem' }}>
                <strong style={{ color: '#667eea', fontSize: '1.3rem' }}>{callerModal.customerName}</strong>님의
              </div>
              <div style={{ fontSize: '0.95rem', color: '#666', marginBottom: '0.5rem' }}>선택한 CALLER</div>
              <div style={{ background: '#f5f3ff', padding: '1.5rem', borderRadius: 8, border: '2px solid #667eea', marginTop: '1rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#667eea' }}>{callerModal.caller}</div>
              </div>
              <div style={{ marginTop: '1rem', color: '#666', fontSize: '0.95rem' }}>이 CALLER로 선택하시겠습니까?</div>
            </div>
            <div style={{ padding: '1rem 2rem', borderTop: '1px solid #e0e0e0', display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setCallerModal(null)}
                style={{ flex: 1, padding: '0.75rem', fontSize: '1rem', border: '1px solid #ddd', background: 'white', color: '#666', borderRadius: 6, cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                onClick={confirmCaller}
                style={{ flex: 1, padding: '0.75rem', fontSize: '1rem', border: 'none', background: '#667eea', color: 'white', borderRadius: 6, cursor: 'pointer' }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 인터뷰 확정 모달 */}
      {interviewModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setInterviewModal(null); }}
          style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 10000, alignItems: 'center', justifyContent: 'center' }}
        >
          <div style={{ background: 'white', borderRadius: 12, width: '90%', maxWidth: 400, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '2px solid #4a90e2' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#2c3e50' }}>인터뷰 확정</h3>
            </div>
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666', fontSize: '0.95rem' }}>
              <strong>{interviewModal.customerName}</strong>님의 인터뷰를 확정하시겠습니까?
              <br /><br />
              CALLER: <strong style={{ color: '#667eea' }}>{interviewModal.caller}</strong>
              <br />
              일시: <strong>{interviewInputs[interviewModal.customerSeq]}</strong>
            </div>
            <div style={{ padding: '1rem 2rem', borderTop: '1px solid #e0e0e0', display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setInterviewModal(null)}
                style={{ flex: 1, padding: '0.75rem', fontSize: '1rem', border: '1px solid #ddd', background: 'white', color: '#666', borderRadius: 6, cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                onClick={confirmInterview}
                style={{ flex: 1, padding: '0.75rem', fontSize: '1rem', border: 'none', background: '#4a90e2', color: 'white', borderRadius: 6, cursor: 'pointer' }}
              >
                확정
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleting !== null && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setDeleting(null); }}
          style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 10000, alignItems: 'center', justifyContent: 'center' }}
        >
          <div style={{ background: 'white', borderRadius: 12, width: '90%', maxWidth: 400, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '2px solid #f44336' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#2c3e50' }}>삭제 확인</h3>
            </div>
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666', fontSize: '0.95rem' }}>
              <strong>{customers.find(c => c.seq === deleting)?.name}</strong> 고객을 삭제하시겠습니까?
              <br /><br />이 작업은 되돌릴 수 없습니다.
            </div>
            <div style={{ padding: '1rem 2rem', borderTop: '1px solid #e0e0e0', display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setDeleting(null)}
                style={{ flex: 1, padding: '0.75rem', fontSize: '1rem', border: '1px solid #ddd', background: 'white', color: '#666', borderRadius: 6, cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                onClick={confirmDelete}
                style={{ flex: 1, padding: '0.75rem', fontSize: '1rem', border: 'none', background: '#f44336', color: 'white', borderRadius: 6, cursor: 'pointer' }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
