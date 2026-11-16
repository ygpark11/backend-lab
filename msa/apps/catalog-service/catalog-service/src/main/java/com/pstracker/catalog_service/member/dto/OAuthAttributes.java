package com.pstracker.catalog_service.member.dto;

import com.pstracker.catalog_service.member.domain.Member;
import com.pstracker.catalog_service.member.domain.Role;

import java.util.Map;
import java.util.UUID;

public record OAuthAttributes(
        Map<String, Object> attributes,
        String nameAttributeKey,
        String name,
        String email,
        String provider,
        String providerId
) {
    public static OAuthAttributes of(String registrationId, String userNameAttributeName, Map<String, Object> attributes) {
        return ofGoogle(userNameAttributeName, attributes);
    }

    private static OAuthAttributes ofGoogle(String userNameAttributeName, Map<String, Object> attributes) {
        return new OAuthAttributes(
                attributes,
                userNameAttributeName,
                (String) attributes.get("name"),
                (String) attributes.get("email"),
                "google",
                (String) attributes.get("sub")
        );
    }

    public Member toEntity() {
        String randomString = UUID.randomUUID().toString().split("-")[0].toUpperCase();
        String randomNickname = "개척자_" + randomString;

        return Member.builder()
                .email(email)
                .nickname(randomNickname)
                .password(UUID.randomUUID().toString())
                .role(Role.USER)
                .provider(provider)
                .providerId(providerId)
                .build();
    }
}
