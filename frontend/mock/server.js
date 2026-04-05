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
const ok = (d, msg) => ({ success: true, message: msg || null, data: d });
const err = (msg) => ({ success: false, message: msg, data: null });
const paginate = (arr, page, size) => ({
  content: arr.slice(page * size, page * size + size),
  totalElements: arr.length,
  totalPages: Math.ceil(arr.length / size),
  number: page, size,
});
const p = (req) => ({ page: Number(req.query.page || 0), size: Number(req.query.size || 20) });
const find = (arr, seq) => arr.find(x => x.seq === Number(seq));

// ══════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════
app.post('/api/auth/login', (_, res) => res.json(ok(data.session)));
app.get('/api/auth/me', (_, res) => res.json(ok(data.session)));
app.post('/api/auth/logout', (_, res) => res.json(ok(null)));
app.post('/api/auth/branch/:seq', (req, res) => {
  data.session.selectedBranchSeq = Number(req.params.seq);
  const b = find(data.branches, req.params.seq);
  if (b) data.session.selectedBranchName = b.branchName;
  res.json(ok(null));
});

// ══════════════════════════════════════════
// USERS
// ══════════════════════════════════════════
app.get('/api/users', (_, res) => res.json(ok(data.users)));
app.post('/api/users', (req, res) => { const item = { seq: data.nextSeq(), ...req.body, createdDate: data.now() }; data.users.push(item); res.json(ok(item, '사용자 생성 완료')); });
app.put('/api/users/:seq', (req, res) => { const item = find(data.users, req.params.seq); if (!item) return res.status(404).json(err('not found')); Object.assign(item, req.body); res.json(ok(item, '사용자 수정 완료')); });
app.delete('/api/users/:seq', (req, res) => { const i = data.users.findIndex(u => u.seq === Number(req.params.seq)); if (i >= 0) data.users.splice(i, 1); res.json(ok(null, '사용자 삭제 완료')); });

// ══════════════════════════════════════════
// BRANCHES
// ══════════════════════════════════════════
app.get('/api/branches', (_, res) => res.json(ok(data.branches)));
app.get('/api/branches/:seq', (req, res) => { const item = find(data.branches, req.params.seq); item ? res.json(ok(item)) : res.status(404).json(err('not found')); });
app.post('/api/branches', (req, res) => { const item = { seq: data.nextSeq(), ...req.body, createdDate: data.now() }; data.branches.push(item); res.json(ok(item)); });
app.put('/api/branches/:seq', (req, res) => { const item = find(data.branches, req.params.seq); if (!item) return res.status(404).json(err('not found')); Object.assign(item, req.body); res.json(ok(item)); });
app.delete('/api/branches/:seq', (req, res) => { const i = data.branches.findIndex(b => b.seq === Number(req.params.seq)); if (i >= 0) data.branches.splice(i, 1); res.json(ok(null)); });

