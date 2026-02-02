-- mymunja_config_info 테이블에 callback_number 필드 추가
ALTER TABLE mymunja_config_info 
ADD COLUMN callback_number varchar(20) DEFAULT NULL COMMENT '발신번호 (하나만)';

-- 기존 mymunja_callback_number 테이블의 데이터를 mymunja_config_info로 이전
UPDATE mymunja_config_info mci
INNER JOIN (
    SELECT config_id, MIN(number) as first_number
    FROM mymunja_callback_number
    GROUP BY config_id
) mcn ON mci.seq = mcn.config_id
SET mci.callback_number = mcn.first_number;

-- mymunja_callback_number 테이블 삭제
DROP TABLE IF EXISTS mymunja_callback_number;
