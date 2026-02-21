package com.pstracker.catalog_service.catalog.service;

import com.pstracker.catalog_service.ai.service.AiService;
import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.domain.GamePriceHistory;
import com.pstracker.catalog_service.catalog.dto.CollectRequestDto;
import com.pstracker.catalog_service.catalog.event.GamePriceChangedEvent;
import com.pstracker.catalog_service.catalog.infrastructure.IgdbApiClient;
import com.pstracker.catalog_service.catalog.repository.GamePriceHistoryRepository;
import com.pstracker.catalog_service.catalog.repository.GameRepository;
import com.pstracker.catalog_service.notification.event.GamePriceChangedListener;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class CatalogServiceTest {

    @Autowired
    private CatalogService catalogService;

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private GamePriceHistoryRepository priceHistoryRepository;

    @MockitoBean
    private IgdbApiClient igdbApiClient;

    @MockitoBean
    private AiService aiService;

    @MockitoBean
    private GamePriceChangedListener gamePriceChangedListener;

    @Autowired
    private EntityManager em;

    @Test
    @DisplayName("신규 게임이 수집되면 Game과 PriceHistory가 모두 저장되어야 한다.")
    void save_NewGame() {
        // given
        CollectRequestDto request = createDto("PROD-001", "Elden Ring", 69800, 69800, 0, null);
        given(igdbApiClient.searchGame(any())).willReturn(null); // IGDB 검색 결과 없음 처리

        // when
        catalogService.upsertGameData(request);

        // then
        // 1. Game 저장 확인
        Optional<Game> savedGame = gameRepository.findByPsStoreId("PROD-001");
        assertThat(savedGame).isPresent();
        assertThat(savedGame.get().getName()).isEqualTo("Elden Ring");

        // 2. PriceHistory 초기값 저장 확인
        List<GamePriceHistory> histories = priceHistoryRepository.findAllByGameIdOrderByRecordedAtAsc(savedGame.get().getId());
        assertThat(histories).hasSize(1);
        assertThat(histories.get(0).getPrice()).isEqualTo(69800);
    }

    @Test
    @DisplayName("가격이 하락하면 새로운 이력이 저장되고 알림 이벤트가 발행되어야 한다.")
    void upsert_PriceDrop() {
        // given
        // 1. 기존 데이터 세팅 (10,000원)
        CollectRequestDto initialData = createDto("PROD-002", "Cyberpunk", 10000, 10000, 0, null);
        catalogService.upsertGameData(initialData);

        em.flush();
        em.clear();

        // 2. 새로운 데이터 (5,000원, 50% 할인)
        CollectRequestDto newData = createDto("PROD-002", "Cyberpunk", 10000, 5000, 50, LocalDate.now().plusDays(7));

        // when
        catalogService.upsertGameData(newData);

        // then
        Game game = gameRepository.findByPsStoreId("PROD-002").orElseThrow();
        List<GamePriceHistory> histories = priceHistoryRepository.findAllByGameIdOrderByRecordedAtAsc(game.getId());

        // 1. 이력이 2개가 되었는지 확인
        assertThat(histories).hasSize(2);
        assertThat(histories.get(1).getPrice()).isEqualTo(5000);
        assertThat(histories.get(1).getDiscountRate()).isEqualTo(50);

        // 2. 이벤트가 발행되었는지 확인 (verify)
        verify(gamePriceChangedListener, timeout(1000).times(1))
                .handlePriceChange(any(GamePriceChangedEvent.class));
    }

    // --- [테스트 시나리오 3: 변동 없음 (Smart Upsert)] ---
    @Test
    @DisplayName("가격과 조건이 동일하면 DB에 중복 저장하지 않아야 한다.")
    void upsert_NoChange() {
        // given
        CollectRequestDto initialData = createDto("PROD-003", "Dave the Diver", 24000, 24000, 0, null);
        catalogService.upsertGameData(initialData); // 최초 저장

        // 동일한 데이터로 다시 요청
        CollectRequestDto sameData = createDto("PROD-003", "Dave the Diver", 24000, 24000, 0, null);

        // when
        catalogService.upsertGameData(sameData);

        // then
        Game game = gameRepository.findByPsStoreId("PROD-003").orElseThrow();
        List<GamePriceHistory> histories = priceHistoryRepository.findAllByGameIdOrderByRecordedAtAsc(game.getId());

        // 이력이 여전히 1개여야 함
        assertThat(histories).hasSize(1);
    }

    // --- [테스트 시나리오 4: 세일 종료일 변경] ---
    @Test
    @DisplayName("가격은 같아도 세일 종료일이 다르면 새로운 프로모션으로 간주하여 저장해야 한다.")
    void upsert_SaleEndDateChange() {
        // given
        LocalDate date1 = LocalDate.of(2025, 1, 1);
        LocalDate date2 = LocalDate.of(2025, 2, 1);

        CollectRequestDto data1 = createDto("PROD-004", "GTA V", 15000, 15000, 0, date1);
        catalogService.upsertGameData(data1);

        CollectRequestDto data2 = createDto("PROD-004", "GTA V", 15000, 15000,0, date2); // 날짜만 변경

        // when
        catalogService.upsertGameData(data2);

        // then
        Game game = gameRepository.findByPsStoreId("PROD-004").orElseThrow();
        List<GamePriceHistory> histories = priceHistoryRepository.findAllByGameIdOrderByRecordedAtAsc(game.getId());

        assertThat(histories).hasSize(2); // 날짜가 다르므로 저장됨
        verify(gamePriceChangedListener, never()).handlePriceChange(any()); // 가격은 안 떨어졌으므로 이벤트 X
    }

    // --- [테스트 시나리오 5: 방어 로직 (0원 데이터)] ---
    @Test
    @DisplayName("가격이 0원인 비정상 데이터가 들어오면 저장을 무시해야 한다.")
    void upsert_GuardClause_ZeroPrice() {
        // given
        CollectRequestDto invalidData = createDto("PROD-005", "Error Game", 0, 0, 0, null);

        // when
        catalogService.upsertGameData(invalidData);

        // then
        Optional<Game> game = gameRepository.findByPsStoreId("PROD-005");
        assertThat(game).isEmpty(); // 아예 생성조차 안 되어야 함 (또는 이력 저장 스킵)
    }

    // --- [Helper Method for DTO] ---
    // DTO에 @Builder나 생성자가 없다면 본인 코드에 맞게 수정 필요
    private CollectRequestDto createDto(String id, String title, int originalPrice, int currentPrice, int discount, LocalDate saleEnd) {
        return new CollectRequestDto(
                id,                 // psStoreId
                title,              // title
                title + " (Eng)",   // englishTitle
                "Publisher",        // publisher
                "http://img.com",   // imageUrl
                "Desc",             // description
                originalPrice,        // originalPrice
                currentPrice,         // currentPrice
                discount,          // discountRate
                saleEnd,           // saleEndDate
                "Action,RPG",       // genreIds
                LocalDate.of(2026,1,1), // releaseDate
                false,              // isPlusExclusive
                false,               // inCatalog
                List.of("PS5")     // platforms
        );
    }
}
