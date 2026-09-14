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
.row__n.is-bad{color:var(--accent)}
.genform{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) auto auto;gap:8px;margin-bottom:12px}
.genform__photo{display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;padding:9px 14px;border:1px dashed var(--rule-strong);border-radius:8px;cursor:pointer;white-space:nowrap}
.genform__photo input{display:none}
.genform__photo.has{border-style:solid;border-color:var(--accent);color:var(--accent)}
.genmsg{padding:8px 12px;background:var(--gold-soft);border-radius:8px;color:var(--ink)}
.genform input{font:inherit;font-size:14px;padding:9px 12px;border:1px solid var(--rule);border-radius:8px;background:var(--paper);color:var(--ink);min-width:0}
.genform button{font:inherit;font-size:14px;font-weight:700;padding:9px 16px;border:0;border-radius:8px;background:var(--ink);color:var(--paper);cursor:pointer}
@media (max-width:720px){.genform{grid-template-columns:1fr}}
.psi{display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:8px;margin-bottom:10px}
.psi b{display:block;font-family:var(--display);font-size:26px;line-height:1.1;letter-spacing:-.02em}
.psi span{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)}
.psi .g{color:var(--green)}.psi .a{color:var(--gold)}.psi .p{color:var(--accent)}
@media (max-width:720px){.row{grid-template-columns:minmax(0,1fr) 28% auto}.kpi__v{font-size:26px}.adm__links a{padding:6px 10px}}
`);

/* PageSpeed Insights 는 브라우저가 직접 부른다. 워커에서 부르면 30초를 넘겨 끊기고 API 한도도 워커 IP 로 잡힌다. 결과는 localStorage 에 1시간 둔다. */
const PSI_SCRIPT = raw(`
(function(){
  // 사진은 올리기 전에 1024px 로 줄인다 (폰 원본 5MB 를 그대로 보내면 느리고 AI 입력 한도도 넘는다)
  var f=document.getElementById('genform'),fi=f&&f.querySelector('input[type=file]');
  if(fi){fi.addEventListener('change',function(){fi.parentNode.classList.toggle('has',!!fi.files.length);fi.parentNode.querySelector('span').textContent=fi.files.length?'사진 1장':'사진으로'});
    f.addEventListener('submit',function(e){var file=fi.files[0];if(!file||f.q.value.trim())return;e.preventDefault();var b=f.querySelector('button');b.disabled=true;b.textContent='사진 읽는 중…';
      var img=new Image();img.onload=function(){var s=Math.min(1,1024/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);
        c.toBlob(function(blob){var fd=new FormData();fd.append('q','');fd.append('keyword',f.keyword.value);fd.append('photo',blob,'photo.jpg');
          fetch(f.action,{method:'POST',body:fd}).then(function(r){location.href=r.url||'/0'}).catch(function(){location.reload()})},'image/jpeg',0.85)};
      img.src=URL.createObjectURL(file)})}
})();
(function(){
  var el=document.getElementById('psi');if(!el)return;
  var u=el.getAttribute('data-url'),key=el.getAttribute('data-key')||'',k='psi:'+u,ttl=36e5;
  function cls(v,g,a){return v<=g?'g':v<=a?'a':'p'}
  function cell(l,v,c,unit){return '<div><b class="'+c+'">'+v+(unit?'<small>'+unit+'</small>':'')+'</b><span>'+l+'</span></div>'}
  function draw(d){
    var a=d.lighthouseResult.audits,s=Math.round(d.lighthouseResult.categories.performance.score*100);
    var lcp=a['largest-contentful-paint'].numericValue/1000,cl=a['cumulative-layout-shift'].numericValue,tbt=a['total-blocking-time'].numericValue,fcp=a['first-contentful-paint'].numericValue/1000;
    var f=(d.loadingExperience||{}).metrics||{};
    var h='<div class="psi">'+cell('점수',s,cls(100-s,10,50))+cell('LCP',lcp.toFixed(1),cls(lcp,2.5,4),'s')+cell('CLS',cl.toFixed(2),cls(cl,0.1,0.25))+cell('TBT',Math.round(tbt),cls(tbt,200,600),'ms')+cell('FCP',fcp.toFixed(1),cls(fcp,1.8,3),'s')+'</div>';
    if(f.LARGEST_CONTENTFUL_PAINT_MS)h+='<p class="panel__note">실사용자(CrUX) 28일: LCP '+(f.LARGEST_CONTENTFUL_PAINT_MS.percentile/1000).toFixed(1)+'s · CLS '+(f.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile/100).toFixed(2)+(f.INTERACTION_TO_NEXT_PAINT?' · INP '+f.INTERACTION_TO_NEXT_PAINT.percentile+'ms':'')+' · 종합 '+((d.loadingExperience.overall_category||'')).toLowerCase()+'</p>';
    else h+='<p class="panel__note">실사용자(CrUX) 데이터는 방문이 더 쌓여야 나온다. 위는 모바일 실험실 측정이다.</p>';
    h+='<p class="panel__note">'+new Date(d.analysisUTCTimestamp).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',hour12:false})+' 측정 · <a href="https://pagespeed.web.dev/report?url='+encodeURIComponent(u)+'" target="_blank" rel="noopener">PageSpeed 에서 자세히</a></p>';
    el.innerHTML=h
  }
  try{var c=JSON.parse(localStorage.getItem(k)||'null');if(c&&Date.now()-c.at<ttl){draw(c.d);return}}catch(e){}
  var api='https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url='+encodeURIComponent(u)+'&strategy=mobile&category=performance'+(key?'&key='+encodeURIComponent(key):'');
  function go(retry){
    fetch(api).then(function(r){
      if(r.status===429&&retry){el.innerHTML='<p class="panel__note">API 한도에 걸려 30초 뒤 다시 잰다…</p>';return new Promise(function(res){setTimeout(function(){res(go(false))},3e4)})}
      if(!r.ok)throw new Error(r.status===429?'API 한도. 키 없이 쓰는 공용 한도라 PSI_KEY 변수를 넣으면 사라진다':'HTTP '+r.status);
      return r.json().then(function(d){try{localStorage.setItem(k,JSON.stringify({at:Date.now(),d:d}))}catch(e){}draw(d)})
    }).catch(function(e){el.innerHTML='<p class="panel__note">측정 실패: '+e.message+' · <a href="https://pagespeed.web.dev/report?url='+encodeURIComponent(u)+'" target="_blank" rel="noopener">PageSpeed 사이트에서 직접 보기</a></p>'})
  }
  go(true)
})();
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

