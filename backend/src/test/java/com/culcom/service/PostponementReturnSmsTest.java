package com.culcom.service;

import com.culcom.dto.integration.SmsSendResponse;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.postponement.ComplexPostponementRequest;
import com.culcom.entity.complex.postponement.ComplexPostponementReturnScanLog;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.PlaceholderCategory;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.entity.enums.SmsEventType;
import com.culcom.entity.message.MessageTemplate;
import com.culcom.entity.message.Placeholder;
import com.culcom.entity.product.Membership;
import com.culcom.entity.settings.SmsEventConfig;
import com.culcom.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.context.transaction.TestTransaction;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.verify;

/**
 * 연기 복귀 안내 SMS 발송 및 성공/실패 카운트 집계 검증.
 *
 *  1) 관리자가 {@link SmsEventType#복귀안내} 템플릿을 지정하면
 *  2) {@link PostponementReturnScanService#scanForDate(LocalDate)} 실행 시
 *     다음날 복귀하는 승인 연기 회원 각각에게 템플릿이 렌더링되어
 *     {@link SmsService#sendByBranch} 로 전달된다.
 *  3) 발송 결과(성공/실패)가 {@link ComplexPostponementReturnScanLog} 에 집계된다.
 *
 *  - 렌더링 검증: 실제 리졸버를 거쳐 {{고객명}}, {{복귀일}}, {{이벤트}} 등이 치환되는지
 *  - 카운트 검증: mocked sendEventSmsIfConfigured 의 성공/실패 반환에 따라 tally 분기
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PostponementReturnSmsTest {

    @MockitoSpyBean SmsService smsService;

    @Autowired PostponementReturnScanService scanService;
    @Autowired BranchRepository branchRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;
    @Autowired ComplexPostponementRequestRepository postponementRepository;
    @Autowired ComplexPostponementReturnScanLogRepository scanLogRepository;
    @Autowired MessageTemplateRepository templateRepository;
    @Autowired SmsEventConfigRepository smsEventConfigRepository;
    @Autowired PlaceholderRepository placeholderRepository;

    private Branch branch;

    @BeforeEach
    void setUp() {
        placeholderRepository.deleteAll();
        seedPlaceholders();
        branch = branchRepository.save(Branch.builder()
                .branchName("강남지점")
                .alias("return-sms-" + System.nanoTime())
                .build());
    }

    private void seedPlaceholders() {
        placeholderRepository.save(Placeholder.builder()
                .name("{{고객명}}").value("{customer.name}").comment("고객 이름")
                .category(PlaceholderCategory.COMMON).build());
        placeholderRepository.save(Placeholder.builder()
                .name("{{지점명}}").value("{branch.name}").comment("지점 이름")
                .category(PlaceholderCategory.COMMON).build());
        placeholderRepository.save(Placeholder.builder()
                .name("{{이벤트}}").value("{action.event_type}").comment("이벤트 종류")
                .category(PlaceholderCategory.ACTION_REASON).build());
        placeholderRepository.save(Placeholder.builder()
                .name("{{복귀일}}").value("{postponement.return_date}").comment("복귀 예정일")
                .category(PlaceholderCategory.POSTPONEMENT).build());
    }

    private void configureReturnTemplate(String content) {
        MessageTemplate template = templateRepository.save(MessageTemplate.builder()
                .templateName("복귀안내 템플릿")
                .messageContext(content)
                .branch(branch)
                .eventType(SmsEventType.복귀안내)
                .build());
        smsEventConfigRepository.save(SmsEventConfig.builder()
                .branch(branch)
                .eventType(SmsEventType.복귀안내)
                .template(template)
                .senderNumber("01000000000")
                .autoSend(true)
                .build());
    }

    private ComplexPostponementRequest saveApprovedPostponement(String name, String phone,
                                                                LocalDate start, LocalDate end) {
        Membership product = membershipRepository.save(Membership.builder()
                .name("3개월권").duration(90).count(30).price(300_000).build());
        ComplexMember member = memberRepository.save(ComplexMember.builder()
                .name(name).phoneNumber(phone).branch(branch).build());
        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member).membership(product)
                .startDate(LocalDate.now().minusDays(30))
                .expiryDate(LocalDate.now().plusDays(60))
                .totalCount(30).usedCount(5)
                .postponeTotal(3).postponeUsed(1)
                .price("300000")
                .status(MembershipStatus.활성).build());
        return postponementRepository.save(ComplexPostponementRequest.builder()
                .branch(branch).member(member).memberMembership(mm)
                .memberName(name).phoneNumber(phone)
                .startDate(start).endDate(end).reason("출장")
                .status(RequestStatus.승인).build());
    }

    // ── 1) 템플릿 렌더링 검증 ─────────────────────────────────────────────

    @Test
    void 복귀안내_템플릿이_각_회원의_정보로_렌더링되어_sendByBranch_로_전달된다() {
        LocalDate scanDate = LocalDate.of(2026, 10, 1);
        LocalDate returnDate = scanDate.plusDays(1);

        configureReturnTemplate(
                "{{고객명}}님, 내일({{복귀일}}) {{이벤트}} 복귀 예정입니다. — {{지점명}}");

        saveApprovedPostponement("박지성", "01011112222",
                LocalDate.now().minusDays(5), returnDate);
        saveApprovedPostponement("손흥민", "01033334444",
                LocalDate.now().minusDays(3), returnDate);

        TestTransaction.flagForCommit();
        TestTransaction.end();

        scanService.scanForDate(scanDate);

        // 각 회원의 resolved message 캡처
        TestTransaction.start();
        TestTransaction.flagForRollback();

        ArgumentCaptor<String> messageCap = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> receiverCap = ArgumentCaptor.forClass(String.class);
        verify(smsService, atLeastOnce()).sendByBranch(
                anyLong(), anyString(), receiverCap.capture(), messageCap.capture(), any());

        assertThat(receiverCap.getAllValues())
                .as("복귀 예정 2명 모두에게 sendByBranch 호출")
                .containsExactlyInAnyOrder("01011112222", "01033334444");

        assertThat(messageCap.getAllValues())
                .allSatisfy(msg -> {
                    assertThat(msg).contains("강남지점");
                    assertThat(msg).contains("2026-10-02"); // 복귀일 = scanDate+1
                    assertThat(msg).contains("연기");         // {action.event_type}
                });
        assertThat(messageCap.getAllValues())
                .anySatisfy(msg -> assertThat(msg).contains("박지성님"));
        assertThat(messageCap.getAllValues())
                .anySatisfy(msg -> assertThat(msg).contains("손흥민님"));

        cleanup(scanDate);
    }

    // ── 2) 성공/실패 카운트 집계 ──────────────────────────────────────────

    @Test
    void 모든_회원_발송_성공시_successCount_가_회원수만큼_증가한다() {
        LocalDate scanDate = LocalDate.of(2026, 11, 1);
        LocalDate returnDate = scanDate.plusDays(1);

        configureReturnTemplate("{{고객명}}님 내일 복귀 예정입니다.");

        saveApprovedPostponement("성공1", "01050000001",
                LocalDate.now().minusDays(5), returnDate);
        saveApprovedPostponement("성공2", "01050000002",
                LocalDate.now().minusDays(5), returnDate);
        saveApprovedPostponement("성공3", "01050000003",
                LocalDate.now().minusDays(5), returnDate);
        Long branchSeq = branch.getSeq();

        // sendEventSmsIfConfigured가 null(= 성공)을 반환하도록 stub
        doReturn(null).when(smsService).sendEventSmsIfConfigured(
                anyLong(), eq(SmsEventType.복귀안내), anyString(), anyString(), any());

        TestTransaction.flagForCommit();
        TestTransaction.end();

        scanService.scanForDate(scanDate);

        TestTransaction.start();
        TestTransaction.flagForRollback();

        ComplexPostponementReturnScanLog log = scanLogRepository
                .findByBranchSeqAndScanDate(branchSeq, scanDate)
                .orElseThrow(() -> new AssertionError("스캔 로그 미저장"));

        assertThat(log.getMemberCount()).isEqualTo(3);
        assertThat(log.getSmsSuccessCount()).as("모두 성공").isEqualTo(3);
        assertThat(log.getSmsFailCount()).as("실패 없음").isZero();

        cleanup(scanDate);
    }

    @Test
    void 일부_회원이_발송에_실패하면_successCount_와_failCount_가_분리_집계된다() {
        LocalDate scanDate = LocalDate.of(2026, 12, 1);
        LocalDate returnDate = scanDate.plusDays(1);

        configureReturnTemplate("{{고객명}}님 내일 복귀 예정입니다.");

        saveApprovedPostponement("성공A", "01060000001",
                LocalDate.now().minusDays(5), returnDate);
        saveApprovedPostponement("실패B", "01060000002",
                LocalDate.now().minusDays(5), returnDate);
        saveApprovedPostponement("성공C", "01060000003",
                LocalDate.now().minusDays(5), returnDate);
        Long branchSeq = branch.getSeq();

        // 실패B 한 명만 실패, 나머지 성공
        doReturn(null).when(smsService).sendEventSmsIfConfigured(
                anyLong(), eq(SmsEventType.복귀안내), eq("성공A"), anyString(), any());
        doReturn("문자 발송 실패: 수신자 없음").when(smsService).sendEventSmsIfConfigured(
                anyLong(), eq(SmsEventType.복귀안내), eq("실패B"), anyString(), any());
        doReturn(null).when(smsService).sendEventSmsIfConfigured(
                anyLong(), eq(SmsEventType.복귀안내), eq("성공C"), anyString(), any());

        TestTransaction.flagForCommit();
        TestTransaction.end();

        scanService.scanForDate(scanDate);

        TestTransaction.start();
        TestTransaction.flagForRollback();

        ComplexPostponementReturnScanLog log = scanLogRepository
                .findByBranchSeqAndScanDate(branchSeq, scanDate)
                .orElseThrow();
        assertThat(log.getMemberCount()).isEqualTo(3);
        assertThat(log.getSmsSuccessCount()).isEqualTo(2);
        assertThat(log.getSmsFailCount()).isEqualTo(1);

        cleanup(scanDate);
    }

    @Test
    void 템플릿_미설정시_모든_발송이_실패로_집계된다() {
        LocalDate scanDate = LocalDate.of(2027, 1, 5);
        LocalDate returnDate = scanDate.plusDays(1);

        // 의도적으로 configureReturnTemplate 호출 안 함

        saveApprovedPostponement("회원A", "01070000001",
                LocalDate.now().minusDays(5), returnDate);
        saveApprovedPostponement("회원B", "01070000002",
                LocalDate.now().minusDays(5), returnDate);
        Long branchSeq = branch.getSeq();

        TestTransaction.flagForCommit();
        TestTransaction.end();

        scanService.scanForDate(scanDate);

        TestTransaction.start();
        TestTransaction.flagForRollback();

        ComplexPostponementReturnScanLog log = scanLogRepository
                .findByBranchSeqAndScanDate(branchSeq, scanDate)
                .orElseThrow();
        // 자동발송 설정이 없으면 sendEventSmsIfConfigured 가 경고 문자열을 반환하므로
        // 모두 실패로 집계된다. (미설정도 SMS 미발송이라는 점에서 실패의 한 종류)
        assertThat(log.getMemberCount()).isEqualTo(2);
        assertThat(log.getSmsSuccessCount()).isEqualTo(0);
        assertThat(log.getSmsFailCount()).isEqualTo(2);

        cleanup(scanDate);
    }

    // ── helpers ────────────────────────────────────────────────────────────

    /** commit 된 scan log + 예약/회원/멤버십/연기 요청을 정리. */
    private void cleanup(LocalDate scanDate) {
        TestTransaction.end();
        TestTransaction.start();
        List<ComplexPostponementReturnScanLog> logs = scanLogRepository.findAll().stream()
                .filter(l -> l.getScanDate().equals(scanDate))
                .toList();
        for (ComplexPostponementReturnScanLog l : logs) scanLogRepository.delete(l);
        TestTransaction.flagForCommit();
        TestTransaction.end();
        TestTransaction.start();
        TestTransaction.flagForRollback();
    }
}
