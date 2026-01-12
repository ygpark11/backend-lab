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
from datetime import datetime
from flask import Flask, jsonify

import undetected_chromedriver as uc
from fake_useragent import UserAgent

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
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
# ⚙️ 하이브리드 모드 설정
# =========================================================
# 환경변수 CRAWLER_MODE가 'HIGH'면 고성능, 없으면 'LOW'(오라클 프리티어)
CURRENT_MODE = os.getenv("CRAWLER_MODE", "LOW").upper()

CONFIG = {
    "LOW": {  # 🐢 오라클 프리티어
        "restart_interval": 50,         # 50개마다 재시작 (메모리 보호)
        "page_load_strategy": "none",   # 로딩 대기 안 함 (직접 제어)
        "sleep_min": 3.0,               # 최소 3초 대기 (CPU 안정화)
        "sleep_max": 5.0,               # 최대 5초 대기
        "timeout": 8,                   # 타임아웃 짧게 (빠른 손절)
        "use_cdp_block": True,          # 이미지/CSS 차단 (필수)
        "window_stop": True             # 강제 로딩 중단 사용
    },
    "HIGH": { # 🏎️ 고사양 서버/PC
        "restart_interval": 500,        # 500개마다 재시작
        "page_load_strategy": "normal", # 정상 로딩
        "sleep_min": 1.5,               # 1.5초 대기
        "sleep_max": 2.5,               # 2.5초 대기
        "timeout": 15,                  # 타임아웃 넉넉히
        "use_cdp_block": False,         # 차단 안 함
        "window_stop": False            # 강제 중단 안 함
    }
}

CONF = CONFIG.get(CURRENT_MODE, CONFIG["LOW"])

logger.info(f"🔧 Crawler Mode Initialized: [{CURRENT_MODE}]")
logger.info(f"   👉 Strategy: {CONF['page_load_strategy']} | Restart: {CONF['restart_interval']}")
# =========================================================


def get_driver():
    """드라이버 설정 (Hybrid Mode 적용)"""
    ua = UserAgent()
    random_user_agent = ua.random
    logger.info(f"🎭 Generated User-Agent: {random_user_agent}")

    w = random.randint(1800, 1920)
    h = random.randint(950, 1080)
    random_window_size = f"{w},{h}"

    driver = None

    # [공통] 기본 최적화 옵션
    prefs = {
        "profile.managed_default_content_settings.images": 2,
        "profile.default_content_setting_values.notifications": 2,
        "profile.default_content_setting_values.popups": 2,
        "disk-cache-size": 4096
    }

    # [Case A] Docker / Selenium Grid
    if SELENIUM_URL:
        logger.info(f"🌐 [Docker Mode] Grid: {SELENIUM_URL}")
        options = webdriver.ChromeOptions()

        # ⚙️ [Hybrid] 설정된 로딩 전략 적용
        options.page_load_strategy = CONF['page_load_strategy']

        options.add_argument(f"user-agent={random_user_agent}")
        options.add_argument(f"--window-size={random_window_size}")

        # OCI 리소스 절약 필수 옵션
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--disable-extensions")

        # LOW 모드일 때 추가 경량화
        if CURRENT_MODE == "LOW":
            options.add_argument("--disable-background-networking")
            options.add_argument("--disable-sync")

        options.add_experimental_option("prefs", prefs)
        driver = webdriver.Remote(command_executor=SELENIUM_URL, options=options)

    # [Case B] 로컬 환경 (Undetected Chrome)
    else:
        logger.info(f"💻 [Local Mode] Starting Chrome ({CURRENT_MODE} Spec)")
        options = uc.ChromeOptions()

        # ⚙️ [Hybrid] 설정된 로딩 전략 적용
        options.page_load_strategy = CONF['page_load_strategy']

        if os.getenv("HEADLESS", "false").lower() == "true":
             options.add_argument("--headless=new")

        options.add_argument(f"user-agent={random_user_agent}")
        options.add_argument(f"--window-size={random_window_size}")
        options.add_argument("--disable-popup-blocking")

        # OCI 로컬 실행 시 메모리 절약
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")

        driver = uc.Chrome(options=options, use_subprocess=True)

    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

    # ⚙️ [Hybrid] CDP 네트워크 차단 (설정된 경우만)
    if CONF["use_cdp_block"]:
        try:
            driver.execute_cdp_cmd("Network.setBlockedURLs", {
                "urls": ["*.png", "*.jpg", "*.gif", "*.webp", "*.css", "*.woff", "*.woff2", "*google-analytics*"]
            })
            driver.execute_cdp_cmd("Network.enable", {})
            logger.info("   🛡️ Network filtering enabled (Images/Fonts/CSS blocked)")
        except Exception as e:
            logger.warning(f"   ⚠️ CDP Optimization skipped: {e}")

    return driver

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

