package com.culcom.service;

import com.culcom.entity.complex.postponement.ComplexPostponementRequest;
import com.culcom.entity.complex.postponement.ComplexPostponementReturnScanLog;
import com.culcom.entity.enums.SmsEventType;
import com.culcom.repository.ComplexPostponementRequestRepository;
import com.culcom.repository.ComplexPostponementRequestRepository.BranchReturnCount;
import com.culcom.repository.ComplexPostponementReturnScanLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 연기 복귀 예정자 스캔.
 *
 * 매일 오전 11시(Asia/Seoul)에 실행되어, 다음날 복귀하는 승인된 연기 회원에게
 * {@link SmsEventType#복귀안내} 템플릿으로 SMS를 발송하고,
 * 지점별 집계를 {@link ComplexPostponementReturnScanLog} 로 기록한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PostponementReturnScanService {

    private final ComplexPostponementRequestRepository postponementRepository;
    private final ComplexPostponementReturnScanLogRepository scanLogRepository;
    private final SmsService smsService;

    @Scheduled(cron = "0 0 11 * * *", zone = "Asia/Seoul")
    @Transactional
    public void scheduledScan() {
        int total = scanForDate(LocalDate.now());
        log.info("[PostponementReturnScan] 복귀 예정자 스캔 완료 — 총 {}명", total);
    }

    /**
     * scanDate 기준 "다음날 복귀"(endDate = scanDate + 1) 승인 연기 회원을
     *   1) {@link SmsEventType#복귀안내} 템플릿으로 개별 SMS 발송
     *   2) 지점별로 집계해 scan log 에 upsert
     *
     * 동일 (branch, scanDate) 조합은 갱신.
     * @return 전체 집계 회원 수
     */
    /** 지점별 집계 결과 (스캔 로그 upsert 용) */
    private static class BranchTally {
        int total;
        int success;
        int fail;
    }

    @Transactional
    public int scanForDate(LocalDate scanDate) {
        LocalDate returnDate = scanDate.plusDays(1);
        List<ComplexPostponementRequest> returners =
                postponementRepository.findApprovedByReturnDate(returnDate);

        // 지점별 total/성공/실패 카운트 및 SMS 발송
        Map<Long, BranchTally> tallyByBranch = new HashMap<>();
        for (ComplexPostponementRequest req : returners) {
            if (req.getBranch() == null) continue;
            Long branchSeq = req.getBranch().getSeq();
            BranchTally tally = tallyByBranch.computeIfAbsent(branchSeq, k -> new BranchTally());
            tally.total++;

            boolean sentOk = false;
            try {
                Map<String, String> ctx = new HashMap<>();
                ctx.put("{postponement.return_date}", returnDate.toString());
                ctx.put("{postponement.start_date}", req.getStartDate() != null ? req.getStartDate().toString() : "");
                ctx.put("{postponement.end_date}", req.getEndDate() != null ? req.getEndDate().toString() : "");
                // sendEventSmsIfConfigured 는 정상 발송 시 null, 그 외(미설정/비활성/실패)는 경고 문자열 반환.
                String warn = smsService.sendEventSmsIfConfigured(
                        branchSeq, SmsEventType.복귀안내,
                        req.getMemberName(), req.getPhoneNumber(), ctx);
                sentOk = (warn == null);
                if (!sentOk) {
                    log.debug("[PostponementReturnScan] 복귀 안내 SMS 미발송 - branch={}, 회원={}, 사유={}",
                            branchSeq, req.getMemberName(), warn);
                }
            } catch (Exception ex) {
                log.warn("[PostponementReturnScan] 복귀 안내 SMS 발송 예외 - branch={}, 회원={}, error={}",
                        branchSeq, req.getMemberName(), ex.getMessage());
            }
            if (sentOk) tally.success++; else tally.fail++;
        }

        // 지점별 scan log upsert
        int total = 0;
        for (Map.Entry<Long, BranchTally> entry : tallyByBranch.entrySet()) {
            Long branchSeq = entry.getKey();
            BranchTally tally = entry.getValue();
            total += tally.total;

            ComplexPostponementReturnScanLog entity = scanLogRepository
                    .findByBranchSeqAndScanDate(branchSeq, scanDate)
                    .orElseGet(() -> ComplexPostponementReturnScanLog.builder()
                            .branchSeq(branchSeq)
                            .scanDate(scanDate)
                            .returnDate(returnDate)
                            .memberCount(0)
                            .smsSuccessCount(0)
                            .smsFailCount(0)
                            .build());
            entity.setReturnDate(returnDate);
            entity.setMemberCount(tally.total);
            entity.setSmsSuccessCount(tally.success);
            entity.setSmsFailCount(tally.fail);
            scanLogRepository.save(entity);
        }
        return total;
    }

    /** @deprecated 내부 구현이 findApprovedByReturnDate 기반으로 바뀌었지만 기존 API 유지용. */
    @SuppressWarnings("unused")
    private void countOnly(LocalDate returnDate) {
        List<BranchReturnCount> rows = postponementRepository.countApprovedByReturnDateGroupByBranch(returnDate);
        log.debug("[PostponementReturnScan] legacy count = {}", rows.size());
    }
}
