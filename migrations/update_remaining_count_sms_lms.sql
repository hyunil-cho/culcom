-- SMS와 LMS 잔여건수를 분리하여 관리
-- 기존 remaining_count를 remaining_count_sms로 변경하고, remaining_count_lms 컬럼 추가

ALTER TABLE `mymunja_config_info`
CHANGE COLUMN `remaining_count` `remaining_count_sms` int(10) unsigned DEFAULT 0 COMMENT 'SMS 잔여건수',
ADD COLUMN `remaining_count_lms` int(10) unsigned DEFAULT 0 COMMENT 'LMS 잔여건수' AFTER `remaining_count_sms`;
