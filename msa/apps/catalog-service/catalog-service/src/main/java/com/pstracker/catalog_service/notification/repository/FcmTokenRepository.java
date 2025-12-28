package com.pstracker.catalog_service.notification.repository;

import com.pstracker.catalog_service.notification.domain.FcmToken;
import com.pstracker.catalog_service.member.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface FcmTokenRepository extends JpaRepository<FcmToken, Long> {
    Optional<FcmToken> findByMemberAndToken(Member member, String token);
    void deleteByMember(Member member);
}