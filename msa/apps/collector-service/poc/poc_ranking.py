from __future__ import annotations

"""
ranking_crawler.py 변경사항 검증 POC
-----------------------------------------
[테스트 1] 목록 페이지: 새 URL + wait_for_selector + JS 일괄 추출
[테스트 2] 상세 페이지: Apollo 캐시 script → CTA → 위시리스트 순서로 product ID 추출
[테스트 3] 2단계 통합: concept ID → product ID 변환 엔드투엔드
"""
import json
import random
import time
import logging

from playwright.sync_api import sync_playwright

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# ──────────────────────────────────────────────
# 검증 대상 URL (새 카테고리 ID)
# ──────────────────────────────────────────────
LIST_URL_BEST_SELLER     = "https://store.playstation.com/ko-kr/category/d0446d4b-dc9a-4f1e-86ec-651f099c9b29/1?sortBy=sales30&sortOrder=desc"
LIST_URL_MOST_DOWNLOADED = "https://store.playstation.com/ko-kr/category/d0446d4b-dc9a-4f1e-86ec-651f099c9b29/1?sortBy=downloads30&sortOrder=desc"

# 상세 페이지 고정 테스트용 (프로야구스피리츠 2026)
CONCEPT_URL = "https://store.playstation.com/ko-kr/concept/10017627"
EXPECTED_PRODUCT_ID = "JP0101-PPSA34474_00-PROBBSPIRITS2026"

DESKTOP_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]


def make_page(context):
    page = context.new_page()
    page.set_default_timeout(30000)
    page.add_init_script("Object.defineProperty(navigator, 'webdriver', { get: () => undefined });")

    def route_intercept(route):
        if route.request.resource_type in ("image", "media", "font"):
            route.abort()
            return
        route.continue_()

    page.route("**/*", route_intercept)
    return page


def sep(title: str = ""):
    print("\n" + "=" * 60)
    if title:
        print(f"  {title}")
        print("=" * 60)


# ──────────────────────────────────────────────
# 테스트 1: 목록 페이지 concept ID 추출
# ──────────────────────────────────────────────
def test_list_page(context, label: str, url: str) -> list[str]:
    sep(f"[테스트 1-{label}] 목록 페이지 파싱")
    print(f"URL: {url}")

    page = make_page(context)
    concept_ids: list[str] = []

    try:
        page.goto(url, wait_until="domcontentloaded", timeout=45000)
        time.sleep(2.5)

        # 새 wait 조건: 헤더/푸터 링크 혼입 없는 상품 타일 전용 selector
        print("  → [data-qa='ems-sdk-grid#productTile0'] 대기 중...")
        page.wait_for_selector('[data-qa="ems-sdk-grid#productTile0"]', timeout=25000)
        print("  ✓ 첫 번째 상품 타일 확인")

        # JS 일괄 추출 (라이브 Locator 반복 → get_attribute 타임아웃 해소)
        concept_ids = page.evaluate("""
            () => {
                const anchors = document.querySelectorAll('a[data-track="web:store:concept-tile"]');
                return Array.from(anchors).map(a => {
                    try {
                        return JSON.parse(a.getAttribute('data-telemetry-meta')).id || null;
                    } catch(e) { return null; }
                }).filter(id => id != null);
            }
        """)

        print(f"  ✓ concept ID 추출 완료: {len(concept_ids)}개")
        print(f"    샘플 (앞 5개): {concept_ids[:5]}")

        if len(concept_ids) == 0:
            print("  ✗ [실패] concept ID가 0개 — selector 확인 필요")
        elif len(concept_ids) < 20:
            print(f"  ⚠ [경고] 예상보다 적음 (기대: ~24개, 실제: {len(concept_ids)}개)")
        else:
            print(f"  ✓ [성공] 정상 범위")

    except Exception as e:
        print(f"  ✗ [실패] {e}")
    finally:
        page.close()

    return concept_ids


