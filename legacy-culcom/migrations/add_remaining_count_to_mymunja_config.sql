-- mymunja_config_info 테이블에 잔여건수 필드 추가
ALTER TABLE `mymunja_config_info` 
ADD COLUMN `remaining_count` int(10) unsigned DEFAULT 0 COMMENT 'SMS 잔여건수';
