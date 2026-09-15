#!/usr/bin/env node
/**
 * 사용법
 *   node cli.js <상품주소> [상품주소...]
 *   echo "글 안에 https://www.coupang.com/vp/products/123 이 있다" | node cli.js
 *   node cli.js --json <상품주소>        결과를 JSON 으로
 *   node cli.js --intro "오늘의 추천" --tag 쿠팡 --tag 추천 <상품주소>
 */
import { loadEnv } from './src/env.js';
import { convert } from './src/convert.js';

loadEnv();

const args = process.argv.slice(2);
const opts = { hashtags: [] };
const inputs = [];
let json = false;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--json') json = true;
  else if (a === '--intro') opts.intro = args[++i] ?? '';
  else if (a === '--tag') opts.hashtags.push(args[++i] ?? '');
  else if (a === '--sub') opts.subId = args[++i] ?? '';
  else if (a === '-h' || a === '--help') {
    console.log('사용법: node cli.js [--json] [--intro 글] [--tag 태그]... [--sub 서브아이디] <상품주소>...\n주소를 인자로 안 주면 표준 입력을 읽는다.');
    process.exit(0);
  } else inputs.push(a);
}

let text = inputs.join('\n');
if (!text) {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  text = Buffer.concat(chunks).toString('utf8');
}
if (!text.trim()) {
  console.error('상품 주소를 인자나 표준 입력으로 준다');
  process.exit(2);
}

try {
  const result = await convert(text, opts);
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    for (const it of result.items) {
      if (it.link) console.log(`${it.link}  ←  ${it.clean ?? it.input}`);
      else console.error(`건너뜀 (${it.skipped}): ${it.input}`);
    }
    if (result.caption) console.log('\n----- 쇼츠 설명 (그대로 붙여 넣기) -----\n' + result.caption);
  }
  process.exit(result.items.some((it) => it.link) ? 0 : 1);
} catch (e) {
  console.error('실패: ' + e.message);
  process.exit(1);
}
