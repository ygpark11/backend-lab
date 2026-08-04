package com.pstracker.catalog_service.catalog.service;

import com.pstracker.catalog_service.ai.service.AiService;
import com.pstracker.catalog_service.catalog.domain.CrawlJob;
import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.domain.GamePriceHistory;
import com.pstracker.catalog_service.catalog.dto.AdminGameUpdateRequest;
import com.pstracker.catalog_service.catalog.dto.CollectRequest;
import com.pstracker.catalog_service.catalog.dto.igdb.IgdbGameResponse;
import com.pstracker.catalog_service.catalog.event.GamePriceChangedEvent;
import com.pstracker.catalog_service.catalog.service.IgdbEnrichmentService;
import com.pstracker.catalog_service.catalog.repository.CrawlJobRepository;
import com.pstracker.catalog_service.catalog.repository.GamePriceHistoryRepository;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.any;
import static org.mockito.BDDMockito.given;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
@RecordApplicationEvents
public class CatalogServiceTest {

    @Autowired
    private CatalogService catalogService;

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private GamePriceHistoryRepository priceHistoryRepository;

    @Autowired
    private ApplicationEvents events;

    @Autowired
    private CrawlJobRepository crawlJobRepository;

    @MockitoBean
    private IgdbEnrichmentService igdbEnrichmentService;

    @MockitoBean
    private AiService aiService;

    @Autowired
    private EntityManager em;

    @Test
    @DisplayName("신규 게임이 수집되면 Game과 PriceHistory가 모두 저장되어야 한다.")
    void save_NewGame() {
        // given
        CollectRequest request = createDto("PROD-001", "Elden Ring", 69800, 69800, 0, null);
        given(igdbEnrichmentService.searchGame(any())).willReturn(null);

        // when
        catalogService.upsertGameData(request);

        // then
        Optional<Game> savedGame = gameRepository.findByPsStoreId("PROD-001");
        assertThat(savedGame).isPresent();
        assertThat(savedGame.get().getName()).isEqualTo("Elden Ring");

        List<GamePriceHistory> histories = priceHistoryRepository.findAllByGameIdOrderByCreatedAtAsc(savedGame.get().getId());
        assertThat(histories).hasSize(1);
        assertThat(histories.get(0).getPrice()).isEqualTo(69800);
    }

    @Test
    @DisplayName("가격이 하락하면 새로운 이력이 저장되고 알림 이벤트가 발행되어야 한다.")
    void upsert_PriceDrop() {
        // given
        CollectRequest initialData = createDto("PROD-002", "Cyberpunk", 10000, 10000, 0, null);
        catalogService.upsertGameData(initialData);

        em.flush();
        em.clear();

        CollectRequest newData = createDto("PROD-002", "Cyberpunk", 10000, 5000, 50, LocalDate.now().plusDays(7));

        // when
        catalogService.upsertGameData(newData);

        // then
        Game game = gameRepository.findByPsStoreId("PROD-002").orElseThrow();
        List<GamePriceHistory> histories = priceHistoryRepository.findAllByGameIdOrderByCreatedAtAsc(game.getId());

        assertThat(histories).hasSize(2);
        assertThat(histories.get(1).getPrice()).isEqualTo(5000);
        assertThat(histories.get(1).getDiscountRate()).isEqualTo(50);

        // 가격 하락 이벤트가 딱 1번 바구니에 담겼냐?
        long eventCount = events.stream(GamePriceChangedEvent.class).count();
        assertThat(eventCount).isEqualTo(1);
    }

    @Test
    @DisplayName("가격과 조건이 동일하면 DB에 중복 저장하지 않아야 한다.")
    void upsert_NoChange() {
        // given
        CollectRequest initialData = createDto("PROD-003", "Dave the Diver", 24000, 24000, 0, null);
        catalogService.upsertGameData(initialData);

        CollectRequest sameData = createDto("PROD-003", "Dave the Diver", 24000, 24000, 0, null);

        // when
        catalogService.upsertGameData(sameData);

        // then
        Game game = gameRepository.findByPsStoreId("PROD-003").orElseThrow();
        List<GamePriceHistory> histories = priceHistoryRepository.findAllByGameIdOrderByCreatedAtAsc(game.getId());

        assertThat(histories).hasSize(1);
    }