def mine_english_title(driver):
    try:
        src = driver.page_source
        match = re.search(r'"invariantName"\s*:\s*"([^"]+)"', src)
        if match:
            raw_title = match.group(1)
            try: raw_title = raw_title.encode('utf-8').decode('unicode_escape')
            except: pass
            try: raw_title = raw_title.encode('latin1').decode('utf-8')
            except: pass

            raw_title = raw_title.replace("’", "'").replace("‘", "'")
            raw_title = re.sub(r'[™®â¢]', '', raw_title)
            logger.info(f"   💎 Mined Invariant Title: {raw_title}")
            return raw_title.strip()
        return None
    except: return None

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
    logger.info(f"🚀 [Crawler] Batch job started - Mode: {CURRENT_MODE}")

    driver = None
    total_processed_count = 0
    collected_deals = []

    try:
        driver = get_driver()
        wait = WebDriverWait(driver, CONF['timeout']) # 설정된 타임아웃 사용
        visited_urls = set()

        # [Phase 1] 기존 타겟 갱신
        targets = fetch_update_targets()
        if targets:
            logger.info(f"🔄 [Phase 1] Updating {len(targets)} tracked games...")

            for i, url in enumerate(targets):
                if not is_running: break

                # ⚙️ [Hybrid] 설정된 주기로 재시작
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

                # ⚙️ [Hybrid] 설정된 휴식 시간
                if random.random() < 0.3: # 30% 확률로 휴식
                    time.sleep(random.uniform(CONF["sleep_min"], CONF["sleep_max"]))

        # [Phase 2] 신규 탐색
        if is_running:
            logger.info(f"🔭 [Phase 2] Starting Deep Discovery...")
            base_category_path = "https://store.playstation.com/ko-kr/category/3f772501-f6f8-49b7-abac-874a88ca4897"
            search_params = "?FULL_GAME=storeDisplayClassification&GAME_BUNDLE=storeDisplayClassification&PREMIUM_EDITION=storeDisplayClassification"

            current_page = 1
            max_pages = 15

            while current_page <= max_pages:
                if not is_running: break

                # LOW 모드(오라클): 2페이지마다 재시작 (2페이지 x 24개 = 약 48개 게임 → Phase 1의 50개 제한과 비슷)
                # HIGH 모드: 20페이지마다 재시작
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

                    # ⚙️ [Hybrid] 리스트 페이지 접근 최적화
                    time.sleep(2.0) # JSON 로딩 대기
                    if CONF["window_stop"]:
                        driver.execute_script("window.stop();")

                    # 요소 확인
                    try:
                        WebDriverWait(driver, 5).until(EC.presence_of_element_located((By.CSS_SELECTOR, "a[href*='/product/']")))
                    except TimeoutException:
                        driver.refresh()
                        time.sleep(3)

                    # 스크롤
                    driver.execute_script(f"window.scrollTo(0, {random.randint(800, 1200)});")
                    time.sleep(1)

                except Exception as e:
                    logger.warning(f"⚠️ Page Load Error on {current_page}: {e}")

                # 링크 수집
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
                    deal_info = crawl_detail_and_send(driver, wait, url)
                    if deal_info:
                        total_processed_count += 1
                        if deal_info.get('discountRate', 0) > 0:
                            collected_deals.append(deal_info)
                    visited_urls.add(url)
                    # Phase 2는 조금 더 빨리 넘어가도 됨
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

