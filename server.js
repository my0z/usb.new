/** 로컬 웹 화면. 주소 붙여 넣기 → 제휴 링크와 설명 글을 바로 복사한다. */
import { createServer } from 'node:http';
import { loadEnv } from './src/env.js';
import { convert } from './src/convert.js';
import { disclosure } from './src/caption.js';

loadEnv();
const PORT = Number(process.env.PORT) || 3000;

const page = () => `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>제휴 링크 자동 변환</title>
<style>
:root{color-scheme:dark}
body{margin:0;background:#0f1117;color:#e8e8ec;font:15px/1.5 -apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif}
main{max-width:720px;margin:0 auto;padding:32px 16px 64px}
h1{font-size:28px;margin:0 0 4px}h1 b{color:#ff4d6d}
p.sub{color:#8b8f9e;margin:0 0 24px}
textarea{width:100%;box-sizing:border-box;min-height:120px;padding:14px;border-radius:12px;border:1px solid #2a2e3b;background:#171a23;color:inherit;font:inherit;resize:vertical}
.row{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 24px}
input{flex:1;min-width:160px;padding:10px 12px;border-radius:10px;border:1px solid #2a2e3b;background:#171a23;color:inherit;font:inherit}
button{padding:10px 18px;border-radius:10px;border:0;background:#ff4d6d;color:#fff;font:inherit;font-weight:700;cursor:pointer}
button.ghost{background:#2a2e3b}
button:disabled{opacity:.5;cursor:wait}
.card{background:#171a23;border:1px solid #2a2e3b;border-radius:14px;padding:16px;margin-bottom:14px}
.card h2{font-size:15px;margin:0 0 10px;color:#ffd166}
.link{display:flex;gap:8px;align-items:center;margin:6px 0}
.link code{flex:1;overflow-wrap:anywhere;background:#0f1117;padding:8px 10px;border-radius:8px}
.err{color:#ff8fa3}
pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#0f1117;padding:12px;border-radius:8px;margin:0 0 10px}
.ok{color:#7ee787}
</style></head><body><main>
<h1>제휴 링크 <b>자동 변환</b></h1>
<p class="sub">쿠팡 상품 주소만 붙여 넣으세요. 여러 개여도 되고 글 중간에 섞여 있어도 됩니다.</p>
<textarea id="in" placeholder="https://www.coupang.com/vp/products/..." autofocus></textarea>
<div class="row">
  <input id="intro" placeholder="첫 줄 (선택) 예: 오늘 소개한 제품">
  <input id="tags" placeholder="해시태그 (선택) 예: 쿠팡추천 가성비">
  <button id="go">변환</button>
</div>
<div id="out"></div>
</main>
<script>
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function copy(t,btn){try{await navigator.clipboard.writeText(t);const o=btn.textContent;btn.textContent='복사됨';setTimeout(()=>btn.textContent=o,1200)}catch{prompt('복사',t)}}
async function run(){
  const text=$('#in').value.trim();if(!text)return;
  const go=$('#go');go.disabled=true;$('#out').innerHTML='<div class="card">변환 중…</div>';
  try{
    const r=await fetch('/api/convert',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text,intro:$('#intro').value,tags:$('#tags').value})});
    const d=await r.json();if(!r.ok)throw new Error(d.error||r.status);
    let h='';
    if(d.caption){h+='<div class="card"><h2>쇼츠 설명 · 그대로 붙여 넣기</h2><pre id="cap">'+esc(d.caption)+'</pre><button data-copy="cap">설명 전체 복사</button></div>'}
    h+='<div class="card"><h2>링크</h2>';
    d.items.forEach((it,i)=>{
      if(it.link)h+='<div class="link"><code id="l'+i+'">'+esc(it.link)+'</code><button class="ghost" data-copy="l'+i+'">복사</button></div>';
      else h+='<div class="link err">건너뜀 · '+esc(it.skipped)+' · '+esc(it.input)+'</div>';
    });
    h+='</div>';
    $('#out').innerHTML=h;
    document.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>copy(document.getElementById(b.dataset.copy).textContent,b));
    const cap=document.getElementById('cap');if(cap)copy(cap.textContent,$('[data-copy=cap]'));
  }catch(e){$('#out').innerHTML='<div class="card err">실패: '+esc(e.message)+'</div>'}
  go.disabled=false;
}
$('#go').onclick=run;
$('#in').addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter')run()});
$('#in').addEventListener('paste',()=>setTimeout(run,50));
</script></body></html>`;

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => {
      chunks.push(c);
      if (Buffer.concat(chunks).length > 1e6) reject(new Error('본문이 너무 크다'));
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  const send = (code, body, type = 'application/json; charset=utf-8') => {
    res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
    res.end(body);
  };
  try {
    if (req.method === 'GET' && req.url === '/') return send(200, page(), 'text/html; charset=utf-8');
    if (req.method === 'GET' && req.url === '/healthz') return send(200, JSON.stringify({ ok: true, disclosure: disclosure() }));
    if (req.method === 'POST' && req.url === '/api/convert') {
      const { text = '', intro = '', tags = '' } = JSON.parse((await readBody(req)) || '{}');
      const hashtags = String(tags).split(/[\s,]+/).filter(Boolean);
      const result = await convert(String(text), { intro: String(intro), hashtags });
      return send(200, JSON.stringify(result));
    }
    send(404, JSON.stringify({ error: 'not found' }));
  } catch (e) {
    send(500, JSON.stringify({ error: e.message }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`제휴 링크 자동 변환 → http://127.0.0.1:${PORT}`);
  if (!process.env.COUPANG_ACCESS_KEY) console.warn('경고: .env 에 쿠팡 API 키가 없다. 변환이 실패한다.');
});