    @Test
    @DisplayName("가격은 같아도 세일 종료일이 다르면 새로운 프로모션으로 간주하여 저장해야 한다.")
    void upsert_SaleEndDateChange() {
        // given
        LocalDate date1 = LocalDate.of(2025, 1, 1);
        LocalDate date2 = LocalDate.of(2025, 2, 1);

        CollectRequest data1 = createDto("PROD-004", "GTA V", 15000, 15000, 0, date1);
        catalogService.upsertGameData(data1);

        CollectRequest data2 = createDto("PROD-004", "GTA V", 15000, 15000,0, date2);

        // when
        catalogService.upsertGameData(data2);

        // then
        Game game = gameRepository.findByPsStoreId("PROD-004").orElseThrow();
        List<GamePriceHistory> histories = priceHistoryRepository.findAllByGameIdOrderByCreatedAtAsc(game.getId());

        assertThat(histories).hasSize(2);

        // 가격은 안 떨어졌으니 이벤트 바구니는 비어있어야 해 검증
        long eventCount = events.stream(GamePriceChangedEvent.class).count();
        assertThat(eventCount).isEqualTo(0);
    }

    @Test
    @DisplayName("가격이 0원인 비정상 데이터가 들어오면 저장을 무시해야 한다.")
    void upsert_GuardClause_ZeroPrice() {
        // given
        CollectRequest invalidData = createDto("PROD-005", "Error Game", 0, 0, 0, null);

        // when
        catalogService.upsertGameData(invalidData);

        // then
        Optional<Game> game = gameRepository.findByPsStoreId("PROD-005");
        assertThat(game).isEmpty();
    }

    @Test
    @DisplayName("신규 게임 저장 시 createdAt, lastUpdated 타임스탬프가 설정되어야 한다.")
    void save_NewGame_shouldSetTimestamps() {
        // given
        CollectRequest request = createDto("PROD-AUDIT-001", "Audit Test Game", 60000, 60000, 0, null);
        given(igdbEnrichmentService.searchGame(any())).willReturn(null);

        // when
        catalogService.upsertGameData(request);
        em.flush();
        em.clear();

        // then
        Game game = gameRepository.findByPsStoreId("PROD-AUDIT-001").orElseThrow();
        assertThat(game.getCreatedAt()).isNotNull();
        assertThat(game.getLastUpdated()).isNotNull();
    }

    @Test
    @DisplayName("게임 재수집(upsert) 시 lastUpdated 가 갱신되어야 한다.")
    void upsert_ExistingGame_shouldUpdateLastUpdated() throws InterruptedException {
        // given
        CollectRequest initial = createDto("PROD-AUDIT-002", "Update Test Game", 60000, 60000, 0, null);
        given(igdbEnrichmentService.searchGame(any())).willReturn(null);
        catalogService.upsertGameData(initial);
        em.flush();
        em.clear();

        Game before = gameRepository.findByPsStoreId("PROD-AUDIT-002").orElseThrow();
        java.time.LocalDateTime firstUpdated = before.getLastUpdated();

        Thread.sleep(10);

        // when
        CollectRequest updated = createDto("PROD-AUDIT-002", "Update Test Game", 60000, 55000, 8, null);
        catalogService.upsertGameData(updated);
        em.flush();
        em.clear();

        // then
        Game after = gameRepository.findByPsStoreId("PROD-AUDIT-002").orElseThrow();
        assertThat(after.getLastUpdated()).isAfterOrEqualTo(firstUpdated);
    }

