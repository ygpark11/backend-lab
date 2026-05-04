import time
import re
import random
import logging
import gc

from playwright.sync_api import sync_playwright

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("PS-Plus-PoC")

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
        # 텍스트만 긁을 것이므로 무거운 자원 전면 차단 (1GB RAM 최적화)
        if route.request.resource_type in ["image", "media", "font"]:
            route.abort()
            return
        route.continue_()

    page.route("**/*", route_intercept)
    return page

def crawl_ps_plus_prices_no_click():
    target_url = "https://www.playstation.com/ko-kr/ps-plus/"
    logger.info(f"[PS-Plus] 타겟 접속 시도: {target_url}")

    result = {"status": "FAIL", "data": {}}

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True, # 클릭이 필요 없으므로 완전히 백그라운드에서 실행
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-blink-features=AutomationControlled",
                "--js-flags=--max-old-space-size=128"
            ]
        )

        context = browser.new_context(
            user_agent=random.choice(USER_AGENTS),
            viewport={"width": 1920, "height": 1080},
            locale="ko-KR",
            timezone_id="Asia/Seoul"
        )

        page = setup_stealth_page(context)

        try:
            # 1. 페이지 접속 (domcontentloaded만 완료되면 즉시 다음 단계로)
            page.goto(target_url, wait_until="domcontentloaded", timeout=30000)

            # 2. 티어 선택기 뼈대가 DOM에 붙을 때까지만 대기 (state="attached" 옵션 적용)
            page.wait_for_selector(".service-hub-tier-selector", state="attached", timeout=15000)

            # 보내주신 HTML 기준 고유 식별자 매핑
            tiers = {"에센셜": "TIER_10", "스페셜": "TIER_20", "디럭스": "TIER_30"}
            durations = {"1개월": "1_MONTH", "3개월": "3_MONTH", "12개월": "12_MONTH"}

            for tier_name, tier_code in tiers.items():
                logger.info(f"👉 [{tier_name}] 데이터 파싱 중...")
                tier_prices = {}

                for duration_name, duration_code in durations.items():
                    # 💡 핵심 로직: 해당 티어(TIER_X)와 기간(X_MONTH)을 가진 라디오 버튼의 부모 Label을 찾고, 그 안의 가격 태그를 조준
                    label_loc = page.locator(f"label:has(input[name='tier-selector-offer-switcher-{tier_code}'][value='{duration_code}'])")
                    price_loc = label_loc.locator("[data-qa$='#price']")

                    if price_loc.count() > 0:
                        # .inner_text()는 화면에 숨겨져 있으면 값을 못 가져오지만, .text_content()는 무조건 가져옴
                        raw_text = price_loc.first.text_content().strip()
                        clean_price = int(re.sub(r'[^0-9]', '', raw_text))
                        tier_prices[duration_name] = clean_price
                        logger.info(f"   ✔️ {duration_name}: {clean_price:,}원")
                    else:
                        logger.warning(f"   ⚠️ {duration_name} 가격을 찾을 수 없습니다.")

                result["data"][tier_name] = tier_prices

            result["status"] = "SUCCESS"
            logger.info("🎉 클릭 없는 고속 수집이 완료되었습니다.")

        except Exception as e:
            logger.error(f"파싱 중 에러 발생: {e}")
        finally:
            try: page.close()
            except: pass
            try: context.close()
            except: pass
            try: browser.close()
            except: pass
            gc.collect()

    return result

if __name__ == "__main__":
    crawl_ps_plus_prices_no_click()