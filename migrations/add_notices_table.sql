-- 공지사항 및 이벤트 테이블 생성
-- 각 지점에서 공지사항/이벤트를 등록하고 회원들이 조회할 수 있는 기능

CREATE TABLE IF NOT EXISTS `notices` (
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
