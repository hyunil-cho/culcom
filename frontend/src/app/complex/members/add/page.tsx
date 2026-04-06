'use client';

import { useState } from 'react';
import { memberApi, surveyApi, type SurveySubmissionItem } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import MemberForm, {
  emptyMemberForm, emptyMembershipForm, emptyClassAssign,
  validateMemberForm, type MemberFormData, type MembershipFormData, type ClassAssignData,
} from '../MemberForm';
import { useResultModal } from '@/hooks/useResultModal';
import { Button } from '@/components/ui/Button';

export default function MemberAddPage() {
  const [form, setForm] = useState<MemberFormData>(emptyMemberForm);
  const [msForm, setMsForm] = useState<MembershipFormData>(emptyMembershipForm);
  const [classAssign, setClassAssign] = useState<ClassAssignData>(emptyClassAssign);
  const { run, modal } = useResultModal({ redirectPath: ROUTES.COMPLEX_MEMBERS });

  const [showImport, setShowImport] = useState(false);
  const [submissions, setSubmissions] = useState<SurveySubmissionItem[]>([]);
  const [importLoading, setImportLoading] = useState(false);

  const openImport = async () => {
    setShowImport(true);
    setImportLoading(true);
    const res = await surveyApi.listSubmissions();
    if (res.success) setSubmissions(res.data);
    setImportLoading(false);
  };

  const selectSubmission = (item: SurveySubmissionItem) => {
    setForm(prev => ({ ...prev, name: item.name, phoneNumber: item.phoneNumber }));
    setShowImport(false);
  };

  const handleSubmit = async () => {
    const error = validateMemberForm(form);
    if (error) { alert(error); return; }

    // 1. 회원 생성
    const res = await memberApi.create({
      name: form.name,
      phoneNumber: form.phoneNumber,
      level: form.level || undefined,
      language: form.language || undefined,
      info: form.info || undefined,
      chartNumber: form.chartNumber || undefined,
      signupChannel: (form.signupChannel && form.signupChannel !== '기타') ? form.signupChannel : undefined,
      interviewer: form.interviewer || undefined,
      comment: form.comment || undefined,
    });

    if (!res.success) { alert(res.message || '회원 등록 실패'); return; }
    const memberSeq = res.data.seq;

    // 2. 멤버십 할당 (선택)
    if (msForm.membershipSeq) {
      await memberApi.assignMembership(memberSeq, {
        membershipSeq: Number(msForm.membershipSeq),
        startDate: msForm.startDate || undefined,
        expiryDate: msForm.expiryDate || undefined,
        price: msForm.price || undefined,
        paymentDate: msForm.paymentDate || undefined,
        status: msForm.status || undefined,
        depositAmount: msForm.depositAmount || undefined,
        paymentMethod: (msForm.paymentMethod && msForm.paymentMethod !== '기타') ? msForm.paymentMethod : undefined,
      });
    }

    // 3. 수업 배정 (선택)
    if (classAssign.classSeq) {
      await memberApi.assignClass(memberSeq, Number(classAssign.classSeq));
    }

    await run(Promise.resolve(res), '회원이 등록되었습니다.');
  };

  return (
    <>
      <MemberForm form={form} onChange={setForm} onSubmit={handleSubmit}
        backHref={ROUTES.COMPLEX_MEMBERS} submitLabel="등록"
        membershipForm={msForm} onMembershipChange={setMsForm}
        classAssign={classAssign} onClassAssignChange={setClassAssign}
        headerExtra={
          <Button variant="secondary" onClick={openImport}>불러오기</Button>
        }
      />
      {modal}

      {showImport && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowImport(false)}>
          <div className="modal-content" style={{ maxWidth: 650, maxHeight: '80vh' }}>
            <div className="modal-header">
              <h3>설문지 정보 불러오기</h3>
            </div>
            <div className="modal-body" style={{ overflowY: 'auto', maxHeight: '60vh' }}>
              {importLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>불러오는 중...</div>
              ) : submissions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>설문 제출 내역이 없습니다.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                      <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 700, color: '#555' }}>이름</th>
                      <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 700, color: '#555' }}>전화번호</th>
                      <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 700, color: '#555' }}>방문일자</th>
                      <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 700, color: '#555' }}>설문지</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map(item => (
                      <tr key={item.seq}
                        onClick={() => selectSubmission(item)}
                        style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f0f7ff')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <td style={{ padding: '10px 8px', fontWeight: 600 }}>{item.name}</td>
                        <td style={{ padding: '10px 8px', fontFamily: 'monospace' }}>{item.phoneNumber}</td>
                        <td style={{ padding: '10px 8px', color: '#666', fontSize: '0.82rem' }}>{item.createdDate?.split('T')[0] ?? ''}</td>
                        <td style={{ padding: '10px 8px', color: '#4a90e2' }}>{item.templateName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowImport(false)}
                style={{ padding: '8px 20px', border: '1px solid #ccc', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
