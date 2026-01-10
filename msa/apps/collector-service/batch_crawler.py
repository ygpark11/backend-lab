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
# 로그 디렉토리 생성
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

# 동시 실행 방지 락 (Lock)
lock = threading.Lock()
is_running = False

def get_driver():
    """드라이버 설정 및 생성 로직 분리"""
    # 1. 랜덤 User-Agent 생성
    ua = UserAgent()
    random_user_agent = ua.random
    logger.info(f"🎭 Generated User-Agent: {random_user_agent}")

    w = random.randint(1800, 1920)
    h = random.randint(950, 1080)
    random_window_size = f"{w},{h}"
    logger.info(f"📏 Random Window Size: {random_window_size}")

    driver = None

    # [공통] 성능 최적화 옵션
    prefs = {
        "profile.managed_default_content_settings.images": 2,       # 이미지 로딩 차단 (필수)
        "profile.default_content_setting_values.notifications": 2,  # 알림 차단
        "profile.default_content_setting_values.popups": 2,         # 팝업 차단
        "profile.default_content_setting_values.geolocation": 2,    # 위치 정보 요청 차단
        "disk-cache-size": 4096                                     # 디스크 캐시 크기 제한
    }

    # [Case A] Docker / Selenium Grid 환경
    if SELENIUM_URL:
        logger.info(f"🌐 [Docker Mode] Connecting to Selenium Grid: {SELENIUM_URL}")
        options = webdriver.ChromeOptions()

        # Eager 모드 설정
        options.page_load_strategy = 'eager'

        options.add_argument(f"user-agent={random_user_agent}")
        options.add_argument(f"--window-size={random_window_size}")

        # 🚀 [리소스 절약 옵션]
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage") # 호스트 메모리 부족 시 디스크 사용
        options.add_argument("--disable-gpu")           # GPU 없음 명시
        options.add_argument("--no-zygote")             # 프로세스 포크 최소화 (메모리 절약)
        options.add_argument("--disable-extensions")    # 확장 프로그램 비활성화
        options.add_argument("--dns-prefetch-disable")  # DNS 프리페치 비활성화

        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)

        # 🖼️ 이미지 로딩 차단 적용
        options.add_experimental_option("prefs", prefs)

        driver = webdriver.Remote(command_executor=SELENIUM_URL, options=options)

        # CDP를 통한 네트워크 차단 설정 (추가 최적화)
        try:
            driver.execute_cdp_cmd("Network.setBlockedURLs", {
                "urls": ["*.png", "*.jpg", "*.gif", "*.css", "*.woff", "*.woff2", "*google-analytics*"]
            })
            driver.execute_cdp_cmd("Network.enable", {})
        except Exception as e:
            logger.warning(f"⚠️ CDP Optimization skipped: {e}")

    # [Case B] 로컬 환경 (Undetected Chromedriver 사용 - 강력함)
    else:
        logger.info("💻 [Local Mode] Starting Undetected Chrome")
        options = uc.ChromeOptions()
        options.page_load_strategy = 'eager'
        if os.getenv("HEADLESS", "false").lower() == "true":
             options.add_argument("--headless=new")

        options.add_argument(f"user-agent={random_user_agent}")
        options.add_argument(f"--window-size={random_window_size}")
        options.add_argument("--disable-popup-blocking")

        # UC는 드라이버 설치를 자동으로 관리함
        driver = uc.Chrome(options=options, use_subprocess=True)

    # 공통: navigator.webdriver 숨기기 (더블 체크)
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

    return driver

def fetch_update_targets():
    """Java 서버 통신 예외 처리 강화"""
    try:
        res = session.get(TARGET_API_URL, timeout=30) # 타임아웃 추가
        if res.status_code == 200:
            targets = res.json()
            logger.info(f"📥 Received {len(targets)} targets from Java Server.")
            return targets
        logger.warning(f"⚠️ Failed to fetch targets. Status: {res.status_code}")
        return []
    except Exception as e:
        logger.error(f"❌ Connection Error to Java Server: {e}")
        return []

