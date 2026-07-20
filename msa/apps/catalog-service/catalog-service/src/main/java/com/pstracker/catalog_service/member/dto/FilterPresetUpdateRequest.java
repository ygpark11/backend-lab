package com.pstracker.catalog_service.member.dto;

import jakarta.validation.constraints.Size;

import java.util.Map;

public record FilterPresetUpdateRequest(
        @Size(max = 15, message = "이름은 최대 15자까지 입력할 수 있어요.")
        String name,

        Map<String, Object> filters
) {}
