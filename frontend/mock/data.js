/**
 * 목 데이터 초기 시드.
 * 모든 데이터는 메모리에만 존재하며, 서버 재시작 시 초기화됨.
 */

let _seq = 100;
const nextSeq = () => ++_seq;
const now = () => new Date().toISOString();

// ── Auth / Session ──
const session = {
  userSeq: 1,
  userId: 'root',
  name: '관리자',
  role: 'ROOT',
  selectedBranchSeq: 1,
  selectedBranchName: '본점',
};

// ── Branches ──
const branches = [
  { seq: 1, branchName: '본점', alias: 'main', branchManager: '홍길동', address: '서울시 강남구', createdDate: '2024-01-01' },
  { seq: 2, branchName: '강남점', alias: 'gangnam', branchManager: '김철수', address: '서울시 서초구', createdDate: '2024-03-01' },
];

// ── Time Slots ──
const timeSlots = [
  { seq: 1, name: '월수 오전', daysOfWeek: '월,수', startTime: '10:00', endTime: '12:00', createdDate: now() },
  { seq: 2, name: '화목 오후', daysOfWeek: '화,목', startTime: '14:00', endTime: '16:00', createdDate: now() },
  { seq: 3, name: '주말 집중', daysOfWeek: '토', startTime: '13:00', endTime: '17:00', createdDate: now() },
];

// ── Staffs ──
const staffs = [
  { seq: 1, name: 'Alice Kim', phoneNumber: '01011112222', email: 'alice@test.com', subject: '영어', status: '재직', joinDate: '2024-01-15' },
  { seq: 2, name: 'Bob Park', phoneNumber: '01033334444', email: 'bob@test.com', subject: '일본어', status: '재직', joinDate: '2024-02-01' },
];

// ── Classes ──
const classes = [
  { seq: 1, name: '레벨1-1반', description: '초급반', capacity: 10, sortOrder: 0, timeSlotSeq: 1, timeSlotName: '월수 오전', staffSeq: 1, staffName: 'Alice Kim', createdDate: now() },
  { seq: 2, name: '레벨1-2반', description: '초급반B', capacity: 8, sortOrder: 1, timeSlotSeq: 1, timeSlotName: '월수 오전', staffSeq: null, staffName: null, createdDate: now() },
  { seq: 3, name: '프리토킹 A반', description: '자유 토론', capacity: 12, sortOrder: 0, timeSlotSeq: 2, timeSlotName: '화목 오후', staffSeq: 2, staffName: 'Bob Park', createdDate: now() },
  { seq: 4, name: '주말 집중반', description: '주말 집중', capacity: 15, sortOrder: 0, timeSlotSeq: 3, timeSlotName: '주말 집중', staffSeq: 1, staffName: 'Alice Kim', createdDate: now() },
];

// ── Members ──
const members = [
  { seq: 1, name: '이영희', phoneNumber: '01012345678', level: '3-', language: '영어', info: '대학생', chartNumber: 'C001', signupChannel: '인스타그램', interviewer: 'Alice Kim', comment: '열정적', joinDate: '2024-06-01T00:00:00', createdDate: '2024-06-01T10:00:00', lastUpdateDate: null },
  { seq: 2, name: '박민수', phoneNumber: '01087654321', level: '2+', language: '영어', info: '직장인', chartNumber: 'C002', signupChannel: '네이버 검색', interviewer: 'Bob Park', comment: '', joinDate: '2024-07-15T00:00:00', createdDate: '2024-07-15T14:00:00', lastUpdateDate: null },
  { seq: 3, name: '김지은', phoneNumber: '01055556666', level: '1', language: '일본어', info: '프리랜서', chartNumber: 'C003', signupChannel: '지인 소개', interviewer: 'Alice Kim', comment: '일본어 초급', joinDate: '2024-08-01T00:00:00', createdDate: '2024-08-01T09:00:00', lastUpdateDate: '2024-09-01T11:00:00' },
];

// ── Memberships ──
const memberships = [
  { seq: 1, name: '3개월 주2회', duration: 90, count: 24, price: 450000, createdDate: now(), lastUpdateDate: null },
  { seq: 2, name: '6개월 주3회', duration: 180, count: 72, price: 800000, createdDate: now(), lastUpdateDate: null },
];

// ── Member-Membership 매핑 ──
const memberMemberships = [
  { seq: 1, memberSeq: 1, membershipSeq: 1, membershipName: '3개월 주2회', startDate: '2024-06-01', expiryDate: '2024-08-30', totalCount: 24, usedCount: 18, postponeTotal: 3, postponeUsed: 0, price: '450,000', depositAmount: null, paymentMethod: '카드', paymentDate: '2024-06-01T10:00:00', status: '활성', createdDate: now() },
  { seq: 2, memberSeq: 2, membershipSeq: 2, membershipName: '6개월 주3회', startDate: '2024-07-15', expiryDate: '2025-01-12', totalCount: 72, usedCount: 30, postponeTotal: 3, postponeUsed: 1, price: '800,000', depositAmount: null, paymentMethod: '이체(법인통장)', paymentDate: '2024-07-15T14:00:00', status: '활성', createdDate: now() },
];

// ── Member-Class 매핑 ──
const memberClassMappings = [
  { seq: 1, memberSeq: 1, classSeq: 1 },
  { seq: 2, memberSeq: 2, classSeq: 3 },
  { seq: 3, memberSeq: 3, classSeq: 4 },
];

// ── Attendance View (간략 목) ──
function buildAttendanceView() {
  return timeSlots.map(ts => {
    const slotClasses = classes.filter(c => c.timeSlotSeq === ts.seq);
    return {
      timeSlotSeq: ts.seq,
      slotName: `${ts.name} ${ts.daysOfWeek} (${ts.startTime} ~ ${ts.endTime})`,
      classes: slotClasses.map(c => {
        const staff = c.staffSeq ? staffs.find(s => s.seq === c.staffSeq) : null;
        const mappedMembers = memberClassMappings
          .filter(m => m.classSeq === c.seq)
          .map(m => members.find(mb => mb.seq === m.memberSeq))
          .filter(Boolean);

        const memberList = [];
        if (staff) {
          memberList.push({ memberSeq: staff.seq, name: staff.name, phoneNumber: staff.phoneNumber, staff: true, postponed: false, status: '' });
        }
        mappedMembers.forEach(mb => {
          const mm = memberMemberships.find(x => x.memberSeq === mb.seq);
          memberList.push({
            memberSeq: mb.seq, name: mb.name, phoneNumber: mb.phoneNumber,
            staff: false, postponed: mm?.status === '연기', status: mm?.status === '연기' ? '△' : '',
          });
        });
        return { classSeq: c.seq, name: c.name, capacity: c.capacity, members: memberList };
      }),
    };
  });
}

// ── Customers (간략) ──
const customers = [
  { seq: 1, name: '홍길동', phoneNumber: '01099998888', status: '예약 확정', callCount: 2, lastUpdateDate: now() },
];

// ── Dashboard ──
const dashboard = {
  totalCustomers: 150, newToday: 3, reservationToday: 5,
  totalMembers: members.length, totalClasses: classes.length,
  recentReservations: [], callerStats: [],
};

module.exports = {
  session, branches, timeSlots, staffs, classes, members,
  memberships, memberMemberships, memberClassMappings,
  customers, dashboard,
  buildAttendanceView, nextSeq, now,
};