    @Test
    @DisplayName("IGDB 응답이 있으면 평점이 Game에 반영되어야 한다.")
    void upsert_IgdbSuccess_RatingsApplied() {
        // given
        IgdbGameResponse igdbResponse = new IgdbGameResponse(
                1L, "Elden Ring", 90.5, 48, 87.3, 1200, null, 1248);
        given(igdbEnrichmentService.searchGame(any())).willReturn(igdbResponse);

        CollectRequest request = createDto("PROD-IGDB-001", "Elden Ring", 70000, 70000, 0, null);

        // when
        catalogService.upsertGameData(request);
        em.flush();
        em.clear();

        // then
        Game game = gameRepository.findByPsStoreId("PROD-IGDB-001").orElseThrow();
        assertThat(game.getIgdbCriticScore()).isEqualTo(91);   // Math.round(90.5)
        assertThat(game.getIgdbCriticCount()).isEqualTo(48);
        assertThat(game.getIgdbUserScore()).isEqualTo(87.3);
        assertThat(game.getIgdbUserCount()).isEqualTo(1200);
    }

    @Test
    @DisplayName("IGDB 호출이 별도 가상 스레드에서 실행된다. (병렬 실행 검증)")
    void upsert_IgdbCalledOnSeparateThread() {
        // given
        String testThreadName = Thread.currentThread().getName();
        AtomicReference<String> igdbThreadName = new AtomicReference<>();

        given(igdbEnrichmentService.searchGame(any())).willAnswer(inv -> {
            igdbThreadName.set(Thread.currentThread().getName());
            return null;
        });

        // when
        catalogService.upsertGameData(createDto("PROD-IGDB-002", "Thread Test", 50000, 50000, 0, null));

        // then: IGDB는 호출됐고, upsertGameData를 호출한 스레드와 다른 스레드에서 실행됐어야 함
        assertThat(igdbThreadName.get())
                .isNotNull()
                .isNotEqualTo(testThreadName);
    }

    // ── adminUpdateGame ──────────────────────────────────────────────────────

    @Test
    @DisplayName("adminUpdateGame — 영문명이 이미 있어도 새 값으로 수정된다 (updateInfo 버그 수정 검증)")
    void adminUpdateGame_영문명_덮어쓰기() {
        // given: 영문명이 이미 설정된 게임 생성
        given(igdbEnrichmentService.searchGame(any())).willReturn(null);
        catalogService.upsertGameData(createDto("PROD-ADMIN-001", "엘든 링", 70000, 70000, 0, null));
        em.flush(); em.clear();

        Game game = gameRepository.findByPsStoreId("PROD-ADMIN-001").orElseThrow();
        assertThat(game.getEnglishName()).isEqualTo("엘든 링 (Eng)");

        AdminGameUpdateRequest req = new AdminGameUpdateRequest(
                null, "Elden Ring", null,
                null, null, null, null,
                null, null, null, null,
                null, null, null, null
        );

        // when
        catalogService.adminUpdateGame(game.getId(), req);
        em.flush(); em.clear();

        // then: 기존 값 무관하게 영문명 수정됨
        Game updated = gameRepository.findById(game.getId()).orElseThrow();
        assertThat(updated.getEnglishName()).isEqualTo("Elden Ring");
    }

    @Test
    @DisplayName("adminUpdateGame — name/englishName은 null 가드 보호 (지우기 불가)")
    void adminUpdateGame_name_englishName_null_보호() {
        // given
        given(igdbEnrichmentService.searchGame(any())).willReturn(null);
        catalogService.upsertGameData(createDto("PROD-ADMIN-002", "사이버펑크", 50000, 50000, 0, null));
        em.flush(); em.clear();

        Game before = gameRepository.findByPsStoreId("PROD-ADMIN-002").orElseThrow();
        String originalName = before.getName();
        String originalEnglishName = before.getEnglishName();

        AdminGameUpdateRequest req = new AdminGameUpdateRequest(
                null, null, null,
                null, null, null, null,
                null, null, null, null,
                null, null, null, null
        );

        // when
        catalogService.adminUpdateGame(before.getId(), req);
        em.flush(); em.clear();

        // then: name/englishName은 null 가드로 보호됨
        Game after = gameRepository.findById(before.getId()).orElseThrow();
        assertThat(after.getName()).isEqualTo(originalName);
        assertThat(after.getEnglishName()).isEqualTo(originalEnglishName);
    }

