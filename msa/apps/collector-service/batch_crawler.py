import queue
import random
import os
import time
import re
import threading
import logging
import traceback
import gc
import json
from logging.handlers import RotatingFileHandler
from datetime import datetime

# [Playwright Imports]
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
from flask import Flask, jsonify, request
import requests
import ranking_crawler
import rating_worker

# --- [1. 설정 및 로깅 초기화] ---
if not os.path.exists('logs'):
    os.makedirs('logs')

log_formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(message)s', datefmt='%Y-%m-%d %H:%M:%S')
file_handler = RotatingFileHandler('logs/crawler.log', maxBytes=10*1024*1024, backupCount=5)
file_handler.setFormatter(log_formatter)
console_handler = logging.StreamHandler()
console_handler.setFormatter(log_formatter)

logger = logging.getLogger("PS-Collector")
logger.setLevel(logging.INFO)
if not logger.handlers:
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
logger.propagate = False

ranking_logger = logging.getLogger("Ranking-Crawler")
ranking_logger.setLevel(logging.INFO)
if not ranking_logger.handlers:
    ranking_logger.addHandler(file_handler)
    ranking_logger.addHandler(console_handler)
ranking_logger.propagate = False

rating_logger = logging.getLogger("Rating-Worker")
rating_logger.setLevel(logging.INFO)
if not rating_logger.handlers:
    rating_logger.addHandler(file_handler)
    rating_logger.addHandler(console_handler)
rating_logger.propagate = False

logging.getLogger('werkzeug').setLevel(logging.ERROR)

app = Flask(__name__)
session = requests.Session()
session.headers.update({'Connection': 'keep-alive'})

BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8080")
JAVA_API_URL = f"{BASE_URL}/api/v1/games/collect"
TARGET_API_URL = f"{BASE_URL}/api/v1/games/targets"
INSIGHT_REFRESH_API_URL = f"{BASE_URL}/api/v1/games/batch-complete"
INTERNAL_SYNC_URL = f"{BASE_URL}/api/internal/scraping/candidates/sync"
INTERNAL_CALLBACK_URL = f"{BASE_URL}/api/internal/scraping/callback"
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")
CRAWLER_SECRET_KEY = os.getenv("CRAWLER_SECRET_KEY", "")

CURRENT_MODE = os.getenv("CRAWLER_MODE", "LOW").upper()
CONFIG = {
    "LOW": {
        "restart_interval": 10,
        "timeout": 60000,
        "sleep_min": 3.0,
        "sleep_max": 6.0,
        "block_fonts": True,
    },
    "HIGH": {
        "restart_interval": 200,
        "timeout": 30000,
        "sleep_min": 1.0,
        "sleep_max": 3.0,
        "block_fonts": False,
    }
}
CONF = CONFIG.get(CURRENT_MODE, CONFIG["LOW"])
logger.info(f"🔧 Crawler Config: {CURRENT_MODE} | Engine: Playwright (Manual Stealth)")

# [글로벌 상태 및 스레드 락]
urgent_queue = queue.Queue()
active_requests = set()
crawler_lock = threading.Lock()
is_batch_running = False
is_vip_running = False
is_ranking_running = False
is_rating_running = False


# --- [2. 브라우저 매니저 (1코어 1기가 메모리 최적화)] ---
class BrowserManager:
    def __init__(self, p):
        self.p = p
        self.browser, self.context = self._create_browser()
        self.request_count = 0

    def _create_browser(self):
        logger.info("🌐 크롬 브라우저 시작 (메모리 최적화 + 스텔스 옵션)")
        DESKTOP_USER_AGENTS = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"
        ]
        user_agent = random.choice(DESKTOP_USER_AGENTS)

        browser = self.p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-extensions",
                "--disable-blink-features=AutomationControlled",
                "--js-flags=--max-old-space-size=256"
            ]
        )
        context = browser.new_context(
            user_agent=user_agent,
            viewport={"width": 1920, "height": 1080},
            locale="ko-KR",
            timezone_id="Asia/Seoul"
        )
        return browser, context

    def get_context(self):
        if self.request_count >= CONF["restart_interval"]:
            try: self.context.close()
            except: pass
            try: self.browser.close()
            except: pass

            self.context = None
            self.browser = None
            gc.collect()

            time.sleep(3)

            try:
                self.browser, self.context = self._create_browser()
            except Exception as e:
                logger.error(f"브라우저 환생 중 감자 서버 헐떡임 발생! 5초 대기 후 재시도... : {e}")
                time.sleep(5)
                self.browser, self.context = self._create_browser()

            self.request_count = 0

        return self.context

    def increment(self):
        self.request_count += 1

