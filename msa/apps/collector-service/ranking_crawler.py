import os
import time
import random
import logging
import json
import gc
import requests
from playwright.sync_api import sync_playwright

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s', datefmt='%Y-%m-%d %H:%M:%S')
logger = logging.getLogger("Ranking-Crawler")

BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8080")
JAVA_RANKING_API_URL = f"{BASE_URL}/api/internal/scraping/rankings/update"
CRAWLER_SECRET_KEY = os.getenv("CRAWLER_SECRET_KEY", "")

MAX_PAGES = 25

TARGETS = {
    "BEST_SELLER": "https://store.playstation.com/ko-kr/pages/browse/{}?sortBy=sales30&sortOrder=desc",
    "MOST_DOWNLOADED": "https://store.playstation.com/ko-kr/category/3f772501-f6f8-49b7-abac-874a88ca4897/{}?sortBy=downloads30&sortOrder=desc"
}

DATA_DIR = 'data'
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

CACHE_FILE = os.path.join(DATA_DIR, 'concept_map.json')

def load_cache():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_cache(cache_data):
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache_data, f, ensure_ascii=False, indent=4)

class BrowserManager:
    def __init__(self, p):
        self.p = p
        self.browser, self.context = self._create_browser()
        self.request_count = 0

    def _create_browser(self):
        logger.info("🌐 크롬 브라우저 시작 (메모리 최적화 + 랜덤 에이전트 적용)")
        DESKTOP_USER_AGENTS = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ]
        user_agent = random.choice(DESKTOP_USER_AGENTS)

        browser = self.p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--disable-blink-features=AutomationControlled"]
        )
        context = browser.new_context(user_agent=user_agent, viewport={"width": 1920, "height": 1080})
        return browser, context

    def get_context(self):
        if self.request_count >= 50:
            logger.info("[메모리 관리] 브라우저 강제 환생! 🧹")
            try: self.context.close()
            except: pass
            try: self.browser.close()
            except: pass
            gc.collect()
            time.sleep(3)
            try: self.browser, self.context = self._create_browser()
            except:
                time.sleep(5)
                self.browser, self.context = self._create_browser()
            self.request_count = 0
        return self.context

    def increment(self):
        self.request_count += 1

def human_like_delay(min_sec=1.5, max_sec=3.5):
    time.sleep(random.uniform(min_sec, max_sec))

# --- [4. 단일 컨셉 -> 프로덕트 변환 로직] ---
def fetch_product_id_from_concept(bm, concept_url):
    logger.info(f"신규 컨셉 발견! Product ID 탐색 중... ({concept_url})")
    context = bm.get_context()
    page = context.new_page()

    page.set_default_timeout(30000)

    product_id = None
    try:
        page.goto("https://store.playstation.com" + concept_url, wait_until="domcontentloaded", timeout=15000)
        human_like_delay(1.5, 2.5)

        # 기존 Phase 0 처럼 data-telemetry-meta 에서 추출 시도
        try:
            meta_loc = page.locator("a[data-telemetry-meta]").first
            if meta_loc.is_visible(timeout=3000):
                meta_str = meta_loc.get_attribute("data-telemetry-meta")
                meta_json = json.loads(meta_str)
                product_id = meta_json.get("productId")
        except: pass

        # 실패 시 mfeCtaMain 버튼에서 추출 시도
        if not product_id:
            try:
                btn_loc = page.locator("button[data-telemetry-meta]").first
                if btn_loc.count() > 0:
                    meta_str = btn_loc.get_attribute("data-telemetry-meta")
                    meta_json = json.loads(meta_str)
                    product_id = meta_json.get("productId")
            except: pass

    except Exception as e:
        logger.error(f"컨셉 변환 타임아웃 또는 실패 ({concept_url}): {e}")
    finally:
        try: page.close()
        except: pass
        bm.increment()

    return product_id