    @Test
    @DisplayName("adminUpdateGame — IGDB null 전달 시 기존 평점 초기화 (폼 전체 제출 전제, 의도적 삭제 허용)")
    void adminUpdateGame_IGDB_null_시_기존값_초기화() {
        // given: IGDB 평점이 설정된 게임 생성
        given(igdbEnrichmentService.searchGame(any())).willReturn(
                new IgdbGameResponse(1L, "갓 오브 워", 90.5, 48, 87.3, 1200, null, 1248)
        );
        catalogService.upsertGameData(createDto("PROD-ADMIN-003", "갓 오브 워", 60000, 60000, 0, null));
        em.flush(); em.clear();

        Game game = gameRepository.findByPsStoreId("PROD-ADMIN-003").orElseThrow();
        assertThat(game.getIgdbCriticScore()).isNotNull(); // 초기 IGDB 데이터 확인

        // IGDB 전체 null (관리자가 평점 정보 지우기)
        AdminGameUpdateRequest req = new AdminGameUpdateRequest(
                null, null, null,
                null, null, null, null,
                null, null, null, null,
                null, null, null, null
        );

        // when
        catalogService.adminUpdateGame(game.getId(), req);
        em.flush(); em.clear();

        // then: IGDB 필드 전부 null로 초기화됨
        Game updated = gameRepository.findById(game.getId()).orElseThrow();
        assertThat(updated.getIgdbCriticScore()).isNull();
        assertThat(updated.getIgdbCriticCount()).isNull();
        assertThat(updated.getIgdbUserScore()).isNull();
        assertThat(updated.getIgdbUserCount()).isNull();
    }

    @Test
    @DisplayName("adminUpdateGame — HLTB null 전달 시 기존 플레이타임 초기화")
    void adminUpdateGame_HLTB_null_시_기존값_초기화() {
        // given: HLTB 값 세팅
        given(igdbEnrichmentService.searchGame(any())).willReturn(null);
        catalogService.upsertGameData(createDto("PROD-ADMIN-004", "엘든 링", 70000, 70000, 0, null));
        em.flush(); em.clear();

        Game game = gameRepository.findByPsStoreId("PROD-ADMIN-004").orElseThrow();

        AdminGameUpdateRequest setReq = new AdminGameUpdateRequest(
                null, null, null,
                null, null, null, null,
                null, null, null, null,
                null, 40.0, 60.0, 100.0
        );
        catalogService.adminUpdateGame(game.getId(), setReq);
        em.flush(); em.clear();

        // when: HLTB 전체 null
        AdminGameUpdateRequest clearReq = new AdminGameUpdateRequest(
                null, null, null,
                null, null, null, null,
                null, null, null, null,
                null, null, null, null
        );
        catalogService.adminUpdateGame(game.getId(), clearReq);
        em.flush(); em.clear();

        // then: HLTB 전부 null로 초기화됨
        Game updated = gameRepository.findById(game.getId()).orElseThrow();
        assertThat(updated.getHltbMainStory()).isNull();
        assertThat(updated.getHltbMainExtra()).isNull();
        assertThat(updated.getHltbCompletionist()).isNull();
    }

    // ── bulkDeleteGames ──────────────────────────────────────────────────────