def setup_page(context):
    page = context.new_page()
    page.set_default_timeout(CONF['timeout'])

    page.add_init_script("Object.defineProperty(navigator, 'webdriver', { get: () => undefined });")

    def route_intercept(route):
        r_type = route.request.resource_type
        if r_type in ["image", "media"]:
            route.abort()
            return
        if CONF.get("block_fonts", False) and r_type == "font":
            route.abort()
            return
        route.continue_()

    page.route("**/*", route_intercept)
    return page

# --- [3. 공통 유틸리티 및 검증] ---
def human_like_delay(min_sec=None, max_sec=None):
    s_min = min_sec if min_sec is not None else CONF["sleep_min"]
    s_max = max_sec if max_sec is not None else CONF["sleep_max"]
    time.sleep(random.uniform(s_min, s_max))

def human_like_scroll(page):
    try:
        page.evaluate("window.scrollBy(0, document.body.scrollHeight / 4)")
        human_like_delay(1, 2)
        page.evaluate("window.scrollBy(0, document.body.scrollHeight / 3)")
        human_like_delay(0.5, 1.5)
    except: pass

def verify_secret(req_data):
    return req_data.get('secretKey') == CRAWLER_SECRET_KEY


# --- [4. VIP 새치기 로직 (안전한 콜백 처리)] ---
def check_and_run_vip(bm):
    global active_requests
    while not urgent_queue.empty():
        item = urgent_queue.get()
        req_id, ps_store_id = item['request_id'], item['ps_store_id']

        logger.info(f"[VIP 새치기 발동!] 유저 요청 {ps_store_id} 즉시 수집 중...")
        context = bm.get_context()
        page = setup_page(context)

        status = "FAIL"
        error_msg = "Unknown"
        try:
            target_url = f"https://store.playstation.com/ko-kr/product/{ps_store_id}"
            res = crawl_detail_and_send(page, target_url, verbose=True)
            if res and not res.get("is_delisted"):
                status = "SUCCESS"
                error_msg = None
            else:
                error_msg = "단종 또는 데이터 파싱 실패"
        except Exception as e:
            error_msg = str(e)
        finally:
            page.close()
            bm.increment()

        callback_payload = {"requestId": req_id, "status": status, "errorMessage": error_msg}
        try:
            requests.post(INTERNAL_CALLBACK_URL, json=callback_payload, headers={"X-Internal-Secret": CRAWLER_SECRET_KEY}, timeout=10)
            logger.info(f"[VIP 콜백 완료] {status}")
        except Exception as e:
            logger.error(f"[VIP 콜백 실패] {e}")

        try: active_requests.remove(req_id)
        except: pass

def run_vip_only_logic():
    global is_vip_running
    with crawler_lock:
        is_vip_running = True
        try:
            with sync_playwright() as p:
                bm = BrowserManager(p)
                check_and_run_vip(bm)
                time.sleep(1)
                try: bm.context.close()
                except: pass
                try: bm.browser.close()
                except: pass
        finally:
            is_vip_running = False
            logger.info("[VIP Worker] 모든 새치기 처리 완료. 전담 엔진 종료.")


