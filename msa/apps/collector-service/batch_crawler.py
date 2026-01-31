import random
import os
import time
import re
import threading
import logging
import traceback
from logging.handlers import RotatingFileHandler
from datetime import datetime

# [Playwright Imports]
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

from flask import Flask, jsonify
import requests

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
logger.addHandler(file_handler)
logger.addHandler(console_handler)

logging.getLogger('werkzeug').setLevel(logging.ERROR)

app = Flask(__name__)
session = requests.Session()
session.headers.update({'Connection': 'keep-alive'})

# [환경 변수]
BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8080")
JAVA_API_URL = f"{BASE_URL}/api/v1/games/collect"
TARGET_API_URL = f"{BASE_URL}/api/v1/games/targets"
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")

lock = threading.Lock()
is_running = False

# [설정 유지]
CURRENT_MODE = os.getenv("CRAWLER_MODE", "LOW").upper()
CONFIG = {
    "LOW": {
        "restart_interval": 50,
        "page_restart_interval": 5,
        "timeout": 60000,
        "sleep_min": 2.0,
        "sleep_max": 4.0,
        "block_fonts": True,
    },
    "HIGH": {
        "restart_interval": 200,
        "page_restart_interval": 20,
        "timeout": 30000,
        "sleep_min": 1.0,
        "sleep_max": 3.0,
        "block_fonts": False,
    }
}
CONF = CONFIG.get(CURRENT_MODE, CONFIG["LOW"])
logger.info(f"🔧 Crawler Config: {CURRENT_MODE} | Engine: Playwright (Manual Stealth)")


# --- [2. 브라우저 및 페이지 설정] ---
def create_browser_context(p):
    """브라우저 실행 및 컨텍스트 설정 (최적화 버전)"""

    # [설정 유지] 기존 User-Agent 리스트
    DESKTOP_USER_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    ]
    user_agent = random.choice(DESKTOP_USER_AGENTS)

    browser = p.chromium.launch(
        headless=True,
        args=[
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-extensions",
            "--disable-blink-features=AutomationControlled" # 1차 방어
        ]
    )

    context = browser.new_context(
        user_agent=user_agent,
        viewport={"width": 1920, "height": 1080},
        locale="ko-KR",
        timezone_id="Asia/Seoul"
    )

    return browser, context

def setup_page(context):
    """페이지 생성 및 수동 스텔스 적용"""
    page = context.new_page()

    # 라이브러리 대신 수동 스텔스 적용
    page.add_init_script("""
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
        });
    """)

    # [리소스 차단] 설정에 따라 폰트 차단 여부 결정
    def route_intercept(route):
        r_type = route.request.resource_type

        # 이미지, 미디어는 무조건 차단 (속도)
        if r_type in ["image", "media"]:
            route.abort()
            return

        # 폰트: 설정에 따라 차단 (LOW 모드)
        if CONF.get("block_fonts", False) and r_type == "font":
            route.abort()
            return

        route.continue_()

    page.route("**/*", route_intercept)
    return page

def mine_english_title(html_content):
    try:
        match = re.search(r'"invariantName"\s*:\s*"([^"]+)"', html_content)
        if match:
            raw_title = match.group(1)
            try: raw_title = raw_title.encode('utf-8').decode('unicode_escape')
            except: pass
            raw_title = raw_title.replace("’", "'").replace("‘", "'")
            return re.sub(r'[™®â¢]', '', raw_title).strip()
    except: return None
    return None

def capture_error_snapshot(page, error_msg):
    try:
        timestamp = datetime.now().strftime("%H%M%S")
        filepath = f"/app/logs/error_{timestamp}.png"
        page.screenshot(path=filepath, full_page=False)
        logger.warning(f"📸 Screenshot saved: error_{timestamp}.png")
    except Exception as e:
        logger.error(f"📸 Screenshot Failed ({error_msg}): {e}")