    @Test
    @DisplayName("bulkDeleteGames — 게임과 연관 가격 이력이 모두 삭제된다")
    void bulkDeleteGames_게임과_이력_모두_삭제() {
        // given: 게임 2개 생성 (price_history 포함)
        given(igdbEnrichmentService.searchGame(any())).willReturn(null);
        catalogService.upsertGameData(createDto("PROD-BULK-001", "벌크삭제1", 50000, 50000, 0, null));
        catalogService.upsertGameData(createDto("PROD-BULK-002", "벌크삭제2", 60000, 60000, 0, null));
        em.flush(); em.clear();

        List<Long> gameIds = List.of(
                gameRepository.findByPsStoreId("PROD-BULK-001").orElseThrow().getId(),
                gameRepository.findByPsStoreId("PROD-BULK-002").orElseThrow().getId()
        );

        // when
        catalogService.bulkDeleteGames(gameIds);
        em.flush(); em.clear();

        // then: 게임 삭제됨
        assertThat(gameRepository.findByPsStoreId("PROD-BULK-001")).isEmpty();
        assertThat(gameRepository.findByPsStoreId("PROD-BULK-002")).isEmpty();

        // then: 가격 이력도 삭제됨
        gameIds.forEach(id ->
                assertThat(priceHistoryRepository.findAllByGameIdOrderByCreatedAtAsc(id)).isEmpty()
        );
    }

    @Test
    @DisplayName("bulkDeleteGames — 존재하지 않는 ID를 포함해도 예외 없이 존재하는 게임만 삭제된다")
    void bulkDeleteGames_존재하지않는ID_포함() {
        // given
        given(igdbEnrichmentService.searchGame(any())).willReturn(null);
        catalogService.upsertGameData(createDto("PROD-BULK-003", "벌크삭제3", 50000, 50000, 0, null));
        em.flush(); em.clear();

        Long existingId = gameRepository.findByPsStoreId("PROD-BULK-003").orElseThrow().getId();
        Long nonExistentId = 99999L;

        // when & then: 예외 없이 완료되어야 함
        org.assertj.core.api.Assertions.assertThatCode(
                () -> catalogService.bulkDeleteGames(List.of(existingId, nonExistentId))
        ).doesNotThrowAnyException();

        em.flush(); em.clear();
        assertThat(gameRepository.findByPsStoreId("PROD-BULK-003")).isEmpty();
    }

    // ── 버그 재현: clearAutomatically=true 로 인한 Game UPDATE 유실 ──────────────
    //
    // 발생 조건: isRecentRelease=true (releaseDate 1개월 이내) + CrawlJob이 DONE 상태
    //   → requeueFinishedJob(clearAutomatically=true) 가 호출됨
    //   → em.clear() 가 Game 엔티티의 pending dirty state(UPDATE SQL)를 파기
    //   → 트랜잭션 커밋 시 Game UPDATE가 실행되지 않음
    //
    // 미발생 조건:
    //   - isRecentRelease=false → requeueRecentGameForScraping 미호출 → em.clear() 없음
    //   - CrawlJob이 PENDING/PROCESSING → existsByGameIdAndTargetTypeAndStatusIn=true → early return → requeueFinishedJob 미호출

    @Test
    @DisplayName("[버그 재현] 최근 출시 게임 세일 종료 후 재수집 시 Game 가격 필드가 업데이트되어야 한다")
    void upsert_RecentRelease_SaleEnded_ExistingDoneJob_GamePriceUpdated() {
        // given: 세일 중 최초 수집 (releaseDate 2주 전 → isRecentRelease=true)
        LocalDate recentRelease = LocalDate.now().minusWeeks(2);
        LocalDate saleEndPast  = LocalDate.now().minusDays(3);
        given(igdbEnrichmentService.searchGame(any())).willReturn(null);

        CollectRequest onSale = createDtoWithReleaseDate(
                "PROD-BUG-001", "Voidtrain", 39800, 31840, 20, saleEndPast, recentRelease);
        catalogService.upsertGameData(onSale);
        em.flush();
        em.clear();

        // CrawlJob 상태를 DONE으로 변경 (배치 처리 완료 후 실제 상태 시뮬레이션)
        // → 이 상태에서 다음 수집 시 requeueFinishedJob(DONE→PENDING)이 호출됨
        Game game = gameRepository.findByPsStoreId("PROD-BUG-001").orElseThrow();
        crawlJobRepository.findAll().stream()
                .filter(j -> j.getGameId().equals(game.getId()))
                .forEach(j -> j.updateStatus(CrawlJob.JobStatus.DONE, null));
        em.flush();
        em.clear();

        // when: 세일 종료 후 정상가(39800)로 재수집
        //   1. shouldSaveHistory=true (31840→39800)  → 이력 INSERT (IDENTITY 전략으로 즉시 실행)
        //   2. isRecentRelease=true + CrawlJob DONE  → requeueFinishedJob(DONE→PENDING) 실행
        //   3. clearAutomatically=true               → em.clear() → Game UPDATE SQL 유실
        //   4. 트랜잭션 커밋 시 Game UPDATE 미실행   → DB에 31840 그대로 남음
        CollectRequest afterSale = createDtoWithReleaseDate(
                "PROD-BUG-001", "Voidtrain", 39800, 39800, 0, null, recentRelease);
        catalogService.upsertGameData(afterSale);
        em.flush();
        em.clear();

        // then: Game 역정규화 필드가 39800으로 업데이트되어야 한다
        Game updated = gameRepository.findByPsStoreId("PROD-BUG-001").orElseThrow();
        assertThat(updated.getCurrentPrice()).isEqualTo(39800);
        assertThat(updated.getDiscountRate()).isEqualTo(0);
        assertThat(updated.getSaleEndDate()).isNull();
    }