# --- [5. Phase 0: 신작 탐사 ] ---
def crawl_phase0_new_releases(bm):
    logger.info("▶️ [Phase 0] 신규 게임(진열장 후보군) 탐사 시작 (1페이지)")
    context = bm.get_context()
    page = setup_page(context)
    candidates = []

    try:
        new_games_url = "https://store.playstation.com/ko-kr/category/e1699f77-77e1-43ca-a296-26d08abacb0f/1"
        page.goto(new_games_url, timeout=CONF['timeout'], wait_until="domcontentloaded")
        human_like_delay(2, 4)
        human_like_scroll(page)

        page.wait_for_selector("a[href*='/concept/'], a[href*='/product/']", state="attached", timeout=15000)
        links = page.locator("a[href*='/concept/'], a[href*='/product/']").all()

        for link in links:
            href = link.get_attribute("href")
            if href and ("/concept/" in href or "/product/" in href):
                full_url = f"https://store.playstation.com{href}" if href.startswith('/') else href
                if full_url not in candidates:
                    candidates.append(full_url)

        candidates = candidates[:36]
        logger.info(f"   👀 [Phase 0] 1페이지에서 {len(candidates)}개의 후보군 발굴 성공")

    except Exception as e:
        logger.error(f"[Phase 0] 최신 카테고리 로딩 실패: {e}")
        return
    finally:
        page.close()
        bm.increment()

    for href in candidates:
        check_and_run_vip(bm)

        url = href
        context = bm.get_context()
        page = setup_page(context)

        try:
            page.goto(url, timeout=60000, wait_until="domcontentloaded")
            human_like_delay(1, 2)
            human_like_scroll(page)

            if "/concept/" in url:
                html_content = page.content()
                is_free_game = False

                if '"isFree":true' in html_content or '"basePrice":"무료"' in html_content:
                    is_free_game = True
                else:
                    # 안전망: 화면에 렌더링된 메인 버튼 텍스트도 확인 (기다리지 않음)
                    try:
                        main_cta = page.locator("div[data-qa='mfeCtaMain']")
                        if main_cta.count() > 0:
                            price_loc = main_cta.locator("span[data-qa$='#finalPrice']")
                            if price_loc.count() > 0:
                                price_text = price_loc.first.inner_text().strip()
                                if "무료" in price_text or price_text == "0원":
                                    is_free_game = True
                    except: pass

                del html_content

                if is_free_game:
                    logger.info(f"   [Phase 0 스킵] 기본 영역 무료 판정(F2P/체험판) -> {url}")
                    continue

                ps_store_id = None
                editions = page.locator("article[data-qa^='mfeUpsell#productEdition']").all()
                if editions:
                    for ed in editions:
                        try:
                            ed_name = ed.locator("h3[data-qa$='#editionName']").inner_text(timeout=1000).strip()
                            if any(x in ed_name for x in ["체험판", "Demo", "Trial", "BETA"]):
                                continue

                            ed_price_loc = ed.locator("span[data-qa$='#finalPrice']")
                            if ed_price_loc.is_visible(timeout=1000):
                                ed_price = ed_price_loc.inner_text().strip()
                                if "무료" in ed_price or ed_price == "0원":
                                    continue

                                link_loc = ed.locator("a[href*='/product/']")
                                if link_loc.is_visible(timeout=1000):
                                    ps_store_id = link_loc.get_attribute("href").split('/')[-1]
                                    break
                        except:
                            continue

                if not ps_store_id:
                    try:
                        meta_loc = page.locator("a[data-telemetry-meta]").first
                        if meta_loc.is_visible(timeout=2000):
                            meta_str = meta_loc.get_attribute("data-telemetry-meta")
                            meta_json = json.loads(meta_str)
                            ps_store_id = meta_json.get("productId")
                    except:
                        pass

                if ps_store_id:
                    page.wait_for_selector("[data-qa='mfe-game-title#name']", timeout=25000)
                    title = page.locator("[data-qa='mfe-game-title#name']").inner_text().strip()

                    image_url = ""
                    try:
                        temp_html_img = page.content()
                        match = re.search(r'(https://image\.api\.playstation\.com/vulcan/[^"\'\s>]+)', temp_html_img)
                        if match: image_url = match.group(1).split("?")[0]
                        del temp_html_img

                        if not image_url:
                            img_loc = page.locator("img[data-qa='gameBackgroundImage#heroImage#image']")
                            if img_loc.count() > 0: image_url = img_loc.first.get_attribute("src").split("?")[0]
                    except: pass

                    logger.info(f"   ✅ [Phase 0 등록] 신작 수집소 전송: {title} ({ps_store_id})")
                    session.post(INTERNAL_SYNC_URL, json={
                        "psStoreId": ps_store_id,
                        "title": title,
                        "imageUrl": image_url
                    }, headers={"X-Internal-Secret": CRAWLER_SECRET_KEY}, timeout=10)

            elif "/product/" in url:
                ps_store_id = url.split('/')[-1]
                page.wait_for_selector("[data-qa='mfe-game-title#name']", timeout=25000)
                title = page.locator("[data-qa='mfe-game-title#name']").inner_text().strip()

                image_url = ""
                try:
                    temp_html_img = page.content()
                    match = re.search(r'(https://image\.api\.playstation\.com/vulcan/[^"\'\s>]+)', temp_html_img)
                    if match: image_url = match.group(1).split("?")[0]
                    del temp_html_img

                    if not image_url:
                        img_loc = page.locator("img[data-qa='gameBackgroundImage#heroImage#image']")
                        if img_loc.count() > 0: image_url = img_loc.first.get_attribute("src").split("?")[0]
                except: pass

                logger.info(f"   ✅ [Phase 0 등록] {title} ({ps_store_id})")
                session.post(INTERNAL_SYNC_URL, json={
                    "psStoreId": ps_store_id,
                    "title": title,
                    "imageUrl": image_url
                }, headers={"X-Internal-Secret": CRAWLER_SECRET_KEY}, timeout=10)

        except Exception as e:
            logger.error(f"[Phase 0] {url} 분석 실패: {e}")
        finally:
            page.close()
            bm.increment()
    logger.info("[Phase 0] 신규 탐사 프로세스 전체 종료")


