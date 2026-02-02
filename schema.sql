-- culcom.branches definition

DROP TABLE IF EXISTS `mymunja_callback_number`;
DROP TABLE IF EXISTS `mymunja_config_info`;
DROP TABLE IF EXISTS `branch-third-party-mapping`;
DROP TABLE IF EXISTS `reservation_info`;
DROP TABLE IF EXISTS `message_templates`;
DROP TABLE IF EXISTS `customers`;
DROP TABLE IF EXISTS `user_info`;
DROP TABLE IF EXISTS `third_party_services`;
DROP TABLE IF EXISTS `placeholders`;
DROP TABLE IF EXISTS `external_service_type`;
DROP TABLE IF EXISTS `branches`;

CREATE TABLE `branches` (
  `seq` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT '브렌치 식별자 정보',
  `branchName` varchar(50) NOT NULL COMMENT '브렌치 이름',
  `alias` varchar(50) NOT NULL COMMENT '브렌치 별명값',
  `createdDate` date NOT NULL DEFAULT curdate() COMMENT '지점 추가 일자',
  `lastUpdateDate` date NOT NULL DEFAULT curdate() COMMENT '지점 수정 일자',
  PRIMARY KEY (`seq`),
  UNIQUE KEY `branches_alias_unique` (`alias`),
  KEY `branches_alias_IDX` (`alias`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='컬컴 지점 정보';


-- culcom.customers definition

CREATE TABLE `customers` (
  `seq` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `branch_seq` int(10) unsigned NOT NULL COMMENT '소속 지점',
  `name` varchar(100) NOT NULL,
  `phone_number` varchar(20) NOT NULL,
  `comment` varchar(200) DEFAULT NULL,
  `commercial_name` varchar(100) DEFAULT NULL,
  `ad_source` varchar(100) DEFAULT NULL COMMENT '광고 출처',
  `createdDate` datetime NOT NULL DEFAULT current_timestamp() COMMENT '고객 추가 일시',
  `lastUpdateDate` datetime DEFAULT NULL ON UPDATE current_timestamp() COMMENT '고객 수정 일시',
  `call_count` int(10) unsigned DEFAULT 0,
  PRIMARY KEY (`seq`),
  KEY `customers_branch_seq_IDX` (`branch_seq`) USING BTREE,
  KEY `customers_phone_number_IDX` (`phone_number`) USING BTREE,
  KEY `customers_name_IDX` (`name`) USING BTREE,
  CONSTRAINT `customers_branches_FK` FOREIGN KEY (`branch_seq`) REFERENCES `branches` (`seq`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='고객 정보';


-- culcom.external_service_type definition

CREATE TABLE `external_service_type` (
  `seq` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `code_name` varchar(50) NOT NULL,
  PRIMARY KEY (`seq`),
  UNIQUE KEY `external_service_type_code_name_unique` (`code_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='외부 서비스 타입 코드';


-- culcom.placeholders definition

CREATE TABLE `placeholders` (
  `seq` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(30) NOT NULL,
  `comment` varchar(100) DEFAULT NULL,
  `examples` varchar(50) DEFAULT NULL,
  `value` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`seq`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='메시지 플레이스홀더';


-- culcom.user_info definition

CREATE TABLE `user_info` (
  `seq` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `branch_seq` int(10) unsigned DEFAULT NULL COMMENT '소속 지점 (NULL이면 전체)',
  `user_id` varchar(100) NOT NULL,
  `user_password` varchar(200) NOT NULL,
  `createdDate` date NOT NULL DEFAULT curdate() COMMENT '계정 추가 일자',
  `lastUpdateDate` date NOT NULL DEFAULT curdate() COMMENT '계정 수정 일자',
  PRIMARY KEY (`seq`),
  UNIQUE KEY `user_info_unique` (`user_id`),
  KEY `user_info_branch_seq_IDX` (`branch_seq`) USING BTREE,
  CONSTRAINT `user_info_branches_FK` FOREIGN KEY (`branch_seq`) REFERENCES `branches` (`seq`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 계정';


-- culcom.message_templates definition

CREATE TABLE `message_templates` (
  `seq` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `template_name` varchar(300) NOT NULL,
  `description` varchar(300) DEFAULT NULL,
  `createdDate` date NOT NULL DEFAULT curdate() COMMENT '템플릿 추가 일자',
  `lastUpdateDate` date NOT NULL DEFAULT curdate() COMMENT '템플릿 수정 일자',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `message_context` text DEFAULT NULL,
  `branch_seq` int(10) unsigned NOT NULL,
  PRIMARY KEY (`seq`),
  UNIQUE KEY `message_templates_branch_default_unique` (`branch_seq`, `is_default`),
  KEY `message_templates_is_default_IDX` (`is_default`) USING BTREE,
  KEY `message_templates_is_active_IDX` (`is_active`) USING BTREE,
  CONSTRAINT `message_templates_branches_FK` FOREIGN KEY (`branch_seq`) REFERENCES `branches` (`seq`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='메시지 템플릿';


-- culcom.reservation_info definition

CREATE TABLE `reservation_info` (
  `seq` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `branch_seq` int(10) unsigned NOT NULL COMMENT '소속 지점',
  `createdDate` date NOT NULL DEFAULT curdate() COMMENT '예약 추가 일자',
  `lastUpdateDate` date NOT NULL DEFAULT curdate() COMMENT '예약 수정 일자',
  `caller` varchar(2) NOT NULL COMMENT '호출자 구분',
  `interview_date` datetime NOT NULL COMMENT '상담 일시',
  `user_seq` int(10) unsigned NOT NULL,
  `customer_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`seq`),
  KEY `reservation_info_branch_seq_IDX` (`branch_seq`) USING BTREE,
  KEY `reservation_info_user_info_FK` (`user_seq`),
  KEY `reservation_info_customers_FK` (`customer_id`),
  KEY `reservation_info_interview_date_IDX` (`interview_date`) USING BTREE,
  CONSTRAINT `reservation_info_branches_FK` FOREIGN KEY (`branch_seq`) REFERENCES `branches` (`seq`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `reservation_info_customers_FK` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`seq`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `reservation_info_user_info_FK` FOREIGN KEY (`user_seq`) REFERENCES `user_info` (`seq`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='예약 정보';


-- culcom.third_party_services definition

CREATE TABLE `third_party_services` (
  `seq` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `createdDate` date NOT NULL DEFAULT curdate(),
  `updateDate` date NOT NULL DEFAULT curdate(),
  `name` varchar(50) NOT NULL,
  `description` varchar(100) DEFAULT NULL,
  `code_seq` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`seq`),
  KEY `third_party_services_external_service_type_FK` (`code_seq`),
  KEY `third_party_services_name_IDX` (`name`) USING BTREE,
  CONSTRAINT `third_party_services_external_service_type_FK` FOREIGN KEY (`code_seq`) REFERENCES `external_service_type` (`seq`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='외부 연동 서비스';


-- culcom.`branch-third-party-mapping` definition

CREATE TABLE `branch-third-party-mapping` (
  `branch_id` int(10) unsigned NOT NULL,
  `third_party_id` int(10) unsigned NOT NULL,
  `createdDate` date NOT NULL DEFAULT curdate() COMMENT '연동 추가 일자',
  `lastUpdateDate` date NOT NULL DEFAULT curdate() COMMENT '연동 수정 일자',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `mapping_seq` int(10) unsigned NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`mapping_seq`),
  UNIQUE KEY `branch_third_party_mapping_unique` (`branch_id`, `third_party_id`),
  KEY `branch_third_party_mapping_branches_FK` (`branch_id`),
  KEY `branch_third_party_mapping_third_party_services_FK` (`third_party_id`),
  KEY `branch_third_party_mapping_is_active_IDX` (`is_active`) USING BTREE,
  CONSTRAINT `branch_third_party_mapping_branches_FK` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`seq`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `branch_third_party_mapping_third_party_services_FK` FOREIGN KEY (`third_party_id`) REFERENCES `third_party_services` (`seq`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='지점별 외부 서비스 연동 매핑';


-- culcom.mymunja_config_info definition

CREATE TABLE `mymunja_config_info` (
  `seq` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `mapping_id` int(10) unsigned NOT NULL,
  `mymunja_id` varchar(200) NOT NULL,
  `mymunja_password` varchar(100) NOT NULL,
  `remaining_count` int(10) unsigned DEFAULT 0 COMMENT 'SMS 잔여건수',
  PRIMARY KEY (`seq`),
  UNIQUE KEY `mymunja_config_info_mapping_id_unique` (`mapping_id`),
  KEY `mymunja_config_info_branch_third_party_mapping_FK` (`mapping_id`),
  CONSTRAINT `mymunja_config_info_branch_third_party_mapping_FK` FOREIGN KEY (`mapping_id`) REFERENCES `branch-third-party-mapping` (`mapping_seq`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='마이문자 연동 설정';


-- culcom.mymunja_callback_number definition

CREATE TABLE `mymunja_callback_number` (
  `seq` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `config_id` int(10) unsigned NOT NULL,
  `number` varchar(20) NOT NULL,
  `createdDate` date NOT NULL DEFAULT curdate() COMMENT '회신번호 추가 일자',
  `lastUpdateDate` date NOT NULL DEFAULT curdate() COMMENT '회신번호 수정 일자',
  PRIMARY KEY (`seq`),
  KEY `mymunja_callback_number_config_id_IDX` (`config_id`) USING BTREE,
  CONSTRAINT `mymunja_callback_number_mymunja_config_info_FK` FOREIGN KEY (`config_id`) REFERENCES `mymunja_config_info` (`seq`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='마이문자 회신번호';


-- culcom.calendar_config definition

CREATE TABLE `calendar_config` (
  `seq` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `branch_seq` int(10) unsigned NOT NULL COMMENT '소속 지점',
  `access_token` text DEFAULT NULL COMMENT 'Google API Access Token',
  `refresh_token` text DEFAULT NULL COMMENT 'Google API Refresh Token',
  `token_expiry` datetime DEFAULT NULL COMMENT 'Access Token 만료 시간',
  `connected_email` varchar(200) DEFAULT NULL COMMENT '연동된 구글 계정 이메일',
  `is_active` tinyint(1) NOT NULL DEFAULT 0 COMMENT '연동 활성화 여부',
  `createdDate` datetime NOT NULL DEFAULT current_timestamp() COMMENT '설정 생성 일시',
  `lastUpdateDate` datetime DEFAULT NULL ON UPDATE current_timestamp() COMMENT '설정 수정 일시',
  PRIMARY KEY (`seq`),
  UNIQUE KEY `calendar_config_branch_seq_unique` (`branch_seq`),
  KEY `calendar_config_branch_seq_IDX` (`branch_seq`) USING BTREE,
  CONSTRAINT `calendar_config_branches_FK` FOREIGN KEY (`branch_seq`) REFERENCES `branches` (`seq`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='구글 캘린더 연동 설정';

-- culcom.reservation_sms_config definition

CREATE TABLE `reservation_sms_config` (
  `seq` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `branch_seq` int(10) unsigned NOT NULL COMMENT '소속 지점',
  `template_seq` int(10) unsigned NOT NULL COMMENT '메시지 템플릿 seq',
  `sender_number` varchar(20) NOT NULL COMMENT '발신번호',
  `auto_send` tinyint(1) NOT NULL DEFAULT 0 COMMENT '자동 발송 여부',
  `createdDate` datetime NOT NULL DEFAULT current_timestamp() COMMENT '설정 생성 일시',
  `lastUpdateDate` datetime DEFAULT NULL ON UPDATE current_timestamp() COMMENT '설정 수정 일시',
  PRIMARY KEY (`seq`),
  UNIQUE KEY `reservation_sms_config_branch_seq_unique` (`branch_seq`),
  KEY `reservation_sms_config_branch_seq_IDX` (`branch_seq`) USING BTREE,
  KEY `reservation_sms_config_template_seq_IDX` (`template_seq`) USING BTREE,
  CONSTRAINT `reservation_sms_config_branches_FK` FOREIGN KEY (`branch_seq`) REFERENCES `branches` (`seq`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `reservation_sms_config_template_FK` FOREIGN KEY (`template_seq`) REFERENCES `message_templates` (`seq`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='예약 확정 시 SMS 자동 발송 설정';


-- ============================================
-- 초기 데이터 삽입
-- ============================================

-- 외부 서비스 타입 코드
INSERT INTO `external_service_type` (`seq`, `code_name`) VALUES (1, 'SMS');

-- 외부 연동 서비스
INSERT INTO `third_party_services` (`name`, `description`, `code_seq`) VALUES 
('마이문자', '마이문자 연동 서비스', 1);

-- 플레이스홀더
INSERT INTO `placeholders` (`name`, `comment`, `examples`, `value`) VALUES
('{{고객명}}', '고객의 이름', '홍길동', 'customer.name'),
('{{전화번호}}', '고객의 전화번호', '010-1234-5678', 'customer.phone_number'),
('{{지점명}}', '소속 지점 이름', '강남지점', 'branch.name'),
('{{현재날짜}}', '오늘 날짜', '2026-01-27', 'system.current_date'),
('{{현재시간}}', '현재 시각', '14:30', 'system.current_time'),
('{{현재날짜시간}}', '현재 날짜와 시각', '2026-01-27 14:30', 'system.current_datetime');

-- 관리자 계정 (root/root - 평문 저장, 테스트용)
INSERT INTO `user_info` ('seq',`branch_seq`, `user_id`, `user_password`) VALUES
(1, NULL, 'root', 'root');

ALTER TABLE customers 
MODIFY COLUMN createdDate datetime NOT NULL DEFAULT current_timestamp() COMMENT '고객 추가 일시',
MODIFY COLUMN lastUpdateDate datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT '고객 수정 일시';

ALTER TABLE customers 
MODIFY COLUMN lastUpdateDate datetime DEFAULT NULL ON UPDATE current_timestamp() COMMENT '고객 수정 일시';