def mine_english_title(driver):
    """
    페이지 소스 내 Script 태그에서 'invariantName' (공식 불변 영문명) 추출
    Target Pattern: "invariantName":"Gran Turismo™ 7"
    """
    try:
        # 1. 페이지 소스 전체를 문자열로 가져옴 (이미 로딩된 상태라 네트워크 요청 없음 - 안전)
        src = driver.page_source

        # 2. 정규식으로 "invariantName":"..." 패턴 검색
        # 설명: "invariantName" 뒤에 :이 있고, 따옴표(") 안에 있는 값([^"]+)을 잡아라
        match = re.search(r'"invariantName"\s*:\s*"([^"]+)"', src)

        if match:
            # 3. 찾은 값 (Group 1) 리턴
            raw_title = match.group(1)

            # 4. 유니코드 이스케이프 (\u0027 등) 처리
            try:
                raw_title = raw_title.encode('utf-8').decode('unicode_escape')
            except: pass

            # 5. 깨진 문자 복구 시도 (UTF-8 bytes -> Latin-1 interpretation fix)
            try:
                # 억지로 다시 인코딩했다가 제대로 디코딩 해보기
                raw_title = raw_title.encode('latin1').decode('utf-8')
            except: pass

            # 6. 특수문자 치환 (IGDB 검색을 위해 아예 표준 문자로 변경)
            # 스마트 따옴표(’) -> 일반 따옴표(')
            raw_title = raw_title.replace("’", "'").replace("‘", "'")
            # TM(™), R(®) -> 삭제 (불필요 문자)
            raw_title = re.sub(r'[™®â¢]', '', raw_title)

            logger.info(f"   💎 Mined Invariant Title: {raw_title}")
            return raw_title.strip()

        return None

    except Exception as e:
        logger.warning(f"   ⚠️ Mining failed: {e}")

    return None

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

