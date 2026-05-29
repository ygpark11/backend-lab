package com.pstracker.catalog_service.catalog.service;

import com.pstracker.catalog_service.catalog.dto.GameDetailResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * GameScouterService 단위 테스트.
 *
 * <p>히스토리 구조: 가격이 변동할 때만 레코드 추가 (이벤트 기반)
 * - discountRate > 0 레코드: 정가→할인 전환 (또는 첫 수집 시 이미 할인 중)
 * - discountRate = 0 레코드: 할인→정가 복귀
 *
 * <p>날짜는 모두 LocalDate.now() 기준 상대값으로 계산해 시간 흐름에도 안정적으로 동작합니다.
 */
class GameScouterServiceTest {

    private final GameScouterService sut = new GameScouterService();

    private static final LocalDate TODAY = LocalDate.now();
    private static final int OP = 69_900; // originalPrice 기본값

    // ── 히스토리 레코드 생성 헬퍼 ──────────────────────────────
    private static GameDetailResponse.PriceHistoryDto full(LocalDate date) {
        return new GameDetailResponse.PriceHistoryDto(date, OP, 0, null);
    }

    private static GameDetailResponse.PriceHistoryDto sale(LocalDate date, int price, int rate) {
        return new GameDetailResponse.PriceHistoryDto(date, price, rate, null);
    }

    /** originalPrice의 p% 할인된 가격 */
    private static int discountedPrice(double discountPct) {
        return (int) (OP * (1 - discountPct / 100));
    }

    // ═══════════════════════════════════════════════════════════
    // Guard: 필수 데이터 없음
    // ═══════════════════════════════════════════════════════════
    @Nested
    @DisplayName("Guard: 필수 데이터 누락")
    class GuardTests {

        @Test
        @DisplayName("originalPrice = null → 등급 외")
        void null_originalPrice() {
            var r = sut.calculateDefenseTier(null, OP, null, false, TODAY.minusMonths(12),
                    List.of(full(TODAY.minusMonths(1))));
            assertThat(r[0]).isEqualTo("등급 외");
        }

        @Test
        @DisplayName("originalPrice = 0 → 등급 외")
        void zero_originalPrice() {
            var r = sut.calculateDefenseTier(0, OP, null, false, TODAY.minusMonths(12),
                    List.of(full(TODAY.minusMonths(1))));
            assertThat(r[0]).isEqualTo("등급 외");
        }

        @Test
        @DisplayName("history = null → 등급 외")
        void null_history() {
            var r = sut.calculateDefenseTier(OP, OP, null, false, TODAY.minusMonths(12), null);
            assertThat(r[0]).isEqualTo("등급 외");
        }

        @Test
        @DisplayName("history = empty → 등급 외")
        void empty_history() {
            var r = sut.calculateDefenseTier(OP, OP, null, false, TODAY.minusMonths(12), List.of());
            assertThat(r[0]).isEqualTo("등급 외");
        }
    }

    // ═══════════════════════════════════════════════════════════
    // Layer 1: 신작 구간 (출시 6개월 미만)
    // ═══════════════════════════════════════════════════════════
    @Nested
    @DisplayName("Layer 1: 신작 구간 (출시 6개월 미만)")
    class NewGameTests {

        @Test
        @DisplayName("출시 3개월, 할인 이력 없음, 정가 → N급 신작 / 추측성 문구 없음")
        void no_discount_history_no_sale() {
            var r = sut.calculateDefenseTier(
                    OP, OP, null, false,
                    TODAY.minusMonths(3),
                    List.of(full(TODAY.minusMonths(3))));

            assertThat(r[0]).isEqualTo("N급 신작");
            // 데이터 기반이 아닌 추측성 문구가 없어야 함
            assertThat(r[1])
                    .doesNotContain("통상")
                    .doesNotContain("보통")
                    .doesNotContain("대개")
                    .contains("3개월차")
                    .contains("아직 할인 신호가 잡힌 적 없습니다");
        }

        @Test
        @DisplayName("출시 5개월 → 신작 구간 (경계값: 5 < 6)")
        void exactly_5_months_is_new_game() {
            var r = sut.calculateDefenseTier(
                    OP, OP, null, false,
                    TODAY.minusMonths(5),
                    List.of(full(TODAY.minusMonths(5))));

            assertThat(r[0]).isEqualTo("N급 신작");
        }

