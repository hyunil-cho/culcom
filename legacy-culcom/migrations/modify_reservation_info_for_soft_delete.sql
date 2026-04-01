-- reservation_info 테이블의 customer_id를 nullable로 변경하고 
-- FK constraint를 ON DELETE SET NULL로 수정

-- 기존 FK constraint 삭제
ALTER TABLE reservation_info DROP FOREIGN KEY reservation_info_customers_FK;

-- customer_id를 nullable로 변경
ALTER TABLE reservation_info MODIFY COLUMN customer_id int(10) unsigned NULL;

-- 새로운 FK constraint 추가 (ON DELETE SET NULL)
ALTER TABLE reservation_info 
ADD CONSTRAINT reservation_info_customers_FK 
FOREIGN KEY (customer_id) REFERENCES customers(seq) 
ON DELETE SET NULL 
ON UPDATE CASCADE;