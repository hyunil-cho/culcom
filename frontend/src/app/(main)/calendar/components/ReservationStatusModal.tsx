'use client';

import { useState } from 'react';
import { calendarApi, surveyApi, type SurveyTemplate } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { encodeLinkPayload } from '@/lib/linkPayload';
import { type Reservation } from '../utils';
import s from './calendar.module.css';

export default function ReservationStatusModal({ reservation, onClose, onStatusChanged }: {
  reservation: Reservation; onClose: () => void; onStatusChanged: () => void;
}) {
  const [step, setStep] = useState<'select' | 'survey' | 'date'>('select');
  const [surveys, setSurveys] = useState<SurveyTemplate[]>([]);
  const [updating, setUpdating] = useState(false);
  const [newDate, setNewDate] = useState(reservation.date);
  const [newTime, setNewTime] = useState(reservation.time);

  const handleStatus = async (status: '연기' | '취소' | '방문') => {
    if (status === '방문') {
      setUpdating(true);
      const res = await calendarApi.updateReservationStatus(reservation.seq, status);
      if (res.success) {
        const surveyRes = await surveyApi.listTemplates();
        if (surveyRes.success) setSurveys(surveyRes.data.filter(t => t.status === '활성'));
        setStep('survey');
      }
      setUpdating(false);
      onStatusChanged();
      return;
    }
    setUpdating(true);
    const res = await calendarApi.updateReservationStatus(reservation.seq, status);
    setUpdating(false);
    if (res.success) { onStatusChanged(); onClose(); }
  };

  const handleSaveDate = async () => {
    if (!newDate || !newTime) return;
    setUpdating(true);
    const res = await calendarApi.updateReservationDate(reservation.seq, `${newDate}T${newTime}:00`);
    setUpdating(false);
    if (res.success) { onStatusChanged(); onClose(); }
  };

  const handleSurveySelect = (surveySeq: number) => {
    const payload = encodeLinkPayload({ name: reservation.name, phone: reservation.phone, reservationSeq: reservation.seq });
    window.open(ROUTES.SURVEY_FILL(surveySeq) + `?d=${payload}`, '_blank');
    onClose();
  };

  return (
    <div className={s.statusModalOverlay}>
      <div className={s.statusModalContent}>
        <div className={s.statusModalHeader}>
          <div className={s.statusModalHeaderRow}>
            <h3 className={s.statusModalTitle}>
              {step === 'select' ? '예약 상태 변경' : step === 'date' ? '예약 일시 변경' : '설문지 선택'}
            </h3>
            <button onClick={onClose} className={s.statusModalCloseBtn}>x</button>
          </div>
          <div className={s.statusModalInfo}>{reservation.time} {reservation.name} ({reservation.phone})</div>
        </div>

        <div className={s.statusModalBody}>
          {step === 'select' ? (
            <div className={s.statusBtnList}>
              <button disabled={updating} onClick={() => handleStatus('연기')} className={s.statusBtnPostpone}>
                <div>연기</div><div className={s.statusBtnSub}>예약이 다른 날짜로 미뤄진 경우</div>
              </button>
              <button disabled={updating} onClick={() => handleStatus('취소')} className={s.statusBtnCancel}>
                <div>취소</div><div className={s.statusBtnSub}>고객이 예약을 취소한 경우</div>
              </button>
              <button disabled={updating} onClick={() => handleStatus('방문')} className={s.statusBtnVisit}>
                <div>방문</div><div className={s.statusBtnSub}>고객이 실제로 방문한 경우 (설문지 작성)</div>
              </button>
              <button
                disabled={updating}
                onClick={() => setStep('date')}
                style={{
                  padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)',
                  fontWeight: 700, fontSize: 'var(--font-base)', cursor: 'pointer', textAlign: 'left',
                  border: '1.5px solid #93c5fd', background: '#eff6ff', color: '#1e40af',
                }}
              >
                <div>날짜 변경</div><div className={s.statusBtnSub}>예약 일시(날짜·시간)를 다른 시점으로 옮길 경우</div>
              </button>
            </div>
          ) : step === 'date' ? (
            // 날짜·시간 입력과 액션 버튼을 한 행에 배치 — 시간 드롭다운이 아래로 펼쳐져도
            // 우측의 버튼을 가리지 않으므로 별도의 빈 공간 없이도 UX가 깔끔함.
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <label style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                날짜
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: '1rem' }}
                />
              </label>
              <label style={{ flex: '0 0 140px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                시간
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: '1rem' }}
                />
              </label>
              <button
                onClick={() => setStep('select')}
                disabled={updating}
                style={{ padding: '10px 18px', border: '1px solid var(--border)', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: '0.95rem', height: 44 }}
              >
                뒤로
              </button>
              <button
                onClick={handleSaveDate}
                disabled={updating || !newDate || !newTime}
                style={{ padding: '10px 18px', border: 'none', background: '#4f46e5', color: '#fff', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem', height: 44 }}
              >
                {updating ? '저장 중...' : '저장'}
              </button>
            </div>
          ) : (
            <div>
              {surveys.length === 0 ? (
                <div className={s.surveyEmpty}>
                  활성화된 설문지가 없습니다.<br /><span className={s.surveyEmptySub}>설문 관리에서 설문지를 활성화해주세요.</span>
                  <div style={{ marginTop: 16 }}>
                    <button
                      onClick={() => { window.open(ROUTES.SURVEY, '_blank'); onClose(); }}
                      style={{
                        padding: '10px 18px', background: '#4f46e5', color: '#fff',
                        border: 'none', borderRadius: 6, fontSize: '0.9rem', fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      설문지 등록 페이지로 이동
                    </button>
                  </div>
                </div>
              ) : (
                <div className={s.surveyList}>
                  <p className={s.surveyHint}>고객에게 보여줄 설문지를 선택하세요.</p>
                  {surveys.map(sv => (
                    <button key={sv.seq} onClick={() => handleSurveySelect(sv.seq)} className={s.surveyBtn}>
                      <div className={s.surveyBtnName}>{sv.name}</div>
                      {sv.description && <div className={s.surveyBtnDesc}>{sv.description}</div>}
                      <div className={s.surveyBtnCount}>선택지 {sv.optionCount}개</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