def send_to_backend(ranking_type, ps_store_ids):
    if not ps_store_ids:
        logger.warning(f"⚠️ [{ranking_type}] 수집된 ID가 없어 전송을 스킵합니다.")
        return

    payload = {
        "rankingType": ranking_type,
        "psStoreIds": ps_store_ids
    }
    headers = {
        "Content-Type": "application/json",
        "X-Internal-Secret": CRAWLER_SECRET_KEY
    }

    try:
        logger.info(f"📤 백엔드로 [{ranking_type}] 전송 시작... (총 {len(ps_store_ids)}개)")
        res = requests.post(JAVA_RANKING_API_URL, json=payload, headers=headers, timeout=10)

        if res.status_code == 200:
            logger.info(f"🎉 [{ranking_type}] 백엔드 DB 업데이트 대성공!")
        else:
            logger.error(f"💥 백엔드 응답 에러 ({res.status_code}): {res.text}")
    except Exception as e:
        logger.error(f"💥 백엔드 통신 실패: {e}")

# --- [5. 핵심 수집 로직 (안전한 분리 버전)] ---
def collect_rankings(ranking_type, url_template, bm, concept_cache):
    logger.info(f"[{ranking_type}] 랭킹 수집 시작 (목표: {MAX_PAGES}페이지)")
    ps_store_ids = []

    for page_num in range(1, MAX_PAGES + 1):
        target_url = url_template.format(page_num)
        logger.info(f"{page_num}페이지 목록 탐색 중...")

        extracted_hrefs = []

        # 1단계: 목록 페이지 열고 글씨만 빠르게 복사한 뒤 즉시 닫기!
        context = bm.get_context()
        page = context.new_page()
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', { get: () => undefined });")

        try:
            page.goto(target_url, wait_until="domcontentloaded")
            human_like_delay(2.0, 3.5)
            page.evaluate("window.scrollBy(0, document.body.scrollHeight / 3)")

            page.wait_for_selector("a[href*='/concept/'], a[href*='/product/']", state="attached", timeout=15000)
            links = page.locator("a[href*='/concept/'], a[href*='/product/']").all()

            for link in links:
                href = link.get_attribute("href")
                if href:
                    extracted_hrefs.append(href)

        except Exception as e:
            logger.error(f"{page_num}페이지 목록 로드 실패: {e}")
            continue
        finally:
            page.close()
            bm.increment() # 목록 페이지 닫았으니 카운트 1 증가

        # 2단계: 복사해둔 글씨(URL)들을 하나씩 보면서 수첩 검사 및 심부름 보내기
        for href in extracted_hrefs:
            if "/concept/" in href:
                concept_id = href.split('/')[-1].split('?')[0]

                if concept_id in concept_cache:
                    actual_product_id = concept_cache[concept_id]
                else:
                    # 상세 페이지 심부름 (여기서 브라우저가 환생할 수 있음)
                    actual_product_id = fetch_product_id_from_concept(bm, href)
                    if actual_product_id:
                        concept_cache[concept_id] = actual_product_id
                        save_cache(concept_cache)

                if actual_product_id and actual_product_id not in ps_store_ids:
                    ps_store_ids.append(actual_product_id)

            elif "/product/" in href:
                product_id = href.split('/')[-1].split('?')[0]
                if product_id not in ps_store_ids:
                    ps_store_ids.append(product_id)

        logger.info(f"{page_num}페이지 완료 (누적: {len(ps_store_ids)}개)")

    return ps_store_ids

# --- [6. 메인 실행 블록] ---
def main():
    logger.info("랭킹 특공대 크롤러 출동!")
    concept_cache = load_cache()
    logger.info(f"로컬 캐시(수첩) 로드 완료: 기존 저장된 컨셉 {len(concept_cache)}개")

    with sync_playwright() as p:
        bm = BrowserManager(p)

        try:
            best_seller_ids = collect_rankings("BEST_SELLER", TARGETS["BEST_SELLER"], bm, concept_cache)
            send_to_backend("BEST_SELLER", best_seller_ids)

            logger.info("서버 휴식 (10초 대기)")
            time.sleep(10)

            most_downloaded_ids = collect_rankings("MOST_DOWNLOADED", TARGETS["MOST_DOWNLOADED"], bm, concept_cache)
            send_to_backend("MOST_DOWNLOADED", most_downloaded_ids)

        except Exception as e:
            logger.error(f"🔥 치명적 에러 발생: {e}")

    logger.info("랭킹 수집 완료!")

if __name__ == "__main__":
    main()