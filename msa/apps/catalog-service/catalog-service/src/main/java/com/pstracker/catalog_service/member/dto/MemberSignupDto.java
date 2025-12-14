package com.pstracker.catalog_service.member.dto;

import com.pstracker.catalog_service.member.domain.Member;
import com.pstracker.catalog_service.member.domain.Role;
import lombok.Data;
import org.springframework.security.crypto.password.PasswordEncoder;

@Data
public class MemberSignupDto {
    private String email;
    private String password;
    private String nickname;

    // DTO -> Entity 변환 메서드 (비밀번호 암호화 포함)
    public Member toEntity(PasswordEncoder passwordEncoder) {
        return Member.builder()
                .email(email)
                .password(passwordEncoder.encode(password)) // [중요] 암호화
                .nickname(nickname)
                .role(Role.USER) // 기본 가입은 USER
                .build();
    }
}
