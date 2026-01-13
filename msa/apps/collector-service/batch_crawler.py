import random
import os
import time
import json
import requests
import traceback
import re
import threading
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime, timedelta, timezone
from flask import Flask, jsonify

import undetected_chromedriver as uc
from fake_useragent import UserAgent

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException

# --- [설정 및 로깅 초기화] ---
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

app = Flask(__name__)
session = requests.Session()
session.headers.update({'Connection': 'keep-alive'})

BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8080")
JAVA_API_URL = f"{BASE_URL}/api/v1/games/collect"
TARGET_API_URL = f"{BASE_URL}/api/v1/games/targets"
SELENIUM_URL = os.getenv("SELENIUM_URL")
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")

lock = threading.Lock()
is_running = False

# =========================================================
# ⚙️ 하이브리드 모드 설정 (JSON 엔진 최적화)
# =========================================================
CURRENT_MODE = os.getenv("CRAWLER_MODE", "LOW").upper()

CONFIG = {
    "LOW": {  # 🐢 오라클 프리티어
        "restart_interval": 50,
        "page_load_strategy": "none",
        "sleep_min": 4.5,
        "sleep_max": 6.5,
        "timeout": 12,
        "use_cdp_block": True,
        "window_stop": True
    },
    "HIGH": { # 🏎️ 고사양 서버/PC
        "restart_interval": 500,
        "page_load_strategy": "normal",
        "sleep_min": 2.0,
        "sleep_max": 3.5,
        "timeout": 15,
        "use_cdp_block": False,
        "window_stop": False
    }
}

CONF = CONFIG.get(CURRENT_MODE, CONFIG["LOW"])

logger.info(f"🔧 Crawler Mode Initialized: [{CURRENT_MODE}]")
logger.info(f"   👉 Strategy: {CONF['page_load_strategy']} | Restart: {CONF['restart_interval']}")
# =========================================================


def get_driver():
    """드라이버 설정"""
    ua = UserAgent()
    random_user_agent = ua.random
    logger.info(f"🎭 Generated User-Agent: {random_user_agent}")

    w = random.randint(1800, 1920)
    h = random.randint(950, 1080)
    random_window_size = f"{w},{h}"

    driver = None

    prefs = {
        "profile.managed_default_content_settings.images": 2,
        "profile.default_content_setting_values.notifications": 2,
        "profile.default_content_setting_values.popups": 2,
        "disk-cache-size": 4096
    }

    if SELENIUM_URL:
        logger.info(f"🌐 [Docker Mode] Grid: {SELENIUM_URL}")
        options = webdriver.ChromeOptions()
        options.page_load_strategy = CONF['page_load_strategy']
        options.add_argument(f"user-agent={random_user_agent}")
        options.add_argument(f"--window-size={random_window_size}")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")

        if CURRENT_MODE == "LOW":
            options.add_argument("--disable-extensions")
            options.add_argument("--disable-background-networking")

        options.add_experimental_option("prefs", prefs)
        driver = webdriver.Remote(command_executor=SELENIUM_URL, options=options)

    else:
        logger.info(f"💻 [Local Mode] Starting Chrome ({CURRENT_MODE} Spec)")
        options = uc.ChromeOptions()
        options.page_load_strategy = CONF['page_load_strategy']

        if os.getenv("HEADLESS", "false").lower() == "true":
             options.add_argument("--headless=new")

        options.add_argument(f"user-agent={random_user_agent}")
        options.add_argument(f"--window-size={random_window_size}")
        options.add_argument("--disable-popup-blocking")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")

        driver = uc.Chrome(options=options, use_subprocess=True)

    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

    if CONF["use_cdp_block"]:
        try:
            driver.execute_cdp_cmd("Network.setBlockedURLs", {
                "urls": ["*.png", "*.jpg", "*.gif", "*.webp", "*.css", "*.woff", "*.woff2", "*google-analytics*"]
            })
            driver.execute_cdp_cmd("Network.enable", {})
        except Exception:
            pass

    return driver