# --- [6. 메인 게임 파싱 ] ---
def mine_english_title(html_content):
    try:
        # 1. 정규식 매칭 실패 시 즉시 종료
        match = re.search(r'"invariantName"\s*:\s*"([^"]+)"', html_content)
        if not match:
            return None

        raw_title = match.group(1)

        # 2. 유니코드 이스케이프 복구 (예: \u0026 -> &)
        try:
            raw_title = raw_title.encode('utf-8').decode('unicode_escape')
        except Exception:
            pass # 디코딩 실패 시 원본 유지

        # 3. 악성 인코딩(Mojibake) 및 스마트 따옴표 치환
        raw_title = raw_title.replace("\u0080\u0099", "'").replace("â\u0080\u0099", "'")
        raw_title = raw_title.replace("’", "'").replace("‘", "'")

        # 특정 게임(YEAH! YOU WANT...) 백슬래시 찌꺼기 및 제어 문자 제거
        raw_title = raw_title.replace("\u0084", " ")
        raw_title = raw_title.replace("YEAH! YOU WANT \\", "")
        raw_title = re.sub(r'[Â„€“”]', ' ', raw_title)

        # 4. 검색에 방해되는 상표권 기호(™®©) 제거 및 숨은 탭(\t) 치환
        raw_title = re.sub(r'[™®©â¢]', '', raw_title)
        raw_title = raw_title.replace("＆", "&").replace("\t", " ")

        # 5. 다중 공백을 단일 공백으로 압축 후 양끝 공백 제거
        cleaned_title = re.sub(r'\s+', ' ', raw_title).strip()

        return cleaned_title

    except Exception:
        # 예상치 못한 에러 발생 시 크롤러가 죽지 않도록 방어
        return None

