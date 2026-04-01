package com.culcom.controller;

import com.culcom.dto.ApiResponse;
import com.culcom.entity.MessageTemplate;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.MessageTemplateRepository;
import com.culcom.service.AuthService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/message-templates")
@RequiredArgsConstructor
public class MessageTemplateController {

    private final MessageTemplateRepository templateRepository;
    private final BranchRepository branchRepository;
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<MessageTemplate>>> list(HttpSession session) {
        Long branchSeq = authService.getSessionBranchSeq(session);
        return ResponseEntity.ok(ApiResponse.ok(templateRepository.findByBranchSeqOrderBySeqDesc(branchSeq)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MessageTemplate>> create(
            @RequestBody MessageTemplate template, HttpSession session) {
        Long branchSeq = authService.getSessionBranchSeq(session);
        branchRepository.findById(branchSeq).ifPresent(template::setBranch);
        return ResponseEntity.ok(ApiResponse.ok("템플릿 추가 완료", templateRepository.save(template)));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<MessageTemplate>> update(
            @PathVariable Long seq, @RequestBody MessageTemplate request) {
        return templateRepository.findById(seq)
                .map(t -> {
                    t.setTemplateName(request.getTemplateName());
                    t.setDescription(request.getDescription());
                    t.setMessageContext(request.getMessageContext());
                    t.setIsActive(request.getIsActive());
                    t.setIsDefault(request.getIsDefault());
                    return ResponseEntity.ok(ApiResponse.ok("템플릿 수정 완료", templateRepository.save(t)));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        templateRepository.deleteById(seq);
        return ResponseEntity.ok(ApiResponse.ok("템플릿 삭제 완료", null));
    }
}
