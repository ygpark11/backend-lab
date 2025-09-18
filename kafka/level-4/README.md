# 카프카(Kafka) 학습 - Level 4: 데이터 직렬화 (JSON 메시지)

## 1. 핵심 개념 정리
- **직렬화/역직렬화 (Serialization/Deserialization)**: 자바 객체('유리 화병')를 카프카가 전송할 수 있는 바이트 배열('뽁뽁이로 감싼 상자')로 변환하고, 다시 원래 객체로 복원하는 과정.
- **JSON 직렬화**: 사람이 읽기 쉬운 JSON 포맷을 사용하여 객체를 문자열로 변환하는 가장 대중적인 직렬화 방식. 스프링에서는 Jackson 라이브러리를 통해 이 기능을 제공한다.
- **프로듀서/컨슈머 간의 데이터 계약**: 서로 다른 애플리케이션(프로듀서, 컨슈머)이 객체를 주고받을 때는, 패키지 이름이 달라 발생하는 `ClassNotFoundException`과 같은 문제를 해결하기 위한 명시적인 설정이 필요하다.
- **스키마 관리**: MSA 환경에서는 여러 서비스가 동일한 메시지 구조를 공유해야 하므로, API 명세를 공유하는 Swagger처럼, 메시지의 스키마(구조)를 중앙에서 관리하는 '스키마 레지스트리'와 같은 도구가 중요해진다.

---

## 2. 핵심 설정 (`consumer-app/application.yml`)
```yaml
spring:
  kafka:
    consumer:
      # ...
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      properties:
        # 1. 보안을 위해 신뢰할 수 있는 패키지를 지정 (개발 시에는 '*'로 모든 패키지 허용)
        spring.json.trusted.packages: "*"
        # 2. 프로듀서가 보낸 타입 헤더를 무시하도록 설정 (패키지 이름이 다른 문제를 해결)
        spring.json.use.type.headers: false
        # 3. 타입 헤더가 없을 때, 기본으로 변환할 DTO 클래스를 명시
        spring.json.value.default.type: com.example.consumerapp.dto.MyMessage
```
---

## 3. 실습 Q&A 및 발견
### Q: `spring-kafka`를 썼는데 왜 Jackson 의존성을 추가해야 하는가?
- A: `spring-boot-starter-web`과 달리, `spring-kafka`는 특정 직렬화 라이브러리(Jackson, Avro 등)를 강제하지 않는다. 따라서 JSON을 사용하겠다는 의도를 `jackson-databind` 의존성을 직접 추가하여 명시해야 한다.

### Q: `trusted.packages`를 설정해도 왜 `ClassNotFoundException`이 발생했는가?
- A: 프로듀서가 보낸 메시지에는 타입 정보 헤더(`__TypeId__`)에 `com.example.producer_app.dto.MyMessage`라는 전체 패키지 경로가 포함되어 있었다. 컨슈머는 자신의 클래스패스에서 이 경로를 찾으려 했지만, 컨슈머의 DTO는 `com.example.consumer_app.dto.MyMessage`이므로 클래스를 찾지 못했다. `spring.json.use.type.headers: false` 설정으로 이 타입 헤더를 무시하도록 하여 해결했다.

### Q: `use.type.headers: false` 설정 후 왜 `No type information` 오류가 발생했는가?
- A: 타입 헤더를 무시하도록 설정했더니, 역직렬화기가 JSON을 어떤 객체로 바꿔야 할지 알 수 없게 되었다. `spring.json.value.default.type`으로 기본 변환 클래스를 명시해주어 문제를 해결했다.
---

## 4. 학습한 내용
- `JsonSerializer`와 `JsonDeserializer`를 사용하여 자바 객체를 카프카 메시지로 주고받는 방법을 학습했다.

- 직렬화 과정에서 발생하는 다양한 오류(의존성 누락, 클래스 경로 불일치 등)를 직접 겪고, `application.yml`의 상세 설정을 통해 해결하는 방법을 익혔다.

- 서로 다른 애플리케이션 간에 데이터를 주고받을 때 '데이터 계약(스키마)'을 관리하는 것이 왜 중요한지 이해하고, 스키마 레지스트리와 같은 관련 기술의 필요성을 파악했다.

- 이를 통해 단순히 메시지를 보내는 것을 넘어, 안정적으로 구조화된 데이터를 주고받는 실무적인 카프카 애플리케이션 개발의 기초를 다졌다.