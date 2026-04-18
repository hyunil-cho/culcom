-- =============================================================================
-- Migration: 2026-04-17
--   1) 연기 요청 - 희망 복귀 수업 (desired_class_seq) 컬럼 추가
--   2) 연기 복귀 예정자 스캔 로그 테이블 신규 생성
--   3) 플레이스홀더 카테고리 (message_placeholders.category) 컬럼 추가
--   4) 메시지 템플릿 이벤트 타입 (message_templates.event_type) 컬럼 추가
--   5) 연기/환불 요청: reject_reason → admin_message 리네임 (승인/반려 공통)
--   6) 양도 요청: admin_message 컬럼 신규 추가
--
-- 대상 DBMS : MySQL (stg / prod)
-- 로컬 H2 (ddl-auto: create) 에는 적용 불필요
-- 실행 전 반드시 백업 및 점검 시간 확인
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) complex_postponement_requests: desired_class_seq 추가
--    양수자가 선택한 희망 복귀 수업 (nullable, 선택 사항)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE complex_postponement_requests
    ADD COLUMN desired_class_seq BIGINT NULL;

ALTER TABLE complex_postponement_requests
    ADD CONSTRAINT fk_cpr_desired_class
        FOREIGN KEY (desired_class_seq) REFERENCES complex_classes (seq);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2) complex_postponement_return_scan_logs: 신규 테이블
--    매일 11시 스케줄러가 다음날 복귀 예정자를 지점별로 집계 / 기록
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE complex_postponement_return_scan_logs (
    seq               BIGINT       NOT NULL AUTO_INCREMENT,
    branch_seq        BIGINT       NOT NULL,
    scan_date         DATE         NOT NULL,
    return_date       DATE         NOT NULL,
    member_count      INT          NOT NULL,
    sms_success_count INT          NOT NULL DEFAULT 0,
    sms_fail_count    INT          NOT NULL DEFAULT 0,
    created_date      DATETIME     NOT NULL,
    last_update_date  DATETIME     NULL,
    PRIMARY KEY (seq),
    CONSTRAINT uk_pprs_branch_scandate UNIQUE (branch_seq, scan_date)
);

-- 기존에 테이블이 있는 환경에서는 컬럼 추가 (idempotent 를 위해 IF NOT EXISTS 조건을 보조 사용자가 판단 후 실행)
-- ALTER TABLE complex_postponement_return_scan_logs ADD COLUMN sms_success_count INT NOT NULL DEFAULT 0;
-- ALTER TABLE complex_postponement_return_scan_logs ADD COLUMN sms_fail_count    INT NOT NULL DEFAULT 0;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3) message_placeholders: category 컬럼 추가
--    각 플레이스홀더가 어떤 카테고리(COMMON/RESERVATION/POSTPONEMENT/REFUND/TRANSFER)
--    에 속하는지 구분. 이벤트 타입별로 허용되는 플레이스홀더 필터링에 사용.
--
--    단계:
--      (a) nullable 로 컬럼 추가
--      (b) placeholder_value 패턴에 따라 카테고리 백필
--      (c) NOT NULL 로 변경
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE message_placeholders
    ADD COLUMN category VARCHAR(20) NULL;

UPDATE message_placeholders
   SET category = CASE
        WHEN placeholder_value LIKE '{reservation.%'  THEN 'RESERVATION'
        WHEN placeholder_value LIKE '{postponement.%' THEN 'POSTPONEMENT'
        WHEN placeholder_value LIKE '{refund.%'       THEN 'REFUND'
        WHEN placeholder_value LIKE '{transfer.%'     THEN 'TRANSFER'
        WHEN placeholder_value LIKE '{action.reason%' THEN 'ACTION_REASON'
        ELSE 'COMMON'
    END
 WHERE category IS NULL;

ALTER TABLE message_placeholders
    MODIFY COLUMN category VARCHAR(20) NOT NULL;

