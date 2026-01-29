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

# [환경 변수]
BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8080")
JAVA_API_URL = f"{BASE_URL}/api/v1/games/collect"
TARGET_API_URL = f"{BASE_URL}/api/v1/games/targets"
SELENIUM_URL = os.getenv("SELENIUM_URL")
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")

lock = threading.Lock()
is_running = False

# [오라클 프리티어 맞춤 설정]
CURRENT_MODE = os.getenv("CRAWLER_MODE", "LOW").upper()
CONFIG = {
    "LOW": {
        "restart_interval": 40,      # Phase 1: 30개마다 재시작
        "page_restart_interval": 2,  # Phase 2: 2페이지마다 재시작
        "page_load_strategy": "none",
        "sleep_min": 3.0,
        "sleep_max": 5.0,
        "timeout": 25,
        "window_stop": True
    },
    "HIGH": {
        "restart_interval": 100,
        "page_restart_interval": 10,
        "page_load_strategy": "normal",
        "sleep_min": 2.0,
        "sleep_max": 4.0,
        "timeout": 15,
        "window_stop": False
    }
}
CONF = CONFIG.get(CURRENT_MODE, CONFIG["LOW"])
logger.info(f"🔧 Crawler Config: {CURRENT_MODE} | DOM Parsing Mode")


