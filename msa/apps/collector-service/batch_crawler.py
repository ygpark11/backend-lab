import os # [New] 환경변수 읽기 위해 추가
import time
import json
import requests
import traceback
import re
import threading  # [New] 비동기 실행을 위해 필요
from datetime import datetime
from flask import Flask, jsonify # [New] 웹 서버 기능

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# --- [설정] ---
app = Flask(__name__) # Flask 앱 생성

BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8080")
JAVA_API_URL = f"{BASE_URL}/api/v1/games/collect"
TARGET_API_URL = f"{BASE_URL}/api/v1/games/targets"
SELENIUM_URL = os.getenv("SELENIUM_URL")
LIST_PAGE_URL = "https://store.playstation.com/ko-kr/category/3f772501-f6f8-49b7-abac-874a88ca4897/1"

# 크롤링 중인지 확인하는 플래그 (중복 실행 방지)
is_running = False

def fetch_update_targets():
    """Java 서버에서 갱신 필요한 URL 목록 가져오기"""
    try:
        res = requests.get(TARGET_API_URL)
        if res.status_code == 200:
            return res.json()
        return []
    except Exception as e:
        print(f"⚠️ Java 서버 연결 실패: {e}")
        return []

def run_batch_crawler_logic():
    global is_running
    print("🚀 [지능형 수집기] 출격 준비 중...")

    options = webdriver.ChromeOptions()
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--lang=ko-KR")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    # options.add_argument("--headless") # Grid 사용 시엔 굳이 안 해도 됨 (Grid가 알아서 함)

    driver = None
    try:
        # 1. 드라이버 연결
        if SELENIUM_URL:
            print(f"🌐 [Docker Mode] Selenium Grid({SELENIUM_URL})에 연결합니다...")
            driver = webdriver.Remote(
                command_executor=SELENIUM_URL,
                options=options
            )
        else:
            print("💻 [Local Mode] 로컬 Chrome Driver를 사용합니다.")
            driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

        wait = WebDriverWait(driver, 15)
        visited_urls = set()

        # 2. [Phase 1] Target Update
        targets = fetch_update_targets()
        if targets:
            print(f"🎯 [Target Update] {len(targets)}개 갱신 시작")
            for url in targets:
                crawl_detail_and_send(driver, wait, url)
                visited_urls.add(url)
                time.sleep(2)

        # 3. [Phase 2] Discovery
        print(f"📂 [Discovery] 신규 탐색 시작")
        driver.get(LIST_PAGE_URL)
        time.sleep(5)
        driver.execute_script("window.scrollTo(0, 2000);")
        time.sleep(2)

        link_elements = driver.find_elements(By.CSS_SELECTOR, "a[href*='/product/']")
        discovered_urls = []
        for el in link_elements:
            try:
                url = el.get_attribute("href")
                if url and "/ko-kr/product/" in url and url not in visited_urls:
                    if url not in discovered_urls:
                        discovered_urls.append(url)
            except: continue

        count = 0
        for url in discovered_urls:
            if count >= 30: break
            crawl_detail_and_send(driver, wait, url)
            visited_urls.add(url)
            count += 1
            time.sleep(2)

        print(f"👋 크롤링 작업 완료. (총 {len(visited_urls)}개 처리)")

    except Exception:
        traceback.print_exc()
    finally:
        # 드라이버가 켜져 있다면 끄고, 실행 상태 해제
        if driver:
            driver.quit()
        is_running = False

        print(f"👋 크롤링 작업 완료. (총 {len(visited_urls)}개 처리)")

