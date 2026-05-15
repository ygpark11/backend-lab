import re
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

# rating_worker.py 와 동일한 로직 (변환 확인용)
def parse_hltb_time_to_float(raw_value):
    if not raw_value or raw_value == "--":
        return None

    val = raw_value.replace("½", ".5").replace(" 1/2", ".5").replace("1/2", ".5").lower()

    try:
        if "hour" in val or "h" in val:
            numeric = re.sub(r'[^0-9.]', '', val)
            return float(numeric) if numeric else None
        elif "min" in val or "m" in val:
            numeric = re.sub(r'[^0-9.]', '', val)
            mins = float(numeric) if numeric else None
            return round(mins / 60.0, 2) if mins is not None else None
    except Exception:
        return None
    return None


def setup_stealth_page(context):
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


def crawl_hltb_times():
    search_queries = [
        "Assassin's Creed Shadows",
        "Like a Dragon: Pirate Yakuza in Hawaii",
        "Puyo Puyo Tetris 2",          # 실제 운영에서 성공한 케이스
        "EDENS ZERO",                  # 오탐 NOT_FOUND 케이스 (placeholder)
        "DRAGON BALL FighterZ",        # 스켈레톤 카드 오탐 케이스
        "STRIKERS 1945 III",           # 스켈레톤 카드 오탐 케이스
        "Elden Ring",                  # 긴 게임 케이스
        "존재하지않는게임XYZ1234",      # 진짜 NOT_FOUND 케이스
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
                "--js-flags=--max-old-space-size=128"
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
                logger.info(f"검색 시작: [{query}]")

                encoded_query = urllib.parse.quote(query)
                target_url = f"https://howlongtobeat.com/?q={encoded_query}"
                logger.info(f"[HLTB] 접속: {target_url}")

                page.goto(target_url, wait_until="domcontentloaded")

                # 스켈레톤 li.search_list가 먼저 렌더링되었다가 실제 카드로 교체되므로
                # 실제 게임 타이틀 링크(h2 a)가 포함된 카드만 기다림.
                CARD_SELECTOR = "li[class*='search_list'] h2 a"
                try:
                    page.wait_for_selector(CARD_SELECTOR, timeout=10000)
                except Exception:
                    # 1단계 10초 경과: "No Results Found" 확인
                    # → 10초면 HLTB API 응답이 충분히 도달했을 시간이므로 진짜 NOT_FOUND
                    if page.locator("h3:has-text('No Results Found')").count() > 0:
                        logger.info(f"검색 결과 없음 (No Results Found): {query}")
                        results.append({"query": query, "status": "NOT_FOUND"})
                        time.sleep(random.uniform(2.0, 4.0))
                        continue
                    # "No Results Found"도 없음 = 아직 로딩 중 → 20초 추가 대기
                    try:
                        page.wait_for_selector(CARD_SELECTOR, timeout=20000)
                    except Exception:
                        if page.locator("h3:has-text('No Results Found')").count() > 0:
                            logger.info(f"검색 결과 없음 (No Results Found): {query}")
                            results.append({"query": query, "status": "NOT_FOUND"})
                        else:
                            logger.warning(f"카드 대기 30s 타임아웃 — 차단 의심: {query}")
                            results.append({"query": query, "status": "BLOCKED"})
                        time.sleep(random.uniform(2.0, 4.0))
                        continue

                cards = page.locator("li[class*='search_list']")
                if cards.count() == 0:
                    logger.info(f"카드 0개: {query}")
                    results.append({"query": query, "status": "NOT_FOUND"})
                    continue

                first_card = cards.nth(0)

                found_title_loc = first_card.locator("h2 a").first
                found_title = found_title_loc.text_content().strip() if found_title_loc.count() > 0 else "Unknown"
                logger.info(f"1순위 매칭 게임: {found_title}")

                tidbits_loc = first_card.locator("div[class*='tidbit']")
                tidbit_texts = tidbits_loc.all_text_contents()
                logger.info(f"tidbit 원본: {tidbit_texts}")  # raw 구조 확인용

                playtimes_raw = {}
                playtimes_float = {}
                for i in range(0, len(tidbit_texts), 2):
                    if i + 1 < len(tidbit_texts):
                        label = tidbit_texts[i].strip()
                        raw_value = tidbit_texts[i + 1].strip()
                        parsed = parse_hltb_time_to_float(raw_value)

                        playtimes_raw[label] = raw_value
                        playtimes_float[label] = parsed

                        logger.info(f"  {label}: '{raw_value}' → {parsed}")

                results.append({
                    "query": query,
                    "found_title": found_title,
                    "mainStory": playtimes_float.get("Main Story"),
                    "mainExtra": playtimes_float.get("Main + Extra"),
                    "completionist": playtimes_float.get("Completionist"),
                    "raw": playtimes_raw,
                    "status": "SUCCESS"
                })

                time.sleep(random.uniform(2.5, 5.0))

        except Exception as e:
            logger.error(f"크롤링 중 치명적 에러 발생: {e}")
        finally:
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