def crawl_detail_and_send(page, target_url, verbose=False):
    try:
        page.goto(target_url, timeout=CONF['timeout'], wait_until="commit")

        if "/error" in page.url:
            logger.warning(f"🚨 단종 의심 (URL 리다이렉트): {target_url}")
            return {"is_delisted": True, "ps_store_id": target_url.split("/")[-1].split("?")[0]}

        try:
            page.wait_for_selector("[data-qa='mfe-game-title#name']", state="attached", timeout=30000)
        except PlaywrightTimeoutError:
            try:
                page.reload(wait_until="commit")
                page.wait_for_selector("[data-qa='mfe-game-title#name']", state="attached", timeout=20000)
            except PlaywrightTimeoutError:
                return None

        title = page.locator("[data-qa='mfe-game-title#name']").inner_text().strip()

        temp_html_title = page.content()
        english_title = mine_english_title(temp_html_title)
        del temp_html_title

        publisher = "Batch Crawler"
        if page.locator("[data-qa='mfe-game-title#publisher']").count() > 0:
            publisher = page.locator("[data-qa='mfe-game-title#publisher']").first.inner_text().strip()

        try: page.wait_for_selector("[data-qa^='mfeCtaMain#offer']", timeout=15000)
        except: pass

        platform_set = set()
        for el in page.locator("[data-qa^='mfe-game-title#productTag']").all():
            raw_text = el.text_content().strip().upper()
            if "PS5" in raw_text: platform_set.add("PS5")
            if "PS4" in raw_text: platform_set.add("PS4")
            if "VR2" in raw_text: platform_set.add("PS_VR2")
            elif "VR" in raw_text: platform_set.add("PS_VR")
        platforms = list(platform_set)

        is_ps5_pro_enhanced = False
        try:
            for el in page.locator("[data-qa^='mfe-game-title#productTag']").all():
                if "PS5 Pro 성능 향상" in el.inner_text() or "PS5 Pro Enhanced" in el.inner_text():
                    is_ps5_pro_enhanced = True
                    break

            if not is_ps5_pro_enhanced:
                for el in page.locator("[data-qa^='mfe-compatibility-notices#notices']").all():
                    if "PS5 Pro 성능 향상" in el.inner_text() or "PS5 Pro Enhanced" in el.inner_text():
                        is_ps5_pro_enhanced = True
                        break
        except: pass

        genre_ids = ""
        try: genre_ids = page.locator("[data-qa='gameInfo#releaseInformation#genre-value']").inner_text()
        except: pass

        release_date = None
        try:
            if page.locator("[data-qa='gameInfo#releaseInformation#releaseDate-value']").count() > 0:
                raw_date = page.locator("[data-qa='gameInfo#releaseInformation#releaseDate-value']").first.inner_text().strip()
                parts = raw_date.split("/")
                if len(parts) == 3: release_date = f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"
                else: release_date = raw_date.replace("/", "-")
        except: pass

        best_offer_data = None
        min_price = float('inf')
        is_in_catalog_global = False
        time.sleep(0.5)

        for i in range(3):
            try:
                offer_loc = page.locator(f"[data-qa='mfeCtaMain#offer{i}']")
                if not offer_loc.is_visible(): continue

                offer_text = offer_loc.inner_text()
                try:
                    radio = offer_loc.locator("input[type='radio']")
                    if radio.count() > 0 and "UPSELL_PS_PLUS_GAME_CATALOG" in radio.get_attribute("value"):
                        is_in_catalog_global = True
                except: pass

                if not is_in_catalog_global and ("게임 카탈로그" in offer_text or "스페셜에 가입" in offer_text):
                    is_in_catalog_global = True

                try:
                    price_loc = offer_loc.locator(f"[data-qa='mfeCtaMain#offer{i}#finalPrice']")
                    if not price_loc.is_visible(): continue
                    current_price = int(re.sub(r'[^0-9]', '', price_loc.inner_text().strip()))
                    if current_price == 0: continue
                except: continue

                original_price = current_price
                try:
                    orig_loc = offer_loc.locator(f"[data-qa='mfeCtaMain#offer{i}#originalPrice']")
                    if orig_loc.is_visible(): original_price = int(re.sub(r'[^0-9]', '', orig_loc.inner_text()))
                except: pass

                is_plus_exclusive = False
                try:
                    if offer_loc.locator(".psw-c-t-ps-plus").count() > 0: is_plus_exclusive = True
                except: pass

                sale_end_date = None
                try:
                    desc_loc = offer_loc.locator(f"[data-qa='mfeCtaMain#offer{i}#discountDescriptor']")
                    if desc_loc.is_visible():
                        match = re.search(r'(\d{4})[./-](\d{1,2})[./-](\d{1,2})', desc_loc.inner_text())
                        if match: sale_end_date = f"{match.group(1)}-{match.group(2).zfill(2)}-{match.group(3).zfill(2)}"
                except: pass

                if current_price < min_price:
                    min_price = current_price
                    discount_rate = int(round(((original_price - current_price) / original_price) * 100)) if original_price > current_price else 0
                    best_offer_data = {
                        "originalPrice": original_price, "currentPrice": current_price,
                        "discountRate": discount_rate, "saleEndDate": sale_end_date, "isPlusExclusive": is_plus_exclusive
                    }
            except: continue

        if not best_offer_data: return None

        image_url = ""
        try:
            temp_html_img = page.content()
            match = re.search(r'(https://image\.api\.playstation\.com/vulcan/[^"\'\s>]+)', temp_html_img)
            if match: image_url = match.group(1).split("?")[0]
            del temp_html_img

            if not image_url:
                img_loc = page.locator("img[data-qa='gameBackgroundImage#heroImage#image']")
                if img_loc.count() > 0: image_url = img_loc.first.get_attribute("src").split("?")[0]
        except: pass

        ps_store_id = target_url.split("/")[-1].split("?")[0]

        payload = {
            "psStoreId": ps_store_id, "title": title, "englishTitle": english_title, "publisher": publisher,
            "imageUrl": image_url, "description": "Full Data Crawler", "genreIds": genre_ids, "releaseDate": release_date,
            "originalPrice": best_offer_data["originalPrice"], "currentPrice": best_offer_data["currentPrice"],
            "discountRate": best_offer_data["discountRate"], "saleEndDate": best_offer_data["saleEndDate"],
            "isPlusExclusive": best_offer_data["isPlusExclusive"], "inCatalog": is_in_catalog_global, "platforms": platforms,
            "isPs5ProEnhanced": is_ps5_pro_enhanced
        }

        # 오리지널 API(JAVA_API_URL)로 데이터 전송
        try:
            res = session.post(JAVA_API_URL, json=payload, timeout=30)
            if res.status_code == 200: logger.info(f"   📤 Sent: {title} ({payload['currentPrice']} KRW)")
            else: logger.error(f"   💥 Server Error ({res.status_code}): {title}")
        except Exception as e: logger.error(f"   💥 Network Error sending {title}: {e}")

        return payload
    except Exception as e:
        logger.error(f"   Error: {target_url} -> {e}")
        return None