def clean_text(text):
    """
    문자열 세탁 함수:
    1. None 체크
    2. 상표권 기호(™, ®, ©) 제거
    3. 스마트 쿼트(’, “)를 일반 따옴표로 변환
    4. 앞뒤 공백 제거
    """
    if not text:
        return ""

    # [Step 1] 특수 문자 / 상표권 기호 제거 (필요한 것만 콕 집어서)
    # \u2122(TM), \u00ae(R), \u00a9(C) 등
    text = re.sub(r'[™®©℠]', '', text)

    # [Step 2] 따옴표 정규화 (맥/워드에서 붙는 둥근 따옴표 처리)
    text = text.replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"')

    # [Step 3] 이상한 공백 제거 (Zero-width space 등)
    # \s+ 는 모든 공백(줄바꿈 포함)을 찾아서 단일 스페이스로 치환
    text = re.sub(r'\s+', ' ', text)

    return text.strip()

def extract_ps_store_data(html_source, target_url):
    """HTML 소스에서 JSON 데이터를 추출 (가격 정보 보유 스크립트 우선 선별 + KST)"""
    try:
        pattern = r'<script id="env:[^"]+" type="application/json">(.*?)</script>'
        matches = re.findall(pattern, html_source)

        if not matches:
            return None

        best_json_str = None
        max_score = -1

        for json_str in matches:
            try:
                data = json.loads(json_str)
                cache = data.get("cache", {})

                score = 0
                has_name = False
                has_price = False

                for k, v in cache.items():
                    score += 1 # 기본 점수 (데이터 양)

                    # Product 타입이면서 이름이 있는지 확인
                    if v.get("__typename") == "Product" and v.get("name"):
                        has_name = True

                        # [New] 가격 정보(webctas)가 실제로 존재하는지 확인
                        webctas = v.get("webctas", [])
                        if webctas:
                            for cta_ref in webctas:
                                cta_key = cta_ref.get("__ref")
                                cta_obj = cache.get(cta_key)
                                # 가격 객체와 금액 정보가 있는지 깊게 검사
                                if cta_obj and cta_obj.get("price") and cta_obj["price"].get("basePrice"):
                                    has_price = True
                                    break

                # 점수 계산
                if has_name:
                    score += 100000   # 이름 있으면 10만점
                if has_price:
                    score += 500000   # 가격까지 있으면 50만점 (무조건 1순위)

                if score > max_score:
                    max_score = score
                    best_json_str = json_str
            except:
                continue

        # Fallback
        if not best_json_str:
            best_json_str = max(matches, key=len)

        data = json.loads(best_json_str)
        cache = data.get("cache", {})

        product_data = None

        def is_valid_product(obj):
            if not obj or obj.get("__typename") != "Product": return False
            return bool(obj.get("webctas"))

        # Main Product 찾기 (ROOT_QUERY -> ID 매칭 순)
        root_query = cache.get("ROOT_QUERY", {})
        for key, val in root_query.items():
            if "productRetrieve" in key and isinstance(val, dict) and "__ref" in val:
                candidate = cache.get(val["__ref"])
                if is_valid_product(candidate):
                    product_data = candidate
                    break
                elif candidate and not product_data:
                    product_data = candidate

        url_id_match = re.search(r'([A-Z]{4}\d{5}_00)', target_url)
        target_id_part = url_id_match.group(1) if url_id_match else None

        if target_id_part:
            if not product_data or not is_valid_product(product_data):
                for key, val in cache.items():
                    if val.get("__typename") == "Product":
                        if target_id_part in str(val.get("id", "")):
                            if is_valid_product(val):
                                product_data = val
                                break
                            if not product_data: product_data = val

        if not product_data:
            return None

        title = clean_text(product_data.get("name", ""))
        english_title = clean_text(product_data.get("invariantName", ""))
        publisher = clean_text(product_data.get("publisherName", "Unknown Publisher"))

        parsed_item = {
            "title": title,
            "englishTitle": english_title,
            "publisher": publisher,
            "platforms": product_data.get("platforms", []),
            "psStoreId": product_data.get("id", ""),
            "imageUrl": "",
            "description": "Full Data Crawler (JSON)",
            "genreIds": "",

            "originalPrice": 0,
            "currentPrice": 0,
            "discountRate": 0,
            "saleEndDate": None,
            "isPlusExclusive": False,
            "psPlusPrice": 0,
            "inCatalog": False
        }

        # 이미지 & 장르
        media_list = product_data.get("media", [])
        if not media_list:
             meta = product_data.get("personalizedMeta", {})
             media_list = meta.get("media", [])

        for media in media_list:
            if media.get("role") == "MASTER":
                parsed_item["imageUrl"] = media.get("url"); break
            if media.get("role") == "GAMEHUB_COVER_ART" and not parsed_item["imageUrl"]:
                parsed_item["imageUrl"] = media.get("url")

        genres = product_data.get("localizedGenres", [])
        parsed_item["genreIds"] = ", ".join([g.get("value") for g in genres])

        webctas = product_data.get("webctas", [])
        prices_found = []

        KST = timezone(timedelta(hours=9)) # 한국 시간

        for cta_ref in webctas:
            cta_key = cta_ref.get("__ref")
            if not cta_key: continue
            cta_obj = cache.get(cta_key)
            if not cta_obj: continue
            cta_type = cta_obj.get("type")

            # 카탈로그 체크
            if cta_type == "ADD_TO_LIBRARY":
                price_meta = cta_obj.get("price", {})
                upsell = price_meta.get("upsellText", "")
                sub = price_meta.get("subscriptionService", "")
                if "카탈로그" in upsell or "PS_PLUS_" in sub:
                    parsed_item["inCatalog"] = True

            # 가격 추출 (구매, 장바구니, 예약)
            if cta_type in ["ADD_TO_CART", "PURCHASE", "PRE_ORDER"]:
                price_info = cta_obj.get("price", {})

                if price_info.get("isFree") is True and price_info.get("basePriceValue") == 0:
                    continue

                curr_price = price_info.get("discountedValue", 0)
                orig_price = price_info.get("basePriceValue", 0)
                is_exclusive = price_info.get("isExclusive", False)
                end_time_ts = price_info.get("endTime")

                sale_end_date = None
                if end_time_ts:
                    try:
                        dt_utc = datetime.fromtimestamp(int(end_time_ts) / 1000, tz=timezone.utc)
                        dt_kst = dt_utc.astimezone(KST)
                        sale_end_date = dt_kst.strftime('%Y-%m-%d')
                    except: pass

                if curr_price > 0:
                    prices_found.append({
                        "curr": curr_price,
                        "orig": orig_price,
                        "is_plus": is_exclusive,
                        "end_date": sale_end_date
                    })

        # 최적 가격 결정
        if prices_found:
            normal_offers = [p for p in prices_found if not p['is_plus']]
            plus_offers = [p for p in prices_found if p['is_plus']]

            if normal_offers:
                best_normal = min(normal_offers, key=lambda x: x['curr'])
                parsed_item["currentPrice"] = best_normal['curr']
                parsed_item["originalPrice"] = best_normal['orig']
                parsed_item["saleEndDate"] = best_normal['end_date']

            if plus_offers:
                best_plus = min(plus_offers, key=lambda x: x['curr'])
                parsed_item["psPlusPrice"] = best_plus['curr']

                if parsed_item["currentPrice"] == 0:
                    parsed_item["currentPrice"] = best_plus['curr']
                    parsed_item["originalPrice"] = best_plus['orig']
                    parsed_item["saleEndDate"] = best_plus['end_date']
                    parsed_item["isPlusExclusive"] = True
                elif best_plus['curr'] < parsed_item["currentPrice"]:
                     parsed_item["isPlusExclusive"] = True

            if parsed_item["originalPrice"] > parsed_item["currentPrice"]:
                parsed_item["discountRate"] = int(round(((parsed_item["originalPrice"] - parsed_item["currentPrice"]) / parsed_item["originalPrice"]) * 100))

            if parsed_item["psPlusPrice"] > 0 and parsed_item["originalPrice"] > parsed_item["psPlusPrice"]:
                 plus_rate = int(round(((parsed_item["originalPrice"] - parsed_item["psPlusPrice"]) / parsed_item["originalPrice"]) * 100))
                 parsed_item["description"] += f" | Max Discount: {plus_rate}% (PS+)"

        return parsed_item

    except Exception as e:
        logger.error(f"   ⚠️ JSON Parse Error: {e}")
        return None

