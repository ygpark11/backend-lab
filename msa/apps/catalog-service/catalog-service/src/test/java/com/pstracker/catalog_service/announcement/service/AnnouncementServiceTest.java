package com.pstracker.catalog_service.announcement.service;

import com.pstracker.catalog_service.ai.service.AiService;
import com.pstracker.catalog_service.announcement.domain.Announcement;
import com.pstracker.catalog_service.announcement.domain.AnnouncementType;
import com.pstracker.catalog_service.announcement.dto.AnnouncementRequest;
import com.pstracker.catalog_service.announcement.dto.AnnouncementResponse;
import com.pstracker.catalog_service.announcement.repository.AnnouncementRepository;
import com.pstracker.catalog_service.catalog.service.IgdbEnrichmentService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AnnouncementServiceTest {

    @Autowired
    private AnnouncementService announcementService;

    @Autowired
    private AnnouncementRepository announcementRepository;

    @Autowired
    private EntityManager em;

    @MockitoBean
    private IgdbEnrichmentService igdbEnrichmentService;

    @MockitoBean
    private AiService aiService;

    @Test
    @DisplayName("공지사항 생성 시 createdAt, updatedAt 타임스탬프가 설정되어야 한다.")
    void createAnnouncement_shouldSetTimestamps() {
        // given
        AnnouncementRequest request = new AnnouncementRequest();
        request.setType(AnnouncementType.INFO);
        request.setTitle("테스트 공지");
        request.setContent("테스트 내용입니다.");

        // when
        AnnouncementResponse response = announcementService.createAnnouncement(request);
        em.flush();
        em.clear();

        // then
        Announcement announcement = announcementRepository.findById(response.id()).orElseThrow();
        assertThat(announcement.getCreatedAt()).isNotNull();
        assertThat(announcement.getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("공지사항 수정 시 updatedAt이 갱신되어야 한다.")
    void updateAnnouncement_shouldUpdateUpdatedAt() throws InterruptedException {
        // given
        AnnouncementRequest createRequest = new AnnouncementRequest();
        createRequest.setType(AnnouncementType.INFO);
        createRequest.setTitle("초기 제목");
        createRequest.setContent("초기 내용");
        AnnouncementResponse created = announcementService.createAnnouncement(createRequest);
        em.flush();
        em.clear();

        java.time.LocalDateTime firstUpdatedAt = announcementRepository.findById(created.id()).orElseThrow().getUpdatedAt();
        Thread.sleep(10);

        // when
        AnnouncementRequest updateRequest = new AnnouncementRequest();
        updateRequest.setType(AnnouncementType.UPDATE);
        updateRequest.setTitle("수정된 제목");
        updateRequest.setContent("수정된 내용");
        announcementService.updateAnnouncement(created.id(), updateRequest);
        em.flush();
        em.clear();

        // then
        Announcement announcement = announcementRepository.findById(created.id()).orElseThrow();
        assertThat(announcement.getUpdatedAt()).isAfterOrEqualTo(firstUpdatedAt);
    }
}
