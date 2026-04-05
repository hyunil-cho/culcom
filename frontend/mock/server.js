/**
 * 프론트엔드 로컬 목 서버.
 * 포트 8081에서 실행 — Next.js rewrite 대상과 동일.
 * 모든 데이터는 인메모리, 서버 재시작 시 초기화.
 *
 * 사용법: npm run dev:mock
 */

const express = require('express');
const data = require('./data');
const app = express();

app.use(express.json());

// ── 유틸 ──
const ok = (d, message) => ({ success: true, message: message || null, data: d });
const err = (message) => ({ success: false, message, data: null });
const paginate = (arr, page, size) => {
  const start = page * size;
  return {
    content: arr.slice(start, start + size),
    totalElements: arr.length,
    totalPages: Math.ceil(arr.length / size),
    number: page,
    size,
  };
};

// ── Auth ──
app.post('/api/auth/login', (_, res) => res.json(ok(data.session)));
app.get('/api/auth/me', (_, res) => res.json(ok(data.session)));
app.post('/api/auth/logout', (_, res) => res.json(ok(null)));
app.post('/api/auth/branch/:seq', (req, res) => {
  data.session.selectedBranchSeq = Number(req.params.seq);
  const b = data.branches.find(b => b.seq === Number(req.params.seq));
  if (b) data.session.selectedBranchName = b.branchName;
  res.json(ok(null));
});

// ── Branches ──
app.get('/api/branches', (_, res) => res.json(ok(data.branches)));
app.get('/api/branches/:seq', (req, res) => {
  const item = data.branches.find(b => b.seq === Number(req.params.seq));
  item ? res.json(ok(item)) : res.status(404).json(err('not found'));
});
app.post('/api/branches', (req, res) => {
  const item = { seq: data.nextSeq(), ...req.body, createdDate: data.now() };
  data.branches.push(item);
  res.json(ok(item));
});
app.put('/api/branches/:seq', (req, res) => {
  const item = data.branches.find(b => b.seq === Number(req.params.seq));
  if (!item) return res.status(404).json(err('not found'));
  Object.assign(item, req.body);
  res.json(ok(item));
});
app.delete('/api/branches/:seq', (req, res) => {
  const idx = data.branches.findIndex(b => b.seq === Number(req.params.seq));
  if (idx >= 0) data.branches.splice(idx, 1);
  res.json(ok(null));
});

// ── Time Slots ──
app.get('/api/complex/timeslots', (_, res) => res.json(ok(data.timeSlots)));
app.post('/api/complex/timeslots', (req, res) => {
  const item = { seq: data.nextSeq(), ...req.body, createdDate: data.now() };
  data.timeSlots.push(item);
  res.json(ok(item));
});
app.put('/api/complex/timeslots/:seq', (req, res) => {
  const item = data.timeSlots.find(t => t.seq === Number(req.params.seq));
  if (!item) return res.status(404).json(err('not found'));
  Object.assign(item, req.body);
  res.json(ok(item));
});
app.delete('/api/complex/timeslots/:seq', (req, res) => {
  const idx = data.timeSlots.findIndex(t => t.seq === Number(req.params.seq));
  if (idx >= 0) data.timeSlots.splice(idx, 1);
  res.json(ok(null));
});

// ── Staffs ──
app.get('/api/complex/staffs', (_, res) => res.json(ok(data.staffs)));
app.get('/api/complex/staffs/:seq', (req, res) => {
  const item = data.staffs.find(s => s.seq === Number(req.params.seq));
  item ? res.json(ok(item)) : res.status(404).json(err('not found'));
});
app.post('/api/complex/staffs', (req, res) => {
  const item = { seq: data.nextSeq(), ...req.body, status: '재직', createdDate: data.now() };
  data.staffs.push(item);
  res.json(ok(item));
});
app.put('/api/complex/staffs/:seq', (req, res) => {
  const item = data.staffs.find(s => s.seq === Number(req.params.seq));
  if (!item) return res.status(404).json(err('not found'));
  Object.assign(item, req.body);
  res.json(ok(item));
});
app.delete('/api/complex/staffs/:seq', (req, res) => {
  const idx = data.staffs.findIndex(s => s.seq === Number(req.params.seq));
  if (idx >= 0) data.staffs.splice(idx, 1);
  res.json(ok(null));
});
app.get('/api/complex/staffs/:seq/refund', (_, res) => res.json(ok(null)));
app.post('/api/complex/staffs/:seq/refund', (req, res) => res.json(ok(req.body)));
app.delete('/api/complex/staffs/:seq/refund', (_, res) => res.json(ok(null)));

