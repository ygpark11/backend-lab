import unicodedata
import time
import re
import random
import logging
import requests
import gc
import urllib.parse

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

logger = logging.getLogger("Metadata-Worker")

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0"
]

def generate_slug(title):
    slug = title.lower()
    slug = re.sub(r'\b((standard|deluxe|ultimate|premium|sound|digital|special|anniversary|gold|definitive)\s*)*(edition|cut|version|bundle|pack)\b', '', slug)
    slug = re.sub(r'[\'’‘´`"“”]', '', slug)
    slug = unicodedata.normalize('NFKD', slug).encode('ascii', 'ignore').decode('ascii')
    slug = re.sub(r'[^a-z0-9]+', '-', slug).strip('-')
    return slug

def human_sleep(min_sec=2.0, max_sec=5.0):
    time.sleep(random.uniform(min_sec, max_sec))

def setup_stealth_page(context):
    page = context.new_page()
    page.set_default_timeout(30000)

    # Webdriver 탐지 우회 (기본 스텔스)
    page.add_init_script("Object.defineProperty(navigator, 'webdriver', { get: () => undefined });")

    def route_intercept(route):
        r_type = route.request.resource_type
        # 텍스트(점수)만 필요하므로 쓸데없는 자원 전면 차단
        if r_type in ["image", "media", "font"]:
            route.abort()
            return
        route.continue_()

    page.route("**/*", route_intercept)
    return page

def crawl_metacritic_single(game_title):
    slug = generate_slug(game_title)
    target_url = f"https://www.metacritic.com/game/{slug}/"
    logger.info(f"[Metacritic] 타겟 접속 시도: {game_title} | URL: {target_url}")

    result = {"status": "FAIL", "metaScore": None, "metaCount": None, "userScore": None, "userCount": None}

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--disable-blink-features=AutomationControlled", "--js-flags=--max-old-space-size=128"]
        )

        context = browser.new_context(user_agent=random.choice(USER_AGENTS), viewport={"width": 1920, "height": 1080}, locale="en-US")
        page = setup_stealth_page(context)

        try:
            try: response = page.goto(target_url, wait_until="commit", timeout=30000)
            except Exception: response = page.reload(wait_until="commit", timeout=30000)

            if response and response.status == 404:
                logger.warning(f"[404] 게임을 찾을 수 없음: {game_title} | 시도한 URL: {target_url}")
                result["status"] = "NOT_FOUND"
                return result

            human_sleep(2.0, 4.0)

            # Cloudflare 차단 감지
            if "Just a moment" in page.title() or "Cloudflare" in page.title():
                logger.error("[차단됨] Cloudflare 방어벽 감지!")
                result["status"] = "BLOCKED"
                return result

            try:
                page.wait_for_selector("div[data-testid='product-score']", state="attached", timeout=15000)
            except PlaywrightTimeoutError:
                logger.warning(f"DOM 렌더링 지연 (감자 서버 헐떡임), 새로고침 후 1회 재시도...")
                page.reload(wait_until="commit")
                page.wait_for_selector("div[data-testid='product-score']", state="attached", timeout=15000)

            # 1. Metascore 파싱
            try:
                meta_block = page.locator("div[data-testid='product-score']").filter(has_text="Metascore")
                if meta_block.count() > 0:
                    score_loc = meta_block.locator("span[data-testid='global-score-value']")
                    if score_loc.is_visible(timeout=3000):
                        result["metaScore"] = int(score_loc.inner_text().strip())
                    count_loc = meta_block.locator("a[data-testid='global-score-review-count-link']")
                    if count_loc.is_visible(timeout=3000):
                        result["metaCount"] = int(re.sub(r'[^0-9]', '', count_loc.inner_text()))
            except Exception as e:
                logger.warning(f"Metascore 파싱 에러 (무시됨): {e}")

            # 2. User Score 파싱
            try:
                user_block = page.locator("div[data-testid='product-score']").filter(has_text="User score")
                if user_block.count() > 0:
                    score_loc = user_block.locator("span[data-testid='global-score-value']")
                    if score_loc.is_visible(timeout=3000):
                        txt = score_loc.inner_text().strip()
                        if txt.lower() != "tbd": result["userScore"] = float(txt)
                    count_loc = user_block.locator("a[data-testid='global-score-review-count-link']")
                    if count_loc.is_visible(timeout=3000):
                        result["userCount"] = int(re.sub(r'[^0-9]', '', count_loc.inner_text()))
            except Exception as e:
                logger.warning(f"User Score 파싱 에러 (무시됨): {e}")

            # 여기까지 왔으면 점수가 있든 없든 (파싱 로직은 정상적으로 돌았으므로) SUCCESS 처리
            result["status"] = "SUCCESS"
            logger.info(f"[성공] Meta: {result.get('metaScore')}, User: {result.get('userScore')}")

        except Exception as e:
            logger.error(f"파싱 중 에러 발생: {e}")
            result["status"] = "ERROR"
        finally:
            try: page.close()
            except: pass
            try: context.close()
            except: pass
            try: browser.close()
            except: pass
            gc.collect()

    return result

def parse_hltb_time_to_float(raw_value):
    if not raw_value or raw_value == "--": return None

    val = raw_value.replace("½", ".5").replace(" 1/2", ".5").replace("1/2", ".5").lower()

    try:
        if "hour" in val or "h" in val:
            return float(val.replace("hours", "").replace("hour", "").replace("h", "").strip())
        elif "min" in val or "m" in val:
            mins = float(val.replace("mins", "").replace("min", "").replace("m", "").strip())
            return round(mins / 60.0, 2)
    except Exception:
        return None
    return None

