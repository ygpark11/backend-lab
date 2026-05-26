package com.pstracker.catalog_service.notice.service;

import com.pstracker.catalog_service.ai.service.AiService;
import com.pstracker.catalog_service.catalog.infrastructure.IgdbApiClient;
import com.pstracker.catalog_service.notice.domain.Notice;
import com.pstracker.catalog_service.notice.domain.NoticeType;
import com.pstracker.catalog_service.notice.dto.NoticeReq;
import com.pstracker.catalog_service.notice.dto.NoticeRes;
import com.pstracker.catalog_service.notice.repository.NoticeRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class NoticeServiceTest {

    @Autowired
    private NoticeService noticeService;

    @Autowired
    private NoticeRepository noticeRepository;

    @Autowired
    private EntityManager em;

    @MockitoBean
    private IgdbApiClient igdbApiClient;

    @MockitoBean
    private AiService aiService;

    @Test
    @DisplayName("공지사항 생성 시 createdAt, updatedAt 타임스탬프가 설정되어야 한다.")
    void createNotice_shouldSetTimestamps() {
        // given
        NoticeReq req = new NoticeReq();
        req.setType(NoticeType.INFO);
        req.setTitle("테스트 공지");
        req.setContent("테스트 내용입니다.");

        // when
        NoticeRes res = noticeService.createNotice(req);
        em.flush();
        em.clear();

        // then
        Notice notice = noticeRepository.findById(res.getId()).orElseThrow();
        assertThat(notice.getCreatedAt()).isNotNull();
        assertThat(notice.getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("공지사항 수정 시 updatedAt이 갱신되어야 한다.")
    void updateNotice_shouldUpdateUpdatedAt() throws InterruptedException {
        // given
        NoticeReq createReq = new NoticeReq();
        createReq.setType(NoticeType.INFO);
        createReq.setTitle("초기 제목");
        createReq.setContent("초기 내용");
        NoticeRes created = noticeService.createNotice(createReq);
        em.flush();
        em.clear();

        LocalDateTime firstUpdatedAt = noticeRepository.findById(created.getId()).orElseThrow().getUpdatedAt();
        Thread.sleep(10);

        // when
        NoticeReq updateReq = new NoticeReq();
        updateReq.setType(NoticeType.UPDATE);
        updateReq.setTitle("수정된 제목");
        updateReq.setContent("수정된 내용");
        noticeService.updateNotice(created.getId(), updateReq);
        em.flush();
        em.clear();

        // then
        Notice notice = noticeRepository.findById(created.getId()).orElseThrow();
        assertThat(notice.getUpdatedAt()).isAfterOrEqualTo(firstUpdatedAt);
    }
}
