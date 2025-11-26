import time
import json
import requests
import traceback
import re # 정규표현식 (숫자 추출용)
from datetime import datetime # 날짜 변환용
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# 1. 설정
JAVA_API_URL = "http://localhost:8080/api/v1/games/collect"
# PS Store 할인(Deals) 페이지 URL
LIST_PAGE_URL = "https://store.playstation.com/ko-kr/category/3f772501-f6f8-49b7-abac-874a88ca4897/1"

def run_batch_crawler():
    print("🚀 [지능형 수집기] 가동! 브라우저를 엽니다...")

    options = webdriver.ChromeOptions()
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--lang=ko-KR")

    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    wait = WebDriverWait(driver, 15)

    try:
        # Phase A: 목록 수집
        print(f"📂 목록 페이지 접속: {LIST_PAGE_URL}")
        driver.get(LIST_PAGE_URL)
        time.sleep(5)

        print("🔎 게임 링크 수집 중...")
        link_elements = driver.find_elements(By.CSS_SELECTOR, "a[href*='/product/']")

        game_urls = []
        for el in link_elements:
            url = el.get_attribute("href")
            if url and "/ko-kr/product/" in url:
                if url not in game_urls:
                    game_urls.append(url)

        # 테스트를 위해 상위 5개만 수집
        target_urls = game_urls[:5]
        print(f"📜 총 {len(game_urls)}개 중 {len(target_urls)}개를 수집합니다.")

        # Phase B: 상세 수집
        for index, game_url in enumerate(target_urls):
            print(f"\n[{index+1}/{len(target_urls)}] 상세 페이지 이동: {game_url}")
            crawl_detail_and_send(driver, wait, game_url)
            time.sleep(2)

    except Exception:
        traceback.print_exc()
    finally:
        driver.quit()
        print("👋 크롤링 종료.")

def crawl_detail_and_send(driver, wait, target_url):
    try:
        driver.get(target_url)
        time.sleep(3)

        # 1. 제목
        try:
            title_element = wait.until(EC.presence_of_element_located(
                (By.CSS_SELECTOR, "[data-qa='mfe-game-title#name']")
            ))
            title = title_element.text
        except:
            title = "Unknown Title"

        # 2. 가격
        current_price = 0
        is_discount = False
        discount_rate = 0
        sale_end_date = None

        # 최대 3개의 옵션(에디션)을 뒤져본다. (보통 0:체험판, 1:본편, 2:디럭스)
        for i in range(3):
            try:
                # [Step A] 가격 확인
                price_selector = f"[data-qa='mfeCtaMain#offer{i}#finalPrice']"
                price_element = driver.find_element(By.CSS_SELECTOR, price_selector)
                price_text = price_element.text

                # 숫자만 추출
                clean_price = re.sub(r'[^0-9]', '', price_text)

                # 가격이 없거나 0원이면(체험판 등) 다음 옵션(continue)으로 넘어감
                if not clean_price or int(clean_price) == 0:
                    continue

                # [Step B] 유효한 가격 발견! -> 일단 저장
                current_price = int(clean_price)
                # print(f"   -> [Offer {i}] 유효 가격 발견: {current_price}원")

                # [Step C] "같은 번호(i)"의 할인 정보 확인
                # 가격이 있는 곳에 할인 정보도 있다!
                try:
                    # 1. 할인율
                    discount_sel = f"[data-qa='mfeCtaMain#offer{i}#discountInfo']"
                    discount_elem = driver.find_element(By.CSS_SELECTOR, discount_sel)
                    raw_rate = discount_elem.text # "58% 할인"
                    discount_rate = int(re.sub(r'[^0-9]', '', raw_rate))
                    is_discount = True

                    # 2. 종료일
                    date_sel = f"[data-qa='mfeCtaMain#offer{i}#discountDescriptor']"
                    date_elem = driver.find_element(By.CSS_SELECTOR, date_sel)
                    raw_date = date_elem.text # "2025/12/1 오후..."

                    # 날짜 파싱 (공백으로 자르고 앞부분만)
                    date_part = raw_date.split(" ")[0] # "2025/12/1"
                    dt = datetime.strptime(date_part, "%Y/%m/%d")
                    sale_end_date = dt.strftime("%Y-%m-%d")

                    print(f"   -> 🔥 [Offer {i}] 할인 발견! {discount_rate}% (~{sale_end_date})")
                except:
                    # 가격은 있는데 할인이 아님 (정가 판매)
                    is_discount = False
                    # print(f"   -> [Offer {i}] 정가 판매 중")

                # [Step D] 필요한 거 다 찾았으니 탐색 종료!
                break

            except:
                # 해당 번호의 Offer 자체가 없으면 다음으로
                continue

        # 3. 이미지
        image_url = ""
        try:
            image_element = driver.find_element(By.CSS_SELECTOR, "img[data-qa='gameBackgroundImage#heroImage#image']")
            image_url = image_element.get_attribute("src").split("?")[0]
        except:
            pass

        # ID 추출
        ps_store_id = target_url.split("/")[-1]

        # 4. 전송
        payload = {
            "psStoreId": ps_store_id,
            "title": title,
            "publisher": "Batch Crawler",
            "imageUrl": image_url,
            "currentPrice": current_price,
            "isDiscount": is_discount,
            "discountRate": discount_rate,
            "saleEndDate": sale_end_date # "YYYY-MM-DD" or None
        }

        res = requests.post(JAVA_API_URL, data=json.dumps(payload), headers={'Content-Type': 'application/json'})
        if res.status_code == 200:
            print(f"   ✅ [성공] 저장 완료: {title}")
        else:
            print(f"   💥 [실패] 서버 응답: {res.status_code} - {res.text}")

    except Exception as e:
        print(f"   ⚠️ 수집 실패 ({target_url}): {e}")

if __name__ == "__main__":
    run_batch_crawler()