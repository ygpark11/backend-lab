package com.pstracker.catalog_service.member.dto;

import com.pstracker.catalog_service.member.domain.Member;

public record MemberInfoResponse(
        Long id,
        String email,
        String nickname,
        String role
) {
    public static MemberInfoResponse from(Member member) {
        return new MemberInfoResponse(
                member.getId(),
                member.getEmail(),
                member.getNickname(),
                member.getRoleKey()
        );
    }
}