def crawl_detail_and_send(driver, wait, target_url):
    # ... (기존 상세 수집 로직과 100% 동일, 생략 없이 그대로 두시면 됩니다) ...
    # 편의를 위해 이 함수 내부는 선장님의 기존 코드 그대로 유지해주세요.
    # 복붙하기 어려우시면 아래에 다시 적어드릴까요?
    # (일단 아까 성공한 코드의 이 함수 부분은 그대로 두시면 됩니다.)
    try:
        driver.get(target_url)
        time.sleep(3)
        # 1. 제목
        try:
            title_element = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "[data-qa='mfe-game-title#name']")))
            title = title_element.text
        except: return

        # 2. 장르
        genre_ids = ""
        try:
            genre_element = driver.find_element(By.CSS_SELECTOR, "[data-qa='gameInfo#releaseInformation#genre-value']")
            genre_ids = genre_element.text
        except: pass

        # 3. 가격
        current_price = 0; original_price = 0; discount_rate = 0
        sale_end_date = None; is_plus_exclusive = False; found_valid_offer = False

        for i in range(3):
            try:
                price_elem = driver.find_element(By.CSS_SELECTOR, f"[data-qa='mfeCtaMain#offer{i}#finalPrice']")
                clean_price = re.sub(r'[^0-9]', '', price_elem.text)
                if not clean_price or int(clean_price) == 0: continue
                current_price = int(clean_price)
                found_valid_offer = True

                try:
                    orig_elem = driver.find_element(By.CSS_SELECTOR, f"[data-qa='mfeCtaMain#offer{i}#originalPrice']")
                    original_price = int(re.sub(r'[^0-9]', '', orig_elem.text))
                except: original_price = current_price

                try:
                    disc_elem = driver.find_element(By.CSS_SELECTOR, f"[data-qa='mfeCtaMain#offer{i}#discountInfo']")
                    discount_rate = int(re.sub(r'[^0-9]', '', disc_elem.text))
                    date_elem = driver.find_element(By.CSS_SELECTOR, f"[data-qa='mfeCtaMain#offer{i}#discountDescriptor']")
                    sale_end_date = datetime.strptime(date_elem.text.split(" ")[0], "%Y/%m/%d").strftime("%Y-%m-%d")
                except: pass

                try:
                    driver.find_element(By.CSS_SELECTOR, f"[data-qa='mfeCtaMain#offer{i}#serviceLabel']")
                    is_plus_exclusive = True
                except:
                    if "Plus" in disc_elem.text: is_plus_exclusive = True
                break
            except: continue

        if not found_valid_offer: pass

        # 4. 이미지
        image_url = ""
        try:
            img_elem = driver.find_element(By.CSS_SELECTOR, "img[data-qa='gameBackgroundImage#heroImage#image']")
            image_url = img_elem.get_attribute("src").split("?")[0]
        except: pass

        # 5. 전송
        ps_store_id = target_url.split("/")[-1].split("?")[0]
        payload = {
            "psStoreId": ps_store_id, "title": title, "publisher": "Batch Crawler",
            "imageUrl": image_url, "description": "Full Data Crawler",
            "originalPrice": original_price, "currentPrice": current_price,
            "discountRate": discount_rate, "saleEndDate": sale_end_date,
            "genreIds": genre_ids, "isPlusExclusive": is_plus_exclusive
        }
        res = requests.post(JAVA_API_URL, data=json.dumps(payload), headers={'Content-Type': 'application/json'})
        if res.status_code == 200:
            print(f"   🆗 [성공] {title}")
        else:
            print(f"   💥 [실패] {res.status_code}")
    except Exception as e:
        print(f"   ⚠️ 실패: {e}")

# --- [API 엔드포인트] ---
@app.route('/run', methods=['POST'])
def trigger_crawl():
    global is_running
    if is_running:
        return jsonify({"status": "error", "message": "Crawler is already running"}), 409

    is_running = True
    # 별도 스레드에서 실행 (요청자에게는 바로 응답을 주기 위함)
    thread = threading.Thread(target=run_batch_crawler_logic)
    thread.start()

    return jsonify({"status": "success", "message": "Crawler started"}), 200

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "UP", "crawler_running": is_running}), 200

if __name__ == "__main__":
    # 5000번 포트에서 대기
    print("👂 [Collector] 명령 대기 중 (Port 5000)...")
    app.run(host="0.0.0.0", port=5000)