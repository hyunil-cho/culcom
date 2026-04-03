'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { customerApi, externalApi, settingsApi, messageTemplateApi, type Customer, type PageResponse } from '@/lib/api';
import { usePlaceholderResolver } from '@/lib/usePlaceholderResolver';
import { ROUTES } from '@/lib/routes';
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
  const router = useRouter();
  const { resolve } = usePlaceholderResolver();
  const { params: qp, setParams } = useQueryParams(CUSTOMER_DEFAULTS);
  const page = Number(qp.page);
  const filter = qp.filter;
  const searchType = qp.searchType;
  const searchedKeyword = qp.keyword;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [keyword, setKeyword] = useState(searchedKeyword);

  // CALLER 선택 상태
  const [selectedCallers, setSelectedCallers] = useState<Record<number, string>>({});
  const [phoneVisible, setPhoneVisible] = useState<Record<number, boolean>>({});
  const [callerModal, setCallerModal] = useState<CallerModal | null>(null);

  // 인터뷰 확정 상태
  const [interviewInputs, setInterviewInputs] = useState<Record<number, string>>({});
  const [interviewModal, setInterviewModal] = useState<InterviewModal | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string; redirectPath?: string } | null>(null);

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

  // 예약 확정 SMS 자동 발송
  const sendReservationSms = async (customer: Customer | undefined, interviewDate: string) => {
    try {
      const configRes = await settingsApi.getReservationSmsConfig();
      if (!configRes.success || !configRes.data) {
        setResult({ success: false, message: '예약은 완료되었으나, 예약 SMS 설정이 되어 있지 않습니다. 설정 페이지에서 구성해주세요.', redirectPath: ROUTES.SETTINGS_RESERVATION_SMS });
        return;
      }
      if (!configRes.data.autoSend) {
        setResult({ success: false, message: '예약은 완료되었으나, 예약 후 자동 문자 발송이 비활성화 상태입니다. 설정 페이지에서 활성화해주세요.', redirectPath: ROUTES.SETTINGS_RESERVATION_SMS });
        return;
      }

      const { templateSeq, senderNumber } = configRes.data;
      if (!senderNumber) {
        setResult({ success: false, message: '예약은 완료되었으나, 발신번호가 설정되지 않았습니다. 설정 페이지에서 발신번호를 지정해주세요.', redirectPath: ROUTES.SETTINGS_RESERVATION_SMS });
        return;
      }

      const tmplRes = await messageTemplateApi.get(templateSeq);
      if (!tmplRes.success || !tmplRes.data?.messageContext) {
        setResult({ success: false, message: '예약은 완료되었으나, 메시지 템플릿을 불러올 수 없습니다. 설정을 확인해주세요.', redirectPath: ROUTES.MESSAGE_TEMPLATES });
        return;
      }

      const message = resolve(tmplRes.data.messageContext, {
        customerName: customer?.name,
        customerPhone: customer?.phoneNumber,
        interviewDate,
      });

      const smsRes = await externalApi.sendSms({
        senderPhone: senderNumber,
        receiverPhone: customer?.phoneNumber ?? '',
        message,
      });

      if (!smsRes.success || !smsRes.data?.success) {
        setResult({ success: false, message: `예약은 완료되었으나, SMS 자동 발송에 실패했습니다: ${smsRes.data?.message || smsRes.message || '알 수 없는 오류'}` });
      }
    } catch {
      setResult({ success: false, message: '예약은 완료되었으나, SMS 자동 발송 중 오류가 발생했습니다.' });
    }
  };

  const confirmInterview = async () => {
    if (!interviewModal) return;
    const { customerSeq, caller } = interviewModal;
    const input = interviewInputs[customerSeq]?.trim();
    if (!input) return;

    const customer = customers.find(c => c.seq === customerSeq);
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

      // 예약 확정 SMS 자동 발송
      sendReservationSms(customer, normalized);

      // 구글 캘린더 이벤트 생성
      try {
        const calRes = await externalApi.createCalendarEvent({
          customerName: customer?.name ?? '',
          phoneNumber: customer?.phoneNumber ?? '',
          interviewDate: normalized,
          comment: customer?.comment ?? undefined,
          caller,
          callCount: customer?.callCount ?? 0,
          commercialName: customer?.commercialName ?? undefined,
          adSource: customer?.adSource ?? undefined,
        });
        if (calRes.success && calRes.data?.link) {
          window.open(calRes.data.link, '_blank');
        } else {
          setResult({ success: false, message: `예약은 완료되었으나, 캘린더 연동에 실패했습니다: ${calRes.message ?? '알 수 없는 오류'}` });
        }
      } catch {
        setResult({ success: false, message: '예약은 완료되었으나, 캘린더 연동 중 오류가 발생했습니다.' });
      }
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

  const customerColumns: Column<Customer>[] = [
    { header: '누적콜수', render: (c) => <strong>{c.callCount}회</strong> },
    { header: '이름', render: (c) => <strong style={{ fontSize: '1.1rem' }}>{c.name}</strong> },
    { header: '코멘트', render: (c) => c.comment || '-' },
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
        onClick={(e) => { e.stopPropagation(); setSmsTarget({ name: c.name, phone: c.phoneNumber, interviewDate: interviewInputs[c.seq] || undefined }); }}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, width: 'fit-content' }} onClick={(e) => e.stopPropagation()}>
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
      <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
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
        actions={<Link href={ROUTES.CUSTOMERS_ADD} className="btn-primary btn-nav">+ 워크인 추가</Link>}
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
        onRowClick={(c) => router.push(ROUTES.CUSTOMER_DETAIL(c.seq))}
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
          {...(result.redirectPath
            ? { redirectPath: result.redirectPath }
            : { onConfirm: () => { setResult(null); load(); } })}
        />
      )}
    </>
  );
}
