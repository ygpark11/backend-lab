import time
import urllib.parse
import json
import random
import logging
import gc

from playwright.sync_api import sync_playwright

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("HLTB-PoC")

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
        # 💡 저사양 서버 최적화: 이미지, 폰트, CSS 등 무거운 자원 차단
        if route.request.resource_type in ["image", "media", "font", "stylesheet"]:
            route.abort()
            return
        route.continue_()

    page.route("**/*", route_intercept)
    return page

def crawl_hltb_times():
    # 💡 수정 1: 테스트용 검색어(정상 케이스 + 실패 케이스) 세팅
    search_queries = [
        "Ghost of Tsushima DIRECTOR'S CUT",
        "Like a Dragon: Pirate Yakuza in Hawaii",
        "Marvel's Spider-Man Remastered",
        "godd oof warr"  # 검색 실패 테스트용 오타
    ]

    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-blink-features=AutomationControlled",
                "--js-flags=--max-old-space-size=128" # V8 메모리 제한 (1GB RAM 서버용)
            ]
        )

        context = browser.new_context(
            user_agent=random.choice(USER_AGENTS),
            viewport={"width": 1920, "height": 1080},
            locale="en-US"
        )

        page = setup_stealth_page(context)

        try:
            for query in search_queries:
                logger.info(f"👉 검색 시작: [{query}]")

                encoded_query = urllib.parse.quote(query)
                target_url = f"https://howlongtobeat.com/?q={encoded_query}"

                page.goto(target_url, wait_until="domcontentloaded")

                try:
                    # 💡 수정 1: 게임 카드 리스트 혹은 'No Results Found' 헤더가 뜰 때까지 대기
                    page.wait_for_selector("li[class*='search_list'], h3:has-text('No Results Found')", timeout=15000)
                except Exception:
                    logger.warning(f"   ⚠️ 응답 지연 또는 Cloudflare 블락 의심: {query}")
                    results.append({"query": query, "status": "ERROR"})
                    continue

                # 💡 수정 1: 결과 없음(No Results Found) 방어 로직
                if page.locator("h3:has-text('No Results Found')").count() > 0:
                    logger.info("   ❌ 검색 결과가 없습니다 (No Results Found).")
                    results.append({"query_title": query, "status": "NOT_FOUND"})
                    time.sleep(random.uniform(2.0, 4.0)) # 차단 방지 딜레이
                    continue

                # 검색 결과가 있는 경우 첫 번째 카드 추출
                cards = page.locator("li[class*='search_list']")
                if cards.count() == 0:
                    logger.info("   ❌ 카드를 찾을 수 없습니다.")
                    results.append({"query_title": query, "status": "NOT_FOUND"})
                    continue

                first_card = cards.nth(0)

                # 1. 매칭된 게임 타이틀 추출
                found_title_loc = first_card.locator("h2 a").first
                found_title = found_title_loc.text_content().strip() if found_title_loc.count() > 0 else "Unknown"

                logger.info(f"   ✔️ 1순위 매칭 게임: {found_title}")

                # 2. 플레이타임 블록 추출
                tidbits_loc = first_card.locator("div[class*='tidbit']")
                tidbit_texts = tidbits_loc.all_text_contents()

                playtimes = {}
                for i in range(0, len(tidbit_texts), 2):
                    if i + 1 < len(tidbit_texts):
                        label = tidbit_texts[i].strip()
                        raw_value = tidbit_texts[i+1].strip()

                        # 💡 수정 2: 분수 표기(½, 1/2) 및 텍스트 정규화 로직 고도화
                        value = (raw_value
                                 .replace("½", ".5")
                                 .replace(" 1/2", ".5")
                                 .replace("1/2", ".5")
                                 .replace(" Hours", "h")
                                 .replace(" Mins", "m"))

                        playtimes[label] = value

                logger.info(f"   ⏱️ 수집된 시간: {playtimes}")

                results.append({
                    "query_title": query,
                    "found_title": found_title,
                    "playtimes": playtimes,
                    "status": "SUCCESS"
                })

                # IP 블락 방지를 위한 랜덤 딜레이 (필수)
                time.sleep(random.uniform(2.5, 5.0))

        except Exception as e:
            logger.error(f"❌ 크롤링 중 치명적 에러 발생: {e}")
        finally:
            # 자원 반환
            try: page.close()
            except: pass
            try: context.close()
            except: pass
            try: browser.close()
            except: pass
            gc.collect()

    return results

if __name__ == "__main__":
    final_data = crawl_hltb_times()
    print("\n--- 최종 결과 JSON ---")
    print(json.dumps(final_data, indent=2, ensure_ascii=False))