package com.pstracker.catalog_service.scraping.service;

import com.pstracker.catalog_service.catalog.repository.GameRepository;
import com.pstracker.catalog_service.member.domain.Member;
import com.pstracker.catalog_service.member.domain.Role;
import com.pstracker.catalog_service.member.repository.MemberRepository;
import com.pstracker.catalog_service.scraping.domain.GameCandidate;
import com.pstracker.catalog_service.scraping.domain.ScrapingRequest;
import com.pstracker.catalog_service.scraping.domain.ScrapingRequestStatus;
import com.pstracker.catalog_service.scraping.dto.CandidateSliceResponse;
import com.pstracker.catalog_service.scraping.repository.GameCandidateRepository;
import com.pstracker.catalog_service.scraping.repository.ScrapingRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ScrapingQueueServiceTest {

    @Autowired ScrapingQueueService scrapingQueueService;
    @Autowired MemberRepository memberRepository;
    @Autowired GameCandidateRepository gameCandidateRepository;
    @Autowired ScrapingRequestRepository scrapingRequestRepository;

    // Game 테이블 조회만 모킹 (실제 Game 엔티티 생성 없이 시나리오 제어)
    @MockitoBean
    GameRepository gameRepository;

    private Member testMember;
    private static final String TEST_PS_STORE_ID = "PPSA-TEST-001";

    @BeforeEach
    void setUp() {
        testMember = memberRepository.save(Member.builder()
                .email("test@ps-signal.com")
                .password("test-pw")
                .nickname("테스트개척자")
                .role(Role.USER)
                .build());

        gameCandidateRepository.save(GameCandidate.builder()
                .psStoreId(TEST_PS_STORE_ID)
                .title("테스트 신작 게임")
                .imageUrl("https://img.test.com/cover.jpg")
                .build());

        // 기본적으로 Game 테이블에는 해당 게임 없음
        given(gameRepository.existsByPsStoreId(anyString())).willReturn(false);
    }

    @Test
    @DisplayName("정상 요청 시 ScrapingRequest가 PENDING으로 생성되고 GameCandidate가 삭제되어야 한다.")
    void requestScraping_정상_요청() {
        // when
        scrapingQueueService.requestScraping(testMember.getId(), TEST_PS_STORE_ID);

        // then
        Optional<ScrapingRequest> request = scrapingRequestRepository.findFirstByStatusOrderByCreatedAtAsc(ScrapingRequestStatus.PENDING);
        assertThat(request).isPresent();
        assertThat(request.get().getPsStoreId()).isEqualTo(TEST_PS_STORE_ID);
        assertThat(request.get().getMember().getId()).isEqualTo(testMember.getId());

        assertThat(gameCandidateRepository.findByPsStoreId(TEST_PS_STORE_ID)).isEmpty();
    }

    @Test
    @DisplayName("1시간 이내 요청이 3건을 초과하면 차단되어야 한다.")
    void requestScraping_1시간_도배_차단() {
        // given: 이미 3건 요청 완료
        for (int i = 0; i < 3; i++) {
            String psStoreId = "PPSA-DUMMY-00" + i;
            gameCandidateRepository.save(GameCandidate.builder()
                    .psStoreId(psStoreId)
                    .title("더미 게임 " + i)
                    .imageUrl("https://img.test.com/" + i + ".jpg")
                    .build());
            scrapingQueueService.requestScraping(testMember.getId(), psStoreId);
        }

        // when & then
        assertThatThrownBy(() -> scrapingQueueService.requestScraping(testMember.getId(), TEST_PS_STORE_ID))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("1시간에 최대 3개");
    }

    @Test
    @DisplayName("이미 Game 테이블에 등록된 게임은 차단되어야 한다.")
    void requestScraping_Game_테이블_중복_차단() {
        // given
        given(gameRepository.existsByPsStoreId(TEST_PS_STORE_ID)).willReturn(true);

        // when & then
        assertThatThrownBy(() -> scrapingQueueService.requestScraping(testMember.getId(), TEST_PS_STORE_ID))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("이미 누군가 트래커에 등록한 게임");
    }

    @Test
    @DisplayName("PENDING 상태인 요청이 있으면 동일 게임 재요청이 차단되어야 한다.")
    void requestScraping_PENDING_중복_차단() {
        // given: 먼저 요청하여 PENDING 생성
        scrapingQueueService.requestScraping(testMember.getId(), TEST_PS_STORE_ID);

        // 동일 게임을 다시 후보에 넣어도 큐에 PENDING이 있으므로 차단
        gameCandidateRepository.save(GameCandidate.builder()
                .psStoreId(TEST_PS_STORE_ID)
                .title("테스트 신작 게임")
                .imageUrl("https://img.test.com/cover.jpg")
                .build());

        // when & then
        assertThatThrownBy(() -> scrapingQueueService.requestScraping(testMember.getId(), TEST_PS_STORE_ID))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("진행 중입니다");
    }

    @Test
    @DisplayName("PROCESSING 상태인 요청이 있으면 동일 게임 재요청이 차단되어야 한다.")
    void requestScraping_PROCESSING_중복_차단() {
        // given: PROCESSING 상태 레코드 직접 생성
        ScrapingRequest processing = ScrapingRequest.builder()
                .member(testMember)
                .psStoreId(TEST_PS_STORE_ID)
                .targetUrl("https://store.playstation.com/ko-kr/product/" + TEST_PS_STORE_ID)
                .build();
        processing.markAsProcessing();
        scrapingRequestRepository.save(processing);

        // when & then
        assertThatThrownBy(() -> scrapingQueueService.requestScraping(testMember.getId(), TEST_PS_STORE_ID))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("진행 중입니다");
    }

    @Test
    @DisplayName("FAILED 상태인 게임은 재시도가 허용되어야 하고, 기존 FAILED 레코드는 삭제되어야 한다.")
    void requestScraping_FAILED_재시도_허용() {
        // given: FAILED 상태 레코드 직접 생성
        ScrapingRequest failed = ScrapingRequest.builder()
                .member(testMember)
                .psStoreId(TEST_PS_STORE_ID)
                .targetUrl("https://store.playstation.com/ko-kr/product/" + TEST_PS_STORE_ID)
                .build();
        failed.markAsFailed("Python 크롤러 타임아웃");
        scrapingRequestRepository.save(failed);

        // when
        scrapingQueueService.requestScraping(testMember.getId(), TEST_PS_STORE_ID);

        // then: 새 PENDING 생성됨
        Optional<ScrapingRequest> newRequest = scrapingRequestRepository
                .findFirstByStatusOrderByCreatedAtAsc(ScrapingRequestStatus.PENDING);
        assertThat(newRequest).isPresent();
        assertThat(newRequest.get().getPsStoreId()).isEqualTo(TEST_PS_STORE_ID);

        // then: 기존 FAILED 레코드 삭제됨
        boolean failedExists = scrapingRequestRepository
                .existsByPsStoreIdAndStatusIn(TEST_PS_STORE_ID, List.of(ScrapingRequestStatus.FAILED));
        assertThat(failedExists).isFalse();
    }

    @Test
    @DisplayName("존재하는 후보 게임 삭제 시 DB에서 제거되어야 한다.")
    void deleteCandidate_정상_삭제() {
        // when
        scrapingQueueService.deleteCandidate(TEST_PS_STORE_ID);

        // then
        assertThat(gameCandidateRepository.existsByPsStoreId(TEST_PS_STORE_ID)).isFalse();
    }

    @Test
    @DisplayName("존재하지 않는 psStoreId로 삭제 요청 시 IllegalArgumentException이 발생해야 한다.")
    void deleteCandidate_존재하지_않는_게임_예외() {
        assertThatThrownBy(() -> scrapingQueueService.deleteCandidate("PPSA-NOTEXIST-999"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("존재하지 않는 후보 게임입니다");
    }

    @Test
    @DisplayName("후보군 목록 조회 시 size=20 기준 Slice 페이지네이션이 적용되어야 한다.")
    void getCandidates_페이지네이션() {
        // given: 기존 setUp 1건 포함하여 총 25건
        for (int i = 2; i <= 25; i++) {
            gameCandidateRepository.save(GameCandidate.builder()
                    .psStoreId("PPSA-PAGE-" + String.format("%02d", i))
                    .title("페이지 테스트 게임 " + i)
                    .imageUrl("https://img.test.com/page-" + i + ".jpg")
                    .build());
        }

        // when
        CandidateSliceResponse page0 = scrapingQueueService.getCandidates(0);
        CandidateSliceResponse page1 = scrapingQueueService.getCandidates(1);

        // then
        assertThat(page0.content()).hasSize(20);
        assertThat(page0.hasNext()).isTrue();

        assertThat(page1.content()).hasSize(5);
        assertThat(page1.hasNext()).isFalse();
    }
}