// ── Classes (페이징) ──
app.get('/api/complex/classes', (req, res) => {
  const page = Number(req.query.page || 0);
  const size = Number(req.query.size || 20);
  const keyword = req.query.keyword || '';
  let filtered = data.classes;
  if (keyword) filtered = filtered.filter(c => c.name.includes(keyword));
  res.json(ok(paginate(filtered, page, size)));
});
app.get('/api/complex/classes/:seq', (req, res) => {
  const item = data.classes.find(c => c.seq === Number(req.params.seq));
  item ? res.json(ok(item)) : res.status(404).json(err('not found'));
});
app.post('/api/complex/classes', (req, res) => {
  const ts = data.timeSlots.find(t => t.seq === req.body.timeSlotSeq);
  const st = req.body.staffSeq ? data.staffs.find(s => s.seq === req.body.staffSeq) : null;
  const item = {
    seq: data.nextSeq(), ...req.body,
    timeSlotName: ts?.name || null, staffName: st?.name || null,
    sortOrder: req.body.sortOrder ?? data.classes.length,
    createdDate: data.now(),
  };
  data.classes.push(item);
  res.json(ok(item, '수업 추가 완료'));
});
app.put('/api/complex/classes/:seq', (req, res) => {
  const item = data.classes.find(c => c.seq === Number(req.params.seq));
  if (!item) return res.status(404).json(err('not found'));
  Object.assign(item, req.body);
  if (req.body.timeSlotSeq) {
    const ts = data.timeSlots.find(t => t.seq === req.body.timeSlotSeq);
    item.timeSlotName = ts?.name || null;
  }
  res.json(ok(item, '수업 수정 완료'));
});
app.delete('/api/complex/classes/:seq', (req, res) => {
  const idx = data.classes.findIndex(c => c.seq === Number(req.params.seq));
  if (idx >= 0) data.classes.splice(idx, 1);
  res.json(ok(null));
});

// ── Members (페이징) ──
app.get('/api/complex/members', (req, res) => {
  const page = Number(req.query.page || 0);
  const size = Number(req.query.size || 20);
  const keyword = req.query.keyword || '';
  let filtered = data.members;
  if (keyword) filtered = filtered.filter(m => m.name.includes(keyword) || m.phoneNumber.includes(keyword));
  res.json(ok(paginate(filtered, page, size)));
});
app.get('/api/complex/members/:seq', (req, res) => {
  const item = data.members.find(m => m.seq === Number(req.params.seq));
  item ? res.json(ok(item)) : res.status(404).json(err('not found'));
});
app.post('/api/complex/members', (req, res) => {
  const item = { seq: data.nextSeq(), ...req.body, createdDate: data.now(), lastUpdateDate: null };
  data.members.push(item);
  res.json(ok(item, '회원 추가 완료'));
});
app.put('/api/complex/members/:seq', (req, res) => {
  const item = data.members.find(m => m.seq === Number(req.params.seq));
  if (!item) return res.status(404).json(err('not found'));
  Object.assign(item, req.body, { lastUpdateDate: data.now() });
  res.json(ok(item, '회원 수정 완료'));
});
app.delete('/api/complex/members/:seq', (req, res) => {
  const idx = data.members.findIndex(m => m.seq === Number(req.params.seq));
  if (idx >= 0) data.members.splice(idx, 1);
  res.json(ok(null));
});

// ── Member Memberships ──
app.get('/api/complex/members/:seq/memberships', (req, res) => {
  const list = data.memberMemberships.filter(mm => mm.memberSeq === Number(req.params.seq));
  res.json(ok(list));
});
app.post('/api/complex/members/:seq/memberships', (req, res) => {
  const memberSeq = Number(req.params.seq);
  const ms = data.memberships.find(m => m.seq === req.body.membershipSeq);
  const startDate = req.body.startDate || new Date().toISOString().split('T')[0];
  let expiryDate = req.body.expiryDate;
  if (!expiryDate && ms) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + ms.duration);
    expiryDate = d.toISOString().split('T')[0];
  }
  const item = {
    seq: data.nextSeq(), memberSeq, membershipSeq: req.body.membershipSeq,
    membershipName: ms?.name || '', startDate, expiryDate,
    totalCount: ms?.count || 0, usedCount: 0, postponeTotal: 3, postponeUsed: 0,
    price: req.body.price || null, depositAmount: req.body.depositAmount || null,
    paymentMethod: req.body.paymentMethod || null, paymentDate: req.body.paymentDate || null,
    status: req.body.status || '활성', createdDate: data.now(),
  };
  data.memberMemberships.push(item);
  res.json(ok(item, '멤버십 할당 완료'));
});
app.put('/api/complex/members/:seq/memberships/:mmSeq', (req, res) => {
  const item = data.memberMemberships.find(mm => mm.seq === Number(req.params.mmSeq));
  if (!item) return res.status(404).json(err('not found'));
  Object.assign(item, req.body);
  res.json(ok(item, '멤버십 수정 완료'));
});
app.delete('/api/complex/members/:seq/memberships/:mmSeq', (req, res) => {
  const idx = data.memberMemberships.findIndex(mm => mm.seq === Number(req.params.mmSeq));
  if (idx >= 0) data.memberMemberships.splice(idx, 1);
  res.json(ok(null));
});

