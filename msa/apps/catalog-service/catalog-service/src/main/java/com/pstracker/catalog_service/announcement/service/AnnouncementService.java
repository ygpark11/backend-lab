package com.pstracker.catalog_service.announcement.service;

import com.pstracker.catalog_service.announcement.domain.Announcement;
import com.pstracker.catalog_service.announcement.dto.AnnouncementRequest;
import com.pstracker.catalog_service.announcement.dto.AnnouncementResponse;
import com.pstracker.catalog_service.announcement.event.AnnouncementCreatedEvent;
import com.pstracker.catalog_service.announcement.repository.AnnouncementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AnnouncementService {

    private final AnnouncementRepository announcementRepository;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * 공지사항 목록 페이징 조회 (최신순)
     */
    public Page<AnnouncementResponse> getAnnouncements(Pageable pageable) {
        return announcementRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(AnnouncementResponse::from);
    }

    /**
     * 공지사항 생성 (관리자)
     */
    @Transactional
    public AnnouncementResponse createAnnouncement(AnnouncementRequest request) {
        Announcement announcement = Announcement.create(
                request.getType(),
                request.getTitle(),
                request.getContent()
        );

        Announcement saved = announcementRepository.save(announcement);

        eventPublisher.publishEvent(new AnnouncementCreatedEvent(saved.getTitle(), saved.getContent()));

        return AnnouncementResponse.from(saved);
    }

    /**
     * 공지사항 수정 (관리자)
     */
    @Transactional
    public AnnouncementResponse updateAnnouncement(Long id, AnnouncementRequest request) {
        Announcement announcement = announcementRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 공지사항을 찾을 수 없습니다. ID=" + id));

        announcement.update(request.getType(), request.getTitle(), request.getContent());

        return AnnouncementResponse.from(announcement);
    }

    /**
     * 공지사항 삭제 (관리자)
     */
    @Transactional
    public void deleteAnnouncement(Long id) {
        Announcement announcement = announcementRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 공지사항을 찾을 수 없습니다. ID=" + id));

        announcementRepository.delete(announcement);
    }
}
