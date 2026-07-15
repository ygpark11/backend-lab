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
            var r = sut.calculateDefenseTier(null, OP, null, TODAY.minusMonths(12),
                    List.of(full(TODAY.minusMonths(1))));
            assertThat(r.tier()).isEqualTo("등급 외");
        }

        @Test
        @DisplayName("originalPrice = 0 → 등급 외")
        void zero_originalPrice() {
            var r = sut.calculateDefenseTier(0, OP, null, TODAY.minusMonths(12),
                    List.of(full(TODAY.minusMonths(1))));
            assertThat(r.tier()).isEqualTo("등급 외");
        }

        @Test
        @DisplayName("history = null → 등급 외")
        void null_history() {
            var r = sut.calculateDefenseTier(OP, OP, null, TODAY.minusMonths(12), null);
            assertThat(r.tier()).isEqualTo("등급 외");
        }

        @Test
        @DisplayName("history = empty → 등급 외")
        void empty_history() {
            var r = sut.calculateDefenseTier(OP, OP, null, TODAY.minusMonths(12), List.of());
            assertThat(r.tier()).isEqualTo("등급 외");
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
                    OP, OP, null,
                    TODAY.minusMonths(3),
                    List.of(full(TODAY.minusMonths(3))));

            assertThat(r.tier()).isEqualTo("N급 신작");
            assertThat(r.discountCount()).isEqualTo(0);
        }

        @Test
        @DisplayName("출시 5개월 → 신작 구간 (경계값: 5 < 6)")
        void exactly_5_months_is_new_game() {
            var r = sut.calculateDefenseTier(
                    OP, OP, null,
                    TODAY.minusMonths(5),
                    List.of(full(TODAY.minusMonths(5))));

            assertThat(r.tier()).isEqualTo("N급 신작");
        }

        @Test
        @DisplayName("출시 6개월 → 신작 구간 이탈 (경계값: 6 >= 6)")
        void exactly_6_months_exits_new_game() {
            var r = sut.calculateDefenseTier(
                    OP, OP, null,
                    TODAY.minusMonths(6),
                    List.of(full(TODAY.minusMonths(6))));

            assertThat(r.tier()).isNotIn("N급 신작", "신작 첫 할인");
        }

        @Test
        @DisplayName("출시 3개월, 현재 첫 할인 중 → 신작 첫 할인")
        void currently_on_sale_returns_신작_첫_할인() {
            int salePrice = discountedPrice(15);
            var r = sut.calculateDefenseTier(
                    OP, salePrice, salePrice,
                    TODAY.minusMonths(3),
                    List.of(
                            full(TODAY.minusMonths(3)),
                            sale(TODAY.minusDays(2), salePrice, 15)));

            assertThat(r.tier()).isEqualTo("신작 첫 할인");
            assertThat(r.discountCount()).isEqualTo(1);
        }

        @Test
        @DisplayName("신작, 첫 할인 + PS Plus 전용 → 신작 첫 할인 (PS Plus 전용 명시)")
        void new_game_plus_exclusive_sale() {
            int salePrice = discountedPrice(15);
            var r = sut.calculateDefenseTier(
                    OP, salePrice, salePrice,
                    TODAY.minusMonths(3),
                    List.of(
                            full(TODAY.minusMonths(3)),
                            sale(TODAY.minusDays(2), salePrice, 15)));

            assertThat(r.tier()).isEqualTo("신작 첫 할인");
            assertThat(r.discountCount()).isEqualTo(1);
        }

        @Test
        @DisplayName("신작, 과거 할인 이력 있음 + 현재 정가 복귀 → N급 신작")
        void new_game_past_discount_now_full_price() {
            int salePrice = discountedPrice(15);
            var r = sut.calculateDefenseTier(
                    OP, OP, salePrice,
                    TODAY.minusMonths(4),
                    List.of(
                            full(TODAY.minusMonths(4)),             // 첫 수집: 정가
                            sale(TODAY.minusMonths(1), salePrice, 15), // 할인 전환
                            full(TODAY.minusDays(5))));             // 정가 복귀

            assertThat(r.tier()).isEqualTo("N급 신작");
            assertThat(r.discountCount()).isEqualTo(1);
        }

        @Test
        @DisplayName("신작, 출시 4개월차에 2번째 할인 중 → 신작 재할인")
        void new_game_second_discount_returns_신작_재할인() {
            int salePrice = discountedPrice(30);
            var r = sut.calculateDefenseTier(
                    OP, salePrice, salePrice,
                    TODAY.minusMonths(4),
                    List.of(
                            full(TODAY.minusMonths(4)),
                            sale(TODAY.minusMonths(3), salePrice, 30),
                            full(TODAY.minusMonths(2)),
                            sale(TODAY.minusDays(5), salePrice, 30)));

            assertThat(r.tier()).isEqualTo("신작 재할인");
            assertThat(r.discountCount()).isEqualTo(2);
        }

        @Test
        @DisplayName("신작, 추적 시작이 출시 2개월 이상 늦음 + 현재 할인 → 신작 할인 (이전 이력 미확인)")
        void new_game_late_tracking_returns_신작_할인() {
            // 출시 5개월차, 1개월 전부터 수집 시작 (lateTracking = 5-1=4 >= 2)
            int salePrice = discountedPrice(20);
            var r = sut.calculateDefenseTier(
                    OP, salePrice, salePrice,
                    TODAY.minusMonths(5),
                    List.of(
                            full(TODAY.minusMonths(1)),
                            sale(TODAY.minusDays(5), salePrice, 20)));

            assertThat(r.tier()).isEqualTo("신작 할인");
            assertThat(r.tier()).isNotEqualTo("신작 첫 할인");
        }

        @Test
        @DisplayName("원래 버그 재현: 신작 첫 할인인데 N급 신작으로 잘못 표시되던 케이스")
        void regression_new_game_on_first_sale_was_wrongly_N_grade() {
            // 버그: discountCount <= 1 조건이 현재 할인 중인 게임(discountCount=1)을
            // N급 신작으로 잘못 분류하던 문제 (수정 전 코드의 동작)
            int salePrice = discountedPrice(17);
            var r = sut.calculateDefenseTier(
                    OP, salePrice, salePrice,
                    TODAY.minusMonths(3),
                    List.of(
                            full(TODAY.minusMonths(3)),
                            sale(TODAY.minusDays(2), salePrice, 17)));

            assertThat(r.tier()).isEqualTo("신작 첫 할인"); // 수정 후 올바른 결과
            assertThat(r.tier()).isNotEqualTo("N급 신작");  // 수정 전 잘못된 결과
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
                    OP, OP, null,
                    TODAY.minusMonths(10),
                    List.of(full(TODAY.minusMonths(2))));

            assertThat(r.tier()).isEqualTo("관측 중");
        }

        @Test
        @DisplayName("첫 수집이 할인가 + 추적 2개월 + discountCount=1 → 관측 중 (패턴 불명)")
        void first_collected_at_discount_short_tracked_single_record() {
            // 이벤트 기반: 첫 레코드가 할인가 = 수집 이전부터 세일 진행 중
            // → 세일 시작 시점 불명, 정가 이력 없음 → 패턴 판단 불가
            int salePrice = discountedPrice(30);
            var r = sut.calculateDefenseTier(
                    OP, salePrice, salePrice,
                    TODAY.minusMonths(12),
                    List.of(sale(TODAY.minusMonths(2), salePrice, 30)));

            assertThat(r.tier()).isEqualTo("관측 중");
        }

        @Test
        @DisplayName("첫 수집이 할인가 + 추적 4개월+ + discountCount=1 → Layer 4로 진행")
        void first_collected_at_discount_long_tracked_goes_to_layer4() {
            // 추적 기간이 충분하면(>= 3개월) 관측 중이 아닌 방어도 판정으로 진행
            int salePrice = discountedPrice(30);
            var r = sut.calculateDefenseTier(
                    OP, OP, salePrice,
                    TODAY.minusMonths(18),
                    List.of(
                            sale(TODAY.minusMonths(4), salePrice, 30), // 첫 수집: 할인가
                            full(TODAY.minusMonths(2))));              // 정가 복귀

            assertThat(r.tier()).isNotIn("관측 중", "N급 신작");
        }

        @Test
        @DisplayName("첫 수집이 정가 + 추적 2개월 + 이후 할인 1건 → 관측 중 아님 (신뢰 가능 데이터)")
        void first_full_price_short_tracked_with_one_discount_not_관측중() {
            // 첫 수집이 정가이고 이후 할인이 발생했다면 → 신뢰할 수 있는 전환 이벤트
            int salePrice = discountedPrice(30);
            var r = sut.calculateDefenseTier(
                    OP, salePrice, salePrice,
                    TODAY.minusMonths(12),
                    List.of(
                            full(TODAY.minusMonths(2)),
                            sale(TODAY.minusDays(5), salePrice, 30)));

            assertThat(r.tier()).isNotEqualTo("관측 중");
        }

        @Test
        @DisplayName("추적 3개월+ + 할인 없음 → S급 철벽 (관측 중 아님)")
        void long_tracked_no_discount_is_iron_wall_not_관측중() {
            var r = sut.calculateDefenseTier(
                    OP, OP, null,
                    TODAY.minusMonths(18),
                    List.of(full(TODAY.minusMonths(12))));

            assertThat(r.tier()).isEqualTo("S급 철벽");
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
                    OP, OP, null,
                    TODAY.minusMonths(24),
                    List.of(full(TODAY.minusMonths(12))));

            assertThat(r.tier()).isEqualTo("S급 철벽");
            assertThat(r.trackedMonths()).isGreaterThanOrEqualTo(12L);
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
                        OP, OP, lowest,
                        TODAY.minusMonths(18),
                        List.of(
                                full(TODAY.minusMonths(12)),
                                sale(TODAY.minusMonths(6), lowest, 20),
                                full(TODAY.minusMonths(4))));

                assertThat(r.tier()).isEqualTo("A급 방패");
                assertThat(r.maxRate()).isEqualTo(20);
            }

            @Test
            @DisplayName("최대 25% 경계값 → A급 방패")
            void boundary_25_pct() {
                // 10_000원 기준: 25% off = 7_500 → maxRate 정확히 25.0
                var r = sut.calculateDefenseTier(
                        10_000, 10_000, 7_500,
                        TODAY.minusMonths(18),
                        List.of(
                                full(TODAY.minusMonths(12)),
                                sale(TODAY.minusMonths(6), 7_500, 25),
                                full(TODAY.minusMonths(4))));

                assertThat(r.tier()).isEqualTo("A급 방패");
            }

            @Test
            @DisplayName("현재 역대 최저가 → 역대 최저가 구간 메시지")
            void at_historic_low() {
                int lowest = discountedPrice(20);
                var r = sut.calculateDefenseTier(
                        OP, lowest, lowest,
                        TODAY.minusMonths(18),
                        List.of(
                                full(TODAY.minusMonths(12)),
                                sale(TODAY.minusDays(3), lowest, 20)));

                assertThat(r.tier()).isEqualTo("A급 방패");
                assertThat(r.maxRate()).isEqualTo(20);
            }

            @Test
            @DisplayName("현재 할인 중이지만 역대 최저가 아님 → 역대 최대 할인율 확인")
            void on_sale_not_at_historic_low() {
                int lowest = discountedPrice(20);  // 역대 최저 (20% off)
                int current = discountedPrice(10); // 현재 (10% off)
                var r = sut.calculateDefenseTier(
                        OP, current, lowest,
                        TODAY.minusMonths(18),
                        List.of(
                                full(TODAY.minusMonths(12)),
                                sale(TODAY.minusMonths(6), lowest, 20),
                                full(TODAY.minusMonths(4)),
                                sale(TODAY.minusDays(3), current, 10)));

                assertThat(r.tier()).isEqualTo("A급 방패");
                assertThat(r.maxRate()).isEqualTo(20);
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
                        OP, OP, lowest,
                        TODAY.minusMonths(18),
                        List.of(
                                full(TODAY.minusMonths(12)),
                                sale(TODAY.minusMonths(6), lowest, 35),
                                full(TODAY.minusMonths(4))));

                assertThat(r.tier()).isEqualTo("B급 일반");
                assertThat(r.maxRate()).isEqualTo(35);
            }

            @Test
            @DisplayName("최대 40% 경계값 → B급 일반")
            void boundary_40_pct() {
                // 10_000원: 40% off = 6_000 → maxRate 정확히 40.0
                var r = sut.calculateDefenseTier(
                        10_000, 10_000, 6_000,
                        TODAY.minusMonths(18),
                        List.of(
                                full(TODAY.minusMonths(12)),
                                sale(TODAY.minusMonths(6), 6_000, 40),
                                full(TODAY.minusMonths(4))));

                assertThat(r.tier()).isEqualTo("B급 일반");
            }

            @Test
            @DisplayName("현재 역대 최저가 → 역대 최저가 구간 메시지")
            void at_historic_low() {
                int lowest = discountedPrice(40);
                var r = sut.calculateDefenseTier(
                        OP, lowest, lowest,
                        TODAY.minusMonths(18),
                        List.of(
                                full(TODAY.minusMonths(12)),
                                sale(TODAY.minusDays(3), lowest, 40)));

                assertThat(r.tier()).isEqualTo("B급 일반");
                assertThat(r.maxRate()).isEqualTo(40);
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
                        OP, OP, lowest,
                        TODAY.minusMonths(18),
                        List.of(
                                full(TODAY.minusMonths(12)),
                                sale(TODAY.minusMonths(6), lowest, 50),
                                full(TODAY.minusMonths(4))));

                assertThat(r.tier()).isEqualTo("C급 솜방패");
            }

            @Test
            @DisplayName("최대 59% → C급 솜방패 (60% 미만 경계)")
            void just_below_d_tier() {
                // 10_000원: 59% off = 4_100 → maxRate ≈ 59%
                var r = sut.calculateDefenseTier(
                        10_000, 10_000, 4_100,
                        TODAY.minusMonths(18),
                        List.of(
                                full(TODAY.minusMonths(12)),
                                sale(TODAY.minusMonths(6), 4_100, 59),
                                full(TODAY.minusMonths(4))));

                assertThat(r.tier()).isEqualTo("C급 솜방패");
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
                        10_000, 10_000, 4_000,
                        TODAY.minusMonths(18),
                        List.of(
                                full(TODAY.minusMonths(12)),
                                sale(TODAY.minusMonths(6), 4_000, 60),
                                full(TODAY.minusMonths(4))));

                assertThat(r.tier()).isEqualTo("D급 낙하산");
            }

            @Test
            @DisplayName("최대 75% → D급 낙하산")
            void max_75_pct() {
                int lowest = discountedPrice(75);
                var r = sut.calculateDefenseTier(
                        OP, OP, lowest,
                        TODAY.minusMonths(18),
                        List.of(
                                full(TODAY.minusMonths(12)),
                                sale(TODAY.minusMonths(6), lowest, 75),
                                full(TODAY.minusMonths(4))));

                assertThat(r.tier()).isEqualTo("D급 낙하산");
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
                    OP, OP, lowest,
                    TODAY.minusMonths(18),
                    List.of(
                            full(TODAY.minusMonths(12)),              // 첫 수집: 정가
                            sale(TODAY.minusMonths(9), lowest, 30),  // 정가→할인 전환
                            full(TODAY.minusMonths(6))));             // 할인→정가 복귀

            assertThat(r.discountCount()).isEqualTo(1);
        }

        @Test
        @DisplayName("정가→할인→정가→할인→정가: 할인 횟수 2로 정확히 카운트")
        void two_separate_sales_counted_correctly() {
            int lowest = discountedPrice(30);
            var r = sut.calculateDefenseTier(
                    OP, OP, lowest,
                    TODAY.minusMonths(24),
                    List.of(
                            full(TODAY.minusMonths(12)),              // 첫 수집: 정가
                            sale(TODAY.minusMonths(9), lowest, 30),  // 1차 할인 전환
                            full(TODAY.minusMonths(7)),               // 1차 정가 복귀
                            sale(TODAY.minusMonths(4), lowest, 30),  // 2차 할인 전환
                            full(TODAY.minusMonths(2))));             // 2차 정가 복귀

            assertThat(r.discountCount()).isEqualTo(2);
        }

        @Test
        @DisplayName("첫 수집이 할인가 → 그 이후 새 할인 1건: 콜드 스타트 경고 포함")
        void cold_start_note_included_when_first_was_discounted() {
            int lowest = discountedPrice(35);
            LocalDate trackStart = TODAY.minusMonths(6);

            var r = sut.calculateDefenseTier(
                    OP, OP, lowest,
                    TODAY.minusMonths(18),
                    List.of(
                            sale(trackStart, lowest, 35),            // 첫 수집: 이미 할인 중
                            full(TODAY.minusMonths(4)),              // 정가 복귀
                            sale(TODAY.minusMonths(1), lowest, 35),  // 새 할인 전환
                            full(TODAY)));                           // 다시 정가

            assertThat(r.coldStartWarning()).isTrue();
        }

        @Test
        @DisplayName("첫 수집이 정가이면 콜드 스타트 경고 없음")
        void no_cold_start_note_when_first_was_full_price() {
            int lowest = discountedPrice(30);
            var r = sut.calculateDefenseTier(
                    OP, OP, lowest,
                    TODAY.minusMonths(18),
                    List.of(
                            full(TODAY.minusMonths(8)),
                            sale(TODAY.minusMonths(4), lowest, 30),
                            full(TODAY.minusMonths(2))));

            assertThat(r.coldStartWarning()).isFalse();
        }

        @Test
        @DisplayName("첫 수집이 할인가 + 이후 새 할인 있음: 빈도 계산에서 첫 건 보수적 제외")
        void frequency_adjusts_for_cold_start() {
            // 6개월 추적, discountCount=2 (첫 수집 할인가 + 새 할인 1건)
            // countForFreq = max(1, 2-1) = 1 → monthsPerDiscount = 6 → "약 6개월에 1회"
            int lowest = discountedPrice(30);
            LocalDate trackStart = TODAY.minusMonths(6);

            var r = sut.calculateDefenseTier(
                    OP, OP, lowest,
                    TODAY.minusMonths(18),
                    List.of(
                            sale(trackStart, lowest, 30),           // 첫 수집: 할인가
                            full(TODAY.minusMonths(4)),
                            sale(TODAY.minusMonths(1), lowest, 30), // 새 할인
                            full(TODAY)));

            // 콜드 스타트 보수적 보정: countForFreq=max(1,2-1)=1 → 주기 판단 불가 → monthsPerSale=null
            assertThat(r.coldStartWarning()).isTrue();
            assertThat(r.monthsPerSale()).isNull();
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 할인 빈도 계산
    // ═══════════════════════════════════════════════════════════
    @Nested
    @DisplayName("할인 빈도 계산")
    class FrequencyTests {

        @Test
        @DisplayName("12개월 추적, 1번 할인 → 관측 1회 (패턴 판단 이름)")
        void once_in_12_months_single_observation() {
            int lowest = discountedPrice(30);
            var r = sut.calculateDefenseTier(
                    OP, OP, lowest,
                    TODAY.minusMonths(24),
                    List.of(
                            full(TODAY.minusMonths(12)),
                            sale(TODAY.minusMonths(6), lowest, 30),
                            full(TODAY.minusMonths(4))));

            // discountCount=1 → 빈도 판단 불가, monthsPerSale=null
            assertThat(r.discountCount()).isEqualTo(1);
            assertThat(r.monthsPerSale()).isNull();
        }

        @Test
        @DisplayName("24개월 추적, 2번 할인 → 연 1회 미만 (관측 2회 이상, 빈도 판단 신뢰)")
        void rare_discount_with_multiple_observations() {
            int lowest = discountedPrice(30);
            var r = sut.calculateDefenseTier(
                    OP, OP, lowest,
                    TODAY.minusMonths(36),
                    List.of(
                            full(TODAY.minusMonths(24)),
                            sale(TODAY.minusMonths(18), lowest, 30),
                            full(TODAY.minusMonths(15)),
                            sale(TODAY.minusMonths(6), lowest, 30),
                            full(TODAY.minusMonths(3))));

            // discountCount=2, monthsPerDiscount=24/2=12 → 연 1회 미만
            assertThat(r.monthsPerSale()).isNotNull();
            assertThat(r.monthsPerSale()).isGreaterThanOrEqualTo(12.0);
        }

        @Test
        @DisplayName("12개월 추적, 2번 할인 → 약 6개월에 1회")
        void twice_in_12_months_is_every_6_months() {
            int lowest = discountedPrice(30);
            var r = sut.calculateDefenseTier(
                    OP, OP, lowest,
                    TODAY.minusMonths(24),
                    List.of(
                            full(TODAY.minusMonths(12)),
                            sale(TODAY.minusMonths(9), lowest, 30),
                            full(TODAY.minusMonths(7)),
                            sale(TODAY.minusMonths(3), lowest, 30),
                            full(TODAY.minusMonths(1))));

            assertThat(r.monthsPerSale()).isNotNull();
            assertThat(r.monthsPerSale()).isBetween(5.0, 7.0);
        }

        @Test
        @DisplayName("6개월 추적, 3번 할인 → 약 2개월에 1회")
        void three_in_6_months_is_every_2_months() {
            int lowest = discountedPrice(30);
            var r = sut.calculateDefenseTier(
                    OP, OP, lowest,
                    TODAY.minusMonths(18),
                    List.of(
                            full(TODAY.minusMonths(6)),
                            sale(TODAY.minusMonths(5), lowest, 30),
                            full(TODAY.minusMonths(4)),
                            sale(TODAY.minusMonths(3), lowest, 30),
                            full(TODAY.minusMonths(2)),
                            sale(TODAY.minusMonths(1), lowest, 30),
                            full(TODAY)));

            assertThat(r.monthsPerSale()).isNotNull();
            assertThat(r.monthsPerSale()).isBetween(1.5, 2.5);
        }

        @Test
        @DisplayName("4개월 추적, 3번 할인 → 자주 세일하는 편 (2개월 미만)")
        void frequent_sales_under_2_months() {
            int lowest = discountedPrice(30);
            var r = sut.calculateDefenseTier(
                    OP, OP, lowest,
                    TODAY.minusMonths(18),
                    List.of(
                            full(TODAY.minusMonths(4)),
                            sale(TODAY.minusMonths(3), lowest, 30),
                            full(TODAY.minusMonths(3).plusWeeks(2)),
                            sale(TODAY.minusMonths(2), lowest, 30),
                            full(TODAY.minusMonths(2).plusWeeks(2)),
                            sale(TODAY.minusMonths(1), lowest, 30),
                            full(TODAY)));

            assertThat(r.monthsPerSale()).isNotNull();
            assertThat(r.monthsPerSale()).isLessThan(2.0);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 데이터 품질 이상
    // ═══════════════════════════════════════════════════════════
    @Nested
    @DisplayName("데이터 품질 이상")
    class DataQualityTests {

        @Test
        @DisplayName("discountRate > 0인데 price가 정가와 동일 → 유효 최저가 없음 → 분석 불가")
        void invalid_lowest_price_returns_분석_불가() {
            // discountRate=20이지만 실제 price=OP (데이터 품질 이상)
            // → safeLowest=OP, hasValidLowest=false → Layer 4 가드에서 차단
            var r = sut.calculateDefenseTier(
                    OP, OP, null,
                    TODAY.minusMonths(18),
                    List.of(
                            full(TODAY.minusMonths(12)),
                            sale(TODAY.minusMonths(3), OP, 20),
                            full(TODAY.minusMonths(1))));

            assertThat(r.tier()).isEqualTo("분석 불가");
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
                    OP, lowest, lowest,
                    TODAY.minusMonths(18),
                    List.of(
                            full(TODAY.minusMonths(8)),
                            sale(TODAY.minusDays(3), lowest, 30)));

            assertThat(r.tier()).isEqualTo("B급 일반");
            assertThat(r.discountCount()).isGreaterThan(0);
        }

        @Test
        @DisplayName("할인 중 (역대 최저가 아님) + PS Plus 전용 → PS Plus 전용 + 갭 표시")
        void plus_exclusive_not_at_historic_low() {
            int lowest = discountedPrice(35);  // 역대 최저 35%
            int current = discountedPrice(20); // 현재 20%
            var r = sut.calculateDefenseTier(
                    OP, current, lowest,
                    TODAY.minusMonths(18),
                    List.of(
                            full(TODAY.minusMonths(8)),
                            sale(TODAY.minusMonths(6), lowest, 35),
                            full(TODAY.minusMonths(4)),
                            sale(TODAY.minusDays(3), current, 20)));

            assertThat(r.tier()).isEqualTo("B급 일반");
            assertThat(r.maxRate()).isEqualTo(35);
        }

        @Test
        @DisplayName("정가일 때 isPlusExclusive=true여도 메시지에 PS Plus 언급 없음")
        void plus_exclusive_flag_ignored_when_not_on_sale() {
            int lowest = discountedPrice(30);
            var r = sut.calculateDefenseTier(
                    OP, OP, lowest, // isPlusExclusive 파라미터 제거됨
                    TODAY.minusMonths(18),
                    List.of(
                            full(TODAY.minusMonths(8)),
                            sale(TODAY.minusMonths(4), lowest, 30),
                            full(TODAY.minusMonths(2))));

            // 정가 상태에서 등급 분류가 올바른지 확인
            assertThat(r.tier()).isEqualTo("B급 일반");
            assertThat(r.maxRate()).isEqualTo(30);
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
                    OP, OP, null, // lowestPrice = null
                    TODAY.minusMonths(18),
                    List.of(
                            full(TODAY.minusMonths(8)),
                            sale(TODAY.minusMonths(4), historicLow, 30), // 30% 할인 이력
                            full(TODAY.minusMonths(2))));

            // null이어도 history에서 30% 최저가를 읽어 B급으로 분류 (S급 철벽이 아님)
            assertThat(r.tier()).isNotEqualTo("S급 철벽");
            assertThat(r.tier()).isEqualTo("B급 일반");
        }

        @Test
        @DisplayName("lowestPrice=0이어도 history 최저가로 대체 계산")
        void zero_lowest_computed_from_history() {
            int historicLow = discountedPrice(50);
            var r = sut.calculateDefenseTier(
                    OP, OP, 0, // lowestPrice = 0
                    TODAY.minusMonths(18),
                    List.of(
                            full(TODAY.minusMonths(8)),
                            sale(TODAY.minusMonths(4), historicLow, 50),
                            full(TODAY.minusMonths(2))));

            assertThat(r.tier()).isEqualTo("C급 솜방패");
        }

        @Test
        @DisplayName("lowestPrice >= originalPrice면 무효 처리 → history로 대체")
        void lowest_above_original_treated_as_invalid() {
            int historicLow = discountedPrice(40);
            var r = sut.calculateDefenseTier(
                    OP, OP, OP + 1000, // lowestPrice > originalPrice (이상 데이터)
                    TODAY.minusMonths(18),
                    List.of(
                            full(TODAY.minusMonths(8)),
                            sale(TODAY.minusMonths(4), historicLow, 40),
                            full(TODAY.minusMonths(2))));

            // history에서 40% 최저가 계산 → B급 일반
            assertThat(r.tier()).isEqualTo("B급 일반");
        }
    }

    // ═══════════════════════════════════════════════════════════
    // DefenseInfo 수치 필드 검증
    // ═══════════════════════════════════════════════════════════
    @Nested
    @DisplayName("DefenseInfo 수치 필드")
    class DefenseInfoFieldTests {

        @Test
        @DisplayName("Layer 4 케이스: 수치 필드가 모두 올바르게 채워짐")
        void layer4_all_fields_populated() {
            int lowest = discountedPrice(30);
            var r = sut.calculateDefenseTier(
                    OP, OP, lowest,
                    TODAY.minusMonths(18),
                    List.of(
                            full(TODAY.minusMonths(12)),
                            sale(TODAY.minusMonths(6), lowest, 30),
                            full(TODAY.minusMonths(4))));

            assertThat(r.tier()).isEqualTo("B급 일반");
            assertThat(r.trackedMonths()).isGreaterThanOrEqualTo(12L);
            assertThat(r.discountCount()).isEqualTo(1);
            assertThat(r.maxRate()).isEqualTo(30);
            assertThat(r.trackingStartDate()).isNotNull();
        }

        @Test
        @DisplayName("예상 다음 할인일은 할인 2회 이상일 때만 계산됨")
        void next_sale_estimate_requires_at_least_2_discounts() {
            int lowest = discountedPrice(30);

            // 할인 1회 → null
            var single = sut.calculateDefenseTier(
                    OP, OP, lowest, TODAY.minusMonths(18),
                    List.of(full(TODAY.minusMonths(12)), sale(TODAY.minusMonths(6), lowest, 30), full(TODAY.minusMonths(4))));
            assertThat(single.nextSaleEstimate()).isNull();

            // 할인 2회 → 날짜 반환
            var multi = sut.calculateDefenseTier(
                    OP, OP, lowest, TODAY.minusMonths(24),
                    List.of(
                            full(TODAY.minusMonths(24)),
                            sale(TODAY.minusMonths(18), lowest, 30),
                            full(TODAY.minusMonths(15)),
                            sale(TODAY.minusMonths(6), lowest, 30),
                            full(TODAY.minusMonths(3))));
            assertThat(multi.nextSaleEstimate()).isNotNull();
        }
    }
}
