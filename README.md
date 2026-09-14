# usb.new 퀀트 봇

Freqtrade 기반 무료 크립토 자동매매 셋업입니다.
아직 실전 투자용이 아니며 dry-run 모드로 시작합니다.

## 구성

- `docker-compose.yml`: Freqtrade 공식 이미지 실행 정의
- `user_data/config.json`: 거래소 및 봇 기본 설정
- `user_data/strategies/SampleRsiStrategy.py`: RSI 기반 샘플 전략

## 실행 방법

```bash
docker compose up -d
```

실행 후 `docker compose logs -f freqtrade`로 상태를 확인합니다.

## 전략 백테스트

과거 데이터를 먼저 내려받습니다.

```bash
docker compose run --rm freqtrade download-data \
  --config user_data/config.json \
  --timeframe 1h \
  --timerange 20240101-
```

백테스트를 실행합니다.

```bash
docker compose run --rm freqtrade backtesting \
  --config user_data/config.json \
  --strategy SampleRsiStrategy \
  --timerange 20240101-
```

## 주의 사항

- `dry_run` 값이 `true`일 때는 실제 주문이 나가지 않습니다.
- 실거래로 전환하기 전에 API 키를 발급받고 `config.json`의 `exchange.key`와 `exchange.secret`을 채워야 합니다.
- 이 저장소는 교육 목적이며 투자 권유가 아닙니다.
