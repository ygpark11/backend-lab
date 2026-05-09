import time
import re
import json
import random
import logging
import gc

from playwright.sync_api import sync_playwright

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("PS-Monthly-PoC")

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

def crawl_monthly_games():
    # 타겟: PS Plus 새로운 소식 (월간 게임 섹션이 있는 곳)
    target_url = "https://www.playstation.com/ko-kr/ps-plus/whats-new/"
    base_url = "https://www.playstation.com"

    result = {"status": "FAIL", "monthly_games": []}

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
            # ==========================================
            # [Step 1] 마케팅 페이지에서 월간 게임 리스트(Slug) 수집
            # ==========================================
            logger.info(f"👉 [Step 1] 마케팅 페이지 접속: {target_url}")
            page.goto(target_url, wait_until="domcontentloaded", timeout=30000)

            # 🚀 [수정 후] 소니의 AEM 고유 클래스(마스터 키)를 활용한 완벽한 타겟팅
            section_locator = page.locator(".cmp-experiencefragment--wn-latest-monthly-games-content")

            # 해당 섹션 내부에서만 게임 박스를 찾음
            boxes_locator = section_locator.locator(".box:has(a.btn--cta[href*='/games/'])")
            boxes_count = boxes_locator.count()

            logger.info(f"발견된 게임 카드 수: {boxes_count}개")

            scraped_games = []

            for i in range(boxes_count):
                box = boxes_locator.nth(i)

                # 1. 제목 추출
                title_loc = box.locator("h3.txt-style-medium-title")
                title = title_loc.text_content().strip() if title_loc.count() > 0 else "Unknown Title"

                # 2. 상세 페이지 링크(Slug) 추출
                link_loc = box.locator("a.btn--cta")
                slug = link_loc.get_attribute("href") if link_loc.count() > 0 else None

                # 3. 이미지 URL 추출 (data-src 속성)
                img_loc = box.locator(".media-block--image")
                image_url = img_loc.get_attribute("data-src") if img_loc.count() > 0 else None

                if slug:
                    scraped_games.append({
                        "title": title,
                        "slug": slug,
                        "image_url": image_url
                    })
                    logger.info(f"   ✔️ 1차 수집 완료: {title} ({slug})")

            # ==========================================
            # [Step 2] 각 상세 페이지로 이동하여 ps_store_id 탈취
            # ==========================================
            logger.info("👉 [Step 2] 상세 페이지 진입 및 ps_store_id (productId) 추출 시작")

            for game in scraped_games:
                detail_url = base_url + game["slug"]
                logger.info(f"   탐색 중... {game['title']} -> {detail_url}")

                # 상세 페이지로 이동
                page.goto(detail_url, wait_until="domcontentloaded", timeout=30000)

                # 방어 코드: 서버 IP 블락 방지를 위한 랜덤 딜레이
                time.sleep(random.uniform(1.0, 2.5))

                # 💡 핵심 로직: 찜 버튼(wishlistToggle) 찾기
                wishlist_btn = page.locator('button[data-qa="wishlistToggle"]')

                try:
                    # 버튼이 DOM에 붙을 때까지 최대 10초 대기
                    wishlist_btn.first.wait_for(state="attached", timeout=10000)

                    # data-telemetry-meta 속성값 가져오기
                    meta_str = wishlist_btn.first.get_attribute("data-telemetry-meta")

                    if meta_str:
                        # JSON 파싱하여 productId 추출
                        meta_json = json.loads(meta_str)
                        ps_store_id = meta_json.get("productId")

                        game["ps_store_id"] = ps_store_id
                        logger.info(f"   🎯 성공! ps_store_id 획득: {ps_store_id}")
                    else:
                        logger.warning(f"   ⚠️ 찜 버튼은 있으나 메타데이터가 없습니다: {game['title']}")
                        game["ps_store_id"] = None

                except Exception as e:
                    logger.warning(f"   ⚠️ 찜 버튼을 찾을 수 없습니다 (Timeout): {game['title']} - {e}")
                    game["ps_store_id"] = None

            result["status"] = "SUCCESS"
            result["monthly_games"] = scraped_games
            logger.info("🎉 모든 월간 게임 수집이 완료되었습니다!")

        except Exception as e:
            logger.error(f"❌ 크롤링 중 치명적 에러 발생: {e}")
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
    final_data = crawl_monthly_games()
    print("\n--- 최종 결과 JSON ---")
    print(json.dumps(final_data, indent=2, ensure_ascii=False))