# --- [2. 드라이버 설정] ---
def get_driver():
    # PC용 User-Agent 고정 (모바일로 인식되는 것 방지)
    DESKTOP_USER_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15"
    ]
    random_user_agent = random.choice(DESKTOP_USER_AGENTS)

    prefs = {
        "profile.managed_default_content_settings.images": 2, # 이미지 차단
        "disk-cache-size": 4096
    }

    driver = None
    if SELENIUM_URL:
        options = webdriver.ChromeOptions()
        options.page_load_strategy = CONF['page_load_strategy']
        options.add_argument(f"user-agent={random_user_agent}")
        options.add_argument("--window-size=1920,1080")
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
        options.add_argument("--window-size=1920,1080")
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

        # 1. 제목 로딩
        try:
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "[data-qa='mfe-game-title#name']")))
        except TimeoutException:
            logger.warning(f"⏳ Timeout loading title: {target_url}")
            return

        # 2. 가격 컨테이너 대기 (없으면 무료 게임이거나 로딩 실패)
        try:
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "[data-qa^='mfeCtaMain#offer']")))
        except:
            # 가격이 없는 경우(예: 출시 예정작)도 있으므로 로그만 찍고 진행
            logger.info("   ℹ️ No price container found (Might be free or unreleased)")
            pass

        # 제목
        try:
            title = driver.find_element(By.CSS_SELECTOR, "[data-qa='mfe-game-title#name']").text.strip()
        except: return None

        english_title = mine_english_title(driver)

        # 플랫폼
        platform_set = set()
        try:
            tag_elements = driver.find_elements(By.CSS_SELECTOR, "[data-qa^='mfe-game-title#productTag']")
            for el in tag_elements:
                raw_text = el.get_attribute("textContent").strip().upper()
                if "PS5" in raw_text: platform_set.add("PS5")
                if "PS4" in raw_text: platform_set.add("PS4")
                if "VR2" in raw_text: platform_set.add("PS_VR2")
                elif "VR" in raw_text: platform_set.add("PS_VR")
            platforms = list(platform_set)
        except Exception as e:
            platforms = []


        # 장르
        genre_ids = ""
        try:
            genre_element = driver.find_element(By.CSS_SELECTOR, "[data-qa='gameInfo#releaseInformation#genre-value']")
            genre_ids = genre_element.text
        except: pass

        # 4. 가격 및 카탈로그 정보
        best_offer_data = None
        min_price = float('inf')
        is_in_catalog_global = False

        time.sleep(1) # DOM 안정화

        for i in range(3):
            try:
                container_sel = f"[data-qa='mfeCtaMain#offer{i}']"
                try:
                    offer_container = driver.find_element(By.CSS_SELECTOR, container_sel)
                except: continue

                # [카탈로그 체크]
                try:
                    radio_input = offer_container.find_element(By.CSS_SELECTOR, "input[type='radio']")
                    if "UPSELL_PS_PLUS_GAME_CATALOG" in radio_input.get_attribute("value"):
                        is_in_catalog_global = True
                except: pass

                if not is_in_catalog_global:
                    if "게임 카탈로그" in offer_container.text or "스페셜에 가입" in offer_container.text:
                        is_in_catalog_global = True

                # [가격 추출]
                try:
                    price_sel = f"[data-qa='mfeCtaMain#offer{i}#finalPrice']"
                    price_text = offer_container.find_element(By.CSS_SELECTOR, price_sel).text.strip()
                    current_price = int(re.sub(r'[^0-9]', '', price_text))
                    if current_price == 0: continue
                except: continue

                # 정가
                original_price = current_price
                try:
                    orig_sel = f"[data-qa='mfeCtaMain#offer{i}#originalPrice']"
                    orig_text = offer_container.find_element(By.CSS_SELECTOR, orig_sel).text
                    original_price = int(re.sub(r'[^0-9]', '', orig_text))
                except: pass

                # Plus 할인 여부
                is_plus_exclusive = False
                try:
                    if offer_container.find_elements(By.CSS_SELECTOR, ".psw-c-t-ps-plus"):
                        is_plus_exclusive = True
                except: pass

                # 종료일
                sale_end_date = None
                try:
                    desc_sel = f"[data-qa='mfeCtaMain#offer{i}#discountDescriptor']"
                    desc_text = offer_container.find_element(By.CSS_SELECTOR, desc_sel).text
                    # 정규식으로 날짜 추출 (YYYY.MM.DD 등)
                    match = re.search(r'(\d{4})[./-](\d{1,2})[./-](\d{1,2})', desc_text)
                    if match:
                        sale_end_date = f"{match.group(1)}-{match.group(2).zfill(2)}-{match.group(3).zfill(2)}"
                except: pass

                # 최저가 갱신
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
                 logger.info(f"   ℹ️ Catalog Only (No purchase price): {title}")
            return None

        # 5. 이미지 (고화질 우선)
        image_url = ""
        try:
            img_elem = driver.find_element(By.CSS_SELECTOR, "img[data-qa='gameBackgroundImage#heroImage#image']")
            image_url = img_elem.get_attribute("src").split("?")[0]
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
    """크롤링 종료 후 요약 리포트를 디스코드로 전송"""
    if not DISCORD_WEBHOOK_URL:
        return

    try:
        total_deals = len(deals_list)
        if total_deals == 0:
            logger.info("📭 No deals found today. Skipping Discord report.")
            return

        # 할인율 높은 순 정렬 및 상위 5개 추출
        sorted_deals = sorted(deals_list, key=lambda x: x['discountRate'], reverse=True)
        top_5 = sorted_deals[:5]

        # [헤더] 통계 요약
        message = f"## 📢 [PS-Tracker] 일일 수집 리포트\n"
        message += f"**🗓️ 날짜:** {datetime.now().strftime('%Y-%m-%d')}\n"
        message += f"**📊 통계:** 총 `{total_scanned}`개 스캔 / **`{total_deals}`**개 할인 감지! 🔥\n"
        message += "━━━━━━━━━━━━━━━━━━"

        # [메인] Top 5 골든 딜 상세 리스팅
        message += "**🏆 오늘의 Top 5 할인**\n"
        for i, game in enumerate(top_5, 1):
            sale_price = "{:,}".format(game['currentPrice'])
            plat_list = game.get('platforms', [])
            plat_str = f" | `{'/'.join(plat_list)}`" if plat_list else ""

            # 한 게임씩 블록화하여 출력
            message += f"{i}️⃣ **[{game['discountRate']}%] {game['title']}**\n"
            message += f"　 💰 **₩{sale_price}**{plat_str}\n"
            message += f"　 ⏳ ~{game['saleEndDate'] or '상시 종료'}\n"

            # 가독성을 위한 구분선 추가 (마지막 항목 제외)
            if i < len(top_5):
                message += "───\n"

        # [푸터] 하단 정보 및 링크
        message += "━━━━━━━━━━━━━━━━━━\n"
        if total_deals > 5:
            message += f"외 **{total_deals - 5}**개의 할인이 더 있습니다!\n"

        message += "\n[🔗 실시간 최저가 확인하기](https://ps-signal.com)"

        # 디스코드 전송
        requests.post(DISCORD_WEBHOOK_URL, json={"content": message})
        logger.info("🔔 Polished Discord Summary Report sent!")

    except Exception as e:
        logger.error(f"❌ Failed to send Discord summary: {e}")

