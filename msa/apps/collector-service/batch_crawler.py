import os
import time
import json
import requests
import traceback
import re
import threading
import logging
from datetime import datetime
from flask import Flask, jsonify

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.common.exceptions import TimeoutException, WebDriverException

# --- [설정 및 로깅 초기화] ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("PS-Collector")

app = Flask(__name__)

# 환경 변수 처리 (기본값 설정 강화)
BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8080")
JAVA_API_URL = f"{BASE_URL}/api/v1/games/collect"
TARGET_API_URL = f"{BASE_URL}/api/v1/games/targets"
SELENIUM_URL = os.getenv("SELENIUM_URL") # Docker 환경이면 설정됨
LIST_PAGE_URL = "https://store.playstation.com/ko-kr/category/3f772501-f6f8-49b7-abac-874a88ca4897/1"

# 동시 실행 방지 락 (Lock)
lock = threading.Lock()
is_running = False

def get_driver():
    """드라이버 설정 및 생성 로직 분리"""
    options = webdriver.ChromeOptions()
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--lang=ko-KR")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    # Docker 환경에서 headless 모드가 필요할 경우를 대비 (필요시 주석 해제)
    # options.add_argument("--headless")

    if SELENIUM_URL:
        logger.info(f"🌐 [Docker Mode] Connecting to Selenium Grid: {SELENIUM_URL}")
        return webdriver.Remote(command_executor=SELENIUM_URL, options=options)
    else:
        logger.info("💻 [Local Mode] Starting Local Chrome Driver")
        return webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

def fetch_update_targets():
    """Java 서버 통신 예외 처리 강화"""
    try:
        res = requests.get(TARGET_API_URL, timeout=10) # 타임아웃 추가
        if res.status_code == 200:
            targets = res.json()
            logger.info(f"📥 Received {len(targets)} targets from Java Server.")
            return targets
        logger.warning(f"⚠️ Failed to fetch targets. Status: {res.status_code}")
        return []
    except Exception as e:
        logger.error(f"❌ Connection Error to Java Server: {e}")
        return []

def run_batch_crawler_logic():
    global is_running
    logger.info("🚀 [Crawler] Batch job started.")

    driver = None
    try:
        driver = get_driver()
        wait = WebDriverWait(driver, 15)
        visited_urls = set()

        # 1. [Phase 1] Target Update (기존 데이터 갱신)
        targets = fetch_update_targets()
        if targets:
            logger.info(f"🔄 [Phase 1] Updating {len(targets)} tracked games...")
            for url in targets:
                crawl_detail_and_send(driver, wait, url)
                visited_urls.add(url)
                time.sleep(1) # 부하 조절용 최소 대기

        # 2. [Phase 2] Discovery (신규 게임 탐색)
        logger.info(f"🔭 [Phase 2] Discovering new games from Store...")
        driver.get(LIST_PAGE_URL)

        # 스크롤 로직 안전장치
        try:
            WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "body")))
            driver.execute_script("window.scrollTo(0, 2000);")
            time.sleep(3) # 스크롤 후 로딩 대기 (필수)
        except Exception as e:
            logger.warning(f"⚠️ Scroll failed: {e}")

        # 링크 수집
        link_elements = driver.find_elements(By.CSS_SELECTOR, "a[href*='/product/']")
        discovered_urls = []
        for el in link_elements:
            try:
                url = el.get_attribute("href")
                if url and "/ko-kr/product/" in url and url not in visited_urls:
                    if url not in discovered_urls:
                        discovered_urls.append(url)
            except: continue

        logger.info(f"🔎 Found {len(discovered_urls)} candidates. Processing max 30...")

        count = 0
        for url in discovered_urls:
            if count >= 30: break
            crawl_detail_and_send(driver, wait, url)
            visited_urls.add(url)
            count += 1
            time.sleep(1)

        logger.info(f"✅ Batch job finished. Processed: {len(visited_urls)} games.")

    except Exception as e:
        logger.error(f"🔥 Critical Crawler Error: {e}")
        logger.error(traceback.format_exc())
    finally:
        if driver:
            try:
                driver.quit()
                logger.info("🔌 Driver closed successfully.")
            except Exception:
                pass

        # 안전하게 플래그 해제
        with lock:
            is_running = False

