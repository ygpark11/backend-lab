package com.pstracker.catalog_service.member.dto;

import com.pstracker.catalog_service.member.domain.Member;
import com.pstracker.catalog_service.member.domain.Role;
import lombok.Builder;
import lombok.Getter;

import java.util.Map;
import java.util.UUID;

@Getter
public class OAuthAttributes {
    private Map<String, Object> attributes;
    private String nameAttributeKey;
    private String name;
    private String email;
    private String provider;
    private String providerId;

    @Builder
    public OAuthAttributes(Map<String, Object> attributes, String nameAttributeKey, String name, String email, String provider, String providerId) {
        this.attributes = attributes;
        this.nameAttributeKey = nameAttributeKey;
        this.name = name;
        this.email = email;
        this.provider = provider;
        this.providerId = providerId;
    }

    // 1. 구글 전용 생성 메서드
    public static OAuthAttributes of(String registrationId, String userNameAttributeName, Map<String, Object> attributes) {
        // 추후 네이버, 카카오 등 추가 시 분기 처리 가능
        return ofGoogle(userNameAttributeName, attributes);
    }

    private static OAuthAttributes ofGoogle(String userNameAttributeName, Map<String, Object> attributes) {
        return OAuthAttributes.builder()
                .name((String) attributes.get("name"))
                .email((String) attributes.get("email"))
                .provider("google")
                .providerId((String) attributes.get("sub")) // 구글의 PK는 'sub'
                .attributes(attributes)
                .nameAttributeKey(userNameAttributeName)
                .build();
    }

    // 2. 엔티티 변환 (처음 가입 시 호출)
    public Member toEntity() {
        return Member.builder()
                .email(email)
                .nickname(name)
                .password(UUID.randomUUID().toString()) // 소셜 로그인은 비번 불필요하므로 랜덤값
                .role(Role.USER)
                .provider(provider)
                .providerId(providerId)
                .build();
    }
}
