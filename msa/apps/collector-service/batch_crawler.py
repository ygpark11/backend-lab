import random
import os
import time
import json
import requests
import traceback
import re
import threading
import logging
import socket
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
# ⚙️ 모드별 전략 설정
# =========================================================
CURRENT_MODE = os.getenv("CRAWLER_MODE", "LOW").upper()

CONFIG = {
    "LOW": {
        "strategy": "none",
        "sleep_min": 3.0,
        "sleep_max": 5.0,
        "restart_interval": 30,
        "window_stop": True,
        "cool_down_interval": 0,
        "cool_down_seconds": 0
    },
    "HIGH": {
        "strategy": "normal",
        "sleep_min": 2.0,
        "sleep_max": 4.0,
        "restart_interval": 200,
        "window_stop": False,
        "cool_down_interval": 50,
        "cool_down_seconds": 45
    }
}

CONF = CONFIG.get(CURRENT_MODE, CONFIG["LOW"])

logger.info(f"🔧 Crawler Mode: [{CURRENT_MODE}]")

# =========================================================

def get_driver():
    ua = UserAgent()
    random_user_agent = ua.random
    logger.info(f"🎭 Generated User-Agent: {random_user_agent}")

    w = random.randint(1800, 1920)
    h = random.randint(950, 1080)
    random_window_size = f"{w},{h}"

    driver = None
    socket.setdefaulttimeout(30)

    prefs = {
        "profile.managed_default_content_settings.images": 2,
        "profile.default_content_setting_values.notifications": 2,
        "profile.default_content_setting_values.popups": 2,
        "disk-cache-size": 4096
    }

    common_args = [
        "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu",
        "--disable-extensions", "--disable-application-cache",
        "--disable-background-networking"
    ]

    try:
        if SELENIUM_URL:
            logger.info(f"🌐 [Docker Mode] Connecting to Grid...")
            options = webdriver.ChromeOptions()
            options.page_load_strategy = CONF['strategy']
            options.add_argument(f"user-agent={random_user_agent}")
            options.add_argument(f"--window-size={random_window_size}")
            for arg in common_args: options.add_argument(arg)
            options.add_experimental_option("prefs", prefs)
            driver = webdriver.Remote(command_executor=SELENIUM_URL, options=options)
            logger.info(f"   ✅ Grid Connected!")
        else:
            logger.info(f"💻 [Local Mode] Starting Chrome")
            options = uc.ChromeOptions()
            options.page_load_strategy = CONF['strategy']
            if os.getenv("HEADLESS", "false").lower() == "true":
                 options.add_argument("--headless=new")
            options.add_argument(f"user-agent={random_user_agent}")
            options.add_argument(f"--window-size={random_window_size}")
            options.add_argument("--disable-popup-blocking")
            for arg in common_args: options.add_argument(arg)
            driver = uc.Chrome(options=options, use_subprocess=True)

        socket.setdefaulttimeout(60)
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

        try:
            driver.execute_cdp_cmd("Network.setBlockedURLs", {
                "urls": ["*.png", "*.jpg", "*.gif", "*.webp", "*.css", "*.woff", "*.woff2", "*google-analytics*"]
            })
            driver.execute_cdp_cmd("Network.enable", {})
        except: pass

        return driver
    except Exception as e:
        logger.error(f"🔥 Failed to create driver: {e}")
        if driver:
            try: driver.quit()
            except: pass
        return None

def clean_text(text):
    if not text: return ""
    text = re.sub(r'[™®©℠]', '', text)
    text = text.replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"')
    return re.sub(r'\s+', ' ', text).strip()

def mine_english_title(html_source):
    """HTML 소스에서 불변 영문명 추출"""
    try:
        match = re.search(r'"invariantName"\s*:\s*"([^"]+)"', html_source)
        if match:
            raw = match.group(1)
            try: raw = raw.encode('utf-8').decode('unicode_escape')
            except: pass
            return clean_text(raw)
    except: pass
    return ""

