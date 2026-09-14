# 국내주식 단타 신호봇

거래량 상위 종목을 스크리닝하고 돌파 시그널이 나오면 텔레그램으로 매수/매도 알림만 보내는 봇입니다. 실제 주문은 절대 자동으로 넣지 않으며 매매는 사용자가 알림을 보고 직접 실행합니다.

## 중요 안내

일 100만원은 코드에 설정된 목표값일 뿐 보장되는 수익이 아닙니다. 이 봇은 신호만 제공하며 실제 매매 판단과 실행 책임은 전적으로 사용자에게 있습니다. 반드시 모의투자로 충분히 검증한 뒤 사용하세요.

## 구조

- REST/웹소켓 기반 키움 REST API(`kiwoom-client` 패키지)를 사용해 리눅스 서버에서 바로 실행 가능
- 국내장 운영시간(평일 09:00~15:30 KST)에만 동작하고 그 외 시간은 자동으로 대기
- 15시 이후 신규 진입 알림 중단 15시 20분 보유 신호 정리 알림 후 당일 종료
- 하루 누적 예상손익이 목표 100만원 도달 또는 손실 한도 도달 시 당일 알림 중단

## 요구 환경

- 리눅스 서버 (오라클 클라우드 Always Free VM 등 상시 가동 가능한 인스턴스 권장)
- Python 3.10 이상
- 키움증권 REST API 앱키/시크릿 (실전 또는 모의투자용)
- 텔레그램 봇 토큰과 채팅 ID

## 설치

```
pip install -r requirements.txt
cp .env.example .env
```

`.env` 파일을 열어 아래 값을 채우세요.

```
KIWOOM_APP_KEY=발급받은 앱키
KIWOOM_APP_SECRET=발급받은 시크릿키
KIWOOM_IS_MOCK=true 또는 false
TELEGRAM_BOT_TOKEN=텔레그램 봇파더에서 발급받은 토큰
TELEGRAM_CHAT_ID=알림 받을 채팅 ID
WATCHLIST=005930,000660  # 스크리닝과 별도로 항상 감시할 종목 (선택)
```

텔레그램 봇 만들기: 텔레그램에서 `@BotFather`에게 `/newbot`을 보내면 토큰을 받을 수 있습니다. 채팅 ID는 봇과 대화를 한 번 시작한 뒤 `https://api.telegram.org/bot<토큰>/getUpdates`로 확인합니다.

## 실행

```
python main.py
```

프로세스는 종료하지 않고 계속 떠 있으면서 장 시간 외에는 대기하고 장중에는 감시와 알림을 반복합니다. 오라클 VM에서는 `systemd` 서비스나 `nohup`으로 백그라운드에 상시 등록해 두면 됩니다.

예시 systemd 유닛(`/etc/systemd/system/signal-bot.service`)

```
[Unit]
Description=Stock signal bot
After=network.target

[Service]
WorkingDirectory=/home/ubuntu/usb.new
ExecStart=/home/ubuntu/usb.new/.venv/bin/python main.py
Restart=always
EnvironmentFile=/home/ubuntu/usb.new/.env

[Install]
WantedBy=multi-user.target
```

```
sudo systemctl daemon-reload
sudo systemctl enable --now signal-bot
```

## 전략 개요

1. 당일거래량상위 조회(`ka10030`)로 코스피/코스닥 상위 종목과 `WATCHLIST`를 합쳐 감시 대상 선정
2. 후보 종목 실시간 체결가를 웹소켓으로 구독
3. 최근 20틱 고점 돌파 + 거래량 급증 조건 충족 시 매수 알림
4. 매수가 대비 -2% 손절 또는 +3% 익절 도달 시 매도 알림
5. 15시 이후 신규 진입 알림 중단 15시 20분 이후 보유 신호 정리 알림
6. 알림 기준 누적 예상손익이 목표 100만원 도달 또는 손실 한도 도달 시 당일 알림 중단

## 설정 값 변경

`config.py`에서 목표 수익 손절 익절 비율 동시 보유 종목 수 진입/청산 시각 등을 조정할 수 있습니다.

## 알아둘 점

- 신호가 나온 가격과 실제 체결가는 다를 수 있어 누적 예상손익은 추정치입니다
- 스크리닝은 당일 거래량 상위 종목 기준이며 세부 필터(가격대 거래량 배수 등)는 `config.py`에서 조정합니다
- 공휴일 캘린더는 반영되어 있지 않아 평일 여부만 확인합니다 공휴일에는 수동으로 프로세스를 멈추거나 알림을 무시하세요

## 테스트

리스크 관리 전략 로직 장시간 계산 신호 흐름은 실제 API 연결 없이 단위 테스트로 검증할 수 있습니다.

```
pip install pytest
pytest tests/
```