def crawl_detail_and_send(driver, wait, target_url):
    try:
        driver.get(target_url)

        # 1. 제목 로딩
        try:
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "[data-qa='mfe-game-title#name']")))
        except TimeoutException:
            logger.warning(f"⏳ Timeout loading title: {target_url}")
            return

        # 2. 가격 컨테이너 대기
        try:
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "[data-qa^='mfeCtaMain#offer']")))
        except: pass

        # 3. 제목 추출
        try:
            title = driver.find_element(By.CSS_SELECTOR, "[data-qa='mfe-game-title#name']").text
        except:
            title = "Unknown Title"

        # 장르 추출
        genre_ids = ""
        try:
            genre_element = driver.find_element(By.CSS_SELECTOR, "[data-qa='gameInfo#releaseInformation#genre-value']")
            genre_ids = genre_element.text
        except: pass

        # 4. 가격 추출 (Retry Logic 추가)
        current_price = 0; original_price = 0; discount_rate = 0
        sale_end_date = None; is_plus_exclusive = False; found_valid_offer = False

        # 최대 2번 시도 (처음에 실패하면 1초 쉬고 한 번 더)
        for attempt in range(2):
            if found_valid_offer: break # 이미 찾았으면 탈출

            if attempt > 0:
                # logger.info(f"   🔄 Retrying price parsing for {title}...")
                time.sleep(1.5) # 1.5초 대기 후 재시도

            for i in range(3):
                try:
                    price_selector = f"[data-qa='mfeCtaMain#offer{i}#finalPrice']"
                    try:
                        price_elem = driver.find_element(By.CSS_SELECTOR, price_selector)

                        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", price_elem)
                        raw_price = driver.execute_script("return arguments[0].textContent;", price_elem).strip()

                    except: continue

                    clean_price_text = re.sub(r'[^0-9]', '', raw_price)
                    if not clean_price_text: continue

                    current_price = int(clean_price_text)
                    if current_price == 0: continue

                    # 성공!
                    found_valid_offer = True

                    # --- 부가 정보 수집 ---
                    try:
                        orig_selector = f"[data-qa='mfeCtaMain#offer{i}#originalPrice']"
                        orig_elem = driver.find_element(By.CSS_SELECTOR, orig_selector)
                        raw_orig = driver.execute_script("return arguments[0].textContent;", orig_elem)
                        original_price = int(re.sub(r'[^0-9]', '', raw_orig))
                    except: original_price = current_price

                    try:
                        disc_selector = f"[data-qa='mfeCtaMain#offer{i}#discountInfo']"
                        disc_elem = driver.find_element(By.CSS_SELECTOR, disc_selector)
                        raw_disc = driver.execute_script("return arguments[0].textContent;", disc_elem)
                        discount_rate = int(re.sub(r'[^0-9]', '', raw_disc))
                    except: pass

                    try:
                        date_selector = f"[data-qa='mfeCtaMain#offer{i}#discountDescriptor']"
                        date_elem = driver.find_element(By.CSS_SELECTOR, date_selector)
                        raw_date_text = driver.execute_script("return arguments[0].textContent;", date_elem)
                        sale_end_date = datetime.strptime(raw_date_text.split(" ")[0], "%Y/%m/%d").strftime("%Y-%m-%d")
                    except: sale_end_date = None

                    try:
                        driver.find_element(By.CSS_SELECTOR, f"[data-qa='mfeCtaMain#offer{i}#serviceLabel']")
                        is_plus_exclusive = True
                    except:
                        try:
                            disc_text = driver.find_element(By.CSS_SELECTOR, f"[data-qa='mfeCtaMain#offer{i}#discountInfo']").text
                            if "Plus" in disc_text: is_plus_exclusive = True
                        except: pass

                    break # 가격 찾았으면 루프 종료

                except: continue

        # [Guard Clause]
        if not found_valid_offer:
            logger.warning(f"🚫 Skip: Valid price not found for {title}")
            return

        # 5. 전송
        image_url = ""
        try:
            img_elem = driver.find_element(By.CSS_SELECTOR, "img[data-qa='gameBackgroundImage#heroImage#image']")
            image_url = img_elem.get_attribute("src").split("?")[0]
        except: pass

        ps_store_id = target_url.split("/")[-1].split("?")[0]
        payload = {
            "psStoreId": ps_store_id, "title": title, "publisher": "Batch Crawler",
            "imageUrl": image_url, "description": "Full Data Crawler",
            "originalPrice": original_price, "currentPrice": current_price,
            "discountRate": discount_rate, "saleEndDate": sale_end_date,
            "genreIds": genre_ids, "isPlusExclusive": is_plus_exclusive
        }

        send_data_to_server(payload, title)

    except Exception as e:
        logger.error(f"   ⚠️ Failed to process {target_url}: {e}")

def send_data_to_server(payload, title):
    try:
        res = requests.post(JAVA_API_URL, data=json.dumps(payload), headers={'Content-Type': 'application/json'}, timeout=5)
        if res.status_code == 200:
            logger.info(f"   📤 Sent: {title} ({payload['currentPrice']} KRW)")
        else:
            logger.error(f"   💥 Server Error ({res.status_code}): {title}")
    except Exception as e:
        logger.error(f"   💥 Network Error sending {title}: {e}")

# --- [API 엔드포인트] ---
@app.route('/run', methods=['POST'])
def trigger_crawl():
    global is_running

    # Thread-safe Lock 사용
    with lock:
        if is_running:
            return jsonify({"status": "error", "message": "Crawler is already running"}), 409
        is_running = True

    # 별도 스레드에서 실행
    thread = threading.Thread(target=run_batch_crawler_logic)
    thread.daemon = True # 메인 프로세스 종료 시 같이 종료되도록 설정
    thread.start()

    return jsonify({"status": "success", "message": "Crawler started in background"}), 200

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "UP", "crawler_running": is_running}), 200

if __name__ == "__main__":
    logger.info("👂 [Collector] Server starting on port 5000...")
    app.run(host="0.0.0.0", port=5000)