def crawl_detail_and_send(page, target_url):
    try:
        page.goto(target_url, timeout=CONF['timeout'], wait_until="commit")

        # 1. 제목 로딩 대기
        try:
            page.wait_for_selector("[data-qa='mfe-game-title#name']", state="attached", timeout=30000)
        except PlaywrightTimeoutError:
            logger.warning(f"⏳ Title Load Timeout: {target_url}")
            try:
                page.reload(wait_until="commit")
                # 2차 시도: 20초 추가 대기
                page.wait_for_selector("[data-qa='mfe-game-title#name']", state="attached", timeout=20000)
                logger.info("   ♻️ Reloaded & Found title!")
            except PlaywrightTimeoutError:
                # 2번 다 실패하면 진짜 실패
                logger.error(f"❌ Final Title Timeout: {target_url}")
                return None

        # 2. 데이터 추출
        try:
            title = page.locator("[data-qa='mfe-game-title#name']").inner_text().strip()
        except: return None

        english_title = mine_english_title(page.content())

        # 플랫폼
        platform_set = set()
        try:
            tag_elements = page.locator("[data-qa^='mfe-game-title#productTag']").all()
            for el in tag_elements:
                raw_text = el.text_content().strip().upper()
                if "PS5" in raw_text: platform_set.add("PS5")
                if "PS4" in raw_text: platform_set.add("PS4")
                if "VR2" in raw_text: platform_set.add("PS_VR2")
                elif "VR" in raw_text: platform_set.add("PS_VR")
            platforms = list(platform_set)
        except: platforms = []

        genre_ids = ""
        try:
            genre_ids = page.locator("[data-qa='gameInfo#releaseInformation#genre-value']").inner_text()
        except: pass

        # 4. 가격 로직
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
                    if radio.count() > 0:
                        val = radio.get_attribute("value")
                        if val and "UPSELL_PS_PLUS_GAME_CATALOG" in val:
                            is_in_catalog_global = True
                except: pass

                if not is_in_catalog_global:
                    if "게임 카탈로그" in offer_text or "스페셜에 가입" in offer_text:
                        is_in_catalog_global = True

                try:
                    price_loc = offer_loc.locator(f"[data-qa='mfeCtaMain#offer{i}#finalPrice']")
                    if not price_loc.is_visible(): continue
                    price_text = price_loc.inner_text().strip()
                    current_price = int(re.sub(r'[^0-9]', '', price_text))
                    if current_price == 0: continue
                except: continue

                original_price = current_price
                try:
                    orig_loc = offer_loc.locator(f"[data-qa='mfeCtaMain#offer{i}#originalPrice']")
                    if orig_loc.is_visible():
                        orig_text = orig_loc.inner_text()
                        original_price = int(re.sub(r'[^0-9]', '', orig_text))
                except: pass

                is_plus_exclusive = False
                try:
                    if offer_loc.locator(".psw-c-t-ps-plus").count() > 0:
                        is_plus_exclusive = True
                except: pass

                sale_end_date = None
                try:
                    desc_loc = offer_loc.locator(f"[data-qa='mfeCtaMain#offer{i}#discountDescriptor']")
                    if desc_loc.is_visible():
                        desc_text = desc_loc.inner_text()
                        match = re.search(r'(\d{4})[./-](\d{1,2})[./-](\d{1,2})', desc_text)
                        if match:
                            sale_end_date = f"{match.group(1)}-{match.group(2).zfill(2)}-{match.group(3).zfill(2)}"
                except: pass

                if current_price < min_price:
                    min_price = current_price
                    discount_rate = 0
                    if original_price > current_price:
                        discount_rate = int(round(((original_price - current_price) / original_price) * 100))

                    best_offer_data = {
                        "originalPrice": original_price,
                        "currentPrice": current_price,
                        "discountRate": discount_rate,
                        "saleEndDate": sale_end_date,
                        "isPlusExclusive": is_plus_exclusive
                    }
            except: continue

        if not best_offer_data:
            if is_in_catalog_global:
                 logger.info(f"   ℹ️ Catalog Only: {title}")
            return None

        # 5. 이미지 URL (차단했지만 속성은 존재할 수 있음)
        image_url = ""
        try:
            img_loc = page.locator("img[data-qa='gameBackgroundImage#heroImage#image']")
            if img_loc.count() > 0:
                image_url = img_loc.get_attribute("src").split("?")[0]
        except: pass

        ps_store_id = target_url.split("/")[-1].split("?")[0]

        payload = {
            "psStoreId": ps_store_id,
            "title": title,
            "englishTitle": english_title,
            "publisher": "Batch Crawler",
            "imageUrl": image_url,
            "description": "Full Data Crawler",
            "genreIds": genre_ids,
            "originalPrice": best_offer_data["originalPrice"],
            "currentPrice": best_offer_data["currentPrice"],
            "discountRate": best_offer_data["discountRate"],
            "saleEndDate": best_offer_data["saleEndDate"],
            "isPlusExclusive": best_offer_data["isPlusExclusive"],
            "inCatalog": is_in_catalog_global,
            "platforms": platforms
        }

        send_data_to_server(payload, title)
        return payload

    except Exception as e:
        logger.error(f"   🔥 Error: {target_url} -> {e}")
        return None

