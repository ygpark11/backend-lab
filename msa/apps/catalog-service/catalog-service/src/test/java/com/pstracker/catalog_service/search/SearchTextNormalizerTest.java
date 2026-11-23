package com.pstracker.catalog_service.search;

import com.pstracker.catalog_service.catalog.domain.Game;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SearchTextNormalizerTest {

    @Test
    @DisplayName("cleanTitle: 언어 괄호 및 상표 기호(™, ®, ©)를 제거한다")
    void cleanTitle_removesLanguageTagsAndTrademarks() {
        assertThat(SearchTextNormalizer.cleanTitle(
                "Ghost of Tsushima 디렉터스 컷 (중국어(간체자), 한국어, 태국어, 영어, 일본어, 중국어(번체자))"))
                .isEqualTo("Ghost of Tsushima 디렉터스 컷");

        assertThat(SearchTextNormalizer.cleanTitle("스텔라 블레이드™ 컴플리트 에디션 (한국어판)"))
                .isEqualTo("스텔라 블레이드 컴플리트 에디션");

        assertThat(SearchTextNormalizer.cleanTitle("디아블로® IV - 일반판 (한국어, 영어)"))
                .isEqualTo("디아블로 IV - 일반판");
    }

    @Test
    @DisplayName("tokenizeAndSplitKorNum: 한글과 숫자 경계를 공백으로 분리한다")
    void tokenizeAndSplitKorNum_splitsBoundaries() {
        assertThat(SearchTextNormalizer.tokenizeAndSplitKorNum("파판7리버스")).isEqualTo("파판 7 리버스");
        assertThat(SearchTextNormalizer.tokenizeAndSplitKorNum("위쳐3")).isEqualTo("위쳐 3");
        assertThat(SearchTextNormalizer.tokenizeAndSplitKorNum("배트맨™: 아캄 나이트")).isEqualTo("배트맨 아캄 나이트");
    }

    @Test
    @DisplayName("toQwertyJamo: 한글 쌍자음 오타(싸펑==사펑)와 한영키 실수 양방향을 정규화한다")
    void toQwertyJamo_handlesTyposAndKeyboardToggle() {
        // 싸펑 == 사펑 (동일 ASCII 키열)
        assertThat(SearchTextNormalizer.toQwertyJamo("싸펑"))
                .isEqualTo(SearchTextNormalizer.toQwertyJamo("사펑"))
                .isEqualTo("tkvjd");

        // 한영키 실수 (한글 -> 영타)
        assertThat(SearchTextNormalizer.toQwertyJamo("엘든링")).isEqualTo("dpfemsfld");
        assertThat(SearchTextNormalizer.toQwertyJamo("파판")).isEqualTo("vkvks");

        // 한영키 실수 역방향 (영어를 한글 자판으로 잘못 입력: 쵸ㅠㄷ게ㅕㅜㅏ -> cyberpunk)
        assertThat(SearchTextNormalizer.toQwertyJamo("쵸ㅠㄷ게ㅕㅜㅏ")).isEqualTo("cyberpunk");
    }

    @Test
    @DisplayName("toChosungAsciiTokens: 한글 단어에서만 ASCII 초성을 추출하고 영문·숫자만 있는 토큰은 무시한다")
    void toChosungAsciiTokens_extractsKoreanOnly() {
        String yakuza = SearchTextNormalizer.toChosungAsciiTokens("용과 같이8 외전");
        assertThat(yakuza).startsWith(SearchTextNormalizer.queryToChosungAscii("ㅇㄱㄱㅇ8"));

        // 영문/숫자만 있는 제목은 초성 필드를 오염시키지 않아야 함
        assertThat(SearchTextNormalizer.toChosungAsciiTokens("ELDEN RING PS4 PS5")).isEmpty();

        // 고오쓰 별칭 초성('ㄱㅇㅆ')과 일치
        assertThat(SearchTextNormalizer.toChosungAsciiTokens("고오쓰"))
                .isEqualTo(SearchTextNormalizer.queryToChosungAscii("ㄱㅇㅆ"));
    }

    @Test
    @DisplayName("isPureChosungQuery: 순수 초성 및 초성+숫자만 true를 반환한다")
    void isPureChosungQuery_detectsCorrectly() {
        assertThat(SearchTextNormalizer.isPureChosungQuery("ㅇㄱㄱㅇ")).isTrue();
        assertThat(SearchTextNormalizer.isPureChosungQuery("ㅇㄱㄱㅇ8")).isTrue();
        assertThat(SearchTextNormalizer.isPureChosungQuery("ㄱㅇㅆ")).isTrue();
        assertThat(SearchTextNormalizer.isPureChosungQuery("2077")).isFalse();
        assertThat(SearchTextNormalizer.isPureChosungQuery("파판7")).isFalse();
        assertThat(SearchTextNormalizer.isPureChosungQuery("elden")).isFalse();
    }

    @Test
    @DisplayName("GameSearchDocument.from: 영문 원제 게임도 searchKeywords의 초성과 인기도가 정확히 생성된다")
    void gameSearchDocument_buildsDerivedFields() {
        Game game = Game.create(
                "PS-GOT",
                "Ghost of Tsushima 디렉터스 컷 (중국어(간체자), 한국어, 영어)",
                "Ghost of Tsushima DIRECTOR'S CUT",
                "Sony",
                "https://img/got.jpg",
                "desc",
                LocalDate.of(2021, 8, 20)
        );
        ReflectionTestUtils.setField(game, "id", 1L);
        ReflectionTestUtils.setField(game, "bestSellerRank", 10);
        ReflectionTestUtils.setField(game, "mcMetaScore", 87);
        game.updateSearchKeywords(List.of("고스트오브쓰시마", "고오쓰"));

        GameSearchDocument doc = GameSearchDocument.from(game);

        assertThat(doc.id()).isEqualTo(1L);
        assertThat(doc.displayName()).contains("Ghost of Tsushima");
        assertThat(doc.name()).isEqualTo("Ghost of Tsushima 디렉터스 컷");
        assertThat(doc.chosungAscii()).contains(SearchTextNormalizer.queryToChosungAscii("ㄱㅇㅆ"));
        assertThat(doc.qwertyText()).contains("ghost").contains("rhtmxm").contains("rhdhtm");
        assertThat(doc.popularity()).isGreaterThan(700);
    }
}
