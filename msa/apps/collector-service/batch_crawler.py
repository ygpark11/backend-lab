import time
import json
import requests
import traceback
import re
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# 1. 설정
JAVA_API_URL = "http://localhost:8080/api/v1/games/collect"
LIST_PAGE_URL = "https://store.playstation.com/ko-kr/category/3f772501-f6f8-49b7-abac-874a88ca4897/1"

def run_batch_crawler():
    print("🚀 [지능형 수집기 Level 17+] 가동! (Full Fields)")

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
        driver.execute_script("window.scrollTo(0, 2000);")
        time.sleep(2)

        link_elements = driver.find_elements(By.CSS_SELECTOR, "a[href*='/product/']")
        game_urls = []
        for el in link_elements:
            url = el.get_attribute("href")
            if url and "/ko-kr/product/" in url:
                if url not in game_urls:
                    game_urls.append(url)

        target_urls = game_urls[:5] # 테스트용 5개
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

        # 2. 장르 (Genre) - [New]
        genre_ids = ""
        try:
            # 상세 페이지 하단 정보 섹션에서 장르 태그 찾기
            genre_element = driver.find_element(By.CSS_SELECTOR, "[data-qa='gameInfo#releaseInformation#genre-value']")
            genre_ids = genre_element.text # "액션, RPG" 형태로 가져옴
        except:
            pass # 장르 없으면 빈 문자열

        # 3. 가격 및 상세 정보
        current_price = 0
        original_price = 0
        discount_rate = 0
        sale_end_date = None
        is_plus_exclusive = False # [New] Plus 회원 전용 여부

        found_valid_offer = False

        for i in range(3):
            try:
                # [Step A] 판매가
                price_selector = f"[data-qa='mfeCtaMain#offer{i}#finalPrice']"
                price_element = driver.find_element(By.CSS_SELECTOR, price_selector)
                price_text = price_element.text
                clean_price = re.sub(r'[^0-9]', '', price_text)

                if not clean_price or int(clean_price) == 0:
                    continue

                current_price = int(clean_price)
                found_valid_offer = True

                # [Step B] 정가 (Original Price)
                try:
                    orig_selector = f"[data-qa='mfeCtaMain#offer{i}#originalPrice']"
                    orig_element = driver.find_element(By.CSS_SELECTOR, orig_selector)
                    original_price = int(re.sub(r'[^0-9]', '', orig_element.text))
                except:
                    original_price = current_price

                # [Step C] 할인율 & 종료일
                try:
                    discount_sel = f"[data-qa='mfeCtaMain#offer{i}#discountInfo']"
                    discount_elem = driver.find_element(By.CSS_SELECTOR, discount_sel)
                    raw_rate = discount_elem.text
                    discount_rate = int(re.sub(r'[^0-9]', '', raw_rate))

                    date_sel = f"[data-qa='mfeCtaMain#offer{i}#discountDescriptor']"
                    date_elem = driver.find_element(By.CSS_SELECTOR, date_sel)
                    raw_date = date_elem.text.split(" ")[0]
                    dt = datetime.strptime(raw_date, "%Y/%m/%d")
                    sale_end_date = dt.strftime("%Y-%m-%d")
                except:
                    pass

                # [Step D] PS Plus 전용 할인 여부 확인 - [New]
                # 보통 할인 태그나 가격 주변에 'PlayStation Plus' 텍스트 혹은 아이콘이 있음.
                # data-qa='mfeCtaMain#offer0#discountInfo' 텍스트 안에 "Plus"가 포함되어 있거나,
                # 별도의 서비스 라벨(serviceLabel)이 존재하는지 확인
                try:
                    # 방법 1: 서비스 라벨 확인 (노란색 플러스 마크)
                    service_label_sel = f"[data-qa='mfeCtaMain#offer{i}#serviceLabel']"
                    driver.find_element(By.CSS_SELECTOR, service_label_sel)
                    is_plus_exclusive = True
                except:
                    # 방법 2: 할인 문구에 'Plus'가 있는지 확인
                    try:
                        if "Plus" in discount_elem.text:
                            is_plus_exclusive = True
                    except:
                        is_plus_exclusive = False

                break

            except:
                continue

        if not found_valid_offer:
            print(f"   ℹ️ 가격 정보 없음: {title}")
            return

        # 4. 이미지
        image_url = ""
        try:
            image_element = driver.find_element(By.CSS_SELECTOR, "img[data-qa='gameBackgroundImage#heroImage#image']")
            image_url = image_element.get_attribute("src").split("?")[0]
        except:
            pass

        # 5. 전송
        ps_store_id = target_url.split("/")[-1].split("?")[0]

        payload = {
            "psStoreId": ps_store_id,
            "title": title,
            "publisher": "Batch Crawler",
            "imageUrl": image_url,
            "description": "Full Data Crawler",
            "originalPrice": original_price,
            "currentPrice": current_price,
            "discountRate": discount_rate,
            "saleEndDate": sale_end_date,
            "genreIds": genre_ids,          # [New]
            "isPlusExclusive": is_plus_exclusive # [New]
        }

        res = requests.post(JAVA_API_URL, data=json.dumps(payload), headers={'Content-Type': 'application/json'})
        if res.status_code == 200:
            plus_mark = " [PS+]" if is_plus_exclusive else ""
            print(f"   ✅ [성공] {title} | {genre_ids}{plus_mark}")
        else:
            print(f"   💥 [실패] 서버 응답: {res.status_code}")

    except Exception as e:
        print(f"   ⚠️ 수집 실패 ({target_url}): {e}")

if __name__ == "__main__":
    run_batch_crawler()