// 쿠팡으로 넘어가기 전에 보여 주는 안내 페이지 (소개만 하는 사이트라는 안내와 수수료 문구를 보여 주고 5초 뒤 이동한다)
const DISC = '이 포스팅은 쿠팡 파트너스 활동의 일환으로 이에 따른 일정액의 수수료를 제공받습니다.';
const SECONDS = 3;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function goPage(goUrl) {
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>USB.KR | 쿠팡으로 이동합니다</title>
<noscript><meta http-equiv="refresh" content="${SECONDS};url=${esc(goUrl)}"></noscript>
<style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f3f5f9;color:#14181f;font-family:Pretendard Variable,Pretendard,-apple-system,'Noto Sans KR',system-ui,sans-serif;padding:16px}
.card{width:min(460px,100%);background:#fff;border:1px solid #e3e8f0;border-radius:22px;padding:26px 22px;box-shadow:0 12px 30px -14px rgba(20,40,90,.25);text-align:center}
.lg{font-weight:900;font-size:1.4rem;letter-spacing:-.03em;color:#0b5fff}h1{font-size:1.12rem;margin:14px 0 6px}.sub{color:#6b7686;font-size:.86rem;line-height:1.6;margin:0 0 14px}
.note{background:#eef3ff;border:1.5px solid #0b5fff;border-radius:14px;padding:12px 14px;font-size:.84rem;line-height:1.6;text-align:left;margin:0 0 10px}.note b{color:#0b5fff}
.fee{color:#6b7686;font-size:.78rem;line-height:1.55;margin:0 0 16px}.bar{height:6px;border-radius:99px;background:#e3e8f0;overflow:hidden;margin:0 0 8px}.bar i{display:block;height:100%;width:0;background:#0b5fff;transition:width 1s linear}
.cd{font-size:.86rem;color:#6b7686;margin:0 0 14px}.cd b{color:#0b5fff;font-size:1rem}.btn{display:block;padding:14px;border-radius:14px;font-weight:900;text-decoration:none;font-size:1rem}.go{background:#0b5fff;color:#fff}.bk{margin-top:8px;color:#6b7686;font-size:.84rem;font-weight:700}</style></head><body><main class="card">
<div class="lg">USB.KR</div><h1>쿠팡으로 이동합니다</h1><p class="sub">상품 페이지로 연결해 드려요</p>
<div class="note"><b>안내</b> USB.KR은 상품을 소개만 하는 사이트예요. 상품 판매와 배송과 교환과 환불은 쿠팡에서 직접 처리하며 USB.KR은 판매 당사자가 아닙니다.</div>
<p class="fee">${esc(DISC)}</p><div class="bar"><i id="b"></i></div>
<p class="cd"><b id="n">${SECONDS}</b>초 뒤에 자동으로 이동합니다</p>
<a class="btn go" id="g" href="${esc(goUrl)}" rel="sponsored nofollow noopener">바로 쿠팡으로 가기 →</a>
<a class="btn bk" href="#" onclick="history.length>1?history.back():location.href='/';return false">돌아가기</a></main>
<script>(function(){var s=${SECONDS},n=document.getElementById('n'),b=document.getElementById('b'),g=document.getElementById('g').href,t=s,m=0;
requestAnimationFrame(function(){b.style.width='100%';b.style.transitionDuration=s+'s'});
var i=setInterval(function(){t--;n.textContent=Math.max(t,0);if(t<=0&&!m){m=1;clearInterval(i);location.replace(g)}},1000)})();</script></body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html;charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex,nofollow', 'referrer-policy': 'no-referrer' } });
}
