package com.pstracker.catalog_service.notification.repository;

import com.pstracker.catalog_service.member.domain.Member;
import com.pstracker.catalog_service.notification.domain.FcmToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FcmTokenRepository extends JpaRepository<FcmToken, Long> {
    Optional<FcmToken> findByMemberAndToken(Member member, String token);
    void deleteByMember(Member member);
    List<FcmToken> findAllByMember(Member member);

    @Query("SELECT f FROM FcmToken f JOIN FETCH f.member")
    List<FcmToken> findAllWithMember();

    @Query("SELECT ft FROM FcmToken ft WHERE ft.member.id IN :memberIds")
    List<FcmToken> findAllByMemberIdIn(@Param("memberIds") List<Long> memberIds);

    @Query("SELECT ft FROM FcmToken ft JOIN FETCH ft.member WHERE ft.member.id IN :memberIds")
    List<FcmToken> findAllByMemberIdInWithMember(@Param("memberIds") List<Long> memberIds);

    @Query("SELECT f FROM FcmToken f JOIN FETCH f.member WHERE f.member = :member")
    List<FcmToken> findAllByMemberWithMember(@Param("member") Member member);
}