// ── Member Class Assign ──
app.post('/api/complex/members/:seq/class/:classSeq', (req, res) => {
  const item = { seq: data.nextSeq(), memberSeq: Number(req.params.seq), classSeq: Number(req.params.classSeq) };
  data.memberClassMappings.push(item);
  res.json(ok(null, '수업 배정 완료'));
});

// ── Memberships ──
app.get('/api/memberships', (_, res) => res.json(ok(data.memberships)));
app.get('/api/memberships/:seq', (req, res) => {
  const item = data.memberships.find(m => m.seq === Number(req.params.seq));
  item ? res.json(ok(item)) : res.status(404).json(err('not found'));
});
app.post('/api/memberships', (req, res) => {
  const item = { seq: data.nextSeq(), ...req.body, createdDate: data.now(), lastUpdateDate: null };
  data.memberships.push(item);
  res.json(ok(item));
});
app.put('/api/memberships/:seq', (req, res) => {
  const item = data.memberships.find(m => m.seq === Number(req.params.seq));
  if (!item) return res.status(404).json(err('not found'));
  Object.assign(item, req.body, { lastUpdateDate: data.now() });
  res.json(ok(item));
});
app.delete('/api/memberships/:seq', (req, res) => {
  const idx = data.memberships.findIndex(m => m.seq === Number(req.params.seq));
  if (idx >= 0) data.memberships.splice(idx, 1);
  res.json(ok(null));
});

// ── Attendance View ──
app.get('/api/complex/attendance/view', (_, res) => res.json(ok(data.buildAttendanceView())));
app.get('/api/complex/attendance/view/detail', (req, res) => {
  const view = data.buildAttendanceView();
  const slot = view.find(s => s.timeSlotSeq === Number(req.query.slotSeq));
  res.json(ok(slot ? slot.classes : []));
});
app.post('/api/complex/attendance/bulk', (req, res) => {
  const results = req.body.members.map(m => ({ memberSeq: m.memberSeq, name: '', status: m.attended ? '출석' : '결석' }));
  res.json(ok(results));
});
app.post('/api/complex/attendance/reorder', (_, res) => res.json(ok(null)));

// ── Customers (간략) ──
app.get('/api/customers', (req, res) => {
  const page = Number(req.query.page || 0);
  const size = Number(req.query.size || 20);
  res.json(ok(paginate(data.customers, page, size)));
});
app.get('/api/customers/:seq', (req, res) => {
  const item = data.customers.find(c => c.seq === Number(req.params.seq));
  item ? res.json(ok(item)) : res.status(404).json(err('not found'));
});
app.post('/api/customers', (req, res) => { const item = { seq: data.nextSeq(), ...req.body }; data.customers.push(item); res.json(ok(item)); });
app.put('/api/customers/:seq', (req, res) => {
  const item = data.customers.find(c => c.seq === Number(req.params.seq));
  if (!item) return res.status(404).json(err('not found'));
  Object.assign(item, req.body);
  res.json(ok(item));
});
app.delete('/api/customers/:seq', (req, res) => {
  const idx = data.customers.findIndex(c => c.seq === Number(req.params.seq));
  if (idx >= 0) data.customers.splice(idx, 1);
  res.json(ok(null));
});
app.post('/api/customers/update-name', (_, res) => res.json(ok(null)));
app.post('/api/customers/comment', (_, res) => res.json(ok({ comment: '' })));
app.post('/api/customers/process-call', (_, res) => res.json(ok({ call_count: 1, last_update_date: data.now() })));
app.post('/api/customers/reservation', (_, res) => res.json(ok({ reservation_id: data.nextSeq() })));
app.post('/api/customers/mark-no-phone-interview', (_, res) => res.json(ok(null)));