def extract_ps_store_data(html_source, target_url):
    """[JSON 파싱 V7] - 속도 최우선 + Fallback 강화"""
    try:
        pattern = r'<script id="env:[^"]+" type="application/json">(.*?)</script>'
        matches = re.findall(pattern, html_source, re.DOTALL)
        if not matches: return None

        target_id = None
        id_match = re.search(r'([A-Z]{2,4}\d{4,}-\w{4,}_\d{2})', target_url)
        if not id_match: id_match = re.search(r'([A-Z]{4}\d{5}_00)', target_url)
        if id_match: target_id = id_match.group(1)

        best_json_data = None
        best_score = -float('inf')

        for json_str in matches:
            if len(json_str) < 500: continue
            try:
                data = json.loads(json_str)
                cache = data.get("cache", {})
                score = 0
                for key, val in cache.items():
                    if val.get("__typename") == "Product":
                        score += 10
                        if target_id and target_id in str(val.get("id", "")):
                            score += 100000
                            if not val.get("webctas"): score -= 20000
                        if val.get("webctas"): score += 5000
                if score > best_score:
                    best_score = score
                    best_json_data = data
            except: continue

        if not best_json_data: return None

        cache = best_json_data.get("cache", {})
        product_data = None

        if target_id:
            for k, v in cache.items():
                if (v.get("__typename") == "Product" and target_id in str(v.get("id", "")) and v.get("webctas")):
                    product_data = v; break

        if not product_data:
            for k, v in cache.items():
                if v.get("__typename") == "Product" and v.get("webctas"):
                    product_data = v; break

        if not product_data: return None

        title = clean_text(product_data.get("name", ""))
        english_title = clean_text(product_data.get("invariantName", ""))
        if not english_title: english_title = mine_english_title(html_source)

        image_url = ""
        meta = product_data.get("personalizedMeta", {})
        for m in meta.get("media", []):
            if m.get("role") == "MASTER": image_url = m.get("url"); break
        if not image_url:
            for m in product_data.get("media", []):
                if m.get("role") == "MASTER": image_url = m.get("url"); break
                elif m.get("role") == "GAMEHUB_COVER_ART" and not image_url: image_url = m.get("url")

        webctas = product_data.get("webctas", [])
        KST = timezone(timedelta(hours=9))

        def parse_price(cta_list):
            found = []
            for cta_ref in cta_list:
                cta_obj = cache.get(cta_ref.get("__ref"))
                if not cta_obj: continue

                in_cat = False
                type_val = cta_obj.get("type", "")
                if type_val == "ADD_TO_LIBRARY": in_cat = True

                price_info = cta_obj.get("price", {})
                curr = price_info.get("discountedValue", 0)
                orig = price_info.get("basePriceValue", 0)
                is_plus = price_info.get("isExclusive", False)

                upsell = price_info.get("upsellText", "")
                sub_svc = price_info.get("subscriptionService", "")
                if "카탈로그" in upsell or "PS_PLUS_" in sub_svc:
                    in_cat = True

                end_date = None
                if price_info.get("endTime"):
                    try:
                        ts = int(price_info.get("endTime"))
                        dt = datetime.fromtimestamp(ts/1000, tz=timezone.utc).astimezone(KST)
                        end_date = dt.strftime('%Y-%m-%d')
                    except: pass

                if curr > 0 or in_cat:
                    found.append({
                        "curr": curr, "orig": orig, "is_plus": is_plus,
                        "end_date": end_date, "in_catalog": in_cat
                    })
            return found

        prices_found = parse_price(webctas)

        # Fallback for 0-price items (Bundles, Collections)
        if not prices_found:
            all_other_prices = []
            for k, v in cache.items():
                if v.get("__typename") == "Product" and v.get("webctas"):
                    p_list = parse_price(v.get("webctas"))
                    for p in p_list:
                         if p['curr'] > 0: all_other_prices.append(p)
            if all_other_prices:
                prices_found = all_other_prices

        parsed = {
            "title": title,
            "englishTitle": english_title,
            "publisher": clean_text(product_data.get("publisherName", "Unknown")),
            "platforms": product_data.get("platforms", []),
            "psStoreId": product_data.get("id", ""),
            "imageUrl": image_url,
            "description": f"Hybrid V7 (Speed)",
            "genreIds": ", ".join([g.get("value") for g in product_data.get("localizedGenres", [])]),
            "originalPrice": 0, "currentPrice": 0, "discountRate": 0,
            "saleEndDate": None, "isPlusExclusive": False, "inCatalog": False
        }

        if prices_found:
            catalog_items = [p for p in prices_found if p['in_catalog']]
            if catalog_items: parsed["inCatalog"] = True

            paid_items = [p for p in prices_found if p['curr'] > 0]
            if paid_items:
                normal = [p for p in paid_items if not p['is_plus']]
                if normal:
                    best = min(normal, key=lambda x: x['curr'])
                    parsed.update({"currentPrice": best['curr'], "originalPrice": best['orig'],
                                   "saleEndDate": best['end_date']})

                plus = [p for p in paid_items if p['is_plus']]
                if plus:
                    best_plus = min(plus, key=lambda x: x['curr'])
                    if parsed["currentPrice"] == 0 or best_plus['curr'] < parsed["currentPrice"]:
                        parsed.update({"currentPrice": best_plus['curr'], "originalPrice": best_plus['orig'],
                                       "saleEndDate": best_plus['end_date'], "isPlusExclusive": True})

            if parsed["originalPrice"] > parsed["currentPrice"]:
                parsed["discountRate"] = int(round(((parsed["originalPrice"] - parsed["currentPrice"]) / parsed["originalPrice"]) * 100))

        return parsed

    except Exception: return None