def send_data_to_server(payload, title):
    try:
        res = session.post(JAVA_API_URL, json=payload, timeout=30)
        if res.status_code == 200:
            logger.info(f"   📤 Sent: {title} ({payload['currentPrice']} KRW)")
        else:
            logger.error(f"   💥 Server Error ({res.status_code}): {title}")
    except requests.exceptions.Timeout:
        logger.error(f"   ⏳ Timeout Error: Server took too long to respond for {title}")
    except Exception as e:
        logger.error(f"   💥 Network Error sending {title}: {e}")

def fetch_update_targets():
    try:
        res = session.get(TARGET_API_URL, timeout=10)
        if res.status_code == 200:
            targets = res.json()
            logger.info(f"📥 Received {len(targets)} targets.")
            return targets
    except Exception as e:
        logger.error(f"❌ Connection Error: {e}")
    return []

def send_discord_summary(total_scanned, deals_list):
    if not DISCORD_WEBHOOK_URL: return
    try:
        total_deals = len(deals_list)
        if total_deals == 0:
            logger.info("📭 No deals found today. Skipping Discord report.")
            return

        sorted_deals = sorted(deals_list, key=lambda x: x['discountRate'], reverse=True)
        top_5 = sorted_deals[:5]

        message = f"## 📢 [PS-Tracker] 일일 수집 리포트 ({CURRENT_MODE})\n"
        message += f"**🗓️ 날짜:** {datetime.now().strftime('%Y-%m-%d')}\n"
        message += f"**📊 통계:** 총 `{total_scanned}`개 스캔 / **`{total_deals}`**개 할인 감지! 🔥\n"
        message += "━━━━━━━━━━━━━━━━━━"

        message += "**🏆 오늘의 Top 5 할인**\n"
        for i, game in enumerate(top_5, 1):
            sale_price = "{:,}".format(game['currentPrice'])
            plat_list = game.get('platforms', [])
            plat_str = f" | `{'/'.join(plat_list)}`" if plat_list else ""
            message += f"{i}️⃣ **[{game['discountRate']}%] {game['title']}**\n"
            message += f"　 💰 **₩{sale_price}**{plat_str}\n"
            message += f"　 ⏳ ~{game['saleEndDate'] or '상시 종료'}\n"
            if i < len(top_5): message += "───\n"

        message += "━━━━━━━━━━━━━━━━━━\n"
        if total_deals > 5:
            message += f"외 **{total_deals - 5}**개의 할인이 더 있습니다!\n"
        message += "\n[🔗 실시간 최저가 확인하기](https://ps-signal.com)"

        requests.post(DISCORD_WEBHOOK_URL, json={"content": message})
        logger.info("🔔 Discord Summary Report sent!")

    except Exception as e:
        logger.error(f"❌ Failed to send Discord summary: {e}")


