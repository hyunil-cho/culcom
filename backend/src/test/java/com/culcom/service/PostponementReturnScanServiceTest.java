package com.culcom.service;

import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.postponement.ComplexPostponementRequest;
import com.culcom.entity.complex.postponement.ComplexPostponementReturnScanLog;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ComplexPostponementRequestRepository;
import com.culcom.repository.ComplexPostponementReturnScanLogRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.transaction.TestTransaction;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 연기 복귀 예정자 스캔 스케줄러 검증.
 *
 * {@link PostponementReturnScanService#scanForDate(LocalDate)} 가 호출되면:
 *  - 상태 '승인' 이며 endDate = scanDate + 1 (다음날 복귀) 인 연기 요청만 집계
 *  - 지점별로 {@link ComplexPostponementReturnScanLog} 를 upsert (branch + scanDate 유니크)
 *  - 동일 (branch, scanDate) 재실행 시 중복 insert 없이 memberCount 갱신
 *  - 승인 외 상태('대기','반려') / 복귀일 불일치 / 다른 지점 요청은 카운트에 포함되지 않음
 *  - 스케줄러 엔트리포인트 {@link PostponementReturnScanService#scheduledScan()} 는 오늘 기준으로 위임
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PostponementReturnScanServiceTest {

    @Autowired PostponementReturnScanService postponementReturnScanService;
    @Autowired BranchRepository branchRepository;
    @Autowired ComplexPostponementRequestRepository postponementRepository;
    @Autowired ComplexPostponementReturnScanLogRepository scanLogRepository;

    @Test
    void 다음날_복귀하는_승인_연기만_지점별로_집계되어_스캔로그에_저장된다() {
        // given — scanDate 는 테스트 재현성을 위해 고정값 사용
        LocalDate scanDate = LocalDate.of(2026, 6, 15);
        LocalDate returnDate = scanDate.plusDays(1); // 2026-06-16

        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점A")
                .alias("test-scan-basic-" + System.nanoTime())
                .build());

        // 다음날 복귀 · 승인 (카운트 대상) — 3건
        savePostponement(branch, RequestStatus.승인, returnDate, "복귀자1", "01000000001");
        savePostponement(branch, RequestStatus.승인, returnDate, "복귀자2", "01000000002");
        savePostponement(branch, RequestStatus.승인, returnDate, "복귀자3", "01000000003");

        // 다음날 복귀 · 대기 (승인 아님 — 제외)
        savePostponement(branch, RequestStatus.대기, returnDate, "대기자", "01000000004");
        // 다음날 복귀 · 반려 (제외)
        savePostponement(branch, RequestStatus.반려, returnDate, "반려자", "01000000005");
        // 승인이지만 복귀일이 scanDate 당일 (내일 아님 — 제외)
        savePostponement(branch, RequestStatus.승인, scanDate, "오늘복귀자", "01000000006");
        // 승인이지만 복귀일이 2일 후 (제외)
        savePostponement(branch, RequestStatus.승인, scanDate.plusDays(2), "모레복귀자", "01000000007");

        Long branchSeq = branch.getSeq();

        // when
        TestTransaction.flagForCommit();
        TestTransaction.end();

        int total = postponementReturnScanService.scanForDate(scanDate);

        // then
        TestTransaction.start();
        TestTransaction.flagForRollback();

        assertThat(total).as("승인 + 복귀일이 내일인 건수만 카운트").isEqualTo(3);

        ComplexPostponementReturnScanLog log = scanLogRepository
                .findByBranchSeqAndScanDate(branchSeq, scanDate)
                .orElseThrow(() -> new AssertionError("스캔 로그가 저장되지 않았습니다."));

        assertThat(log.getBranchSeq()).isEqualTo(branchSeq);
        assertThat(log.getScanDate()).isEqualTo(scanDate);
        assertThat(log.getReturnDate())
                .as("returnDate 는 항상 scanDate + 1")
                .isEqualTo(returnDate);
        assertThat(log.getMemberCount()).isEqualTo(3);

        cleanup(branchSeq, scanDate);
    }

    @Test
    void 두_지점에_걸친_복귀예정자를_지점별로_분리해_기록한다() {
        // given
        LocalDate scanDate = LocalDate.of(2026, 7, 1);
        LocalDate returnDate = scanDate.plusDays(1);

        Branch branchA = branchRepository.save(Branch.builder()
                .branchName("지점A").alias("test-scan-multi-A-" + System.nanoTime()).build());
        Branch branchB = branchRepository.save(Branch.builder()
                .branchName("지점B").alias("test-scan-multi-B-" + System.nanoTime()).build());

        // 지점A: 승인 2건
        savePostponement(branchA, RequestStatus.승인, returnDate, "A1", "01011110001");
        savePostponement(branchA, RequestStatus.승인, returnDate, "A2", "01011110002");
        // 지점B: 승인 5건
        for (int i = 0; i < 5; i++) {
            savePostponement(branchB, RequestStatus.승인, returnDate, "B" + i, "010222200" + i + "0");
        }

        Long branchASeq = branchA.getSeq();
        Long branchBSeq = branchB.getSeq();

        // when
        TestTransaction.flagForCommit();
        TestTransaction.end();

        int total = postponementReturnScanService.scanForDate(scanDate);

        // then
        TestTransaction.start();
        TestTransaction.flagForRollback();

        assertThat(total).as("두 지점의 합계").isEqualTo(7);

        ComplexPostponementReturnScanLog logA = scanLogRepository
                .findByBranchSeqAndScanDate(branchASeq, scanDate).orElseThrow();
        ComplexPostponementReturnScanLog logB = scanLogRepository
                .findByBranchSeqAndScanDate(branchBSeq, scanDate).orElseThrow();

        assertThat(logA.getMemberCount()).as("지점A 복귀예정자 수").isEqualTo(2);
        assertThat(logB.getMemberCount()).as("지점B 복귀예정자 수").isEqualTo(5);
        assertThat(logA.getReturnDate()).isEqualTo(returnDate);
        assertThat(logB.getReturnDate()).isEqualTo(returnDate);

        cleanup(branchASeq, scanDate);
        cleanup(branchBSeq, scanDate);
    }

    @Test
    void 동일_지점_동일_스캔일_재실행시_로그가_중복되지_않고_갱신된다() {
        // given
        LocalDate scanDate = LocalDate.of(2026, 8, 10);
        LocalDate returnDate = scanDate.plusDays(1);

        Branch branch = branchRepository.save(Branch.builder()
                .branchName("업서트지점").alias("test-scan-upsert-" + System.nanoTime()).build());

        // 최초 2건 승인
        ComplexPostponementRequest keep1 = savePostponement(branch, RequestStatus.승인, returnDate, "유지1", "01033330001");
        ComplexPostponementRequest keep2 = savePostponement(branch, RequestStatus.승인, returnDate, "유지2", "01033330002");

        Long branchSeq = branch.getSeq();
        Long keep1Seq = keep1.getSeq();
        Long keep2Seq = keep2.getSeq();

        // when — 1차 스캔 (count=2)
        TestTransaction.flagForCommit();
        TestTransaction.end();

        int firstTotal = postponementReturnScanService.scanForDate(scanDate);

        // then — 1차 결과 검증
        TestTransaction.start();
        TestTransaction.flagForRollback();
        assertThat(firstTotal).isEqualTo(2);
        ComplexPostponementReturnScanLog firstLog = scanLogRepository
                .findByBranchSeqAndScanDate(branchSeq, scanDate).orElseThrow();
        assertThat(firstLog.getMemberCount()).isEqualTo(2);
        Long firstLogSeq = firstLog.getSeq();
        TestTransaction.end();

        // when — 상태 변경 후 2차 스캔
        TestTransaction.start();
        // 1건을 반려로 변경하고, 새로 2건 승인 추가 → 승인 건수 3건 (keep2, new1, new2)
        ComplexPostponementRequest toReject = postponementRepository.findById(keep1Seq).orElseThrow();
        toReject.setStatus(RequestStatus.반려);
        toReject.setAdminMessage("검증용 반려");
        postponementRepository.save(toReject);
        savePostponement(branch, RequestStatus.승인, returnDate, "추가1", "01033330003");
        savePostponement(branch, RequestStatus.승인, returnDate, "추가2", "01033330004");
        TestTransaction.flagForCommit();
        TestTransaction.end();

        int secondTotal = postponementReturnScanService.scanForDate(scanDate);

        // then — 2차 결과: upsert 되어 동일 row 의 count 갱신
        TestTransaction.start();
        TestTransaction.flagForRollback();

        assertThat(secondTotal).as("반려 1, 신규 승인 2 반영 후 총 3").isEqualTo(3);

        List<ComplexPostponementReturnScanLog> allLogs = scanLogRepository.findAll().stream()
                .filter(l -> l.getBranchSeq().equals(branchSeq) && l.getScanDate().equals(scanDate))
                .toList();
        assertThat(allLogs)
                .as("동일 (branch, scanDate) 조합 로그는 정확히 1건이어야 한다 (중복 insert 금지)")
                .hasSize(1);
        assertThat(allLogs.get(0).getSeq())
                .as("동일 row 가 업데이트되어야 하므로 PK 가 유지되어야 한다")
                .isEqualTo(firstLogSeq);
        assertThat(allLogs.get(0).getMemberCount()).isEqualTo(3);

        // 미사용 참조 방지
        assertThat(keep2Seq).isNotNull();

        cleanup(branchSeq, scanDate);
    }

    @Test
    void 복귀예정자가_없으면_스캔로그를_생성하지_않고_총계_0을_반환한다() {
        // given — 승인 건은 있지만 복귀일이 다른 날
        LocalDate scanDate = LocalDate.of(2026, 9, 5);
        LocalDate returnDate = scanDate.plusDays(1);

        Branch branch = branchRepository.save(Branch.builder()
                .branchName("빈지점").alias("test-scan-empty-" + System.nanoTime()).build());

        savePostponement(branch, RequestStatus.승인, scanDate.plusDays(7), "먼복귀자", "01044440001");
        savePostponement(branch, RequestStatus.대기, returnDate, "대기자", "01044440002");

        Long branchSeq = branch.getSeq();

        // when
        TestTransaction.flagForCommit();
        TestTransaction.end();

        int total = postponementReturnScanService.scanForDate(scanDate);

        // then
        TestTransaction.start();
        TestTransaction.flagForRollback();

        assertThat(total).isZero();
        assertThat(scanLogRepository.findByBranchSeqAndScanDate(branchSeq, scanDate))
                .as("카운트 대상이 없으면 로그를 생성하지 않아야 한다")
                .isEmpty();
    }

    @Test
    void scheduledScan_는_오늘_기준_다음날_복귀자를_집계해_로그를_기록한다() {
        // given — @Scheduled cron 을 시뮬레이션: scanDate=LocalDate.now()
        LocalDate scanDate = LocalDate.now();
        LocalDate returnDate = scanDate.plusDays(1);

        Branch branch = branchRepository.save(Branch.builder()
                .branchName("크론지점").alias("test-scan-cron-" + System.nanoTime()).build());

        savePostponement(branch, RequestStatus.승인, returnDate, "크론1", "01055550001");
        savePostponement(branch, RequestStatus.승인, returnDate, "크론2", "01055550002");

        Long branchSeq = branch.getSeq();

        // when
        TestTransaction.flagForCommit();
        TestTransaction.end();

        postponementReturnScanService.scheduledScan();

        // then
        TestTransaction.start();
        TestTransaction.flagForRollback();

        ComplexPostponementReturnScanLog log = scanLogRepository
                .findByBranchSeqAndScanDate(branchSeq, scanDate)
                .orElseThrow(() -> new AssertionError("scheduledScan() 호출 후 로그가 기록되지 않았습니다."));

        assertThat(log.getScanDate()).isEqualTo(scanDate);
        assertThat(log.getReturnDate()).isEqualTo(returnDate);
        assertThat(log.getMemberCount()).isEqualTo(2);

        cleanup(branchSeq, scanDate);
    }

    // ── helpers ──

    private ComplexPostponementRequest savePostponement(Branch branch, RequestStatus status,
                                                        LocalDate returnDate, String name, String phone) {
        return postponementRepository.save(ComplexPostponementRequest.builder()
                .branch(branch)
                .memberName(name)
                .phoneNumber(phone)
                .startDate(returnDate.minusDays(14))
                .endDate(returnDate)
                .reason("검증용")
                .status(status)
                .build());
    }

    /**
     * commit 된 스캔 로그는 @Transactional 롤백으로 제거되지 않으므로 명시적으로 정리.
     */
    private void cleanup(Long branchSeq, LocalDate scanDate) {
        TestTransaction.end();
        TestTransaction.start();
        scanLogRepository.findByBranchSeqAndScanDate(branchSeq, scanDate)
                .ifPresent(scanLogRepository::delete);
        TestTransaction.flagForCommit();
        TestTransaction.end();
        TestTransaction.start();
        TestTransaction.flagForRollback();
    }
}
