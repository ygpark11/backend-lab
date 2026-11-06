"""PS Store 상품 페이지 SSR HTML 파서 (브라우저 미사용).

상품 페이지는 서버에서 data-qa DOM이 이미 렌더링된 HTML로 내려온다. 이 모듈은 그 HTML을
crawl_detail_and_send와 같은 셀렉터·판정 규칙으로 파싱해 같은 payload를 만든다.

[데이터 오염 방지 원칙]
1. JSON 필드(영문 제목·발매일·커버 이미지)는 Apollo 캐시의 'Product:{psStoreId}' 객체에서만 읽는다.
   페이지에는 연관 게임·에디션의 invariantName 등이 다수 섞여 있으므로 '첫 매칭'에 의존하지 않는다.
2. 페이지의 메인 CTA 상품 ID가 요청한 psStoreId와 다르면 결과를 버린다.
3. 가격·날짜 값이 상식 범위를 벗어나면 결과를 버린다.
→ 어느 하나라도 실패하면 (None, 사유)를 반환하고, 호출 측은 기존 브라우저 방식으로 대체한다.

[시간대]
SSR HTML은 UTC 기준으로 렌더링된다 (예: 발매일 2022/2/24, 'xx PM UTC에 프로모션 종료').
현행 브라우저 수집은 Asia/Seoul로 재렌더링된 값을 저장하므로 KST로 변환해 맞춘다.
"""
from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable, Optional

import requests
from lxml import html as lxml_html

import browser_common

KST = timezone(timedelta(hours=9))  # 한국은 서머타임 없음 → 고정 오프셋
FETCH_TIMEOUT_SEC = 20

_UTC_END_RE = re.compile(r"(\d{4})/(\d{1,2})/(\d{1,2})\s+(\d{1,2}):(\d{2})\s*(AM|PM)\s*UTC")
_DATE_RE = re.compile(r"(\d{4})[./-](\d{1,2})[./-](\d{1,2})")
_YMD_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

_session = requests.Session()


@dataclass
class FetchResult:
    status: int
    final_url: str
    text: str
    elapsed: float


def fetch_product_html(target_url: str) -> FetchResult:
    started = time.perf_counter()
    res = _session.get(
        target_url,
        headers={"User-Agent": browser_common.random_user_agent(), "Accept-Language": "ko-KR"},
        timeout=FETCH_TIMEOUT_SEC,
    )
    return FetchResult(res.status_code, res.url, res.text, time.perf_counter() - started)


def clean_english_title(raw_title: Optional[str]) -> Optional[str]:
    """invariantName 정제 규칙 (batch_crawler.mine_english_title과 공유)."""
    if not raw_title:
        return None
    title = raw_title.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    title = re.sub(r"[™®©]", "", title).replace("＆", "&").replace("\t", " ")
    return re.sub(r"\s+", " ", title).strip() or None


def _text(el: Any) -> str:
    """Playwright inner_text 근사: 텍스트 결합 후 공백 정규화."""
    return re.sub(r"\s+", " ", el.text_content()).strip() if el is not None else ""


def _first(root: Any, css: str) -> Any:
    found = root.cssselect(css)
    return found[0] if found else None


def _digits(text: str) -> Optional[int]:
    d = re.sub(r"[^0-9]", "", text)
    return int(d) if d else None


def product_fields_from_texts(script_texts: Iterable[str], ps_store_id: str) -> dict:
    """env:* 스크립트 텍스트들의 Apollo 캐시에서 'Product:{id}' 객체만 병합 (연관 게임 값 혼입 차단).

    SSR(lxml)과 브라우저(page.evaluate로 추출한 텍스트) 경로가 공유한다.
    """
    key = f"Product:{ps_store_id}"
    merged: dict = {}
    for text in script_texts:
        if key not in text:
            continue
        try:
            obj = (json.loads(text).get("cache") or {}).get(key)
        except ValueError:
            continue
        if isinstance(obj, dict) and obj.get("id") == ps_store_id:
            for k, v in obj.items():
                merged.setdefault(k, v)
    return merged


