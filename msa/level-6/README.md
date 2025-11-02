# MSA Level 6 - API Gateway 심화 (라우팅 및 전역 필터)

## 학습 목표
MSA의 '정문'인 API Gateway(`gateway-service`)를 고도화한다.
1.  신규 서비스(`coupon-service`) 유입에 따른 **동적 라우팅 경로를 확장**한다.
2.  모든 요청에 공통 정책을 적용하는 **'전역 필터(Global Filter)'**를 Java 코드로 구현한다.
3.  전통적인 MVC 서비스와 리액티브 게이트웨이 간의 **올바른 API 반환 타입을 정립**한다.

---

## 1. 라우팅 심화: '똑똑한 안내원' 훈련

`coupon-service`라는 신규 부서가 생김에 따라, '정문 안내원(Gateway)'이 이 서비스로 가는 길을 안내할 수 있도록 라우팅 테이블을 업데이트했다.

### ### `gateway-service.yml` (라우팅 추가)
```yaml
spring:
  cloud:
    gateway:
      routes:
        # 1. 기존 user-service 라우트
        - id: user-service-route
          uri: lb://USER-SERVICE # "lb://"는 유레카를 통해 찾으라는 뜻
          predicates:
            - Path=/users/**
          filters:
            # ... (기존 필터들: CircuitBreaker, AuthenticationFilter 등) ...
        
        # 2. ★★★ 신규 coupon-service 라우트 추가 ★★★
        - id: coupon-service-route
          uri: lb://COUPON-SERVICE # 유레카에 등록된 서비스 이름
          predicates:
            - Path=/coupons/** # /coupons/로 시작하는 모든 요청
          filters:
            # coupon-service도 내부 경로를 추상화하기 위해 RewritePath 적용
            - name: RewritePath
              args:
                regexp: /coupons/(?<segment>.*)
                replacement: /$\{segment}
```

- `lb://COUPON-SERVICE`: 유레카 서버에 등록된 서비스 이름을 기반으로 동적으로 IP와 포트를 찾아 라우팅하는 '로드 밸런서' URI 스키마를 사용했다.
- `RewritePath`: `user-service`와 동일한 원칙을 적용, 외부 호출 경로(`/coupons`)와 내부 API 경로를 분리하여 서비스 간의 '느슨한 결합'을 유지했다.
- 
## 2. 전역 필터: '철저한 보안 요원' 배치

지금까지의 필터는 `user-service-route`에만 적용된 '경로별 필터'였다. 이제 **모든 경로(`users`, `coupons` 등)**를 통과하는 요청에 공통 정책을 적용하기 위해 **'전역 필터(Global Filter)'**를 구현했다.

시나리오: "모든 요청은 `X-Request-ID` 헤더를 필수로 포함해야 한다."

### GlobalRequestFilter.java (핵심 로직)
```java
@Component // 1. @Component로 등록하면 yml 설정 없이도 자동으로 필터가 활성화됨
@Slf4j
public class GlobalRequestFilter implements GlobalFilter, Ordered { // 2. GlobalFilter 구현

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();

        if (!request.GetHeaders().containsKey("X-Request-ID")) {
            log.error("Global Filter: X-Request-ID header is missing!");
            // 3. 헤더가 없으면 요청을 즉시 400 에러로 차단
            exchange.getResponse().setStatusCode(HttpStatus.BAD_REQUEST);
            return exchange.getResponse().setComplete();
        }

        // 4. 헤더가 있으면 요청을 다음 필터 체인으로 통과시킴
        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        // 5. 필터의 실행 순서를 지정. 값이 낮을수록 먼저 실행됨.
        return -1; // 다른 기본 필터들보다 먼저 실행되도록 설정
    }
}
```

### GlobalFilter vs. AbstractGatewayFilterFactory

Spring Cloud Gateway는 필터를 만드는 두 가지 주요 방법을 제공하며, 각각의 사용 목적이 다르다.


| 구분 | `GlobalFilter` | `AbstractGatewayFilterFactory` |
|:----|:----|:----|
| 범위 | 전역 (모든 라우트에 자동 적용) | 선택적 (특정 라우트에만 적용) |
| 등록/적용 | Java 코드로 `@Component` 등록하면 자동 적용 | Java로 '설계도'를 만들고, `yml`에서 `name:`으로 선택 적용 |
| 비유 | 쇼핑몰 정문 보안 요원 (모든 방문객 검사) | 특정 매장 앞 특별 검문소 (해당 매장 방문객만 검사) |
| 구현 인터페이스/클래스 | `implements GlobalFilter` | `extends AbstractGatewayFilterFactory` |
| 사용 예시 | `GlobalRequestFilter (모든 요청 헤더 검사)` | `AuthenticationFilter` (`user-service` 요청만 인증) |

- `@Component`: Java 코드로 작성된 글로벌 필터는 `@Component`로 빈으로 등록하기만 하면 Spring Cloud Gateway가 자동으로 인식하여 필터 체인에 추가한다.
- `GlobalFilter vs. GatewayFilterFactory`: `AuthenticationFilter`는 `AbstractGatewayFilterFactory`를 상속하여 `yml`에서 `name`으로 호출하는 **'경로별 필터'**로 만들었다. 반면, `GlobalRequestFilter`는 `GlobalFilter`를 구현하여 **'전역 필터'**로 만들었다.