// ══════════════════════════════════════════
// CUSTOMERS
// ══════════════════════════════════════════
app.get('/api/customers', (req, res) => {
  const { page, size } = p(req);
  const kw = req.query.keyword || '';
  let filtered = data.customers;
  if (kw) filtered = filtered.filter(c => c.name.includes(kw) || c.phoneNumber.includes(kw));
  if (req.query.filter && req.query.filter !== '전체') filtered = filtered.filter(c => c.status === req.query.filter);
  res.json(ok(paginate(filtered, page, size)));
});
app.get('/api/customers/:seq', (req, res) => { const item = find(data.customers, req.params.seq); item ? res.json(ok(item)) : res.status(404).json(err('not found')); });
app.post('/api/customers', (req, res) => { const item = { seq: data.nextSeq(), ...req.body, status: '신규', callCount: 0, createdDate: data.now() }; data.customers.push(item); res.json(ok(item, '고객 추가 완료')); });
app.put('/api/customers/:seq', (req, res) => { const item = find(data.customers, req.params.seq); if (!item) return res.status(404).json(err('not found')); Object.assign(item, req.body, { lastUpdateDate: data.now() }); res.json(ok(item, '고객 수정 완료')); });
app.delete('/api/customers/:seq', (req, res) => { const i = data.customers.findIndex(c => c.seq === Number(req.params.seq)); if (i >= 0) data.customers.splice(i, 1); res.json(ok(null)); });
app.post('/api/customers/update-name', (req, res) => { const item = find(data.customers, req.body.customerSeq); if (item) item.name = req.body.name; res.json(ok(null, '이름 변경 완료')); });
app.post('/api/customers/comment', (req, res) => { const item = find(data.customers, req.body.customerSeq); if (item) item.comment = req.body.comment; res.json(ok({ comment: req.body.comment || '' })); });
app.post('/api/customers/process-call', (req, res) => {
  const item = find(data.customers, req.body.customerSeq);
  if (!item) return res.status(404).json(err('not found'));
  item.callCount = (item.callCount || 0) + 1;
  item.lastUpdateDate = data.now();
  if (item.callCount >= 5) item.status = '콜수초과';
  else if (item.status === '신규') item.status = '진행중';
  res.json(ok({ callCount: item.callCount, lastUpdateDate: item.lastUpdateDate }, '통화 처리 완료'));
});
app.post('/api/customers/reservation', (req, res) => {
  const item = find(data.customers, req.body.customerSeq);
  if (item) item.status = '예약확정';
  const r = { seq: data.nextSeq(), customerSeq: req.body.customerSeq, interviewDate: req.body.interviewDate, caller: req.body.caller, createdDate: data.now() };
  data.reservations.push(r);
  res.json(ok({ reservationId: r.seq, customerSeq: req.body.customerSeq, interviewDate: req.body.interviewDate }));
});
app.post('/api/customers/mark-no-phone-interview', (req, res) => { const item = find(data.customers, req.body.customerSeq); if (item) item.status = '전화상거절'; res.json(ok(null)); });

// ══════════════════════════════════════════
// NOTICES
// ══════════════════════════════════════════
app.get('/api/notices', (req, res) => {
  const { page, size } = p(req);
  const kw = req.query.searchKeyword || req.query.q || '';
  let filtered = data.notices;
  if (kw) filtered = filtered.filter(n => n.title.includes(kw) || n.content.includes(kw));
  res.json(ok(paginate(filtered, page, size)));
});
app.get('/api/notices/:seq', (req, res) => { const item = find(data.notices, req.params.seq); item ? res.json(ok(item)) : res.status(404).json(err('not found')); });
app.post('/api/notices', (req, res) => { const item = { seq: data.nextSeq(), ...req.body, createdDate: data.now() }; data.notices.push(item); res.json(ok(item)); });
app.put('/api/notices/:seq', (req, res) => { const item = find(data.notices, req.params.seq); if (!item) return res.status(404).json(err('not found')); Object.assign(item, req.body); res.json(ok(item)); });
app.delete('/api/notices/:seq', (req, res) => { const i = data.notices.findIndex(n => n.seq === Number(req.params.seq)); if (i >= 0) data.notices.splice(i, 1); res.json(ok(null)); });

// ══════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════
app.get('/api/dashboard', (_, res) => res.json(ok(data.dashboard)));
app.get('/api/dashboard/caller-stats', (_, res) => res.json(ok([])));

// ══════════════════════════════════════════
// CALENDAR
// ══════════════════════════════════════════
app.get('/api/calendar/reservations', (req, res) => {
  const filtered = data.reservations.filter(r => {
    if (req.query.startDate && r.interviewDate < req.query.startDate) return false;
    if (req.query.endDate && r.interviewDate > req.query.endDate) return false;
    return true;
  });
  res.json(ok(filtered.map(r => {
    const c = data.customers.find(x => x.seq === r.customerSeq);
    return { seq: r.seq, customerSeq: r.customerSeq, interviewDate: r.interviewDate, customerName: c?.name || '-', customerPhone: c?.phoneNumber || '-', caller: r.caller, status: c?.status || '-', memo: c?.comment || null };
  })));
});
app.put('/api/calendar/reservations/:seq/status', (req, res) => {
  const r = find(data.reservations, req.params.seq);
  if (!r) return res.status(404).json(err('not found'));
  const c = data.customers.find(x => x.seq === r.customerSeq);
  if (c) c.status = req.body.status;
  res.json(ok({ seq: r.seq, customerSeq: r.customerSeq, interviewDate: r.interviewDate, customerName: c?.name, status: req.body.status }, '상태가 변경되었습니다.'));
});

