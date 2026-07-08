package com.pstracker.catalog_service.catalog.service;

import com.pstracker.catalog_service.ai.service.AiService;
import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.domain.GamePriceHistory;
import com.pstracker.catalog_service.catalog.dto.CollectRequest;
import com.pstracker.catalog_service.catalog.dto.igdb.IgdbGameResponse;
import com.pstracker.catalog_service.catalog.event.GamePriceChangedEvent;
import com.pstracker.catalog_service.catalog.service.IgdbEnrichmentService;
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
}