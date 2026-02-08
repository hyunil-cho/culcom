-- 지점 담당자 컬럼 추가
ALTER TABLE branches 
ADD COLUMN branch_manager VARCHAR(50) DEFAULT NULL COMMENT '지점 담당자'
AFTER alias;
