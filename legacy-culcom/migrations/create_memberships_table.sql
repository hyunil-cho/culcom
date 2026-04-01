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
