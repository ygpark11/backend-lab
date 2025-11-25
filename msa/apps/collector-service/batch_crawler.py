import time
import json
import requests
import traceback
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# 1. 설정
JAVA_API_URL = "http://localhost:8080/api/v1/games/collect"
# PS5 전체 게임 목록 페이지
LIST_PAGE_URL = "https://store.playstation.com/ko-kr/category/d71e8e6d-0940-4e03-bd02-404fc7d31a31/1"

def run_batch_crawler():
    print("🚀 [대량 수집기] 가동! 브라우저를 엽니다...")

    options = webdriver.ChromeOptions()
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--lang=ko-KR")

    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    wait = WebDriverWait(driver, 10)

    try:
        # ---------------------------------------------------------
        # Phase A: 목록 페이지에서 "보물 지도(URL 목록)" 확보
        # ---------------------------------------------------------
        print(f"📂 목록 페이지 접속: {LIST_PAGE_URL}")
        driver.get(LIST_PAGE_URL)
        print("   -> 5초간 렌더링 대기...")
        time.sleep(5)

        print("🔎 게임 링크 수집 중...")

        # ★ [핵심 수정] 선장이 찾은 href 패턴을 이용한 강력한 필터링
        # CSS Selector 설명: "a 태그인데, href 속성에 '/product/' 글자가 포함된 놈 다 나와!"
        link_elements = driver.find_elements(By.CSS_SELECTOR, "a[href*='/product/']")

        game_urls = []
        for el in link_elements:
            url = el.get_attribute("href")
            # 혹시 모르니 한 번 더 검증 + 중복 제거
            if url and "/ko-kr/product/" in url:
                if url not in game_urls:
                    game_urls.append(url)

        print(f"📜 총 {len(game_urls)}개의 게임을 발견했습니다!")

        # 테스트를 위해 상위 3개만 털어봅시다. (붉은사막 등)
        target_urls = game_urls[:3]
        print(f"🎯 오늘은 상위 {len(target_urls)}개만 수집합니다.")

        # ---------------------------------------------------------
        # Phase B: 각 페이지 순회 (Loop)
        # ---------------------------------------------------------
        for index, game_url in enumerate(target_urls):
            print(f"\n[{index+1}/{len(target_urls)}] 상세 페이지 이동: {game_url}")
            crawl_detail_and_send(driver, wait, game_url)
            time.sleep(2) # 매너 휴식

    except Exception:
        traceback.print_exc()
    finally:
        driver.quit()
        print("👋 크롤링 종료.")

def crawl_detail_and_send(driver, wait, target_url):
    """
    단건 수집 로직 (어제 완성한 로직 재사용)
    """
    try:
        driver.get(target_url)
        time.sleep(3) # 상세 페이지 로딩 대기

        # 1. 제목
        title_element = wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "[data-qa='mfe-game-title#name']")
        ))
        title = title_element.text

        # 2. 가격 (무료 게임 예외처리 포함)
        try:
            price_element = driver.find_element(By.CSS_SELECTOR, "[data-qa='mfeCtaMain#offer0#finalPrice']")
            price_text = price_element.text
        except:
            price_text = "0"
            print("   -> 가격 정보 없음/무료")

        # 3. 이미지 (선장이 찾은 태그 적용)
        image_url = ""
        try:
            image_element = driver.find_element(By.CSS_SELECTOR, "img[data-qa='gameBackgroundImage#heroImage#image']")
            image_url = image_element.get_attribute("src").split("?")[0]
        except:
            pass

        # 4. 정제
        current_price = int(price_text.replace("₩", "").replace("원", "").replace(",", "").replace(" ", ""))
        ps_store_id = target_url.split("/")[-1]

        # 5. 전송
        payload = {
            "psStoreId": ps_store_id,
            "title": title,
            "publisher": "Batch Crawler",
            "imageUrl": image_url,
            "currentPrice": current_price,
            "isDiscount": False,
            "discountRate": 0
        }

        res = requests.post(JAVA_API_URL, data=json.dumps(payload), headers={'Content-Type': 'application/json'})
        if res.status_code == 200:
            print(f"   ✅ [성공] 저장 완료: {title} ({current_price}원)")
        else:
            print(f"   💥 [실패] 서버 응답: {res.status_code}")

    except Exception as e:
        print(f"   ⚠️ 수집 실패 ({target_url}): {e}")

if __name__ == "__main__":
    run_batch_crawler()