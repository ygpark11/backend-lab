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

# 환경 변수
BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8080")
JAVA_API_URL = f"{BASE_URL}/api/v1/games/collect"
TARGET_API_URL = f"{BASE_URL}/api/v1/games/targets"
SELENIUM_URL = os.getenv("SELENIUM_URL")
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")

lock = threading.Lock()
is_running = False

# ==========================================
# ⚙️ 환경별 최적화 설정 (Low Spec vs High Spec)
# ==========================================
# CRAWLER_MODE=HIGH : 고사양 (속도 + 스마트 휴식)
# CRAWLER_MODE=LOW  : 저사양 (생존 + 잦은 재시작)
CURRENT_MODE = os.getenv("CRAWLER_MODE", "LOW").upper()

MODES = {
    "LOW": {
        # 1GB 램 생존 전략
        "restart_interval_p1": 15,  # 15개마다 재시작 (메모리 초기화)
        "restart_interval_p2": 1,   # 1페이지마다 재시작
        "long_break_interval": 0,   # 재시작이 곧 휴식이므로 별도 휴식 없음
        "page_load_strategy": "normal",
        "timeout": 25,
        "sleep_min": 3.0,
        "sleep_max": 5.0
    },
    "HIGH": {
        # 고사양 완주 전략 (Anti-Ban 강화)
        "restart_interval_p1": 200, # 메모리 넉넉하니 200개까지 쭉
        "restart_interval_p2": 5,
        "long_break_interval": 50,  # [NEW] 50개마다
        "long_break_duration": 30,  # [NEW] 30초간 강제 휴식 (차단 방지 핵심)
        "page_load_strategy": "normal",
        "timeout": 15,
        "sleep_min": 1.5,
        "sleep_max": 3.0
    }
}

CONF = MODES.get(CURRENT_MODE, MODES["LOW"])

logger.info(f"🔧 Crawler Initialized in [{CURRENT_MODE}] Mode")
logger.info(f"   👉 Auto-Rest(Anti-Ban): Every {CONF.get('long_break_interval', 'N/A')} items")
# =========================================================


def get_driver():
    """드라이버 생성"""
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

    common_options = [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-extensions",
        "--disable-application-cache"
    ]

    if SELENIUM_URL:
        logger.info(f"🌐 [Docker Mode] Connecting to Grid: {SELENIUM_URL}")
        options = webdriver.ChromeOptions()
        options.page_load_strategy = CONF['page_load_strategy']
        options.add_argument(f"user-agent={random_user_agent}")
        options.add_argument(f"--window-size={random_window_size}")
        for opt in common_options: options.add_argument(opt)
        options.add_experimental_option("prefs", prefs)
        driver = webdriver.Remote(command_executor=SELENIUM_URL, options=options)
    else:
        logger.info("💻 [Local Mode] Starting Undetected Chrome")
        options = uc.ChromeOptions()
        options.page_load_strategy = CONF['page_load_strategy']
        if os.getenv("HEADLESS", "false").lower() == "true":
             options.add_argument("--headless=new")
        options.add_argument(f"user-agent={random_user_agent}")
        options.add_argument(f"--window-size={random_window_size}")
        for opt in common_options: options.add_argument(opt)
        driver = uc.Chrome(options=options, use_subprocess=True)

    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    return driver

def clean_text(text):
    if not text: return ""
    text = re.sub(r'[™®©℠]', '', text)
    text = text.replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"')
    return re.sub(r'\s+', ' ', text).strip()

