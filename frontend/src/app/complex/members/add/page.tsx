'use client';

import { Suspense, useState } from 'react';
import { surveyApi, type SurveySubmissionItem } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import MemberForm from '../MemberForm';
import { useMemberForm } from '../useMemberForm';
import { Button } from '@/components/ui/Button';
import TransferMismatchModal from '../components/TransferMismatchModal';
import { useSignupChannels } from '@/lib/useSignupChannels';

export default function MemberAddPage() {
  return <Suspense fallback={null}><MemberAddPageInner /></Suspense>;
}

function MemberAddPageInner() {
  const {
    form, setForm, membership, classAssign, setClassAssign,
    staffForm, setStaffForm, staffClassAssign, setStaffClassAssign,
    handleSubmit, modal,
    showTransferMismatch, confirmMismatchAndSubmit, dismissMismatch,
  } = useMemberForm();

  const { channels } = useSignupChannels();
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

  const selectSubmission = async (item: SurveySubmissionItem) => {
    setShowImport(false);
    const detailRes = await surveyApi.getSubmission(item.seq);
    if (!detailRes.success) {
      setForm(prev => ({ ...prev, name: item.name, phoneNumber: item.phoneNumber }));
      return;
    }
    const detail = detailRes.data;
    const channelLabels = channels.map(c => c.label);
    const signupChannel = detail.adSource && channelLabels.includes(detail.adSource)
      ? detail.adSource : (detail.adSource ?? '');
    const info = detail.customerComment ?? '';
    setForm(prev => ({ ...prev, name: detail.name, phoneNumber: detail.phoneNumber, signupChannel, info }));
  };

  return (
    <>
      <MemberForm form={form} onChange={setForm} onSubmit={handleSubmit}
        backHref={ROUTES.COMPLEX_MEMBERS} submitLabel="등록"
        membershipSection={membership.formSection} membershipEnabled={membership.enabled}
        classAssign={classAssign} onClassAssignChange={setClassAssign}
        staffForm={staffForm} onStaffChange={setStaffForm}
        staffClassAssign={staffClassAssign} onStaffClassAssignChange={setStaffClassAssign}
        headerExtra={
          <Button variant="secondary" onClick={openImport}>불러오기</Button>
        }
      />
      {modal}

      {/* 양도 이름/전화번호 불일치 경고 모달 */}
      {showTransferMismatch && membership.selectedTransfer && (
        <TransferMismatchModal
          memberName={form.name}
          memberPhone={form.phoneNumber}
          transfer={membership.selectedTransfer}
          onConfirm={confirmMismatchAndSubmit}
          onCancel={dismissMismatch}
        />
      )}

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