// ══════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════
app.get('/api/settings/reservation-sms', (_, res) => res.json(ok(null)));
app.get('/api/settings/reservation-sms/templates', (_, res) => res.json(ok(data.messageTemplates.map(t => ({ seq: t.seq, templateName: t.templateName })))));
app.get('/api/settings/reservation-sms/sender-numbers', (_, res) => res.json(ok(['01000000000'])));
app.post('/api/settings/reservation-sms', (req, res) => res.json(ok(req.body)));

// ══════════════════════════════════════════
// INTEGRATIONS
// ══════════════════════════════════════════
app.get('/api/integrations', (_, res) => res.json(ok([])));
app.get('/api/integrations/sms-config', (_, res) => res.json(ok(null)));
app.post('/api/integrations/sms-config', (_, res) => res.json(ok(null)));

// ══════════════════════════════════════════
// KAKAO
// ══════════════════════════════════════════
app.get('/api/kakao-sync/url', (_, res) => res.json(ok({ kakaoSyncUrl: '#', branchName: '본점' })));
app.get('/api/public/kakao/login', (_, res) => res.redirect('#'));
app.get('/api/public/kakao/callback', (_, res) => res.redirect('/'));

// ══════════════════════════════════════════
// EXTERNAL
// ══════════════════════════════════════════
app.post('/api/external/sms/send', (_, res) => res.json(ok({ success: true, message: 'mock sent', code: '200', nums: '1', cols: '1' })));
app.post('/api/external/calendar/create-event', (_, res) => res.json(ok({ link: '#' })));

// ══════════════════════════════════════════
// WEBHOOKS
// ══════════════════════════════════════════
app.get('/api/webhooks', (_, res) => res.json(ok(data.webhooks)));
app.get('/api/webhooks/logs', (req, res) => { const { page, size } = p(req); res.json(ok(paginate(data.webhookLogs, page, size))); });
app.get('/api/webhooks/:seq', (req, res) => { const item = find(data.webhooks, req.params.seq); item ? res.json(ok(item)) : res.status(404).json(err('not found')); });
app.post('/api/webhooks', (req, res) => { const item = { seq: data.nextSeq(), ...req.body, createdDate: data.now() }; data.webhooks.push(item); res.json(ok(item)); });
app.put('/api/webhooks/:seq', (req, res) => { const item = find(data.webhooks, req.params.seq); if (!item) return res.status(404).json(err('not found')); Object.assign(item, req.body); res.json(ok(item)); });
app.delete('/api/webhooks/:seq', (req, res) => { const i = data.webhooks.findIndex(w => w.seq === Number(req.params.seq)); if (i >= 0) data.webhooks.splice(i, 1); res.json(ok(null)); });

// ══════════════════════════════════════════
// MESSAGE TEMPLATES
// ══════════════════════════════════════════
app.get('/api/message-templates', (_, res) => res.json(ok(data.messageTemplates)));
app.get('/api/message-templates/placeholders', (_, res) => res.json(ok(data.placeholders)));
app.get('/api/message-templates/:seq', (req, res) => { const item = find(data.messageTemplates, req.params.seq); item ? res.json(ok(item)) : res.status(404).json(err('not found')); });
app.post('/api/message-templates', (req, res) => { const item = { seq: data.nextSeq(), ...req.body, createdDate: data.now() }; data.messageTemplates.push(item); res.json(ok(item)); });
app.put('/api/message-templates/:seq', (req, res) => { const item = find(data.messageTemplates, req.params.seq); if (!item) return res.status(404).json(err('not found')); Object.assign(item, req.body); res.json(ok(item)); });
app.delete('/api/message-templates/:seq', (req, res) => { const i = data.messageTemplates.findIndex(t => t.seq === Number(req.params.seq)); if (i >= 0) data.messageTemplates.splice(i, 1); res.json(ok(null)); });
app.post('/api/message-templates/:seq/set-default', (req, res) => {
  data.messageTemplates.forEach(t => t.isDefault = false);
  const item = find(data.messageTemplates, req.params.seq);
  if (item) item.isDefault = true;
  res.json(ok(null));
});

