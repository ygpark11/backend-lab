import unicodedata
import time
import re
import random
import logging
import requests
import gc

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

logger = logging.getLogger("Rating-Worker")

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0"
]

def generate_slug(title):
    # 1. 소문자화 및 에디션/번들 꼬리표 제거 (슬러그 최적화)
    slug = title.lower()
    slug = re.sub(r'\b((standard|deluxe|ultimate|premium|sound|digital|special|anniversary|gold|definitive)\s*)*(edition|cut|version|bundle|pack)\b', '', slug)

    # 2. 특수문자 제거 및 하이픈 연결
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
    logger.info(f"[Metacritic] 타겟 접속 시도: {target_url}")

    result = {
        "status": "FAIL", "metaScore": None, "metaCount": None, "userScore": None, "userCount": None
    }

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
            # 1. 페이지 접속
            try:
                response = page.goto(target_url, wait_until="commit", timeout=20000)
            except Exception as e:
                logger.warning(f"접속 지연, 새로고침으로 재시도: {e}")
                response = page.reload(wait_until="commit", timeout=20000)

            if response and response.status == 404:
                logger.warning(f"❌ [404] 게임을 찾을 수 없음: {game_title}")
                result["status"] = "NOT_FOUND"
                return result

            human_sleep(2.0, 4.0)

            # Cloudflare 차단 감지
            if "Just a moment" in page.title() or "Cloudflare" in page.title():
                logger.error("[차단됨] Cloudflare 방어벽 감지!")
                result["status"] = "BLOCKED"
                return result

            # 핵심 DOM(점수판) 렌더링을 명시적으로 기다림 + 타임아웃 시 재시도
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

def start_polling(base_url, secret_key):
    logger.info("[Stealth Worker] 메타크리틱 평점 수집 워커가 백그라운드에서 가동됩니다.")

    API_TARGET_URL = f"{base_url}/api/internal/scraping/ratings/target"
    API_UPDATE_URL = f"{base_url}/api/internal/scraping/ratings/update"
    HEADERS = {"X-Internal-Secret": secret_key}

    while True:
        time.sleep(300) # 5분 휴식

        # [VIP 새치기 절대 양보 로직]
        # 1. 메인 락이 잠겨있거나 (일배치, 랭킹 수집 중)
        # 2. 큐에 VIP(새치기) 요청이 단 1개라도 대기 중이면 워커는 절대 실행되지 않고 다시 잠듬
        if check_if_busy():
            logger.debug("메인 작업 또는 VIP 대기 중. 평점 워커는 턴을 넘깁니다.")
            continue

        # 락 획득
        try:
            set_rating_running(True)

            # 1. 1호기(Java)에 타겟 요청
            res = requests.get(API_TARGET_URL, headers=HEADERS, timeout=10)

            # 1호기가 204 No Content를 주면 조용히 다음 턴으로 넘김
            if res.status_code == 204:
                continue

            # 그 외의 에러 처리
            if res.status_code != 200 or not res.json():
                logger.error(f"1호기 타겟 요청 실패: HTTP {res.status_code}")
                continue

            # 정상적으로 일거리를 받아온 경우
            job = res.json()
            job_id = job['jobId']
            game_id = job['gameId']
            game_title = job['title']

            # 2. 메타크리틱 수집
            result = crawl_metacritic_single(game_title)

            # 3. 1호기(Java)에 결과 전송
            payload = {
                "jobId": job_id,
                "gameId": game_id,
                "status": result["status"],
                "metaScore": result["metaScore"],
                "metaCount": result["metaCount"],
                "userScore": result["userScore"],
                "userCount": result["userCount"]
            }

            post_res = requests.post(API_UPDATE_URL, json=payload, headers=HEADERS, timeout=10)

            if post_res.status_code == 200:
                logger.info(f"평점 수집 결과 전송 완료 (GameID: {game_id})")
            else:
                logger.error(f"결과 전송 실패: HTTP {post_res.status_code}")

        except Exception as e:
            logger.error(f"스텔스 워커 루프 에러: {e}")
        finally:
            set_rating_running(False)
