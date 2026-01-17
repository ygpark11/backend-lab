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

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException

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

app = Flask(__name__)
session = requests.Session()
session.headers.update({'Connection': 'keep-alive'})

# [환경 변수 로드]
BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8080")
JAVA_API_URL = f"{BASE_URL}/api/v1/games/collect"
TARGET_API_URL = f"{BASE_URL}/api/v1/games/targets"
SELENIUM_URL = os.getenv("SELENIUM_URL")
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")

lock = threading.Lock()
is_running = False

# --- [2. 오라클 프리티어 맞춤 설정] ---
CURRENT_MODE = os.getenv("CRAWLER_MODE", "LOW").upper()

CONFIG = {
    "LOW": {  # 🐢 1Core / 1GB RAM 최적화
        "restart_interval": 30,
        "page_load_strategy": "none",
        "sleep_min": 2.0,
        "sleep_max": 3.5,
        "timeout": 20,
        "window_stop": True
    },
    "HIGH": {
        "restart_interval": 100,
        "page_load_strategy": "normal",
        "sleep_min": 2.0,
        "sleep_max": 4.0,
        "timeout": 15,
        "window_stop": False
    }
}

CONF = CONFIG.get(CURRENT_MODE, CONFIG["LOW"])
logger.info(f"🔧 Crawler Config: {CURRENT_MODE} | Timeout: {CONF['timeout']}s")


# --- [3. 핵심 기능: 드라이버 및 데이터 추출] ---

def get_driver():
    """브라우저 드라이버 생성 (PC 환경 고정 + 1920x1080 해상도 적용)"""

    DESKTOP_USER_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0"
    ]

    random_user_agent = random.choice(DESKTOP_USER_AGENTS)

    window_size = "1920,1080"

    logger.info(f"🎭 UA: {random_user_agent} | 📏 Size: {window_size}")

    prefs = {
        "profile.managed_default_content_settings.images": 2,
        "profile.default_content_setting_values.notifications": 2,
        "profile.default_content_setting_values.popups": 2,
        "profile.default_content_setting_values.geolocation": 2,
        "disk-cache-size": 4096
    }

    driver = None

    if SELENIUM_URL:
        options = webdriver.ChromeOptions()
        options.page_load_strategy = CONF['page_load_strategy']
        options.add_argument(f"user-agent={random_user_agent}")
        options.add_argument(f"--window-size={window_size}")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_experimental_option("prefs", prefs)

        driver = webdriver.Remote(command_executor=SELENIUM_URL, options=options)
    else:
        options = uc.ChromeOptions()
        options.page_load_strategy = CONF['page_load_strategy']

        if os.getenv("HEADLESS", "false").lower() == "true":
             options.add_argument("--headless=new")

        options.add_argument(f"user-agent={random_user_agent}")
        options.add_argument(f"--window-size={window_size}")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")

        driver = uc.Chrome(options=options, use_subprocess=True)

    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

    return driver

def clean_text(text):
    if not text: return ""
    text = re.sub(r'[™®©℠]', '', text)
    text = text.replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"')
    return re.sub(r'\s+', ' ', text).strip()

def get_json_from_browser(driver):
    """
    점수 기반 추출 로직 적용
    단순 길이 비교가 아니라, 가격 정보(basePrice)가 있는 데이터를 우선 선택합니다.
    """
    try:
        script_content = driver.execute_script("""
            const scripts = document.querySelectorAll('script[type="application/json"]');
            let bestContent = null;
            let maxScore = -1;

            for (const s of scripts) {
                const txt = s.textContent;

                // 1. 기본 필터
                if (!txt.includes('apolloState') && !txt.includes('Product')) continue;

                // 2. 점수 계산
                let score = 0;

                // 길이 점수 (10만 글자당 1점)
                score += (txt.length / 100000);

                // 핵심 데이터 가산점
                if (txt.includes('"__typename":"Product"') && txt.includes('"name":')) {
                    score += 100;
                }
                if (txt.includes('"webctas"') && txt.includes('"basePrice"')) {
                    score += 500; // 가격 정보가 있으면 압도적 1순위
                }

                if (score > maxScore) {
                    maxScore = score;
                    bestContent = txt;
                }
            }
            return bestContent;
        """)
        return script_content
    except Exception as e:
        logger.warning(f"   ⚠️ JS Extraction Failed: {e}")
        return None