        @Test
        @DisplayName("출시 6개월 → 신작 구간 이탈 (경계값: 6 >= 6)")
        void exactly_6_months_exits_new_game() {
            var r = sut.calculateDefenseTier(
                    OP, OP, null, false,
                    TODAY.minusMonths(6),
                    List.of(full(TODAY.minusMonths(6))));

            assertThat(r[0]).isNotIn("N급 신작", "신작 첫 할인");
        }

        @Test
        @DisplayName("출시 3개월, 현재 첫 할인 중 → 신작 첫 할인")
        void currently_on_sale_returns_신작_첫_할인() {
            int salePrice = discountedPrice(15);
            var r = sut.calculateDefenseTier(
                    OP, salePrice, salePrice, false,
                    TODAY.minusMonths(3),
                    List.of(
                            full(TODAY.minusMonths(3)),
                            sale(TODAY.minusDays(2), salePrice, 15)));

            assertThat(r[0]).isEqualTo("신작 첫 할인");
            assertThat(r[1]).contains("3개월만에").contains("15%");
        }

        @Test
        @DisplayName("신작, 첫 할인 + PS Plus 전용 → 신작 첫 할인 (PS Plus 전용 명시)")
        void new_game_plus_exclusive_sale() {
            int salePrice = discountedPrice(15);
            var r = sut.calculateDefenseTier(
                    OP, salePrice, salePrice, true,
                    TODAY.minusMonths(3),
                    List.of(
                            full(TODAY.minusMonths(3)),
                            sale(TODAY.minusDays(2), salePrice, 15)));

            assertThat(r[0]).isEqualTo("신작 첫 할인");
            assertThat(r[1]).contains("PS Plus 전용");
        }

        @Test
        @DisplayName("신작, 과거 할인 이력 있음 + 현재 정가 복귀 → N급 신작")
        void new_game_past_discount_now_full_price() {
            int salePrice = discountedPrice(15);
            var r = sut.calculateDefenseTier(
                    OP, OP, salePrice, false,
                    TODAY.minusMonths(4),
                    List.of(
                            full(TODAY.minusMonths(4)),             // 첫 수집: 정가
                            sale(TODAY.minusMonths(1), salePrice, 15), // 할인 전환
                            full(TODAY.minusDays(5))));             // 정가 복귀

            assertThat(r[0]).isEqualTo("N급 신작");
            assertThat(r[1]).contains("현재 정가");
        }

        @Test
        @DisplayName("원래 버그 재현: 신작 첫 할인인데 N급 신작으로 잘못 표시되던 케이스")
        void regression_new_game_on_first_sale_was_wrongly_N_grade() {
            // 버그: discountCount <= 1 조건이 현재 할인 중인 게임(discountCount=1)을
            // N급 신작으로 잘못 분류하던 문제 (수정 전 코드의 동작)
            int salePrice = discountedPrice(17);
            var r = sut.calculateDefenseTier(
                    OP, salePrice, salePrice, false,
                    TODAY.minusMonths(3),
                    List.of(
                            full(TODAY.minusMonths(3)),
                            sale(TODAY.minusDays(2), salePrice, 17)));

            assertThat(r[0]).isEqualTo("신작 첫 할인"); // 수정 후 올바른 결과
            assertThat(r[0]).isNotEqualTo("N급 신작");  // 수정 전 잘못된 결과
        }
    }

    // ═══════════════════════════════════════════════════════════
    // Layer 2: 관측 중 (데이터 부족)
    // ═══════════════════════════════════════════════════════════
    @Nested
    @DisplayName("Layer 2: 관측 중 (데이터 부족)")
    class ObservingTests {

        @Test
        @DisplayName("추적 2개월, 할인 없음 → 관측 중")
        void short_tracked_no_discount() {
            var r = sut.calculateDefenseTier(
                    OP, OP, null, false,
                    TODAY.minusMonths(10),
                    List.of(full(TODAY.minusMonths(2))));

            assertThat(r[0]).isEqualTo("관측 중");
        }

