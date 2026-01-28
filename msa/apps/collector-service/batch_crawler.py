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
    "LOW": {
        "restart_interval": 30,
        "page_load_strategy": "none",
        "sleep_min": 3.0, # DOM 방식은 로딩 대기가 중요하므로 조금 늘림
        "sleep_max": 5.0,
        "timeout": 25,    # 요소 찾기 대기 시간 확보
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
logger.info(f"🔧 Crawler Config: {CURRENT_MODE} | DOM Parsing Mode")

# --- [3. 핵심 기능: 드라이버 설정] ---

def get_driver():
    DESKTOP_USER_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ]
    random_user_agent = random.choice(DESKTOP_USER_AGENTS)
    window_size = "1920,1080"

    prefs = {
        "profile.managed_default_content_settings.images": 2, # 이미지는 로딩 안 함 (속도 향상)
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

    return driver

def mine_english_title(driver):
    try:
        src = driver.page_source
        match = re.search(r'"invariantName"\s*:\s*"([^"]+)"', src)
        if match:
            raw_title = match.group(1)
            try: raw_title = raw_title.encode('utf-8').decode('unicode_escape')
            except: pass
            raw_title = raw_title.replace("’", "'").replace("‘", "'")
            return re.sub(r'[™®â¢]', '', raw_title).strip()
    except: return None
    return None

def crawl_detail_and_send(driver, wait, target_url):
    try:
        driver.get(target_url)
        time.sleep(CONF["sleep_min"]) # 기본 대기

        # 오라클 프리티어용 강제 중단 (무한 로딩 방지)
        if CONF["window_stop"]:
            try: driver.execute_script("window.stop();")
            except: pass

        # 1. 제목 로딩 대기
        try:
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "[data-qa='mfe-game-title#name']")))
        except TimeoutException:
            logger.warning(f"   ⏳ Timeout (Title not found): {target_url} - Retrying refresh...")
            try:
                driver.refresh()
                time.sleep(5.0)
                if CONF["window_stop"]:
                    try: driver.execute_script("window.stop();")
                    except: pass
                wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "[data-qa='mfe-game-title#name']")))
            except TimeoutException:
                logger.error(f"   ❌ Final Timeout: Page failed to load - {target_url}")
                return None

        try:
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "[data-qa^='mfeCtaMain#offer']")))
        except:
            logger.info("   ℹ️ No price container found (Free or Unreleased)")
            pass

        # 2. 제목 추출
        try:
            title = driver.find_element(By.CSS_SELECTOR, "[data-qa='mfe-game-title#name']").text.strip()
        except:
            logger.error(f"   ❌ Error: Title element found but text missing - {target_url}")
            return None

        english_title = mine_english_title(driver)

        # 3. 플랫폼 추출
        platform_set = set()
        try:
            tag_elements = driver.find_elements(By.CSS_SELECTOR, "[data-qa^='mfe-game-title#productTag']")
            for el in tag_elements:
                raw_text = el.get_attribute("textContent").strip().upper()
                if "PS5" in raw_text: platform_set.add("PS5")
                if "PS4" in raw_text: platform_set.add("PS4")
                if "VR2" in raw_text: platform_set.add("PS_VR2")
                elif "VR" in raw_text: platform_set.add("PS_VR")
        except: pass
        platforms = list(platform_set)

        # 4. 장르 추출
        genre_ids = ""
        try:
            genre_element = driver.find_element(By.CSS_SELECTOR, "[data-qa='gameInfo#releaseInformation#genre-value']")
            genre_ids = genre_element.text
        except: pass

        # 5. 가격 정보 추출 (DOM 순회)
        # 여러 에디션이 있을 수 있으므로 offer0, offer1, offer2... 순회하며 '가장 싼 가격'을 찾음
        best_offer_data = None
        min_price = float('inf')
        is_in_catalog_global = False

        # DOM이 다 그려지길 잠시 대기
        time.sleep(1)

        for i in range(3): # 상위 3개 오퍼 확인
            try:
                container_sel = f"[data-qa='mfeCtaMain#offer{i}']"
                try:
                    offer_container = driver.find_element(By.CSS_SELECTOR, container_sel)
                except: continue # 해당 번호의 오퍼가 없으면 다음으로

                # --- [A] 카탈로그 포함 여부 체크 (HTML 분석 기반) ---
                # 1. 라디오 버튼 값 확인 (가장 확실함)
                try:
                    radio_input = offer_container.find_element(By.CSS_SELECTOR, "input[type='radio']")
                    input_val = radio_input.get_attribute("value")
                    # 예: UPSELL_PS_PLUS_GAME_CATALOG:ADD_TO_CART...
                    if "UPSELL_PS_PLUS_GAME_CATALOG" in input_val:
                        is_in_catalog_global = True
                except: pass

                # 2. 텍스트 확인 (보조) - "스페셜에 가입하여" 등의 문구
                if not is_in_catalog_global:
                    if "게임 카탈로그" in offer_container.text or "스페셜에 가입" in offer_container.text:
                        is_in_catalog_global = True

                # --- [B] 가격 추출 ---
                try:
                    price_sel = f"[data-qa='mfeCtaMain#offer{i}#finalPrice']"
                    price_text = offer_container.find_element(By.CSS_SELECTOR, price_sel).text
                    current_price = int(re.sub(r'[^0-9]', '', price_text))

                    if current_price == 0: continue # 0원은 보통 데모판일 확률 높음 -> 스킵 (무료게임 제외)
                except: continue

                # 정가 추출 (할인이 없으면 정가=판매가)
                original_price = current_price
                try:
                    orig_sel = f"[data-qa='mfeCtaMain#offer{i}#originalPrice']"
                    orig_text = offer_container.find_element(By.CSS_SELECTOR, orig_sel).text
                    original_price = int(re.sub(r'[^0-9]', '', orig_text))
                except:
                    pass # 정가 태그가 없으면 할인 안 하는 것임

                # PS Plus 여부 확인
                is_plus_exclusive = False
                try:
                    if offer_container.find_elements(By.CSS_SELECTOR, ".psw-c-t-ps-plus"):
                        is_plus_exclusive = True
                except: pass

                # 세일 종료일 확인
                sale_end_date = None
                try:
                    desc_sel = f"[data-qa='mfeCtaMain#offer{i}#discountDescriptor']"
                    desc_text = offer_container.find_element(By.CSS_SELECTOR, desc_sel).text
                    # 정규식으로 날짜 추출 (YYYY.MM.DD 등)
                    match = re.search(r'(\d{4})[./-](\d{1,2})[./-](\d{1,2})', desc_text)
                    if match:
                        sale_end_date = f"{match.group(1)}-{match.group(2).zfill(2)}-{match.group(3).zfill(2)}"
                except: pass

                # 최저가 갱신 로직
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

            except Exception: continue

        # 가격 정보를 못 찾았거나, 정보가 없으면
        if not best_offer_data:
            if is_in_catalog_global:
                 logger.info(f"   ℹ️ Catalog Only (Price hidden): {title}")
            return None

        # 6. 이미지 URL (메타태그 활용)
        image_url = ""
        try:
            img_elem = driver.find_element(By.CSS_SELECTOR, "img[data-qa='gameBackgroundImage#heroImage#image']")
            image_url = img_elem.get_attribute("src").split("?")[0]
        except: pass

        # 7. PS Store ID (URL에서 추출 - 중복 방지 핵심)
        # https://store.playstation.com/ko-kr/product/UP0001-PPSA01234_00-GAMEID0000000000
        try:
            ps_store_id = target_url.split("product/")[1].split("?")[0].split("/")[0] # 안전하게 파싱
        except:
            ps_store_id = target_url.split("/")[-1] # fallback

        # 최종 페이로드 구성
        payload = {
            "psStoreId": ps_store_id,
            "title": title,
            "englishTitle": english_title,
            "publisher": "Unknown",
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
        logger.error(f"   🔥 DOM Crawling Error: {target_url} -> {e}")
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
            if payload.get("discountRate", 0) > 0:
                price_txt += f" ({payload['discountRate']}%)"

            # 📦 카탈로그 포함이면 로그에 이모지 추가
            if payload.get("inCatalog"):
                price_txt += " [📦Catalog]"

            logger.info(f"   📤 Sent: {title} - {price_txt}")
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

        message = f"## 📢 [PS-Tracker] 수집 리포트 ({CURRENT_MODE})\n"
        message += f"**🗓️ 날짜:** {datetime.now().strftime('%Y-%m-%d %H:%M')}\n"
        message += f"**📊 결과:** `{total_scanned}`개 스캔 / **`{total_deals}`**개 할인 발견\n"
        message += "━━━━━━━━━━━━━━━━━━\n"

        for i, game in enumerate(top_5, 1):
            sale_price = "{:,}".format(game.get('currentPrice', 0))
            message += f"{i}️⃣ **[{game.get('discountRate', 0)}%] {game.get('title', 'Unknown')}**\n"
            message += f"　 💰 **₩{sale_price}**\n"
            if i < len(top_5): message += "───\n"

        requests.post(DISCORD_WEBHOOK_URL, json={"content": message})
        logger.info("🔔 Discord Summary Sent")
    except Exception as e:
        logger.error(f"❌ Discord Error: {e}")

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
                logger.warning(f"⚠️ Start Fail ({try_cnt}/3): {e}")
                time.sleep(10)

        if not driver:
            return

        wait = WebDriverWait(driver, CONF['timeout'])
        visited_urls = set()

        # --- [Phase 1: 타겟 갱신] ---
        targets = fetch_update_targets()
        if targets:
            logger.info(f"Target Update: {len(targets)} games")
            for i, url in enumerate(targets):
                if not is_running: break

                if i > 0 and i % CONF["restart_interval"] == 0:
                    logger.info("♻️ Restarting driver (Memory Cleanup)...")
                    try: driver.quit()
                    except: pass
                    time.sleep(5)
                    driver = get_driver()
                    wait = WebDriverWait(driver, CONF['timeout'])

                res = crawl_detail_and_send(driver, wait, url)
                if res:
                    total_processed_count += 1
                    if res.get('discountRate', 0) > 0: collected_deals.append(res)
                visited_urls.add(url)
                time.sleep(random.uniform(CONF["sleep_min"], CONF["sleep_max"]))

        # --- [Phase 2: 신규 발굴] ---
        if is_running:
            base_category_path = "https://store.playstation.com/ko-kr/category/3f772501-f6f8-49b7-abac-874a88ca4897"
            current_page = 1
            max_pages = 15

            while current_page <= max_pages:
                if not is_running: break

                target_list_url = f"{base_category_path}/{current_page}"
                logger.info(f"   📖 Scanning Page {current_page}/{max_pages}")

                try:
                    driver.get(target_list_url)
                    time.sleep(5) # 리스트 로딩 대기

                    # 스크롤
                    driver.execute_script("window.scrollTo(0, document.body.scrollHeight / 2);")
                    time.sleep(1)
                    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")

                    WebDriverWait(driver, 30).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, "a[href*='/product/']"))
                    )
                except:
                    logger.warning(f"   ⚠️ List load failed page {current_page}. Skip.")
                    current_page += 1
                    continue

                page_candidates = []
                link_elements = driver.find_elements(By.CSS_SELECTOR, "a[href*='/product/']")

                for el in link_elements:
                    url = el.get_attribute("href")
                    # URL에서 불필요한 파라미터 제거하여 중복 방지
                    if url and "/ko-kr/product/" in url:
                        clean_url = url.split("?")[0]
                        if clean_url not in visited_urls:
                            if clean_url not in page_candidates: page_candidates.append(clean_url)

                if not page_candidates:
                    logger.info("🛑 No new games found.")
                    break

                for url in page_candidates:
                    if not is_running: break
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