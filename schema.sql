-- culcom.branches definition

DROP TABLE IF EXISTS `mymunja_config_info`;
DROP TABLE IF EXISTS `branch-third-party-mapping`;
DROP TABLE IF EXISTS `reservation_sms_config`;
DROP TABLE IF EXISTS `reservation_info`;
DROP TABLE IF EXISTS `caller_selection_history`;
DROP TABLE IF EXISTS `message_templates`;
DROP TABLE IF EXISTS `notices`;
DROP TABLE IF EXISTS `memberships`;
DROP TABLE IF EXISTS `customers`;
DROP TABLE IF EXISTS `user_info`;
DROP TABLE IF EXISTS `third_party_services`;
DROP TABLE IF EXISTS `placeholders`;
DROP TABLE IF EXISTS `external_service_type`;
DROP TABLE IF EXISTS `complex_staff_class_mapping`;
DROP TABLE IF EXISTS `complex_staff_refund_info`;
DROP TABLE IF EXISTS `class_time_slots`;
DROP TABLE IF EXISTS `complex_classes`;
DROP TABLE IF EXISTS `complex_staffs`;
DROP TABLE IF EXISTS `branches`;

CREATE TABLE `branches` (
  `seq` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT '브렌치 식별자 정보',
  `branchName` varchar(50) NOT NULL COMMENT '브렌치 이름',
  `alias` varchar(50) NOT NULL COMMENT '브렌치 별명값',
  `branch_manager` varchar(50) DEFAULT NULL COMMENT '지점 담당자',
  `address` varchar(200) DEFAULT NULL COMMENT '지점 주소',
  `directions` text DEFAULT NULL COMMENT '오시는 길',
  `createdDate` date NOT NULL DEFAULT curdate() COMMENT '지점 추가 일자',
  `lastUpdateDate` date NOT NULL DEFAULT curdate() COMMENT '지점 수정 일자',
  PRIMARY KEY (`seq`),
  UNIQUE KEY `branches_alias_unique` (`alias`),
  KEY `branches_alias_IDX` (`alias`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='컬컴 지점 정보';


-- culcom.customers definition

CREATE TABLE `customers` (
  `seq` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `branch_seq` int(10) unsigned DEFAULT NULL COMMENT '소속 지점 (NULL: 미배정)',
  `name` varchar(100) NOT NULL,
  `phone_number` varchar(20) NOT NULL,
  `comment` varchar(200) DEFAULT NULL,
  `commercial_name` varchar(100) DEFAULT NULL,
  `ad_source` varchar(100) DEFAULT NULL COMMENT '광고 출처',
  `kakao_id` bigint DEFAULT NULL COMMENT '카카오 사용자 고유 ID',
  `createdDate` datetime NOT NULL DEFAULT current_timestamp() COMMENT '고객 추가 일시',
  `lastUpdateDate` datetime DEFAULT NULL ON UPDATE current_timestamp() COMMENT '고객 수정 일시',
  `call_count` int(10) unsigned DEFAULT 0,
  `status` ENUM('신규', '예약확정', '전화상거절', '진행중', '콜수초과') NOT NULL DEFAULT '신규' COMMENT '고객 상태',
  PRIMARY KEY (`seq`),
  UNIQUE KEY `customers_kakao_id_unique` (`kakao_id`),
  KEY `customers_branch_seq_IDX` (`branch_seq`) USING BTREE,
  KEY `customers_phone_number_IDX` (`phone_number`) USING BTREE,
  KEY `customers_name_IDX` (`name`) USING BTREE,
  KEY `customers_status_IDX` (`status`) USING BTREE,
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
  `customer_id` int(10) unsigned NULL COMMENT '고객 ID (삭제된 경우 NULL)',
  PRIMARY KEY (`seq`),
  KEY `reservation_info_branch_seq_IDX` (`branch_seq`) USING BTREE,
  KEY `reservation_info_user_info_FK` (`user_seq`),
  KEY `reservation_info_customers_FK` (`customer_id`),
  KEY `reservation_info_interview_date_IDX` (`interview_date`) USING BTREE,
  CONSTRAINT `reservation_info_branches_FK` FOREIGN KEY (`branch_seq`) REFERENCES `branches` (`seq`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `reservation_info_customers_FK` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`seq`) ON DELETE SET NULL ON UPDATE CASCADE,
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
  `callback_number` varchar(20) DEFAULT NULL COMMENT '발신번호 (하나만)',
  `remaining_count_sms` int(10) unsigned DEFAULT 0 COMMENT 'SMS 잔여건수',
  `remaining_count_lms` int(10) unsigned DEFAULT 0 COMMENT 'LMS 잔여건수',
  PRIMARY KEY (`seq`),
  UNIQUE KEY `mymunja_config_info_mapping_id_unique` (`mapping_id`),
  KEY `mymunja_config_info_branch_third_party_mapping_FK` (`mapping_id`),
  CONSTRAINT `mymunja_config_info_branch_third_party_mapping_FK` FOREIGN KEY (`mapping_id`) REFERENCES `branch-third-party-mapping` (`mapping_seq`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='마이문자 연동 설정';


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


-- culcom.class_time_slots definition

CREATE TABLE `class_time_slots` (
  `seq` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `branch_seq` int(10) unsigned NOT NULL COMMENT '소속 지점',
  `name` varchar(100) NOT NULL COMMENT '시간대 이름',
  `days_of_week` varchar(100) NOT NULL COMMENT '요일 (쉼표 구분)',
  `start_time` time NOT NULL COMMENT '시작 시간',
  `end_time` time NOT NULL COMMENT '종료 시간',
  `createdDate` datetime NOT NULL DEFAULT current_timestamp(),
  `lastUpdateDate` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`seq`),
  KEY `class_time_slots_branch_seq_IDX` (`branch_seq`) USING BTREE,
  CONSTRAINT `class_time_slots_branches_FK` FOREIGN KEY (`branch_seq`) REFERENCES `branches` (`seq`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='수업 시간대 정보';


-- culcom.complex_staffs definition

CREATE TABLE `complex_staffs` (
  `seq` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `branch_seq` int(10) unsigned NOT NULL COMMENT '소속 지점',
  `name` varchar(100) NOT NULL COMMENT '스태프 이름',
  `phone_number` varchar(20) DEFAULT NULL COMMENT '전화번호',
  `email` varchar(200) DEFAULT NULL COMMENT '이메일',
  `subject` varchar(100) DEFAULT NULL COMMENT '담당 과목/분야',
  `status` ENUM('재직', '휴직', '퇴직') NOT NULL DEFAULT '재직' COMMENT '재직 상태',
  `join_date` date DEFAULT NULL COMMENT '등록일',
  `comment` varchar(300) DEFAULT NULL COMMENT '비고',
  `interviewer` varchar(100) DEFAULT NULL COMMENT '인터뷰어',
  `payment_method` varchar(50) DEFAULT NULL COMMENT '결제방법',
  `createdDate` datetime NOT NULL DEFAULT current_timestamp() COMMENT '등록 일시',
  `lastUpdateDate` datetime DEFAULT NULL ON UPDATE current_timestamp() COMMENT '수정 일시',
  PRIMARY KEY (`seq`),
  KEY `complex_staffs_branch_seq_IDX` (`branch_seq`) USING BTREE,
  KEY `complex_staffs_status_IDX` (`status`) USING BTREE,
  CONSTRAINT `complex_staffs_branches_FK` FOREIGN KEY (`branch_seq`) REFERENCES `branches` (`seq`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='스태프(강사진) 정보';


-- culcom.complex_classes definition

CREATE TABLE `complex_classes` (
  `seq` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `branch_seq` int(10) unsigned NOT NULL COMMENT '소속 지점',
  `time_slot_seq` int(10) unsigned NOT NULL COMMENT '수업 시간대 ID',
  `staff_seq` int(10) unsigned DEFAULT NULL COMMENT '담당 스태프 ID (NULL: 미배정)',
  `name` varchar(100) NOT NULL COMMENT '수업 이름',
  `description` varchar(500) DEFAULT NULL COMMENT '수업 설명',
  `capacity` int(10) unsigned NOT NULL DEFAULT 10 COMMENT '정원',
  `createdDate` datetime NOT NULL DEFAULT current_timestamp() COMMENT '등록 일시',
  `lastUpdateDate` datetime DEFAULT NULL ON UPDATE current_timestamp() COMMENT '수정 일시',
  PRIMARY KEY (`seq`),
  KEY `complex_classes_branch_seq_IDX` (`branch_seq`) USING BTREE,
  KEY `complex_classes_time_slot_seq_IDX` (`time_slot_seq`) USING BTREE,
  KEY `complex_classes_staff_seq_IDX` (`staff_seq`) USING BTREE,
  CONSTRAINT `complex_classes_branches_FK` FOREIGN KEY (`branch_seq`) REFERENCES `branches` (`seq`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `complex_classes_time_slot_FK` FOREIGN KEY (`time_slot_seq`) REFERENCES `class_time_slots` (`seq`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `complex_classes_staff_FK` FOREIGN KEY (`staff_seq`) REFERENCES `complex_staffs` (`seq`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='수업 정보';


-- culcom.complex_staff_refund_info definition

CREATE TABLE `complex_staff_refund_info` (
  `seq` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `staff_seq` int(10) unsigned NOT NULL COMMENT '스태프 ID',
  `deposit_amount` varchar(50) DEFAULT NULL COMMENT '디파짓 금액',
  `refundable_deposit` varchar(50) DEFAULT NULL COMMENT '환급 예정 디파짓',
  `non_refundable_deposit` varchar(50) DEFAULT NULL COMMENT '환급불가 디파짓',
  `refund_bank` varchar(50) DEFAULT NULL COMMENT '환급 은행',
  `refund_account` varchar(50) DEFAULT NULL COMMENT '환급 계좌번호',
  `refund_amount` varchar(50) DEFAULT NULL COMMENT '환급 금액',
  `createdDate` datetime NOT NULL DEFAULT current_timestamp() COMMENT '등록 일시',
  `lastUpdateDate` datetime DEFAULT NULL ON UPDATE current_timestamp() COMMENT '수정 일시',
  PRIMARY KEY (`seq`),
  UNIQUE KEY `complex_staff_refund_info_staff_unique` (`staff_seq`),
  CONSTRAINT `complex_staff_refund_info_staff_FK` FOREIGN KEY (`staff_seq`) REFERENCES `complex_staffs` (`seq`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='스태프 환급/디파짓 정보';


-- culcom.complex_staff_class_mapping definition

CREATE TABLE `complex_staff_class_mapping` (
  `seq` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `staff_seq` int(10) unsigned NOT NULL COMMENT '스태프 ID',
  `class_time_slot_seq` int(10) unsigned NOT NULL COMMENT '수업 시간대 ID',
  `createdDate` datetime NOT NULL DEFAULT current_timestamp() COMMENT '배정 일시',
  PRIMARY KEY (`seq`),
  UNIQUE KEY `complex_staff_class_mapping_unique` (`staff_seq`, `class_time_slot_seq`),
  KEY `complex_staff_class_mapping_slot_IDX` (`class_time_slot_seq`) USING BTREE,
  CONSTRAINT `complex_staff_class_mapping_staff_FK` FOREIGN KEY (`staff_seq`) REFERENCES `complex_staffs` (`seq`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `complex_staff_class_mapping_slot_FK` FOREIGN KEY (`class_time_slot_seq`) REFERENCES `class_time_slots` (`seq`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='스태프-수업 배정 매핑';


-- culcom.caller_selection_history definition

CREATE TABLE `caller_selection_history` (
  `seq` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int(10) unsigned NOT NULL COMMENT '고객 ID',
  `caller` varchar(2) NOT NULL COMMENT '선택된 CALLER',
  `branch_seq` int(10) unsigned NOT NULL COMMENT '지점 ID',
  `selected_date` datetime NOT NULL DEFAULT current_timestamp() COMMENT '선택 일시',
  PRIMARY KEY (`seq`),
  KEY `caller_selection_customer_id_IDX` (`customer_id`) USING BTREE,
  KEY `caller_selection_caller_IDX` (`caller`) USING BTREE,
  KEY `caller_selection_branch_seq_IDX` (`branch_seq`) USING BTREE,
  KEY `caller_selection_selected_date_IDX` (`selected_date`) USING BTREE,
  CONSTRAINT `caller_selection_customer_FK` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`seq`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `caller_selection_branch_FK` FOREIGN KEY (`branch_seq`) REFERENCES `branches` (`seq`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='CALLER 선택 이력';


-- culcom.notices definition

CREATE TABLE `notices` (
  `seq` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `branch_seq` int(10) unsigned NOT NULL COMMENT '소속 지점',
  `title` varchar(200) NOT NULL COMMENT '제목',
  `content` text NOT NULL COMMENT '내용',
  `category` ENUM('공지사항', '이벤트') NOT NULL DEFAULT '공지사항' COMMENT '카테고리',
  `is_pinned` tinyint(1) NOT NULL DEFAULT 0 COMMENT '상단 고정 여부',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '활성 상태',
  `view_count` int(10) unsigned DEFAULT 0 COMMENT '조회수',
  `event_start_date` date DEFAULT NULL COMMENT '이벤트 시작일',
  `event_end_date` date DEFAULT NULL COMMENT '이벤트 종료일',
  `created_by` varchar(100) DEFAULT NULL COMMENT '작성자',
  `createdDate` datetime NOT NULL DEFAULT current_timestamp() COMMENT '작성 일시',
  `lastUpdateDate` datetime DEFAULT NULL ON UPDATE current_timestamp() COMMENT '수정 일시',
  PRIMARY KEY (`seq`),
  KEY `notices_branch_seq_IDX` (`branch_seq`) USING BTREE,
  KEY `notices_category_IDX` (`category`) USING BTREE,
  KEY `notices_is_active_IDX` (`is_active`) USING BTREE,
  KEY `notices_is_pinned_IDX` (`is_pinned`) USING BTREE,
  KEY `notices_createdDate_IDX` (`createdDate`) USING BTREE,
  CONSTRAINT `notices_branches_FK` FOREIGN KEY (`branch_seq`) REFERENCES `branches` (`seq`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='공지사항 및 이벤트';


-- culcom.memberships definition

CREATE TABLE `memberships` (
  `seq` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT '멤버십 이름',
  `duration` int(10) unsigned NOT NULL COMMENT '기간 (일 단위)',
  `count` int(10) unsigned NOT NULL COMMENT '횟수',
  `price` int(10) unsigned NOT NULL COMMENT '가격',
  `createdDate` datetime NOT NULL DEFAULT current_timestamp() COMMENT '등록일',
  `lastUpdateDate` datetime DEFAULT NULL ON UPDATE current_timestamp() COMMENT '변경일',
  PRIMARY KEY (`seq`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='멤버십 정보';


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
('{{  고객명}}'  , '고객의 이름', '홍길동', 'customer.name'),
('{{전화번호}}', '고객의 전화번호', '010-1234-5678', 'customer.phone_number'),
('{{지점명}}', '소속 지점 이름', '강남지점', 'branch.name'),
('{{현재날짜}}', '오늘 날짜', '2026-01-27', 'system.current_date'),
('{{현재시간}}', '현재 시각', '14:30', 'system.current_time'),
('{{현재날짜시간}}', '현재 날짜와 시각', '2026-01-27 14:30', 'system.current_datetime'),
('{{예약일자}}', '예약 확정 일시', '2026년 2월 15일 14:30', 'reservation.interview_date'),
('{{예약시간}}', '예약 확정 날짜와 시간', '2026년 2월 15일 오후 2:30', 'reservation.interview_datetime'),
('{{지점주소}}', '지점 주소', '서울시 강남구', 'branch.address'),
('{{담당자}}', '지점 담당자 이름', '홍길동', 'branch.manager'),
('{{오시는길}}', '지점 오시는 길 안내', '2호선 강남역 3번 출구 도보 5분', 'branch.directions');

-- 관리자 계정 (root/root - 평문 저장, 테스트용)
INSERT INTO `user_info` (`seq`, `branch_seq`, `user_id`, `user_password`) VALUES
(1, NULL, 'root', 'root');