        @Test
        @DisplayName("첫 수집이 할인가 + 추적 2개월 + discountCount=1 → 관측 중 (패턴 불명)")
        void first_collected_at_discount_short_tracked_single_record() {
            // 이벤트 기반: 첫 레코드가 할인가 = 수집 이전부터 세일 진행 중
            // → 세일 시작 시점 불명, 정가 이력 없음 → 패턴 판단 불가
            int salePrice = discountedPrice(30);
            var r = sut.calculateDefenseTier(
                    OP, salePrice, salePrice, false,
                    TODAY.minusMonths(12),
                    List.of(sale(TODAY.minusMonths(2), salePrice, 30)));

            assertThat(r[0]).isEqualTo("관측 중");
        }

        @Test
        @DisplayName("첫 수집이 할인가 + 추적 4개월+ + discountCount=1 → Layer 4로 진행")
        void first_collected_at_discount_long_tracked_goes_to_layer4() {
            // 추적 기간이 충분하면(>= 3개월) 관측 중이 아닌 방어도 판정으로 진행
            int salePrice = discountedPrice(30);
            var r = sut.calculateDefenseTier(
                    OP, OP, salePrice, false,
                    TODAY.minusMonths(18),
                    List.of(
                            sale(TODAY.minusMonths(4), salePrice, 30), // 첫 수집: 할인가
                            full(TODAY.minusMonths(2))));              // 정가 복귀

            assertThat(r[0]).isNotIn("관측 중", "N급 신작");
        }

        @Test
        @DisplayName("첫 수집이 정가 + 추적 2개월 + 이후 할인 1건 → 관측 중 아님 (신뢰 가능 데이터)")
        void first_full_price_short_tracked_with_one_discount_not_관측중() {
            // 첫 수집이 정가이고 이후 할인이 발생했다면 → 신뢰할 수 있는 전환 이벤트
            int salePrice = discountedPrice(30);
            var r = sut.calculateDefenseTier(
                    OP, salePrice, salePrice, false,
                    TODAY.minusMonths(12),
                    List.of(
                            full(TODAY.minusMonths(2)),
                            sale(TODAY.minusDays(5), salePrice, 30)));

            assertThat(r[0]).isNotEqualTo("관측 중");
        }

        @Test
        @DisplayName("추적 3개월+ + 할인 없음 → S급 철벽 (관측 중 아님)")
        void long_tracked_no_discount_is_iron_wall_not_관측중() {
            var r = sut.calculateDefenseTier(
                    OP, OP, null, false,
                    TODAY.minusMonths(18),
                    List.of(full(TODAY.minusMonths(12))));

            assertThat(r[0]).isEqualTo("S급 철벽");
        }
    }

    // ═══════════════════════════════════════════════════════════
    // Layer 3: S급 철벽
    // ═══════════════════════════════════════════════════════════
    @Nested
    @DisplayName("Layer 3: S급 철벽")
    class IronWallTests {

        @Test
        @DisplayName("12개월 추적, 할인 없음 → S급 철벽 + 추적 기간 포함")
        void long_tracked_no_discount() {
            var r = sut.calculateDefenseTier(
                    OP, OP, null, false,
                    TODAY.minusMonths(24),
                    List.of(full(TODAY.minusMonths(12))));

            assertThat(r[0]).isEqualTo("S급 철벽");
            assertThat(r[1]).contains("12개월");
        }
    }

    // ═══════════════════════════════════════════════════════════
    // Layer 4: 방어도 등급 (A / B / C / D)
    // ═══════════════════════════════════════════════════════════
    @Nested
    @DisplayName("Layer 4: 방어도 등급")
    class DefenseTierTests {

        // ── A급 방패 (역대 최대 ≤ 25%) ─────────────────────────
        @Nested
        @DisplayName("A급 방패 (역대 최대 ≤ 25%)")
        class ATier {

            @Test
            @DisplayName("최대 20% 할인, 현재 정가 → A급 방패 / 정가 표시")
            void full_price() {
                int lowest = discountedPrice(20);
                var r = sut.calculateDefenseTier(
                        OP, OP, lowest, false,
                        TODAY.minusMonths(18),
                        List.of(
                                full(TODAY.minusMonths(12)),
                                sale(TODAY.minusMonths(6), lowest, 20),
                                full(TODAY.minusMonths(4))));

                assertThat(r[0]).isEqualTo("A급 방패");
                assertThat(r[1]).contains("역대 최대 20%").contains("현재 정가");
            }

