# 🎮 Project: PS-Tracker (PlayStation Store Intelligence Platform)

* **Start Date:** 2025.11.23
* **Description:** PlayStation Store의 게임 가격 정보를 수집/분석하여 "구매 적기"를 알려주는 인텔리전스 플랫폼.
* **Key Strategy:** Polyglot MSA (Java & Python)

---

## 1. 프로젝트 목표 (Business Goal)
*단순한 쇼핑몰 클론이 아닌, 데이터 기반의 의사결정 도구 개발*
* **Intelligence:** 역대 최저가, 메타크리틱 점수, 가격 방어율 분석.
* **Automation:** Python 크롤러를 통한 주기적 데이터 자동 수집.
* **Profit:** 최저가 알림 구독 및 AI 구매 조언 리포트 제공.

## 2. 아키텍처 (Architecture)

### 🏗 Polyglot Structure
각 언어의 장점을 극대화하기 위해 역할을 분리함.

| Service Name | Tech Stack | Role | Port |
| :--- | :--- | :--- | :--- |
| **Catalog Service** | Java 17, Spring Boot 3.x | **[Core]** 게임 정보 조회, 저장, API 제공 | 8080 |
| **Collector Service** | Python 3.x, Requests | **[Worker]** 데이터 수집(Crawling) 및 전송 | N/A |

### 🔄 Data Flow (Day 1 Draft)
1. **Collector (Python):** `requests`를 통해 데이터를 수집/가공.
2. **Transfer:** HTTP REST API (`POST /api/v1/games/collect`)로 Java 서버에 전송.
3. **Catalog (Java):** `Upsert` 로직을 통해 신규 게임은 생성, 기존 게임은 가격 정보 갱신.

## 3. 핵심 도메인 설계 (Domain)

### Game Entity (`Catalog Service`)
* **Identity:** `psStoreId` (PS Store 고유 식별자, Unique Key)
* **Data:** `title`, `publisher`, `imageUrl`
* **Price:** `currentPrice`, `isDiscount`, `discountRate`
* **Update Strategy:** 동일한 `psStoreId`가 들어오면 가격 정보만 `Update`, 없으면 `Insert`.

## 4. 실행 방법 (Getting Started)

### ① Catalog Service (Java)
```bash
cd apps/catalog-service
./gradlew bootRun
# Server started on port 8080
```

### ② Collector Service (Python)
```bash
cd apps/collector-service
source venv/bin/activate  # (Windows: .\venv\Scripts\activate)
pip install requests
python test_sender.py
```