import { html } from '../lib/html.js';
import { layout } from './layout.js';

export function aboutPage({ canonical }) {
  const body = html`<div class="shell shell--narrow">
    <header class="page-head reveal">
      <p class="eyebrow">사이트 소개</p>
      <h1 class="page-title">스펙과 가격을 한 화면에서 비교한다</h1>
      <p class="page-desc">USB.KR 은 실시간 쿠팡 가격 데이터를 바탕으로 전자기기 스펙과 가격을 비교하는 리뷰 매거진이다.</p>
    </header>
    <div class="prose">
      <h2>어떻게 만들어지는가</h2>
      <p>
        인기 검색어와 신상품 흐름을 매일 수집하고 조사된 스펙 정보를 바탕으로 AI 가 비교 글의 초안을 쓴다. 가격과 배송 정보는
        쿠팡 파트너스 API 에서 받아 자동으로 갱신된다.
      </p>
      <h2>읽을 때 유의할 점</h2>
      <p>
        이 사이트의 글은 참고용 콘텐츠다. 정확한 스펙과 최신 가격은 반드시 판매 페이지에서 다시 확인하기를 권한다. 글에
        포함된 상품 링크는 쿠팡 파트너스 활동의 일환이며 이를 통해 일정액의 수수료를 제공받을 수 있다.
      </p>
      <h2>분류 기준</h2>
      <ul>
        <li>단일 리뷰 — 제품 하나를 깊게 다룬다</li>
        <li>비교 — 같은 용도의 제품 여러 개를 가격과 배송 조건으로 나란히 본다</li>
        <li>가이드 — 규격이나 고르는 법을 정리한다</li>
      </ul>
      <h2>문의</h2>
      <p>오류 제보와 삭제 요청은 <a href="/privacy">개인정보처리방침</a> 에 안내된 경로로 받는다.</p>
    </div>
  </div>`;

  return layout({ title: '사이트 소개', description: 'USB.KR 이 글을 만드는 방식과 읽을 때 유의할 점.', canonical, active: 'about', body });
}

export function privacyPage({ canonical }) {
  const body = html`<div class="shell shell--narrow">
    <header class="page-head reveal">
      <p class="eyebrow">Privacy</p>
      <h1 class="page-title">개인정보처리방침</h1>
      <p class="page-desc">최종 수정일: 2026년 9월 11일</p>
    </header>
    <div class="prose">
      <p>usb.kr(이하 "사이트")은 이용자의 개인정보를 소중히 다루며 다음과 같은 방침에 따라 정보를 처리한다.</p>
      <h2>수집하는 정보</h2>
      <p>사이트는 회원가입을 받지 않으며 이름이나 연락처 같은 개인 식별 정보를 직접 수집하지 않는다. 방문 통계를 위해 접속 국가와 브라우저 종류와 유입 경로가 익명으로 기록될 수 있다.</p>
      <h2>쿠키</h2>
      <p>중복 집계를 막기 위한 짧은 수명의 쿠키가 쓰일 수 있다. 브라우저 설정에서 언제든 차단할 수 있으며 차단해도 사이트 이용에는 지장이 없다.</p>
      <h2>외부 링크</h2>
      <p>상품 링크는 쿠팡으로 연결된다. 이동한 뒤의 정보 처리는 해당 사이트의 방침을 따른다.</p>
      <h2>문의</h2>
      <p>개인정보 관련 문의와 콘텐츠 삭제 요청은 사이트 운영자 이메일로 받는다.</p>
    </div>
  </div>`;
  return layout({ title: '개인정보처리방침', description: 'usb.kr 개인정보처리방침.', canonical, active: '', body });
}