// ── Dashboard ──
app.get('/api/dashboard', (_, res) => res.json(ok(data.dashboard)));
app.get('/api/dashboard/caller-stats', (_, res) => res.json(ok([])));

// ── Users ──
const users = [{ seq: 1, userId: 'root', name: '관리자', role: 'ROOT', createdDate: data.now() }];
app.get('/api/users', (_, res) => res.json(ok(users)));
app.post('/api/users', (req, res) => { const item = { seq: data.nextSeq(), ...req.body, createdDate: data.now() }; users.push(item); res.json(ok(item)); });
app.put('/api/users/:seq', (req, res) => {
  const item = users.find(u => u.seq === Number(req.params.seq));
  if (!item) return res.status(404).json(err('not found'));
  Object.assign(item, req.body);
  res.json(ok(item));
});
app.delete('/api/users/:seq', (req, res) => {
  const idx = users.findIndex(u => u.seq === Number(req.params.seq));
  if (idx >= 0) users.splice(idx, 1);
  res.json(ok(null));
});

// ── Settings / Integrations (스텁) ──
app.get('/api/settings/reservation-sms', (_, res) => res.json(ok(null)));
app.get('/api/settings/reservation-sms/templates', (_, res) => res.json(ok([])));
app.get('/api/settings/reservation-sms/sender-numbers', (_, res) => res.json(ok(['01000000000'])));
app.post('/api/settings/reservation-sms', (req, res) => res.json(ok(req.body)));
app.get('/api/integrations', (_, res) => res.json(ok([])));
app.get('/api/integrations/sms-config', (_, res) => res.json(ok(null)));
app.post('/api/integrations/sms-config', (_, res) => res.json(ok(null)));
app.get('/api/kakao-sync/url', (_, res) => res.json(ok({ kakaoSyncUrl: '#', branchName: '본점' })));

// ── Notices ──
const notices = [];
app.get('/api/notices', (req, res) => res.json(ok(paginate(notices, Number(req.query.page || 0), Number(req.query.size || 20)))));
app.get('/api/notices/:seq', (req, res) => {
  const item = notices.find(n => n.seq === Number(req.params.seq));
  item ? res.json(ok(item)) : res.status(404).json(err('not found'));
});
app.post('/api/notices', (req, res) => { const item = { seq: data.nextSeq(), ...req.body, createdDate: data.now() }; notices.push(item); res.json(ok(item)); });
app.put('/api/notices/:seq', (req, res) => {
  const item = notices.find(n => n.seq === Number(req.params.seq));
  if (!item) return res.status(404).json(err('not found'));
  Object.assign(item, req.body);
  res.json(ok(item));
});
app.delete('/api/notices/:seq', (req, res) => {
  const idx = notices.findIndex(n => n.seq === Number(req.params.seq));
  if (idx >= 0) notices.splice(idx, 1);
  res.json(ok(null));
});

// ── Message Templates ──
const messageTemplates = [];
app.get('/api/message-templates', (_, res) => res.json(ok(messageTemplates)));
app.get('/api/message-templates/placeholders', (_, res) => res.json(ok([])));
app.get('/api/message-templates/:seq', (req, res) => {
  const item = messageTemplates.find(t => t.seq === Number(req.params.seq));
  item ? res.json(ok(item)) : res.status(404).json(err('not found'));
});
app.post('/api/message-templates', (req, res) => { const item = { seq: data.nextSeq(), ...req.body }; messageTemplates.push(item); res.json(ok(item)); });
app.put('/api/message-templates/:seq', (req, res) => {
  const item = messageTemplates.find(t => t.seq === Number(req.params.seq));
  if (!item) return res.status(404).json(err('not found'));
  Object.assign(item, req.body);
  res.json(ok(item));
});
app.delete('/api/message-templates/:seq', (req, res) => {
  const idx = messageTemplates.findIndex(t => t.seq === Number(req.params.seq));
  if (idx >= 0) messageTemplates.splice(idx, 1);
  res.json(ok(null));
});
app.post('/api/message-templates/:seq/set-default', (_, res) => res.json(ok(null)));

// ── Webhooks (스텁) ──
app.get('/api/webhooks', (_, res) => res.json(ok([])));
app.get('/api/webhooks/logs', (req, res) => res.json(ok(paginate([], 0, 20))));
app.post('/api/webhooks', (req, res) => res.json(ok({ seq: data.nextSeq(), ...req.body })));
app.get('/api/webhooks/:seq', (_, res) => res.status(404).json(err('not found')));
app.put('/api/webhooks/:seq', (_, res) => res.json(ok(null)));
app.delete('/api/webhooks/:seq', (_, res) => res.json(ok(null)));

