package com.pstracker.catalog_service.member.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Map;

public record FilterPresetCreateRequest(
        @NotBlank(message = "프리셋 이름을 입력해주세요.")
        @Size(max = 15, message = "이름은 최대 15자까지 입력할 수 있어요.")
        String name,

        @NotNull(message = "필터 조건이 필요합니다.")
        Map<String, Object> filters
) {}
