'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { staffApi, type ComplexStaff, type ComplexClass, attendanceViewApi, type StaffAttendanceRateSummary } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { Button } from '@/components/ui/Button';
import DataTable, { type Column } from '@/components/ui/DataTable';
import { useAttendanceHistory } from '@/lib/useAttendanceHistory';
import { useClassSlots } from '../hooks/useClassSlots';
import { useModal } from '@/hooks/useModal';

function StaffTeamModal({ staff, classes, onClose }: {
  staff: ComplexStaff;
  classes: ComplexClass[];
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ width: '90%', maxWidth: 560 }}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>{staff.name} - 팀현황 ({classes.length}개)</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer' }}>&times;</button>
        </div>
        <div className="modal-body" style={{ padding: '0 1rem 1rem' }}>
          {classes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>배정된 팀이 없습니다.</div>
          ) : (
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 12px' }}>팀(수업)명</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px' }}>시간대</th>
                </tr>
              </thead>
              <tbody>
                {classes.map(c => (
                  <tr key={c.seq}>
                    <td style={{ padding: '8px 12px' }}>{c.name}</td>
                    <td style={{ padding: '8px 12px' }}>{c.timeSlotName ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>닫기</Button>
        </div>
      </div>
    </div>
  );
}

export default function StaffsPage() {
  const router = useRouter();
  const [staffs, setStaffs] = useState<ComplexStaff[]>([]);
  const [rateMap, setRateMap] = useState<Record<number, StaffAttendanceRateSummary>>({});
  const [rateMap1m, setRateMap1m] = useState<Record<number, StaffAttendanceRateSummary>>({});
  const teamModal = useModal<ComplexStaff>();
  const { column: historyColumn, modal: historyModal } = useAttendanceHistory<ComplexStaff>('staff');
  const { allClasses } = useClassSlots();

  useEffect(() => {
    staffApi.list().then(res => setStaffs(res.data));
    attendanceViewApi.staffAttendanceRates().then(res => {
      if (res.success) {
        const map: Record<number, StaffAttendanceRateSummary> = {};
        for (const r of res.data) map[r.staffSeq] = r;
        setRateMap(map);
      }
    });
    attendanceViewApi.staffAttendanceRates(1).then(res => {
      if (res.success) {
        const map: Record<number, StaffAttendanceRateSummary> = {};
        for (const r of res.data) map[r.staffSeq] = r;
        setRateMap1m(map);
      }
    });
  }, []);

  const getClassesForStaff = (staffSeq: number) =>
    allClasses.filter(c => c.staffSeq === staffSeq);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      '재직': 'badge-success', '휴직': 'badge-warning', '퇴직': 'badge-danger',
    };
    return <span className={`badge ${map[status] ?? ''}`}>{status}</span>;
  };

  const columns: Column<ComplexStaff>[] = [
    { header: '이름', render: (s) => s.name },
    { header: '전화번호', render: (s) => s.phoneNumber ?? '-' },
    { header: '팀현황', render: (s) => {
      const count = getClassesForStaff(s.seq).length;
      return (
        <button onClick={(e) => { e.stopPropagation(); teamModal.open(s); }}
          style={{ background: '#4a90e2', color: '#fff', border: 'none', borderRadius: 3,
            padding: '4px 10px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}>
          {count}개 팀
        </button>
      );
    }},
    { header: '상태', render: (s) => statusBadge(s.status) },
    historyColumn,
    { header: '출석율 (3개월)', render: (s) => {
      const rate = rateMap[s.seq];
      if (!rate || rate.totalCount === 0) return '-';
      const pct = Math.round((rate.presentCount / rate.totalCount) * 100);
      return `${rate.presentCount}/${rate.totalCount} (${pct}%)`;
    }},
  ];

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title" style={{ marginBottom: 0 }}>스태프 관리</h2>
        <Button onClick={() => router.push(`${ROUTES.COMPLEX_MEMBERS_ADD}?staff=true`)}>+ 스태프 추가</Button>
      </div>

      <DataTable
        columns={columns}
        data={staffs}
        rowKey={(s) => s.seq}
        onRowClick={(s) => router.push(`${ROUTES.COMPLEX_MEMBER_EDIT(s.seq)}?staff=true`)}
        rowStyle={(s) => {
          const rate = rateMap1m[s.seq];
          if (rate && rate.totalCount > 0 && (rate.presentCount / rate.totalCount) < 0.5) {
            return { backgroundColor: '#fff3cd' };
          }
          return undefined;
        }}
      />

      {historyModal}
      {teamModal.isOpen && (
        <StaffTeamModal
          staff={teamModal.data!}
          classes={getClassesForStaff(teamModal.data!.seq)}
          onClose={teamModal.close}
        />
      )}
    </>
  );
}