def _product_fields(root: Any, ps_store_id: str) -> dict:
    texts = (s.text_content() for s in root.cssselect('script[type="application/json"]')
             if (s.get("id") or "").startswith("env:"))  # __NEXT_DATA__(대용량)는 파싱하지 않음
    return product_fields_from_texts(texts, ps_store_id)


def _own_media(product: dict, role: str) -> str:
    for source in ((product.get("personalizedMeta") or {}).get("media"), product.get("media")):
        for media in source or []:
            if isinstance(media, dict) and media.get("role") == role and media.get("url"):
                return media["url"].split("?")[0]
    return ""


def pick_image_url(product: dict, hero_src: Optional[str]) -> str:
    """대표 이미지 선택. 반드시 '이 상품 자신'의 데이터만 사용한다.

    1) 자기 GAMEHUB_COVER_ART (16:9)  2) 상품 페이지 히어로 이미지 (16:9)  3) 자기 MASTER (1:1)
    Concept(시리즈)나 __NEXT_DATA__ 첫 매칭은 쓰지 않는다 — DLC·번들에 본편 이미지가 들어가는 오염 원인.
    모두 없으면 "" (백엔드는 빈 값이면 기존 이미지를 유지).
    """
    return (_own_media(product, "GAMEHUB_COVER_ART")
            or (hero_src or "").split("?")[0]
            or _own_media(product, "MASTER"))


def _to_kst_date(iso_utc: Optional[str]) -> Optional[str]:
    if not iso_utc:
        return None
    try:
        return datetime.fromisoformat(iso_utc.replace("Z", "+00:00")).astimezone(KST).strftime("%Y-%m-%d")
    except ValueError:
        return None


def _sale_end_kst(desc: str) -> Optional[str]:
    m = _UTC_END_RE.search(desc)
    if m:
        y, mo, d, hh, mm, ap = m.groups()
        hour = int(hh) % 12 + (12 if ap == "PM" else 0)
        return datetime(int(y), int(mo), int(d), hour, int(mm), tzinfo=timezone.utc).astimezone(KST).strftime("%Y-%m-%d")
    m = _DATE_RE.search(desc)
    return f"{m.group(1)}-{m.group(2).zfill(2)}-{m.group(3).zfill(2)}" if m else None


def _main_cta_product_id(root: Any) -> Optional[str]:
    btn = _first(root, "div[data-qa='mfeCtaMain'] button[data-qa='wishlistToggle']")
    if btn is None:
        return None
    try:
        return json.loads(btn.get("data-telemetry-meta") or "{}").get("productId")
    except ValueError:
        return None


def _sanity_error(p: dict) -> Optional[str]:
    if not p["title"]:
        return "title 비어있음"
    if not (0 < p["currentPrice"] <= p["originalPrice"]):
        return f"가격 역전 ({p['originalPrice']} → {p['currentPrice']})"
    if not (0 <= p["discountRate"] <= 100):
        return f"할인율 범위 ({p['discountRate']})"
    for k in ("releaseDate", "saleEndDate"):
        if p[k] is not None and not _YMD_RE.match(p[k]):
            return f"{k} 형식 ({p[k]})"
    return None


