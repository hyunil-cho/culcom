package com.culcom.service;

import com.culcom.dto.branch.BranchCreateRequest;
import com.culcom.dto.branch.BranchDetailResponse;
import com.culcom.dto.branch.BranchListResponse;
import com.culcom.entity.auth.UserInfo;
import com.culcom.entity.branch.Branch;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.UserInfoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BranchService {

    private final BranchRepository branchRepository;
    private final UserInfoRepository userInfoRepository;
    private final AuthService authService;

    public List<BranchListResponse> list(Long userSeq) {
        UserInfo user = userInfoRepository.findById(userSeq)
                .orElseThrow(() -> new EntityNotFoundException("사용자"));
        List<Branch> branches = authService.getManagedBranches(user);

        return branches.stream().map(BranchListResponse::from).toList();
    }

    public BranchDetailResponse get(Long seq) {
        Branch branch = branchRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("지점"));
        return BranchDetailResponse.from(branch);
    }

    public BranchDetailResponse create(BranchCreateRequest request, Long userSeq) {
        UserInfo manager = userInfoRepository.findById(userSeq)
                .orElseThrow(() -> new EntityNotFoundException("사용자"));

        Branch branch = Branch.builder()
                .branchName(request.getBranchName())
                .alias(request.getAlias())
                .branchManager(request.getBranchManager())
                .address(request.getAddress())
                .directions(request.getDirections())
                .createdBy(manager)
                .build();
        Branch saved = branchRepository.save(branch);
        return BranchDetailResponse.from(saved);
    }

    public BranchDetailResponse update(Long seq, BranchCreateRequest request) {
        Branch branch = branchRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("지점"));
        branch.setBranchName(request.getBranchName());
        branch.setAlias(request.getAlias());
        branch.setBranchManager(request.getBranchManager());
        branch.setAddress(request.getAddress());
        branch.setDirections(request.getDirections());
        return BranchDetailResponse.from(branchRepository.save(branch));
    }

    public void delete(Long seq) {
        branchRepository.deleteById(seq);
    }

    public String getAlias(Long branchSeq) {
        return branchRepository.findById(branchSeq)
                .map(Branch::getAlias)
                .orElse("");
    }
}
