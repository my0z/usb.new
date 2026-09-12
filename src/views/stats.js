import { html } from '../lib/html.js';
import { GA_ID, layout } from './layout.js';
import { postUrl } from './components.js';
import { categories, categoryOfPost } from '../data/categories.js';

/** 운영자용 통계. robots 에서 막고 링크도 두지 않는다. */
const kst = (iso) => new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
function ago(iso) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
  return m < 60 ? `${m}분 전` : m < 1440 ? `${Math.round(m / 60)}시간 전` : `${Math.round(m / 1440)}일 전`;
}
const num = (n) => Number(n ?? 0).toLocaleString('ko-KR');

/** 구글 애널리틱스 블록. 설정 전이면 안내만 · 오류면 오류 · 데이터가 있으면 타일과 표. */
function gaSection(ga) {
  const head = html`<div class="specs__head"><h2 class="specs__title">구글 애널리틱스${GA_ID ? html` · <a href="https://analytics.google.com/">대시보드</a>` : ''}</h2></div>`;
  if (!ga) return html`<section class="specs reveal">${head}<p class="page-desc">GA_PROPERTY_ID 변수와 GA_SA_EMAIL · GA_SA_KEY 시크릿을 넣으면 여기에 집계가 뜬다. README 의 "구글 애널리틱스" 참고.</p></section>`;
  if (ga.error) return html`<section class="specs reveal">${head}<p class="page-desc">불러오기 실패: ${ga.error}</p></section>`;
  const tile = (l, v, sub) => html`<div class="stat"><span class="stat__value">${v}<small>${sub}</small></span><span class="stat__label">${l}</span></div>`;
  return html`<section class="stats stats--page reveal">
      ${tile('지금 접속 중', num(ga.realtime), '명 · 30분')}
      ${tile('오늘 사용자', num(ga.today.users), `명 · 조회 ${num(ga.today.views)}`)}
      ${tile('7일 사용자', num(ga.week.users), `명 · 조회 ${num(ga.week.views)}`)}
      ${tile('28일 사용자', num(ga.month.users), `명 · 세션 ${num(ga.month.sessions)}`)}
    </section>
    <div class="stats__grid">
      <section class="specs reveal">${head}
        <table><tbody>${ga.days.map((r) => html`<tr><th scope="row">${r.date}</th><td>사용자 ${num(r.users)} · 조회 ${num(r.views)}</td></tr>`)}</tbody></table>
      </section>
      <section class="specs reveal"><div class="specs__head"><h2 class="specs__title">GA 7일 인기 페이지</h2></div>
        <table><tbody>${ga.pages.map((r) => html`<tr><th scope="row"><a href="${r.path}">${r.path}</a></th><td>${num(r.views)}회</td></tr>`)}</tbody></table>
      </section>
      <section class="specs reveal"><div class="specs__head"><h2 class="specs__title">GA 7일 유입 경로</h2></div>
        <table><tbody>${ga.sources.map((r) => html`<tr><th scope="row">${r.source}</th><td>세션 ${num(r.sessions)}</td></tr>`)}</tbody></table>
      </section>
    </div>`;
}

export function statsPage({ canonical, summaries, visits = null, ga = null }) {
  const byCat = new Map();
  const byDay = new Map();
  let products = 0;
  for (const s of summaries) {
    const c = categoryOfPost(s)?.name ?? '미분류';
    byCat.set(c, (byCat.get(c) ?? 0) + 1);
    const d = String(s.createdAt).slice(0, 10);
    byDay.set(d, (byDay.get(d) ?? 0) + 1);
    products += s.productCount ?? s.products?.length ?? 0;
  }
  const days = [...byDay].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14);
  const cats = [...byCat].sort((a, b) => b[1] - a[1]);
  const gen = summaries.filter((s) => /^[a-z0-9]{5}$/.test(s.slug)).length;
  const tiles = [
    ['발행한 글', summaries.length, '건'],
    ['발행기 글', gen, '건'],
    ['다룬 제품', products, '개'],
    ['활성 카테고리', cats.filter(([n]) => n !== '미분류').length, '개'],
  ];
  const body = html`<div class="shell">
    <header class="page-head reveal">
      <p class="eyebrow">운영 통계</p>
      <h1 class="page-title">발행 현황</h1>
      <p class="page-desc">방문은 브라우저 비콘 기준이라 크롤러와 AI 봇은 빠진다. 재방문은 1년 쿠키로 구분한다.</p>
    </header>
    ${visits
      ? html`<section class="stats stats--page reveal">
          <div class="stat"><span class="stat__value">${visits.today ?? 0}<small>회 · 재방문 ${visits.todayR ?? 0}</small></span><span class="stat__label">오늘 방문</span></div>
          <div class="stat"><span class="stat__value">${visits.week ?? 0}<small>회 · 재방문 ${visits.weekR ?? 0}</small></span><span class="stat__label">7일 방문</span></div>
          <div class="stat"><span class="stat__value">${visits.total ?? 0}<small>회 · 재방문 ${visits.totalR ?? 0}</small></span><span class="stat__label">누적 방문</span></div>
          <div class="stat"><span class="stat__value">${visits.top?.[0]?.n ?? 0}<small>회</small></span><span class="stat__label">7일 최다 페이지</span></div>
        </section>
        <div class="stats__grid">
          <section class="specs reveal"><div class="specs__head"><h2 class="specs__title">일별 방문 (14일)</h2></div>
            <table><tbody>${visits.days.map((r) => html`<tr><th scope="row">${r.day}</th><td>${r.n}회 · 신규 ${r.n - r.r} · 재방문 ${r.r}</td></tr>`)}</tbody></table>
          </section>
          <section class="specs reveal"><div class="specs__head"><h2 class="specs__title">7일 인기 페이지</h2></div>
            <table><tbody>${visits.top.map((r) => html`<tr><th scope="row"><a href="${r.path}">${r.path}</a></th><td>${r.n}회</td></tr>`)}</tbody></table>
          </section>
        </div>`
      : ''}
    ${gaSection(ga)}
    <section class="stats stats--page reveal">
      ${tiles.map(([l, v, u]) => html`<div class="stat"><span class="stat__value">${v}<small>${u}</small></span><span class="stat__label">${l}</span></div>`)}
    </section>
    <div class="stats__grid">
      <section class="specs reveal"><div class="specs__head"><h2 class="specs__title">최근 14일 발행</h2></div>
        <table><tbody>${days.map(([d, n]) => html`<tr><th scope="row">${d}</th><td>${n}건</td></tr>`)}</tbody></table>
      </section>
      <section class="specs reveal"><div class="specs__head"><h2 class="specs__title">카테고리별</h2></div>
        <table><tbody>${cats.map(([c, n]) => html`<tr><th scope="row">${c}</th><td>${n}건</td></tr>`)}</tbody></table>
      </section>
    </div>
    <section class="specs reveal"><div class="specs__head"><h2 class="specs__title">최근 발행 20건</h2></div>
      <table><tbody>${summaries.slice(0, 20).map((s) => html`<tr><th scope="row"><a href="${postUrl(s)}">${s.title}</a><br /><small>${s.keyword} · ${/^[a-z0-9]{5}$/.test(s.slug) ? '발행기' : '기존'}</small></th><td><time datetime="${s.createdAt}">${kst(s.createdAt)}</time><br /><small>${ago(s.createdAt)}</small></td></tr>`)}</tbody></table>
    </section>
  </div>`;
  return layout({ title: '발행 현황', description: '운영 통계', canonical, active: '', body });
}