def extract_ps_store_data(html_source, target_url):
    """
    JSON 파싱 엔진 V6 (Fallback 강화판)
    - ID 매칭 실패 시, 가격표가 있는 다른 객체라도 수집하도록 안전장치 추가
    """
    try:
        pattern = r'<script id="env:[^"]+" type="application/json">(.*?)</script>'
        matches = re.findall(pattern, html_source, re.DOTALL)

        if not matches: return None

        # [1단계] URL에서 타겟 ID 추출
        target_id = None
        id_match = re.search(r'([A-Z]{2,4}\d{4,}-\w{4,}_\d{2})', target_url)
        if not id_match:
            id_match = re.search(r'([A-Z]{4}\d{5}_00)', target_url)
        if id_match: target_id = id_match.group(1)

        best_json_data = None
        best_score = -float('inf') # 음수 무한대로 초기화

        # [2단계] JSON 채점 (V5 로직 유지)
        for json_str in matches:
            if len(json_str) < 500: continue
            try:
                data = json.loads(json_str)
                cache = data.get("cache", {})
                score = 0

                for key, val in cache.items():
                    if val.get("__typename") == "Product":
                        score += 10
                        # ID 일치
                        if target_id and target_id in str(val.get("id", "")):
                            score += 100000
                            # 가격표 없으면 감점 (하지만 Case 8을 위해 감점 폭을 줄임)
                            if not val.get("webctas"): score -= 20000
                        # 가격표 보유
                        if val.get("webctas"): score += 5000

                if score > best_score:
                    best_score = score
                    best_json_data = data
            except: continue

        if not best_json_data: return None

        # [3단계] 데이터 추출 (3단 그물망 적용)
        cache = best_json_data.get("cache", {})
        product_data = None

        # Priority 1: [ID 일치] + [가격표(webctas) 있음] -> Case 2~7 완벽 커버
        # (가장 정확하고 이상적인 데이터)
        if target_id:
            for k, v in cache.items():
                if (v.get("__typename") == "Product" and
                    target_id in str(v.get("id", "")) and
                    v.get("webctas")):
                    product_data = v
                    break

        # Priority 2: [가격표(webctas) 있음] (ID 불일치 허용) -> Case 8 완벽 커버
        # (ID가 껍데기라 실패했을 때, 내부에 숨은 진짜 판매 상품을 찾아냄)
        if not product_data:
            for k, v in cache.items():
                if v.get("__typename") == "Product" and v.get("webctas"):
                    product_data = v
                    break

        # Priority 3: [ID 일치] (가격표 없음) -> 최후의 수단
        # (가격이 없더라도 메타데이터라도 건져야 하는 경우)
        if not product_data and target_id:
            for k, v in cache.items():
                 if v.get("__typename") == "Product" and target_id in str(v.get("id", "")):
                    product_data = v
                    break

        if not product_data: return None

        # --- 데이터 파싱 ---
        title = clean_text(product_data.get("name", ""))
        english_title = clean_text(product_data.get("invariantName", ""))

        # 이미지
        image_url = ""
        meta = product_data.get("personalizedMeta", {})
        for m in meta.get("media", []):
            if m.get("role") == "MASTER": image_url = m.get("url"); break
        if not image_url:
            for m in product_data.get("media", []):
                if m.get("role") == "MASTER": image_url = m.get("url"); break
                elif m.get("role") == "GAMEHUB_COVER_ART" and not image_url: image_url = m.get("url")
        if not image_url and product_data.get("media"):
             image_url = product_data.get("media")[0].get("url", "")

        # 가격 추출
        webctas = product_data.get("webctas", [])
        prices_found = []
        KST = timezone(timedelta(hours=9))

        for cta_ref in webctas:
            cta_obj = cache.get(cta_ref.get("__ref"))
            if not cta_obj: continue

            in_catalog = cta_obj.get("type") == "ADD_TO_LIBRARY"
            price_info = cta_obj.get("price", {})
            curr = price_info.get("discountedValue", 0)
            orig = price_info.get("basePriceValue", 0)
            is_plus = price_info.get("isExclusive", False)

            end_date = None
            if price_info.get("endTime"):
                try:
                    ts = int(price_info.get("endTime"))
                    dt = datetime.fromtimestamp(ts/1000, tz=timezone.utc).astimezone(KST)
                    end_date = dt.strftime('%Y-%m-%d')
                except: pass

            if curr > 0:
                prices_found.append({
                    "curr": curr, "orig": orig, "is_plus": is_plus,
                    "end_date": end_date, "in_catalog": in_catalog
                })

        parsed = {
            "title": title,
            "englishTitle": english_title,
            "publisher": clean_text(product_data.get("publisherName", "Unknown")),
            "platforms": product_data.get("platforms", []),
            "psStoreId": product_data.get("id", ""),
            "imageUrl": image_url,
            "description": f"Hybrid V6 (SafetyNet)",
            "genreIds": ", ".join([g.get("value") for g in product_data.get("localizedGenres", [])]),
            "originalPrice": 0, "currentPrice": 0, "discountRate": 0,
            "saleEndDate": None, "isPlusExclusive": False, "inCatalog": False
        }

        if prices_found:
            normal = [p for p in prices_found if not p['is_plus']]
            if normal:
                best = min(normal, key=lambda x: x['curr'])
                parsed.update({"currentPrice": best['curr'], "originalPrice": best['orig'],
                               "saleEndDate": best['end_date'], "inCatalog": best['in_catalog']})
            plus = [p for p in prices_found if p['is_plus']]
            if plus:
                best_plus = min(plus, key=lambda x: x['curr'])
                if parsed["currentPrice"] == 0 or best_plus['curr'] < parsed["currentPrice"]:
                    parsed.update({"currentPrice": best_plus['curr'], "originalPrice": best_plus['orig'],
                                   "saleEndDate": best_plus['end_date'], "isPlusExclusive": True})
            if parsed["originalPrice"] > parsed["currentPrice"]:
                parsed["discountRate"] = int(round(((parsed["originalPrice"] - parsed["currentPrice"]) / parsed["originalPrice"]) * 100))

        return parsed

    except Exception: return None

