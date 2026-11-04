import time
import json
import random
import logging
import gc

from playwright.sync_api import sync_playwright

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("PS-Edition-PoC")

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
]

def setup_stealth_page(context):
    page = context.new_page()
    page.set_default_timeout(30000)

    # 🛡️ Webdriver 탐지 우회
    page.add_init_script("Object.defineProperty(navigator, 'webdriver', { get: () => undefined });")

    def route_intercept(route):
        # 💡 저사양 서버 최적화: 텍스트와 DOM 구조만 필요하므로 무거운 자원 전면 차단
        if route.request.resource_type in ["image", "media", "font", "stylesheet"]:
            route.abort()
            return
        route.continue_()

    page.route("**/*", route_intercept)
    return page

def crawl_edition_features(target_ps_store_id):
    target_url = f"https://store.playstation.com/ko-kr/product/{target_ps_store_id}"

    # 기본 반환 결과 세팅
    result = {
        "status": "SUCCESS",
        "ps_store_id": target_ps_store_id,
        "is_free": False,
        "features": []
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-blink-features=AutomationControlled",
                "--js-flags=--max-old-space-size=128" # V8 엔진 메모리 제한
            ]
        )

        context = browser.new_context(
            user_agent=random.choice(USER_AGENTS),
            viewport={"width": 1920, "height": 1080},
            locale="ko-KR"
        )

        page = setup_stealth_page(context)

        try:
            logger.info(f"👉 상세 페이지 접속 중: {target_url}")
            page.goto(target_url, wait_until="domcontentloaded", timeout=30000)

            # 서버 IP 블락 방지를 위한 랜덤 딜레이
            time.sleep(random.uniform(1.0, 2.0))

            # ==========================================
            # 💡 [케이스 1] 에디션(Upsell) 영역이 아예 없는 경우
            # ==========================================
            upsell_section = page.locator('div[data-qa="mfeUpsell"]')
            if upsell_section.count() == 0:
                logger.info("   ✔️ 에디션 영역이 없습니다. (단일 에디션)")
                return result

            # 에디션 영역 내의 모든 article(카드) 찾기
            articles = upsell_section.locator("article")
            article_count = articles.count()

            for i in range(article_count):
                article = articles.nth(i)

                # 1. 현재 article의 ps_store_id 추출 (a 태그 href 속성 활용)
                link_loc = article.locator("a[href*='/product/']")
                if link_loc.count() == 0:
                    continue

                href = link_loc.first.get_attribute("href")
                if not href:
                    continue
                article_ps_id = href.split("?")[0].split("/")[-1]

                # ==========================================
                # 💡 핵심 로직: 현재 상세 페이지의 ID와 일치하는지 확인
                # ==========================================
                if article_ps_id != target_ps_store_id:
                    continue # 내 에디션이 아니면 스킵!

                logger.info(f"   🎯 일치하는 에디션 영역 발견: {article_ps_id}")

                # ==========================================
                # 💡 [케이스 2] 가격 검증 (무료/데모 필터링)
                # ==========================================
                btn_meta = article.locator("button[data-telemetry-meta]")
                if btn_meta.count() > 0:
                    meta_str = btn_meta.first.get_attribute("data-telemetry-meta")
                    try:
                        meta_json = json.loads(meta_str)
                        # productPriceDetail 배열 안의 originalPriceValue 확인
                        product_detail = meta_json.get("productDetail", [{}])[0]
                        price_detail = product_detail.get("productPriceDetail", [{}])[0]
                        original_price = price_detail.get("originalPriceValue", -1)

                        if original_price == 0:
                            logger.info("   ⚠️ 무료/데모 에디션입니다. 수집을 스킵합니다.")
                            result["status"] = "IGNORED"
                            result["is_free"] = True
                            return result
                    except Exception as e:
                        logger.warning(f"   ⚠️ 메타데이터 파싱 에러: {e}")

                # ==========================================
                # 💡 [케이스 3 & 4] 구성품(Features) 추출
                # ==========================================
                features_loc = article.locator("ul[data-qa$='#features'] > li")
                feature_count = features_loc.count()

                if feature_count == 0:
                    logger.info("   ✔️ 구성품 내역이 비어있습니다. (번들 또는 혜택 텍스트 누락)")
                else:
                    for j in range(feature_count):
                        feature_text = features_loc.nth(j).text_content().strip()
                        result["features"].append(feature_text)
                    logger.info(f"   ✔️ 구성품 {feature_count}개 추출 완료.")

                # 내 에디션을 찾아 처리를 완료했으므로 루프 즉시 종료 (최적화)
                break

        except Exception as e:
            logger.error(f"❌ 크롤링 중 에러 발생: {e}")
            result["status"] = "FAIL"
        finally:
            # 저사양 서버를 위한 완벽한 자원 반환
            try: page.close()
            except: pass
            try: context.close()
            except: pass
            try: browser.close()
            except: pass
            gc.collect()

    return result

if __name__ == "__main__":
    # 테스트를 위한 4가지 예시 ID
    TEST_CASES = [
        "UP0102-PPSA02530_00-PRAGMATA00000000",
        "UP0102-PPSA02530_00-PRAGMATADX000000",
        "HP0082-PPSA09454_00-STRASHSEAPS50001",
        "HP0082-PPSA09454_00-STRASHDXAPS50001",
        "UP8236-PPSA19115_00-0298593598299103",
        "HP9000-CUSA02020_00-RCPS400000000000"
    ]

    for store_id in TEST_CASES:
        print("\n" + "="*50)
        data = crawl_edition_features(store_id)
        print("\n--- 파싱 결과 JSON ---")
        print(json.dumps(data, indent=2, ensure_ascii=False))