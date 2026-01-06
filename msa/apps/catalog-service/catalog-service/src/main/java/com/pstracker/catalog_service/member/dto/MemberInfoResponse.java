package com.pstracker.catalog_service.member.dto;

import com.pstracker.catalog_service.member.domain.Member;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MemberInfoResponse {

    private Long id;
    private String email;
    private String nickname;
    private String role;

    public static MemberInfoResponse from(Member member) {
        return MemberInfoResponse.builder()
                .id(member.getId())
                .email(member.getEmail())
                .nickname(member.getNickname())
                .role(member.getRoleKey())
                .build();
    }
}