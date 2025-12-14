package com.pstracker.catalog_service.global.security;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Builder
@Data
@AllArgsConstructor
public class JwtToken {
    private String grantType;   // 인증 타입
    private String accessToken; // 실제 검증용 토큰
    private String refreshToken;// 재발급용 토큰
}
