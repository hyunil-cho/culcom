package com.culcom.controller.message;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.message.*;
import com.culcom.entity.MessageTemplate;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.MessageTemplateRepository;
import com.culcom.repository.PlaceholderRepository;
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
    private final PlaceholderRepository placeholderRepository;
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<MessageTemplateResponse>>> list(HttpSession session) {
        Long branchSeq = authService.getSessionBranchSeq(session);
        List<MessageTemplateResponse> templates = templateRepository
                .findByBranchSeqOrderByIsDefaultDescLastUpdateDateDesc(branchSeq)
                .stream()
                .map(MessageTemplateResponse::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(templates));
    }

    @GetMapping("/{seq}")
    public ResponseEntity<ApiResponse<MessageTemplateResponse>> get(@PathVariable Long seq) {
        return templateRepository.findById(seq)
                .map(t -> ResponseEntity.ok(ApiResponse.ok(MessageTemplateResponse.from(t))))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MessageTemplateResponse>> create(
            @RequestBody MessageTemplateCreateRequest request, HttpSession session) {
        Long branchSeq = authService.getSessionBranchSeq(session);
        MessageTemplate template = MessageTemplate.builder()
                .templateName(request.getTemplateName())
                .description(request.getDescription())
                .messageContext(request.getMessageContext())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();
        branchRepository.findById(branchSeq).ifPresent(template::setBranch);
        MessageTemplate saved = templateRepository.save(template);
        return ResponseEntity.ok(ApiResponse.ok("템플릿 추가 완료", MessageTemplateResponse.from(saved)));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<MessageTemplateResponse>> update(
            @PathVariable Long seq, @RequestBody MessageTemplateUpdateRequest request) {
        return templateRepository.findById(seq)
                .map(t -> {
                    t.setTemplateName(request.getTemplateName());
                    t.setDescription(request.getDescription());
                    t.setMessageContext(request.getMessageContext());
                    if (request.getIsActive() != null) {
                        t.setIsActive(request.getIsActive());
                    }
                    MessageTemplate saved = templateRepository.save(t);
                    return ResponseEntity.ok(ApiResponse.ok("템플릿 수정 완료", MessageTemplateResponse.from(saved)));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        templateRepository.deleteById(seq);
        return ResponseEntity.ok(ApiResponse.ok("템플릿 삭제 완료", null));
    }

    @PostMapping("/{seq}/set-default")
    public ResponseEntity<ApiResponse<Void>> setDefault(@PathVariable Long seq, HttpSession session) {
        Long branchSeq = authService.getSessionBranchSeq(session);

        // 해당 지점의 기존 기본 템플릿 해제
        templateRepository.findByBranchSeqOrderBySeqDesc(branchSeq).forEach(t -> {
            if (t.getIsDefault()) {
                t.setIsDefault(false);
                templateRepository.save(t);
            }
        });

        // 새 기본 템플릿 설정
        return templateRepository.findById(seq)
                .map(t -> {
                    t.setIsDefault(true);
                    templateRepository.save(t);
                    return ResponseEntity.ok(ApiResponse.ok("기본 템플릿 설정 완료", (Void) null));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/placeholders")
    public ResponseEntity<ApiResponse<List<PlaceholderResponse>>> getPlaceholders() {
        List<PlaceholderResponse> placeholders = placeholderRepository.findAll()
                .stream()
                .map(PlaceholderResponse::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(placeholders));
    }
}