    @Test
    @DisplayName("[버그 재현] 최근 출시 게임 동일 가격 재수집 시에도 Game 메타데이터가 업데이트되어야 한다")
    void upsert_RecentRelease_SamePrice_ExistingDoneJob_MetadataUpdated() {
        // given: 게임 최초 수집 후 CrawlJob DONE 전환
        LocalDate recentRelease = LocalDate.now().minusWeeks(2);
        given(igdbEnrichmentService.searchGame(any())).willReturn(null);

        CollectRequest initial = createDtoWithReleaseDate(
                "PROD-BUG-002", "TestGame", 39800, 39800, 0, null, recentRelease);
        catalogService.upsertGameData(initial);
        em.flush();
        em.clear();

        Game game = gameRepository.findByPsStoreId("PROD-BUG-002").orElseThrow();
        crawlJobRepository.findAll().stream()
                .filter(j -> j.getGameId().equals(game.getId()))
                .forEach(j -> j.updateStatus(CrawlJob.JobStatus.DONE, null));
        em.flush();
        em.clear();

        // when: 동일 가격으로 재수집 (shouldSaveHistory=false)
        //   → updateInfo()는 항상 lastUpdated=now 로 설정하므로 Game이 dirty 상태
        //   → requeueFinishedJob(clearAutomatically=true) → em.clear() → dirty state 유실
        CollectRequest updated = createDtoWithReleaseDate(
                "PROD-BUG-002", "TestGame Updated", 39800, 39800, 0, null, recentRelease);
        catalogService.upsertGameData(updated);
        em.flush();
        em.clear();

        // then: 이름 변경이 DB에 반영되어야 한다
        Game result = gameRepository.findByPsStoreId("PROD-BUG-002").orElseThrow();
        assertThat(result.getName()).isEqualTo("TestGame Updated");
    }

    private CollectRequest createDto(String id, String title, int originalPrice, int currentPrice, int discount, LocalDate saleEnd) {
        return new CollectRequest(
                id,
                title,
                title + " (Eng)",
                "Publisher",
                "http://img.com",
                "Desc",
                originalPrice,
                currentPrice,
                discount,
                saleEnd,
                "Action,RPG",
                LocalDate.of(2026,1,1),
                false,
                false,
                List.of("PS5"),
                false,
                null
        );
    }

    private CollectRequest createDtoWithReleaseDate(String id, String title, int originalPrice,
                                                     int currentPrice, int discount, LocalDate saleEnd,
                                                     LocalDate releaseDate) {
        return new CollectRequest(
                id,
                title,
                title + " (Eng)",
                "Publisher",
                "http://img.com",
                "Desc",
                originalPrice,
                currentPrice,
                discount,
                saleEnd,
                "Action,RPG",
                releaseDate,
                false,
                false,
                List.of("PS5"),
                false,
                null
        );
    }
}