// ══════════════════════════════════════════
// TIME SLOTS
// ══════════════════════════════════════════
app.get('/api/complex/timeslots', (_, res) => res.json(ok(data.timeSlots)));
app.post('/api/complex/timeslots', (req, res) => { const item = { seq: data.nextSeq(), ...req.body, createdDate: data.now() }; data.timeSlots.push(item); res.json(ok(item)); });
app.put('/api/complex/timeslots/:seq', (req, res) => { const item = find(data.timeSlots, req.params.seq); if (!item) return res.status(404).json(err('not found')); Object.assign(item, req.body); res.json(ok(item)); });
app.delete('/api/complex/timeslots/:seq', (req, res) => { const i = data.timeSlots.findIndex(t => t.seq === Number(req.params.seq)); if (i >= 0) data.timeSlots.splice(i, 1); res.json(ok(null)); });

// ══════════════════════════════════════════
// CLASSES
// ══════════════════════════════════════════
app.get('/api/complex/classes', (req, res) => {
  const { page, size } = p(req);
  const kw = req.query.keyword || '';
  let filtered = data.classes;
  if (kw) filtered = filtered.filter(c => c.name.includes(kw));
  res.json(ok(paginate(filtered, page, size)));
});
app.get('/api/complex/classes/:seq', (req, res) => { const item = find(data.classes, req.params.seq); item ? res.json(ok(item)) : res.status(404).json(err('not found')); });
app.post('/api/complex/classes', (req, res) => {
  const ts = find(data.timeSlots, req.body.timeSlotSeq);
  const st = req.body.staffSeq ? find(data.staffs, req.body.staffSeq) : null;
  const item = { seq: data.nextSeq(), ...req.body, timeSlotName: ts?.name || null, staffName: st?.name || null, sortOrder: req.body.sortOrder ?? data.classes.length, createdDate: data.now() };
  data.classes.push(item);
  res.json(ok(item, '수업 추가 완료'));
});
app.put('/api/complex/classes/:seq', (req, res) => {
  const item = find(data.classes, req.params.seq);
  if (!item) return res.status(404).json(err('not found'));
  Object.assign(item, req.body);
  if (req.body.timeSlotSeq) { const ts = find(data.timeSlots, req.body.timeSlotSeq); item.timeSlotName = ts?.name || null; }
  if (req.body.staffSeq) { const st = find(data.staffs, req.body.staffSeq); item.staffName = st?.name || null; }
  res.json(ok(item, '수업 수정 완료'));
});
app.delete('/api/complex/classes/:seq', (req, res) => { const i = data.classes.findIndex(c => c.seq === Number(req.params.seq)); if (i >= 0) data.classes.splice(i, 1); res.json(ok(null)); });

// ══════════════════════════════════════════
// STAFFS
// ══════════════════════════════════════════
app.get('/api/complex/staffs', (_, res) => res.json(ok(data.staffs)));
app.get('/api/complex/staffs/:seq', (req, res) => { const item = find(data.staffs, req.params.seq); item ? res.json(ok(item)) : res.status(404).json(err('not found')); });
app.post('/api/complex/staffs', (req, res) => { const item = { seq: data.nextSeq(), ...req.body, status: req.body.status || '재직', createdDate: data.now() }; data.staffs.push(item); res.json(ok(item)); });
app.put('/api/complex/staffs/:seq', (req, res) => { const item = find(data.staffs, req.params.seq); if (!item) return res.status(404).json(err('not found')); Object.assign(item, req.body); res.json(ok(item)); });
app.delete('/api/complex/staffs/:seq', (req, res) => { const i = data.staffs.findIndex(s => s.seq === Number(req.params.seq)); if (i >= 0) data.staffs.splice(i, 1); res.json(ok(null)); });
app.get('/api/complex/staffs/:seq/refund', (req, res) => { const item = data.staffRefunds.find(r => r.staffSeq === Number(req.params.seq)); res.json(ok(item || null)); });
app.post('/api/complex/staffs/:seq/refund', (req, res) => {
  const existing = data.staffRefunds.findIndex(r => r.staffSeq === Number(req.params.seq));
  const item = { seq: data.nextSeq(), staffSeq: Number(req.params.seq), ...req.body };
  if (existing >= 0) data.staffRefunds[existing] = item; else data.staffRefunds.push(item);
  res.json(ok(item));
});
app.delete('/api/complex/staffs/:seq/refund', (req, res) => { const i = data.staffRefunds.findIndex(r => r.staffSeq === Number(req.params.seq)); if (i >= 0) data.staffRefunds.splice(i, 1); res.json(ok(null)); });

