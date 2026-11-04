import time
import json
import requests
import traceback # 에러 추적용
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# 1. Java 서버 주소
JAVA_API_URL = "http://localhost:8080/api/v1/games/collect"

# 2. 타겟: 엘든 링 (PS Store 페이지)
TARGET_URL = "https://store.playstation.com/ko-kr/product/HP0700-PPSA04608_00-ELDENRING0000000"

def run_crawler():
    print("🚀 크롤러 가동! 브라우저를 엽니다...")

    options = webdriver.ChromeOptions()
    # options.add_argument("--headless")
    options.add_argument("--window-size=1920,1080")
    # 언어 설정 강제 (한국어)
    options.add_argument("--lang=ko-KR")

    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

    try:
        driver.get(TARGET_URL)
        print("🔗 사이트 접속 성공. 화면 렌더링 대기 중 (5초)...")
        time.sleep(5) # 넉넉하게 5초 대기

        wait = WebDriverWait(driver, 15)

        # ---------------------------------------------------------
        # [1] 제목 찾기
        # ---------------------------------------------------------
        print("🔎 제목 찾는 중...")
        # visibility(보임) 대신 presence(존재)로 변경하여 에러 확률 낮춤
        title_element = wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "[data-qa='mfe-game-title#name']")
        ))
        title = title_element.text
        print(f"✅ 제목 발견: {title}")

        # ---------------------------------------------------------
        # [2] 가격 찾기
        # ---------------------------------------------------------
        print("🔎 가격 찾는 중...")
        price_element = driver.find_element(By.CSS_SELECTOR, "[data-qa='mfeCtaMain#offer0#finalPrice']")
        price_text = price_element.text # 예: "64,800원"
        print(f"✅ 가격 발견: {price_text}")

        # ---------------------------------------------------------
        # [3] 이미지 찾기
        # ---------------------------------------------------------
        print("🔎 이미지 찾는 중...")
        image_url = "https://via.placeholder.com/150" # 실패 대비용 기본값

        try:
            # '진짜 고화질 이미지' 태그 (data-qa 활용)
            image_element = driver.find_element(By.CSS_SELECTOR, "img[data-qa='gameBackgroundImage#heroImage#image']")
            image_url = image_element.get_attribute("src")

            # (옵션) URL 뒤에 붙은 지저분한 파라미터(?w=1920...) 제거하고 원본만 저장하기
            if "?" in image_url:
                image_url = image_url.split("?")[0]

            print(f"✅ 이미지 발견: {image_url[:50]}...") # 길니까 앞부분만 출력
        except:
            print("⚠️ 이미지를 못 찾았습니다. 기본 이미지로 대체합니다.")

        # ---------------------------------------------------------
        # [4] 데이터 정제 및 전송
        # ---------------------------------------------------------
        # "64,800원" -> 64800
        current_price = int(price_text.replace("₩", "").replace("원", "").replace(",", "").replace(" ", ""))

        payload = {
            "psStoreId": "UP0006-PPSA01323_00-ELDENRING0000000",
            "title": title,
            "publisher": "From Selenium",
            "imageUrl": image_url,
            "currentPrice": current_price,
            "isDiscount": False,
            "discountRate": 0
        }

        # Java 서버로 전송
        headers = {'Content-Type': 'application/json'}
        res = requests.post(JAVA_API_URL, data=json.dumps(payload), headers=headers)

        if res.status_code == 200:
            print(f"🎉 [성공] Java 서버 응답 ID: {res.text}")
            print(f"   -> {title} : {current_price}원")
        else:
            print(f"💥 전송 실패: {res.status_code} - {res.text}")

    except Exception:
        print("🚨 크롤링 중 치명적 에러 발생!")
        traceback.print_exc() # 에러 위치 추적

    finally:
        time.sleep(2)
        driver.quit()

if __name__ == "__main__":
    run_crawler()