# --- [4. 메인 실행 로직] ---
def run_batch_crawler_logic():
    global is_running
    logger.info(f"🚀 [Crawler] Started. Mode: {CURRENT_MODE} (Playwright)")

    p = None
    browser = None
    context = None
    page = None

    total_processed_count = 0
    collected_deals = []

    try:
        with sync_playwright() as p:
            # 1. 초기 브라우저 생성
            browser, context = create_browser_context(p)
            page = setup_page(context)

            visited_urls = set()

            # ------------------------------------------------------------------
            # [Phase 1] 기존 타겟 갱신
            # ------------------------------------------------------------------
            targets = fetch_update_targets()
            if targets:
                logger.info(f"🔄 [Phase 1] Updating {len(targets)} tracked games...")
                for i, url in enumerate(targets):
                    if not is_running: break

                    # [메모리 관리] 주기적으로 브라우저 컨텍스트 환기
                    if i > 0 and i % CONF["restart_interval"] == 0:
                        logger.info("♻️ [Phase 1] Context Cleanup...")
                        context.close()
                        browser, context = create_browser_context(p)
                        page = setup_page(context)

                    res = crawl_detail_and_send(page, url)
                    if res:
                        total_processed_count += 1
                        if res.get('discountRate', 0) > 0: collected_deals.append(res)
                    visited_urls.add(url)

                    time.sleep(random.uniform(CONF["sleep_min"], CONF["sleep_max"]))

            # ------------------------------------------------------------------
            # [Phase 2] 신규 게임 탐색 (User Provided Logic)
            # ------------------------------------------------------------------
            if is_running:
                logger.info(f"🔭 [Phase 2] Starting Deep Discovery ...")
                base_category_path = "https://store.playstation.com/ko-kr/category/3f772501-f6f8-49b7-abac-874a88ca4897"
                search_params = "?FULL_GAME=storeDisplayClassification&GAME_BUNDLE=storeDisplayClassification&PREMIUM_EDITION=storeDisplayClassification"

                current_page = 1
                max_pages = 10

                while current_page <= max_pages:
                    if not is_running: break

                    # [메모리 관리 2] Phase 2 리프레시 로직
                    if current_page > 1 and current_page % CONF["page_restart_interval"] == 0:
                        logger.info(f"♻️ [Phase 2] Context Cleanup (Page {current_page})...")
                        try:
                            context.close()
                            # [안전장치] 브라우저가 죽었을 수도 있으니 확인 후 재생성
                            if not browser.is_connected():
                                logger.warning("   ⚠️ Browser disconnected. Relaunching...")
                                browser.close()
                                browser = p.chromium.launch(
                                    headless=True,
                                    args=[
                                        "--no-sandbox",
                                        "--disable-setuid-sandbox",
                                        "--disable-dev-shm-usage",
                                        "--disable-gpu",
                                        "--disable-extensions",
                                        "--disable-blink-features=AutomationControlled"
                                    ]
                                )
                            browser, context = create_browser_context(p)
                            page = setup_page(context)
                        except Exception as e:
                            logger.error(f"   🔥 Cleanup Error: {e}. Force Restarting Browser.")
                            # 최악의 경우 브라우저 전체 재시작
                            try: browser.close()
                            except: pass
                            browser, context = create_browser_context(p)
                            page = setup_page(context)

                    target_list_url = f"{base_category_path}/{current_page}{search_params}"
                    logger.info(f"   📖 Scanning Page {current_page}/{max_pages}")

                    try:
                        page.goto(target_list_url, timeout=CONF['timeout'], wait_until="commit")

                        # 리스트 요소 대기
                        try:
                            page.wait_for_selector("a[href*='/product/']", timeout=10000)
                        except:
                            logger.warning(f"   ⚠️ Page load timeout. Retrying...")
                            try:
                                page.reload(timeout=CONF['timeout'], wait_until="commit")
                                page.wait_for_selector("a[href*='/product/']", timeout=10000)
                            except: pass

                        # 스크롤 (Lazy Loading 대응)
                        page.evaluate(f"window.scrollTo(0, {random.randint(800, 1200)});")
                        time.sleep(random.uniform(0.5, 1.0))
                        page.evaluate(f"window.scrollTo(0, {random.randint(3000, 4500)});")
                        time.sleep(random.uniform(1.0, 2.0))

                    except Exception as e:
                        logger.warning(f"   ⚠️ List load failed page {current_page}. Skip. ({e})")
                        current_page += 1
                        continue

                    page_candidates = []
                    try:
                        links = page.locator("a[href*='/product/']").all()
                        for el in links:
                            url = el.get_attribute("href")
                            if url:
                                full_url = f"https://store.playstation.com{url}" if url.startswith("/") else url
                                if "/ko-kr/product/" in full_url and full_url not in visited_urls:
                                    if full_url not in page_candidates:
                                        page_candidates.append(full_url)
                    except: pass

                    if not page_candidates:
                        logger.info(f"🛑 No new games found on page {current_page}. Finishing Phase 2.")
                        break

                    logger.info(f"      Found {len(page_candidates)} new candidates.")

                    for url in page_candidates:
                        if not is_running: break
                        res = crawl_detail_and_send(page, url)
                        if res:
                            total_processed_count += 1
                            if res.get('discountRate', 0) > 0: collected_deals.append(res)
                        visited_urls.add(url)
                        time.sleep(random.uniform(CONF["sleep_min"], CONF["sleep_max"]))

                    current_page += 1
                    time.sleep(random.uniform(CONF["sleep_min"], CONF["sleep_max"]))

            # 리포트 전송
            send_discord_summary(total_processed_count, collected_deals)

    except Exception as e:
        logger.error(f"Critical Error: {e}")
        logger.error(traceback.format_exc())
    finally:
        try:
            if context: context.close()
        except: pass

        try:
            if browser: browser.close()
        except: pass

        with lock: is_running = False
        logger.info("🏁 Crawler finished.")

@app.route('/run', methods=['POST'])
def trigger_crawl():
    global is_running
    with lock:
        if is_running: return jsonify({"status": "running"}), 409
        is_running = True
    thread = threading.Thread(target=run_batch_crawler_logic)
    thread.daemon = True
    thread.start()
    return jsonify({"status": "started"}), 200

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "UP", "running": is_running}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)