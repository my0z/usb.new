import { html } from '../lib/html.js';
import { layout } from './layout.js';

export function aboutPage({ canonical }) {
  const body = html`<div class="shell shell--narrow">
    <header class="page-head">
      <p class="eyebrow">매체 소개</p>
      <h1 class="page-title">사서 쓰고 측정한 것만 쓴다</h1>
      <p class="page-desc">USB.KR 은 USB 주변기기를 직접 구매해 실사용 조건에서 측정하는 독립 리뷰 매체다.</p>
    </header>
    <div class="prose">
      <h2>테스트 원칙</h2>
      <p>
        모든 제품은 편집부가 직접 구매한다. 협찬을 받은 경우 본문 최상단에 반드시 명시하며 그 경우에도 평점 기준은
        동일하게 적용한다.
      </p>
      <h2>측정 환경</h2>
      <p>
        저장장치는 최소 30일 이상 실사용한 뒤 지속 쓰기와 랜덤 접근을 각각 3회 측정해 중앙값을 기록한다. 케이블과
        젠더는 프로토콜 분석기와 전력 측정기로 확인한다.
      </p>
      <h2>평점 기준</h2>
      <ul>
        <li>9.0 이상 — 같은 가격대에서 대안을 찾기 어렵다</li>
        <li>8.0 이상 — 분명한 장점이 있고 단점이 감수할 만하다</li>
        <li>7.0 이상 — 조건이 맞으면 선택할 만하다</li>
        <li>7.0 미만 — 권하지 않는다</li>
      </ul>
      <h2>제보와 문의</h2>
      <p>측정 요청이나 오류 제보는 editor@usb.kr 로 받는다.</p>
    </div>
  </div>`;

  return layout({
    title: '매체 소개',
    description: 'USB.KR 의 테스트 원칙과 평점 기준.',
    canonical,
    active: 'about',
    body,
  });
}