// ── Refunds / Postponements (스텁) ──
app.get('/api/complex/refunds', (req, res) => res.json(ok(paginate([], 0, 20))));
app.put('/api/complex/refunds/:seq/status', (_, res) => res.json(ok(null)));
app.get('/api/complex/postponements', (req, res) => res.json(ok(paginate([], 0, 20))));
app.put('/api/complex/postponements/:seq/status', (_, res) => res.json(ok(null)));
app.get('/api/complex/postponements/reasons', (_, res) => res.json(ok([])));
app.post('/api/complex/postponements/reasons', (_, res) => res.json(ok(null)));
app.delete('/api/complex/postponements/reasons/:seq', (_, res) => res.json(ok(null)));

// ── Survey (스텁) ──
app.get('/api/complex/survey/templates', (_, res) => res.json(ok([])));
app.post('/api/complex/survey/templates', (req, res) => res.json(ok({ seq: data.nextSeq(), ...req.body })));
app.get('/api/complex/survey/templates/:seq', (_, res) => res.json(ok({})));
app.put('/api/complex/survey/templates/:seq', (_, res) => res.json(ok(null)));
app.put('/api/complex/survey/templates/:seq/status', (_, res) => res.json(ok(null)));
app.post('/api/complex/survey/templates/:seq/copy', (_, res) => res.json(ok({ seq: data.nextSeq() })));
app.delete('/api/complex/survey/templates/:seq', (_, res) => res.json(ok(null)));
app.get('/api/complex/survey/templates/:seq/sections', (_, res) => res.json(ok([])));
app.post('/api/complex/survey/templates/:seq/sections', (req, res) => res.json(ok({ seq: data.nextSeq(), ...req.body })));
app.put('/api/complex/survey/templates/:tSeq/sections/:sSeq', (_, res) => res.json(ok(null)));
app.delete('/api/complex/survey/templates/:tSeq/sections/:sSeq', (_, res) => res.json(ok(null)));
app.get('/api/complex/survey/templates/:seq/questions', (_, res) => res.json(ok([])));
app.post('/api/complex/survey/templates/:seq/questions', (req, res) => res.json(ok({ seq: data.nextSeq(), ...req.body })));
app.put('/api/complex/survey/templates/:tSeq/questions/:qSeq', (_, res) => res.json(ok(null)));
app.delete('/api/complex/survey/templates/:tSeq/questions/:qSeq', (_, res) => res.json(ok(null)));
app.put('/api/complex/survey/templates/:seq/questions/reorder', (_, res) => res.json(ok([])));
app.get('/api/complex/survey/templates/:seq/options', (_, res) => res.json(ok([])));
app.post('/api/complex/survey/templates/:seq/options', (req, res) => res.json(ok({ seq: data.nextSeq(), ...req.body })));
app.delete('/api/complex/survey/templates/:tSeq/options/:oSeq', (_, res) => res.json(ok(null)));

// ── Calendar (스텁) ──
app.get('/api/calendar/reservations', (_, res) => res.json(ok([])));
app.put('/api/calendar/reservations/:seq/status', (_, res) => res.json(ok(null)));

// ── External (스텁) ──
app.post('/api/external/sms/send', (_, res) => res.json(ok({ success: true, message: 'mock sent', code: '200', nums: '1', cols: '1' })));
app.post('/api/external/calendar/create-event', (_, res) => res.json(ok({ link: '#' })));

// ── Public postponement (스텁) ──
app.get('/api/public/postponement/search-member', (_, res) => res.json(ok({ members: [] })));
app.post('/api/public/postponement/submit', (_, res) => res.json(ok({})));
app.get('/api/public/postponement/reasons', (_, res) => res.json(ok([])));

// ── Catch-all (미구현 엔드포인트 로깅) ──
app.use('/api/{*path}', (req, res) => {
  console.warn(`[MOCK] 미구현 엔드포인트: ${req.method} ${req.originalUrl}`);
  res.json(ok(null));
});

// ── 서버 시작 ──
const PORT = 8081;
app.listen(PORT, () => {
  console.log(`\n  🎭 Mock API 서버 실행 중: http://localhost:${PORT}`);
  console.log(`  📦 인메모리 데이터 — 서버 재시작 시 초기화`);
  console.log(`  👤 로그인: root / (아무 비밀번호)\n`);
});
