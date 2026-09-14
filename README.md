# usb.new

키움 REST API 기반 종목 스크리너/자동매매. `worker/`(Cloudflare Worker)와 `relay/`(고정 IP 중계서버)
두 부분으로 구성되며, 둘 다 이 프로젝트 전용 리소스만 사용하도록 분리되어 있습니다.

## 분리 원칙

원래 다른 프로젝트와 D1/KV/relay를 같은 값으로 공유하고 있었습니다. 아래 항목은
반드시 이 프로젝트만을 위해 새로 만들어야 하며, 기존 값을 복사해 넣으면 다시 공유 상태로 돌아갑니다.

- D1 데이터베이스
- KV 네임스페이스
- R2 버킷
- Analytics Engine 데이터셋
- relay 인스턴스 (별도 VM/프로세스, 별도 포트)
- RELAY_SECRET, ADMIN_KEY, RELAY_URL, WORKER_URL

`relay/relay.js`는 예전에 `WORKER_URL` 미설정 시 특정 워커 도메인으로 조용히 연결되는
하드코드 기본값이 있었는데, 이번에 제거했습니다. 이제 `WORKER_URL`을 명시하지 않으면
relay가 즉시 종료됩니다 (`RELAY_SECRET`과 동일한 fail-fast 방식).

## 배포 순서

1. `cd worker && wrangler d1 create usbnew-kiwoom-db` -> `wrangler.toml`의 `database_id` 교체
2. `wrangler kv namespace create CACHE_KV` -> `wrangler.toml`의 `id` 교체
3. `wrangler r2 bucket create usbnew-kiwoom-backtest`
4. `wrangler.toml`에 정의된 시크릿을 전부 `wrangler secret put <NAME>`으로 새로 등록
   (기존 워커에 등록된 값 재사용 금지 - 특히 `RELAY_URL`/`RELAY_SECRET`)
5. D1 스키마(`snapshots`, `watchlist` 등) 적용 - 기존에 쓰던 schema.sql을 새 데이터베이스에 실행
   (`watchlist_peak`, `kr_index_last_cache`는 워커가 최초 실행 시 자체적으로 생성함)
6. `wrangler deploy`
7. `relay/.env.example`을 `.env`로 복사해 새 VM/프로세스에서 값 채우고 `npm start`
   (`RELAY_URL`은 이 relay 인스턴스 주소, `WORKER_URL`은 6번에서 배포한 워커 주소)

## 구조

```
worker/   Cloudflare Worker (스크리너/대시보드/자동매매 로직)
relay/    키움 고정 IP 중계 + 웹소켓 실시간 시세 수집 서버 (Node.js, 상시구동)
```