            @Test
            @DisplayName("최대 25% 경계값 → A급 방패")
            void boundary_25_pct() {
                // 10_000원 기준: 25% off = 7_500 → maxRate 정확히 25.0
                var r = sut.calculateDefenseTier(
                        10_000, 10_000, 7_500, false,
                        TODAY.minusMonths(18),
                        List.of(
                                full(TODAY.minusMonths(12)),
                                sale(TODAY.minusMonths(6), 7_500, 25),
                                full(TODAY.minusMonths(4))));

                assertThat(r[0]).isEqualTo("A급 방패");
            }

            @Test
            @DisplayName("현재 역대 최저가 → 역대 최저가 구간 메시지")
            void at_historic_low() {
                int lowest = discountedPrice(20);
                var r = sut.calculateDefenseTier(
                        OP, lowest, lowest, false,
                        TODAY.minusMonths(18),
                        List.of(
                                full(TODAY.minusMonths(12)),
                                sale(TODAY.minusDays(3), lowest, 20)));

                assertThat(r[0]).isEqualTo("A급 방패");
                assertThat(r[1]).contains("역대 최저가 구간");
            }

            @Test
            @DisplayName("현재 할인 중이지만 역대 최저가 아님 → 역대 최저까지 갭 표시")
            void on_sale_not_at_historic_low() {
                int lowest = discountedPrice(20);  // 역대 최저 (20% off)
                int current = discountedPrice(10); // 현재 (10% off)
                var r = sut.calculateDefenseTier(
                        OP, current, lowest, false,
                        TODAY.minusMonths(18),
                        List.of(
                                full(TODAY.minusMonths(12)),
                                sale(TODAY.minusMonths(6), lowest, 20),
                                full(TODAY.minusMonths(4)),
                                sale(TODAY.minusDays(3), current, 10)));

                assertThat(r[0]).isEqualTo("A급 방패");
                assertThat(r[1]).contains("역대 최저(20%)").contains("10%");
            }
        }

        // ── B급 일반 (역대 최대 26~40%) ───────────────────────
        @Nested
        @DisplayName("B급 일반 (역대 최대 26~40%)")
        class BTier {

            @Test
            @DisplayName("최대 35% 할인 → B급 일반")
            void max_35_pct() {
                int lowest = discountedPrice(35);
                var r = sut.calculateDefenseTier(
                        OP, OP, lowest, false,
                        TODAY.minusMonths(18),
                        List.of(
                                full(TODAY.minusMonths(12)),
                                sale(TODAY.minusMonths(6), lowest, 35),
                                full(TODAY.minusMonths(4))));

                assertThat(r[0]).isEqualTo("B급 일반");
                assertThat(r[1]).contains("역대 최대 35%");
            }

            @Test
            @DisplayName("최대 40% 경계값 → B급 일반")
            void boundary_40_pct() {
                // 10_000원: 40% off = 6_000 → maxRate 정확히 40.0
                var r = sut.calculateDefenseTier(
                        10_000, 10_000, 6_000, false,
                        TODAY.minusMonths(18),
                        List.of(
                                full(TODAY.minusMonths(12)),
                                sale(TODAY.minusMonths(6), 6_000, 40),
                                full(TODAY.minusMonths(4))));

                assertThat(r[0]).isEqualTo("B급 일반");
            }

            @Test
            @DisplayName("현재 역대 최저가 → 역대 최저가 구간 메시지")
            void at_historic_low() {
                int lowest = discountedPrice(40);
                var r = sut.calculateDefenseTier(
                        OP, lowest, lowest, false,
                        TODAY.minusMonths(18),
                        List.of(
                                full(TODAY.minusMonths(12)),
                                sale(TODAY.minusDays(3), lowest, 40)));

                assertThat(r[0]).isEqualTo("B급 일반");
                assertThat(r[1]).contains("역대 최저가 구간");
            }
        }