# ──────────────────────────────────────────────
# 테스트 2: 상세 페이지 product ID 추출
# ──────────────────────────────────────────────
def test_detail_page(context) -> str | None:
    sep("[테스트 2] 상세 페이지 product ID 추출")
    print(f"URL: {CONCEPT_URL}")
    print(f"예상 product ID: {EXPECTED_PRODUCT_ID}")

    page = make_page(context)
    product_id: str | None = None

    try:
        page.goto(CONCEPT_URL, wait_until="domcontentloaded", timeout=20000)
        time.sleep(1.5)

        # ── 1순위: SSR Apollo 캐시 script ──
        print("\n  [1순위] Apollo 캐시 script 추출 시도...")
        product_id = page.evaluate("""
            () => {
                const scripts = document.querySelectorAll('script[type="application/json"]');
                for (const s of scripts) {
                    try {
                        const cache = JSON.parse(s.textContent).cache || {};
                        for (const [key, val] of Object.entries(cache)) {
                            if (key.startsWith('Concept:') && val.defaultProduct) {
                                const ref = val.defaultProduct.__ref || '';
                                if (ref.startsWith('Product:')) return ref.slice(8);
                            }
                        }
                        for (const key of Object.keys(cache)) {
                            if (key.startsWith('Product:') && key.includes('-')) return key.slice(8);
                        }
                    } catch(e) {}
                }
                return null;
            }
        """)

        if product_id:
            print(f"  ✓ Apollo 캐시 script 성공: {product_id}")
        else:
            print("  ✗ Apollo 캐시 script 실패 → 2순위 시도")

            # ── 2순위: CTA 영역 telemetry ──
            print("\n  [2순위] CTA 영역 telemetry 추출 시도...")
            try:
                meta_str = page.get_attribute('[data-qa="mfeCtaMain#cta"]', 'data-telemetry-meta', timeout=8000)
                if meta_str:
                    product_id = json.loads(meta_str).get("productId")
                    if product_id:
                        print(f"  ✓ CTA telemetry 성공: {product_id}")
            except Exception as e:
                print(f"  ✗ CTA telemetry 실패: {e}")

        if not product_id:
            # ── 3순위: 위시리스트 버튼 telemetry ──
            print("\n  [3순위] 위시리스트 버튼 telemetry 추출 시도...")
            try:
                meta_str = page.get_attribute('[data-qa="wishlistToggle"]', 'data-telemetry-meta', timeout=5000)
                if meta_str:
                    product_id = json.loads(meta_str).get("productId")
                    if product_id:
                        print(f"  ✓ 위시리스트 telemetry 성공: {product_id}")
            except Exception as e:
                print(f"  ✗ 위시리스트 telemetry 실패: {e}")

        # 최종 판정
        print()
        if product_id == EXPECTED_PRODUCT_ID:
            print(f"  ✓ [성공] 예상값과 일치: {product_id}")
        elif product_id:
            print(f"  ⚠ [불일치] 추출값: {product_id}")
            print(f"            예상값: {EXPECTED_PRODUCT_ID}")
        else:
            print("  ✗ [실패] product ID 추출 불가 — 모든 순위 실패")

    except Exception as e:
        print(f"  ✗ [실패] {e}")
    finally:
        page.close()

    return product_id


# ──────────────────────────────────────────────
# 테스트 3: 통합 — 목록 1페이지 → 첫 concept → product ID 변환
# ──────────────────────────────────────────────
def test_end_to_end(context, concept_ids: list[str]):
    sep("[테스트 3] 통합: concept ID → product ID 변환 (첫 3개)")

    if not concept_ids:
        print("  ⚠ 목록 concept ID가 없어 스킵")
        return

    targets = concept_ids[:3]
    print(f"  변환 대상: {targets}")

    results = {}
    for concept_id in targets:
        concept_url = f"/ko-kr/concept/{concept_id}"
        print(f"\n  concept {concept_id} 탐색 중...")

        page = make_page(context)
        try:
            page.goto(f"https://store.playstation.com{concept_url}", wait_until="domcontentloaded", timeout=20000)
            time.sleep(1.2)

            product_id = page.evaluate("""
                () => {
                    const scripts = document.querySelectorAll('script[type="application/json"]');
                    for (const s of scripts) {
                        try {
                            const cache = JSON.parse(s.textContent).cache || {};
                            for (const [key, val] of Object.entries(cache)) {
                                if (key.startsWith('Concept:') && val.defaultProduct) {
                                    const ref = val.defaultProduct.__ref || '';
                                    if (ref.startsWith('Product:')) return ref.slice(8);
                                }
                            }
                            for (const key of Object.keys(cache)) {
                                if (key.startsWith('Product:') && key.includes('-')) return key.slice(8);
                            }
                        } catch(e) {}
                    }
                    return null;
                }
            """)

            if product_id:
                results[concept_id] = product_id
                print(f"    ✓ {concept_id} → {product_id}")
            else:
                print(f"    ✗ {concept_id} → 추출 실패")

        except Exception as e:
            print(f"    ✗ {concept_id} → 오류: {e}")
        finally:
            page.close()
            time.sleep(1.0)

    print(f"\n  변환 결과: {len(results)}/{len(targets)}개 성공")
    if len(results) == len(targets):
        print("  ✓ [성공]")
    elif results:
        print("  ⚠ [부분 성공] — 일부 실패는 네트워크 불안정일 수 있음")
    else:
        print("  ✗ [실패] — Apollo 캐시 추출 로직 재검토 필요")


# ──────────────────────────────────────────────
# 메인
# ──────────────────────────────────────────────
def main():
    sep("ranking_crawler POC 시작")

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-blink-features=AutomationControlled",
            ]
        )
        context = browser.new_context(
            user_agent=random.choice(DESKTOP_USER_AGENTS),
            viewport={"width": 1920, "height": 1080},
        )

        try:
            # 테스트 1: 베스트셀러 목록
            bs_ids = test_list_page(context, "BEST_SELLER", LIST_URL_BEST_SELLER)
            time.sleep(2)

            # 테스트 1: 최다 다운로드 목록
            md_ids = test_list_page(context, "MOST_DOWNLOADED", LIST_URL_MOST_DOWNLOADED)
            time.sleep(2)

            # 테스트 2: 상세 페이지 product ID 추출
            test_detail_page(context)
            time.sleep(2)

            # 테스트 3: 통합 검증 (베스트셀러 첫 3개)
            test_end_to_end(context, bs_ids)

        finally:
            browser.close()

    sep("POC 완료")


if __name__ == "__main__":
    main()
