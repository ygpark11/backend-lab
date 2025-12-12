package com.pstracker.catalog_service.catalog.repository;

import com.pstracker.catalog_service.catalog.domain.Game;
import com.pstracker.catalog_service.catalog.domain.GamePriceHistory;
import com.pstracker.catalog_service.catalog.dto.GameSearchCondition;
import com.pstracker.catalog_service.catalog.dto.GameSearchResultDto;
import com.pstracker.catalog_service.catalog.config.QueryDslConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(QueryDslConfig.class) // QueryDSL 설정 가져오기
class GameRepositoryTest {

    @Autowired GameRepository gameRepository;
    @Autowired GamePriceHistoryRepository historyRepository;

    @Test
    @DisplayName("검색: 메타 점수 80점 이상이면서 가격이 5만원 이하인 게임 찾기")
    void searchTest() {
        // given (데이터 준비)
        createGameData("P1", "갓 오브 워", 94, 30000); // 타겟
        createGameData("P2", "엘든 링", 96, 64000);   // 가격 비쌈
        createGameData("P3", "똥겜", 30, 10000);     // 점수 낮음

        // when (검색 조건 설정)
        GameSearchCondition condition = new GameSearchCondition();
        condition.setMinMetaScore(80);
        condition.setMaxPrice(50000);

        Page<GameSearchResultDto> result = gameRepository.searchGames(condition, PageRequest.of(0, 10));

        // then (검증)
        List<GameSearchResultDto> content = result.getContent();
        assertThat(content).hasSize(1);
        assertThat(content.get(0).getName()).isEqualTo("갓 오브 워");

        System.out.println("검색된 게임: " + content.get(0).getName());
    }

    private void createGameData(String id, String name, int score, int price) {
        Game game = Game.create(id, name, null, "Sony", "img", "desc");
        game.updateRatings(score, 8.5); // 평점 설정
        gameRepository.save(game);

        GamePriceHistory history = GamePriceHistory.create(
                game, price, price, 0, false, LocalDate.now().plusDays(5)
        );
        historyRepository.save(history);
    }
}