# --- [7. 유틸리티 (디스코드, 타겟조회, 캐시초기화)] ---
def fetch_update_targets():
    try:
        res = session.get(TARGET_API_URL, timeout=10)
        if res.status_code == 200:
            targets = res.json()
            logger.info(f"📥 Received {len(targets)} targets.")
            return targets
    except Exception as e:
        logger.error(f"Connection Error: {e}")
    return []

def send_discord_summary(total_scanned, deals_list, delisted_games):
    if not DISCORD_WEBHOOK_URL: return
    try:
        total_deals, total_delisted = len(deals_list), len(delisted_games)
        if total_deals == 0 and total_delisted == 0: return

        message = f"## 📢 [PS-Tracker] 일일 수집 리포트 ({CURRENT_MODE})\n"
        message += f"**🗓️ 날짜:** {datetime.now().strftime('%Y-%m-%d')}\n"
        message += f"**📊 통계:** 총 `{total_scanned}`개 스캔 / **`{total_deals}`**개 할인 감지! 🔥\n━━━━━━━━━━━━━━━━━━\n"

        if total_delisted > 0:
            message += "🚨 **[주의] 단종 의심 게임 (수동 삭제 필요)** 🚨\n"
            for g in delisted_games: message += f"• ID: `{g['ps_store_id']}`\n"
            message += "━━━━━━━━━━━━━━━━━━\n"

        if total_deals > 0:
            message += "**🏆 오늘의 Top 5 할인**\n"
            sorted_deals = sorted(deals_list, key=lambda x: x['discountRate'], reverse=True)[:5]
            for i, game in enumerate(sorted_deals, 1):
                sale_price = "{:,}".format(game['currentPrice'])
                plat_str = f" | `{'/'.join(game.get('platforms', []))}`" if game.get('platforms') else ""
                message += f"{i}️⃣ **[{game['discountRate']}%] {game['title']}**\n　 💰 **₩{sale_price}**{plat_str}\n　 ⏳ ~{game['saleEndDate'] or '상시 종료'}\n"
                if i < len(sorted_deals): message += "───\n"
            message += "━━━━━━━━━━━━━━━━━━\n"
            if total_deals > 5: message += f"외 **{total_deals - 5}**개의 할인이 더 있습니다!\n"

        message += "\n[🔗 실시간 최저가 확인하기](https://ps-signal.com)"
        requests.post(DISCORD_WEBHOOK_URL, json={"content": message})
    except Exception as e: logger.error(f"❌ Failed to send Discord summary: {e}")

def refresh_java_server_cache():
    if not CRAWLER_SECRET_KEY: return
    try:
        headers = {"X-Internal-Secret": CRAWLER_SECRET_KEY}
        res = requests.post(INSIGHT_REFRESH_API_URL, headers=headers, timeout=10)
        if res.status_code == 200: logger.info("🧹 Java Server Insights Cache cleared successfully!")
    except Exception as e: logger.error(f"❌ Network Error while clearing cache: {e}")


