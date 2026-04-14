package com.culcom.service;

import com.culcom.entity.branch.Branch;
import com.culcom.entity.message.Placeholder;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.PlaceholderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * SmsMessageResolver 테스트 — resolveWithContext (DB 기반 치환)
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SmsMessageResolverTest {

    @Autowired SmsMessageResolver resolver;
    @Autowired PlaceholderRepository placeholderRepository;
    @Autowired BranchRepository branchRepository;

    @Nested
    class ResolveWithContext {

        private Branch branch;

        @BeforeEach
        void setUp() {
            // DataInitializer가 test 프로필에서 실행될 수 있으므로 기존 데이터 정리 후 직접 세팅
            placeholderRepository.deleteAll();

            placeholderRepository.save(Placeholder.builder()
                    .name("{{고객명}}").value("{customer.name}").comment("고객의 이름").build());
            placeholderRepository.save(Placeholder.builder()
                    .name("{{전화번호}}").value("{customer.phone_number}").comment("고객의 전화번호").build());
            placeholderRepository.save(Placeholder.builder()
                    .name("{{지점명}}").value("{branch.name}").comment("지점 이름").build());
            placeholderRepository.save(Placeholder.builder()
                    .name("{{지점주소}}").value("{branch.address}").comment("지점 주소").build());
            placeholderRepository.save(Placeholder.builder()
                    .name("{{담당자}}").value("{branch.manager}").comment("담당자").build());
            placeholderRepository.save(Placeholder.builder()
                    .name("{{오시는길}}").value("{branch.directions}").comment("오시는 길").build());
            placeholderRepository.save(Placeholder.builder()
                    .name("{{현재날짜}}").value("{system.current_date}").comment("오늘 날짜").build());
            placeholderRepository.save(Placeholder.builder()
                    .name("{{현재시간}}").value("{system.current_time}").comment("현재 시각").build());
            placeholderRepository.save(Placeholder.builder()
                    .name("{{현재날짜시간}}").value("{system.current_datetime}").comment("현재 날짜시각").build());
            placeholderRepository.save(Placeholder.builder()
                    .name("{{예약일자}}").value("{reservation.interview_date}").comment("예약 일시").build());
            placeholderRepository.save(Placeholder.builder()
                    .name("{{예약시간}}").value("{reservation.interview_datetime}").comment("예약 날짜시간").build());

            branch = branchRepository.save(Branch.builder()
                    .branchName("강남지점")
                    .alias("test-resolver-" + System.nanoTime())
                    .address("서울시 강남구 테헤란로 123")
                    .branchManager("김매니저")
                    .directions("2호선 강남역 3번 출구 도보 5분")
                    .build());
        }

        @Test
        void 고객정보_치환() {
            String result = resolver.resolveWithContext(
                    "{{고객명}}님({{전화번호}}) 환영합니다",
                    branch, "홍길동", "01012345678", null);

            assertThat(result).isEqualTo("홍길동님(01012345678) 환영합니다");
        }

        @Test
        void 지점정보_자동_주입() {
            String result = resolver.resolveWithContext(
                    "{{지점명}} 위치: {{지점주소}}, 담당: {{담당자}}, {{오시는길}}",
                    branch, null, null, null);

            assertThat(result).isEqualTo(
                    "강남지점 위치: 서울시 강남구 테헤란로 123, 담당: 김매니저, 2호선 강남역 3번 출구 도보 5분");
        }

        @Test
        void 예약일시_치환() {
            String result = resolver.resolveWithContext(
                    "예약일: {{예약일자}}, 시간: {{예약시간}}",
                    branch, null, null, "2026-05-01 14:30");

            assertThat(result).isEqualTo("예약일: 2026-05-01 14:30, 시간: 2026-05-01 14:30");
        }

        @Test
        void 시스템_날짜_자동_주입() {
            String result = resolver.resolveWithContext(
                    "발송일: {{현재날짜}}",
                    branch, null, null, null);

            String today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE);
            assertThat(result).isEqualTo("발송일: " + today);
        }

        @Test
        void 시스템_시간_자동_주입() {
            String before = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm"));

            String result = resolver.resolveWithContext(
                    "현재: {{현재시간}}",
                    branch, null, null, null);

            String after = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm"));
            // 분 단위이므로 실행 전후 시간 중 하나와 일치해야 함
            assertThat(result).isIn("현재: " + before, "현재: " + after);
        }

        @Test
        void 시스템_날짜시간_자동_주입() {
            String before = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));

            String result = resolver.resolveWithContext(
                    "발송: {{현재날짜시간}}",
                    branch, null, null, null);

            String after = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
            assertThat(result).isIn("발송: " + before, "발송: " + after);
        }

        @Test
        void 모든_플레이스홀더_복합_치환() {
            String template = "{{고객명}}님, {{지점명}}에 {{예약일자}}에 예약되었습니다. 위치: {{지점주소}}";

            String result = resolver.resolveWithContext(
                    template, branch, "홍길동", "01012345678", "2026-05-01 14:30");

            assertThat(result).isEqualTo(
                    "홍길동님, 강남지점에 2026-05-01 14:30에 예약되었습니다. 위치: 서울시 강남구 테헤란로 123");
        }

        @Test
        void branch가_null이면_지점정보는_빈문자열() {
            String result = resolver.resolveWithContext(
                    "{{지점명}} {{지점주소}} {{담당자}} {{오시는길}}",
                    null, "홍길동", null, null);

            assertThat(result)
                    .as("지점 정보가 없으면 빈 문자열로 치환")
                    .isEqualTo("   ");
        }

        @Test
        void null_인자는_빈문자열로_치환() {
            String result = resolver.resolveWithContext(
                    "이름: {{고객명}}, 전화: {{전화번호}}, 예약: {{예약일자}}",
                    branch, null, null, null);

            assertThat(result).isEqualTo("이름: , 전화: , 예약: ");
        }

        @Test
        void 플레이스홀더가_없는_일반_텍스트는_그대로_반환() {
            String result = resolver.resolveWithContext(
                    "안녕하세요 반갑습니다",
                    branch, "홍길동", "01012345678", null);

            assertThat(result).isEqualTo("안녕하세요 반갑습니다");
        }

        @Test
        void 동일_플레이스홀더가_여러번_등장하면_모두_치환() {
            String result = resolver.resolveWithContext(
                    "{{고객명}}님, {{고객명}}님의 예약이 확정되었습니다",
                    branch, "홍길동", null, null);

            assertThat(result).isEqualTo("홍길동님, 홍길동님의 예약이 확정되었습니다");
        }

        @Test
        void DB에_정의되지_않은_플레이스홀더는_원본_유지() {
            String result = resolver.resolveWithContext(
                    "{{고객명}}님 {{미등록항목}} 입니다",
                    branch, "홍길동", null, null);

            assertThat(result).isEqualTo("홍길동님 {{미등록항목}} 입니다");
        }

        @Test
        void name이_빈문자열인_플레이스홀더는_치환에_영향없음() {
            placeholderRepository.save(Placeholder.builder()
                    .name("").value("{test.value}").comment("빈 이름 항목").build());

            String result = resolver.resolveWithContext(
                    "{{고객명}}님 안녕하세요",
                    branch, "홍길동", null, null);

            assertThat(result).isEqualTo("홍길동님 안녕하세요");
        }

        @Test
        void value가_null인_플레이스홀더는_무시() {
            placeholderRepository.save(Placeholder.builder()
                    .name("{{특수항목}}").value(null).comment("값없는 항목").build());

            String result = resolver.resolveWithContext(
                    "{{고객명}}님 {{특수항목}} 입니다",
                    branch, "홍길동", null, null);

            // {{특수항목}}은 value가 null이므로 치환 대상에서 제외 → 원본 유지
            assertThat(result).isEqualTo("홍길동님 {{특수항목}} 입니다");
        }

        @Test
        void branch_필드_일부만_있을_때_나머지는_빈문자열() {
            Branch partialBranch = branchRepository.save(Branch.builder()
                    .branchName("부분지점")
                    .alias("test-partial-" + System.nanoTime())
                    .build());

            String result = resolver.resolveWithContext(
                    "{{지점명}} / {{지점주소}} / {{담당자}}",
                    partialBranch, null, null, null);

            assertThat(result).isEqualTo("부분지점 /  / ");
        }
    }
}
