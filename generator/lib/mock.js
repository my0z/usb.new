/** 네트워크 없이 파이프라인을 점검하기 위한 가짜 데이터. */
export const mockProducts = [
  { productId: 9001, name: '앤커 맥고 파워뱅크 10000 슬림 맥세이프', price: 59900, image: 'https://thumbnail.coupangcdn.com/thumbnails/remote/492x492ex/image/mock-1.jpg', productUrl: 'https://www.coupang.com/vp/products/9001', isRocket: true, isFreeShipping: false, category: '보조배터리', rank: 1 },
  { productId: 9002, name: '베이스어스 카드형 보조배터리 5000 초슬림', price: 32900, image: 'https://thumbnail.coupangcdn.com/thumbnails/remote/492x492ex/image/mock-2.jpg', productUrl: 'https://www.coupang.com/vp/products/9002', isRocket: false, isFreeShipping: true, category: '보조배터리', rank: 2 },
  { productId: 9003, name: '샤오미 맥세이프 보조배터리 5000 거치대형', price: 39900, image: 'https://thumbnail.coupangcdn.com/thumbnails/remote/492x492ex/image/mock-3.jpg', productUrl: 'https://www.coupang.com/vp/products/9003', isRocket: true, isFreeShipping: false, category: '보조배터리', rank: 3 },
];

export const mockArticleJson = JSON.stringify({
  title: '맥세이프 보조배터리 슬림형 신상 — 케이스 두께로 하루를 버틴다',
  tldr: '카드 두 장 두께에 10000mAh 를 넣었고 자석으로 붙여 쓰는 방식이라 케이블이 필요 없습니다.',
  intro_html: '<p>보조배터리는 늘 가방 바닥에서 굴러다니다가 정작 필요할 때 케이블이 없어 못 쓰는 물건이었습니다. 자석으로 폰 뒤에 붙이는 방식이 나오면서 이 문제가 상당 부분 해결되었습니다.</p><p>이번에 나온 슬림형은 두께를 케이스 수준으로 줄이면서도 하루치 용량을 유지한 것이 핵심입니다. 같은 용도의 제품 두 가지와 함께 살펴봅니다.</p>',
  sections: [
    { heading: '무엇이 새로운가', body_html: '<p>기존 맥세이프 배터리는 두껍고 무거워 폰과 함께 들면 손목이 피로했습니다. 슬림형은 셀 배치를 바꿔 두께를 크게 줄였습니다.</p><p>충전 중에도 폰을 평소처럼 쥘 수 있다는 점이 가장 큰 변화입니다.</p>' },
    { heading: '실제로 쓸 때 편한 점', body_html: '<p>출근길에 붙여 두면 회사에 도착할 때쯤 폰이 가득 찹니다. 자석이 충분히 강해서 주머니에 넣어도 떨어지지 않습니다.</p><p>USB-C 포트로 유선 충전도 되기 때문에 노트북 급속 충전용 케이블 하나면 함께 쓸 수 있습니다.</p>' },
    { heading: '비교 대상과 고를 때 기준', body_html: '<p>카드형은 더 얇지만 용량이 절반입니다. 거치대형은 세워서 영상 보기에 좋지만 두껍습니다. 하루 종일 밖에 있는 사람이라면 슬림형 10000 이 균형이 맞습니다.</p>' },
  ],
  outro_html: '<p>케이블 없이 붙여 쓰는 편의성과 하루치 용량을 동시에 원한다면 이 제품이 가장 무난한 선택입니다. 가볍게 들고 다닐 용도라면 카드형도 고려할 만합니다.</p>',
  faq: [
    { q: '아이폰 외에 갤럭시에서도 붙나요', a: '맥세이프 링이 있는 케이스를 쓰면 안드로이드에서도 자석으로 붙습니다. 무선충전은 Qi 방식으로 동작합니다.' },
    { q: '기내 반입이 되나요', a: '10000mAh 는 약 37Wh 로 기내 반입 기준인 100Wh 이하입니다.' },
    { q: '충전 속도는 어느 정도인가요', a: '무선은 표준 Qi 속도이고 유선 USB-C 는 그보다 빠릅니다. 급하면 유선을 권합니다.' },
  ],
});
