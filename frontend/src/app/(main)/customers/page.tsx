'use client';

import Link from 'next/link';
import { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { customerApi, externalApi, settingsApi, messageTemplateApi, type Customer, type PageResponse } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { queryClient } from '@/lib/queryClient';
import { ROUTES } from '@/lib/routes';
import { toServerDateTime, formatDateTime } from '@/lib/dateUtils';
import TimePicker from '@/components/ui/TimePicker';
import { useQueryParams } from '@/lib/useQueryParams';
import ResultModal from '@/components/ui/ResultModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import SearchBar from '@/components/ui/SearchBar';
import DataTable, { type Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import FormErrorBanner from '@/components/ui/FormErrorBanner';
import { useFormError } from '@/hooks/useFormError';
import { useModal } from '@/hooks/useModal';
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


  const { params: qp, setParams } = useQueryParams(CUSTOMER_DEFAULTS);
  const page = Number(qp.page);
  const filter = qp.filter;
  const searchType = qp.searchType;
  const searchedKeyword = qp.keyword;

  const [keyword, setKeyword] = useState(searchedKeyword);

  const queryParams = (() => {
    const params = new URLSearchParams({ page: String(page), size: '20', filter });
    if (searchedKeyword) {
      params.set('keyword', searchedKeyword);
      params.set('searchType', searchType);
    }
    return params.toString();
  })();

  const { data: pageData } = useApiQuery<PageResponse<Customer>>(
    ['customers', page, filter, searchedKeyword, searchType],
    () => customerApi.list(queryParams),
  );

  const customers = pageData?.content ?? [];
  const totalPages = pageData?.totalPages ?? 0;
  const totalCount = pageData?.totalElements ?? 0;

  // CALLER 선택 상태
  const [selectedCallers, setSelectedCallers] = useState<Record<number, string>>({});
  const [phoneVisible, setPhoneVisible] = useState<Record<number, boolean>>({});
  const callerConfirm = useModal<CallerModal>();

  // 인터뷰 확정 상태
  const [interviewInputs, setInterviewInputs] = useState<Record<number, string>>({});
  const interviewConfirmModal = useModal<InterviewModal>();
  const [result, setResult] = useState<{ success: boolean; message: string; redirectPath?: string } | null>(null);
  const { error: formError, setError: setFormError, clear: clearFormError } = useFormError();

  // SMS 모달
  const smsModal = useModal<{ name: string; phone: string; interviewDate?: string }>();

  const invalidateCustomers = () => queryClient.invalidateQueries({ queryKey: ['customers'] });

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
    callerConfirm.open({ customerSeq: seq, customerName: customer.name, caller });
  };

  const confirmCaller = async () => {
    if (!callerConfirm.data) return;
    const { customerSeq, caller } = callerConfirm.data;
    const res = await customerApi.processCall(customerSeq, caller);
    const data = res.data;

    setSelectedCallers(prev => ({ ...prev, [customerSeq]: caller }));
    setPhoneVisible(prev => ({ ...prev, [customerSeq]: true }));
    callerConfirm.close();
    await invalidateCustomers();
  };

  // 인터뷰 확정
  const handleInterviewConfirm = (seq: number) => {
    const input = interviewInputs[seq]?.trim();
    if (!input) { setFormError('인터뷰 일시를 입력해주세요.'); return; }
    const customer = customers.find(c => c.seq === seq);
    const caller = selectedCallers[seq];
    if (!caller) { setFormError('먼저 CALLER를 선택해주세요.'); return; }
    clearFormError();
    if (!customer) return;
    interviewConfirmModal.open({ customerSeq: seq, customerName: customer.name, caller });
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

      const resolveRes = await messageTemplateApi.resolve(templateSeq, {
        customerName: customer?.name,
        customerPhone: customer?.phoneNumber,
        interviewDate,
      });
      if (!resolveRes.success || !resolveRes.data) {
        setResult({ success: false, message: '예약은 완료되었으나, 메시지 템플릿을 불러올 수 없습니다. 설정을 확인해주세요.', redirectPath: ROUTES.MESSAGE_TEMPLATES });
        return;
      }
      const message = resolveRes.data;

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
    if (!interviewConfirmModal.data) return;
    const { customerSeq, caller } = interviewConfirmModal.data;
    const input = interviewInputs[customerSeq]?.trim();
    if (!input) return;

    const customer = customers.find(c => c.seq === customerSeq);
    const normalized = toServerDateTime(input);
    const res = await customerApi.createReservation(customerSeq, caller, normalized);
    if (res.success) {
      setInterviewInputs(prev => ({ ...prev, [customerSeq]: '' }));
      interviewConfirmModal.close();
      invalidateCustomers();
      setResult({ success: true, message: '예약이 생성되었습니다.' });

      // 예약 확정 SMS 자동 발송
      sendReservationSms(customer, normalized);
    }
  };

  // 전화상안함
  const noPhoneModal = useModal<number>();

  const handleMarkNoPhone = (seq: number) => {
    const caller = selectedCallers[seq];
    if (!caller) { setFormError('먼저 CALLER를 선택해주세요.'); return; }
    clearFormError();
    noPhoneModal.open(seq);
  };

  const confirmNoPhone = async () => {
    if (!noPhoneModal.data) return;
    noPhoneModal.close();
    await customerApi.markNoPhoneInterview(noPhoneModal.data);
    invalidateCustomers();
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
        onClick={(e) => { e.stopPropagation(); smsModal.open({ name: c.name, phone: c.phoneNumber, interviewDate: interviewInputs[c.seq] || undefined }); }}
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
    { header: '인터뷰확정일시', render: (c) => {
      const val = interviewInputs[c.seq] ?? '';
      const datePart = val.includes('T') ? val.split('T')[0] : val.split(' ')[0] || '';
      const timePart = val.includes('T') ? val.split('T')[1] || '' : val.split(' ')[1] || '';
      const updateParts = (date: string, time: string) => {
        setInterviewInputs(prev => ({ ...prev, [c.seq]: date && time ? `${date}T${time}` : date ? `${date}T` : '' }));
      };
      return (
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
          <input
            type="date"
            value={datePart}
            onChange={(e) => updateParts(e.target.value, timePart)}
            style={{ padding: '0.4rem 0.6rem', border: '1px solid #ddd', borderRadius: 4, fontSize: '0.85rem', width: 140 }}
          />
          <div style={{ width: 120 }}>
            <TimePicker
              value={timePart}
              onChange={(t) => updateParts(datePart, t)}
              placeholder="시간"
            />
          </div>
          <button className="btn-inline btn-inline-info" onClick={() => handleInterviewConfirm(c.seq)}>확정</button>
          <button className="btn-inline btn-inline-purple" onClick={() => handleMarkNoPhone(c.seq)}>전화상안함</button>
        </div>
      );
    }},
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

      <FormErrorBanner error={formError} />

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
        emptyAction={<Button onClick={() => router.push(ROUTES.CUSTOMERS_ADD)}>+ 워크인 추가</Button>}
        pagination={{ page, totalPages, onPageChange: (p) => setParams({ page: String(p) }) }}
      />

      {/* CALLER 확인 모달 */}
      {callerConfirm.isOpen && (
        <ConfirmModal
          title="CALLER 선택 확인"
          onCancel={callerConfirm.close}
          onConfirm={confirmCaller}
          confirmColor="#667eea"
        >
          <div style={{ fontSize: '1.1rem', color: '#333', marginBottom: '1rem' }}>
            <strong style={{ color: '#667eea', fontSize: '1.3rem' }}>{callerConfirm.data!.customerName}</strong>님의
          </div>
          <div style={{ fontSize: '0.95rem', color: '#666', marginBottom: '0.5rem' }}>선택한 CALLER</div>
          <div style={{ background: '#f5f3ff', padding: '1.5rem', borderRadius: 8, border: '2px solid #667eea', marginTop: '1rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#667eea' }}>{callerConfirm.data!.caller}</div>
          </div>
          <div style={{ marginTop: '1rem', color: '#666', fontSize: '0.95rem' }}>이 CALLER로 선택하시겠습니까?</div>
        </ConfirmModal>
      )}

      {/* 인터뷰 확정 모달 */}
      {interviewConfirmModal.isOpen && (
        <ConfirmModal
          title="인터뷰 확정"
          onCancel={interviewConfirmModal.close}
          onConfirm={confirmInterview}
          confirmLabel="확정"
          confirmColor="#4a90e2"
        >
          <strong>{interviewConfirmModal.data!.customerName}</strong>님의 인터뷰를 확정하시겠습니까?
          <br /><br />
          CALLER: <strong style={{ color: '#667eea' }}>{interviewConfirmModal.data!.caller}</strong>
          <br />
          일시: <strong>{interviewInputs[interviewConfirmModal.data!.customerSeq]}</strong>
        </ConfirmModal>
      )}

      {/* 전화상안함 확인 모달 */}
      {noPhoneModal.isOpen && (
        <ConfirmModal
          title="전화상 안함 확인"
          confirmLabel="확인"
          onCancel={noPhoneModal.close}
          onConfirm={confirmNoPhone}
        >
          전화상 안함으로 처리하시겠습니까?
        </ConfirmModal>
      )}

      {/* SMS 전송 모달 */}
      {smsModal.isOpen && (
        <SmsModal
          customerName={smsModal.data!.name}
          customerPhone={smsModal.data!.phone}
          interviewDate={smsModal.data!.interviewDate}
          onClose={smsModal.close}
          onResult={(success, message) => {
            smsModal.close();
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
            : { onConfirm: () => { setResult(null); invalidateCustomers(); } })}
        />
      )}
    </>
  );
}