def parse_json_data(json_str, target_url):
    if not json_str: return None

    try:
        data = json.loads(json_str)
        cache = data.get("cache", {})
        product_data = None

        # 1. URL ID 매칭
        url_id_match = re.search(r'([A-Z]{4}\d{5}_00)', target_url)
        if url_id_match:
            target_id = url_id_match.group(1)
            for val in cache.values():
                if val.get("__typename") == "Product" and target_id in str(val.get("id", "")):
                    product_data = val
                    break

        # 2. 정보량(webctas) 기반 매칭
        if not product_data:
            for val in cache.values():
                if val.get("__typename") == "Product" and (val.get("webctas") or val.get("name")):
                    if not product_data or (len(val.get("webctas", [])) > len(product_data.get("webctas", []))):
                        product_data = val

        if not product_data: return None

        title = clean_text(product_data.get("name", ""))
        parsed_item = {
            "title": title,
            "englishTitle": clean_text(product_data.get("invariantName", "")),
            "publisher": clean_text(product_data.get("publisherName", "Unknown")),
            "platforms": product_data.get("platforms", []),
            "psStoreId": product_data.get("id", ""),
            "imageUrl": "",
            "description": "Full Data Crawler",
            "genreIds": "",
            "originalPrice": 0, "currentPrice": 0, "discountRate": 0,
            "saleEndDate": None, "isPlusExclusive": False, "psPlusPrice": 0,
            "inCatalog": False
        }

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
        KST = timezone(timedelta(hours=9))

        for cta_ref in webctas:
            cta_key = cta_ref.get("__ref")
            if not cta_key: continue
            cta_obj = cache.get(cta_key)
            if not cta_obj: continue

            cta_type = cta_obj.get("type")

            if cta_type == "ADD_TO_LIBRARY":
                upsell = cta_obj.get("price", {}).get("upsellText", "")
                if any(k in upsell for k in ["카탈로그", "구독"]) or "PS_PLUS" in str(cta_obj):
                    parsed_item["inCatalog"] = True

            if cta_type in ["ADD_TO_CART", "PURCHASE", "PRE_ORDER"]:
                price_info = cta_obj.get("price", {})
                if price_info.get("isFree") is True and price_info.get("basePriceValue") == 0:
                    continue

                curr = price_info.get("discountedValue", 0)
                orig = price_info.get("basePriceValue", 0)
                is_plus = price_info.get("isExclusive", False)
                end_ts = price_info.get("endTime")

                end_date = None
                if end_ts:
                    try:
                        dt = datetime.fromtimestamp(int(end_ts)/1000, tz=timezone.utc).astimezone(KST)
                        end_date = dt.strftime('%Y-%m-%d')
                    except: pass

                if curr > 0:
                    prices_found.append({"curr": curr, "orig": orig, "is_plus": is_plus, "end_date": end_date})

        if prices_found:
            best_offer = min(prices_found, key=lambda x: x['curr'])
            parsed_item["currentPrice"] = best_offer['curr']
            parsed_item["originalPrice"] = best_offer['orig']
            parsed_item["saleEndDate"] = best_offer['end_date']
            parsed_item["isPlusExclusive"] = best_offer['is_plus']

            if parsed_item["originalPrice"] > parsed_item["currentPrice"]:
                parsed_item["discountRate"] = int(round(((parsed_item["originalPrice"] - parsed_item["currentPrice"]) / parsed_item["originalPrice"]) * 100))

        return parsed_item

    except Exception as e:
        logger.error(f"   ⚠️ Python Parse Error: {e}")
        return None