export function statsPage({ canonical, summaries, visits = null, ga = null, gsc = null, runs = [], clicks = null, queue = [], msg = '', siteUrl = '', psiKey = '' }) {
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
  const gscOk = gsc && !gsc.error;
  const monthRuns = runs.filter((r) => Date.now() - new Date(r.at) < 30 * 864e5);
  const okRuns = monthRuns.filter((r) => r.ok);
  const avg = (list, f) => (list.length ? list.reduce((a, r) => a + f(r), 0) / list.length : 0);
  const genRate = monthRuns.length ? Math.round((okRuns.length / monthRuns.length) * 100) : null;
  const sec = (ms) => `${Math.round(ms / 1000)}초`;
  const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(1)}%` : '-');
  const titleOf = new Map(summaries.map((s) => [s.slug, s.title]));

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
      ${gscOk ? kpi('검색 클릭 (28일)', num(gsc.clicks), `노출 ${num(gsc.impressions)}`) : ''}
      ${gscOk ? kpi('검색 순위', gsc.position ? gsc.position.toFixed(1) : '-', `CTR ${(gsc.ctr * 100).toFixed(1)}%`) : ''}
      ${clicks ? kpi('쿠팡 클릭 (7일)', num(clicks.total), `클릭률 ${pct(clicks.total, clicks.totalViews)}`) : ''}
      ${genRate !== null ? kpi('발행 성공률 (30일)', `${genRate}%`, `${okRuns.length}/${monthRuns.length} · 평균 ${sec(avg(okRuns, (r) => r.ms))}`) : ''}
      ${kpi('발행한 글', num(summaries.length), `발행기 ${num(gen)}`)}
      ${kpi('다룬 제품', num(products), '개')}
      ${last ? kpi('마지막 발행', ago(last.createdAt), kst(last.createdAt)) : ''}
    </div>

    <div class="adm__grid">
      ${panel(
        '글 생성 요청',
        html`${msg ? html`<p class="panel__note genmsg">${msg}</p>` : ''}
          <form class="genform" method="post" action="/0/gen" enctype="multipart/form-data" id="genform">
            <input name="q" maxlength="80" placeholder="상품명 또는 쿠팡 검색어 (예: 앤커 나노 보조배터리 10000)" />
            <input name="keyword" maxlength="40" placeholder="분류 키워드 (선택 · 예: 보조배터리)" />
            <label class="genform__photo"><input type="file" name="photo" accept="image/*" /><span>사진으로</span></label>
            <button type="submit">생성 요청</button>
          </form>
          ${queue.length
            ? queue.map(
                (r) => html`<div class="row">
                  <span class="row__l">${r.status === '완료' && r.result ? html`<a href="/${r.result}">${r.q}</a>` : r.q}${r.status === '실패' ? html` <small>${r.result}</small>` : ''}</span>
                  <span class="tag ${r.status === '완료' ? 'tag--gen' : ''}">${r.status}</span>
                  <span class="row__n"><small>${ago(r.done_at || r.at)}</small></span>
                </div>`,
              )
            : html`<p class="panel__note">아직 요청이 없다.</p>`}`,
        { wide: true, sub: '최근 10건', note: '상품명을 쓰거나 사진을 고르면 된다. 사진은 Workers AI 가 제품명을 읽어 검색어로 쓴다. VM 발행기가 5분마다 가져가 글을 쓴다. 이미 다룬 제품이면 실패로 표시된다.' },
      )}
      ${visits
        ? panel('일별 방문', bars(visits.days.map((r) => [r.day, r.n, `재 ${num(r.r)}`]), { unit: '회' }), { sub: '14일 · 비콘', note: '자바스크립트를 실행한 브라우저만 세고 재방문은 1년 쿠키로 구분한다. 크롤러와 AI 봇은 빠진다.' })
        : panel('일별 방문', html`<p class="panel__note">D1 이 연결되지 않았다.</p>`)}
      ${gaOk ? panel('GA 일별 사용자', bars(ga.days.map((r) => [r.date, r.users, `조회 ${num(r.views)}`]), { alt: true, unit: '명' }), { sub: '14일' }) : ''}
      ${visits ? panel('인기 페이지', bars(visits.top.map((r) => [r.path, r.n, '', r.path]), { unit: '회' }), { sub: '7일 · 비콘' }) : ''}
      ${gaOk ? panel('GA 인기 페이지', bars(ga.pages.map((r) => [r.path, r.views, '', r.path]), { alt: true, unit: '회' }), { sub: '7일' }) : ''}
      ${clicks
        ? panel('글별 쿠팡 클릭률', bars(clicks.rows.slice(0, 15).map((r) => [titleOf.get(r.slug) ?? r.slug, r.clicks, `방문 ${num(r.views)} · ${pct(r.clicks, r.views)}`, `/${r.slug}`]), { unit: '클릭' }), { sub: '7일', note: '쿠팡 버튼을 눌러 /out 을 지난 수. 방문 대비 비율이 글의 힘이다. 크롤러는 뺀다.' })
        : ''}
      ${gaOk ? panel('GA 유입 경로', bars(ga.sources.map((r) => [r.source, r.sessions]), { alt: true, unit: ' 세션' }), { sub: '7일' }) : ''}
      ${ga?.error ? panel('구글 애널리틱스', html`<p class="panel__note">불러오기 실패: ${ga.error}</p>`) : ''}
      ${ga?.stale ? panel('구글 애널리틱스', html`<p class="panel__note">방금 갱신에 실패해 이전 값을 보여 준다: ${ga.stale}</p>`) : ''}
      ${gscOk ? panel('검색 유입', bars(gsc.days.map((r) => [r.date, r.clicks, `노출 ${num(r.impressions)}`]), { alt: true, unit: '클릭' }), { sub: '14일 · 서치콘솔', note: '구글 검색 결과에서 클릭한 수. 이틀쯤 늦게 집계된다.' }) : ''}
      ${gscOk ? panel('검색어', bars(gsc.queries.map((r) => [r.q, r.clicks, `${num(r.impressions)}회 노출 · ${r.position.toFixed(0)}위`]), { alt: true, unit: '클릭' }), { sub: '28일' }) : ''}
      ${gscOk ? panel('검색 유입 페이지', bars(gsc.pages.map((r) => [r.path, r.clicks, `노출 ${num(r.impressions)}`, r.path]), { alt: true, unit: '클릭' }), { sub: '28일' }) : ''}
      ${gsc?.error ? panel('서치콘솔', html`<p class="panel__note">불러오기 실패: ${gsc.error}<br />서치콘솔 → 설정 → 사용자 및 권한에 서비스 계정 이메일(GA_SA_EMAIL)을 추가해야 한다. 속성은 GSC_SITE 변수와 같아야 한다.</p>`) : ''}
      ${panel(
        '발행기 실행',
        html`${monthRuns.length ? html`<p class="panel__note">30일 ${monthRuns.length}회 실행 · 성공 ${okRuns.length}회 · 성공 평균 ${sec(avg(okRuns, (r) => r.ms))} · 평균 ${avg(okRuns, (r) => r.attempts || 1).toFixed(1)}번 만에 심사 통과</p>` : ''}${runs.length
          ? runs.slice(0, 12).map(
              (r) => html`<div class="row">
                <span class="row__l">${r.ok && r.slug ? html`<a href="/${r.slug}">${r.keyword}</a>` : r.keyword || '(키워드 선택 전)'}${r.ok ? '' : html` <small>${r.err ?? '실패'}</small>`}</span>
                <span class="row__b"><i class="${r.ok ? '' : 'is-2'}" style="--w:${Math.min(100, Math.round((r.ms / Math.max(1, ...runs.slice(0, 12).map((x) => x.ms))) * 100))}%"></i></span>
                <span class="row__n ${r.ok ? '' : 'is-bad'}">${sec(r.ms)}<small>${r.ok ? `${r.attempts || 1}회 시도 · ${ago(r.at)}` : `실패 · ${ago(r.at)}`}</small></span>
              </div>`,
            )
          : html`<p class="panel__note">아직 기록이 없다. 발행기가 다음 실행부터 남긴다.</p>`}`,
        { sub: '최근 12회', note: '' },
      )}
      ${panel('페이지 속도', html`<div id="psi" data-url="${siteUrl || canonical.replace(/\/0$/, '/')}" data-key="${psiKey}"><p class="panel__note">PageSpeed Insights 모바일 측정 중… 20초쯤 걸린다.</p></div>`, { sub: 'PageSpeed · 1시간 캐시' })}
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
  </div>
  <script>${PSI_SCRIPT}</script>`;
  return layout({ title: '발행 현황', description: '운영 통계', canonical, active: '', body });
}