# --- [8. 메인 배치 로직] ---
def run_batch_crawler_logic():
    global is_batch_running

    with crawler_lock:
        if is_batch_running:
            return
        is_batch_running = True

    logger.info(f"[Crawler] Started. Mode: {CURRENT_MODE} (Safe Process Reset)")

    total_processed_count = 0
    collected_deals = []
    delisted_games = []
    visited_urls = set()

    try:
        with sync_playwright() as p:
            bm = BrowserManager(p)

            # [Phase 0] 신작 수집소
            try: crawl_phase0_new_releases(bm)
            except Exception as e: logger.error(f"🔥 Phase 0 Error: {e}")

            targets = fetch_update_targets()

            # [Phase 1] 기존 타겟 갱신
            if targets:
                logger.info(f"🔄 [Phase 1] Updating {len(targets)} tracked games...")
                for idx, url in enumerate(targets, 1):
                    check_and_run_vip(bm) # 루프마다 VIP 새치기 확인
                    logger.info(f"   ▶️ [Phase 1] ({idx}/{len(targets)}) Scraping: {url.split('/')[-1][:15]}...")

                    page = setup_page(bm.get_context())
                    try:
                        res = crawl_detail_and_send(page, url)
                        if res:
                            if res.get("is_delisted"): delisted_games.append(res)
                            else:
                                total_processed_count += 1
                                if res.get('discountRate', 0) > 0: collected_deals.append(res)
                        visited_urls.add(url)
                    except Exception as e:
                        logger.error(f"   🔥 Page Crawl Error for {url}: {e}")
                    finally:
                        page.close()
                        bm.increment()

            # [Phase 2] 신규 게임 탐색
            logger.info(f"🔭 [Phase 2] Starting Deep Discovery ...")
            base_category_path = "https://store.playstation.com/ko-kr/category/3f772501-f6f8-49b7-abac-874a88ca4897"
            search_params = "?FULL_GAME=storeDisplayClassification&GAME_BUNDLE=storeDisplayClassification&PREMIUM_EDITION=storeDisplayClassification"

            for current_page in range(1, 11):
                logger.info(f"   📖 Scanning Category Page {current_page}/10")
                page_candidates = []

                cat_page = setup_page(bm.get_context())
                try:
                    target_list_url = f"{base_category_path}/{current_page}{search_params}"
                    cat_page.goto(target_list_url, timeout=CONF['timeout'], wait_until="commit")
                    try: cat_page.wait_for_selector("a[href*='/product/']", timeout=10000)
                    except:
                        cat_page.reload(timeout=CONF['timeout'], wait_until="commit")
                        cat_page.wait_for_selector("a[href*='/product/']", timeout=10000)

                    human_like_scroll(cat_page)

                    for el in cat_page.locator("a[href*='/product/']").all():
                        url = el.get_attribute("href")
                        if url:
                            full_url = f"https://store.playstation.com{url}" if url.startswith("/") else url
                            if "/ko-kr/product/" in full_url and full_url not in visited_urls:
                                if full_url not in page_candidates: page_candidates.append(full_url)
                except Exception as e: logger.warning(f"   ⚠️ List load failed: {e}")
                finally:
                    cat_page.close()
                    bm.increment()

                if page_candidates:
                    logger.info(f"      Found {len(page_candidates)} new candidates.")
                    for url in page_candidates:
                        check_and_run_vip(bm)

                        detail_page = setup_page(bm.get_context())
                        try:
                            res = crawl_detail_and_send(detail_page, url)
                            if res:
                                if res.get("is_delisted"): delisted_games.append(res)
                                else:
                                    total_processed_count += 1
                                    if res.get('discountRate', 0) > 0: collected_deals.append(res)
                            visited_urls.add(url)
                        except Exception as e:
                            logger.error(f"   🔥 Page Crawl Error for {url}: {e}")
                        finally:
                            detail_page.close()
                            bm.increment()

        logger.info("   🏁 [System] Marathon finished. Sending reports...")
        send_discord_summary(total_processed_count, collected_deals, delisted_games)
        refresh_java_server_cache()

    except Exception as e:
        logger.error(f"Critical Error: {e}")
        logger.error(traceback.format_exc())
    finally:
        with crawler_lock:
            is_batch_running = False
        logger.info("Crawler finished.")