def crawl_detail_and_send(driver, wait, target_url):
    try:
        driver.get(target_url)

        # 1차 대기
        try:
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "script[type='application/json']")))
        except TimeoutException:
            logger.warning(f"   ⏳ Timeout (1st try): {target_url} - Retrying...")
            try:
                driver.refresh()
                time.sleep(3.0)
                if CONF["window_stop"]:
                    try: driver.execute_script("window.stop();")
                    except: pass
                wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "script[type='application/json']")))
            except TimeoutException:
                logger.error(f"   ❌ Timeout (Final): No JSON script found - {target_url}")
                return None

        if CONF["window_stop"]:
            try: driver.execute_script("window.stop();")
            except: pass

        json_str = get_json_from_browser(driver)

        if not json_str:
            logger.warning(f"   🚫 Empty Data (JS returned null): {target_url}")
            return None

        payload = parse_json_data(json_str, target_url)

        if not payload or not payload.get("title"):
            return None

        # 0원 데이터 전송 방지 로직
        if payload.get("currentPrice") == 0 and payload.get("originalPrice") == 0:
            logger.info(f"   🚫 Skip (0 Won): {payload['title']}")
            return None

        send_data_to_server(payload, payload["title"])
        return payload

    except Exception as e:
        logger.error(f"   🔥 Error processing {target_url}: {e}")
        return None

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

def send_data_to_server(payload, title):
    try:
        res = session.post(JAVA_API_URL, json=payload, timeout=10)
        if res.status_code == 200:
            price_txt = f"{payload['currentPrice']:,}원"
            if payload.get("inCatalog"): price_txt += " [Catalog]"
            logger.info(f"   📤 Sent: {title} ({price_txt})")
        else:
            logger.error(f"   💥 Server Error {res.status_code}: {title}")
    except Exception as e:
        logger.error(f"   💥 Network Error: {e}")

def send_discord_summary(total_scanned, deals_list):
    if not DISCORD_WEBHOOK_URL: return
    try:
        total_deals = len(deals_list)
        if total_deals == 0: return

        sorted_deals = sorted(deals_list, key=lambda x: x.get('discountRate', 0), reverse=True)
        top_5 = sorted_deals[:5]

        message = f"## 📢 [PS-Tracker] 일일 수집 리포트 ({CURRENT_MODE})\n"
        message += f"**🗓️ 날짜:** {datetime.now().strftime('%Y-%m-%d')}\n"
        message += f"**📊 통계:** 총 `{total_scanned}`개 스캔 / **`{total_deals}`**개 할인 감지!\n"
        message += "━━━━━━━━━━━━━━━━━━\n"

        for i, game in enumerate(top_5, 1):
            sale_price = "{:,}".format(game.get('currentPrice', 0))
            message += f"{i}️⃣ **[{game.get('discountRate', 0)}%] {game.get('title', 'Unknown')}**\n"
            message += f"　 💰 **₩{sale_price}**\n"
            if i < len(top_5): message += "───\n"

        message += "\n[🔗 실시간 최저가 확인하기](https://ps-signal.com)"
        requests.post(DISCORD_WEBHOOK_URL, json={"content": message})
        logger.info("🔔 Discord Summary Report sent!")
    except Exception as e:
        logger.error(f"❌ Failed to send Discord summary: {e}")

