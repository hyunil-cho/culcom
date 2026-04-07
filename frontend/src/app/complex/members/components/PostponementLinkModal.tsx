'use client';

import { useEffect, useState } from 'react';
import {
  settingsApi, externalApi, memberApi, postponementApi,
  type MemberMembershipResponse, type PostponementRequest,
} from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { Select, Textarea } from '@/components/ui/FormInput';
import { Button } from '@/components/ui/Button';
import s from './PostponementLinkModal.module.css';

interface Props {
  memberSeq: number;
  memberName: string;
  memberPhone: string;
  onClose: () => void;
}

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  '대기': { bg: '#eef2ff', color: '#4f46e5' },
  '승인': { bg: '#ecfdf5', color: '#065f46' },
  '반려': { bg: '#fef2f2', color: '#991b1b' },
};

export default function PostponementLinkModal({ memberSeq, memberName, memberPhone, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<MemberMembershipResponse[]>([]);
  const [history, setHistory] = useState<PostponementRequest[]>([]);
  const [canPostpone, setCanPostpone] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState('');

  const [copied, setCopied] = useState(false);
  const [showSms, setShowSms] = useState(false);
  const [senderNumbers, setSenderNumbers] = useState<string[]>([]);
  const [senderPhone, setSenderPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; text: string } | null>(null);

  const payload = btoa(encodeURIComponent(JSON.stringify({ memberSeq, name: memberName, phone: memberPhone })));
  const postponementUrl = `${window.location.origin}${ROUTES.PUBLIC_POSTPONEMENT}?d=${payload}`;

  useEffect(() => {
    Promise.all([
      memberApi.getMemberships(memberSeq),
      postponementApi.memberHistory(memberSeq),
    ]).then(([msRes, histRes]) => {
      const ms = msRes.success ? msRes.data : [];
      setMemberships(ms);

      const usableMemberships = ms.filter(m => m.isActive);
      if (usableMemberships.length === 0) {
        setCanPostpone(false);
        setUnavailableReason('사용 가능한 멤버십이 없습니다.');
      } else {
        const hasRemaining = usableMemberships.some(m => m.postponeTotal - m.postponeUsed > 0);
        if (!hasRemaining) {
          setCanPostpone(false);
          setUnavailableReason('연기 가능 횟수가 소진되었습니다.');
        } else {
          setCanPostpone(true);
        }
      }

      if (histRes.success) setHistory(histRes.data);
      setLoading(false);
    });
  }, [memberSeq]);

  useEffect(() => {
    if (!showSms) return;
    settingsApi.getSenderNumbers().then(res => {
      if (res.success && res.data?.length > 0) {
        setSenderNumbers(res.data);
        setSenderPhone(res.data[0]);
      }
    });
  }, [showSms]);

  useEffect(() => {
    if (showSms) {
      setMessage(`[수업 연기 요청 안내]\n\n${memberName}님, 아래 링크에서 수업 연기 요청을 진행해주세요.\n\n${postponementUrl}`);
    }
  }, [showSms, memberName, postponementUrl]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(postponementUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!message.trim() || !senderPhone) return;
    setSending(true);
    const res = await externalApi.sendSms({ senderPhone, receiverPhone: memberPhone, message });
    setSending(false);
    if (res.success && res.data?.success) {
      setSendResult({ success: true, text: `전송 완료 (${res.data.msgType})` });
    } else {
      setSendResult({ success: false, text: res.data?.message || '전송 실패' });
    }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal-content ${s.content}`}>
        <div className={s.header}>
          <h3 className={s.title}>수업 연기 요청</h3>
        </div>

        <div className={s.body}>
          <div className={s.recipientInfo}>
            <div>
              <span className={s.infoLabel}>회원</span>
              <span className={s.infoValue}>{memberName}</span>
            </div>
            <div>
              <span className={s.infoLabel}>연락처</span>
              <span className={s.infoValue}>{memberPhone}</span>
            </div>
          </div>

          {loading ? (
            <div className={s.loadingText}>멤버십 정보 확인 중...</div>
          ) : !canPostpone ? (
            /* ── 연기 불가 ── */
            <div>
              <div className={s.unavailableBox}>
                <div className={s.unavailableIcon}>!</div>
                <div className={s.unavailableTitle}>연기 요청이 불가능합니다</div>
                <div className={s.unavailableDesc}>{unavailableReason}</div>
              </div>

              {/* 멤버십 현황 */}
              <div className={s.sectionLabel}>멤버십 연기 현황</div>
              {memberships.filter(m => m.isActive).length === 0 ? (
                <div className={s.emptyText}>활성 멤버십이 없습니다.</div>
              ) : memberships.filter(m => m.isActive).map(ms => (
                <div key={ms.seq} className={s.msCard}>
                  <div className={s.msName}>{ms.membershipName}</div>
                  <div className={s.msMeta}>
                    연기: <strong>{ms.postponeUsed}/{ms.postponeTotal}회 사용</strong>
                    {' · '}기간: {ms.startDate} ~ {ms.expiryDate}
                  </div>
                </div>
              ))}

              {/* 히스토리 */}
              {history.length > 0 && (
                <>
                  <div className={s.sectionLabel}>연기 요청 히스토리 ({history.length}건)</div>
                  <div className={s.historyList}>
                    {history.map(h => {
                      const badge = STATUS_BADGE[h.status] || STATUS_BADGE['대기'];
                      return (
                        <div key={h.seq} className={s.historyItem}>
                          <div className={s.historyTop}>
                            <span className={s.historyBadge} style={{ background: badge.bg, color: badge.color }}>
                              {h.status}
                            </span>
                            <span className={s.historyDate}>{h.createdDate?.split('T')[0]}</span>
                          </div>
                          <div className={s.historyDetail}>
                            {h.startDate && h.endDate && <span>{h.startDate} ~ {h.endDate}</span>}
                          </div>
                          <div className={s.historyReason}>{h.reason}</div>
                          {h.status === '반려' && h.rejectReason && (
                            <div className={s.historyReject}>반려 사유: {h.rejectReason}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* ── 연기 가능: 링크 생성 ── */
            <div>
              {/* 멤버십 요약 */}
              <div className={s.sectionLabel}>멤버십 연기 잔여</div>
              {memberships.filter(m => m.isActive).map(ms => {
                const rem = ms.postponeTotal - ms.postponeUsed;
                return (
                  <div key={ms.seq} className={s.msCard}>
                    <div className={s.msName}>
                      {ms.membershipName}
                      <span className={rem > 0 ? s.msRemainOk : s.msRemainOut}>
                        {rem > 0 ? `${rem}회 남음` : '소진'}
                      </span>
                    </div>
                    <div className={s.msMeta}>
                      연기: {ms.postponeUsed}/{ms.postponeTotal}회 · 기간: {ms.startDate} ~ {ms.expiryDate}
                    </div>
                  </div>
                );
              })}

              <div className={s.fieldGroup} style={{ marginTop: '1rem' }}>
                <label className={s.fieldLabel}>연기 요청 URL</label>
                <div className={s.urlRow}>
                  <input readOnly value={postponementUrl} className={s.urlInput} onClick={e => (e.target as HTMLInputElement).select()} />
                  <button onClick={handleCopy} className={s.copyBtn}>
                    {copied ? '복사됨!' : '복사'}
                  </button>
                </div>
                <p className={s.urlHint}>이 링크를 고객에게 전달하면, 수업 연기 요청을 직접 진행할 수 있습니다.</p>
              </div>

              {!showSms ? (
                <button onClick={() => setShowSms(true)} className={s.smsToggleBtn}>
                  문자로 전송하기
                </button>
              ) : (
                <div className={s.smsSection}>
                  <div className={s.smsDivider}>문자 전송</div>

                  <div className={s.fieldGroup}>
                    <label className={s.fieldLabel}>발신번호</label>
                    <Select value={senderPhone} onChange={e => setSenderPhone(e.target.value)}>
                      <option value="">발신번호를 선택하세요</option>
                      {senderNumbers.map(p => <option key={p} value={p}>{p}</option>)}
                    </Select>
                  </div>

                  <div className={s.fieldGroup}>
                    <label className={s.fieldLabel}>메시지 내용</label>
                    <Textarea value={message} onChange={e => setMessage(e.target.value)}
                      rows={6} style={{ resize: 'vertical', lineHeight: 1.6 }} />
                    <div className={s.charCount}>{message.length} / 2000자</div>
                  </div>

                  {sendResult && (
                    <div className={sendResult.success ? s.resultSuccess : s.resultError}>
                      {sendResult.text}
                    </div>
                  )}

                  <button onClick={handleSend} disabled={sending || !senderPhone}
                    className={s.sendBtn}>
                    {sending ? '전송 중...' : '문자 전송'}
                  </button>
                </div>
              )}

              {/* 히스토리 (연기 가능할 때도 표시) */}
              {history.length > 0 && (
                <>
                  <div className={s.sectionLabel} style={{ marginTop: '1rem' }}>연기 요청 히스토리 ({history.length}건)</div>
                  <div className={s.historyList}>
                    {history.map(h => {
                      const badge = STATUS_BADGE[h.status] || STATUS_BADGE['대기'];
                      return (
                        <div key={h.seq} className={s.historyItem}>
                          <div className={s.historyTop}>
                            <span className={s.historyBadge} style={{ background: badge.bg, color: badge.color }}>
                              {h.status}
                            </span>
                            <span className={s.historyDate}>{h.createdDate?.split('T')[0]}</span>
                          </div>
                          <div className={s.historyDetail}>
                            {h.startDate && h.endDate && <span>{h.startDate} ~ {h.endDate}</span>}
                          </div>
                          <div className={s.historyReason}>{h.reason}</div>
                          {h.status === '반려' && h.rejectReason && (
                            <div className={s.historyReject}>반려 사유: {h.rejectReason}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className={s.footer}>
          <Button onClick={onClose} variant="secondary">닫기</Button>
        </div>
      </div>
    </div>
  );
}
