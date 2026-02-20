-- customers 테이블에 카카오 회원 식별용 컬럼 추가
ALTER TABLE `customers`
  ADD COLUMN `kakao_id` bigint DEFAULT NULL COMMENT '카카오 사용자 고유 ID' AFTER `ad_source`,
  ADD UNIQUE KEY `customers_kakao_id_unique` (`kakao_id`);