// ══════════════════════════════════════════
// MEMBERS
// ══════════════════════════════════════════
app.get('/api/complex/members', (req, res) => {
  const { page, size } = p(req);
  const kw = req.query.keyword || '';
  let filtered = data.members;
  if (kw) filtered = filtered.filter(m => m.name.includes(kw) || m.phoneNumber.includes(kw));
  res.json(ok(paginate(filtered, page, size)));
});
app.get('/api/complex/members/:seq', (req, res) => { const item = find(data.members, req.params.seq); item ? res.json(ok(item)) : res.status(404).json(err('not found')); });
app.post('/api/complex/members', (req, res) => { const item = { seq: data.nextSeq(), ...req.body, createdDate: data.now(), lastUpdateDate: null }; data.members.push(item); res.json(ok(item, '회원 추가 완료')); });
app.put('/api/complex/members/:seq', (req, res) => { const item = find(data.members, req.params.seq); if (!item) return res.status(404).json(err('not found')); Object.assign(item, req.body, { lastUpdateDate: data.now() }); res.json(ok(item, '회원 수정 완료')); });
app.delete('/api/complex/members/:seq', (req, res) => { const i = data.members.findIndex(m => m.seq === Number(req.params.seq)); if (i >= 0) data.members.splice(i, 1); res.json(ok(null)); });

// Member Memberships
app.get('/api/complex/members/:seq/memberships', (req, res) => {
  res.json(ok(data.memberMemberships.filter(mm => mm.memberSeq === Number(req.params.seq))));
});
app.post('/api/complex/members/:seq/memberships', (req, res) => {
  const memberSeq = Number(req.params.seq);
  const ms = find(data.memberships, req.body.membershipSeq);
  const startDate = req.body.startDate || data.today();
  let expiryDate = req.body.expiryDate;
  if (!expiryDate && ms) { const d = new Date(startDate); d.setDate(d.getDate() + ms.duration); expiryDate = d.toISOString().split('T')[0]; }
  const item = { seq: data.nextSeq(), memberSeq, membershipSeq: req.body.membershipSeq, membershipName: ms?.name || '', startDate, expiryDate, totalCount: ms?.count || 0, usedCount: 0, postponeTotal: 3, postponeUsed: 0, price: req.body.price || null, depositAmount: req.body.depositAmount || null, paymentMethod: req.body.paymentMethod || null, paymentDate: req.body.paymentDate || null, status: req.body.status || '활성', createdDate: data.now() };
  data.memberMemberships.push(item);
  res.json(ok(item, '멤버십 할당 완료'));
});
app.put('/api/complex/members/:seq/memberships/:mmSeq', (req, res) => {
  const item = find(data.memberMemberships, req.params.mmSeq);
  if (!item) return res.status(404).json(err('not found'));
  Object.assign(item, req.body);
  res.json(ok(item, '멤버십 수정 완료'));
});
app.delete('/api/complex/members/:seq/memberships/:mmSeq', (req, res) => {
  const i = data.memberMemberships.findIndex(mm => mm.seq === Number(req.params.mmSeq));
  if (i >= 0) data.memberMemberships.splice(i, 1);
  res.json(ok(null));
});
app.post('/api/complex/members/:seq/class/:classSeq', (req, res) => {
  data.memberClassMappings.push({ seq: data.nextSeq(), memberSeq: Number(req.params.seq), classSeq: Number(req.params.classSeq) });
  res.json(ok(null, '수업 배정 완료'));
});

