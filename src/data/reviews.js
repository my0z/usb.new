/**
 * 리뷰 콘텐츠 소스.
 * 실제 운영에서는 D1 이나 KV 로 옮기기 쉽도록 순수 데이터 배열로 유지한다.
 */

export const categories = [
  { slug: 'flash-drive', name: 'USB 메모리' },
  { slug: 'portable-ssd', name: '포터블 SSD' },
  { slug: 'hub-dock', name: '허브 · 독' },
  { slug: 'cable', name: '케이블' },
  { slug: 'charger', name: '충전기' },
  { slug: 'guide', name: '가이드' },
];

export const reviews = [
  {
    slug: 'samsung-fit-plus-400',
    title: '삼성 FIT Plus 400MB/s 실사용 30일',
    subtitle: '엄지손톱만 한 크기로 어디까지 버티는가',
    category: 'flash-drive',
    score: 8.7,
    verdict: '작고 빠르고 뜨겁다. 상시 장착 용도라면 여전히 1순위.',
    author: '편집부 김도현',
    date: '2026-09-08',
    readingTime: 7,
    cover: '/assets/cover-fit-plus.svg',
    featured: true,
    tags: ['USB 3.2 Gen1', '256GB', '방수'],
    specs: [
      ['인터페이스', 'USB 3.2 Gen 1 Type-A'],
      ['공식 읽기 속도', '400MB/s'],
      ['측정 쓰기 속도', '평균 62MB/s'],
      ['용량 구성', '64 / 128 / 256 / 512GB'],
      ['보증', '5년 제한 보증'],
    ],
    pros: ['체감되는 읽기 속도', '노트북에 꽂아 두어도 걸리지 않는 크기', '가격 대비 안정적인 컨트롤러'],
    cons: ['대용량 쓰기에서 속도 급락', '표면 온도가 상당히 높다'],
    body: [
      '작은 USB 메모리는 대체로 두 부류다. 크기를 위해 속도를 버리거나 속도를 위해 크기를 포기하거나. FIT Plus 는 그 사이에서 꽤 영리한 타협점을 잡았다.',
      '30일 동안 업무용 노트북에 상시 장착한 채로 문서와 사진을 옮겼다. 4KB 랜덤 읽기는 동급 제품 대비 눈에 띄게 앞섰고 폴더 단위 복사에서 체감 차이가 분명했다.',
      '문제는 지속 쓰기다. 10GB 를 넘기는 순간 SLC 캐시가 소진되며 속도가 30MB/s 대로 떨어진다. 영상 원본을 통째로 옮기는 작업이라면 포터블 SSD 를 권한다.',
      '발열은 감안해야 한다. 연속 작업 후 본체를 뽑을 때 손끝이 놀랄 정도로 뜨겁다. 다만 30일 동안 인식 불량이나 데이터 손상은 한 번도 없었다.',
    ],
  },
  {
    slug: 'sandisk-extreme-pro-v2-2tb',
    title: '샌디스크 익스트림 프로 V2 2TB 장기 테스트',
    subtitle: '가방 속에서 90일을 굴린 결과',
    category: 'portable-ssd',
    score: 9.2,
    verdict: '가격은 비싸지만 작업용 외장 저장소의 기준점.',
    author: '테크 에디터 이수민',
    date: '2026-09-05',
    readingTime: 9,
    cover: '/assets/cover-extreme-pro.svg',
    featured: false,
    tags: ['USB 3.2 Gen2x2', '2TB', 'IP55'],
    specs: [
      ['인터페이스', 'USB 3.2 Gen 2x2 Type-C'],
      ['공식 속도', '읽기 2000MB/s · 쓰기 2000MB/s'],
      ['측정 지속 쓰기', '평균 1450MB/s'],
      ['방진 방수', 'IP55'],
      ['보증', '5년 제한 보증'],
    ],
    pros: ['지속 쓰기에서도 무너지지 않는 속도', '견고한 실리콘 외피', '맥과 윈도우 모두에서 안정적'],
    cons: ['20Gbps 를 지원하는 호스트가 아직 적다', '동급 대비 높은 가격'],
    body: [
      '90일 동안 카메라 원본과 프로젝트 아카이브를 이 드라이브 하나로 처리했다. 누적 쓰기량은 약 11TB 였다.',
      '2x2 포트를 지원하는 노트북에서는 1.4GB/s 대의 지속 쓰기를 유지했다. 같은 드라이브를 10Gbps 포트에 물리면 절반으로 떨어지지만 그 상태로도 충분히 빠르다.',
      '외피는 실제로 튼튼하다. 촬영 현장에서 두 번 떨어뜨렸고 흙먼지를 뒤집어썼지만 물티슈로 닦아내는 것으로 끝났다.',
      '단점은 명확하다. 값이 비싸고 최대 성능을 뽑으려면 호스트를 가린다. 그럼에도 데이터를 잃지 않는 대가라면 납득할 만하다.',
    ],
  },
  {
    slug: 'ugreen-revodock-11in1',
    title: '유그린 레보독 11-in-1 도킹스테이션',
    subtitle: '책상 위 케이블을 하나로 줄일 수 있을까',
    category: 'hub-dock',
    score: 8.1,
    verdict: '듀얼 4K 60Hz 를 안정적으로 뽑는다. 발열 관리는 사용자 몫.',
    author: '리뷰어 박현우',
    date: '2026-09-02',
    readingTime: 8,
    cover: '/assets/cover-revodock.svg',
    featured: false,
    tags: ['PD 100W', '듀얼 4K', 'DP Alt'],
    specs: [
      ['업스트림', 'USB-C Thunderbolt 4 호환'],
      ['영상 출력', 'HDMI 2.0 x2 · DP 1.4 x1'],
      ['전력 공급', '패스스루 100W'],
      ['네트워크', '2.5GbE'],
      ['포트', 'USB-A 3.2 x3 · SD · microSD'],
    ],
    pros: ['듀얼 4K 60Hz 동시 출력', '2.5기가 유선 랜 내장', '금속 하우징의 마감'],
    cons: ['장시간 사용 시 뜨거워진다', '전원 어댑터가 크고 무겁다'],
    body: [
      '노트북 한 대로 모니터 두 대와 유선 랜과 충전을 동시에 처리하려면 결국 도킹스테이션이 답이다. 문제는 대부분의 제품이 스펙표만 화려하다는 점이다.',
      '레보독은 듀얼 4K 60Hz 를 8시간 연속으로 유지했다. 화면 깜빡임이나 재연결 없이 버텼고 2.5GbE 는 실측 2.3Gbps 를 냈다.',
      '다만 케이스 상단 온도가 48도까지 올라갔다. 통풍이 되는 자리에 두는 편이 좋다.',
      '100W 패스스루는 16인치 노트북을 작업 중에도 충전 상태로 유지했다. 케이블 하나로 책상이 정리되는 경험은 여전히 만족스럽다.',
    ],
  },
  {
    slug: 'usb4-cable-shootout-2026',
    title: 'USB4 케이블 12종 비교 테스트',
    subtitle: '같은 40Gbps 표기 그러나 결과는 달랐다',
    category: 'cable',
    score: 0,
    verdict: '표기만 믿지 말 것. 인증 로고와 실측이 함께 있어야 한다.',
    author: '랩 테스트팀',
    date: '2026-08-28',
    readingTime: 12,
    cover: '/assets/cover-usb4.svg',
    featured: false,
    tags: ['USB4', '40Gbps', '비교'],
    specs: [
      ['테스트 대상', '시중 유통 12종'],
      ['측정 장비', '프로토콜 분석기 · 열화상 카메라'],
      ['측정 항목', '대역폭 · 전력 · 발열 · E-마커'],
      ['테스트 길이', '0.8m 와 2.0m'],
      ['판정 기준', '표기 대비 실측 90% 이상'],
    ],
    pros: ['인증 제품군의 실측 편차가 작았다', '가격과 성능의 상관관계가 확인되었다'],
    cons: ['미인증 저가군 중 4종이 표기 대비 절반 이하'],
    body: [
      '40Gbps 라고 적힌 케이블 12종을 같은 조건에서 측정했다. 결과는 예상보다 나빴다.',
      '인증 로고가 붙은 5종은 모두 표기 대비 92% 이상을 냈다. 반면 미인증 저가군 7종 중 4종은 20Gbps 를 넘지 못했다.',
      '2m 길이에서는 격차가 더 벌어졌다. 짧은 길이에서 문제없던 제품도 길이가 늘어나면 링크 속도를 스스로 낮췄다.',
      '결론은 단순하다. USB4 나 Thunderbolt 인증 로고를 확인하고 길이는 필요한 만큼만 짧게 고르는 것이 가장 확실한 절약이다.',
    ],
  },
  {
    slug: 'anker-prime-160w-gan',
    title: '앤커 프라임 160W GaN 충전기',
    subtitle: '노트북과 폰과 태블릿을 한 벽돌로',
    category: 'charger',
    score: 8.9,
    verdict: '출력 분배가 똑똑하다. 여행 가방에 넣을 단 하나의 충전기.',
    author: '편집부 김도현',
    date: '2026-08-24',
    readingTime: 6,
    cover: '/assets/cover-prime160.svg',
    featured: false,
    tags: ['GaN', '160W', 'PD 3.1'],
    specs: [
      ['총 출력', '160W'],
      ['포트', 'USB-C x3 · USB-A x1'],
      ['단일 최대', '140W (PD 3.1)'],
      ['크기', '69 x 69 x 33mm'],
      ['부가 기능', '앱 연동 전력 모니터링'],
    ],
    pros: ['4포트 동시 사용에도 여유 있는 배분', '작고 단단한 크기', '실시간 전력 확인'],
    cons: ['가격이 높다', '동시 사용 시 팬 없는 구조라 온도가 오른다'],
    body: [
      '출장 가방에서 충전기 세 개를 빼는 것이 목표였다. 160W 라는 숫자는 그 목표에 충분했다.',
      '16인치 노트북과 스마트폰과 태블릿을 동시에 물렸을 때 노트북에 90W 가 유지되었다. 우선순위 배분이 깔끔하다.',
      '앱으로 포트별 실시간 전력을 확인할 수 있다는 점은 생각보다 유용했다. 케이블 불량을 잡아내는 데 바로 쓸 수 있다.',
      '무게는 340g 이다. 충전기 세 개를 대체한다고 보면 오히려 가볍다.',
    ],
  },
  {
    slug: 'how-to-choose-usb-2026',
    title: 'USB 규격 완전 정리 2026',
    subtitle: 'Gen1 Gen2 Gen2x2 USB4 무엇을 사야 하는가',
    category: 'guide',
    score: 0,
    verdict: '표기 이름이 아니라 숫자로 된 속도와 인증을 보라.',
    author: '테크 에디터 이수민',
    date: '2026-08-20',
    readingTime: 11,
    cover: '/assets/cover-guide.svg',
    featured: false,
    tags: ['가이드', '규격', '입문'],
    specs: [
      ['USB 3.2 Gen 1', '5Gbps'],
      ['USB 3.2 Gen 2', '10Gbps'],
      ['USB 3.2 Gen 2x2', '20Gbps'],
      ['USB4', '40Gbps'],
      ['USB4 Version 2.0', '80Gbps'],
    ],
    pros: ['용도별 선택 기준 제공', '실사용 기준 권장 조합 정리'],
    cons: ['제조사별 표기가 여전히 통일되지 않았다'],
    body: [
      'USB 규격 이름은 소비자를 돕기 위해 만들어지지 않았다. 같은 속도가 세 개의 이름으로 팔린다.',
      '기억할 것은 숫자다. 5 10 20 40 80 이라는 Gbps 값과 포트 옆에 적힌 인증 로고가 전부다.',
      '문서와 사진 위주라면 5Gbps 로 충분하다. 사진 원본을 자주 옮긴다면 10Gbps 부터 체감이 시작된다.',
      '영상 편집이나 외장 GPU 를 고려한다면 USB4 를 선택하되 호스트가 이를 지원하는지 먼저 확인해야 한다.',
    ],
  },
  {
    slug: 'kingston-datatraveler-max-1tb',
    title: '킹스톤 데이터트래블러 맥스 1TB',
    subtitle: '메모리인가 SSD 인가 그 경계에서',
    category: 'flash-drive',
    score: 8.4,
    verdict: '메모리 폼팩터로 1000MB/s. 다만 길고 두껍다.',
    author: '리뷰어 박현우',
    date: '2026-08-16',
    readingTime: 7,
    cover: '/assets/cover-dtmax.svg',
    featured: false,
    tags: ['USB 3.2 Gen2', '1TB', 'Type-C'],
    specs: [
      ['인터페이스', 'USB 3.2 Gen 2 Type-C'],
      ['공식 속도', '읽기 1000MB/s · 쓰기 900MB/s'],
      ['측정 지속 쓰기', '평균 480MB/s'],
      ['용량 구성', '256GB / 512GB / 1TB'],
      ['보증', '5년 제한 보증'],
    ],
    pros: ['USB 메모리 폼팩터에서 압도적인 속도', '슬라이드 커넥터 구조', '별도 케이블 불필요'],
    cons: ['길이가 길어 옆 포트를 가린다', '지속 쓰기에서 속도 하락 폭이 크다'],
    body: [
      '1TB 를 열쇠고리에 매달 수 있다는 발상은 여전히 매력적이다. 문제는 그 속도가 진짜냐는 것이다.',
      '초기 구간에서는 900MB/s 를 유지했다. 40GB 를 넘기면 480MB/s 수준으로 안정화되었고 그 아래로는 떨어지지 않았다.',
      '길이가 82mm 다. 노트북 측면 포트에 꽂으면 옆 포트를 실질적으로 못 쓴다. 허브와 함께 쓰는 편을 권한다.',
      '휴대성과 속도를 동시에 원한다면 이 제품은 여전히 몇 안 되는 답 중 하나다.',
    ],
  },
  {
    slug: 'orico-nvme-enclosure-usb4',
    title: '오리코 USB4 NVMe 외장케이스',
    subtitle: '직접 조립하는 3800MB/s',
    category: 'portable-ssd',
    score: 8.6,
    verdict: '완제품보다 빠르고 싸다. 대신 발열 관리를 직접 해야 한다.',
    author: '랩 테스트팀',
    date: '2026-08-12',
    readingTime: 8,
    cover: '/assets/cover-orico.svg',
    featured: false,
    tags: ['USB4', 'NVMe', 'DIY'],
    specs: [
      ['인터페이스', 'USB4 40Gbps'],
      ['지원 규격', 'M.2 NVMe 2230 ~ 2280'],
      ['측정 읽기', '3780MB/s'],
      ['측정 쓰기', '3320MB/s'],
      ['방열', '알루미늄 바디 + 서멀 패드'],
    ],
    pros: ['완제품 대비 압도적인 속도 대비 가격', '드라이브 교체 자유', '견고한 알루미늄 바디'],
    cons: ['고성능 SSD 조합 시 발열이 심하다', '호스트 호환성 편차'],
    body: [
      '고속 외장 저장소를 가장 싸게 만드는 방법은 여전히 직접 조립이다. USB4 케이스가 대중화되며 그 격차는 더 커졌다.',
      '테스트에는 소비전력이 낮은 DRAM 리스 모델과 고성능 DRAM 탑재 모델을 각각 넣었다. 후자는 3780MB/s 를 냈지만 표면 온도가 62도에 도달했다.',
      '전자는 속도가 2900MB/s 로 낮았지만 온도가 44도에 머물렀다. 가방에 넣고 다닐 용도라면 저전력 조합이 낫다.',
      '호스트 호환성은 확인이 필요하다. 일부 구형 USB4 컨트롤러에서는 링크가 20Gbps 로 내려갔다.',
    ],
  },
  {
    slug: 'usb-c-to-a-adapter-risk',
    title: 'USB-C 젠더 아무거나 쓰면 생기는 일',
    subtitle: '값싼 어댑터가 기기를 망가뜨리는 구조',
    category: 'guide',
    score: 0,
    verdict: '저항값이 잘못된 젠더는 지금도 팔린다. 확인하고 사자.',
    author: '랩 테스트팀',
    date: '2026-08-06',
    readingTime: 9,
    cover: '/assets/cover-adapter.svg',
    featured: false,
    tags: ['안전', '젠더', '가이드'],
    specs: [
      ['검사 대상', '유통 중인 젠더 18종'],
      ['핵심 항목', 'CC 핀 풀업 저항값'],
      ['규격 기준', '56kΩ'],
      ['부적합', '18종 중 5종'],
      ['최대 이상 전류', '규격 대비 2.6배'],
    ],
    pros: ['간단한 육안 확인법 제공', '안전한 제품군 목록 정리'],
    cons: ['저항값은 겉에서 보이지 않아 구매 전 확인이 어렵다'],
    body: [
      'USB-C 규격은 CC 핀의 풀업 저항으로 공급 가능한 전류를 알린다. 이 값이 틀리면 기기가 받을 수 있는 것보다 많은 전류를 요구한다.',
      '유통 중인 18종을 검사한 결과 5종에서 규격에 맞지 않는 저항값이 확인되었다. 그중 2종은 실제로 과전류를 유발했다.',
      '문제는 겉에서 구분할 방법이 사실상 없다는 점이다. 인증 표기와 제조사 신뢰도가 유일한 단서다.',
      '이미 가진 젠더가 걱정된다면 USB 전력 측정기를 물려 보는 것이 가장 빠른 확인법이다.',
    ],
  },
];

const bySlug = new Map(reviews.map((r) => [r.slug, r]));
const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

export function getReview(slug) {
  return bySlug.get(slug) ?? null;
}

export function categoryName(slug) {
  return categoryBySlug.get(slug)?.name ?? slug;
}

export function sortedReviews() {
  return [...reviews].sort((a, b) => b.date.localeCompare(a.date));
}

export function featuredReview() {
  return reviews.find((r) => r.featured) ?? sortedReviews()[0];
}

export function reviewsByCategory(slug) {
  return sortedReviews().filter((r) => r.category === slug);
}

export function relatedReviews(review, limit = 3) {
  const same = sortedReviews().filter((r) => r.category === review.category && r.slug !== review.slug);
  const rest = sortedReviews().filter((r) => r.category !== review.category && r.slug !== review.slug);
  return [...same, ...rest].slice(0, limit);
}

export function searchReviews(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return sortedReviews().filter((r) =>
    [r.title, r.subtitle, r.verdict, ...r.tags, categoryName(r.category)]
      .join(' ')
      .toLowerCase()
      .includes(q),
  );
}
