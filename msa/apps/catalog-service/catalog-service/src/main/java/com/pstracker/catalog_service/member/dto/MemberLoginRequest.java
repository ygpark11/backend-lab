package com.pstracker.catalog_service.member.dto;

public record MemberLoginRequest(
        String email,
        String password
) {
}