def extract_visual_data(driver, wait_obj_ignored):
    """
    [Visual Scraper V3.1] - 타임아웃 단축
    인자로 받은 wait 객체를 쓰지 않고, 내부에서 짧은(10초) 대기 시간을 새로 씁니다.
    """
    try:
        short_wait = WebDriverWait(driver, 10)

        # 1. 제목 대기
        try:
            short_wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-qa="mfe-game-title#name"]')))
        except TimeoutException:
            logger.warning("      💨 Visual Scan: Title not found (Timeout 10s)")
            return None

        title_el = driver.find_element(By.CSS_SELECTOR, '[data-qa="mfe-game-title#name"]')
        title = clean_text(title_el.text)
        english_title = mine_english_title(driver.page_source) or title

        # 2. 가격표 탐색
        offer_elements = driver.find_elements(By.CSS_SELECTOR, "[data-qa^='mfeCtaMain#offer']")

        # 태그 없으면 사이드바 텍스트 스캔
        if not offer_elements:
            try:
                sidebar = driver.find_element(By.CSS_SELECTOR, "div[class*='psw-l-grid']")
                offer_elements = [sidebar]
            except: pass

        best_price_info = {"curr": 0, "orig": 0, "is_plus": False, "in_catalog": False}
        found_any = False

        for offer in offer_elements:
            try:
                text = offer.text
                if "구독에 포함" in text or "라이브러리에 추가" in text or "게임 카탈로그" in text:
                    best_price_info["in_catalog"] = True

                clean_text_chunk = text.replace(" ", "")
                price_matches = re.findall(r'[₩￦]([\d,]+)|([\d,]+)원', clean_text_chunk)

                prices = []
                for p in price_matches:
                    val_str = p[0] if p[0] else p[1]
                    val = int(re.sub(r'[^\d]', '', val_str))
                    if val > 0: prices.append(val)

                if not prices: continue

                curr = min(prices)
                orig = max(prices) if len(prices) > 1 else curr

                is_plus = False
                if "Plus" in text and ("절약" in text or "할인" in text): is_plus = True

                if not found_any or curr < best_price_info["curr"]:
                    best_price_info.update({"curr": curr, "orig": orig, "is_plus": is_plus})
                    found_any = True
            except: continue

        image_url = ""
        try:
            img = driver.find_element(By.CSS_SELECTOR, "img[data-qa='gameBackgroundImage#heroImage#image']")
            image_url = img.get_attribute("src").split("?")[0]
        except: pass

        parsed = {
            "title": title,
            "englishTitle": english_title,
            "publisher": "Unknown",
            "platforms": [],
            "psStoreId": "",
            "imageUrl": image_url,
            "description": "Visual Scraped Data",
            "genreIds": "",
            "originalPrice": best_price_info["orig"],
            "currentPrice": best_price_info["curr"],
            "discountRate": 0,
            "saleEndDate": None,
            "isPlusExclusive": best_price_info["is_plus"],
            "inCatalog": best_price_info["in_catalog"]
        }

        if parsed["originalPrice"] > parsed["currentPrice"]:
            parsed["discountRate"] = int(round(((parsed["originalPrice"] - parsed["currentPrice"]) / parsed["originalPrice"]) * 100))

        return parsed

    except Exception as e:
        logger.warning(f"   👀 Visual Scraping Failed: {e}")
        return None