# --- [9. Flask API 라우팅] ---
# 단건 수집 API
@app.route('/crawl/single', methods=['POST'])
def crawl_single_url():
    data = request.json or {}
    if not verify_secret(data): return jsonify({"error": "Unauthorized"}), 403

    target_url = data.get('url')
    if not target_url: return jsonify({"error": "URL is required"}), 400

    if is_batch_running or is_ranking_running or is_vip_running or is_rating_running:
        return jsonify({"status": "error", "message": "다른 수집 작업이 실행 중입니다. 잠시 후 시도해주세요."}), 429

    logger.info(f"🎯 Single Crawl Request: {target_url}")
    result = None

    try:
        with sync_playwright() as p:
            bm = BrowserManager(p)
            page = setup_page(bm.get_context())
            try:
                result = crawl_detail_and_send(page, target_url, verbose=True)
            finally:
                page.close()
                try: bm.context.close()
                except: pass
                try: bm.browser.close()
                except: pass
                gc.collect()

        if result:
            if result.get("is_delisted"): return jsonify({"status": "error", "message": "단종된 게임입니다."}), 404
            return jsonify({"status": "success", "data": result}), 200
        else:
            return jsonify({"status": "failed", "message": "Failed to parse data"}), 500
    except Exception as e:
        logger.error(f"🔥 Single Crawl Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/crawler/trigger', methods=['POST'])
def trigger_queue_crawl():
    data = request.json or {}
    if not verify_secret(data): return jsonify({"error": "Unauthorized"}), 403

    request_id, ps_store_id = data.get('requestId'), data.get('psStoreId')
    if not request_id or not ps_store_id: return jsonify({"error": "Bad Request"}), 400

    global is_vip_running, is_batch_running, is_ranking_running, active_requests

    with crawler_lock:
        if request_id in active_requests:
            return jsonify({"status": "ignored", "message": "Already processing"}), 200

        active_requests.add(request_id)
        urgent_queue.put({"request_id": request_id, "ps_store_id": ps_store_id})

    if not is_batch_running and not is_vip_running and not is_ranking_running and not is_rating_running:
        threading.Thread(target=run_vip_only_logic, daemon=True).start()
        logger.info(f"[VIP Worker] 새치기 전담 스레드 즉시 출발!")
        return jsonify({"status": "accepted", "message": "VIP task started"}), 202
    else:
        logger.info(f"[VIP Queue] 대기열 등록 (작업 중 새치기 대기)")
        return jsonify({"status": "accepted", "message": "Added to VIP queue"}), 202

@app.route('/run', methods=['POST'])
def trigger_crawl():
    data = request.json or {}
    if not verify_secret(data): return jsonify({"error": "Unauthorized"}), 403

    with crawler_lock:
        if is_batch_running or is_ranking_running or is_vip_running or is_rating_running:
            return jsonify({"status": "running", "message": "다른 작업이 이미 실행 중입니다."}), 409

    threading.Thread(target=run_batch_crawler_logic, daemon=True).start()
    return jsonify({"status": "started"}), 200

def run_ranking_wrapper():
    global is_ranking_running

    with crawler_lock:
        is_ranking_running = True

    try:
        ranking_crawler.main()
    finally:
        with crawler_lock:
            is_ranking_running = False
        logger.info("[Ranking] 랭킹 수집 종료. 시스템 상태 초기화.")

@app.route('/run-ranking', methods=['POST'])
def trigger_ranking_crawl():
    data = request.json or {}
    if not verify_secret(data): return jsonify({"error": "Unauthorized"}), 403

    with crawler_lock:
        if is_batch_running or is_ranking_running or is_vip_running or is_rating_running:
            logger.warning("다른 작업이 실행 중이라 랭킹 업데이트 요청을 거절합니다.")
            return jsonify({"status": "error", "message": "Other task is running"}), 409

    logger.info("[API] 랭킹 크롤러 백그라운드 실행 요청 수신")
    threading.Thread(target=run_ranking_wrapper, daemon=True).start()
    return jsonify({"status": "started", "message": "Ranking crawler triggered"}), 200

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "UP", "running": is_batch_running}), 200

if __name__ == '__main__':
    threading.Thread(
            target=rating_worker.start_polling,
            args=(BASE_URL, CRAWLER_SECRET_KEY),
            daemon=True
        ).start()

    app.run(host='0.0.0.0', port=5000, threaded=True, use_reloader=False)