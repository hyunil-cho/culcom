package com.culcom.service;

import com.culcom.entity.complex.postponement.ComplexPostponementReturnScanLog;
import com.culcom.repository.ComplexPostponementRequestRepository;
import com.culcom.repository.ComplexPostponementRequestRepository.BranchReturnCount;
import com.culcom.repository.ComplexPostponementReturnScanLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * 연기 복귀 예정자 스캔.
 *
 * 매일 오전 11시(Asia/Seoul)에 실행되어, 다음날 복귀하는 승인된 연기 회원을
 * 지점별로 집계해 {@link ComplexPostponementReturnScanLog} 로 기록한다.
 *
 * 현재는 통계 수집만 수행하며, 단체 메시지 발송은 향후 확장 예정.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PostponementReturnScanService {

    private final ComplexPostponementRequestRepository postponementRepository;
    private final ComplexPostponementReturnScanLogRepository scanLogRepository;

    @Scheduled(cron = "0 0 11 * * *", zone = "Asia/Seoul")
    @Transactional
    public void scheduledScan() {
        int total = scanForDate(LocalDate.now());
        log.info("[PostponementReturnScan] 복귀 예정자 스캔 완료 — 총 {}명", total);
    }

    /**
     * scanDate 기준 "다음날 복귀"(endDate = scanDate + 1) 승인 연기 회원을 지점별로 집계/저장.
     * 같은 (branch, scanDate) 조합이 이미 있다면 갱신한다.
     * @return 전체 집계 회원 수
     */
    @Transactional
    public int scanForDate(LocalDate scanDate) {
        LocalDate returnDate = scanDate.plusDays(1);
        List<BranchReturnCount> rows = postponementRepository.countApprovedByReturnDateGroupByBranch(returnDate);

        int total = 0;
        for (BranchReturnCount row : rows) {
            Long branchSeq = row.getBranchSeq();
            int count = row.getCnt() != null ? row.getCnt().intValue() : 0;
            if (branchSeq == null) continue;
            total += count;

            ComplexPostponementReturnScanLog entity = scanLogRepository
                    .findByBranchSeqAndScanDate(branchSeq, scanDate)
                    .orElseGet(() -> ComplexPostponementReturnScanLog.builder()
                            .branchSeq(branchSeq)
                            .scanDate(scanDate)
                            .returnDate(returnDate)
                            .memberCount(0)
                            .build());
            entity.setReturnDate(returnDate);
            entity.setMemberCount(count);
            scanLogRepository.save(entity);
        }
        return total;
    }
}
