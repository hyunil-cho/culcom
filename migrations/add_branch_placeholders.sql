-- 지점 정보 플레이스홀더 추가
INSERT INTO `placeholders` (`name`, `comment`, `examples`, `value`) VALUES
('{{지점주소}}', '지점 주소', '서울시 강남구 테헤란로 123', 'branch.address'),
('{{담당자}}', '지점 담당자 이름', '홍길동', 'branch.manager'),
('{{오시는길}}', '지점 오시는 길 안내', '2호선 강남역 3번 출구 도보 5분', 'branch.directions');