# =========================================================

def crawl_detail_and_send(driver, wait, target_url):
    try:
        # 1. 페이지 접근 (네트워크 차단 적용된 상태)
        driver.get(target_url)

        # [Hybrid] 소스 로딩 대기
        time.sleep(CONF["sleep_min"])

        if CONF["window_stop"]:
            try: driver.execute_script("window.stop();")
            except: pass

        # 2. 페이지 소스 가져오기 (DOM 탐색 안 함)
        page_source = driver.page_source

        # 3. JSON 엔진 가동 🚀
        payload = extract_ps_store_data(page_source, target_url)

        # 4. 데이터 검증 및 재시도 (심폐소생술)
        if not payload or payload["title"] == "":
            logger.warning(f"   ⚠️ JSON not found/empty. Retrying refresh... : {target_url}")
            try:
                driver.refresh()
                time.sleep(4.0) # 새로고침 후에는 좀 더 대기
                if CONF["window_stop"]:
                    try: driver.execute_script("window.stop();")
                    except: pass

                page_source = driver.page_source
                payload = extract_ps_store_data(page_source, target_url)
            except:
                pass

        if not payload:
            logger.error(f"   ❌ Final Data Extraction Failed: {target_url}")
            return None

        # 5. 전송
        if not payload.get("title"):
            return None

        if payload.get("currentPrice") == 0 and payload.get("originalPrice") == 0:
            logger.warning(f"   🚫 Skip: Price info not found (0 KRW) for {payload['title']}")
            return None

        send_data_to_server(payload, payload["title"])
        return payload

    except Exception as e:
        logger.error(f"   ⚠️ Fatal Error processing {target_url}: {e}")
        return None