-- 액션 플레이스홀더 3건을 시드 (이미 있으면 건너뜀 — 재실행 안전)
-- 이벤트 종류 / 거절 사유 / 승인 코멘트. 리졸버 확장 후에만 실제 값으로 치환됨.
INSERT INTO message_placeholders (name, comment, examples, placeholder_value, category)
SELECT '{{이벤트}}', '요청 이벤트 종류 (연기/환불/양도)', '연기', '{action.event_type}', 'ACTION_REASON'
  FROM dual
 WHERE NOT EXISTS (SELECT 1 FROM message_placeholders WHERE placeholder_value = '{action.event_type}');

INSERT INTO message_placeholders (name, comment, examples, placeholder_value, category)
SELECT '{{사유}}', '거절 시 관리자가 작성한 사유', '제출 서류 미비', '{action.reject_reason}', 'ACTION_REASON'
  FROM dual
 WHERE NOT EXISTS (SELECT 1 FROM message_placeholders WHERE placeholder_value = '{action.reject_reason}');

INSERT INTO message_placeholders (name, comment, examples, placeholder_value, category)
SELECT '{{코멘트}}', '승인 시 관리자가 작성한 코멘트', '정상 처리되었습니다', '{action.approve_comment}', 'ACTION_REASON'
  FROM dual
 WHERE NOT EXISTS (SELECT 1 FROM message_placeholders WHERE placeholder_value = '{action.approve_comment}');


-- ─────────────────────────────────────────────────────────────────────────────
-- 4) message_templates: event_type 컬럼 추가
--    템플릿이 어떤 이벤트(예약확정/연기승인/환불반려/양도완료 등)에 쓰이는지 지정.
--    SmsEventConfig 저장 시 이벤트 타입이 일치하는 템플릿만 선택 가능.
--
--    단계:
--      (a) nullable 로 컬럼 추가
--      (b) 기존 템플릿이 있을 경우 '회원등록' 으로 임시 백필
--          (관리자가 템플릿 관리 화면에서 각 템플릿의 이벤트 타입을 재지정해야 함)
--      (c) NOT NULL 로 변경
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE message_templates
    ADD COLUMN event_type VARCHAR(20) NULL;

UPDATE message_templates
   SET event_type = '회원등록'
 WHERE event_type IS NULL;

ALTER TABLE message_templates
    MODIFY COLUMN event_type VARCHAR(20) NOT NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5) 연기/환불 요청: reject_reason → admin_message 리네임
--    승인/반려 공통으로 관리자가 입력한 메시지를 보관한다.
--    기존 반려 사유 값은 그대로 승계된다.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE complex_postponement_requests
    CHANGE COLUMN reject_reason admin_message VARCHAR(300) NULL;

ALTER TABLE complex_refund_requests
    CHANGE COLUMN reject_reason admin_message VARCHAR(300) NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6) transfer_requests: admin_message 컬럼 추가
--    양도 확인/거절 시 관리자가 입력한 메시지.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE transfer_requests
    ADD COLUMN admin_message VARCHAR(300) NULL;


-- =============================================================================
-- ROLLBACK (비상 복구용 — 위 변경을 역순으로 되돌림)
-- =============================================================================
--
-- ALTER TABLE transfer_requests DROP COLUMN admin_message;
--
-- ALTER TABLE complex_refund_requests
--     CHANGE COLUMN admin_message reject_reason VARCHAR(300) NULL;
-- ALTER TABLE complex_postponement_requests
--     CHANGE COLUMN admin_message reject_reason VARCHAR(300) NULL;
--
-- ALTER TABLE message_templates DROP COLUMN event_type;
--
-- ALTER TABLE message_placeholders DROP COLUMN category;
--
-- DROP TABLE complex_postponement_return_scan_logs;
--
-- ALTER TABLE complex_postponement_requests DROP FOREIGN KEY fk_cpr_desired_class;
-- ALTER TABLE complex_postponement_requests DROP COLUMN desired_class_seq;
