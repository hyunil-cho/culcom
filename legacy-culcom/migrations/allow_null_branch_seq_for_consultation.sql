-- 상담신청 고객의 경우 지점 미배정 상태를 허용하기 위해 branch_seq를 NULL 허용으로 변경

-- 1. 외래키 제약 삭제
ALTER TABLE customers DROP FOREIGN KEY customers_branches_FK;

-- 2. branch_seq 컬럼을 NULL 허용으로 변경
ALTER TABLE customers MODIFY COLUMN branch_seq int(10) unsigned NULL COMMENT '소속 지점 (NULL: 미배정)';

-- 3. 외래키 제약 다시 추가 (NULL 허용)
ALTER TABLE customers 
ADD CONSTRAINT customers_branches_FK 
FOREIGN KEY (branch_seq) REFERENCES branches(seq) 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- 참고: NULL인 경우 "미배정" 상태를 의미하며, 상담신청을 통해 등록된 고객을 나타냅니다.
