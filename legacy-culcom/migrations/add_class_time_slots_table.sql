-- 수업 시간대 관리 테이블 추가

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