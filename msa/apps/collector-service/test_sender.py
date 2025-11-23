import requests
import json

# 1. 목표 설정 ()Java 서버 주소)
url = "http://localhost:8080/api/v1/games/collect"

# 2. (테스트용 데이터)
payload = {
    "psStoreId": "UP0006-PPSA01323_00-ELDENRING0000000",
    "title": "ELDEN RING (From Python)",
    "publisher": "Bandai Namco",
    "imageUrl": "http://image.url/eldenring.jpg",
    "currentPrice": 59800,
    "isDiscount": False,
    "discountRate": 0
}

# 3. 전송
try:
    headers = {'Content-Type': 'application/json'}
    response = requests.post(url, data=json.dumps(payload), headers=headers)

    # 4. 결과 확인
    if response.status_code == 200:
        print("✅ 성공! Java 서버가 응답했습니다. Game ID:", response.text)
    else:
        print("❌ 실패... 상태 코드:", response.status_code)
        print("에러 내용:", response.text)

except Exception as e:
    print("🚨 연결 에러! Java 서버가 켜져 있나요?")
    print(e)