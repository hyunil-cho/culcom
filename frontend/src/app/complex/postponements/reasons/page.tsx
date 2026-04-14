'use client';

import { useState } from 'react';
import Link from 'next/link';
import { postponementApi, type PostponementReason } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { useResultModal } from '@/hooks/useResultModal';
import { useModal } from '@/hooks/useModal';
import { useFormError } from '@/hooks/useFormError';
import { useApiQuery } from '@/hooks/useApiQuery';
import { queryClient } from '@/lib/queryClient';
import FormErrorBanner from '@/components/ui/FormErrorBanner';
import ConfirmModal from '@/components/ui/ConfirmModal';
import s from './page.module.css';

export default function PostponementReasonsPage() {
  const { data: reasons = [] } = useApiQuery<PostponementReason[]>(
    ['postponementReasons'],
    () => postponementApi.reasons(),
  );
  const [showForm, setShowForm] = useState(false);
  const [reasonText, setReasonText] = useState('');
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['postponementReasons'] });
  const { run, modal } = useResultModal({ onConfirm: invalidate });
  const { error: formError, setError, clear: clearError } = useFormError();
  const deleteModal = useModal<number>();

  const handleAdd = async () => {
    if (!reasonText.trim()) { setError('사유 텍스트를 입력하세요.'); return; }
    clearError();
    const res = await run(postponementApi.addReason(reasonText.trim()), '연기사유가 추가되었습니다.');
    if (res.success) { setReasonText(''); setShowForm(false); }
  };

  const handleDelete = (seq: number) => {
    deleteModal.open(seq);
  };

  const confirmDelete = async () => {
    if (!deleteModal.data) return;
    deleteModal.close();
    await run(postponementApi.deleteReason(deleteModal.data), '연기사유가 삭제되었습니다.');
  };

  return (
    <>
      <div className={`detail-actions ${s.backRow}`}>
        <Link href={ROUTES.COMPLEX_POSTPONEMENTS} className={s.backLink}>← 연기 요청 현황으로</Link>
      </div>

      <div className={s.container}>
        <div className={s.header}>
          <h2 className={s.title}>연기사유 관리</h2>
          <span className={s.count}>총 {reasons.length}개</span>
        </div>

        <ul className={s.list}>
          {reasons.length === 0 ? (
            <li className={s.emptyItem}>등록된 연기사유가 없습니다.</li>
          ) : reasons.map((r, i) => (
            <li key={r.seq} className={s.listItem}>
              <span className={s.itemIndex}>{i + 1}</span>
              <span className={s.itemText}>{r.reason}</span>
              <button onClick={() => handleDelete(r.seq)} className={s.deleteBtn}>삭제</button>
            </li>
          ))}
        </ul>

        {!showForm ? (
          <div className={s.addArea}>
            <button onClick={() => setShowForm(true)} className={s.addBtn}>+ 연기사유 추가</button>
          </div>
        ) : (
          <div className={s.formArea}>
            <FormErrorBanner error={formError} />
            <div className={s.formGroup}>
              <label className={s.formLabel}>사유 텍스트 <span className={s.requiredMark}>*</span></label>
              <input type="text" value={reasonText} onChange={(e) => setReasonText(e.target.value)}
                placeholder="예) 개인 사정 (출장/여행)" className={s.formInput} />
            </div>
            <div className={s.formActions}>
              <button onClick={() => { setShowForm(false); setReasonText(''); }} className={s.cancelBtn}>취소</button>
              <button onClick={handleAdd} className={s.saveBtn}>저장</button>
            </div>
          </div>
        )}
      </div>

      <div className={s.noticeBox}>
        <strong>안내:</strong> 여기서 관리하는 사유 목록은 고객이 수업 연기 요청 시 선택할 수 있는 항목입니다.
        &quot;기타 (직접 입력)&quot; 옵션은 자동으로 포함됩니다.
      </div>

      {deleteModal.isOpen && (
        <ConfirmModal
          title="삭제 확인"
          confirmLabel="삭제"
          confirmColor="#e03131"
          onCancel={deleteModal.close}
          onConfirm={confirmDelete}
        >
          이 사유를 삭제하시겠습니까?
        </ConfirmModal>
      )}

      {modal}
    </>
  );
}
