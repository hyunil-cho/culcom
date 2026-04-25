-- =============================================================================
-- Migration: 2026-04-24
--   complex_classes / class_time_slots 에 soft-delete 컬럼 추가
--
--   1) deleted 컬럼 추가 — NOT NULL + DEFAULT 0(=false). 기존 행은 모두 활성으로 backfill
--   2) 기존 name unique 제약을 (name, deleted) 복합 unique 로 교체
--      → 같은 이름의 새 행을 추가할 때 옛 soft-deleted 행과 충돌 회피
--
-- 대상 DBMS : MySQL (stg / prod)
-- 로컬 H2 (ddl-auto: update) 에는 자동 반영되므로 별도 실행 불필요
-- 실행 전 반드시 백업 및 점검 시간 확인
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) deleted 컬럼 추가
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE complex_classes
    ADD COLUMN deleted TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE class_time_slots
    ADD COLUMN deleted TINYINT(1) NOT NULL DEFAULT 0;

-- 안전장치: NOT NULL DEFAULT 0 으로 자동 채워지지만, 혹시 모를 NULL 케이스 대비
UPDATE complex_classes  SET deleted = 0 WHERE deleted IS NULL;
UPDATE class_time_slots SET deleted = 0 WHERE deleted IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) 기존 name unique 제약 → 복합 unique 로 교체
--
-- 실제 인덱스 이름은 환경마다 다를 수 있으므로 INFORMATION_SCHEMA 로 확인 후 실행:
--   SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
--    WHERE TABLE_SCHEMA = DATABASE()
--      AND TABLE_NAME IN ('complex_classes', 'class_time_slots')
--      AND COLUMN_NAME = 'name'
--      AND NON_UNIQUE = 0;
-- 출력된 INDEX_NAME 들을 아래 <기존_name_unique_index> 자리에 채워 실행한다.
-- ─────────────────────────────────────────────────────────────────────────────

-- complex_classes
-- ALTER TABLE complex_classes DROP INDEX <기존_name_unique_index>;
ALTER TABLE complex_classes
    ADD CONSTRAINT uk_complex_classes_name_deleted UNIQUE (name, deleted);

-- class_time_slots
-- ALTER TABLE class_time_slots DROP INDEX <기존_name_unique_index>;
ALTER TABLE class_time_slots
    ADD CONSTRAINT uk_class_time_slots_name_deleted UNIQUE (name, deleted);