def run_batch_crawler_logic():
    global is_running
    logger.info("🚀 [Crawler] Batch job started - Safety Optimized Mode")

    driver = None

    total_processed_count = 0
    collected_deals = []

    try:
        driver = get_driver()
        wait = WebDriverWait(driver, 10)
        visited_urls = set()

        # [Phase 1] 기존 타겟 갱신
        targets = fetch_update_targets()
        if targets:
            logger.info(f"🔄 [Phase 1] Updating {len(targets)} tracked games...")

            for i, url in enumerate(targets):
                if not is_running: break

                # 40개마다 브라우저를 껐다 켜서 누수된 메모리를 강제로 반환
                if i > 0 and i % 40 == 0:
                    logger.info(f"♻️ [Phase 1] Memory Cleanup at item {i}... Restarting Driver.")
                    try:
                        driver.quit()
                    except: pass
                    time.sleep(5)
                    driver = get_driver()
                    wait = WebDriverWait(driver, 10)

                # 크롤링 수행
                deal_info = crawl_detail_and_send(driver, wait, url)

                if deal_info:
                    total_processed_count += 1
                    if deal_info.get('discountRate', 0) > 0:
                        collected_deals.append(deal_info)

                visited_urls.add(url)

                time.sleep(random.uniform(2.5, 4.0))

        # [Phase 2] 신규 탐색 (페이지네이션)
        if is_running:
            logger.info(f"🔭 [Phase 2] Starting Deep Discovery (Max 300 Pages)...")
            base_category_path = "https://store.playstation.com/ko-kr/category/3f772501-f6f8-49b7-abac-874a88ca4897"
            search_params = "?FULL_GAME=storeDisplayClassification&GAME_BUNDLE=storeDisplayClassification&PREMIUM_EDITION=storeDisplayClassification"

            current_page = 1
            max_pages = 15

            while current_page <= max_pages:
                if not is_running: break

                # [메모리 관리] 2페이지마다 드라이버 재시작
                if current_page > 1 and current_page % 2 == 0:
                    logger.info("♻️ [Maintenance] Restarting driver to prevent memory leak...")
                    try:
                        driver.quit()
                    except: pass
                    time.sleep(5)
                    driver = get_driver()
                    wait = WebDriverWait(driver, 10)

                target_list_url = f"{base_category_path}/{current_page}{search_params}"
                logger.info(f"   📖 Scanning Page {current_page}/{max_pages}")

                try:
                    driver.get(target_list_url)

                    # 스크롤 로직
                    try:
                        WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.CSS_SELECTOR, "a[href*='/product/']")))
                    except TimeoutException:
                        logger.warning(f"   ⚠️ Page load timeout. Retrying...")
                        driver.refresh()
                        time.sleep(3)

                    # 스크롤 로직
                    driver.execute_script(f"window.scrollTo(0, {random.randint(800, 1200)});")
                    time.sleep(random.uniform(0.5, 1.5))
                    driver.execute_script(f"window.scrollTo(0, {random.randint(3000, 4500)});")
                    time.sleep(random.uniform(1.5, 2.5))

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
                    deal_info = crawl_detail_and_send(driver, wait, url)

                    if deal_info:
                        total_processed_count += 1
                        if deal_info.get('discountRate', 0) > 0:
                            collected_deals.append(deal_info)

                    visited_urls.add(url)
                    time.sleep(random.uniform(2.5, 4.0))

                current_page += 1
                time.sleep(random.uniform(3.0, 5.0))

            logger.info(f"✅ Batch job finished. Total processed: {len(visited_urls)} games.")

            # 디스코드 요약 전송
            send_discord_summary(total_processed_count, collected_deals)
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

        # 영문 타이틀 명 채굴
        english_title = mine_english_title(driver)

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
                if "VR2" in raw_text: platform_set.add("PS_VR2")
                elif "VR" in raw_text: platform_set.add("PS_VR")
            platforms = list(platform_set)
        except Exception as e:
            platforms = []

        # 6.. 가격 추출
        best_price = float('inf')
        best_offer_data = None    # 최저가일 때의 세부 정보(원가, 할인율, Plus여부 등)
        found_valid_offer = False

        # DOM 안정화 대기
        time.sleep(1.0)

        # 최대 2번 시도 (DOM 렌더링 지연 대비)
        for attempt in range(2):
            if found_valid_offer: break
            if attempt > 0: time.sleep(1)

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
                        raw_price = price_elem.get_attribute("textContent").strip()

                        # "포함" 등 숫자가 아닌 경우 건너뛰기 (PS Plus 무료 오퍼 회피용)
                        clean_price_text = re.sub(r'[^0-9]', '', raw_price)
                        if not clean_price_text: continue

                        current_price = int(clean_price_text)
                        if current_price == 0: continue
                    except: continue

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
                    original_price = current_price # 기본값
                    found_original = False

                    # 전략 A: 명시적 태그 (data-qa)
                    try:
                        orig_elem = offer_container.find_element(By.CSS_SELECTOR, f"[data-qa='mfeCtaMain#offer{i}#originalPrice']")
                        raw_orig = orig_elem.get_attribute("textContent").strip()
                        parsed_orig = int(re.sub(r'[^0-9]', '', raw_orig))
                        if parsed_orig > current_price:
                            original_price = parsed_orig
                            found_original = True
                    except: pass

                    # 전략 B: CSS 클래스 (psw-t-strike) - 제공된 HTML에서 확인된 클래스명!
                    if not found_original:
                        try:
                            # psw-t-strike: 소니 스토어의 '취소선' 스타일 클래스
                            strikethrough_elems = offer_container.find_elements(By.CSS_SELECTOR, ".psw-t-strike")
                            for elem in strikethrough_elems:
                                raw_orig = elem.get_attribute("textContent").strip()
                                clean_orig = re.sub(r'[^0-9]', '', raw_orig)
                                if clean_orig:
                                    parsed_price = int(clean_orig)
                                    # 원가가 현재가보다 커야 유효
                                    if parsed_price > current_price:
                                        original_price = parsed_price
                                        found_original = True
                                        break
                        except: pass

                    # 할인율 계산
                    discount_rate = 0
                    if original_price > current_price:
                        discount_rate = int(round(((original_price - current_price) / original_price) * 100))

                    # 6-4 종료일 파싱
                    sale_end_date = None
                    try:
                        date_elem = offer_container.find_element(By.CSS_SELECTOR, f"[data-qa='mfeCtaMain#offer{i}#discountDescriptor']")
                        raw_date_text = date_elem.get_attribute("textContent")

                        # HTML 예시: "2025/12/22 오후 11:59..." -> YYYY/MM/DD 추출
                        match = re.search(r'(\d{4})[./-](\d{1,2})[./-](\d{1,2})', raw_date_text)
                        if match:
                            sale_end_date = f"{match.group(1)}-{match.group(2).zfill(2)}-{match.group(3).zfill(2)}"
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
            # 모든 JSON 스크립트 태그를 가져옴.
            scripts = driver.find_elements(By.CSS_SELECTOR, "script[type='application/json']")
            for script in scripts:
                content = script.get_attribute("innerHTML")
                # "media" 키워드가 없으면 건너뛰어서 속도 향상
                if "media" not in content or "url" not in content:
                    continue

                try:
                    data = json.loads(content)
                    # cache 객체 내부 순회 (Concept:1234, Product:1234 등 동적 키 대응)
                    cache = data.get("cache", {})
                    for key, val in cache.items():
                        # personalizedMeta -> media 구조 확인
                        if "personalizedMeta" in val and "media" in val["personalizedMeta"]:
                            media_list = val["personalizedMeta"]["media"]
                            # 우선순위: MASTER > GAMEHUB_COVER_ART > 아무거나
                            for media in media_list:
                                if media.get("role") == "MASTER":
                                    image_url = media.get("url")
                                    break
                                if media.get("role") == "GAMEHUB_COVER_ART" and not image_url:
                                    image_url = media.get("url")

                            if image_url: break # 이미지를 찾았으면 루프 종료
                    if image_url: break
                except: pass

            if image_url:
                logger.info(f"   📸 Image found via JSON Script (Master/Cover)")
        except Exception as e:
            logger.warning(f"   ⚠️ JSON extraction error: {e}")

        # [전략 2] Meta Tag 백업 (og:image)
        # 만약 JSON 구조가 바뀌었을 때를 대비한 안전장치
        if not image_url:
            try:
                meta_img = driver.find_element(By.CSS_SELECTOR, "meta[property='og:image']")
                image_url = meta_img.get_attribute("content").split("?")[0]
                logger.info(f"   📸 Image found via Meta Tag")
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
    except requests.exceptions.Timeout:
        logger.error(f"   ⏳ Timeout Error: Server took too long to respond for {title}")
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