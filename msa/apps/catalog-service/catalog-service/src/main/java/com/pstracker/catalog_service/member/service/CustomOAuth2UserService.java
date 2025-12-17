package com.pstracker.catalog_service.member.service;

import com.pstracker.catalog_service.member.domain.Member;
import com.pstracker.catalog_service.member.dto.OAuthAttributes;
import com.pstracker.catalog_service.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    private final MemberRepository memberRepository;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        // 1. 구글에서 유저 정보 가져오기 (대리자 사용)
        OAuth2UserService<OAuth2UserRequest, OAuth2User> delegate = new DefaultOAuth2UserService();
        OAuth2User oAuth2User = delegate.loadUser(userRequest);

        // 2. 어떤 서비스인지(google), 어떤 필드가 ID인지(sub) 확인
        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        String userNameAttributeName = userRequest.getClientRegistration().getProviderDetails()
                .getUserInfoEndpoint().getUserNameAttributeName();

        // 3. DTO로 변환
        OAuthAttributes attributes = OAuthAttributes.of(registrationId, userNameAttributeName, oAuth2User.getAttributes());

        // 4. DB 저장 또는 업데이트
        Member member = saveOrUpdate(attributes);

        // 5. 시큐리티 세션에 저장할 객체 반환
        // (세션을 안 쓰더라도, 임시적으로 Authentication 객체를 만들기 위해 필요)
        return new DefaultOAuth2User(
                Collections.singleton(new SimpleGrantedAuthority(member.getRoleKey())),
                attributes.getAttributes(),
                attributes.getNameAttributeKey());
    }

    /**
     * [소셜 로그인 가입/갱신 로직]
     * - 이메일로 조회해서 있으면 -> 이름 업데이트
     * - 없으면 -> 새로운 Member 엔티티 생성 후 저장
     */
    private Member saveOrUpdate(OAuthAttributes attributes) {
        Member member = memberRepository.findByEmail(attributes.getEmail())
                .map(entity -> entity.updateNickname(attributes.getName())) // 닉네임 변경 시 반영
                .orElse(attributes.toEntity()); // 없으면 Entity 생성

        return memberRepository.save(member);
    }
}