        // ── C급 솜방패 (역대 최대 41~59%) ────────────────────
        @Nested
        @DisplayName("C급 솜방패 (역대 최대 41~59%)")
        class CTier {

            @Test
            @DisplayName("최대 50% 할인 → C급 솜방패")
            void max_50_pct() {
                int lowest = discountedPrice(50);
                var r = sut.calculateDefenseTier(
                        OP, OP, lowest, false,
                        TODAY.minusMonths(18),
                        List.of(
                                full(TODAY.minusMonths(12)),
                                sale(TODAY.minusMonths(6), lowest, 50),
                                full(TODAY.minusMonths(4))));

                assertThat(r[0]).isEqualTo("C급 솜방패");
            }

            @Test
            @DisplayName("최대 59% → C급 솜방패 (60% 미만 경계)")
            void just_below_d_tier() {
                // 10_000원: 59% off = 4_100 → maxRate ≈ 59%
                var r = sut.calculateDefenseTier(
                        10_000, 10_000, 4_100, false,
                        TODAY.minusMonths(18),
                        List.of(
                                full(TODAY.minusMonths(12)),
                                sale(TODAY.minusMonths(6), 4_100, 59),
                                full(TODAY.minusMonths(4))));

                assertThat(r[0]).isEqualTo("C급 솜방패");
            }
        }

        // ── D급 낙하산 (역대 최대 60% 이상) ──────────────────
        @Nested
        @DisplayName("D급 낙하산 (역대 최대 60% 이상)")
        class DTier {

            @Test
            @DisplayName("정확히 60% → D급 낙하산 (경계값)")
            void boundary_60_pct() {
                // 10_000원: 60% off = 4_000 → maxRate = 60.0
                var r = sut.calculateDefenseTier(
                        10_000, 10_000, 4_000, false,
                        TODAY.minusMonths(18),
                        List.of(
                                full(TODAY.minusMonths(12)),
                                sale(TODAY.minusMonths(6), 4_000, 60),
                                full(TODAY.minusMonths(4))));

                assertThat(r[0]).isEqualTo("D급 낙하산");
            }

