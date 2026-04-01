-- CALLER 선택 이력 테이블 생성
CREATE TABLE IF NOT EXISTS `caller_selection_history` (
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
