"""
POC: Phase 0 신작 탐사 로직 단순화 검증
- 기존: 에디션 파싱 → fallback(a[data-telemetry-meta]) 복잡한 다단계 구조
- 신규: mfeCtaMain > wishlistToggle에서 productId 직접 획득
- 무료 판별: mfeCtaMain#offer0#finalPrice 텍스트 기반

테스트 케이스:
  1. 교토 재너두     (concept/10017478) - 에디션 없음, 유료, 미수집 케이스
  2. 여름미녀        (concept/10019471) - 에디션 없음, 유료, 수집 케이스
  3. 어쌔신 크리드   (concept/10013987) - 에디션 있음, 유료, 수집 케이스
  4. 울트라 킹덤즈   (concept/10010534) - 에디션 없음, 무료, 미수집(정상 필터링) 케이스
"""

import time
import json
import random
import logging
import gc

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("Phase0-PoC")

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
]

TEST_CASES = [
    {"name": "교토 재너두",              "concept_id": "10017478", "expected": "REGISTER"},
    {"name": "여름미녀",                 "concept_id": "10019471", "expected": "REGISTER"},
    {"name": "어쌔신 크리드 블랙 플래그", "concept_id": "10013987", "expected": "REGISTER"},
    {"name": "울트라 킹덤즈",            "concept_id": "10010534", "expected": "SKIP_FREE"},
]


def setup_page(context):
    page = context.new_page()
    page.set_default_timeout(30000)
    page.add_init_script("Object.defineProperty(navigator, 'webdriver', { get: () => undefined });")

    def route_intercept(route):
        if route.request.resource_type in ["image", "media", "font", "stylesheet"]:
            route.abort()
            return
        route.continue_()

    page.route("**/*", route_intercept)
    return page


def probe_concept(page, concept_id: str) -> dict:
    """
    신규 로직으로 concept 페이지에서 ps_store_id + 무료 여부를 탐지한다.

    반환:
        {
            "action":     "REGISTER" | "SKIP_FREE" | "SKIP_NO_ID",
            "ps_store_id": str | None,
            "title":       str | None,
            "price_text":  str | None,
        }
    """
    url = f"https://store.playstation.com/ko-kr/concept/{concept_id}"
    result = {"action": "SKIP_NO_ID", "ps_store_id": None, "title": None, "price_text": None}

    logger.info(f"접속 중: {url}")
    page.goto(url, wait_until="domcontentloaded", timeout=30000)
    time.sleep(random.uniform(1.5, 2.5))

    # ── 제목 수집 ─────────────────────────────────────────────────────────────
    try:
        page.wait_for_selector("[data-qa='mfe-game-title#name']", state="attached", timeout=15000)
        result["title"] = page.locator("[data-qa='mfe-game-title#name']").inner_text().strip()
    except PlaywrightTimeoutError:
        logger.warning("제목 selector 타임아웃")
        return result

    # ── [신규] mfeCtaMain 내 wishlistToggle에서 productId 획득 ─────────────────
    ps_store_id = None
    try:
        wishlist_btn = page.locator("div[data-qa='mfeCtaMain'] button[data-qa='wishlistToggle']")
        wishlist_btn.wait_for(state="attached", timeout=10000)
        meta_str = wishlist_btn.get_attribute("data-telemetry-meta")
        if meta_str:
            meta_json = json.loads(meta_str)
            ps_store_id = meta_json.get("productId")
    except Exception as e:
        logger.warning(f"wishlistToggle 획득 실패: {e}")

    if not ps_store_id:
        logger.warning("productId 획득 실패 → SKIP_NO_ID")
        return result

    result["ps_store_id"] = ps_store_id

    # ── [신규] 무료 판별: CTA 버튼 data-telemetry-meta의 originalPriceValue 기반 ──
    # span#finalPrice 텍스트는 렌더링 타이밍에 따라 빈 문자열이 반환되는 경우가 있어 불안정.
    # CTA 버튼 메타에는 항상 originalPriceValue(숫자)가 포함되어 신뢰도가 높음.
    price_value = None
    try:
        cta_btn = page.locator("div[data-qa='mfeCtaMain'] button[data-qa='mfeCtaMain#cta#action']")
        cta_btn.wait_for(state="attached", timeout=10000)
        meta_str = cta_btn.get_attribute("data-telemetry-meta")
        if meta_str:
            meta_json = json.loads(meta_str)
            price_value = meta_json["productDetail"][0]["productPriceDetail"][0]["originalPriceValue"]
    except Exception as e:
        logger.warning(f"CTA 버튼 가격 파싱 실패: {e}")

    result["price_text"] = str(price_value) if price_value is not None else None

    if price_value == 0:
        logger.info(f"무료 게임 판정 (originalPriceValue=0) → SKIP_FREE")
        result["action"] = "SKIP_FREE"
        return result

    result["action"] = "REGISTER"
    return result


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-blink-features=AutomationControlled",
                "--js-flags=--max-old-space-size=256",
            ]
        )
        context = browser.new_context(
            user_agent=random.choice(USER_AGENTS),
            viewport={"width": 1920, "height": 1080},
            locale="ko-KR",
            timezone_id="Asia/Seoul",
        )

        passed = 0
        failed = 0

        for case in TEST_CASES:
            print("\n" + "=" * 60)
            print(f"  게임: {case['name']}  (concept/{case['concept_id']})")
            print(f"  기대 결과: {case['expected']}")
            print("=" * 60)

            page = setup_page(context)
            try:
                res = probe_concept(page, case["concept_id"])
            except Exception as e:
                logger.error(f"예외 발생: {e}")
                res = {"action": "ERROR", "ps_store_id": None, "title": None, "price_text": None}
            finally:
                try: page.close()
                except: pass

            ok = res["action"] == case["expected"]
            status_icon = "✅ PASS" if ok else "❌ FAIL"
            if ok:
                passed += 1
            else:
                failed += 1

            print(f"  결과:      {res['action']}  {status_icon}")
            print(f"  제목:      {res['title']}")
            print(f"  productId: {res['ps_store_id']}")
            print(f"  가격:      {res['price_text']}")

            time.sleep(random.uniform(2.0, 3.5))

        try: context.close()
        except: pass
        try: browser.close()
        except: pass
        gc.collect()

        print("\n" + "=" * 60)
        print(f"  최종 결과: {passed}/{len(TEST_CASES)} PASS  |  {failed} FAIL")
        print("=" * 60)


if __name__ == "__main__":
    run()
