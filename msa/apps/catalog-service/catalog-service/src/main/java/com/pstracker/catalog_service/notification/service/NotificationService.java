package com.pstracker.catalog_service.notification.service;

import com.pstracker.catalog_service.notification.domain.Notification;
import com.pstracker.catalog_service.notification.dto.NotificationResponse;
import com.pstracker.catalog_service.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationService {

    private final NotificationRepository notificationRepository;

    /**
     * 내 알림 목록 조회 (최신 20개)
     * @param memberId 회원 ID
     * @return 알림 리스트
     */
    public List<NotificationResponse> getMyNotifications(Long memberId) {
        return notificationRepository.findTop20ByMemberIdOrderByCreatedAtDesc(memberId)
                .stream()
                .map(NotificationResponse::from)
                .toList();
    }

    /**
     * 안 읽은 알림 개수 조회
     * @param memberId 회원 ID
     * @return 안 읽은 알림 개수
     */
    public long getUnreadCount(Long memberId) {
        return notificationRepository.countByMemberIdAndIsReadFalse(memberId);
    }

    /**
     * 알림 읽음 처리
     * @param notificationId 알림 ID
     * @param memberId 회원 ID
     */
    @Transactional
    public void markAsRead(Long notificationId, Long memberId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 알림입니다."));

        // 남의 알림을 읽으려고 하면 차단
        if (!notification.getMember().getId().equals(memberId)) {
            throw new SecurityException("해당 알림에 대한 접근 권한이 없습니다.");
        }

        notification.markAsRead();
    }
}