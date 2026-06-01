package com.pstracker.catalog_service.notification.service;

import com.pstracker.catalog_service.notification.domain.Notification;
import com.pstracker.catalog_service.notification.dto.NotificationListResponse;
import com.pstracker.catalog_service.notification.dto.NotificationResponse;
import com.pstracker.catalog_service.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationService {

    private final NotificationRepository notificationRepository;

    /**
     * 안읽음 알림 목록 조회 (제한 없음)
     */
    public NotificationListResponse getUnreadNotifications(Long memberId) {
        List<NotificationResponse> content = notificationRepository
                .findByMemberIdAndIsReadFalseOrderByCreatedAtDesc(memberId)
                .stream()
                .map(NotificationResponse::from)
                .toList();
        return new NotificationListResponse(content, false);
    }

    /**
     * 전체 알림 목록 조회 (Slice 페이징 - 무한 스크롤)
     */
    public NotificationListResponse getAllNotifications(Long memberId, Pageable pageable) {
        Pageable safe = PageRequest.of(pageable.getPageNumber(), Math.min(pageable.getPageSize(), 50), pageable.getSort());
        Slice<Notification> slice = notificationRepository
                .findByMemberIdOrderByCreatedAtDesc(memberId, safe);
        List<NotificationResponse> content = slice.getContent()
                .stream()
                .map(NotificationResponse::from)
                .toList();
        return new NotificationListResponse(content, slice.hasNext());
    }

    /**
     * 안읽음 알림 개수 조회
     */
    public long getUnreadCount(Long memberId) {
        return notificationRepository.countByMemberIdAndIsReadFalse(memberId);
    }

    /**
     * 단건 알림 읽음 처리
     */
    @Transactional
    public void markAsRead(Long notificationId, Long memberId) {
        Notification notification = notificationRepository.findByIdAndMemberId(notificationId, memberId)
                .orElseThrow(() -> new IllegalArgumentException("알림을 찾을 수 없습니다."));
        notification.markAsRead();
    }

    /**
     * 전체 알림 읽음 처리 (벌크 UPDATE)
     */
    @Transactional
    public void markAllAsRead(Long memberId) {
        notificationRepository.markAllAsRead(memberId);
    }
}