// ══════════════════════════════════════════
// MEMBERSHIPS
// ══════════════════════════════════════════
app.get('/api/memberships', (_, res) => res.json(ok(data.memberships)));
app.get('/api/memberships/:seq', (req, res) => { const item = find(data.memberships, req.params.seq); item ? res.json(ok(item)) : res.status(404).json(err('not found')); });
app.post('/api/memberships', (req, res) => { const item = { seq: data.nextSeq(), ...req.body, createdDate: data.now(), lastUpdateDate: null }; data.memberships.push(item); res.json(ok(item)); });
app.put('/api/memberships/:seq', (req, res) => { const item = find(data.memberships, req.params.seq); if (!item) return res.status(404).json(err('not found')); Object.assign(item, req.body, { lastUpdateDate: data.now() }); res.json(ok(item)); });
app.delete('/api/memberships/:seq', (req, res) => { const i = data.memberships.findIndex(m => m.seq === Number(req.params.seq)); if (i >= 0) data.memberships.splice(i, 1); res.json(ok(null)); });

// ══════════════════════════════════════════
// ATTENDANCE
// ══════════════════════════════════════════
app.get('/api/complex/attendance', (_, res) => res.json(ok([])));
app.post('/api/complex/attendance', (_, res) => res.json(ok({ seq: data.nextSeq() }, '출석 기록 완료')));
app.put('/api/complex/attendance/:seq', (_, res) => res.json(ok(null, '출석 수정 완료')));
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
app.get('/api/complex/attendance/history/member/:seq', (req, res) => {
  const { page, size } = p(req);
  const mockHistory = Array.from({ length: 15 }, (_, i) => ({ seq: i + 1, attendanceDate: `2024-0${Math.min(9, 6 + Math.floor(i / 5))}-${String(10 + i).padStart(2, '0')}`, status: i % 4 === 0 ? '결석' : '출석', className: data.classes[i % data.classes.length]?.name || '수업', note: null }));
  res.json(ok(paginate(mockHistory, page, size)));
});
app.get('/api/complex/attendance/history/staff/:seq', (req, res) => {
  const { page, size } = p(req);
  const mockHistory = Array.from({ length: 10 }, (_, i) => ({ seq: i + 1, attendanceDate: `2024-08-${String(10 + i).padStart(2, '0')}`, status: '출석', className: data.classes[i % data.classes.length]?.name || '수업', note: null }));
  res.json(ok(paginate(mockHistory, page, size)));
});

// ══════════════════════════════════════════
// POSTPONEMENTS
// ══════════════════════════════════════════
app.get('/api/complex/postponements', (req, res) => {
  const { page, size } = p(req);
  let filtered = data.postponements;
  if (req.query.status) filtered = filtered.filter(p => p.status === req.query.status);
  if (req.query.keyword) filtered = filtered.filter(p => p.memberName?.includes(req.query.keyword));
  res.json(ok(paginate(filtered, page, size)));
});
app.post('/api/complex/postponements', (req, res) => { const item = { seq: data.nextSeq(), ...req.body, status: '대기', createdDate: data.now() }; data.postponements.push(item); res.json(ok(item)); });
app.put('/api/complex/postponements/:seq/status', (req, res) => {
  const item = find(data.postponements, req.params.seq);
  if (!item) return res.status(404).json(err('not found'));
  item.status = req.query.status || req.body.status;
  if (req.query.rejectReason) item.rejectReason = req.query.rejectReason;
  res.json(ok(item));
});
app.get('/api/complex/postponements/reasons', (_, res) => res.json(ok(data.postponementReasons)));
app.post('/api/complex/postponements/reasons', (req, res) => { const item = { seq: data.nextSeq(), reason: req.body.reason, createdDate: data.now() }; data.postponementReasons.push(item); res.json(ok(item)); });
app.delete('/api/complex/postponements/reasons/:seq', (req, res) => { const i = data.postponementReasons.findIndex(r => r.seq === Number(req.params.seq)); if (i >= 0) data.postponementReasons.splice(i, 1); res.json(ok(null)); });

// ══════════════════════════════════════════
// REFUNDS
// ══════════════════════════════════════════
app.get('/api/complex/refunds', (req, res) => {
  const { page, size } = p(req);
  let filtered = data.refunds;
  if (req.query.status) filtered = filtered.filter(r => r.status === req.query.status);
  res.json(ok(paginate(filtered, page, size)));
});
app.post('/api/complex/refunds', (req, res) => { const item = { seq: data.nextSeq(), ...req.body, status: '대기', createdDate: data.now() }; data.refunds.push(item); res.json(ok(item)); });
app.put('/api/complex/refunds/:seq/status', (req, res) => {
  const item = find(data.refunds, req.params.seq);
  if (!item) return res.status(404).json(err('not found'));
  item.status = req.query.status || req.body.status;
  res.json(ok(item));
});