# --- [4. 메인 실행 로직 (메모리 관리 포함)] ---
def run_batch_crawler_logic():
    global is_running
    logger.info(f"🚀 [Crawler] Started. Mode: {CURRENT_MODE}")

    driver = None
    total_processed_count = 0
    collected_deals = []

    try:
        driver = get_driver()
        wait = WebDriverWait(driver, CONF['timeout'])
        visited_urls = set()

        # [Phase 1] 타겟 갱신
        targets = fetch_update_targets()
        if targets:
            logger.info(f"🔄 [Phase 1] Updating {len(targets)} tracked games...")
            for i, url in enumerate(targets):
                if not is_running: break

                # [메모리 관리 1] 지정된 개수마다 재시작
                if i > 0 and i % CONF["restart_interval"] == 0:
                    logger.info("♻️ [Phase 1] Memory Cleanup... Restarting Driver.")
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

                # [휴식] 차단 방지 (랜덤 딜레이)
                time.sleep(random.uniform(CONF["sleep_min"], CONF["sleep_max"]))

        # [Phase 2] 신규 탐색
        if is_running:
            logger.info(f"🔭 [Phase 2] Starting Deep Discovery ...")
            base_category_path = "https://store.playstation.com/ko-kr/category/3f772501-f6f8-49b7-abac-874a88ca4897"
            search_params = "?FULL_GAME=storeDisplayClassification&GAME_BUNDLE=storeDisplayClassification&PREMIUM_EDITION=storeDisplayClassification"

            current_page = 1
            max_pages = 10

            while current_page <= max_pages:
                if not is_running: break

                # [메모리 관리 2] 2페이지(LOW) 또는 10페이지(HIGH)마다 재시작
                if current_page > 1 and current_page % CONF["page_restart_interval"] == 0:
                    logger.info("♻️ [Phase 2] Memory Cleanup... Restarting Driver.")
                    try: driver.quit()
                    except: pass
                    time.sleep(10)
                    driver = get_driver()
                    wait = WebDriverWait(driver, CONF['timeout'])

                target_list_url = f"{base_category_path}/{current_page}{search_params}"
                logger.info(f"   📖 Scanning Page {current_page}/{max_pages}")

                try:
                    driver.get(target_list_url)

                    try:
                        WebDriverWait(driver, 25).until(EC.presence_of_element_located((By.CSS_SELECTOR, "a[href*='/product/']")))
                    except TimeoutException:
                        logger.warning(f"   ⚠️ Page load timeout. Retrying...")
                        driver.refresh()
                        time.sleep(3)

                    # 스크롤
                    driver.execute_script(f"window.scrollTo(0, {random.randint(800, 1200)});")
                    time.sleep(random.uniform(1.0, 2.0))
                    driver.execute_script(f"window.scrollTo(0, {random.randint(3000, 4500)});")
                    time.sleep(random.uniform(2.0, 3.0))

                except:
                    logger.warning(f"   ⚠️ List load failed page {current_page}. Skip.")
                    current_page += 1
                    continue

                page_candidates = []
                try:
                    link_elements = driver.find_elements(By.CSS_SELECTOR, "a[href*='/product/']")
                    for el in link_elements:
                        url = el.get_attribute("href")
                        if url and "/ko-kr/product/" in url and url not in visited_urls:
                            if url not in page_candidates:
                                page_candidates.append(url)
                except: pass

                if not page_candidates:
                    logger.info(f"🛑 No new games found on page {current_page}. Finishing Phase 2.")
                    break

                logger.info(f"      Found {len(page_candidates)} new candidates.")

                for url in page_candidates:
                    if not is_running: break
                    res = crawl_detail_and_send(driver, wait, url)
                    if res:
                        total_processed_count += 1
                        if res.get('discountRate', 0) > 0: collected_deals.append(res)
                    visited_urls.add(url)
                    time.sleep(random.uniform(CONF["sleep_min"], CONF["sleep_max"]))

                current_page += 1
                time.sleep(random.uniform(CONF["sleep_min"], CONF["sleep_max"]))

            send_discord_summary(total_processed_count, collected_deals)

    except Exception as e:
        logger.error(f"Critical Error: {e}")
        logger.error(traceback.format_exc())
    finally:
        if driver:
            try:
                driver.quit()
                logger.info("🔌 Driver closed.")
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