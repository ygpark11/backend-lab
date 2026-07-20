package com.pstracker.catalog_service.member.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pstracker.catalog_service.member.domain.Member;
import com.pstracker.catalog_service.member.domain.UserFilterPreset;
import com.pstracker.catalog_service.member.dto.FilterPresetCreateRequest;
import com.pstracker.catalog_service.member.dto.FilterPresetResponse;
import com.pstracker.catalog_service.member.dto.FilterPresetUpdateRequest;
import com.pstracker.catalog_service.member.repository.MemberRepository;
import com.pstracker.catalog_service.member.repository.UserFilterPresetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FilterPresetService {

    private static final int MAX_PRESET_COUNT = 5;

    private final UserFilterPresetRepository presetRepository;
    private final MemberRepository memberRepository;
    private final ObjectMapper objectMapper;

    public List<FilterPresetResponse> getMyPresets(Long memberId) {
        return presetRepository.findAllByMemberIdOrderByCreatedAtAsc(memberId)
                .stream()
                .map(FilterPresetResponse::from)
                .toList();
    }

    @Transactional
    public FilterPresetResponse createPreset(Long memberId, FilterPresetCreateRequest request) {
        if (presetRepository.countByMemberId(memberId) >= MAX_PRESET_COUNT) {
            throw new IllegalStateException("탐색 조건은 최대 " + MAX_PRESET_COUNT + "개까지 저장할 수 있어요.");
        }

        String filtersJson = serialize(request.filters());
        Member member = memberRepository.getReferenceById(memberId);
        UserFilterPreset preset = UserFilterPreset.create(member, request.name(), filtersJson);

        return FilterPresetResponse.from(presetRepository.save(preset));
    }

    @Transactional
    public FilterPresetResponse updatePreset(Long memberId, Long presetId, FilterPresetUpdateRequest request) {
        UserFilterPreset preset = presetRepository.findByIdAndMemberId(presetId, memberId)
                .orElseThrow(() -> new IllegalArgumentException("프리셋을 찾을 수 없습니다."));

        if (request.name() != null) {
            if (request.name().isBlank()) {
                throw new IllegalArgumentException("이름은 공백만으로 설정할 수 없어요.");
            }
            preset.updateName(request.name());
        }
        if (request.filters() != null) {
            preset.updateFilters(serialize(request.filters()));
        }

        return FilterPresetResponse.from(preset);
    }

    @Transactional
    public void deletePreset(Long memberId, Long presetId) {
        UserFilterPreset preset = presetRepository.findByIdAndMemberId(presetId, memberId)
                .orElseThrow(() -> new IllegalArgumentException("프리셋을 찾을 수 없습니다."));
        presetRepository.delete(preset);
    }

    private String serialize(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("필터 조건 형식이 올바르지 않습니다.");
        }
    }
}