// ══════════════════════════════════════════
// SURVEY
// ══════════════════════════════════════════
app.get('/api/complex/survey/templates', (_, res) => res.json(ok(data.surveyTemplates)));
app.get('/api/complex/survey/templates/:seq', (req, res) => { const item = find(data.surveyTemplates, req.params.seq); item ? res.json(ok(item)) : res.status(404).json(err('not found')); });
app.post('/api/complex/survey/templates', (req, res) => { const item = { seq: data.nextSeq(), ...req.body, status: '초안', createdDate: data.now() }; data.surveyTemplates.push(item); res.json(ok(item)); });
app.put('/api/complex/survey/templates/:seq', (req, res) => { const item = find(data.surveyTemplates, req.params.seq); if (!item) return res.status(404).json(err('not found')); Object.assign(item, req.body); res.json(ok(item)); });
app.put('/api/complex/survey/templates/:seq/status', (req, res) => { const item = find(data.surveyTemplates, req.params.seq); if (!item) return res.status(404).json(err('not found')); item.status = req.body.status; res.json(ok(item)); });
app.post('/api/complex/survey/templates/:seq/copy', (req, res) => {
  const src = find(data.surveyTemplates, req.params.seq);
  if (!src) return res.status(404).json(err('not found'));
  const copy = { ...src, seq: data.nextSeq(), name: src.name + ' (복사본)', createdDate: data.now() };
  data.surveyTemplates.push(copy);
  res.json(ok(copy));
});
app.delete('/api/complex/survey/templates/:seq', (req, res) => {
  const seq = Number(req.params.seq);
  data.surveyOptions.splice(0, data.surveyOptions.length, ...data.surveyOptions.filter(o => o.templateSeq !== seq));
  data.surveyQuestions.splice(0, data.surveyQuestions.length, ...data.surveyQuestions.filter(q => q.templateSeq !== seq));
  data.surveySections.splice(0, data.surveySections.length, ...data.surveySections.filter(s => s.templateSeq !== seq));
  const i = data.surveyTemplates.findIndex(t => t.seq === seq); if (i >= 0) data.surveyTemplates.splice(i, 1);
  res.json(ok(null));
});
// Sections
app.get('/api/complex/survey/templates/:seq/sections', (req, res) => res.json(ok(data.surveySections.filter(s => s.templateSeq === Number(req.params.seq)))));
app.post('/api/complex/survey/templates/:seq/sections', (req, res) => { const item = { seq: data.nextSeq(), templateSeq: Number(req.params.seq), ...req.body }; data.surveySections.push(item); res.json(ok(item)); });
app.put('/api/complex/survey/templates/:tSeq/sections/:sSeq', (req, res) => { const item = find(data.surveySections, req.params.sSeq); if (!item) return res.status(404).json(err('not found')); Object.assign(item, req.body); res.json(ok(item)); });
app.delete('/api/complex/survey/templates/:tSeq/sections/:sSeq', (req, res) => { const i = data.surveySections.findIndex(s => s.seq === Number(req.params.sSeq)); if (i >= 0) data.surveySections.splice(i, 1); res.json(ok(null)); });
// Questions
app.get('/api/complex/survey/templates/:seq/questions', (req, res) => res.json(ok(data.surveyQuestions.filter(q => q.templateSeq === Number(req.params.seq)))));
app.post('/api/complex/survey/templates/:seq/questions', (req, res) => { const item = { seq: data.nextSeq(), templateSeq: Number(req.params.seq), ...req.body }; data.surveyQuestions.push(item); res.json(ok(item)); });
app.put('/api/complex/survey/templates/:tSeq/questions/:qSeq', (req, res) => { const item = find(data.surveyQuestions, req.params.qSeq); if (!item) return res.status(404).json(err('not found')); Object.assign(item, req.body); res.json(ok(item)); });
app.delete('/api/complex/survey/templates/:tSeq/questions/:qSeq', (req, res) => { const i = data.surveyQuestions.findIndex(q => q.seq === Number(req.params.qSeq)); if (i >= 0) data.surveyQuestions.splice(i, 1); res.json(ok(null)); });
app.put('/api/complex/survey/templates/:seq/questions/reorder', (req, res) => res.json(ok([])));
// Options
app.get('/api/complex/survey/templates/:seq/options', (req, res) => {
  let opts = data.surveyOptions.filter(o => o.templateSeq === Number(req.params.seq));
  if (req.query.questionSeq) opts = opts.filter(o => o.questionSeq === Number(req.query.questionSeq));
  res.json(ok(opts));
});
app.post('/api/complex/survey/templates/:seq/options', (req, res) => { const item = { seq: data.nextSeq(), templateSeq: Number(req.params.seq), ...req.body }; data.surveyOptions.push(item); res.json(ok(item)); });
app.delete('/api/complex/survey/templates/:tSeq/options/:oSeq', (req, res) => { const i = data.surveyOptions.findIndex(o => o.seq === Number(req.params.oSeq)); if (i >= 0) data.surveyOptions.splice(i, 1); res.json(ok(null)); });

