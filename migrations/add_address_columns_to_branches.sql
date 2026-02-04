-- 지점 테이블에 주소와 오시는 길 컬럼 추가

ALTER TABLE `branches` 
ADD COLUMN `address` VARCHAR(200) NULL COMMENT '지점 주소' AFTER `alias`,
ADD COLUMN `directions` TEXT NULL COMMENT '오시는 길' AFTER `address`;
