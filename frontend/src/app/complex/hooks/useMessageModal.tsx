'use client';

import { useState } from 'react';
import { AttendanceViewMember, externalApi, settingsApi } from '@/lib/api';

type GroupType = 'all' | 'staff' | 'member' | 'direct';

interface MessageModalState {
  title: string;
  members: AttendanceViewMember[];
}

export function useMessageModal() {
  const [modal, setModal] = useState<MessageModalState | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [groupType, setGroupType] = useState<GroupType>('all');
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [content, setContent] = useState('');
  const [senderNumbers, setSenderNumbers] = useState<string[]>([]);
  const [selectedSender, setSelectedSender] = useState('');
  const [sending, setSending] = useState(false);

  const open = async (title: string, members: AttendanceViewMember[]) => {
    setModal({ title, members });
    setStep(1);
    setContent('');
    setChecked({});
    try {
      const res = await settingsApi.getSenderNumbers();
      if (res.success && res.data.length > 0) {
        setSenderNumbers(res.data);
        setSelectedSender(res.data[0]);
      }
    } catch { /* ignore */ }
  };

  const close = () => setModal(null);

  const selectGroup = (type: GroupType) => {
    if (!modal) return;
    setGroupType(type);
    const next: Record<number, boolean> = {};
    modal.members.forEach(m => {
      if (type === 'all' || type === 'direct') next[m.memberSeq] = type !== 'direct';
      else if (type === 'staff' && m.staff) next[m.memberSeq] = true;
      else if (type === 'member' && !m.staff) next[m.memberSeq] = true;
    });
    setChecked(next);
    setStep(2);
  };

  const send = async () => {
    if (!modal || !content.trim()) { alert('메시지 내용을 입력해주세요.'); return; }
    const recipients = modal.members.filter(m => checked[m.memberSeq]);
    if (recipients.length === 0) { alert('수신자를 최소 한 명 이상 선택해주세요.'); return; }
    if (!selectedSender) { alert('발신번호가 설정되지 않았습니다.'); return; }

    setSending(true);
    let successCount = 0;
    for (const m of recipients) {
      try {
        const res = await externalApi.sendSms({ senderPhone: selectedSender, receiverPhone: m.phoneNumber, message: content });
        if (res.success) successCount++;
      } catch { /* ignore */ }
    }
    setSending(false);
    alert(`${recipients.length}명 중 ${successCount}명에게 메시지를 발송했습니다.`);
    close();
  };

  const selectAll = () => {
    const next: Record<number, boolean> = {};
    Object.keys(checked).forEach(k => next[Number(k)] = true);
    setChecked(next);
  };

  const rendered = modal ? (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
      <div className="modal-content" style={{ maxWidth: step === 2 ? 850 : 500 }}>
        <div className="modal-header" style={{ background: '#2c3e50', borderColor: '#2c3e50' }}>
          <h3>{step === 1 ? '메시지 발송 대상 선택' : '메시지 작성'}</h3>
        </div>
        <div className="modal-body">
          {step === 1 ? (
            <div style={{ padding: 10 }}>
              <div style={{ background: '#f1f7fe', padding: 12, borderRadius: 8, marginBottom: 20, textAlign: 'center', border: '1px solid #d0e3ff' }}>
                <span style={{ color: '#4a90e2', fontWeight: 700, fontSize: '1rem' }}>{modal.title}</span>
              </div>
              <p style={{ marginBottom: 20, color: '#666', fontSize: '0.85rem', textAlign: 'center' }}>발송할 수신 그룹을 선택해주세요.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                {([
                  { key: 'all' as const, icon: '👥', label: '전체', desc: '모든 인원 대상' },
                  { key: 'staff' as const, icon: '⭐', label: '스태프', desc: '스태프 대상' },
                  { key: 'member' as const, icon: '👤', label: '회원', desc: '일반 회원 대상' },
                  { key: 'direct' as const, icon: '✅', label: '직접 선택', desc: '개별 선택 발송' },
                ]).map(g => (
                  <button key={g.key} type="button" onClick={() => selectGroup(g.key)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 15, border: '1px solid #dee2e6', borderRadius: 8, background: '#fff', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <span style={{ fontSize: '1.4rem' }}>{g.icon}</span>
                    <strong style={{ fontSize: '0.9rem' }}>{g.label}</strong>
                    <span style={{ fontSize: '0.75rem', color: '#888' }}>{g.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: 420, padding: 10 }}>
              <div style={{ background: '#f1f7fe', padding: '10px 15px', borderRadius: 8, marginBottom: 15, border: '1px solid #d0e3ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#4a90e2', fontWeight: 700, fontSize: '0.95rem' }}>{modal.title}</span>
                <span style={{ background: '#4a90e2', color: 'white', padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>
                  {{ all: '전체', staff: '스태프', member: '회원', direct: '직접 선택' }[groupType]}
                </span>
              </div>
              <div style={{ marginBottom: 12 }}>
                <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#4a90e2', cursor: 'pointer', fontWeight: 600, padding: 0, fontSize: '0.85rem' }}>
                  ← 다시 그룹 선택하기
                </button>
              </div>
              <div style={{ display: 'flex', flex: 1, gap: 15, minHeight: 0 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontWeight: 600, marginBottom: 6, display: 'block', fontSize: '0.85rem', color: '#555' }}>메시지 내용</label>
                  <textarea value={content} onChange={e => setContent(e.target.value)}
                    style={{ flex: 1, width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 6, resize: 'none', fontFamily: 'inherit', fontSize: '0.9rem', lineHeight: 1.5 }}
                    placeholder="보낼 내용을 입력하세요..." />
                  <div style={{ marginTop: 5, fontSize: '0.75rem', color: '#888', textAlign: 'right' }}>
                    <span style={{ fontWeight: 600, color: '#4a90e2' }}>{new Blob([content]).size}</span> / 2000 bytes
                  </div>
                </div>
                <div style={{ width: 240, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #eee', paddingLeft: 15 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#555' }}>
                      수신자 (<span style={{ color: '#4a90e2' }}>{Object.values(checked).filter(Boolean).length}</span>명)
                    </label>
                    <button type="button" onClick={selectAll}
                      style={{ background: 'none', border: 'none', color: '#4a90e2', fontSize: '0.7rem', cursor: 'pointer', padding: 0, fontWeight: 600 }}>전체선택</button>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 6, padding: 3, background: '#fafafa' }}>
                    {modal.members.filter(m => m.memberSeq in checked).map(m => (
                      <div key={m.memberSeq} style={{ padding: '8px 10px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem' }}>
                        <input type="checkbox" checked={checked[m.memberSeq] ?? false}
                          onChange={e => setChecked(prev => ({ ...prev, [m.memberSeq]: e.target.checked }))}
                          style={{ width: 16, height: 16, cursor: 'pointer' }} />
                        <span style={{ flex: 1 }}>
                          <strong>{m.name}</strong>
                          {m.staff && <small style={{ color: '#e67e22', marginLeft: 5 }}>[STAFF]</small>}
                        </span>
                        <span style={{ color: '#666', fontFamily: 'monospace', fontSize: '0.8rem' }}>{m.phoneNumber}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          {step === 2 && (
            <button onClick={send} disabled={sending}
              style={{ padding: '8px 20px', border: 'none', borderRadius: 6, background: '#4a90e2', color: 'white', cursor: 'pointer', fontWeight: 600, opacity: sending ? 0.6 : 1 }}>
              {sending ? '발송 중...' : '메시지 발송'}
            </button>
          )}
          <button onClick={close} style={{ padding: '8px 20px', border: '1px solid #ccc', borderRadius: 6, background: 'white', cursor: 'pointer' }}>
            {step === 1 ? '취소' : '닫기'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { open, rendered };
}