def crawl_hltb_single(game_title):
    encoded_query = urllib.parse.quote(game_title)
    target_url = f"https://howlongtobeat.com/?q={encoded_query}"
    logger.info(f"[HLTB] 타겟 접속 시도: {game_title} | URL: {target_url}")

    result = {"status": "FAIL", "mainStory": None, "mainExtra": None, "completionist": None}

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--disable-blink-features=AutomationControlled", "--js-flags=--max-old-space-size=128"]
        )
        context = browser.new_context(user_agent=random.choice(USER_AGENTS), viewport={"width": 1920, "height": 1080}, locale="en-US")
        page = setup_stealth_page(context)

        try:
            page.goto(target_url, wait_until="domcontentloaded", timeout=30000)

            try:
                page.wait_for_selector("li[class*='search_list'], h3:has-text('No Results Found')", timeout=30000)
            except Exception:
                result["status"] = "BLOCKED"
                return result

            if page.locator("h3:has-text('No Results Found')").count() > 0:
                result["status"] = "NOT_FOUND"
                return result

            cards = page.locator("li[class*='search_list']")
            if cards.count() == 0:
                result["status"] = "NOT_FOUND"
                return result

            first_card = cards.nth(0)
            tidbits_loc = first_card.locator("div[class*='tidbit']")
            tidbit_texts = tidbits_loc.all_text_contents()

            playtimes = {}
            for i in range(0, len(tidbit_texts), 2):
                if i + 1 < len(tidbit_texts):
                    label = tidbit_texts[i].strip()
                    playtimes[label] = parse_hltb_time_to_float(tidbit_texts[i+1].strip())

            result["mainStory"] = playtimes.get("Main Story")
            result["mainExtra"] = playtimes.get("Main + Extra")
            result["completionist"] = playtimes.get("Completionist")
            result["status"] = "SUCCESS"

            logger.info(f"[HLTB 성공] {game_title} -> Main: {result['mainStory']}, Extra: {result['mainExtra']}, 100%: {result['completionist']}")

        except Exception as e:
            logger.error(f"[HLTB] 파싱 중 에러 발생: {e}")
            result["status"] = "ERROR"
        finally:
            try: page.close()
            except: pass
            try: context.close()
            except: pass
            try: browser.close()
            except: pass
            gc.collect()

    return result

def start_polling(base_url, secret_key, check_if_busy, set_rating_running, crawler_lock):
    logger.info("[Stealth Worker] 메타크리틱 평점 수집 워커가 백그라운드에서 가동됩니다.")

    HEADERS = {"X-Internal-Secret": secret_key}

    MC_TARGET_URL = f"{base_url}/api/internal/scraping/ratings/target"
    MC_UPDATE_URL = f"{base_url}/api/internal/scraping/ratings/update"
    HLTB_TARGET_URL = f"{base_url}/api/internal/scraping/hltb/target"
    HLTB_UPDATE_URL = f"{base_url}/api/internal/scraping/hltb/update"

    while True:
        sleep_time = random.randint(150, 180)
        time.sleep(sleep_time)

        with crawler_lock:
            if check_if_busy():
                logger.debug("메인 작업 또는 VIP 대기 중. 메타데이터 워커는 턴을 넘깁니다.")
                continue
            set_rating_running(True)

        try:
            # ---------------------------------------------------------
            # Phase 1: 메타크리틱 (Metacritic)
            # ---------------------------------------------------------
            try:
                res_mc = requests.get(MC_TARGET_URL, headers=HEADERS, timeout=15)

                if res_mc.status_code == 204:
                    pass
                elif res_mc.status_code != 200 or not res_mc.text:
                    logger.error(f"[메타크리틱] 1호기 타겟 요청 실패: HTTP {res_mc.status_code}")
                else:
                    job = res_mc.json()
                    mc_result = crawl_metacritic_single(job['searchTitle'])

                    payload = {
                        "jobId": job['jobId'], "gameId": job['gameId'], "status": mc_result["status"],
                        "metaScore": mc_result["metaScore"], "metaCount": mc_result["metaCount"],
                        "userScore": mc_result["userScore"], "userCount": mc_result["userCount"]
                    }
                    requests.post(MC_UPDATE_URL, json=payload, headers=HEADERS, timeout=15)
                    logger.info(f"메타크리틱 업데이트 완료 (GameID: {job['gameId']})")
                    human_sleep(2.0, 3.0)
            except Exception as e:
                logger.error(f"메타크리틱 Phase 에러 (진행 속행): {e}")

            # ---------------------------------------------------------
            # Phase 2: HowLongToBeat (HLTB)
            # ---------------------------------------------------------
            try:
                res_hltb = requests.get(HLTB_TARGET_URL, headers=HEADERS, timeout=15)

                if res_hltb.status_code == 204:
                    pass
                elif res_hltb.status_code != 200 or not res_hltb.text:
                    logger.error(f"[HLTB] 1호기 타겟 요청 실패: HTTP {res_hltb.status_code}")
                else:
                    job = res_hltb.json()
                    hltb_result = crawl_hltb_single(job['searchTitle'])

                    payload = {
                        "jobId": job['jobId'], "gameId": job['gameId'], "status": hltb_result["status"],
                        "mainStory": hltb_result["mainStory"], "mainExtra": hltb_result["mainExtra"],
                        "completionist": hltb_result["completionist"]
                    }
                    requests.post(HLTB_UPDATE_URL, json=payload, headers=HEADERS, timeout=15)
                    logger.info(f"HLTB 업데이트 완료 (GameID: {job['gameId']})")
            except Exception as e:
                logger.error(f"HLTB Phase 에러: {e}")

        except Exception as e:
            logger.error(f"스텔스 워커 루프 에러: {e}")
        finally:
            set_rating_running(False)
