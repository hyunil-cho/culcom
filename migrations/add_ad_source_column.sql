-- customers 테이블에 ad_source 컬럼 추가
ALTER TABLE customers 
ADD COLUMN `ad_source` varchar(100) DEFAULT NULL COMMENT '광고 출처' 
AFTER `commercial_name`;
