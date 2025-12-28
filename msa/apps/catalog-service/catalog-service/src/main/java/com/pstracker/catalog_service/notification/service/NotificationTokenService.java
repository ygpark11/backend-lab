package com.pstracker.catalog_service.notification.service;

import com.pstracker.catalog_service.member.domain.Member;
import com.pstracker.catalog_service.member.repository.MemberRepository;
import com.pstracker.catalog_service.notification.domain.FcmToken;
import com.pstracker.catalog_service.notification.repository.FcmTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationTokenService {

    private final FcmTokenRepository fcmTokenRepository;
    private final MemberRepository memberRepository;

    @Transactional
    public void saveToken(Long memberId, String token) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));

        // 이미 있는 토큰이면 시간만 갱신, 없으면 새로 저장
        fcmTokenRepository.findByMemberAndToken(member, token)
                .ifPresentOrElse(
                        FcmToken::updateLastUsedAt,
                        () -> fcmTokenRepository.save(new FcmToken(member, token))
                );

        log.info("FCM Token saved for memberId: {}", memberId);
    }
}