def parse_product_html(html_text: str, target_url: str) -> tuple[Optional[dict], str]:
    """Returns (payload, "ok") 또는 (None, 실패 사유). payload 키는 crawl_detail_and_send와 동일."""
    ps_store_id = target_url.split("/")[-1].split("?")[0]
    root = lxml_html.fromstring(html_text)

    title_el = _first(root, "[data-qa='mfe-game-title#name']")
    if title_el is None:
        return None, "제목 요소 없음"

    cta_id = _main_cta_product_id(root)
    if cta_id and cta_id != ps_store_id:
        return None, f"상품 ID 불일치 (페이지 {cta_id})"

    product = _product_fields(root, ps_store_id)
    if not product:
        return None, "Apollo 캐시에 본인 상품 없음"

    publisher_el = _first(root, "[data-qa='mfe-game-title#publisher']")

    platforms, is_pro = set(), False
    for el in root.cssselect("[data-qa^='mfe-game-title#productTag']"):
        t = _text(el)
        up = t.upper()
        if "PS5" in up: platforms.add("PS5")
        if "PS4" in up: platforms.add("PS4")
        if "VR2" in up: platforms.add("PS_VR2")
        elif "VR" in up: platforms.add("PS_VR")
        if "PS5 Pro 성능 향상" in t or "PS5 Pro Enhanced" in t:
            is_pro = True
    if not is_pro:
        is_pro = any("PS5 Pro 성능 향상" in _text(el) or "PS5 Pro Enhanced" in _text(el)
                     for el in root.cssselect("[data-qa^='mfe-compatibility-notices#notices']"))

    genre_el = _first(root, "[data-qa='gameInfo#releaseInformation#genre-value']")

    best, in_catalog = None, False
    for i in range(3):
        offer = _first(root, f"[data-qa='mfeCtaMain#offer{i}']")
        if offer is None:
            continue
        radio = _first(offer, "input[type='radio']")
        if radio is not None and "UPSELL_PS_PLUS_GAME_CATALOG" in (radio.get("value") or ""):
            in_catalog = True
        offer_text = _text(offer)
        if not in_catalog and ("게임 카탈로그" in offer_text or "스페셜에 가입" in offer_text):
            in_catalog = True

        current = _digits(_text(_first(offer, f"[data-qa='mfeCtaMain#offer{i}#finalPrice']")))
        if not current:
            continue
        original = _digits(_text(_first(offer, f"[data-qa='mfeCtaMain#offer{i}#originalPrice']"))) or current
        desc_el = _first(offer, f"[data-qa='mfeCtaMain#offer{i}#discountDescriptor']")
        if best is None or current < best["currentPrice"]:
            best = {
                "originalPrice": original, "currentPrice": current,
                "discountRate": int(round((original - current) / original * 100)) if original > current else 0,
                "saleEndDate": _sale_end_kst(_text(desc_el)) if desc_el is not None else None,
                "isPlusExclusive": bool(offer.cssselect(".psw-c-t-ps-plus")),
            }
    if best is None:
        return None, "유효한 오퍼 없음"

    hero_src = None
    # SSR에는 JS가 그리는 '#image' 대신 '#image-no-js'로 히어로 이미지가 들어 있음
    for css in ("img[data-qa='gameBackgroundImage#heroImage#image']",
                "img[data-qa='gameBackgroundImage#heroImage#image-no-js']"):
        hero = _first(root, css)
        if hero is not None and hero.get("src"):
            hero_src = hero.get("src")
            break
    image_url = pick_image_url(product, hero_src)

    edition_features: list[str] = []
    upsell = _first(root, 'div[data-qa="mfeUpsell"]')
    for article in (upsell.cssselect("article") if upsell is not None else []):
        link = _first(article, "a[href*='/product/']")
        href = link.get("href") if link is not None else None
        if not href or href.split("?")[0].split("/")[-1] != ps_store_id:
            continue
        btn = _first(article, "button[data-telemetry-meta]")
        if btn is not None:
            try:
                meta = json.loads(btn.get("data-telemetry-meta") or "{}")
                if meta.get("productDetail", [{}])[0].get("productPriceDetail", [{}])[0].get("originalPriceValue", -1) == 0:
                    break
            except (ValueError, IndexError, AttributeError):
                pass
        edition_features = [t for t in (li.text_content().strip() for li in article.cssselect("ul[data-qa$='#features'] > li")) if t]
        break

    payload = {
        "psStoreId": ps_store_id, "title": _text(title_el),
        "englishTitle": clean_english_title(product.get("invariantName")),
        "publisher": _text(publisher_el) if publisher_el is not None else "Batch Crawler",
        "imageUrl": image_url, "description": "Full Data Crawler",
        "genreIds": _text(genre_el), "releaseDate": _to_kst_date(product.get("releaseDate")),
        "originalPrice": best["originalPrice"], "currentPrice": best["currentPrice"],
        "discountRate": best["discountRate"], "saleEndDate": best["saleEndDate"],
        "isPlusExclusive": best["isPlusExclusive"], "inCatalog": in_catalog, "platforms": list(platforms),
        "isPs5ProEnhanced": is_pro, "editionContents": edition_features,
    }
    error = _sanity_error(payload)
    return (None, f"값 검증 실패: {error}") if error else (payload, "ok")