def crawl_detail_and_send(driver, wait, target_url):
    try:
        driver.get(target_url)

        if CONF["strategy"] == "none":
            time.sleep(CONF["sleep_min"])
        else:
            time.sleep(2.0)

        if CONF["window_stop"]:
            try: driver.execute_script("window.stop();")
            except: pass

        payload = extract_ps_store_data(driver.page_source, target_url)

        need_visual = False
        if not payload: need_visual = True
        elif payload.get("currentPrice") == 0 and payload.get("originalPrice") == 0 and not payload.get("inCatalog"):
            need_visual = True

        if need_visual:
            # window.stop으로 끊긴 상태라면 새로고침 필요
            if CONF["window_stop"]:
                driver.refresh()
                time.sleep(3.0) # 새로고침 대기

            logger.info(f"   👁️ Visual Scanning: {target_url}")

            visual_data = extract_visual_data(driver, None)

            if visual_data:
                if not payload: payload = visual_data
                else:
                    if visual_data["currentPrice"] > 0:
                        payload.update({
                            "currentPrice": visual_data["currentPrice"],
                            "originalPrice": visual_data["originalPrice"],
                            "discountRate": visual_data["discountRate"],
                            "description": payload["description"] + " + Visual Fixed"
                        })
                    if visual_data["inCatalog"]:
                        payload["inCatalog"] = True
                        payload["description"] += " + Catalog Found"

        if not payload or not payload.get("title"):
             logger.error(f"   ❌ Skip: Failed to parse {target_url}")
             return None

        if payload.get("currentPrice") == 0 and payload.get("originalPrice") == 0 and not payload.get("inCatalog"):
             logger.warning(f"   🚫 Skip: Zero price (Confirmed) -> {payload['title']}")
             logger.warning(f"      👉 Check URL: {target_url}")
             return None

        send_data_to_server(payload, payload['title'])
        return payload

    except Exception as e:
        logger.error(f"   ⚠️ Fatal Error processing {target_url}: {e}")
        return None

def fetch_update_targets():
    try:
        res = session.get(TARGET_API_URL, timeout=15)
        if res.status_code == 200:
            targets = res.json()
            logger.info(f"📥 Received {len(targets)} targets.")
            return targets
        return []
    except Exception as e:
        logger.error(f"❌ Connection Error: {e}")
        return []

def send_data_to_server(payload, title):
    try:
        res = session.post(JAVA_API_URL, json=payload, timeout=30)
        if res.status_code == 200:
            price_txt = f"₩{payload['currentPrice']:,}"
            if payload.get("inCatalog"): price_txt += " [Cat]"
            logger.info(f"   📤 Sent: {title} | {price_txt} | {payload['discountRate']}%")
        else:
            logger.error(f"   💥 Server Error ({res.status_code}): {title}")
    except:
        logger.error(f"   💥 Network Error: {title}")

def send_discord_summary(total_scanned, deals_list):
    if not DISCORD_WEBHOOK_URL: return
    try:
        if not deals_list: return
        deals_list.sort(key=lambda x: x['discountRate'], reverse=True)
        top_5 = deals_list[:5]
        msg = f"## 📢 [PS-Tracker] 수집 결과 ({CURRENT_MODE})\n"
        msg += f"**🗓️ {datetime.now().strftime('%Y-%m-%d %H:%M')}**\n"
        msg += f"📊 스캔: `{total_scanned}`건 / 할인 발견: **`{len(deals_list)}`**건\n"
        msg += "━━━━━━━━━━━━━━━━━━\n"
        for i, g in enumerate(top_5, 1):
            msg += f"{i}️⃣ **[{g['discountRate']}%] {g['title']}** (₩{g['currentPrice']:,})\n"
        requests.post(DISCORD_WEBHOOK_URL, json={"content": msg})
    except: pass

