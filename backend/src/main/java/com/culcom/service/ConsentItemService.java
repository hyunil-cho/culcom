package com.culcom.service;

import com.culcom.dto.consent.ConsentItemRequest;
import com.culcom.dto.consent.ConsentItemResponse;
import com.culcom.entity.consent.ConsentItem;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.ConsentItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ConsentItemService {

    private final ConsentItemRepository consentItemRepository;

    public List<ConsentItemResponse> list() {
        return consentItemRepository.findAll()
                .stream().map(ConsentItemResponse::from).toList();
    }

    public List<ConsentItemResponse> listByCategory(String category) {
        return consentItemRepository.findByCategory(category)
                .stream().map(ConsentItemResponse::from).toList();
    }

    public ConsentItemResponse get(Long seq) {
        ConsentItem item = consentItemRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("동의항목"));
        return ConsentItemResponse.from(item);
    }

    @Transactional
    public ConsentItemResponse create(ConsentItemRequest req) {
        ConsentItem item = ConsentItem.builder()
                .title(req.getTitle())
                .content(req.getContent())
                .required(req.getRequired())
                .category(req.getCategory())
                .build();
        return ConsentItemResponse.from(consentItemRepository.save(item));
    }

    @Transactional
    public ConsentItemResponse update(Long seq, ConsentItemRequest req) {
        ConsentItem item = consentItemRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("동의항목"));
        item.setTitle(req.getTitle());
        item.setContent(req.getContent());
        item.setRequired(req.getRequired());
        item.setCategory(req.getCategory());
        // 내용이 변경되면 버전 증가
        item.setVersion(item.getVersion() + 1);
        return ConsentItemResponse.from(consentItemRepository.save(item));
    }

    @Transactional
    public void delete(Long seq) {
        consentItemRepository.deleteById(seq);
    }
}
