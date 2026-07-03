import time
import re
import random
import logging
import gc

from playwright.sync_api import sync_playwright

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("PS-Plus-PoC")

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
]

def setup_stealth_page(context):
    page = context.new_page()
    page.set_default_timeout(30000)
    page.add_init_script("Object.defineProperty(navigator, 'webdriver', { get: () => undefined });")

    def route_intercept(route):
        if route.request.resource_type in ["image", "media", "font"]:
            route.abort()
            return
        route.continue_()

    page.route("**/*", route_intercept)
    return page

def crawl_ps_plus_prices_no_click():
    target_url = "https://www.playstation.com/ko-kr/ps-plus/"
    logger.info(f"[PS-Plus] 타겟 접속 시도: {target_url}")

    result = {"status": "FAIL", "data": {}}

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-blink-features=AutomationControlled",
                "--js-flags=--max-old-space-size=128"
            ]
        )

        context = browser.new_context(
            user_agent=random.choice(USER_AGENTS),
            viewport={"width": 1920, "height": 1080},
            locale="ko-KR",
            timezone_id="Asia/Seoul"
        )

        page = setup_stealth_page(context)

        try:
            # 1. 페이지 접속
            t0 = time.time()
            page.goto(target_url, wait_until="domcontentloaded", timeout=30000)
            logger.info(f"  domcontentloaded: {time.time() - t0:.2f}s")

            # 2. 티어 선택기 뼈대 대기 (SSR HTML이므로 즉시 통과)
            page.wait_for_selector(".service-hub-tier-selector", state="attached", timeout=15000)

            # 3. [핵심] script[type="application/json"] 태그에 tierId 데이터가 있는지 확인
            #    <script type="application/json"> 태그는 SSR(서버사이드) 데이터 → JS 실행 여부와 무관하게
            #    초기 HTML 응답에 포함됨. 따라서 domcontentloaded 직후 바로 읽을 수 있음.
            #    그러나 저사양 서버 환경에서 혹시라도 파싱이 지연될 경우를 대비해
            #    "tierId 키가 실제로 파싱 가능한 상태"임을 확인하고 진행.
            logger.info("  [대기] script[application/json] 안에 tierId 데이터 확인 중...")
            page.wait_for_function(
                """
                () => {
                    const scripts = document.querySelectorAll('script[type="application/json"]');
                    return Array.from(scripts).some(s => {
                        try {
                            const d = JSON.parse(s.textContent);
                            return !!(d.args && d.args.tierId);
                        } catch(e) { return false; }
                    });
                }
                """,
                timeout=15000
            )
            logger.info(f"  tierId 데이터 확인 완료: {time.time() - t0:.2f}s")

            # 4. 모든 script 태그에서 tierId + 구독 offer 데이터 일괄 추출
            script_data = page.evaluate("""
                () => {
                    const results = {};
                    document.querySelectorAll('script[type="application/json"]').forEach(s => {
                        try {
                            const data = JSON.parse(s.textContent);
                            const tierId = data.args && data.args.tierId;
                            if (!tierId) return;
                            const cache = data.cache && data.cache.ROOT_QUERY;
                            if (!cache) return;
                            for (const [key, val] of Object.entries(cache)) {
                                if (!key.startsWith('tierSelectorOffersRetrieve') || !val || !val.offers) continue;
                                const hasPrice = val.offers.some(o => o.price && o.price.basePriceValue !== undefined);
                                if (!hasPrice) continue;
                                if (!results[tierId]) results[tierId] = {};
                                val.offers.forEach(offer => {
                                    if (!offer.duration || !offer.price) return;
                                    results[tierId][String(offer.duration.value)] = {
                                        base: offer.price.basePriceValue,
                                        sale: offer.price.discountedValue,
                                        endDate: offer.price.promotionEndDate || null
                                    };
                                });
                            }
                        } catch(e) {}
                    });
                    return results;
                }
            """)

            tier_map = {
                "TIER_10": ("ESSENTIAL", "에센셜"),
                "TIER_20": ("SPECIAL",   "스페셜"),
                "TIER_30": ("DELUXE",    "디럭스"),
            }
            duration_label = {"1": "1개월", "3": "3개월", "12": "12개월"}
            duration_map = {
                "1":  ("price1Month",  "originalPrice1Month",  "saleEndDate1Month"),
                "3":  ("price3Month",  "originalPrice3Month",  "saleEndDate3Month"),
                "12": ("price12Month", "originalPrice12Month", "saleEndDate12Month"),
            }

            for tier_id, (tier_en, tier_kr) in tier_map.items():
                tier_offers = script_data.get(tier_id, {})
                if not tier_offers:
                    logger.warning(f"⚠️  [{tier_kr}] 데이터 없음 — 사이트 구조 변경 의심")
                    continue

                logger.info(f"\n👉 [{tier_kr} / {tier_en}]")
                tier_prices = {}

                for months_str in sorted(tier_offers.keys(), key=lambda x: int(x)):
                    if months_str not in duration_map:
                        continue
                    offer = tier_offers[months_str]
                    price_key, orig_key, end_key = duration_map[months_str]
                    label = duration_label.get(months_str, f"{months_str}개월")

                    sale_price = offer["sale"]
                    base_price = offer["base"]

                    sale_end_date = None
                    end_date_raw = offer.get("endDate")
                    if end_date_raw:
                        m = re.search(r'(\d{4})-(\d{2})-(\d{2})', str(end_date_raw))
                        if m:
                            sale_end_date = f"{m.group(1)}-{m.group(2)}-{m.group(3)}"

                    tier_prices[price_key]  = sale_price
                    tier_prices[orig_key]   = base_price
                    tier_prices[end_key]    = sale_end_date

                    if sale_price < base_price:
                        discount_rate = round((base_price - sale_price) / base_price * 100)
                        logger.info(f"   ✔️  {label}: {base_price:,}원 → {sale_price:,}원 ({discount_rate}% 할인) | 종료: {sale_end_date or '없음'}")
                    else:
                        logger.info(f"   ✔️  {label}: {sale_price:,}원 (할인 없음)")

                result["data"][tier_en] = tier_prices

            result["status"] = "SUCCESS"
            logger.info(f"\n🎉 수집 완료! 총 소요 시간: {time.time() - t0:.2f}s")

        except Exception as e:
            logger.error(f"파싱 중 에러 발생: {e}")
        finally:
            try: page.close()
            except: pass
            try: context.close()
            except: pass
            try: browser.close()
            except: pass
            gc.collect()

    return result

if __name__ == "__main__":
    import json
    result = crawl_ps_plus_prices_no_click()
    print("\n=== 최종 수집 결과 (백엔드 전송 포맷) ===")
    print(json.dumps(result, ensure_ascii=False, indent=2))
