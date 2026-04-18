package com.culcom.controller.message;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.ApiResponse;
import com.culcom.dto.message.*;
import com.culcom.entity.enums.SmsEventType;
import com.culcom.service.MessageTemplateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/message-templates")
@RequiredArgsConstructor
public class MessageTemplateController {

    private final MessageTemplateService messageTemplateService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<MessageTemplateResponse>>> list(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.ok(messageTemplateService.list(principal.getSelectedBranchSeq())));
    }

    @GetMapping("/{seq}")
    public ResponseEntity<ApiResponse<MessageTemplateResponse>> get(@PathVariable Long seq) {
        return ResponseEntity.ok(ApiResponse.ok(messageTemplateService.get(seq)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MessageTemplateResponse>> create(
            @Valid @RequestBody MessageTemplateCreateRequest request,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.ok("템플릿 추가 완료",
                messageTemplateService.create(request, principal.getSelectedBranchSeq())));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<MessageTemplateResponse>> update(
            @PathVariable Long seq, @RequestBody MessageTemplateUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("템플릿 수정 완료",
                messageTemplateService.update(seq, request)));
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        messageTemplateService.delete(seq);
        return ResponseEntity.ok(ApiResponse.ok("템플릿 삭제 완료", null));
    }

    @PostMapping("/{seq}/set-default")
    public ResponseEntity<ApiResponse<Void>> setDefault(@PathVariable Long seq,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        messageTemplateService.setDefault(seq, principal.getSelectedBranchSeq());
        return ResponseEntity.ok(ApiResponse.ok("기본 템플릿 설정 완료", null));
    }

    @PostMapping("/{seq}/resolve")
    public ResponseEntity<ApiResponse<String>> resolve(
            @PathVariable Long seq,
            @RequestBody MessageTemplateResolveRequest request,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        String resolved = messageTemplateService.resolve(seq, principal.getSelectedBranchSeq(), request);
        return ResponseEntity.ok(ApiResponse.ok(resolved));
    }

    @GetMapping("/placeholders")
    public ResponseEntity<ApiResponse<List<PlaceholderResponse>>> getPlaceholders(
            @RequestParam(required = false) SmsEventType eventType) {
        return ResponseEntity.ok(ApiResponse.ok(messageTemplateService.getPlaceholders(eventType)));
    }
}
