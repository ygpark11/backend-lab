#!/bin/sh

# === 변수 설정 ===
# 원본으로 사용할 설정 파일의 경로를 TEMPLATE_CONFIG 변수에 저장합니다.
TEMPLATE_CONFIG=/etc/redis/sentinel.conf
# 동적으로 생성할 새로운 설정 파일의 경로를 NEW_CONFIG 변수에 저장합니다.
NEW_CONFIG=/tmp/sentinel.conf


# === redis-master 실제 IP 주소 조회 ===
# getent hosts [서비스이름]: Docker 내부 DNS에 서비스 이름을 물어봐서 실제 IP 주소를 찾아옵니다.
# awk '{ print $1 }': 찾아온 결과에서 IP 주소 부분만 잘라내어 저장합니다.
MASTER_IP=$(getent hosts redis-master | awk '{ print $1 }')


# === 설정 파일 동적 생성 ===
# sed "s/A/B/" [원본파일] > [새파일]: 원본 파일에서 A 문자열을 B 문자열로 치환하여 새 파일로 저장합니다.
# 즉, 원본 설정 파일에서 '127.0.0.1'을 방금 찾아낸 실제 IP 주소(${MASTER_IP})로 변경한 뒤,
# 그 결과를 /tmp/sentinel.conf 라는 새로운 파일로 만듭니다.
sed "s/127.0.0.1/${MASTER_IP}/" ${TEMPLATE_CONFIG} > ${NEW_CONFIG}


# === Sentinel 실행 ===
# 디버깅을 위해, 최종적으로 만들어진 설정 파일의 내용을 화면에 한번 출력합니다.
echo "Starting Sentinel with dynamic configuration..."
cat ${NEW_CONFIG}

# exec [명령어]: 현재 쉘 프로세스를 새로운 프로세스로 대체하여 실행합니다.
# 즉, 이 스크립트의 역할을 끝내고, 제어권을 redis-sentinel 프로세스에게 완전히 넘겨줍니다.
# 이때, 방금 동적으로 생성한 새로운 설정 파일을 사용하도록 지정합니다.
exec redis-sentinel ${NEW_CONFIG}