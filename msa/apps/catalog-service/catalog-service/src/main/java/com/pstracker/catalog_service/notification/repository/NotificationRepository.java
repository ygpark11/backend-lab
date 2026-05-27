package com.pstracker.catalog_service.notification.repository;

import com.pstracker.catalog_service.notification.domain.Notification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // 안읽음 목록 (전체, 제한 없음)
    List<Notification> findByMemberIdAndIsReadFalseOrderByCreatedAtDesc(Long memberId);

    // 전체 목록 (Slice 페이징 - 무한 스크롤용, COUNT 쿼리 없음)
    Slice<Notification> findByMemberIdOrderByCreatedAtDesc(Long memberId, Pageable pageable);

    // 안읽음 개수 (로그인 시 뱃지 표시용)
    long countByMemberIdAndIsReadFalse(Long memberId);

    // 알림 단건 조회 (소유권 검증 포함)
    Optional<Notification> findByIdAndMemberId(Long id, Long memberId);

    // 전체 읽음 처리 (벌크 UPDATE)
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.member.id = :memberId AND n.isRead = false")
    int markAllAsRead(@Param("memberId") Long memberId);
}
