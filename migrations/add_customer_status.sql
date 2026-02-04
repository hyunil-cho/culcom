-- customers 테이블에 status 컬럼 추가
-- 상태: 신규, 예약확정, 전화상거절, 부재중

ALTER TABLE customers 
ADD COLUMN status ENUM('신규', '예약확정', '전화상거절', '진행중') NOT NULL DEFAULT '신규' COMMENT '고객 상태'
AFTER call_count;

-- 기존 고객들의 상태를 '신규'로 설정 (이미 기본값으로 처리됨)
-- 인덱스 추가 (상태별 조회 최적화)
ALTER TABLE customers ADD KEY customers_status_IDX (status) USING BTREE;
