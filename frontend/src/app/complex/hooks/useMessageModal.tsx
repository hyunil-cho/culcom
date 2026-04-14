'use client';

import { useState } from 'react';
import { AttendanceViewMember, externalApi, smsEventApi } from '@/lib/api';
import ModalOverlay from '@/components/ui/ModalOverlay';
import styles from './useMessageModal.module.css';

type GroupType = 'all' | 'staff' | 'member' | 'direct';

interface MessageModalState {
  title: string;
  members: AttendanceViewMember[];
}

interface SendResult {
  name: string;
  phoneNumber: string;
  success: boolean;
  reason?: string;
}

const memberKey = (m: AttendanceViewMember) => `${m.staff ? 's' : 'm'}-${m.memberSeq}`;

export function useMessageModal() {
  const [modal, setModal] = useState<MessageModalState | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [groupType, setGroupType] = useState<GroupType>('all');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [content, setContent] = useState('');
  const [senderNumbers, setSenderNumbers] = useState<string[]>([]);
  const [selectedSender, setSelectedSender] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResults, setSendResults] = useState<SendResult[] | null>(null);
  const [validationError, setValidationError] = useState('');

  const open = async (title: string, members: AttendanceViewMember[]) => {
    setModal({ title, members });
    setStep(1);
    setContent('');
    setChecked({});
    setSendResults(null);
    setValidationError('');
    try {
      const res = await smsEventApi.getSenderNumbers();
      if (res.success && res.data.length > 0) {
        setSenderNumbers(res.data);
        setSelectedSender(res.data[0]);
      }
    } catch { /* ignore */ }
  };

  const close = () => { setModal(null); setSendResults(null); };

  const selectGroup = (type: GroupType) => {
    if (!modal) return;
    setGroupType(type);
    const next: Record<string, boolean> = {};
    modal.members.forEach(m => {
      const belongs =
        type === 'all' || type === 'direct'
          ? true
          : type === 'staff'
            ? m.staff
            : !m.staff;
      if (belongs) {
        next[memberKey(m)] = type !== 'direct';
      }
    });
    setChecked(next);
    setStep(2);
  };

  const visibleMembers = modal?.members.filter(m => memberKey(m) in checked) ?? [];
  const checkedCount = Object.values(checked).filter(Boolean).length;

  const send = async () => {
    setValidationError('');
    if (!modal || !content.trim()) { setValidationError('메시지 내용을 입력해주세요.'); return; }
    const recipients = visibleMembers.filter(m => checked[memberKey(m)]);
    if (recipients.length === 0) { setValidationError('수신자를 최소 한 명 이상 선택해주세요.'); return; }
    if (!selectedSender) { setValidationError('발신번호가 설정되지 않았습니다.'); return; }

    setSending(true);
    const results: SendResult[] = [];

    for (const m of recipients) {
      try {
        const res = await externalApi.sendSms({
          senderPhone: selectedSender,
          receiverPhone: m.phoneNumber,
          message: content,
        });
        if (res.success) {
          results.push({ name: m.name, phoneNumber: m.phoneNumber, success: true });
        } else {
          results.push({ name: m.name, phoneNumber: m.phoneNumber, success: false, reason: res.message || '발송 실패' });
        }
      } catch (e) {
        results.push({ name: m.name, phoneNumber: m.phoneNumber, success: false, reason: e instanceof Error ? e.message : '네트워크 오류' });
      }
    }

    setSending(false);
    setSendResults(results);
  };

  const selectAll = () => {
    const next: Record<string, boolean> = {};
    for (const key of Object.keys(checked)) next[key] = true;
    setChecked(next);
  };

  const deselectAll = () => {
    const next: Record<string, boolean> = {};
    for (const key of Object.keys(checked)) next[key] = false;
    setChecked(next);
  };

  // ── 결과 모달 ──
  const resultModal = sendResults ? (() => {
    const successes = sendResults.filter(r => r.success);
    const failures = sendResults.filter(r => !r.success);
    return (
      <ModalOverlay size="md" onClose={close}>
          <div className={`modal-header ${styles.headerDark}`}>
            <h3>메시지 발송 결과</h3>
          </div>
          <div className="modal-body" style={{ padding: '16px 20px' }}>
            <div className={styles.resultStats}>
              <div className={styles.resultStatSuccess}>
                <div className={`${styles.resultStatNumber} ${styles.successColor}`}>{successes.length}</div>
                <div className={`${styles.resultStatLabel} ${styles.successColor}`}>발송 성공</div>
              </div>
              <div className={failures.length > 0 ? styles.resultStatFail : styles.resultStatFailNone}>
                <div className={`${styles.resultStatNumber} ${failures.length > 0 ? styles.failColor : styles.mutedColor}`}>{failures.length}</div>
                <div className={`${styles.resultStatLabel} ${failures.length > 0 ? styles.failColor : styles.mutedColor}`}>발송 실패</div>
              </div>
            </div>

            <div className={styles.resultScrollArea}>
              {successes.length > 0 && (
                <div className={styles.resultSection}>
                  <div className={`${styles.resultSectionTitle} ${styles.successColor}`}>발송 성공 ({successes.length}명)</div>
                  {successes.map((r, i) => (
                    <div key={i} className={styles.resultRow}>
                      <span className={`${styles.resultTag} ${styles.successColor}`}>OK</span>
                      <span className={styles.resultName}>{r.name}</span>
                      <span className={styles.resultPhone}>{r.phoneNumber}</span>
                    </div>
                  ))}
                </div>
              )}

              {failures.length > 0 && (
                <div>
                  <div className={`${styles.resultSectionTitle} ${styles.failColor}`}>발송 실패 ({failures.length}명)</div>
                  {failures.map((r, i) => (
                    <div key={i} className={styles.resultRowFail}>
                      <span className={`${styles.resultTag} ${styles.failColor}`}>FAIL</span>
                      <span className={styles.resultName}>{r.name}</span>
                      <span className={styles.resultPhone}>{r.phoneNumber}</span>
                      <span className={styles.resultReason}>({r.reason})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button onClick={close} className={styles.confirmBtn}>확인</button>
          </div>
      </ModalOverlay>
    );
  })() : null;

  // ── 발송 폼 모달 ──
  const formModal = modal && !sendResults ? (
    <ModalOverlay size={step === 2 ? 'xl' : 'md'} onClose={close}>
        <div className={`modal-header ${styles.headerDark}`}>
          <h3>{step === 1 ? '메시지 발송 대상 선택' : '메시지 작성'}</h3>
        </div>
        <div className="modal-body">
          {step === 1 ? (
            <div className={styles.step1Body}>
              <div className={styles.titleBanner}>
                <span className={styles.titleBannerText}>{modal.title}</span>
              </div>
              <p className={styles.groupDesc}>발송할 수신 그룹을 선택해주세요.</p>
              <div className={styles.groupGrid}>
                {([
                  { key: 'all' as const, icon: '👥', label: '전체', desc: '모든 인원 대상' },
                  { key: 'staff' as const, icon: '⭐', label: '스태프', desc: '스태프 대상' },
                  { key: 'member' as const, icon: '👤', label: '회원', desc: '일반 회원 대상' },
                  { key: 'direct' as const, icon: '✅', label: '직접 선택', desc: '개별 선택 발송' },
                ]).map(g => (
                  <button key={g.key} type="button" onClick={() => selectGroup(g.key)} className={styles.groupBtn}>
                    <span className={styles.groupBtnIcon}>{g.icon}</span>
                    <strong className={styles.groupBtnLabel}>{g.label}</strong>
                    <span className={styles.groupBtnDesc}>{g.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.step2Body}>
              <div className={styles.step2Banner}>
                <span className={styles.step2Title}>{modal.title}</span>
                <span className={styles.step2Badge}>
                  {{ all: '전체', staff: '스태프', member: '회원', direct: '직접 선택' }[groupType]}
                </span>
              </div>
              <button type="button" onClick={() => setStep(1)} className={styles.backBtn}>
                ← 다시 그룹 선택하기
              </button>
              <div className={styles.step2Content}>
                <div className={styles.messageCol}>
                  <label className={styles.colLabel}>메시지 내용</label>
                  <textarea value={content} onChange={e => setContent(e.target.value)}
                    className={styles.textarea}
                    placeholder="보낼 내용을 입력하세요..." />
                  <div className={styles.byteCount}>
                    <span className={styles.byteCountValue}>{new Blob([content]).size}</span> / 2000 bytes
                  </div>
                </div>
                <div className={styles.recipientCol}>
                  <div className={styles.recipientHeader}>
                    <label className={styles.colLabel}>
                      수신자 (<span className={styles.recipientCount}>{checkedCount}</span>/{visibleMembers.length}명)
                    </label>
                    <div className={styles.recipientActions}>
                      <button type="button" onClick={selectAll} className={styles.linkBtn}>전체선택</button>
                      <button type="button" onClick={deselectAll} className={styles.linkBtnMuted}>해제</button>
                    </div>
                  </div>
                  <div className={styles.recipientList}>
                    {visibleMembers.map(m => {
                      const key = memberKey(m);
                      return (
                        <div key={key} className={styles.recipientItem}>
                          <input type="checkbox" checked={checked[key] ?? false}
                            onChange={e => setChecked(prev => ({ ...prev, [key]: e.target.checked }))}
                            className={styles.checkbox} />
                          <span className={styles.nameCol}>
                            <strong>{m.name}</strong>
                            {m.staff && <small className={styles.staffTag}>[STAFF]</small>}
                          </span>
                          <span className={styles.phoneCol}>{m.phoneNumber}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        {validationError && (
          <div className={styles.validationError}>{validationError}</div>
        )}
        <div className="modal-footer">
          {step === 2 && (
            <button onClick={send} disabled={sending} className={styles.sendBtn}>
              {sending ? `발송 중... (${checkedCount}명)` : '메시지 발송'}
            </button>
          )}
          <button onClick={close} disabled={sending} className={styles.cancelBtn}>
            {step === 1 ? '취소' : '닫기'}
          </button>
        </div>
    </ModalOverlay>
  ) : null;

  const rendered = <>{formModal}{resultModal}</>;

  return { open, rendered };
}