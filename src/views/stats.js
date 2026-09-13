import { html, raw } from '../lib/html.js';
import { GA_ID, layout } from './layout.js';
import { postUrl } from './components.js';
import { categoryOfPost } from '../data/categories.js';

/** 운영자용 대시보드. robots 에서 막고 링크도 두지 않는다. reveal 을 안 써서 열자마자 다 보인다. */
const KST = { timeZone: 'Asia/Seoul', hour12: false };
const kst = (iso) => new Date(iso).toLocaleString('ko-KR', { ...KST, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const num = (n) => Number(n ?? 0).toLocaleString('ko-KR');
const isGen = (s) => /^[a-z0-9]{5}$/.test(s.slug);
function ago(iso) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
  return m < 60 ? `${m}분 전` : m < 1440 ? `${Math.round(m / 60)}시간 전` : `${Math.round(m / 1440)}일 전`;
}

const STYLE = raw(`
.adm{padding-top:28px}
.adm__head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;padding-bottom:16px;border-bottom:2px solid var(--rule-strong)}
.adm__head .page-title{margin:0}
.adm__links{display:flex;gap:6px;flex-wrap:wrap}
.adm__links a{font-size:13px;font-weight:600;padding:7px 12px;border:1px solid var(--rule);border-radius:999px;background:var(--paper-2);text-decoration:none;color:var(--ink)}
.adm__links a:hover{border-color:var(--ink)}
.adm__kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:22px 0}
.kpi{padding:16px 18px;background:var(--paper-2);border:1px solid var(--rule);border-radius:var(--radius-lg);display:flex;flex-direction:column;gap:6px}
.kpi--live{border-color:var(--accent)}
.kpi__v{font-family:var(--display);font-weight:700;font-size:32px;line-height:1;letter-spacing:-.03em}
.kpi__v small{font-size:13px;font-weight:500;color:var(--ink-3);margin-left:5px;letter-spacing:0}
.kpi__l{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3)}
.adm__grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px}
.panel{background:var(--paper-2);border:1px solid var(--rule);border-radius:var(--radius-lg);padding:16px 18px 8px;min-width:0}
.panel--wide{grid-column:1/-1}
.panel__h{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin:0 0 10px;font-size:15px;font-weight:700}
.panel__h small{font-weight:500;color:var(--ink-3);font-size:12px}
.panel__note{margin:0 0 10px;font-size:13px;color:var(--ink-3);line-height:1.5}
.row{display:grid;grid-template-columns:minmax(0,1fr) 40% auto;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--rule);font-size:13px;line-height:1.3}
.row:last-child{border-bottom:0}
.row__l{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink-2)}
.row__l a{color:inherit;text-decoration:none}
.row__l a:hover{text-decoration:underline}
.row__b{height:8px;border-radius:4px;background:var(--paper-3);overflow:hidden}
.row__b i{display:block;height:100%;width:var(--w);background:var(--accent);border-radius:4px}
.row__b i.is-2{background:var(--gold)}
.row__n{font-variant-numeric:tabular-nums;font-weight:700;white-space:nowrap;text-align:right}
.row__n small{font-weight:500;color:var(--ink-3);margin-left:4px}
.posts{width:100%;border-collapse:collapse;font-size:14px}
.posts td{padding:9px 6px;border-bottom:1px solid var(--rule);vertical-align:top}
.posts tr:last-child td{border-bottom:0}
.posts td:first-child{width:36px;color:var(--ink-3);font-variant-numeric:tabular-nums}
.posts td:last-child{white-space:nowrap;text-align:right;color:var(--ink-2);font-variant-numeric:tabular-nums}
.posts a{text-decoration:none;color:var(--ink);font-weight:600}
.posts a:hover{text-decoration:underline}
.posts small{display:block;color:var(--ink-3);font-size:12px;margin-top:2px}
.tag{display:inline-block;font-size:10px;letter-spacing:.08em;padding:2px 6px;border-radius:4px;background:var(--paper-3);color:var(--ink-2);vertical-align:middle;margin-right:4px}
.tag--gen{background:var(--green-soft);color:var(--green)}
@media (max-width:720px){.row{grid-template-columns:minmax(0,1fr) 28% auto}.kpi__v{font-size:26px}.adm__links a{padding:6px 10px}}
`);

const kpi = (label, value, sub = '', live = false) => html`<div class="kpi ${live ? 'kpi--live' : ''}"><span class="kpi__v">${value}${sub ? html`<small>${sub}</small>` : ''}</span><span class="kpi__l">${label}</span></div>`;

/** 라벨 · 막대 · 숫자 한 줄. rows 는 [label, n, sub?, href?] */
function bars(rows, { alt = false, unit = '' } = {}) {
  if (!rows.length) return html`<p class="panel__note">아직 데이터가 없다.</p>`;
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return rows.map(
    ([label, n, sub, href]) => html`<div class="row">
      <span class="row__l">${href ? html`<a href="${href}">${label}</a>` : label}</span>
      <span class="row__b"><i class="${alt ? 'is-2' : ''}" style="--w:${Math.round((n / max) * 100)}%"></i></span>
      <span class="row__n">${num(n)}${unit}${sub ? html`<small>${sub}</small>` : ''}</span>
    </div>`,
  );
}

const panel = (title, body, { note = '', wide = false, sub = '' } = {}) =>
  html`<section class="panel ${wide ? 'panel--wide' : ''}"><h2 class="panel__h">${title}${sub ? html`<small>${sub}</small>` : ''}</h2>${note ? html`<p class="panel__note">${note}</p>` : ''}${body}</section>`;

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
  const gen = summaries.filter(isGen).length;
  const last = summaries[0];
  const gaOk = ga && !ga.error;

  const body = html`<style>${STYLE}</style>
  <div class="shell adm">
    <header class="adm__head">
      <div><p class="eyebrow">운영 · ${new Date().toLocaleString('ko-KR', { ...KST, month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })} KST</p><h1 class="page-title">발행 현황</h1></div>
      <nav class="adm__links">
        <a href="/0">새로고침</a>
        <a href="/">사이트</a>
        <a href="/rss.xml">RSS</a>
        <a href="/healthz">healthz</a>
        ${GA_ID ? html`<a href="https://analytics.google.com/" target="_blank" rel="noopener">GA 대시보드</a>` : ''}
        <a href="https://dash.cloudflare.com/" target="_blank" rel="noopener">Cloudflare</a>
      </nav>
    </header>

    <div class="adm__kpis">
      ${gaOk ? kpi('지금 접속 (GA 30분)', num(ga.realtime), '명', true) : ''}
      ${visits ? kpi('오늘 방문', num(visits.today), `재 ${num(visits.todayR)}`) : ''}
      ${visits ? kpi('7일 방문', num(visits.week), `재 ${num(visits.weekR)}`) : ''}
      ${visits ? kpi('누적 방문', num(visits.total), `재 ${num(visits.totalR)}`) : ''}
      ${gaOk ? kpi('GA 7일 사용자', num(ga.week.users), `조회 ${num(ga.week.views)}`) : ''}
      ${kpi('발행한 글', num(summaries.length), `발행기 ${num(gen)}`)}
      ${kpi('다룬 제품', num(products), '개')}
      ${last ? kpi('마지막 발행', ago(last.createdAt), kst(last.createdAt)) : ''}
    </div>

    <div class="adm__grid">
      ${visits
        ? panel('일별 방문', bars(visits.days.map((r) => [r.day, r.n, `재 ${num(r.r)}`]), { unit: '회' }), { sub: '14일 · 비콘', note: '자바스크립트를 실행한 브라우저만 세고 재방문은 1년 쿠키로 구분한다. 크롤러와 AI 봇은 빠진다.' })
        : panel('일별 방문', html`<p class="panel__note">D1 이 연결되지 않았다.</p>`)}
      ${gaOk ? panel('GA 일별 사용자', bars(ga.days.map((r) => [r.date, r.users, `조회 ${num(r.views)}`]), { alt: true, unit: '명' }), { sub: '14일' }) : ''}
      ${visits ? panel('인기 페이지', bars(visits.top.map((r) => [r.path, r.n, '', r.path]), { unit: '회' }), { sub: '7일 · 비콘' }) : ''}
      ${gaOk ? panel('GA 인기 페이지', bars(ga.pages.map((r) => [r.path, r.views, '', r.path]), { alt: true, unit: '회' }), { sub: '7일' }) : ''}
      ${gaOk ? panel('GA 유입 경로', bars(ga.sources.map((r) => [r.source, r.sessions]), { alt: true, unit: ' 세션' }), { sub: '7일' }) : ''}
      ${ga?.error ? panel('구글 애널리틱스', html`<p class="panel__note">불러오기 실패: ${ga.error}</p>`) : ''}
      ${!ga ? panel('구글 애널리틱스', html`<p class="panel__note">GA_PROPERTY_ID 변수와 GA_SA_EMAIL · GA_SA_KEY 시크릿을 넣으면 실시간 접속 · 사용자 · 유입 경로가 여기에 뜬다. README 의 "구글 애널리틱스" 참고.</p>`) : ''}
      ${panel('발행 추이', bars(days.map(([d, n]) => [d, n]), { unit: '건' }), { sub: '14일' })}
      ${panel('카테고리별', bars(cats.map(([c, n]) => [c, n]), { unit: '건' }), { sub: `${cats.length}개` })}
      ${panel(
        '최근 발행',
        html`<table class="posts"><tbody>${summaries.slice(0, 20).map(
          (s, i) => html`<tr>
            <td>${i + 1}</td>
            <td><a href="${postUrl(s)}">${s.title}</a><small><span class="tag ${isGen(s) ? 'tag--gen' : ''}">${isGen(s) ? '발행기' : '기존'}</span>${s.keyword} · ${categoryOfPost(s)?.name ?? '미분류'}</small></td>
            <td><time datetime="${s.createdAt}">${kst(s.createdAt)}</time><small>${ago(s.createdAt)}</small></td>
          </tr>`,
        )}</tbody></table>`,
        { wide: true, sub: '20건' },
      )}
    </div>
  </div>`;
  return layout({ title: '발행 현황', description: '운영 통계', canonical, active: '', body });
}