def run_batch_crawler_logic():
    global is_running
    logger.info(f"🚀 [Crawler] Started. Mode: {CURRENT_MODE} (Standard Resolution)")

    driver = None
    total_processed_count = 0
    collected_deals = []

    try:
        driver = None
        for try_cnt in range(1, 4):
            try:
                driver = get_driver()
                logger.info("✅ Driver started successfully.")
                break
            except Exception as e:
                logger.warning(f"⚠️ Failed to start driver (Attempt {try_cnt}/3): {e}")
                time.sleep(10) # 10초 숨 고르기 후 재시도

        if not driver:
            logger.error("❌ Critical: Failed to start driver after 3 attempts.")
            return # 완전 종료
        wait = WebDriverWait(driver, CONF['timeout'])
        visited_urls = set()

        # --- [Phase 1: 기존 타겟 갱신] ---
        targets = fetch_update_targets()
        if targets:
            logger.info(f"Target Update: {len(targets)} games")
            for i, url in enumerate(targets):
                if not is_running: break

                if i > 0 and i % CONF["restart_interval"] == 0:
                    logger.info("♻️ [Phase 1] Restarting driver (Memory Cleanup)...")
                    try: driver.quit()
                    except: pass
                    time.sleep(3)
                    driver = get_driver()
                    wait = WebDriverWait(driver, CONF['timeout'])

                res = crawl_detail_and_send(driver, wait, url)
                if res:
                    total_processed_count += 1
                    if res.get('discountRate', 0) > 0: collected_deals.append(res)
                visited_urls.add(url)

                time.sleep(random.uniform(CONF["sleep_min"], CONF["sleep_max"]))

        # --- [Phase 2: 신규 발굴 (Deep Discovery)] ---
        if is_running:
            logger.info(f"🔭 [Phase 2] Starting Deep Discovery...")
            base_category_path = "https://store.playstation.com/ko-kr/category/3f772501-f6f8-49b7-abac-874a88ca4897"
            search_params = "?FULL_GAME=storeDisplayClassification&GAME_BUNDLE=storeDisplayClassification&PREMIUM_EDITION=storeDisplayClassification"

            current_page = 1
            max_pages = 15

            while current_page <= max_pages:
                if not is_running: break

                # [메모리 관리] 2페이지마다 브라우저 재시작
                if current_page > 1 and current_page % 2 == 0:
                     logger.info("♻️ [Phase 2] Restarting driver (Memory Cleanup)...")
                     try: driver.quit()
                     except: pass
                     time.sleep(5)
                     driver = get_driver()
                     wait = WebDriverWait(driver, CONF['timeout'])

                target_list_url = f"{base_category_path}/{current_page}{search_params}"
                logger.info(f"   📖 Scanning Page {current_page}/{max_pages}")

                raw_game_count = 0
                page_candidates = []
                page_load_success = False

                # 리스트 페이지 로딩 (최대 3회 재시도)
                for try_cnt in range(1, 4):
                    try:
                        driver.get(target_list_url)

                        # DOM 그리는 시간이 필요하므로 대기
                        time.sleep(3)

                        # 오라클 프리티어는 화면 렌더링이 느림 -> 강제 스크롤로 로딩 유발
                        driver.execute_script("window.scrollTo(0, document.body.scrollHeight / 2);")
                        time.sleep(1)
                        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")

                        # 명시적 대기: 게임 링크가 뜰 때까지
                        WebDriverWait(driver, 30).until(
                            EC.presence_of_element_located((By.CSS_SELECTOR, "a[href*='/product/']"))
                        )

                        # 요소 추출 시도
                        link_elements = driver.find_elements(By.CSS_SELECTOR, "a[href*='/product/']")
                        if len(link_elements) > 0:
                            page_load_success = True

                            for el in link_elements:
                                url = el.get_attribute("href")
                                if url and "/ko-kr/product/" in url and url not in visited_urls:
                                    if url not in page_candidates: page_candidates.append(url)

                            raw_game_count = len(link_elements)
                            break # 성공했으니 재시도 루프 탈출
                        else:
                            raise Exception("Elements list is empty")

                    except Exception as e:
                        logger.warning(f"   ⚠️ List load failed (Attempt {try_cnt}/3). Retrying... Error: {str(e)[:50]}")
                        # 실패 시 새로고침 대신 잠시 대기
                        time.sleep(5)

                # 3번 시도했는데도 실패했거나, 게임이 0개인 경우
                if not page_load_success:
                    logger.error(f"   ❌ Failed to load page {current_page} properly. Skipping...")
                    current_page += 1
                    continue

                # 로딩은 성공했는데 진짜 0개면 -> 이건 진짜 끝난 것
                # 단, 혹시 모르니 "페이지 로딩 성공" 플래그가 있는데 0개인 경우만 종료
                if raw_game_count == 0:
                    logger.info(f"🛑 No games found on HTML. Assuming end of list at page {current_page}.")
                    break

                logger.info(f"      ✅ Found {len(page_candidates)} new items on page {current_page}.")

                # 추출된 게임들 상세 크롤링 시작
                for url in page_candidates:
                    if not is_running: break

                    # 상세 페이지는 로직
                    res = crawl_detail_and_send(driver, wait, url)
                    if res:
                        total_processed_count += 1
                        if res.get('discountRate', 0) > 0: collected_deals.append(res)
                    visited_urls.add(url)

                    time.sleep(random.uniform(CONF["sleep_min"], CONF["sleep_max"]))

                current_page += 1

        send_discord_summary(total_processed_count, collected_deals)

    except Exception as e:
        logger.error(f"Critical Error: {e}")
        logger.error(traceback.format_exc())
    finally:
        if driver:
            try: driver.quit()
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