// ══════════════════════════════════════════
// PUBLIC BOARD
// ══════════════════════════════════════════
app.get('/api/public/board/notices', (req, res) => {
  const { page, size } = p(req);
  res.json(ok(paginate(data.notices, page, size)));
});
app.get('/api/public/board/notices/:seq', (req, res) => { const item = find(data.notices, req.params.seq); item ? res.json(ok(item)) : res.status(404).json(err('not found')); });
app.get('/api/public/board/session', (_, res) => res.json(ok({ name: '게스트', branchName: '본점' })));
app.post('/api/public/board/logout', (_, res) => res.json(ok(null)));
app.get('/api/public/board/mypage', (_, res) => res.json(ok({ name: '게스트', phoneNumber: '01000000000', branchName: '본점' })));
app.post('/api/public/board/withdraw', (_, res) => res.json(ok(null)));

// ══════════════════════════════════════════
// PUBLIC POSTPONEMENT
// ══════════════════════════════════════════
app.get('/api/public/postponement/search-member', (req, res) => {
  const filtered = data.members.filter(m => m.name === req.query.name && m.phoneNumber === req.query.phone);
  res.json(ok({ members: filtered.map(m => ({ seq: m.seq, name: m.name, phoneNumber: m.phoneNumber, branchSeq: 1, branchName: '본점', level: m.level, memberships: data.memberMemberships.filter(mm => mm.memberSeq === m.seq).map(mm => ({ seq: mm.seq, membershipName: mm.membershipName, startDate: mm.startDate, expiryDate: mm.expiryDate, totalCount: mm.totalCount, usedCount: mm.usedCount, postponeTotal: mm.postponeTotal, postponeUsed: mm.postponeUsed })), classes: data.classes.map(c => ({ name: c.name, slotName: c.timeSlotName || '', startTime: '', endTime: '' })) })) }));
});
app.post('/api/public/postponement/submit', (req, res) => {
  const item = { seq: data.nextSeq(), ...req.body, status: '대기', createdDate: data.now() };
  data.postponements.push(item);
  res.json(ok(req.body));
});
app.get('/api/public/postponement/reasons', (_, res) => res.json(ok(data.postponementReasons.map(r => r.reason))));

// ══════════════════════════════════════════
// CATCH-ALL
// ══════════════════════════════════════════
app.use('/api/{*path}', (req, res) => {
  console.warn(`[MOCK] 미구현: ${req.method} ${req.originalUrl}`);
  res.json(ok(null));
});

// ══════════════════════════════════════════
// START
// ══════════════════════════════════════════
const PORT = 8081;
app.listen(PORT, () => {
  console.log(`\n  🎭 Mock API 서버: http://localhost:${PORT}`);
  console.log(`  📦 인메모리 데이터 — 재시작 시 초기화`);
  console.log(`  👤 로그인: root / (아무 비밀번호)`);
  console.log(`  📋 엔드포인트: 145+개 등록\n`);
});
