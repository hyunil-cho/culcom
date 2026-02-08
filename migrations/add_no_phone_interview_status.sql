-- Add '전화상안함' to customer status ENUM
-- Migration: add_no_phone_interview_status
-- Date: 2026-02-08

ALTER TABLE `customers` 
MODIFY COLUMN `status` ENUM('신규', '예약확정', '전화상거절', '전화상안함', '진행중', '콜수초과') NOT NULL DEFAULT '신규' COMMENT '고객 상태';
