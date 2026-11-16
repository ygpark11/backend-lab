package com.pstracker.catalog_service.member.dto;

import com.pstracker.catalog_service.member.domain.Member;
import com.pstracker.catalog_service.member.domain.Role;
import org.springframework.security.crypto.password.PasswordEncoder;

public record MemberSignupRequest(
        String email,
        String password,
        String nickname
) {
    public Member toEntity(PasswordEncoder passwordEncoder) {
        return Member.builder()
                .email(email)
                .password(passwordEncoder.encode(password))
                .nickname(nickname)
                .role(Role.USER)
                .build();
    }
}
