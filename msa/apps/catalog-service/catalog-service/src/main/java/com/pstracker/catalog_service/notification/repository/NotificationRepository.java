package com.pstracker.catalog_service.notification.repository;

import com.pstracker.catalog_service.notification.domain.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    // 내 알림 목록 중 최신 20개만 조회
    List<Notification> findTop20ByMemberIdOrderByCreatedAtDesc(Long memberId);

    // 안 읽은 알림 개수 (로그인 시 뱃지 표시용 - 성능을 위해 count만)
    long countByMemberIdAndIsReadFalse(Long memberId);
}