def fetch_update_targets():
    try:
        res = session.get(TARGET_API_URL, timeout=30)
        if res.status_code == 200:
            targets = res.json()
            logger.info(f"📥 Received {len(targets)} targets.")
            return targets
        return []
    except Exception as e:
        logger.error(f"❌ Connection Error: {e}")
        return []

def send_discord_summary(total_scanned, deals_list):
    if not DISCORD_WEBHOOK_URL: return
    try:
        total_deals = len(deals_list)
        if total_deals == 0: return

        sorted_deals = sorted(deals_list, key=lambda x: x['discountRate'], reverse=True)
        top_5 = sorted_deals[:5]

        message = f"## 📢 [PS-Tracker] 일일 수집 리포트 ({CURRENT_MODE})\n"
        message += f"**🗓️ 날짜:** {datetime.now().strftime('%Y-%m-%d')}\n"
        message += f"**📊 통계:** 총 `{total_scanned}`개 스캔 / **`{total_deals}`**개 할인 감지!\n"
        message += "━━━━━━━━━━━━━━━━━━\n"

        for i, game in enumerate(top_5, 1):
            sale_price = "{:,}".format(game['currentPrice'])
            message += f"{i}️⃣ **[{game['discountRate']}%] {game['title']}**\n"
            message += f"　 💰 **₩{sale_price}**\n"
            if i < len(top_5): message += "───\n"

        message += "\n[🔗 실시간 최저가 확인하기](https://ps-signal.com)"
        requests.post(DISCORD_WEBHOOK_URL, json={"content": message})
    except: pass

