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

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.common.exceptions import TimeoutException, WebDriverException

# --- [설정 및 로깅 초기화] ---
# 로그 디렉토리 생성
if not os.path.exists('logs'):
    os.makedirs('logs')

# 로깅 설정 (콘솔 + 파일 회전)
log_formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(message)s', datefmt='%Y-%m-%d %H:%M:%S')

# 1. 파일 핸들러 (10MB 씩 5개 보관)
file_handler = RotatingFileHandler('logs/crawler.log', maxBytes=10*1024*1024, backupCount=5)
file_handler.setFormatter(log_formatter)

# 2. 콘솔 핸들러
console_handler = logging.StreamHandler()
console_handler.setFormatter(log_formatter)

logger = logging.getLogger("PS-Collector")
logger.setLevel(logging.INFO)
logger.addHandler(file_handler)
logger.addHandler(console_handler)

app = Flask(__name__)

# 환경 변수 처리 (기본값 설정 강화)
BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8080")
JAVA_API_URL = f"{BASE_URL}/api/v1/games/collect"
TARGET_API_URL = f"{BASE_URL}/api/v1/games/targets"
SELENIUM_URL = os.getenv("SELENIUM_URL")

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
    options.add_argument("--disable-gpu")

    # User-Agent 설정 (봇 차단 방지)
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36")

    # Docker 환경이거나 명시적 헤드리스 요청 시
    if SELENIUM_URL or os.getenv("HEADLESS", "true").lower() == "true":
        options.add_argument("--headless")

    if SELENIUM_URL:
        logger.info(f"🌐 [Docker Mode] Connecting to Selenium Grid: {SELENIUM_URL}")
        return webdriver.Remote(command_executor=SELENIUM_URL, options=options)
    else:
        logger.info("💻 [Local Mode] Starting Chrome Driver")
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
    logger.info("🚀 [Crawler] Batch job started - Pagination Mode On")

    driver = None
    try:
        driver = get_driver()
        wait = WebDriverWait(driver, 15)
        visited_urls = set()

        # [Phase 1] 기존 타겟 갱신
        targets = fetch_update_targets()
        if targets:
            logger.info(f"🔄 [Phase 1] Updating {len(targets)} tracked games...")
            for url in targets:
                if not is_running: break
                crawl_detail_and_send(driver, wait, url)
                visited_urls.add(url)
                time.sleep(random.uniform(1.0, 2.0))

        # [Phase 2] 신규 탐색 (페이지네이션)
        if is_running:
            logger.info(f"🔭 [Phase 2] Starting Deep Discovery (Max 300 Pages)...")
            base_category_path = "https://store.playstation.com/ko-kr/category/3f772501-f6f8-49b7-abac-874a88ca4897"
            search_params = "?FULL_GAME=storeDisplayClassification&GAME_BUNDLE=storeDisplayClassification&PREMIUM_EDITION=storeDisplayClassification"

            current_page = 1
            max_pages = 300

            while current_page <= max_pages:
                if not is_running: break

                # [메모리 관리] 20페이지마다 드라이버 재시작
                if current_page > 1 and current_page % 20 == 0:
                    logger.info("♻️ [Maintenance] Restarting driver to prevent memory leak...")
                    driver.quit()
                    time.sleep(5)
                    driver = get_driver()
                    wait = WebDriverWait(driver, 15)

                target_list_url = f"{base_category_path}/{current_page}{search_params}"
                logger.info(f"   📖 Scanning Page {current_page}/{max_pages}")

                try:
                    driver.get(target_list_url)
                    # 스크롤 로직
                    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "body")))
                    driver.execute_script("window.scrollTo(0, 1000);")
                    time.sleep(1.5)
                    driver.execute_script("window.scrollTo(0, 4000);")
                    time.sleep(1.5)
                except Exception as e:
                    logger.warning(f"⚠️ Page Load Error on {current_page}: {e}")

                # 링크 수집
                page_candidates = []
                try:
                    link_elements = driver.find_elements(By.CSS_SELECTOR, "a[href*='/product/']")
                    for el in link_elements:
                        url = el.get_attribute("href")
                        if url and "/ko-kr/product/" in url and url not in visited_urls:
                            if url not in page_candidates:
                                page_candidates.append(url)
                except: pass

                # 종료 조건
                if not page_candidates:
                    logger.info(f"🛑 No new games found on page {current_page}. Finishing Phase 2.")
                    break

                logger.info(f"      Found {len(page_candidates)} new candidates.")

                # 상세 크롤링
                for url in page_candidates:
                    if not is_running: break
                    crawl_detail_and_send(driver, wait, url)
                    visited_urls.add(url)
                    time.sleep(random.uniform(1.0, 3.0))

                current_page += 1
                time.sleep(random.uniform(2.0, 3.0))

        logger.info(f"✅ Batch job finished. Total processed: {len(visited_urls)} games.")

    except Exception as e:
        logger.error(f"🔥 Critical Crawler Error: {e}")
        logger.error(traceback.format_exc())
    finally:
        if driver:
            try:
                driver.quit()
                logger.info("🔌 Driver closed.")
            except: pass

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

        # 2. 가격 컨테이너 대기 (없으면 무료 게임이거나 로딩 실패)
        try:
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "[data-qa^='mfeCtaMain#offer']")))
        except:
            # 가격이 없는 경우(예: 출시 예정작)도 있으므로 로그만 찍고 진행
            logger.info("   ℹ️ No price container found (Might be free or unreleased)")
            pass

        # 3. 제목 추출
        try:
            title = driver.find_element(By.CSS_SELECTOR, "[data-qa='mfe-game-title#name']").text.strip()
            logger.info(f"   📖 Title: {title}")
        except:
            title = "Unknown Title"
            logger.warning("   ⚠️ Failed to extract title")

        # 4. 장르 추출
        genre_ids = ""
        try:
            genre_element = driver.find_element(By.CSS_SELECTOR, "[data-qa='gameInfo#releaseInformation#genre-value']")
            genre_ids = genre_element.text
        except: pass

        # 5. 플랫폼 추출
        platform_set = set()
        try:
            tag_elements = driver.find_elements(By.CSS_SELECTOR, "[data-qa^='mfe-game-title#productTag']")
            for el in tag_elements:
                raw_text = el.get_attribute("textContent").strip().upper()

                if "PS5" in raw_text: platform_set.add("PS5")
                if "PS4" in raw_text: platform_set.add("PS4")

                if "VR2" in raw_text:
                    platform_set.add("PS_VR2")
                elif "VR" in raw_text:
                    platform_set.add("PS_VR")

            platforms = list(platform_set)
            logger.info(f"   🎮 Platforms: {platforms}")
        except Exception as e:
            logger.warning(f"   ⚠️ Platform parsing error: {e}")
            platforms = []

        # 6.. 가격 추출
        best_price = float('inf')
        best_offer_data = None    # 최저가일 때의 세부 정보(원가, 할인율, Plus여부 등)
        found_valid_offer = False

        # 최대 2번 시도 (DOM 렌더링 지연 대비)
        for attempt in range(2):
            if found_valid_offer: break
            if attempt > 0: time.sleep(1.5)

            # 모든 오퍼(offer0 ~ offer2)를 다 확인해서 가장 싼 가격을 선택
            for i in range(3):
                try:
                    # 해당 순번(i)의 가격 박스 전체를 먼저 찾습니다.
                    offer_selector = f"[data-qa='mfeCtaMain#offer{i}']"
                    try:
                        offer_container = driver.find_element(By.CSS_SELECTOR, offer_selector)
                    except:
                        continue # 해당 번호의 오퍼가 없으면 다음으로

                    # 6-1. 가격 파싱 (textContent 사용으로 화면 가림 문제 해결)
                    try:
                        price_selector = f"[data-qa='mfeCtaMain#offer{i}#finalPrice']"
                        price_elem = offer_container.find_element(By.CSS_SELECTOR, price_selector)

                        # execute_script 대신 get_attribute("textContent") 사용 (가장 안전함)
                        raw_price = price_elem.get_attribute("textContent").strip()
                        clean_price_text = re.sub(r'[^0-9]', '', raw_price)

                        if not clean_price_text: continue
                        current_price = int(clean_price_text)
                        if current_price == 0: continue
                    except:
                        # 가격 태그가 없으면 무효
                        continue

                    # 6-2. PS Plus 여부 파싱
                    is_plus = False

                    # [Check 1] 노란색 텍스트 클래스 (가장 확실)
                    # HTML: <span class="psw-c-t-ps-plus ...">PlayStation Plus로 ...</span>
                    try:
                        if offer_container.find_elements(By.CSS_SELECTOR, ".psw-c-t-ps-plus"):
                            is_plus = True
                    except: pass

                    # [Check 2] 아이콘 (serviceIcon#ps-plus)
                    # HTML: <span data-qa="mfeCtaMain#offer0#serviceIcon#ps-plus" ...>
                    if not is_plus:
                        try:
                            if offer_container.find_elements(By.CSS_SELECTOR, "[data-qa*='serviceIcon#ps-plus']"):
                                is_plus = True
                        except: pass

                    # [Check 3] 텍스트 보조 확인
                    if not is_plus:
                        try:
                            container_text = offer_container.text
                            if "Plus" in container_text and ("할인" in container_text or "절약" in container_text):
                                is_plus = True
                        except: pass

                    # 6-3 원가 파싱
                    original_price = current_price
                    try:
                        orig_elem = offer_container.find_element(By.CSS_SELECTOR, f"[data-qa='mfeCtaMain#offer{i}#originalPrice']")
                        raw_orig = orig_elem.get_attribute("textContent").strip()
                        original_price = int(re.sub(r'[^0-9]', '', raw_orig))
                    except: pass # 원가가 없으면 정가 판매

                    # 할인율 계산
                    discount_rate = 0
                    if original_price > current_price:
                        discount_rate = int(((original_price - current_price) / original_price) * 100)

                    # 6-4 종료일 파싱
                    sale_end_date = None
                    try:
                        date_elem = offer_container.find_element(By.CSS_SELECTOR, f"[data-qa='mfeCtaMain#offer{i}#discountDescriptor']")
                        raw_date_text = date_elem.get_attribute("textContent")

                        # "2025/12/22" 또는 "2025.12.22" 등에서 숫자만 추출
                        date_nums = re.findall(r'\d+', raw_date_text)
                        if len(date_nums) >= 3:
                            # 연도가 2자리인 경우 처리 (보통 4자리)
                            year = date_nums[0] if len(date_nums[0]) == 4 else f"20{date_nums[0]}"
                            sale_end_date = f"{year}-{date_nums[1].zfill(2)}-{date_nums[2].zfill(2)}"
                    except: pass

                    # 6-5 최저가 비교
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

                except Exception:
                    continue

        # [데이터 없음 처리]
        if not found_valid_offer or best_offer_data is None:
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
            "psStoreId": ps_store_id,
            "title": title,
            "publisher": "Batch Crawler",
            "imageUrl": image_url,
            "description": "Full Data Crawler",
            "originalPrice": best_offer_data["originalPrice"],
            "currentPrice": best_offer_data["currentPrice"],
            "discountRate": best_offer_data["discountRate"],
            "saleEndDate": best_offer_data["saleEndDate"],
            "isPlusExclusive": best_offer_data["isPlusExclusive"], # 이제 정상적으로 True/False가 들어갑니다
            "genreIds": genre_ids,
            "platforms": platforms
        }

        send_data_to_server(payload, title)

    except Exception as e:
        logger.error(f"   ⚠️ Fatal Error processing {target_url}: {e}")

def send_data_to_server(payload, title):
    try:
        res = requests.post(JAVA_API_URL, json=payload, timeout=5)
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