def crawl_detail_and_send(driver, wait, target_url):
    try:
        driver.get(target_url)
        time.sleep(CONF["sleep_min"])

        payload = extract_ps_store_data(driver.page_source, target_url)

        if not payload:
            logger.warning(f"   ⚠️ Retrying parse: {target_url}")
            driver.refresh()
            time.sleep(CONF["sleep_max"])
            payload = extract_ps_store_data(driver.page_source, target_url)

        if not payload:
            logger.error(f"   ❌ Failed: {target_url}")
            return None

        if payload['currentPrice'] == 0 and payload['originalPrice'] == 0:
            return None

        send_data_to_server(payload, payload['title'])
        return payload

    except Exception as e:
        logger.error(f"   ⚠️ Error: {target_url} / {e}")
        return None

def send_data_to_server(payload, title):
    try:
        res = session.post(JAVA_API_URL, json=payload, timeout=30)
        if res.status_code == 200:
            logger.info(f"   📤 Sent: {title} | ₩{payload['currentPrice']:,} | {payload['discountRate']}%")
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

        msg = f"## 📢 [PS-Tracker] 수집 리포트 ({CURRENT_MODE})\n"
        msg += f"**🗓️ {datetime.now().strftime('%Y-%m-%d')}** | 스캔: `{total_scanned}` / 할인: **`{len(deals_list)}`**\n"
        msg += "━━━━━━━━━━━━━━━━━━\n"
        for i, g in enumerate(top_5, 1):
            msg += f"{i}️⃣ **[{g['discountRate']}%] {g['title']}** (₩{g['currentPrice']:,})\n"
        requests.post(DISCORD_WEBHOOK_URL, json={"content": msg})
    except: pass