def run_batch_crawler_logic():
    global is_running
    logger.info(f"🚀 [Crawler] Batch job started - Mode: {CURRENT_MODE} (JSON Engine)")

    driver = None
    total_processed_count = 0
    collected_deals = []

    try:
        driver = get_driver()
        wait = WebDriverWait(driver, CONF['timeout'])
        visited_urls = set()

        # [Phase 1] 기존 타겟 갱신
        targets = fetch_update_targets()
        if targets:
            logger.info(f"🔄 [Phase 1] Updating {len(targets)} tracked games...")

            for i, url in enumerate(targets):
                if not is_running: break

                if i > 0 and i % CONF["restart_interval"] == 0:
                    logger.info(f"♻️ [Phase 1] Memory Cleanup at item {i}...")
                    try: driver.quit()
                    except: pass
                    time.sleep(5)
                    driver = get_driver()
                    wait = WebDriverWait(driver, CONF['timeout'])

                deal_info = crawl_detail_and_send(driver, wait, url)

                if deal_info:
                    total_processed_count += 1
                    if deal_info.get('discountRate', 0) > 0:
                        collected_deals.append(deal_info)
                visited_urls.add(url)

                # 랜덤 대기 (차단 방지)
                if random.random() < 0.3:
                    time.sleep(random.uniform(CONF["sleep_min"], CONF["sleep_max"]))

        # [Phase 2] 신규 탐색 (Phase 2는 리스트 페이지라 JSON 파싱 어려움 -> 기존 유지하되 리스트만 긁음)
        if is_running:
            logger.info(f"🔭 [Phase 2] Starting Deep Discovery...")
            base_category_path = "https://store.playstation.com/ko-kr/category/3f772501-f6f8-49b7-abac-874a88ca4897"
            search_params = "?FULL_GAME=storeDisplayClassification&GAME_BUNDLE=storeDisplayClassification&PREMIUM_EDITION=storeDisplayClassification"

            current_page = 1
            max_pages = 15

            while current_page <= max_pages:
                if not is_running: break

                p2_restart = 2 if CURRENT_MODE == "LOW" else 20

                if current_page > 1 and current_page % p2_restart == 0:
                     logger.info("♻️ [Maintenance] Restarting driver...")
                     try: driver.quit()
                     except: pass
                     time.sleep(5)
                     driver = get_driver()
                     wait = WebDriverWait(driver, CONF['timeout'])

                target_list_url = f"{base_category_path}/{current_page}{search_params}"
                logger.info(f"   📖 Scanning Page {current_page}/{max_pages}")

                try:
                    driver.get(target_list_url)
                    time.sleep(2.0)

                    if CONF["window_stop"]:
                        try:
                            driver.set_script_timeout(5)
                            driver.execute_script("window.stop();")
                        except Exception: pass

                    try:
                        WebDriverWait(driver, 5).until(EC.presence_of_element_located((By.CSS_SELECTOR, "a[href*='/product/']")))
                    except TimeoutException:
                        driver.refresh()
                        time.sleep(3)

                    try:
                        driver.execute_script(f"window.scrollTo(0, {random.randint(800, 1200)});")
                        time.sleep(1)
                    except Exception: pass

                except Exception as e:
                    logger.warning(f"⚠️ Page Load Error on {current_page}: {e}")
                    current_page += 1
                    continue

                page_candidates = []
                try:
                    link_elements = driver.find_elements(By.CSS_SELECTOR, "a[href*='/product/']")
                    for el in link_elements:
                        url = el.get_attribute("href")
                        if url and "/ko-kr/product/" in url and url not in visited_urls:
                            if url not in page_candidates: page_candidates.append(url)
                except: pass

                if not page_candidates: break

                for url in page_candidates:
                    if not is_running: break
                    deal_info = crawl_detail_and_send(driver, wait, url) # 여기는 JSON 엔진 사용
                    if deal_info:
                        total_processed_count += 1
                        if deal_info.get('discountRate', 0) > 0:
                            collected_deals.append(deal_info)
                    visited_urls.add(url)
                    time.sleep(random.uniform(CONF["sleep_min"], CONF["sleep_max"]))

                current_page += 1

            send_discord_summary(total_processed_count, collected_deals)

    except Exception as e:
        logger.error(f"🔥 Critical Crawler Error: {e}")
        logger.error(traceback.format_exc())
    finally:
        if driver:
            try: driver.quit()
            except: pass
        with lock: is_running = False

def send_data_to_server(payload, title):
    try:
        # Java 서버로 전송
        res = session.post(JAVA_API_URL, json=payload, timeout=30)
        if res.status_code == 200:
            price_display = f"{payload['currentPrice']} KRW"
            if payload.get("inCatalog"): price_display += " [Catalog]"
            logger.info(f"   📤 Sent: {title} ({price_display})")
        else:
            logger.error(f"   💥 Server Error ({res.status_code}): {title}")
    except:
        logger.error(f"   💥 Network Error sending {title}")

@app.route('/run', methods=['POST'])
def trigger_crawl():
    global is_running
    with lock:
        if is_running: return jsonify({"status": "error", "message": "Crawler is already running"}), 409
        is_running = True
    thread = threading.Thread(target=run_batch_crawler_logic)
    thread.daemon = True
    thread.start()
    return jsonify({"status": "success", "message": "Crawler started"}), 200

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "UP", "crawler_running": is_running, "mode": CURRENT_MODE}), 200

if __name__ == "__main__":
    logger.info(f"👂 [Collector] Server starting on port 5000 (Mode: {CURRENT_MODE})")
    app.run(host="0.0.0.0", port=5000)