def crawl_detail_and_send(driver, wait, target_url):
    try:
        # ⚙️ [Hybrid] 접근 방식 최적화
        driver.get(target_url)

        # 1. 안전 마진 대기
        time.sleep(CONF["sleep_min"])

        # 2. 강제 로딩 중단 (LOW 모드일 때만 작동)
        if CONF["window_stop"]:
            try: driver.execute_script("window.stop();")
            except: pass

        # 3. 제목 로딩 (실패시 빠른 포기)
        try:
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "[data-qa='mfe-game-title#name']")))
        except TimeoutException:
            # 1차 실패 시: 로그 찍고 새로고침 시도
            logger.warning(f"   ⚠️ Timeout (1st). Retrying refresh... : {target_url}")

            try:
                driver.refresh() # 심폐소생술!
                time.sleep(3.0)  # 새로고침 후 다시 3초 대기

                # 강제 중단 (2차 - 새로고침 했으니 다시 끊어줘야 함)
                if CONF["window_stop"]:
                    try: driver.execute_script("window.stop();")
                    except: pass

                # 2차 시도: 다시 제목 찾기
                wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "[data-qa='mfe-game-title#name']")))
                logger.info(f"   ✅ Recovered after refresh!")

            except TimeoutException:
                # 2번 해도 안 되면 진짜 안 되는 거임 -> 쿨하게 포기
                logger.error(f"   ❌ Final Timeout (Give up): {target_url}")
                return None

        # 4. 가격 컨테이너 (없으면 패스)
        try:
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "[data-qa^='mfeCtaMain#offer']")))
        except:
            logger.info("   ℹ️ No price container found")
            pass

        english_title = mine_english_title(driver)

        try:
            title = driver.find_element(By.CSS_SELECTOR, "[data-qa='mfe-game-title#name']").text.strip()
        except:
            title = "Unknown Title"

        genre_ids = ""
        try:
            genre_element = driver.find_element(By.CSS_SELECTOR, "[data-qa='gameInfo#releaseInformation#genre-value']")
            genre_ids = genre_element.text
        except: pass

        platform_set = set()
        try:
            tag_elements = driver.find_elements(By.CSS_SELECTOR, "[data-qa^='mfe-game-title#productTag']")
            for el in tag_elements:
                raw_text = el.get_attribute("textContent").strip().upper()
                if "PS5" in raw_text: platform_set.add("PS5")
                if "PS4" in raw_text: platform_set.add("PS4")
        except: pass
        platforms = list(platform_set)

        best_price = float('inf')
        best_offer_data = None
        found_valid_offer = False

        # DOM 파싱을 위한 짧은 대기
        time.sleep(0.5)

        for i in range(3):
            try:
                offer_selector = f"[data-qa='mfeCtaMain#offer{i}']"
                try: offer_container = driver.find_element(By.CSS_SELECTOR, offer_selector)
                except: continue

                try:
                    price_selector = f"[data-qa='mfeCtaMain#offer{i}#finalPrice']"
                    price_elem = offer_container.find_element(By.CSS_SELECTOR, price_selector)
                    raw_price = price_elem.get_attribute("textContent").strip()
                    clean_price_text = re.sub(r'[^0-9]', '', raw_price)
                    if not clean_price_text: continue
                    current_price = int(clean_price_text)
                    if current_price == 0: continue
                except: continue

                is_plus = False
                try:
                    if offer_container.find_elements(By.CSS_SELECTOR, ".psw-c-t-ps-plus"): is_plus = True
                except: pass

                original_price = current_price
                found_original = False
                try:
                    orig_elem = offer_container.find_element(By.CSS_SELECTOR, f"[data-qa='mfeCtaMain#offer{i}#originalPrice']")
                    parsed_orig = int(re.sub(r'[^0-9]', '', orig_elem.get_attribute("textContent").strip()))
                    if parsed_orig > current_price:
                        original_price = parsed_orig
                        found_original = True
                except: pass

                if not found_original:
                    try:
                        strikethrough_elems = offer_container.find_elements(By.CSS_SELECTOR, ".psw-t-strike")
                        for elem in strikethrough_elems:
                            parsed_price = int(re.sub(r'[^0-9]', '', elem.get_attribute("textContent").strip()))
                            if parsed_price > current_price:
                                original_price = parsed_price
                                break
                    except: pass

                discount_rate = 0
                if original_price > current_price:
                    discount_rate = int(round(((original_price - current_price) / original_price) * 100))

                sale_end_date = None
                try:
                    date_elem = offer_container.find_element(By.CSS_SELECTOR, f"[data-qa='mfeCtaMain#offer{i}#discountDescriptor']")
                    match = re.search(r'(\d{4})[./-](\d{1,2})[./-](\d{1,2})', date_elem.get_attribute("textContent"))
                    if match: sale_end_date = f"{match.group(1)}-{match.group(2).zfill(2)}-{match.group(3).zfill(2)}"
                except: pass

                if current_price < best_price:
                    best_price = current_price
                    best_offer_data = {
                        "originalPrice": original_price,
                        "currentPrice": current_price,
                        "discountRate": discount_rate,
                        "saleEndDate": sale_end_date,
                        "isPlusExclusive": is_plus
                    }
                    found_valid_offer = True
            except: continue

        if not found_valid_offer or best_offer_data is None:
            logger.warning(f"🚫 Skip: Valid price not found for {title}")
            return

        image_url = ""
        try:
            scripts = driver.find_elements(By.CSS_SELECTOR, "script[type='application/json']")
            for script in scripts:
                content = script.get_attribute("innerHTML")
                if "media" not in content: continue
                try:
                    data = json.loads(content)
                    cache = data.get("cache", {})
                    for val in cache.values():
                        if "personalizedMeta" in val and "media" in val["personalizedMeta"]:
                            for media in val["personalizedMeta"]["media"]:
                                if media.get("role") == "MASTER":
                                    image_url = media.get("url"); break
                                if media.get("role") == "GAMEHUB_COVER_ART" and not image_url:
                                    image_url = media.get("url")
                            if image_url: break
                    if image_url: break
                except: pass
            if image_url: logger.info(f"   📸 Image found via JSON Script")
        except: pass

        if not image_url:
            try:
                image_url = driver.find_element(By.CSS_SELECTOR, "meta[property='og:image']").get_attribute("content").split("?")[0]
            except: pass

        ps_store_id = target_url.split("/")[-1].split("?")[0]
        payload = {
            "psStoreId": ps_store_id,
            "title": title,
            "englishTitle": english_title,
            "publisher": "Batch Crawler",
            "imageUrl": image_url,
            "description": "Full Data Crawler",
            "originalPrice": best_offer_data["originalPrice"],
            "currentPrice": best_offer_data["currentPrice"],
            "discountRate": best_offer_data["discountRate"],
            "saleEndDate": best_offer_data["saleEndDate"],
            "isPlusExclusive": best_offer_data["isPlusExclusive"],
            "genreIds": genre_ids,
            "platforms": platforms
        }

        send_data_to_server(payload, title)
        return payload

    except Exception as e:
        logger.error(f"   ⚠️ Fatal Error processing {target_url}: {e}")
        return None

def send_data_to_server(payload, title):
    try:
        res = session.post(JAVA_API_URL, json=payload, timeout=30)
        if res.status_code == 200:
            logger.info(f"   📤 Sent: {title} ({payload['currentPrice']} KRW)")
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