def run_batch_crawler_logic():
    global is_running
    logger.info(f"🚀 [Crawler] Batch Started (Mode: {CURRENT_MODE})")

    driver = None
    total_processed = 0
    collected_deals = []

    try:
        driver = get_driver()
        if not driver:
            logger.error("🔥 Driver Init Failed. Stop.")
            with lock: is_running = False
            return

        wait = WebDriverWait(driver, 20)
        visited_urls = set()

        targets = fetch_update_targets()
        if targets:
            logger.info(f"🔄 [Phase 1] Refreshing {len(targets)} items...")
            for i, url in enumerate(targets):
                if not is_running: break

                if i > 0 and i % CONF["restart_interval"] == 0:
                    logger.info(f"♻️ [Memory] Restarting Driver (Count: {i})...")
                    try: driver.quit()
                    except: pass
                    time.sleep(3)
                    driver = get_driver()
                    if not driver: break
                    wait = WebDriverWait(driver, 20)

                if CONF["cool_down_interval"] > 0 and i > 0 and i % CONF["cool_down_interval"] == 0:
                    logger.info(f"☕ [Anti-Ban] Taking a break for {CONF['cool_down_seconds']}s...")
                    time.sleep(CONF["cool_down_seconds"])

                deal = crawl_detail_and_send(driver, wait, url)
                if deal:
                    total_processed += 1
                    if deal['discountRate'] > 0: collected_deals.append(deal)

                visited_urls.add(url)
                time.sleep(random.uniform(CONF["sleep_min"], CONF["sleep_max"]))

        if is_running:
            logger.info("🔭 [Phase 2] Starting Deep Discovery...")
            base_category = "https://store.playstation.com/ko-kr/category/3f772501-f6f8-49b7-abac-874a88ca4897"
            search_query = "?FULL_GAME=storeDisplayClassification&GAME_BUNDLE=storeDisplayClassification&PREMIUM_EDITION=storeDisplayClassification"

            current_page = 1
            max_pages = 15

            while current_page <= max_pages:
                if not is_running: break

                if current_page > 1 and current_page % 3 == 0:
                    logger.info(f"♻️ [Memory] Refreshing driver for stability...")
                    try: driver.quit()
                    except: pass
                    time.sleep(3)
                    driver = get_driver()
                    if not driver: break
                    wait = WebDriverWait(driver, 20)

                target_list_url = f"{base_category}/{current_page}{search_query}"
                logger.info(f"   📖 Scanning Page {current_page}/{max_pages}")

                try:
                    driver.get(target_list_url)

                    try:
                        wait.until(EC.presence_of_element_located((By.CLASS_NAME, "psw-product-tile")))
                        driver.execute_script("window.scrollTo(0, document.body.scrollHeight/2);")
                        time.sleep(1.5)
                    except TimeoutException:
                        logger.warning(f"      ⚠️ List not loaded. Retrying...")
                        driver.refresh()
                        time.sleep(3)
                        try: wait.until(EC.presence_of_element_located((By.CLASS_NAME, "psw-product-tile")))
                        except: pass

                    candidates = []
                    try:
                        elems = driver.find_elements(By.CSS_SELECTOR, "a[href*='/product/']")
                        for el in elems:
                            u = el.get_attribute("href")
                            if u and "/ko-kr/product/" in u and u not in visited_urls:
                                candidates.append(u)
                    except: pass

                    candidates = list(set(candidates))

                    if not candidates:
                        logger.info(f"      🚫 No new items on Page {current_page}")
                    else:
                        logger.info(f"      🔍 Found {len(candidates)} new items on Page {current_page}")
                        for idx, url in enumerate(candidates):
                            if not is_running: break

                            if CONF["cool_down_interval"] > 0 and idx > 0 and idx % CONF["cool_down_interval"] == 0:
                                 logger.info(f"☕ [Anti-Ban] Sub-list Cool-down...")
                                 time.sleep(CONF["cool_down_seconds"])

                            deal = crawl_detail_and_send(driver, wait, url)
                            if deal:
                                total_processed += 1
                                if deal['discountRate'] > 0: collected_deals.append(deal)
                            visited_urls.add(url)
                            time.sleep(random.uniform(CONF["sleep_min"], CONF["sleep_max"]))

                except Exception as e:
                    logger.error(f"   🔥 Page {current_page} Error: {e}")

                current_page += 1

        send_discord_summary(total_processed, collected_deals)

    except Exception as e:
        logger.error(f"🔥 Critical Crawler Error: {e}")
        logger.error(traceback.format_exc())
    finally:
        if driver:
            try: driver.quit()
            except: pass
        with lock: is_running = False
        logger.info("🛑 Crawler Finished.")

@app.route('/run', methods=['POST'])
def trigger_crawl():
    global is_running
    with lock:
        if is_running: return jsonify({"status": "running"}), 409
        is_running = True
    thread = threading.Thread(target=run_batch_crawler_logic)
    thread.daemon = True
    thread.start()
    return jsonify({"status": "started", "mode": CURRENT_MODE}), 200

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "UP", "running": is_running, "mode": CURRENT_MODE}), 200

if __name__ == "__main__":
    logger.info(f"👂 Server starting on port 5000 (Safety: {CURRENT_MODE})")
    app.run(host="0.0.0.0", port=5000)