def run_batch_crawler_logic():
    global is_running
    logger.info(f"🚀 [Crawler] Started (Mode: {CURRENT_MODE})")

    driver = None
    total_processed = 0
    collected_deals = []

    try:
        driver = get_driver()
        wait = WebDriverWait(driver, CONF['timeout'])
        visited_urls = set()

        # [Phase 1] 기존 타겟 갱신
        targets = fetch_update_targets()
        if targets:
            logger.info(f"--- [Phase 1] Refreshing {len(targets)} Items ---")
            for i, url in enumerate(targets):
                if not is_running: break

                # 1. 메모리 재시작 관리
                if i > 0 and i % CONF["restart_interval_p1"] == 0:
                    logger.info(f"♻️ [Memory] Restarting Driver...")
                    try: driver.quit()
                    except: pass
                    time.sleep(3)
                    driver = get_driver()
                    wait = WebDriverWait(driver, CONF['timeout'])

                # 2. [NEW] 슈퍼컴 모드 전용 스마트 휴식 (Anti-Ban)
                # HIGH 모드일 때 50개마다 30초씩 강제로 쉬어서 IP 차단을 방지
                long_break_iv = CONF.get("long_break_interval", 0)
                if long_break_iv > 0 and i > 0 and i % long_break_iv == 0:
                     sleep_dur = CONF.get("long_break_duration", 30)
                     logger.info(f"💤 [Anti-Ban] Cool-down for {sleep_dur}s...")
                     time.sleep(sleep_dur)

                deal = crawl_detail_and_send(driver, wait, url)
                if deal:
                    total_processed += 1
                    if deal['discountRate'] > 0: collected_deals.append(deal)

                visited_urls.add(url)
                time.sleep(random.uniform(CONF["sleep_min"], CONF["sleep_max"]))

        # [Phase 2] 신규 탐색
        if is_running:
            logger.info("--- [Phase 2] Discovery Mode ---")
            base_url = "https://store.playstation.com/ko-kr/category/3f772501-f6f8-49b7-abac-874a88ca4897"
            search_params = "?FULL_GAME=storeDisplayClassification&GAME_BUNDLE=storeDisplayClassification&PREMIUM_EDITION=storeDisplayClassification"

            for page in range(1, 16):
                if not is_running: break

                if page > 1 and page % CONF["restart_interval_p2"] == 0:
                    logger.info(f"♻️ [Memory] Phase 2 Restart...")
                    try: driver.quit()
                    except: pass
                    time.sleep(5)
                    driver = get_driver()
                    wait = WebDriverWait(driver, CONF['timeout'])

                target_list_url = f"{base_url}/{page}{search_params}"
                logger.info(f"   📖 Scanning Page {page}/15")

                try:
                    driver.get(target_list_url)

                    try:
                        wait.until(EC.presence_of_element_located((By.CLASS_NAME, "psw-product-tile")))
                    except TimeoutException:
                        logger.warning("      ⚠️ Timeout. Retrying...")
                        driver.refresh()
                        time.sleep(3)
                        wait.until(EC.presence_of_element_located((By.CLASS_NAME, "psw-product-tile")))

                    driver.execute_script("window.scrollTo(0, document.body.scrollHeight/2);")
                    time.sleep(1)
                    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                    time.sleep(2)

                    candidates = []
                    elems = driver.find_elements(By.CSS_SELECTOR, "a[href*='/product/']")
                    for el in elems:
                        u = el.get_attribute("href")
                        if u and "/ko-kr/product/" in u and u not in visited_urls:
                            candidates.append(u)

                    candidates = list(set(candidates))
                    logger.info(f"      Found {len(candidates)} items.")

                    for url in candidates:
                        if not is_running: break
                        deal = crawl_detail_and_send(driver, wait, url)
                        if deal:
                            total_processed += 1
                            if deal['discountRate'] > 0: collected_deals.append(deal)
                        visited_urls.add(url)
                        time.sleep(random.uniform(CONF["sleep_min"], CONF["sleep_max"]))

                except Exception as e:
                    logger.error(f"   🔥 Page {page} Error: {e}")
                    continue

        send_discord_summary(total_processed, collected_deals)

    except Exception as e:
        logger.error(f"🔥 Critical Error: {e}")
        logger.error(traceback.format_exc())
    finally:
        if driver:
            try: driver.quit()
            except: pass
        with lock: is_running = False
        logger.info("🛑 Finished.")

def fetch_update_targets():
    try:
        res = session.get(TARGET_API_URL, timeout=10)
        return res.json() if res.status_code == 200 else []
    except: return []

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
    app.run(host="0.0.0.0", port=5000)