            @Test
            @DisplayName("최대 75% → D급 낙하산")
            void max_75_pct() {
                int lowest = discountedPrice(75);
                var r = sut.calculateDefenseTier(
                        OP, OP, lowest, false,
                        TODAY.minusMonths(18),
                        List.of(
                                full(TODAY.minusMonths(12)),
                                sale(TODAY.minusMonths(6), lowest, 75),
                                full(TODAY.minusMonths(4))));

                assertThat(r[0]).isEqualTo("D급 낙하산");
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 이벤트 기반 히스토리 케이스 검증
    // (정가→할인→정가 전환, 첫 수집 할인가 등)
    // ═══════════════════════════════════════════════════════════
    @Nested
    @DisplayName("이벤트 기반 히스토리 케이스")
    class EventBasedHistoryTests {

        @Test
        @DisplayName("정가→할인→정가: 할인 횟수 1로 정확히 카운트")
        void full_to_sale_to_full_counts_one_discount() {
            int lowest = discountedPrice(30);
            var r = sut.calculateDefenseTier(
                    OP, OP, lowest, false,
                    TODAY.minusMonths(18),
                    List.of(
                            full(TODAY.minusMonths(12)),              // 첫 수집: 정가
                            sale(TODAY.minusMonths(9), lowest, 30),  // 정가→할인 전환
                            full(TODAY.minusMonths(6))));             // 할인→정가 복귀

            assertThat(r[1]).contains("1번 할인");
        }

        @Test
        @DisplayName("정가→할인→정가→할인→정가: 할인 횟수 2로 정확히 카운트")
        void two_separate_sales_counted_correctly() {
            int lowest = discountedPrice(30);
            var r = sut.calculateDefenseTier(
                    OP, OP, lowest, false,
                    TODAY.minusMonths(24),
                    List.of(
                            full(TODAY.minusMonths(12)),              // 첫 수집: 정가
                            sale(TODAY.minusMonths(9), lowest, 30),  // 1차 할인 전환
                            full(TODAY.minusMonths(7)),               // 1차 정가 복귀
                            sale(TODAY.minusMonths(4), lowest, 30),  // 2차 할인 전환
                            full(TODAY.minusMonths(2))));             // 2차 정가 복귀

            assertThat(r[1]).contains("2번 할인");
        }

        @Test
        @DisplayName("첫 수집이 할인가 → 그 이후 새 할인 1건: 콜드 스타트 경고 포함")
        void cold_start_note_included_when_first_was_discounted() {
            int lowest = discountedPrice(35);
            LocalDate trackStart = TODAY.minusMonths(6);

            var r = sut.calculateDefenseTier(
                    OP, OP, lowest, false,
                    TODAY.minusMonths(18),
                    List.of(
                            sale(trackStart, lowest, 35),            // 첫 수집: 이미 할인 중
                            full(TODAY.minusMonths(4)),              // 정가 복귀
                            sale(TODAY.minusMonths(1), lowest, 35),  // 새 할인 전환
                            full(TODAY)));                           // 다시 정가

            // 콜드 스타트 경고가 메시지에 포함되어야 함
            assertThat(r[1]).contains("이전 이력 미반영");
        }

        @Test
        @DisplayName("첫 수집이 정가이면 콜드 스타트 경고 없음")
        void no_cold_start_note_when_first_was_full_price() {
            int lowest = discountedPrice(30);
            var r = sut.calculateDefenseTier(
                    OP, OP, lowest, false,
                    TODAY.minusMonths(18),
                    List.of(
                            full(TODAY.minusMonths(8)),
                            sale(TODAY.minusMonths(4), lowest, 30),
                            full(TODAY.minusMonths(2))));

            assertThat(r[1]).doesNotContain("수집 시작").doesNotContain("이전 이력");
        }

        @Test
        @DisplayName("첫 수집이 할인가 + 이후 새 할인 있음: 빈도 계산에서 첫 건 보수적 제외")
        void frequency_adjusts_for_cold_start() {
            // 6개월 추적, discountCount=2 (첫 수집 할인가 + 새 할인 1건)
            // countForFreq = max(1, 2-1) = 1 → monthsPerDiscount = 6 → "약 6개월에 1회"
            int lowest = discountedPrice(30);
            LocalDate trackStart = TODAY.minusMonths(6);

            var r = sut.calculateDefenseTier(
                    OP, OP, lowest, false,
                    TODAY.minusMonths(18),
                    List.of(
                            sale(trackStart, lowest, 30),           // 첫 수집: 할인가
                            full(TODAY.minusMonths(4)),
                            sale(TODAY.minusMonths(1), lowest, 30), // 새 할인
                            full(TODAY)));

            // 보수적 계산: 6개월 / 1 = 6 → "약 6개월에 1회"
            assertThat(r[1]).contains("6개월에 1회");
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 할인 빈도 계산
    // ═══════════════════════════════════════════════════════════
    @Nested
    @DisplayName("할인 빈도 계산")
    class FrequencyTests {

        @Test
        @DisplayName("12개월 추적, 1번 할인 → 연 1회 미만")
        void once_in_12_months_is_rare() {
            int lowest = discountedPrice(30);
            var r = sut.calculateDefenseTier(
                    OP, OP, lowest, false,
                    TODAY.minusMonths(24),
                    List.of(
                            full(TODAY.minusMonths(12)),
                            sale(TODAY.minusMonths(6), lowest, 30),
                            full(TODAY.minusMonths(4))));

            assertThat(r[1]).contains("연 1회 미만");
        }

        @Test
        @DisplayName("12개월 추적, 2번 할인 → 약 6개월에 1회")
        void twice_in_12_months_is_every_6_months() {
            int lowest = discountedPrice(30);
            var r = sut.calculateDefenseTier(
                    OP, OP, lowest, false,
                    TODAY.minusMonths(24),
                    List.of(
                            full(TODAY.minusMonths(12)),
                            sale(TODAY.minusMonths(9), lowest, 30),
                            full(TODAY.minusMonths(7)),
                            sale(TODAY.minusMonths(3), lowest, 30),
                            full(TODAY.minusMonths(1))));

            assertThat(r[1]).contains("6개월에 1회");
        }

        @Test
        @DisplayName("6개월 추적, 3번 할인 → 약 2개월에 1회")
        void three_in_6_months_is_every_2_months() {
            int lowest = discountedPrice(30);
            var r = sut.calculateDefenseTier(
                    OP, OP, lowest, false,
                    TODAY.minusMonths(18),
                    List.of(
                            full(TODAY.minusMonths(6)),
                            sale(TODAY.minusMonths(5), lowest, 30),
                            full(TODAY.minusMonths(4)),
                            sale(TODAY.minusMonths(3), lowest, 30),
                            full(TODAY.minusMonths(2)),
                            sale(TODAY.minusMonths(1), lowest, 30),
                            full(TODAY)));

            assertThat(r[1]).contains("2개월에 1회");
        }

        @Test
        @DisplayName("4개월 추적, 3번 할인 → 자주 세일하는 편 (2개월 미만)")
        void frequent_sales_under_2_months() {
            int lowest = discountedPrice(30);
            var r = sut.calculateDefenseTier(
                    OP, OP, lowest, false,
                    TODAY.minusMonths(18),
                    List.of(
                            full(TODAY.minusMonths(4)),
                            sale(TODAY.minusMonths(3), lowest, 30),
                            full(TODAY.minusMonths(3).plusWeeks(2)),
                            sale(TODAY.minusMonths(2), lowest, 30),
                            full(TODAY.minusMonths(2).plusWeeks(2)),
                            sale(TODAY.minusMonths(1), lowest, 30),
                            full(TODAY)));

            assertThat(r[1]).contains("자주 세일하는 편");
        }
    }

    // ═══════════════════════════════════════════════════════════
    // PS Plus 전용 할인 케이스
    // ═══════════════════════════════════════════════════════════
    @Nested
    @DisplayName("PS Plus 전용 할인")
    class PlusExclusiveTests {

        @Test
        @DisplayName("역대 최저가 + PS Plus 전용 → PS Plus 전용 명시 + 역대 최저가 구간")
        void plus_exclusive_at_historic_low() {
            int lowest = discountedPrice(30);
            var r = sut.calculateDefenseTier(
                    OP, lowest, lowest, true,
                    TODAY.minusMonths(18),
                    List.of(
                            full(TODAY.minusMonths(8)),
                            sale(TODAY.minusDays(3), lowest, 30)));

            assertThat(r[1]).contains("PS Plus 전용").contains("역대 최저가 구간");
        }

        @Test
        @DisplayName("할인 중 (역대 최저가 아님) + PS Plus 전용 → PS Plus 전용 + 갭 표시")
        void plus_exclusive_not_at_historic_low() {
            int lowest = discountedPrice(35);  // 역대 최저 35%
            int current = discountedPrice(20); // 현재 20%
            var r = sut.calculateDefenseTier(
                    OP, current, lowest, true,
                    TODAY.minusMonths(18),
                    List.of(
                            full(TODAY.minusMonths(8)),
                            sale(TODAY.minusMonths(6), lowest, 35),
                            full(TODAY.minusMonths(4)),
                            sale(TODAY.minusDays(3), current, 20)));

            assertThat(r[1]).contains("PS Plus 전용").contains("역대 최저(35%)");
        }

        @Test
        @DisplayName("정가일 때 isPlusExclusive=true여도 메시지에 PS Plus 언급 없음")
        void plus_exclusive_flag_ignored_when_not_on_sale() {
            int lowest = discountedPrice(30);
            var r = sut.calculateDefenseTier(
                    OP, OP, lowest, true, // isPlusExclusive=true이지만 현재 정가
                    TODAY.minusMonths(18),
                    List.of(
                            full(TODAY.minusMonths(8)),
                            sale(TODAY.minusMonths(4), lowest, 30),
                            full(TODAY.minusMonths(2))));

            // 현재 정가일 때는 PS Plus 전용 언급 없어야 함 (성급한 판단 방지)
            assertThat(r[1]).doesNotContain("PS Plus 전용");
            assertThat(r[1]).contains("현재 정가");
        }
    }

    // ═══════════════════════════════════════════════════════════
    // lowestPrice 폴백 (history에서 재계산)
    // ═══════════════════════════════════════════════════════════
    @Nested
    @DisplayName("lowestPrice 폴백")
    class LowestPriceFallbackTests {

        @Test
        @DisplayName("lowestPrice=null이어도 history 최저가로 대체 계산 → S급 철벽 아님")
        void null_lowest_computed_from_history() {
            int historicLow = discountedPrice(30);
            var r = sut.calculateDefenseTier(
                    OP, OP, null, false, // lowestPrice = null
                    TODAY.minusMonths(18),
                    List.of(
                            full(TODAY.minusMonths(8)),
                            sale(TODAY.minusMonths(4), historicLow, 30), // 30% 할인 이력
                            full(TODAY.minusMonths(2))));

            // null이어도 history에서 30% 최저가를 읽어 B급으로 분류 (S급 철벽이 아님)
            assertThat(r[0]).isNotEqualTo("S급 철벽");
            assertThat(r[0]).isEqualTo("B급 일반");
        }

        @Test
        @DisplayName("lowestPrice=0이어도 history 최저가로 대체 계산")
        void zero_lowest_computed_from_history() {
            int historicLow = discountedPrice(50);
            var r = sut.calculateDefenseTier(
                    OP, OP, 0, false, // lowestPrice = 0
                    TODAY.minusMonths(18),
                    List.of(
                            full(TODAY.minusMonths(8)),
                            sale(TODAY.minusMonths(4), historicLow, 50),
                            full(TODAY.minusMonths(2))));

            assertThat(r[0]).isEqualTo("C급 솜방패");
        }

        @Test
        @DisplayName("lowestPrice >= originalPrice면 무효 처리 → history로 대체")
        void lowest_above_original_treated_as_invalid() {
            int historicLow = discountedPrice(40);
            var r = sut.calculateDefenseTier(
                    OP, OP, OP + 1000, false, // lowestPrice > originalPrice (이상 데이터)
                    TODAY.minusMonths(18),
                    List.of(
                            full(TODAY.minusMonths(8)),
                            sale(TODAY.minusMonths(4), historicLow, 40),
                            full(TODAY.minusMonths(2))));

            // history에서 40% 최저가 계산 → B급 일반
            assertThat(r[0]).isEqualTo("B급 일반");
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 메시지 구조 검증 (모바일 truncate 고려: 역사 요약이 앞에 위치)
    // ═══════════════════════════════════════════════════════════
    @Nested
    @DisplayName("메시지 구조")
    class MessageStructureTests {

        @Test
        @DisplayName("Layer 4 메시지는 '추적' 정보로 시작 (모바일 truncate 고려)")
        void message_starts_with_history_summary() {
            int lowest = discountedPrice(30);
            var r = sut.calculateDefenseTier(
                    OP, OP, lowest, false,
                    TODAY.minusMonths(18),
                    List.of(
                            full(TODAY.minusMonths(12)),
                            sale(TODAY.minusMonths(6), lowest, 30),
                            full(TODAY.minusMonths(4))));

            // 역사 패턴 요약이 메시지 앞부분에 위치
            assertThat(r[1]).startsWith("12개월 추적");
        }

        @Test
        @DisplayName("추측성 문구가 없음을 검증 (전체 등급 공통)")
        void no_speculative_phrases_in_any_tier() {
            List<String> speculative = List.of("통상", "보통", "대개", "일반적으로", "대부분");

            // N급 신작
            var newGame = sut.calculateDefenseTier(
                    OP, OP, null, false, TODAY.minusMonths(2),
                    List.of(full(TODAY.minusMonths(2))));

            // A급 방패
            int lowest = discountedPrice(20);
            var aGrade = sut.calculateDefenseTier(
                    OP, OP, lowest, false, TODAY.minusMonths(18),
                    List.of(full(TODAY.minusMonths(12)), sale(TODAY.minusMonths(6), lowest, 20), full(TODAY.minusMonths(4))));

            for (String phrase : speculative) {
                assertThat(newGame[1]).as("N급 신작 메시지에 추측성 문구 없어야 함").doesNotContain(phrase);
                assertThat(aGrade[1]).as("A급 방패 메시지에 추측성 문구 없어야 함").doesNotContain(phrase);
            }
        }
    }
}
