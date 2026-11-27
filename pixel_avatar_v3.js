// ============================================================================
// [음악왕 V3.0] 캐릭터 이펙트 18종 + 신규 아바타 파츠 ~70종 + 오프스크린 캐시 애니메이션
// - 기존 pixel_avatar.js와 100% 동일한 480×480 좌표계 · #1e1b18 굵은 잉크 외곽선 톤앤매너
// - 모든 이펙트/파츠 명칭은 상점 3열 타일 말줄임(...) 방지를 위해 간결한 3~7자 기준 적용
// ============================================================================

const V3_EFFECT_ITEMS = [
  { id: "none", name: "이펙트 없음", price: 0, grade: "C", purchasable: false, layer: "none", color: "#94a3b8", desc: "아무 이펙트도 장착하지 않은\n깔끔한 기본 상태" },
  { id: "fx_aura_purple", name: "퍼플 오오라", price: 50, grade: "C", purchasable: true, layer: "back", color: "#a855f7", desc: "캐릭터 발밑에서 몽환적인\n보라빛 파동이 퍼지는 오오라 (황금주화)" },
  { id: "fx_aura_black", name: "블랙 오오라", price: 50, grade: "C", purchasable: true, layer: "back", color: "#1e293b", desc: "캐릭터 발밑에서 다크 포스가\n피어오르는 블랙 섀도우 오오라 (황금주화)" },
  { id: "fx_aura_gold", name: "골드 오오라", price: 50, grade: "C", purchasable: true, layer: "back", color: "#facc15", desc: "캐릭터 발밑에 눈부신 황금빛\n후광 링이 빛나는 오오라 (황금주화)" },
  { id: "fx_aura_red", name: "레드 오오라", price: 120, grade: "B", purchasable: true, layer: "back", color: "#ef4444", desc: "강렬한 크림슨 열기가 발밑에서\n타오르는 레드 오오라 (황금주화)" },
  { id: "fx_aura_blue", name: "블루 오오라", price: 120, grade: "B", purchasable: true, layer: "back", color: "#38bdf8", desc: "청량한 아쿠아 물결 파동이\n은은하게 퍼지는 블루 오오라 (황금주화)" },
  { id: "fx_aura_green", name: "그린 오오라", price: 120, grade: "B", purchasable: true, layer: "back", color: "#22c55e", desc: "싱그러운 에메랄드 기운이\n피어오르는 그린 오오라 (황금주화)" },
  { id: "fx_snow", name: "눈 내림", price: 120, grade: "B", purchasable: true, layer: "front", color: "#bae6fd", desc: "포근한 하얀 눈송이가 주변에\n사뿐사뿐 흩날려 내립니다 (황금주화)" },
  { id: "fx_rain", name: "비 내림", price: 120, grade: "B", purchasable: true, layer: "front", color: "#60a5fa", desc: "시원한 빗줄기가 사선으로 내리며\n바닥에 톡톡 튑니다 (황금주화)" },
  { id: "fx_flies", name: "파리 붕붕", price: 120, grade: "B", purchasable: true, layer: "front", color: "#64748b", desc: "머리 주변을 작은 파리들이\n붕붕 맴도는 코믹 이펙트! (황금주화)" },
  { id: "fx_whirlwind", name: "회오리", price: 250, grade: "A", purchasable: true, layer: "both", color: "#38bdf8", desc: "시원한 회오리 바람줄기가\n온몸을 감싸고 휘몰아칩니다 (황금주화)" },
  { id: "fx_maple", name: "단풍잎", price: 250, grade: "A", purchasable: true, layer: "front", color: "#ea580c", desc: "붉고 주황빛 가을 단풍잎이\n빙그르르 떨어집니다 (황금주화)" },
  { id: "fx_confetti", name: "축하 폭죽", price: 250, grade: "A", purchasable: true, layer: "front", color: "#f43f5e", desc: "알록달록 축하 꽃가루가\n팡팡 흩날리는 파티 이펙트 (황금주화)" },
  { id: "fx_stars", name: "별똥별", price: 250, grade: "A", purchasable: true, layer: "front", color: "#fde047", desc: "황금빛 유성과 작은 별들이\n반짝반짝 쏟아집니다 (황금주화)" },
  { id: "fx_feathers", name: "흰 깃털", price: 250, grade: "A", purchasable: true, layer: "front", color: "#f8fafc", desc: "순백의 부드러운 천사 깃털이\n우아하게 흩날립니다 (황금주화)" },
  { id: "fx_ghost", name: "꼬마 유령", price: 250, grade: "A", purchasable: true, layer: "front", color: "#cbd5e1", desc: "귀여운 하얀 꼬마 유령이\n캐릭터 주위를 둥실둥실 떠다닙니다 (황금주화)" },
  { id: "fx_notes", name: "음표 파동", price: 500, grade: "S", purchasable: true, layer: "front", color: "#ec4899", desc: "화려한 ♪ ♫ 음표가 피어올라\n서서히 디졸브되며 사라집니다 (황금주화)" },
  { id: "fx_awakening", name: "초각성 오오라", price: 500, grade: "S", purchasable: true, layer: "both", color: "#f59e0b", desc: "전설의 황금 불꽃 기운이\n온몸에서 폭발하는 최고급 오오라 (황금주화)" },
  { id: "fx_electric", name: "전기 스파크", price: 500, grade: "S", purchasable: true, layer: "front", color: "#38bdf8", desc: "파지직거리는 하이볼트 번개 스파크가\n주변에 튀어 오릅니다 (황금주화)" }
];

const V3_NEW_SHOP_PARTS = {
  face: [
    { id: "sunglass_tint", name: "틴트 선글", price: 1400, grade: "B", color: "#fb7185", desc: "상큼한 로즈·옐로우 컬러 렌즈의\n감성 스트릿 틴트 선글라스" },
    { id: "anime_eyes", name: "만화 눈빛", price: 2100, grade: "B", color: "#3b82f6", desc: "별빛 하이라이트가 초롱초롱 빛나는\n멋진 만화 주인공 스타일 눈" },
    { id: "sunglass_aviator", name: "보잉 선글", price: 3200, grade: "A", color: "#94a3b8", desc: "슬림한 실버 메탈 프레임과 그라데이션\n렌즈의 클래식 보잉 선글라스" },
    { id: "sunglass_sport", name: "스포츠 고글", price: 3600, grade: "A", color: "#06b6d4", desc: "날렵하게 휘어진 미래지향 네온 미러\n랩어라운드 스포츠 선글라스" },
    { id: "piercing_face", name: "피어싱 얼굴", price: 3800, grade: "A", color: "#facc15", desc: "시크한 표정에 양쪽 귀걸이·피어싱이\n반짝반짝 빛나는 힙스터 얼굴" },
    { id: "woongi_beard", name: "웅이 수염", price: 4600, grade: "A", color: "#27272a", desc: "푸근하고 코믹한 구레나룻 & 두툼한\n팔자 콧수염 시그니처 페이스!" },
    { id: "awakened_eyes", name: "열혈 눈빛", price: 7800, grade: "S", color: "#14b8a6", desc: "각성한 전사처럼 청록·황금빛 눈동자가\n강렬하게 불타오르는 초각성 눈빛" }
  ],
  hair: [
    { id: "mohawk_sharp", name: "모히칸 헤어", price: 3900, grade: "A", color: "#1e293b", style: "v3_mohawk", desc: "정수리를 따라 날렵하게 세운\n강렬한 블랙 샤프 모히칸 헤어" },
    { id: "basketball_red", name: "농구머리", price: 4500, grade: "A", color: "#dc2626", style: "v3_basketball", desc: "불타는 투지! 새빨갛게 깎은\n천재 농구선수의 레드 반삭 헤어" },
    { id: "awakened_gold", name: "초각성 금발", price: 8200, grade: "S", color: "#fde047", style: "v3_awakened", desc: "기운이 폭발하며 하늘 위로 뾰족하게\n치솟은 황금빛 초각성 헤어!" }
  ],
  hat: [
    { id: "beanie_knit", name: "니트 비니", price: 1500, grade: "B", color: "#475569", desc: "골지 짜임이 살아있는 따뜻하고\n스타일리시한 데일리 니트 비니" },
    { id: "beanie_pom", name: "방울 비니", price: 1900, grade: "B", color: "#e11d48", desc: "꼭대기 보송보송 흰 털방울이 달린\n귀여운 겨울 포인트 비니" },
    { id: "ball_cap", name: "스트릿 볼캡", price: 2200, grade: "B", color: "#2563eb", desc: "깔끔하게 꺾인 챙과 전면 배지 자수가\n어우러진 클래식 스트릿 볼캡" },
    { id: "snapback_hip", name: "스냅백", price: 3300, grade: "A", color: "#1e1b4b", desc: "반듯한 평챙과 골드 스티커 포인트가\n돋보이는 힙합 스냅백 모자" },
    { id: "mask_horse", name: "말 탈", price: 4200, grade: "A", coversFace: true, color: "#92400e", desc: "갈기와 커다란 코가 매력적인 풀페이스\n말 탈 (착용 시 표정·머리를 가립니다)" },
    { id: "mask_pig", name: "돼지 탈", price: 4200, grade: "A", coversFace: true, color: "#f9a8d4", desc: "핑크 콧구멍과 접힌 귀가 귀여운 풀페이스\n돼지 탈 (착용 시 표정·머리를 가립니다)" },
    { id: "mask_cat", name: "고양이 탈", price: 4400, grade: "A", coversFace: true, color: "#fde68a", desc: "치즈 냥이 무늬와 수염이 깜찍한 풀페이스\n고양이 탈 (착용 시 표정·머리를 가립니다)" },
    { id: "mask_dog", name: "강아지 탈", price: 4400, grade: "A", coversFace: true, color: "#d97706", desc: "축 처진 귀와 혀 내민 미소가 심쿵한\n강아지 탈 (착용 시 표정·머리를 가립니다)" },
    { id: "mask_rabbit", name: "토끼 탈", price: 4600, grade: "A", coversFace: true, color: "#f8fafc", desc: "길쭉한 두 귀와 빨간 눈이 돋보이는 순백\n토끼 탈 (착용 시 표정·머리를 가립니다)" },
    { id: "pierrot_hat", name: "삐에로 모자", price: 6500, grade: "S", color: "#f43f5e", desc: "양갈래 끝마다 방울이 흔들리는\n화려한 서커스 삐에로 모자" },
    { id: "cupid_wings", name: "큐피드 날개", price: 7200, grade: "S", color: "#ffffff", desc: "머리 양옆에 앙증맞은 순백 천사 날개가\n달린 신비로운 큐피드 머리 장식" },
    { id: "moto_helmet", name: "바이크 헬멧", price: 7900, grade: "S", coversFace: true, color: "#dc2626", desc: "스모크 풀바이저가 장착된 레이싱\n오토바이 헬멧 (표정·머리를 가립니다)" }
  ],
  outfit: [
    { id: "white_jeans", name: "청바지 흰티", price: 700, grade: "C", main: "#ffffff", sub: "#2563eb", desc: "깔끔한 흰 티셔츠에 진청 데님 바지!\n언제 입어도 실패 없는 국민 데일리룩" },
    { id: "white_cargo", name: "카고 흰티", price: 1600, grade: "B", main: "#ffffff", sub: "#4d7c0f", desc: "오버핏 흰 티셔츠와 빅포켓 카키\n카고팬츠의 트렌디한 스트릿 룩" },
    { id: "swimwear_v3", name: "수영복", price: 3500, grade: "A", main: "#0ea5e9", sub: "#fde047", desc: "시원한 바캉스 룩! 성별에 맞춰\n서핑 반바지/바캉스 수영복으로 변신합니다" },
    { id: "suit_horse", name: "말 옷", price: 4200, grade: "A", main: "#92400e", sub: "#fde68a", desc: "말갈기와 발굽 디테일까지 살린\n풀세트 브라운 말 동물 코스튬" },
    { id: "suit_pig", name: "돼지 옷", price: 4200, grade: "A", main: "#f9a8d4", sub: "#fbcfe8", desc: "동글동글 분홍 배와 말린 꼬리가\n매력적인 아기 돼지 코스튬" },
    { id: "suit_cat", name: "고양이 옷", price: 4400, grade: "A", main: "#fbbf24", sub: "#fef3c7", desc: "치즈 태비 무늬와 말랑한 고양이 발!\n고양이 탈과 세트 착용 추천" },
    { id: "suit_dog", name: "강아지 옷", price: 4400, grade: "A", main: "#d97706", sub: "#fffbeb", desc: "복슬복슬 강아지 털과 목줄 포인트가\n사랑스러운 댕댕이 풀세트 옷" },
    { id: "suit_rabbit", name: "토끼 옷", price: 4600, grade: "A", main: "#ffffff", sub: "#fda4af", desc: "분홍 안감과 하얀 솜방울 꼬리가\n달린 폭신한 순백 토끼 코스튬" },
    { id: "pierrot_suit", name: "삐에로 옷", price: 4900, grade: "A", main: "#ef4444", sub: "#facc15", desc: "알록달록 주름 프릴 카라와 큰 방울\n단추가 달린 유쾌한 서커스 삐에로 복장" },
    { id: "ski_suit", name: "스키복", price: 5300, grade: "A", main: "#0284c7", sub: "#f8fafc", desc: "네온 라인이 들어간 도톰한 방한\n패딩 점퍼 & 스노우 팬츠 스키복" },
    { id: "santa_suit", name: "산타복", price: 6900, grade: "S", main: "#dc2626", sub: "#ffffff", desc: "순백 털 트리밍과 황금 버클 벨트가\n화려한 홀리데이 산타클로스 의상" },
    { id: "bunny_suit", name: "바니옷", price: 7500, grade: "S", main: "#1e1b4b", sub: "#f472b6", desc: "리본 넥타이와 커프스, 바니 테일이\n돋보이는 세련된 스페셜 바니 코스튬" },
    { id: "red_passion", name: "레드 수트", price: 8100, grade: "S", main: "#dc2626", sub: "#fef08a", desc: "시선을 사로잡는 올레드 테일러드\n무대 정장 + 골드 체인 포인트!" },
    { id: "warrior_gi", name: "열혈 도복", price: 9400, grade: "S", main: "#f97316", sub: "#1d4ed8", desc: "수련으로 단련된 무사의 오렌지·블루\n전투 도복! 초각성 헤어·눈빛과 찰떡궁합" }
  ],
  bg: [
    { id: "bg_meadow_v3", name: "들꽃 초원", price: 800, grade: "C", colors: ["#38bdf8", "#fef9c3", "#84cc16", "#3f6212"], desc: "파스텔 들꽃과 피크닉 돗자리, 나비가\n날아다니는 한가로운 언덕 초원" },
    { id: "bg_underwater", name: "깊은 물속", price: 1800, grade: "B", colors: ["#0369a1", "#0284c7", "#0c4a6e", "#082f49"], desc: "산호초와 공기방울, 헤엄치는 물고기,\n바다 빛줄기가 내리는 아쿠아 심해" },
    { id: "bg_desert", name: "황금 사막", price: 2200, grade: "B", colors: ["#f97316", "#fde047", "#f59e0b", "#b45309"], desc: "붉은 사막 노을과 피라미드 실루엣,\n초록 선인장이 서 있는 이국적 사막" },
    { id: "bg_myroom", name: "포근한 방", price: 2600, grade: "B", colors: ["#fef3c7", "#fde68a", "#d97706", "#92400e"], desc: "창문 햇살과 포근한 침대, 벽 포스터,\n스피커가 놓인 나만의 아늑한 방" },
    { id: "bg_fishing", name: "호수 낚시터", price: 3600, grade: "A", colors: ["#0284c7", "#bae6fd", "#15803d", "#166534"], desc: "나무 부두와 랜턴 불빛, 잔잔한 물결이\n빛나는 고요한 호숫가 낚시터 풍경" },
    { id: "bg_deep_forest", name: "신비한 숲", price: 4100, grade: "A", colors: ["#064e3b", "#047857", "#14532d", "#052e16"], desc: "거목 사이로 황금 반딧불이와 신비로운\n빛이 새어 들어오는 깊은 밤의 숲" },
    { id: "bg_club", name: "네온 클럽", price: 4800, grade: "A", colors: ["#312e81", "#701a75", "#1e1b4b", "#090d16"], desc: "반짝이는 미러볼과 리드미컬 네온\n레이저 플로어가 깔린 댄스 클럽" },
    { id: "bg_mansion", name: "대저택 정원", price: 6600, grade: "S", colors: ["#38bdf8", "#e0f2fe", "#4ade80", "#15803d"], desc: "웅장한 대리석 저택과 2단 분수대,\n레드 튤립 정원이 펼쳐진 VIP 저택" },
    { id: "bg_volcano", name: "화산 지대", price: 7600, grade: "S", colors: ["#7f1d1d", "#ea580c", "#450a0a", "#1c1917"], desc: "불타오르는 용암 폭포와 시뻘건 마그마가\n들끓는 박진감 넘치는 화산 스테이지" },
    { id: "bg_deep_space", name: "깊은 우주", price: 8400, grade: "S", colors: ["#020617", "#1e1b4b", "#0f172a", "#020617"], desc: "거대한 성운과 행성 무리, 블랙홀이\n소용돌이치는 경이로운 깊은 우주" },
    { id: "bg_cyber_street", name: "네온 거리", price: 9500, grade: "S", colors: ["#090d16", "#3b0764", "#1e293b", "#0f172a"], desc: "네온 간판이 빗물에 반사되는 화려한\n미래 도시 사이버펑크 스트리트" }
  ],
  acc: [
    { id: "prop_mop", name: "대걸레", price: 600, grade: "C", color: "#cbd5e1", desc: "청소 요정 필수품!\n나무 손잡이 푹신 면 대걸레" },
    { id: "prop_broom", name: "빗자루", price: 800, grade: "C", color: "#d97706", desc: "마녀도 탐낼 만한 클래식 원목\n갈대 빗자루 소품" },
    { id: "prop_mackerel", name: "고등어", price: 1600, grade: "B", color: "#38bdf8", desc: "방금 낚시터에서 건져 올린 듯\n파닥파닥 빛나는 생물 고등어 한 마리!" },
    { id: "prop_carrot", name: "당근", price: 1900, grade: "B", color: "#f97316", desc: "초록 잎사귀가 싱싱한 아삭아삭\n오렌지빛 초대형 왕당근!" },
    { id: "prop_rice", name: "고봉밥", price: 3400, grade: "A", color: "#ffffff", desc: "김이 모락모락 피어오르는 푸짐한\n수북 고봉밥 한 공기! 한국인의 밥심" },
    { id: "prop_chicken", name: "치킨", price: 3900, grade: "A", color: "#d97706", desc: "겉바속촉 노릇노릇하게 튀겨진\n황금빛 대왕 통닭다리!" },
    { id: "prop_sword", name: "용사의 검", price: 4700, grade: "A", color: "#94a3b8", desc: "황금 손잡이와 푸른 보석이 박힌\n빛나는 판타지 용사의 브로드 소드" },
    { id: "prop_shield", name: "기사 방패", price: 5200, grade: "A", color: "#2563eb", desc: "황금 문양과 견고한 스틸 테두리로\n무장한 로얄 나이트 실드" },
    { id: "prop_wand", name: "마법 지팡이", price: 6800, grade: "S", color: "#ec4899", desc: "커다란 루비 별빛 보석이 빛나는\n신비로운 판타지 매직 스태프" },
    { id: "prop_flame", name: "손 위 불꽃", price: 8200, grade: "S", color: "#f97316", desc: "손끝에서 푸르고 붉은 화염 구슬이\n활활 타오르는 능력자 소품!" }
  ],
  wing: [
    { id: "wing_angel", name: "천사 날개", price: 16000, grade: "A", color: "#ffffff", desc: "포근하고 단정한 순백의 깃털이\n좌우로 펼쳐진 아기 천사 날개" },
    { id: "wing_devil", name: "악마 날개", price: 16000, grade: "A", color: "#4c1d95", desc: "카리스마 넘치는 다크 퍼플·블랙\n박쥐 스타일 데빌 윙" },
    { id: "wing_pet_rabbit", name: "토끼 친구들", price: 20000, grade: "A", color: "#fda4af", desc: "양옆에 깜찍한 꼬마 흰토끼 친구\n2마리가 나란히 서서 응원합니다!" },
    { id: "wing_pet_dog", name: "강아지 친구", price: 20000, grade: "A", color: "#d97706", desc: "양옆에 귀엽고 늠름한 댕댕이 친구\n2마리가 함께 따라다닙니다!" },
    { id: "wing_pet_cat", name: "고양이 친구", price: 20000, grade: "A", color: "#fbbf24", desc: "양옆에 치즈냥이 · 턱시도냥이 친구\n2마리가 나란히 따라다닙니다!" },
    { id: "wing_pet_horse", name: "말 친구들", price: 22000, grade: "S", color: "#92400e", desc: "양옆에 귀여운 꼬마 조랑말 친구\n2마리가 힘차게 함께 달립니다!" },
    { id: "wing_pet_pig", name: "돼지 친구들", price: 22000, grade: "S", color: "#f9a8d4", desc: "양옆에 복을 부르는 핑크 아기돼지\n친구 2마리가 함께 서 있습니다!" },
    { id: "wing_dragon", name: "드래곤 날개", price: 24000, grade: "S", color: "#dc2626", desc: "강렬한 적흑 비늘과 날카로운 가시가\n돋보이는 제왕 드래곤 윙" },
    { id: "wing_bone", name: "뼈다귀 날개", price: 28000, grade: "S", color: "#e2e8f0", desc: "본드래곤의 거친 골격 뼈마디가\n그대로 드러난 다크 스켈레톤 윙" },
    { id: "wing_mecha", name: "기계팔", price: 32000, grade: "S", color: "#38bdf8", desc: "등 뒤에서 네온 레이저 코어가 빛나는\n4관절 사이버 메카닉 암!" },
    { id: "wing_archangel", name: "대천사 날개", price: 45000, grade: "S", color: "#fef08a", desc: "화려한 황금빛과 6장의 거대한 순백\n날개가 압도적인 대천사의 날개" },
    { id: "wing_hades", name: "하데스 날개", price: 50000, grade: "S", color: "#a855f7", desc: "저승의 보랏빛 화염과 칠흑 깃털이\n위엄을 뽐내는 초대형 하데스 날개" }
  ]
};

function getEffectItemById(id) {
  const cleanId = id && id !== "" ? id : "none";
  return V3_EFFECT_ITEMS.find(e => e.id === cleanId) || V3_EFFECT_ITEMS[0];
}

// ============================================================================
// 1. V3.0 배경 렌더러 (11종 고디테일 풀 일러스트)
// ============================================================================
function drawV3Background(ctx, W, H, bgItem, opts = {}) {
  const id = bgItem && bgItem.id;
  const c = (bgItem && bgItem.colors) || ["#5ec8f8", "#aee4ff", "#76d32d", "#4d9e12"];
  const isThumb = !!opts.isThumb;
  const horizonY = H * (isThumb ? 0.60 : 0.58);

  if (!id || !id.startsWith("bg_")) return false;

  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY + 10);
  skyGrad.addColorStop(0, c[0]);
  skyGrad.addColorStop(1, c[1]);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  if (id === "bg_underwater") {
    // 물속: 햇살 빔 + 버블 + 해초 + 모래바닥 + 물고기
    const seaGrad = ctx.createLinearGradient(0, 0, 0, H);
    seaGrad.addColorStop(0, "#0ea5e9");
    seaGrad.addColorStop(0.55, "#0369a1");
    seaGrad.addColorStop(1, "#082f49");
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(186, 230, 253, 0.16)";
    [0.2, 0.52, 0.78].forEach(lx => {
      ctx.beginPath();
      ctx.moveTo(W * lx, 0); ctx.lineTo(W * (lx - 0.12), H * 0.8); ctx.lineTo(W * (lx + 0.08), H * 0.8);
      ctx.closePath(); ctx.fill();
    });
    // 모래바닥 & 산호·해초
    ctx.fillStyle = "#fde68a";
    ctx.fillRect(0, H * 0.76, W, H * 0.24);
    ctx.fillStyle = "#d97706";
    ctx.fillRect(0, H * 0.84, W, H * 0.16);
    [[0.12, "#16a34a"], [0.2, "#22c55e"], [0.82, "#f43f5e"], [0.9, "#fb7185"]].forEach(([px, pcol]) => {
      ctx.strokeStyle = pcol; ctx.lineWidth = Math.max(4, W * 0.018); ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(W * px, H * 0.8);
      ctx.quadraticCurveTo(W * (px - 0.04), H * 0.62, W * (px + 0.02), H * 0.48);
      ctx.stroke();
    });
    // 버블 & 미니 물고기
    ctx.strokeStyle = "rgba(255,255,255,0.65)"; ctx.lineWidth = 2;
    [[0.18, 0.3], [0.24, 0.2], [0.76, 0.26], [0.84, 0.38], [0.65, 0.16]].forEach(([bx, by], i) => {
      ctx.beginPath(); ctx.arc(W * bx, H * by, W * (0.012 + (i % 2) * 0.008), 0, Math.PI * 2); ctx.stroke();
    });
    ctx.fillStyle = "#facc15";
    ctx.beginPath(); ctx.ellipse(W * 0.22, H * 0.4, W * 0.032, W * 0.018, 0, 0, Math.PI * 2); ctx.fill();
    return true;
  }

  if (id === "bg_desert") {
    // 황금 사막: 큰 태양 + 피라미드 + 사막 모래언덕 + 선인장
    ctx.fillStyle = "#fef08a";
    ctx.beginPath(); ctx.arc(W * 0.78, H * 0.22, W * 0.075, 0, Math.PI * 2); ctx.fill();
    // 피라미드
    ctx.fillStyle = "#d97706"; ctx.strokeStyle = "#1e1b18"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(W * 0.12, horizonY); ctx.lineTo(W * 0.28, H * 0.26); ctx.lineTo(W * 0.44, horizonY); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#b45309";
    ctx.beginPath(); ctx.moveTo(W * 0.28, H * 0.26); ctx.lineTo(W * 0.44, horizonY); ctx.lineTo(W * 0.31, horizonY); ctx.closePath(); ctx.fill();
    // 모래언덕
    const sandG = ctx.createLinearGradient(0, horizonY, 0, H);
    sandG.addColorStop(0, "#fbbf24"); sandG.addColorStop(1, "#b45309");
    ctx.fillStyle = sandG; ctx.fillRect(0, horizonY, W, H - horizonY);
    // 선인장
    const drawCactus = (cx, cy, s) => {
      fillRoundRect(ctx, cx - 6 * s, cy - 38 * s, 12 * s, 44 * s, 6 * s, "#16a34a", "#1e1b18", 2.5);
      fillRoundRect(ctx, cx - 18 * s, cy - 26 * s, 14 * s, 8 * s, 4 * s, "#16a34a", "#1e1b18", 2);
      fillRoundRect(ctx, cx + 4 * s, cy - 22 * s, 14 * s, 8 * s, 4 * s, "#16a34a", "#1e1b18", 2);
    };
    drawCactus(W * 0.86, horizonY + H * 0.04, W / 420);
    return true;
  }

  if (id === "bg_meadow_v3") {
    // 들꽃 초원: 파스텔 무지개 구름 + 부드러운 언덕 + 피크닉 돗자리 + 알록달록 꽃밭
    ctx.fillStyle = "#ffffff";
    [[0.2, 0.2], [0.78, 0.16]].forEach(([cx, cy]) => {
      ctx.beginPath(); ctx.arc(W * cx, H * cy, W * 0.055, 0, Math.PI * 2);
      ctx.arc(W * (cx + 0.04), H * (cy - 0.01), W * 0.065, 0, Math.PI * 2);
      ctx.arc(W * (cx + 0.08), H * cy, W * 0.05, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = "#65a30d";
    ctx.beginPath(); ctx.ellipse(W * 0.25, horizonY + 12, W * 0.45, H * 0.18, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#84cc16";
    ctx.beginPath(); ctx.ellipse(W * 0.78, horizonY + 14, W * 0.42, H * 0.16, 0, Math.PI, 0); ctx.fill();
    const gG = ctx.createLinearGradient(0, horizonY, 0, H);
    gG.addColorStop(0, "#a3e635"); gG.addColorStop(1, "#4d7c0f");
    ctx.fillStyle = gG; ctx.fillRect(0, horizonY, W, H - horizonY);
    // 빨강 체크 돗자리 포인트 & 꽃
    fillRoundRect(ctx, W * 0.08, horizonY + H * 0.08, W * 0.22, H * 0.14, 6, "#fef2f2", "#ef4444", 2.5);
    [[0.15, 0.85, "#fb7185"], [0.74, 0.72, "#fde047"], [0.85, 0.82, "#f472b6"], [0.91, 0.69, "#ffffff"]].forEach(([fx, fy, fc]) => {
      ctx.fillStyle = fc; ctx.beginPath(); ctx.arc(W * fx, H * fy, W * 0.015, 0, Math.PI * 2); ctx.fill();
    });
    return true;
  }

  if (id === "bg_myroom") {
    // 내 방: 벽지 + 창문 햇살 + 벽 포스터 + 원목 바닥 + 러그 + 미니 스피커
    ctx.fillStyle = "#fef3c7"; ctx.fillRect(0, 0, W, horizonY);
    ctx.fillStyle = "#d97706"; ctx.fillRect(0, horizonY, W, H - horizonY);
    ctx.strokeStyle = "#92400e"; ctx.lineWidth = 2;
    for (let y = horizonY + 16; y < H; y += 18) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    // 창문
    fillRoundRect(ctx, W * 0.08, H * 0.12, W * 0.24, H * 0.28, 6, "#bae6fd", "#78350f", 3.5);
    ctx.strokeStyle = "#78350f"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(W * 0.20, H * 0.12); ctx.lineTo(W * 0.20, H * 0.40);
    ctx.moveTo(W * 0.08, H * 0.26); ctx.lineTo(W * 0.32, H * 0.26); ctx.stroke();
    // 벽 음반 액자 + 바닥 원형 러그
    fillRoundRect(ctx, W * 0.72, H * 0.14, W * 0.18, H * 0.22, 4, "#f43f5e", "#1e1b18", 2.5);
    drawStar(ctx, W * 0.81, H * 0.25, W * 0.04, W * 0.018, 5, "#fde047", "#1e1b18", 1.5);
    ctx.fillStyle = "#fecdd3"; ctx.strokeStyle = "#e11d48"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(W * 0.5, horizonY + H * 0.18, W * 0.34, H * 0.10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    return true;
  }

  if (id === "bg_fishing") {
    // 낚시터 배경: 먼 산 + 넓은 호수 + 갈대 + 나무 부두 + 낚시 랜턴
    ctx.fillStyle = "#7dd3fc"; ctx.fillRect(0, 0, W, H * 0.42);
    ctx.fillStyle = "#4ade80";
    ctx.beginPath(); ctx.ellipse(W * 0.22, H * 0.42, W * 0.36, H * 0.16, 0, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.ellipse(W * 0.78, H * 0.42, W * 0.36, H * 0.14, 0, Math.PI, 0); ctx.fill();
    const lakeG = ctx.createLinearGradient(0, H * 0.42, 0, H);
    lakeG.addColorStop(0, "#0284c7"); lakeG.addColorStop(1, "#0369a1");
    ctx.fillStyle = lakeG; ctx.fillRect(0, H * 0.42, W, H * 0.58);
    // 나무 부두 바닥
    fillRoundRect(ctx, W * 0.12, H * 0.64, W * 0.76, H * 0.36, 8, "#b45309", "#451a03", 3);
    ctx.strokeStyle = "#78350f"; ctx.lineWidth = 2;
    for (let x = W * 0.18; x < W * 0.86; x += W * 0.09) {
      ctx.beginPath(); ctx.moveTo(x, H * 0.64); ctx.lineTo(x, H); ctx.stroke();
    }
    fillRoundRect(ctx, W * 0.82, H * 0.44, W * 0.04, H * 0.22, 2, "#78350f");
    ctx.fillStyle = "#fde047"; ctx.beginPath(); ctx.arc(W * 0.84, H * 0.44, W * 0.032, 0, Math.PI * 2); ctx.fill();
    return true;
  }

  if (id === "bg_deep_forest") {
    // 깊은 숲: 어두운 에메랄드 거목 실루엣 + 이끼 바닥 + 반딧불이
    ctx.fillStyle = "#064e3b"; ctx.fillRect(0, 0, W, horizonY);
    [[0.04, 0.12], [0.22, 0.08], [0.74, 0.10], [0.88, 0.12]].forEach(([tx, tw]) => {
      ctx.fillStyle = "#1c1917"; ctx.fillRect(W * tx, 0, W * tw, horizonY);
      ctx.fillStyle = "#065f46";
      ctx.beginPath(); ctx.arc(W * (tx + tw / 2), H * 0.12, W * 0.12, 0, Math.PI * 2); ctx.fill();
    });
    const mG = ctx.createLinearGradient(0, horizonY, 0, H);
    mG.addColorStop(0, "#15803d"); mG.addColorStop(1, "#052e16");
    ctx.fillStyle = mG; ctx.fillRect(0, horizonY, W, H - horizonY);
    [[0.18, 0.28], [0.35, 0.18], [0.68, 0.32], [0.84, 0.22], [0.55, 0.14]].forEach(([fx, fy]) => {
      const gg = ctx.createRadialGradient(W * fx, H * fy, 1, W * fx, H * fy, W * 0.04);
      gg.addColorStop(0, "#fef08a"); gg.addColorStop(1, "rgba(253, 224, 71, 0)");
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(W * fx, H * fy, W * 0.04, 0, Math.PI * 2); ctx.fill();
    });
    return true;
  }

  if (id === "bg_club") {
    // 클럽: 미러볼 + 네온 스포트라이트 + 레이저 격자 플로어
    ctx.fillStyle = "#090d16"; ctx.fillRect(0, 0, W, horizonY);
    ["rgba(236,72,153,0.28)", "rgba(56,189,248,0.28)"].forEach((bc, idx) => {
      ctx.fillStyle = bc;
      ctx.beginPath();
      ctx.moveTo(W * 0.5, H * 0.12);
      ctx.lineTo(W * (idx === 0 ? 0.05 : 0.65), horizonY);
      ctx.lineTo(W * (idx === 0 ? 0.35 : 0.95), horizonY);
      ctx.closePath(); ctx.fill();
    });
    ctx.fillStyle = "#e2e8f0"; ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(W * 0.5, H * 0.16, W * 0.07, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#1e1b4b"; ctx.fillRect(0, horizonY, W, H - horizonY);
    ctx.strokeStyle = "rgba(236, 72, 153, 0.65)"; ctx.lineWidth = 2;
    for (let x = 0; x <= W; x += W * 0.12) {
      ctx.beginPath(); ctx.moveTo(x, horizonY); ctx.lineTo(x + (x - W / 2) * 0.6, H); ctx.stroke();
    }
    return true;
  }

  if (id === "bg_mansion") {
    // 대저택: 유럽풍 대리석 궁전 + 붉은 지붕 + 중앙 분수대 + 정원
    ctx.fillStyle = "#7dd3fc"; ctx.fillRect(0, 0, W, horizonY);
    fillRoundRect(ctx, W * 0.14, H * 0.16, W * 0.72, horizonY - H * 0.16, 4, "#fffbeb", "#b45309", 2.5);
    ctx.fillStyle = "#be123c"; ctx.strokeStyle = "#1e1b18"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(W * 0.1, H * 0.18); ctx.lineTo(W * 0.5, H * 0.04); ctx.lineTo(W * 0.9, H * 0.18); ctx.closePath(); ctx.fill(); ctx.stroke();
    [0.24, 0.38, 0.62, 0.76].forEach(wx => {
      fillRoundRect(ctx, W * wx - W * 0.03, H * 0.26, W * 0.06, H * 0.16, 8, "#38bdf8", "#92400e", 2);
    });
    ctx.fillStyle = "#4ade80"; ctx.fillRect(0, horizonY, W, H - horizonY);
    fillRoundRect(ctx, W * 0.38, horizonY, W * 0.24, H - horizonY, 2, "#e2e8f0", "#94a3b8", 2);
    return true;
  }

  if (id === "bg_volcano") {
    // 화산: 붉은 하늘 + 분화 화산 + 흘러내리는 용암 + 화산재
    ctx.fillStyle = "#450a0a"; ctx.fillRect(0, 0, W, horizonY);
    ctx.fillStyle = "#292524"; ctx.strokeStyle = "#090d16"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(W * 0.06, horizonY); ctx.lineTo(W * 0.38, H * 0.18); ctx.lineTo(W * 0.62, H * 0.18); ctx.lineTo(W * 0.94, horizonY); ctx.closePath(); ctx.fill(); ctx.stroke();
    // 용암 분출
    ctx.fillStyle = "#f97316";
    ctx.beginPath(); ctx.moveTo(W * 0.44, H * 0.18); ctx.quadraticCurveTo(W * 0.42, horizonY * 0.7, W * 0.34, horizonY); ctx.lineTo(W * 0.52, horizonY); ctx.quadraticCurveTo(W * 0.54, horizonY * 0.65, W * 0.56, H * 0.18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#facc15";
    [[0.3, 0.14], [0.5, 0.08], [0.7, 0.16]].forEach(([bx, by]) => {
      ctx.beginPath(); ctx.arc(W * bx, H * by, W * 0.015, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = "#1c1917"; ctx.fillRect(0, horizonY, W, H - horizonY);
    ctx.fillStyle = "#ea580c"; ctx.fillRect(0, horizonY + H * 0.18, W, H * 0.06);
    return true;
  }

  if (id === "bg_deep_space") {
    // 깊은 우주: 블랙홀 + 은하 성운 + 운석 + 별빛
    ctx.fillStyle = "#020617"; ctx.fillRect(0, 0, W, H);
    const neb = ctx.createRadialGradient(W * 0.28, H * 0.28, 6, W * 0.28, H * 0.28, W * 0.45);
    neb.addColorStop(0, "rgba(56, 189, 248, 0.35)");
    neb.addColorStop(0.5, "rgba(168, 85, 247, 0.22)");
    neb.addColorStop(1, "rgba(2, 6, 23, 0)");
    ctx.fillStyle = neb; ctx.fillRect(0, 0, W, H);
    // 블랙홀
    ctx.fillStyle = "#000000"; ctx.strokeStyle = "#f97316"; ctx.lineWidth = Math.max(3, W * 0.015);
    ctx.beginPath(); ctx.arc(W * 0.8, H * 0.24, W * 0.075, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#fde047"; ctx.lineWidth = Math.max(2, W * 0.008);
    ctx.beginPath(); ctx.ellipse(W * 0.8, H * 0.24, W * 0.14, W * 0.032, 0.25, 0, Math.PI * 2); ctx.stroke();
    [[0.12, 0.14], [0.22, 0.4], [0.46, 0.12], [0.64, 0.32], [0.9, 0.48], [0.15, 0.82], [0.85, 0.84]].forEach(([sx, sy]) => {
      drawSparkle(ctx, W * sx, H * sy, W * 0.014, "#fef08a");
    });
    return true;
  }

  if (id === "bg_cyber_street") {
    // 사이버 네온 거리: 마천루 빌딩 + 핑크/시안 네온 간판 + 빗물 반사 도로
    ctx.fillStyle = "#090d16"; ctx.fillRect(0, 0, W, horizonY);
    [[0.04, 0.16, 0.36, "#1e1b4b"], [0.22, 0.12, 0.24, "#312e81"], [0.68, 0.14, 0.28, "#312e81"], [0.83, 0.14, 0.38, "#1e1b4b"]].forEach(([bx, bw, bh, bc]) => {
      ctx.fillStyle = bc; ctx.fillRect(W * bx, horizonY - H * bh, W * bw, H * bh);
    });
    fillRoundRect(ctx, W * 0.07, H * 0.22, W * 0.12, H * 0.16, 4, "#ec4899", "#f9a8d4", 2);
    fillRoundRect(ctx, W * 0.82, H * 0.18, W * 0.13, H * 0.14, 4, "#06b6d4", "#a5f3fc", 2);
    ctx.fillStyle = "#0f172a"; ctx.fillRect(0, horizonY, W, H - horizonY);
    ctx.fillStyle = "rgba(236, 72, 153, 0.32)"; ctx.fillRect(W * 0.06, horizonY + H * 0.08, W * 0.16, H * 0.06);
    ctx.fillStyle = "rgba(56, 189, 248, 0.32)"; ctx.fillRect(W * 0.78, horizonY + H * 0.1, W * 0.16, H * 0.06);
    return true;
  }

  return false;
}

// ============================================================================
// 2. V3.0 헤어 렌더러 (펑키스타일 + 모히칸 + 농구머리 + 초각성 금발)
// ============================================================================
function drawV3HairBack(ctx, hairItem) {
  if (!hairItem) return false;
  const st = hairItem.style || "";
  const id = hairItem.id || "";
  const outline = "#1e1b18";

  if (id === "punk_mohawk" || st === "punk_mohawk") {
    return true; // 뾰족 스파이크는 drawV3HairFront에서 머리 상단에 그림
  }
  if (st === "v3_awakened") {
    ctx.fillStyle = "#facc15"; ctx.strokeStyle = outline; ctx.lineWidth = 8; ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(114, 154); ctx.lineTo(54, 108); ctx.lineTo(110, 96);
    ctx.lineTo(86, 38); ctx.lineTo(156, 72); ctx.lineTo(202, 16);
    ctx.lineTo(242, 62); ctx.lineTo(298, 12); ctx.lineTo(334, 70);
    ctx.lineTo(400, 38); ctx.lineTo(372, 96); ctx.lineTo(426, 108); ctx.lineTo(366, 154);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    return true;
  }
  if (st === "v3_mohawk" || st === "v3_basketball") {
    return true;
  }
  return false;
}

function drawV3HairFront(ctx, hairItem) {
  if (!hairItem) return false;
  const st = hairItem.style || "";
  const id = hairItem.id || "";
  const outline = "#1e1b18";

  if (id === "punk_mohawk" || st === "punk_mohawk") {
    // 기존 모자에서 이동한 펑키스타일: 빡빡 깎은 옆선 + 화려한 무지개 네온 스파이크!
    fillRoundRect(ctx, 112, 92, 256, 190, 92, null, outline, 10);
    const spikes = [
      [158, 92, 126, 30, 198, 92, "#38bdf8"],
      [188, 92, 178, 14, 230, 92, "#ec4899"],
      [216, 92, 240, 6, 264, 92, "#facc15"],
      [250, 92, 302, 14, 292, 92, "#ec4899"],
      [282, 92, 354, 30, 322, 92, "#a855f7"]
    ];
    spikes.forEach(([x1, y1, x2, y2, x3, y3, col]) => {
      ctx.fillStyle = col; ctx.strokeStyle = outline; ctx.lineWidth = 7.5; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath();
      ctx.fill(); ctx.stroke();
    });
    return true;
  }

  if (st === "v3_mohawk") {
    // 모히칸 헤어: 옆면 투블럭 라인 + 중앙 뾰족 모히칸 핀
    fillRoundRect(ctx, 112, 92, 256, 190, 92, null, outline, 10);
    ctx.fillStyle = "#1e293b"; ctx.strokeStyle = outline; ctx.lineWidth = 8; ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(206, 98); ctx.lineTo(190, 26); ctx.lineTo(228, 60); ctx.lineTo(240, 14);
    ctx.lineTo(252, 60); ctx.lineTo(290, 26); ctx.lineTo(274, 98); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(234, 42); ctx.lineTo(234, 86); ctx.stroke();
    return true;
  }

  if (st === "v3_basketball") {
    // 농구머리 (강백호 스타일 강렬한 빨간 반삭!): 둥근 두상 위를 타이트하게 덮는 강렬한 크림슨 레드 컷 + 까끌 질감
    ctx.save();
    ctx.beginPath(); ctx.roundRect(112, 92, 256, 190, 92); ctx.clip();
    const redGrad = ctx.createLinearGradient(0, 86, 0, 150);
    redGrad.addColorStop(0, "#ef4444");
    redGrad.addColorStop(1, "#b91c1c");
    ctx.fillStyle = redGrad;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(100, 76); ctx.lineTo(380, 76); ctx.lineTo(380, 148);
    ctx.lineTo(348, 134); ctx.quadraticCurveTo(240, 126, 132, 134);
    ctx.lineTo(100, 148); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // 빨간 반삭 특유의 짧은 까끌 라인
    ctx.strokeStyle = "#991b1b"; ctx.lineWidth = 4; ctx.lineCap = "round";
    for (let rx = 148; rx <= 332; rx += 22) {
      ctx.beginPath(); ctx.moveTo(rx, 102); ctx.lineTo(rx + 4, 118); ctx.stroke();
    }
    ctx.strokeStyle = "#fca5a5"; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(180, 108); ctx.quadraticCurveTo(222, 100, 264, 107); ctx.stroke();
    ctx.restore();
    fillRoundRect(ctx, 112, 92, 256, 190, 92, null, outline, 10);
    return true;
  }

  if (st === "v3_awakened") {
    // 초각성 금발: 이마를 가르는 역동적인 황금 뾰족 앞머리
    ctx.save();
    ctx.beginPath(); ctx.roundRect(112, 92, 256, 190, 92); ctx.clip();
    ctx.fillStyle = "#fde047"; ctx.strokeStyle = outline; ctx.lineWidth = 8; ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(100, 74); ctx.lineTo(380, 74); ctx.lineTo(380, 152);
    ctx.lineTo(324, 132); ctx.lineTo(298, 166); ctx.lineTo(258, 124);
    ctx.lineTo(240, 174); ctx.lineTo(212, 124); ctx.lineTo(176, 164); ctx.lineTo(148, 130);
    ctx.lineTo(100, 150); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(192, 102); ctx.lineTo(234, 146); ctx.moveTo(286, 102); ctx.lineTo(260, 140); ctx.stroke();
    ctx.restore();
    fillRoundRect(ctx, 112, 92, 256, 190, 92, null, outline, 10);
    return true;
  }

  return false;
}

// ============================================================================
// 3. V3.0 모자 & 풀페이스 탈/헬멧 렌더러
// ============================================================================
function drawV3Hat(ctx, hatItem) {
  if (!hatItem || hatItem.id === "none") return false;
  const id = hatItem.id;
  const outline = "#1e1b18";

  // 기존 헤어 -> 모자로 이동한 3종 처리
  if (id === "monkey_hood") {
    // 원숭이 모자: 둥근 갈색 후드 외곽 + 노란 스티치 + 꼭대기 꼬불 털
    ctx.save();
    ctx.beginPath(); ctx.roundRect(112, 92, 256, 190, 92); ctx.clip();
    ctx.fillStyle = "#6b3410"; ctx.fillRect(100, 76, 280, 68);
    ctx.fillStyle = "#fffdf9";
    ctx.beginPath(); ctx.arc(195, 178, 66, 0, Math.PI * 2); ctx.arc(285, 178, 66, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    fillRoundRect(ctx, 112, 92, 256, 190, 92, null, outline, 10);
    ctx.strokeStyle = outline; ctx.lineWidth = 8; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(232, 92); ctx.lineTo(220, 64); ctx.moveTo(246, 92); ctx.lineTo(258, 66); ctx.stroke();
    ctx.strokeStyle = "#fde68a"; ctx.lineWidth = 3; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.arc(240, 148, 86, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.setLineDash([]);
    return true;
  }
  if (id === "sprout_hat") {
    fillRoundRect(ctx, 234, 48, 12, 46, 6, "#16a34a", outline, 6);
    ctx.fillStyle = "#4ade80"; ctx.strokeStyle = outline; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(212, 46, 28, 14, -0.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(268, 46, 28, 14, 0.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#bae6fd"; ctx.beginPath(); ctx.arc(204, 42, 4.5, 0, Math.PI * 2); ctx.fill();
    return true;
  }
  if (id === "octo_hat") {
    fillRoundRect(ctx, 165, 38, 150, 76, 38, "#ea580c", outline, 8);
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = outline; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(216, 74, 11, 0, Math.PI * 2); ctx.arc(264, 74, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = outline; ctx.beginPath(); ctx.arc(218, 75, 5, 0, Math.PI * 2); ctx.arc(262, 75, 5, 0, Math.PI * 2); ctx.fill();
    fillRoundRect(ctx, 224, 92, 32, 20, 10, "#fed7aa", outline, 5);
    [174, 288].forEach(lx => fillRoundRect(ctx, lx, 98, 20, 26, 9, "#ea580c", outline, 5));
    return true;
  }

  // 일반 V3 모자 6종
  if (id === "beanie_knit" || id === "beanie_pom") {
    const col = id === "beanie_pom" ? "#e11d48" : "#475569";
    const bandCol = id === "beanie_pom" ? "#be123c" : "#334155";
    ctx.fillStyle = col; ctx.strokeStyle = outline; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(240, 92, 92, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 4;
    [186, 214, 240, 266, 294].forEach(bx => {
      ctx.beginPath(); ctx.moveTo(bx, 18); ctx.lineTo(bx, 84); ctx.stroke();
    });
    fillRoundRect(ctx, 138, 78, 204, 28, 12, bandCol, outline, 7);
    if (id === "beanie_pom") {
      ctx.fillStyle = "#ffffff"; ctx.strokeStyle = outline; ctx.lineWidth = 6.5;
      ctx.beginPath(); ctx.arc(240, 16, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    return true;
  }
  if (id === "ball_cap") {
    ctx.fillStyle = "#2563eb"; ctx.strokeStyle = outline; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(240, 94, 90, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    fillRoundRect(ctx, 232, 4, 16, 12, 5, "#1d4ed8", outline, 4);
    fillRoundRect(ctx, 152, 82, 186, 24, 12, "#1d4ed8", outline, 7);
    fillRoundRect(ctx, 226, 44, 28, 24, 6, "#fde047", outline, 4);
    return true;
  }
  if (id === "snapback_hip") {
    fillRoundRect(ctx, 148, 36, 184, 60, 24, "#1e1b4b", outline, 8);
    fillRoundRect(ctx, 162, 82, 198, 20, 8, "#f43f5e", outline, 7);
    fillRoundRect(ctx, 268, 84, 26, 14, 4, "#facc15", outline, 3);
    drawStar(ctx, 224, 60, 14, 6, 5, "#fde047", outline, 3.5);
    return true;
  }
  if (id === "pierrot_hat") {
    ctx.fillStyle = "#ef4444"; ctx.strokeStyle = outline; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(240, 74); ctx.quadraticCurveTo(160, 12, 114, 52); ctx.quadraticCurveTo(154, 72, 192, 92); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#3b82f6";
    ctx.beginPath(); ctx.moveTo(240, 74); ctx.quadraticCurveTo(320, 12, 366, 52); ctx.quadraticCurveTo(326, 72, 288, 92); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fde047"; ctx.strokeStyle = outline; ctx.lineWidth = 5.5;
    ctx.beginPath(); ctx.arc(112, 54, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(368, 54, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    fillRoundRect(ctx, 152, 76, 176, 24, 12, "#facc15", outline, 7);
    return true;
  }
  if (id === "cupid_wings") {
    [-1, 1].forEach(dir => {
      ctx.save();
      ctx.translate(240 + dir * 116, 118);
      ctx.scale(dir, 1);
      ctx.fillStyle = "#ffffff"; ctx.strokeStyle = outline; ctx.lineWidth = 6.5;
      ctx.beginPath();
      ctx.moveTo(0, 18); ctx.bezierCurveTo(28, -46, 86, -34, 68, 8);
      ctx.bezierCurveTo(54, 26, 18, 28, 0, 18);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    });
    return true;
  }

  // coversFace: true 풀페이스 탈 5종 + 오토바이 헬멧! (얼굴·헤어 완전히 가리고 단독 완성)
  if (id === "mask_cat") {
    ctx.fillStyle = "#fde68a"; ctx.strokeStyle = outline; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(126, 148); ctx.lineTo(132, 44); ctx.lineTo(204, 102); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(354, 148); ctx.lineTo(348, 44); ctx.lineTo(276, 102); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fda4af";
    ctx.beginPath(); ctx.moveTo(140, 132); ctx.lineTo(142, 68); ctx.lineTo(188, 106); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(340, 132); ctx.lineTo(338, 68); ctx.lineTo(292, 106); ctx.closePath(); ctx.fill();
    fillRoundRect(ctx, 108, 88, 264, 198, 96, "#fef3c7", outline, 10);
    // 이마 줄무늬 + 귀여운 고양이 표정
    fillRoundRect(ctx, 232, 92, 16, 36, 6, "#d97706");
    fillRoundRect(ctx, 206, 98, 14, 26, 5, "#d97706");
    fillRoundRect(ctx, 260, 98, 14, 26, 5, "#d97706");
    ctx.fillStyle = outline;
    ctx.beginPath(); ctx.arc(190, 188, 15, 0, Math.PI * 2); ctx.arc(290, 188, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(185, 182, 5, 0, Math.PI * 2); ctx.arc(285, 182, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f43f5e"; ctx.beginPath(); ctx.arc(240, 210, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = 6.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(226, 224, 14, 0, Math.PI); ctx.arc(254, 224, 14, 0, Math.PI); ctx.stroke();
    ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(132, 204); ctx.lineTo(168, 212); ctx.moveTo(130, 222); ctx.lineTo(168, 222);
    ctx.moveTo(348, 204); ctx.lineTo(312, 212); ctx.moveTo(350, 222); ctx.lineTo(312, 222); ctx.stroke();
    return true;
  }
  if (id === "mask_dog") {
    ctx.fillStyle = "#b45309"; ctx.strokeStyle = outline; ctx.lineWidth = 9;
    fillRoundRect(ctx, 74, 134, 52, 108, 26, "#92400e", outline, 8.5);
    fillRoundRect(ctx, 354, 134, 52, 108, 26, "#92400e", outline, 8.5);
    fillRoundRect(ctx, 108, 88, 264, 198, 96, "#fbbf24", outline, 10);
    fillRoundRect(ctx, 184, 182, 112, 86, 42, "#fffbeb", outline, 6);
    ctx.fillStyle = outline;
    ctx.beginPath(); ctx.arc(190, 174, 15, 0, Math.PI * 2); ctx.arc(290, 174, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(185, 168, 5, 0, Math.PI * 2); ctx.arc(285, 168, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = outline;
    ctx.beginPath(); ctx.ellipse(240, 204, 16, 11, 0, 0, Math.PI * 2); ctx.fill();
    fillRoundRect(ctx, 226, 226, 28, 26, 14, "#fb7185", outline, 5);
    return true;
  }
  if (id === "mask_pig") {
    ctx.fillStyle = "#f472b6"; ctx.strokeStyle = outline; ctx.lineWidth = 8.5;
    ctx.beginPath(); ctx.moveTo(118, 132); ctx.lineTo(96, 68); ctx.lineTo(176, 94); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(362, 132); ctx.lineTo(384, 68); ctx.lineTo(304, 94); ctx.closePath(); ctx.fill(); ctx.stroke();
    fillRoundRect(ctx, 108, 88, 264, 198, 96, "#fbcfe8", outline, 10);
    ctx.fillStyle = outline;
    ctx.beginPath(); ctx.arc(188, 174, 14, 0, Math.PI * 2); ctx.arc(292, 174, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(184, 169, 4.5, 0, Math.PI * 2); ctx.arc(288, 169, 4.5, 0, Math.PI * 2); ctx.fill();
    fillRoundRect(ctx, 194, 194, 92, 54, 26, "#f472b6", outline, 7);
    ctx.fillStyle = outline;
    ctx.beginPath(); ctx.ellipse(222, 220, 8, 12, 0, 0, Math.PI * 2); ctx.ellipse(258, 220, 8, 12, 0, 0, Math.PI * 2); ctx.fill();
    return true;
  }
  if (id === "mask_rabbit") {
    fillRoundRect(ctx, 152, 6, 48, 106, 24, "#ffffff", outline, 9);
    fillRoundRect(ctx, 280, 6, 48, 106, 24, "#ffffff", outline, 9);
    fillRoundRect(ctx, 166, 22, 20, 72, 10, "#fbcfe8");
    fillRoundRect(ctx, 294, 22, 20, 72, 10, "#fbcfe8");
    fillRoundRect(ctx, 108, 92, 264, 194, 96, "#ffffff", outline, 10);
    ctx.fillStyle = "#fda4af";
    ctx.beginPath(); ctx.ellipse(164, 218, 22, 12, 0, 0, Math.PI * 2); ctx.ellipse(316, 218, 22, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e11d48";
    ctx.beginPath(); ctx.arc(190, 186, 14, 0, Math.PI * 2); ctx.arc(290, 186, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(185, 180, 4.5, 0, Math.PI * 2); ctx.arc(285, 180, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = 6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(240, 214, 14, 0, Math.PI); ctx.stroke();
    return true;
  }
  if (id === "mask_horse") {
    // 말 탈: 갈기 + 뾰족 귀 + 길쭉한 주둥이 코!
    fillRoundRect(ctx, 216, 36, 48, 66, 16, "#451a03", outline, 7);
    ctx.fillStyle = "#92400e"; ctx.strokeStyle = outline; ctx.lineWidth = 8.5;
    ctx.beginPath(); ctx.moveTo(138, 114); ctx.lineTo(150, 48); ctx.lineTo(192, 92); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(342, 114); ctx.lineTo(330, 48); ctx.lineTo(288, 92); ctx.closePath(); ctx.fill(); ctx.stroke();
    fillRoundRect(ctx, 110, 88, 260, 198, 90, "#92400e", outline, 10);
    fillRoundRect(ctx, 174, 186, 132, 92, 42, "#fde68a", outline, 7);
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = outline; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(184, 164, 18, 0, Math.PI * 2); ctx.arc(296, 164, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = outline;
    ctx.beginPath(); ctx.arc(186, 164, 9, 0, Math.PI * 2); ctx.arc(294, 164, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(212, 224, 8, 0, Math.PI * 2); ctx.arc(268, 224, 8, 0, Math.PI * 2); ctx.fill();
    return true;
  }
  if (id === "moto_helmet") {
    // 오토바이 헬멧: 유광 레드/화이트 레이싱 쉘 + 스모크 바이저
    fillRoundRect(ctx, 98, 72, 284, 218, 108, "#dc2626", outline, 10);
    fillRoundRect(ctx, 220, 74, 40, 76, 10, "#ffffff", outline, 4);
    fillRoundRect(ctx, 130, 136, 220, 94, 34, "#0f172a", outline, 8);
    ctx.strokeStyle = "rgba(56, 189, 248, 0.8)"; ctx.lineWidth = 7; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(158, 164); ctx.lineTo(212, 206); ctx.moveTo(186, 158); ctx.lineTo(222, 186); ctx.stroke();
    fillRoundRect(ctx, 176, 244, 128, 26, 10, "#1e293b", outline, 5);
    return true;
  }
  return false;
}

// ============================================================================
// 4. V3.0 얼굴 7종 렌더러 (V3.2 눈 깜빡임 공용 헬퍼 포함)
// ============================================================================
function drawAvatarClosedBlinkEyes(ctx, outline = "#1e1b18", y = 192) {
  ctx.save();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 7.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  [190, 290].forEach(ex => {
    ctx.beginPath();
    ctx.arc(ex, y - 4, 15, 0.14 * Math.PI, 0.86 * Math.PI);
    ctx.stroke();
  });
  ctx.restore();
}

function drawV3Face(ctx, faceItem, faceOpts = {}) {
  if (!faceItem) return false;
  const id = faceItem.id;
  const outline = "#1e1b18";
  const isBlink = Boolean(faceOpts && faceOpts.blink);

  if (id === "sunglass_tint") {
    if (isBlink) {
      drawAvatarClosedBlinkEyes(ctx, outline, 192);
    } else {
      ctx.fillStyle = outline;
      ctx.beginPath(); ctx.arc(190, 192, 13, 0, Math.PI * 2); ctx.arc(290, 192, 13, 0, Math.PI * 2); ctx.fill();
    }
    const gL = ctx.createLinearGradient(0, 166, 0, 218);
    gL.addColorStop(0, "rgba(251, 113, 133, 0.65)"); gL.addColorStop(1, "rgba(250, 204, 21, 0.45)");
    fillRoundRect(ctx, 144, 166, 88, 52, 24, gL, "#be123c", 7);
    fillRoundRect(ctx, 248, 166, 88, 52, 24, gL, "#be123c", 7);
    ctx.strokeStyle = "#be123c"; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(232, 188); ctx.lineTo(248, 188); ctx.stroke();
    ctx.strokeStyle = outline; ctx.lineWidth = 7; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(240, 224, 18, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    return true;
  }
  if (id === "sunglass_aviator") {
    const aG = ctx.createLinearGradient(0, 164, 0, 224);
    aG.addColorStop(0, "#334155"); aG.addColorStop(1, "#0f172a");
    [186, 294].forEach((cx, idx) => {
      const s = idx === 0 ? -1 : 1;
      ctx.fillStyle = aG; ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 7.5;
      ctx.beginPath();
      ctx.moveTo(cx - 42, 168); ctx.lineTo(cx + 42, 168);
      ctx.quadraticCurveTo(cx + 44, 224, cx + s * 8, 224);
      ctx.quadraticCurveTo(cx - 44, 222, cx - 42, 168);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    });
    ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 6.5;
    ctx.beginPath(); ctx.moveTo(222, 170); ctx.lineTo(258, 170); ctx.moveTo(228, 184); ctx.lineTo(252, 184); ctx.stroke();
    ctx.strokeStyle = outline; ctx.lineWidth = 7; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(222, 232); ctx.quadraticCurveTo(240, 240, 258, 232); ctx.stroke();
    return true;
  }
  if (id === "sunglass_sport") {
    const sG = ctx.createLinearGradient(136, 162, 344, 214);
    sG.addColorStop(0, "#06b6d4"); sG.addColorStop(0.5, "#3b82f6"); sG.addColorStop(1, "#a855f7");
    ctx.fillStyle = sG; ctx.strokeStyle = outline; ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(132, 168); ctx.lineTo(348, 168); ctx.lineTo(334, 216);
    ctx.lineTo(260, 214); ctx.lineTo(240, 198); ctx.lineTo(220, 214); ctx.lineTo(146, 216);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(156, 182); ctx.lineTo(208, 182); ctx.stroke();
    ctx.strokeStyle = outline; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(240, 224, 18, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    return true;
  }
  if (id === "anime_eyes") {
    ctx.strokeStyle = outline; ctx.lineWidth = 6.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(164, 160); ctx.lineTo(208, 168); ctx.moveTo(272, 168); ctx.lineTo(316, 160); ctx.stroke();
    if (isBlink) {
      drawAvatarClosedBlinkEyes(ctx, outline, 194);
    } else {
      [190, 290].forEach(ex => {
        ctx.fillStyle = "#1e3a8a"; ctx.strokeStyle = outline; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.ellipse(ex, 192, 20, 24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath(); ctx.ellipse(ex, 198, 14, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(ex - 7, 182, 7.5, 0, Math.PI * 2); ctx.arc(ex + 6, 202, 4, 0, Math.PI * 2); ctx.fill();
      });
    }
    ctx.strokeStyle = outline; ctx.lineWidth = 6.5;
    ctx.beginPath(); ctx.moveTo(224, 232); ctx.quadraticCurveTo(240, 244, 256, 232); ctx.stroke();
    return true;
  }
  if (id === "piercing_face") {
    ctx.strokeStyle = outline; ctx.lineWidth = 6.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(170, 166); ctx.lineTo(208, 170); ctx.moveTo(272, 170); ctx.lineTo(310, 166); ctx.stroke();
    if (isBlink) {
      drawAvatarClosedBlinkEyes(ctx, outline, 192);
    } else {
      ctx.fillStyle = outline;
      ctx.beginPath(); ctx.arc(190, 192, 14, 0, Math.PI * 2); ctx.arc(290, 192, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(185, 187, 5, 0, Math.PI * 2); ctx.arc(285, 187, 5, 0, Math.PI * 2); ctx.fill();
    }
    // 양쪽 귀 링 피어싱 & 은별
    ctx.strokeStyle = "#facc15"; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(105, 224, 12, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(375, 224, 12, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(105, 224, 8, 0, Math.PI * 1.4); ctx.stroke();
    ctx.beginPath(); ctx.arc(375, 224, 8, 0, Math.PI * 1.4); ctx.stroke();
    ctx.strokeStyle = outline; ctx.lineWidth = 6.5;
    ctx.beginPath(); ctx.moveTo(226, 230); ctx.lineTo(256, 226); ctx.stroke();
    return true;
  }
  if (id === "woongi_beard") {
    // 웅이 수염: 진한 일자 눈썹 + 동글 눈 + 뭉뚝 코 + 푸짐한 팔자 수염 & 볼 구레나룻
    ctx.fillStyle = "#1e1b18";
    fillRoundRect(ctx, 158, 152, 54, 16, 7, "#1e1b18");
    fillRoundRect(ctx, 268, 152, 54, 16, 7, "#1e1b18");
    if (isBlink) {
      drawAvatarClosedBlinkEyes(ctx, outline, 190);
    } else {
      ctx.fillStyle = outline;
      ctx.beginPath(); ctx.arc(190, 190, 13, 0, Math.PI * 2); ctx.arc(290, 190, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(186, 185, 4.5, 0, Math.PI * 2); ctx.arc(286, 185, 4.5, 0, Math.PI * 2); ctx.fill();
    }
    // 턱을 감싸는 수염 그림자 & 풍성 콧수염
    ctx.fillStyle = "#334155"; ctx.strokeStyle = outline; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(240, 232, 62, 0.1 * Math.PI, 0.9 * Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#1e1b18";
    ctx.beginPath();
    ctx.ellipse(216, 226, 30, 15, -0.25, 0, Math.PI * 2);
    ctx.ellipse(264, 226, 30, 15, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fda4af"; ctx.beginPath(); ctx.arc(240, 240, 7, 0, Math.PI * 2); ctx.fill();
    return true;
  }
  if (id === "awakened_eyes") {
    // 열혈 전사 눈빛: 날카로운 눈썹 + 빛나는 청록/황금 동공 + 다부진 미소
    ctx.strokeStyle = outline; ctx.lineWidth = 8.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(158, 158); ctx.lineTo(212, 174); ctx.moveTo(322, 158); ctx.lineTo(268, 174); ctx.stroke();
    if (isBlink) {
      drawAvatarClosedBlinkEyes(ctx, outline, 194);
    } else {
      [190, 290].forEach((ex, i) => {
        ctx.fillStyle = "#ffffff"; ctx.strokeStyle = outline; ctx.lineWidth = 5.5;
        ctx.beginPath();
        ctx.moveTo(ex - 26, 188); ctx.lineTo(ex + (i === 0 ? 18 : 22), 182);
        ctx.lineTo(ex + 22, 206); ctx.lineTo(ex - 20, 206); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#14b8a6";
        ctx.beginPath(); ctx.arc(ex, 194, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fef08a";
        ctx.beginPath(); ctx.arc(ex, 194, 4.5, 0, Math.PI * 2); ctx.fill();
      });
    }
    ctx.strokeStyle = outline; ctx.lineWidth = 6.5;
    ctx.beginPath(); ctx.moveTo(222, 232); ctx.quadraticCurveTo(240, 224, 258, 230); ctx.stroke();
    return true;
  }

  return false;
}

// ============================================================================
// 5. V3.0 의상 14종 렌더러
// ============================================================================
function drawV3Outfit(ctx, outfitItem, isFemale = false, opts = {}) {
  if (!outfitItem) return false;
  const id = outfitItem.id;
  if (![
    "white_jeans", "white_cargo", "swimwear_v3", "suit_horse", "suit_cat",
    "suit_dog", "suit_pig", "suit_rabbit", "pierrot_suit", "ski_suit",
    "santa_suit", "bunny_suit", "red_passion", "warrior_gi"
  ].includes(id)) {
    return false;
  }

  const outline = "#1e1b18";
  const skin = "#fffdf9";
  const main = outfitItem.main || "#ffffff";
  const sub = outfitItem.sub || "#2563eb";
  const isThumb = !!opts.isThumb;

  if (!isThumb) {
    const legSkin = id === "swimwear_v3" || id === "bunny_suit";
    ctx.strokeStyle = outline; ctx.lineWidth = 15; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(212, 346); ctx.lineTo(206, 388); ctx.moveTo(268, 346); ctx.lineTo(274, 388); ctx.stroke();
    if (legSkin) {
      ctx.strokeStyle = skin; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(212, 346); ctx.lineTo(206, 386); ctx.moveTo(268, 346); ctx.lineTo(274, 386); ctx.stroke();
    }
    const shoeCol = id.startsWith("suit_") ? main : id === "warrior_gi" ? "#1e3a8a" : id === "santa_suit" ? "#0f172a" : "#1e293b";
    fillRoundRect(ctx, 184, 382, 36, 18, 9, shoeCol, outline, 6);
    fillRoundRect(ctx, 260, 382, 36, 18, 9, shoeCol, outline, 6);
  }

  // 소매 & 손
  const bareArms = id === "swimwear_v3" || id === "bunny_suit";
  const sleeveCol = bareArms ? skin : main;
  const handCol = id.startsWith("suit_") ? sub : skin;
  ctx.strokeStyle = outline; ctx.lineWidth = 18; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(184, 286); ctx.lineTo(136, 326); ctx.moveTo(296, 286); ctx.lineTo(344, 326); ctx.stroke();
  ctx.strokeStyle = sleeveCol; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(184, 286); ctx.lineTo(148, 316); ctx.moveTo(296, 286); ctx.lineTo(332, 316); ctx.stroke();
  ctx.fillStyle = handCol; ctx.strokeStyle = outline; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(134, 328, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(346, 328, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  if (id === "white_jeans" || id === "white_cargo") {
    // 흰티 + 청바지 / 카고바지
    fillRoundRect(ctx, 182, 268, 116, 56, 24, "#ffffff", outline, 8.5);
    fillRoundRect(ctx, 186, 320, 108, 38, 12, sub, outline, 7.5);
    if (id === "white_cargo") {
      fillRoundRect(ctx, 180, 328, 22, 22, 5, "#3f6212", outline, 4);
      fillRoundRect(ctx, 278, 328, 22, 22, 5, "#3f6212", outline, 4);
    }
    ctx.strokeStyle = outline; ctx.lineWidth = 5.5;
    ctx.beginPath(); ctx.moveTo(240, 336); ctx.lineTo(240, 358); ctx.stroke();
  } else if (id === "swimwear_v3") {
    if (isFemale) {
      fillRoundRect(ctx, 186, 268, 108, 86, 28, "#f43f5e", outline, 8.5);
      fillRoundRect(ctx, 188, 268, 104, 20, 8, skin);
      fillRoundRect(ctx, 200, 294, 80, 14, 6, "#fde047", outline, 4);
    } else {
      fillRoundRect(ctx, 184, 268, 112, 56, 24, skin, outline, 8.5);
      fillRoundRect(ctx, 186, 318, 108, 38, 12, "#0ea5e9", outline, 7.5);
      fillRoundRect(ctx, 186, 326, 108, 10, 3, "#fde047");
    }
  } else if (id.startsWith("suit_")) {
    // 동물 코스튬 옷 5종
    fillRoundRect(ctx, 182, 268, 116, 86, 34, main, outline, 8.5);
    ctx.fillStyle = sub; ctx.strokeStyle = outline; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(240, 316, 38, 30, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (id === "suit_dog") {
      fillRoundRect(ctx, 198, 266, 84, 12, 6, "#ef4444", outline, 4.5);
    } else if (id === "suit_cat") {
      fillRoundRect(ctx, 224, 296, 32, 6, 3, "#d97706");
      fillRoundRect(ctx, 224, 312, 32, 6, 3, "#d97706");
    }
  } else if (id === "pierrot_suit") {
    fillRoundRect(ctx, 182, 268, 116, 86, 34, "#ffffff", outline, 8.5);
    ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(214, 318, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3b82f6"; ctx.beginPath(); ctx.arc(266, 318, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#facc15"; ctx.strokeStyle = outline; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(192, 272); ctx.lineTo(240, 294); ctx.lineTo(288, 272); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (id === "ski_suit") {
    fillRoundRect(ctx, 180, 268, 120, 60, 26, "#0284c7", outline, 8.5);
    fillRoundRect(ctx, 186, 322, 108, 34, 10, "#1e293b", outline, 7);
    fillRoundRect(ctx, 182, 296, 116, 14, 4, "#fde047", outline, 4);
  } else if (id === "santa_suit") {
    fillRoundRect(ctx, 182, 268, 116, 86, 34, "#dc2626", outline, 8.5);
    fillRoundRect(ctx, 198, 264, 84, 20, 10, "#ffffff", outline, 5.5);
    fillRoundRect(ctx, 184, 318, 112, 14, 4, "#0f172a", outline, 4.5);
    fillRoundRect(ctx, 230, 316, 20, 18, 4, "#facc15", outline, 4);
  } else if (id === "bunny_suit") {
    fillRoundRect(ctx, 184, 268, 112, 86, 32, "#1e1b4b", outline, 8.5);
    fillRoundRect(ctx, 204, 268, 72, 26, 8, "#ffffff", outline, 5);
    fillRoundRect(ctx, 224, 276, 32, 14, 5, "#f472b6", outline, 4);
  } else if (id === "red_passion") {
    fillRoundRect(ctx, 182, 268, 116, 86, 32, "#dc2626", outline, 8.5);
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = outline; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(216, 268); ctx.lineTo(240, 312); ctx.lineTo(264, 268); ctx.closePath(); ctx.fill(); ctx.stroke();
    fillRoundRect(ctx, 234, 276, 12, 34, 4, "#1e1b18");
    ctx.strokeStyle = "#facc15"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(192, 328); ctx.quadraticCurveTo(220, 344, 250, 328); ctx.stroke();
  } else if (id === "warrior_gi") {
    // 열혈 전사 도복: 오렌지 도복 + 블루 이너 + 블루 허리띠
    fillRoundRect(ctx, 182, 268, 116, 86, 32, "#f97316", outline, 8.5);
    ctx.fillStyle = "#1d4ed8"; ctx.strokeStyle = outline; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(212, 268); ctx.lineTo(240, 304); ctx.lineTo(268, 268); ctx.closePath(); ctx.fill(); ctx.stroke();
    fillRoundRect(ctx, 184, 316, 112, 16, 4, "#1d4ed8", outline, 5);
    fillRoundRect(ctx, 228, 324, 24, 28, 5, "#1e40af", outline, 4.5);
  }

  if (isFemale && !isThumb && !id.startsWith("suit_")) {
    fillRoundRect(ctx, 174, 330, 132, 24, 12, sub, outline, 7);
  }
  return true;
}

// ============================================================================
// 6. V3.0 소품 10종 렌더러
// ============================================================================
function drawV3Prop(ctx, accItem, cx, cy, scale = 1) {
  if (!accItem || !accItem.id || !accItem.id.startsWith("prop_")) return false;
  const id = accItem.id;
  const outline = "#1e1b18";

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  if (id === "prop_mop" || id === "prop_broom") {
    ctx.rotate(-0.22);
    fillRoundRect(ctx, -4, -56, 8, 92, 4, "#d97706", outline, 3.5);
    if (id === "prop_mop") {
      fillRoundRect(ctx, -26, 26, 52, 10, 4, "#38bdf8", outline, 3.5);
      ctx.fillStyle = "#f8fafc"; ctx.strokeStyle = outline; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(-24, 34); ctx.lineTo(-32, 58); ctx.lineTo(32, 58); ctx.lineTo(24, 34); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else {
      ctx.fillStyle = "#eab308"; ctx.strokeStyle = outline; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-10, 20); ctx.lineTo(-30, 60); ctx.lineTo(30, 60); ctx.lineTo(10, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
      fillRoundRect(ctx, -12, 18, 24, 8, 3, "#dc2626", outline, 2.5);
    }
  } else if (id === "prop_mackerel") {
    ctx.rotate(-0.35);
    const fg = ctx.createLinearGradient(0, -40, 0, 40);
    fg.addColorStop(0, "#0284c7"); fg.addColorStop(0.5, "#94a3b8"); fg.addColorStop(1, "#f8fafc");
    ctx.fillStyle = fg; ctx.strokeStyle = outline; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.ellipse(0, 0, 18, 48, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 44); ctx.lineTo(-16, 64); ctx.lineTo(16, 64); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = outline; ctx.beginPath(); ctx.arc(-6, -26, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 2;
    for (let y = -12; y <= 24; y += 9) {
      ctx.beginPath(); ctx.moveTo(-10, y); ctx.lineTo(2, y - 4); ctx.stroke();
    }
  } else if (id === "prop_carrot") {
    ctx.rotate(-0.2);
    ctx.fillStyle = "#16a34a"; ctx.strokeStyle = outline; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.ellipse(-8, -36, 7, 16, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(8, -36, 7, 16, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#f97316"; ctx.strokeStyle = outline; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(-20, -24); ctx.lineTo(20, -24); ctx.lineTo(0, 48); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (id === "prop_rice") {
    // 고봉밥
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = outline; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.arc(0, -4, 34, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -28, 22, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#38bdf8"; ctx.strokeStyle = outline; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(-36, -4); ctx.lineTo(36, -4); ctx.lineTo(24, 30); ctx.lineTo(-24, 30); ctx.closePath(); ctx.fill(); ctx.stroke();
    fillRoundRect(ctx, -18, 30, 36, 9, 3, "#0284c7", outline, 3.5);
  } else if (id === "prop_chicken") {
    ctx.rotate(-0.25);
    fillRoundRect(ctx, -7, 10, 14, 34, 6, "#f8fafc", outline, 4);
    ctx.fillStyle = "#f8fafc"; ctx.beginPath(); ctx.arc(-6, 44, 7, 0, Math.PI * 2); ctx.arc(6, 44, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#d97706"; ctx.strokeStyle = outline; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.ellipse(0, -14, 24, 32, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(-6, -24, 8, 0, Math.PI * 2); ctx.fill();
  } else if (id === "prop_sword") {
    ctx.rotate(0.28);
    ctx.fillStyle = "#e2e8f0"; ctx.strokeStyle = outline; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(0, -68); ctx.lineTo(12, -46); ctx.lineTo(10, 14); ctx.lineTo(-10, 14); ctx.lineTo(-12, -46); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, -54); ctx.lineTo(0, 10); ctx.stroke();
    fillRoundRect(ctx, -24, 12, 48, 12, 5, "#facc15", outline, 4);
    fillRoundRect(ctx, -6, 24, 12, 24, 4, "#1d4ed8", outline, 3.5);
    ctx.fillStyle = "#38bdf8"; ctx.beginPath(); ctx.arc(0, 18, 4.5, 0, Math.PI * 2); ctx.fill();
  } else if (id === "prop_shield") {
    ctx.fillStyle = "#2563eb"; ctx.strokeStyle = outline; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-34, -36); ctx.lineTo(34, -36); ctx.lineTo(30, 8); ctx.quadraticCurveTo(0, 46, 0, 48); ctx.quadraticCurveTo(0, 46, -30, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#facc15"; ctx.lineWidth = 5; ctx.stroke();
    drawStar(ctx, 0, -4, 14, 6, 5, "#fde047", outline, 2.5);
  } else if (id === "prop_wand") {
    ctx.rotate(-0.22);
    fillRoundRect(ctx, -5, -16, 10, 68, 4, "#92400e", outline, 4);
    drawStar(ctx, 0, -28, 24, 10, 5, "#fde047", outline, 4);
    drawHeart(ctx, 0, -28, 9, "#f43f5e", outline, 2);
  } else if (id === "prop_flame") {
    ctx.fillStyle = "#f97316"; ctx.strokeStyle = outline; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -46); ctx.quadraticCurveTo(32, -16, 22, 16);
    ctx.quadraticCurveTo(0, 32, -22, 16); ctx.quadraticCurveTo(-32, -16, 0, -46);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.moveTo(0, -24); ctx.quadraticCurveTo(16, -2, 10, 14);
    ctx.quadraticCurveTo(0, 22, -10, 14); ctx.quadraticCurveTo(-16, -2, 0, -24);
    ctx.closePath(); ctx.fill();
  }

  ctx.restore();
  return true;
}

// ============================================================================
// 7. V3.0 날개 & 동물 친구들 12종 렌더러
// ============================================================================
function drawV3Wing(ctx, wingItem) {
  if (!wingItem || !wingItem.id || !wingItem.id.startsWith("wing_")) return false;
  const id = wingItem.id;
  if (["wing_mosquito", "wing_fly", "wing_dragonfly", "wing_fairy"].includes(id)) return false;
  const outline = "#1e1b18";

  const drawPair = (cy, fn) => {
    ctx.save();
    ctx.translate(240, cy);
    fn(-1);
    fn(1);
    ctx.restore();
  };

  if (id === "wing_angel" || id === "wing_archangel") {
    const isBig = id === "wing_archangel";
    drawPair(290, dir => {
      ctx.save();
      ctx.scale(dir, 1);
      const grad = ctx.createLinearGradient(24, -90, 195, 55);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(1, isBig ? "#fef08a" : "#e0f2fe");
      ctx.fillStyle = grad; ctx.strokeStyle = outline; ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(28, -10);
      ctx.bezierCurveTo(72, isBig ? -130 : -92, isBig ? 210 : 165, isBig ? -105 : -68, isBig ? 196 : 158, -12);
      ctx.bezierCurveTo(isBig ? 186 : 148, 22, 144, 48, 102, 42);
      ctx.bezierCurveTo(74, 34, 44, 18, 28, 6);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      if (isBig) {
        fillRoundRect(ctx, 56, -42, 76, 16, 8, "#facc15", outline, 4);
      }
      ctx.restore();
    });
    return true;
  }

  if (id === "wing_devil" || id === "wing_dragon" || id === "wing_hades") {
    const fillCol = id === "wing_dragon" ? "#dc2626" : id === "wing_hades" ? "#6b21a8" : "#3b0764";
    const trimCol = id === "wing_dragon" ? "#facc15" : id === "wing_hades" ? "#ec4899" : "#1e1b18";
    const big = id === "wing_hades" || id === "wing_dragon";
    drawPair(290, dir => {
      ctx.save();
      ctx.scale(dir, 1);
      ctx.fillStyle = fillCol; ctx.strokeStyle = outline; ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(30, 0);
      ctx.lineTo(big ? 176 : 146, big ? -92 : -68);
      ctx.lineTo(big ? 198 : 158, 18);
      ctx.quadraticCurveTo(154, 6, 126, 36);
      ctx.quadraticCurveTo(96, 12, 72, 34);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = trimCol; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(32, 0); ctx.lineTo(big ? 176 : 146, big ? -92 : -68); ctx.stroke();
      ctx.restore();
    });
    return true;
  }

  if (id === "wing_bone") {
    drawPair(290, dir => {
      ctx.save();
      ctx.scale(dir, 1);
      ctx.strokeStyle = outline; ctx.lineWidth = 14; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(28, 0); ctx.lineTo(118, -68); ctx.lineTo(180, -34);
      ctx.moveTo(118, -68); ctx.lineTo(154, 16);
      ctx.moveTo(118, -68); ctx.lineTo(110, 30);
      ctx.stroke();
      ctx.strokeStyle = "#f1f5f9"; ctx.lineWidth = 7.5;
      ctx.beginPath();
      ctx.moveTo(28, 0); ctx.lineTo(118, -68); ctx.lineTo(180, -34);
      ctx.moveTo(118, -68); ctx.lineTo(154, 16);
      ctx.moveTo(118, -68); ctx.lineTo(110, 30);
      ctx.stroke();
      ctx.restore();
    });
    return true;
  }

  if (id === "wing_mecha") {
    drawPair(286, dir => {
      ctx.save();
      ctx.scale(dir, 1);
      ctx.strokeStyle = outline; ctx.lineWidth = 18; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(30, -6); ctx.lineTo(116, -68); ctx.lineTo(176, -18); ctx.stroke();
      ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.moveTo(30, -6); ctx.lineTo(116, -68); ctx.lineTo(176, -18); ctx.stroke();
      ctx.fillStyle = "#38bdf8"; ctx.strokeStyle = outline; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(116, -68, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      fillRoundRect(ctx, 164, -28, 22, 26, 6, "#0f172a", "#38bdf8", 3);
      ctx.restore();
    });
    return true;
  }

  // 동물 친구들 5종: 캐릭터 좌우 양쪽에 귀여운 미니 동물 1마리씩 배치!
  if (id.startsWith("wing_pet_")) {
    const petType = id.replace("wing_pet_", "");
    drawPair(336, dir => {
      ctx.save();
      ctx.translate(dir * 144, 0);
      if (petType === "rabbit") {
        fillRoundRect(ctx, -20, -64, 14, 34, 7, "#ffffff", outline, 5);
        fillRoundRect(ctx, 6, -64, 14, 34, 7, "#ffffff", outline, 5);
        fillRoundRect(ctx, -26, -34, 52, 54, 24, "#ffffff", outline, 6);
        ctx.fillStyle = "#e11d48"; ctx.beginPath(); ctx.arc(-9, -10, 4, 0, Math.PI * 2); ctx.arc(9, -10, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fda4af"; ctx.beginPath(); ctx.arc(-14, 0, 5, 0, Math.PI * 2); ctx.arc(14, 0, 5, 0, Math.PI * 2); ctx.fill();
      } else if (petType === "dog") {
        fillRoundRect(ctx, -34, -22, 16, 28, 8, "#92400e", outline, 5);
        fillRoundRect(ctx, 18, -22, 16, 28, 8, "#92400e", outline, 5);
        fillRoundRect(ctx, -26, -34, 52, 54, 24, "#fbbf24", outline, 6);
        ctx.fillStyle = outline; ctx.beginPath(); ctx.arc(-10, -10, 4, 0, Math.PI * 2); ctx.arc(10, -10, 4, 0, Math.PI * 2); ctx.arc(0, -1, 5, 0, Math.PI * 2); ctx.fill();
      } else if (petType === "cat") {
        ctx.fillStyle = "#fde68a"; ctx.strokeStyle = outline; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(-24, -24); ctx.lineTo(-22, -48); ctx.lineTo(-4, -32); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(24, -24); ctx.lineTo(22, -48); ctx.lineTo(4, -32); ctx.closePath(); ctx.fill(); ctx.stroke();
        fillRoundRect(ctx, -26, -34, 52, 54, 24, "#fef3c7", outline, 6);
        ctx.fillStyle = outline; ctx.beginPath(); ctx.arc(-10, -10, 4, 0, Math.PI * 2); ctx.arc(10, -10, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#f43f5e"; ctx.beginPath(); ctx.arc(0, -1, 4, 0, Math.PI * 2); ctx.fill();
      } else if (petType === "horse") {
        fillRoundRect(ctx, -8, -52, 16, 22, 5, "#451a03", outline, 4);
        fillRoundRect(ctx, -26, -34, 52, 56, 22, "#92400e", outline, 6);
        fillRoundRect(ctx, -16, -2, 32, 22, 10, "#fde68a", outline, 4);
        ctx.fillStyle = outline; ctx.beginPath(); ctx.arc(-10, -14, 4, 0, Math.PI * 2); ctx.arc(10, -14, 4, 0, Math.PI * 2); ctx.fill();
      } else if (petType === "pig") {
        fillRoundRect(ctx, -26, -34, 52, 54, 24, "#fbcfe8", outline, 6);
        ctx.fillStyle = outline; ctx.beginPath(); ctx.arc(-10, -12, 4, 0, Math.PI * 2); ctx.arc(10, -12, 4, 0, Math.PI * 2); ctx.fill();
        fillRoundRect(ctx, -12, -4, 24, 15, 7, "#f472b6", outline, 4);
      }
      ctx.restore();
    });
    return true;
  }

  return false;
}

// ============================================================================
// 8. V3.0 이펙트 썸네일 + 실시간 후면/전면 파티클 렌더러 + 오프스크린 캐시 애니메이션
// ============================================================================
function drawV3EffectThumbnail(ctx, item) {
  if (!item) return;
  const id = item.id || "none";
  const outline = "#1e1b18";

  if (id === "none") {
    ctx.strokeStyle = "#57534e"; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(120, 120, 44, 0, Math.PI * 2); ctx.moveTo(90, 90); ctx.lineTo(150, 150); ctx.stroke();
    return;
  }

  if (id.startsWith("fx_aura_")) {
    const col = item.color || "#a855f7";
    const glow = ctx.createRadialGradient(120, 134, 10, 120, 134, 72);
    glow.addColorStop(0, col);
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(120, 134, 72, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.ellipse(120, 150, 74, 28, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.ellipse(120, 150, 74, 28, 0, 0, Math.PI * 2); ctx.stroke();
    drawSparkle(ctx, 120, 90, 18, col);
    drawSparkle(ctx, 74, 118, 10, "#ffffff");
    return;
  }

  if (id === "fx_snow") {
    [[82, 74, 14], [156, 86, 12], [116, 134, 16], [76, 166, 10], [164, 162, 11]].forEach(([x, y, r]) => {
      ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
  } else if (id === "fx_rain") {
    ctx.strokeStyle = "#0284c7"; ctx.lineWidth = 9; ctx.lineCap = "round";
    [[78, 62], [122, 48], [166, 72], [94, 126], [146, 134]].forEach(([x, y]) => {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 16, y + 36); ctx.stroke();
    });
  } else if (id === "fx_whirlwind") {
    ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 10; ctx.lineCap = "round";
    [82, 118, 154].forEach((y, i) => {
      ctx.beginPath(); ctx.ellipse(120, y, 56 - i * 10, 16, 0, 0, Math.PI * 2); ctx.stroke();
    });
  } else if (id === "fx_maple") {
    [[84, 84, -0.3], [152, 104, 0.4], [116, 156, 0.1]].forEach(([x, y, rot]) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      drawStar(ctx, 0, 0, 26, 11, 5, "#ea580c", outline, 3.5);
      ctx.restore();
    });
  } else if (id === "fx_confetti") {
    [["#f43f5e", 78, 76], ["#facc15", 148, 68], ["#38bdf8", 112, 124], ["#4ade80", 78, 160], ["#a855f7", 158, 152]].forEach(([col, x, y]) => {
      fillRoundRect(ctx, x - 11, y - 7, 22, 14, 3, col, outline, 2.5);
    });
  } else if (id === "fx_stars") {
    drawStar(ctx, 94, 86, 26, 12, 5, "#fde047", outline, 4);
    drawStar(ctx, 158, 116, 18, 8, 5, "#fef08a", outline, 3);
    drawStar(ctx, 96, 158, 15, 7, 5, "#facc15", outline, 3);
  } else if (id === "fx_feathers") {
    [[88, 92, -0.4], [148, 128, 0.35]].forEach(([x, y, rot]) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#64748b"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(0, 0, 16, 42, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(0, 42); ctx.stroke();
      ctx.restore();
    });
  } else if (id === "fx_notes") {
    ctx.fillStyle = "#ec4899"; ctx.strokeStyle = outline; ctx.lineWidth = 4;
    ctx.font = "900 72px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("♫", 104, 108); ctx.strokeText("♫", 104, 108);
    ctx.font = "900 54px sans-serif"; ctx.fillStyle = "#38bdf8";
    ctx.fillText("♪", 162, 150);
  } else if (id === "fx_ghost") {
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = outline; ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.moveTo(76, 168); ctx.lineTo(76, 112); ctx.arc(120, 112, 44, Math.PI, 0);
    ctx.lineTo(164, 168); ctx.lineTo(142, 152); ctx.lineTo(120, 168); ctx.lineTo(98, 152);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = outline; ctx.beginPath(); ctx.arc(106, 114, 6, 0, Math.PI * 2); ctx.arc(134, 114, 6, 0, Math.PI * 2); ctx.fill();
  } else if (id === "fx_awakening") {
    ctx.fillStyle = "#f97316"; ctx.strokeStyle = outline; ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(120, 38); ctx.lineTo(154, 102); ctx.lineTo(176, 92); ctx.lineTo(162, 178);
    ctx.lineTo(78, 178); ctx.lineTo(64, 92); ctx.lineTo(86, 102); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fde047";
    ctx.beginPath(); ctx.moveTo(120, 64); ctx.lineTo(146, 126); ctx.lineTo(138, 174); ctx.lineTo(102, 174); ctx.lineTo(94, 126); ctx.closePath(); ctx.fill();
  } else if (id === "fx_electric") {
    ctx.fillStyle = "#38bdf8"; ctx.strokeStyle = outline; ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(138, 42); ctx.lineTo(78, 126); ctx.lineTo(118, 126);
    ctx.lineTo(98, 198); ctx.lineTo(168, 108); ctx.lineTo(124, 108);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (id === "fx_flies") {
    [[84, 88], [156, 98], [116, 152]].forEach(([x, y]) => {
      ctx.fillStyle = "rgba(226,232,240,0.85)";
      ctx.beginPath(); ctx.ellipse(x - 10, y - 8, 10, 6, -0.4, 0, Math.PI * 2); ctx.ellipse(x + 10, y - 8, 10, 6, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#0f172a"; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
    });
  }
}

function drawV3EffectLayer(ctx, W, H, effectId, phaseSec, layerSide = "front", maxParticles = 8) {
  if (!effectId || effectId === "none") return;
  const cx = W * 0.5;
  const footY = H * 0.84;
  const minD = Math.min(W, H);
  const t = phaseSec;
  ctx.save();

  // 1) 후면 레이어 (바닥 오오라 6종 · 회오리 후면 · 초각성 오오라)
  if (layerSide === "back") {
    if (effectId.startsWith("fx_aura_")) {
      const colMap = {
        fx_aura_purple: ["#a855f7", "#e9d5ff"],
        fx_aura_black: ["#0f172a", "#475569"],
        fx_aura_gold: ["#facc15", "#fef9c3"],
        fx_aura_red: ["#ef4444", "#fecaca"],
        fx_aura_blue: ["#38bdf8", "#e0f2fe"],
        fx_aura_green: ["#22c55e", "#dcfce7"]
      };
      const [mainC, lightC] = colMap[effectId] || ["#a855f7", "#e9d5ff"];
      const pulse = 1 + Math.sin(t * 4.2) * 0.08;
      const g = ctx.createRadialGradient(cx, footY, minD * 0.04, cx, footY, minD * 0.36 * pulse);
      g.addColorStop(0, mainC);
      g.addColorStop(0.6, mainC + "88");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(cx, footY, minD * 0.36 * pulse, minD * 0.14 * pulse, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = lightC;
      ctx.lineWidth = Math.max(2, minD * 0.012);
      ctx.beginPath(); ctx.ellipse(cx, footY, minD * 0.28 * pulse, minD * 0.1 * pulse, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (effectId === "fx_awakening") {
      const p = 1 + Math.sin(t * 10) * 0.07;
      const fg = ctx.createRadialGradient(cx, H * 0.56, minD * 0.08, cx, H * 0.56, minD * 0.44 * p);
      fg.addColorStop(0, "rgba(253, 224, 71, 0.72)");
      fg.addColorStop(0.55, "rgba(249, 115, 22, 0.48)");
      fg.addColorStop(1, "rgba(239, 68, 68, 0)");
      ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 6; i++) {
        const off = ((t * 1.8 + i / 6) % 1);
        const fx = cx + Math.sin(i * 2.1 + t * 5) * minD * 0.24 * (1 - off * 0.4);
        const fy = footY - off * H * 0.62;
        ctx.globalAlpha = (1 - off) * 0.85;
        ctx.fillStyle = i % 2 === 0 ? "#fde047" : "#f97316";
        ctx.beginPath(); ctx.moveTo(fx, fy - minD * 0.07); ctx.lineTo(fx + minD * 0.035, fy); ctx.lineTo(fx - minD * 0.035, fy); ctx.closePath(); ctx.fill();
      }
    } else if (effectId === "fx_whirlwind") {
      ctx.strokeStyle = "rgba(125, 211, 252, 0.52)";
      ctx.lineWidth = Math.max(2, minD * 0.015);
      for (let i = 0; i < 3; i++) {
        const y = H * (0.34 + i * 0.22) + Math.sin(t * 6 + i) * 5;
        ctx.beginPath(); ctx.ellipse(cx, y, minD * (0.28 + i * 0.04), minD * 0.07, 0, Math.PI, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.restore();
    return;
  }

  // 2) 전면 레이어 (날씨·파티클·전기·파리·회오리 앞줄)
  const count = Math.max(3, Math.min(8, maxParticles || 8));
  if (effectId === "fx_whirlwind") {
    ctx.strokeStyle = "rgba(224, 242, 254, 0.82)";
    ctx.lineWidth = Math.max(2, minD * 0.012);
    for (let i = 0; i < 3; i++) {
      const y = H * (0.36 + i * 0.22) + Math.sin(t * 6 + i) * 5;
      ctx.beginPath(); ctx.ellipse(cx, y, minD * (0.28 + i * 0.04), minD * 0.07, 0, 0, Math.PI); ctx.stroke();
    }
  } else if (effectId === "fx_snow") {
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < count; i++) {
      const prog = ((t * 0.42 + i / count) % 1);
      const sx = W * (0.14 + ((i * 37) % 72) / 100) + Math.sin(t * 2.5 + i) * minD * 0.04;
      const sy = H * prog;
      ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.arc(sx, sy, minD * (0.014 + (i % 2) * 0.008), 0, Math.PI * 2); ctx.fill();
    }
  } else if (effectId === "fx_rain") {
    ctx.strokeStyle = "rgba(147, 197, 253, 0.85)";
    ctx.lineWidth = Math.max(1.5, minD * 0.008);
    ctx.lineCap = "round";
    for (let i = 0; i < count; i++) {
      const prog = ((t * 1.45 + i / count) % 1);
      const rx = W * (0.15 + ((i * 29) % 72) / 100) - prog * minD * 0.1;
      const ry = H * prog;
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - minD * 0.03, ry + minD * 0.08); ctx.stroke();
    }
  } else if (effectId === "fx_maple") {
    for (let i = 0; i < Math.min(6, count); i++) {
      const prog = ((t * 0.35 + i / 6) % 1);
      const mx = W * (0.16 + (i * 0.14)) + Math.sin(t * 2.2 + i * 1.4) * minD * 0.07;
      const my = H * prog;
      ctx.save(); ctx.translate(mx, my); ctx.rotate(t * 2 + i);
      ctx.fillStyle = i % 2 === 0 ? "#ea580c" : "#ef4444";
      ctx.beginPath(); ctx.arc(0, 0, minD * 0.024, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  } else if (effectId === "fx_confetti") {
    const palette = ["#f43f5e", "#facc15", "#38bdf8", "#4ade80", "#a855f7"];
    for (let i = 0; i < count; i++) {
      const prog = ((t * 0.55 + i / count) % 1);
      const px = W * (0.14 + ((i * 23) % 74) / 100) + Math.cos(t * 4 + i) * minD * 0.04;
      const py = H * prog;
      ctx.save(); ctx.translate(px, py); ctx.rotate(t * 4 + i);
      ctx.fillStyle = palette[i % palette.length];
      ctx.fillRect(-minD * 0.018, -minD * 0.01, minD * 0.036, minD * 0.02);
      ctx.restore();
    }
  } else if (effectId === "fx_stars") {
    for (let i = 0; i < Math.min(6, count); i++) {
      const prog = ((t * 0.65 + i / 6) % 1);
      const sx = W * (0.85 - ((i * 27) % 68) / 100 - prog * 0.25);
      const sy = H * (prog * 0.9);
      ctx.globalAlpha = Math.sin(prog * Math.PI);
      if (typeof drawStar === "function") {
        drawStar(ctx, sx, sy, minD * 0.032, minD * 0.014, 5, "#fde047", "#1e1b18", 1.5);
      }
    }
  } else if (effectId === "fx_feathers") {
    for (let i = 0; i < Math.min(6, count); i++) {
      const prog = ((t * 0.3 + i / 6) % 1);
      const fx = W * (0.18 + (i * 0.13)) + Math.sin(t * 2 + i) * minD * 0.06;
      const fy = H * prog;
      ctx.save(); ctx.translate(fx, fy); ctx.rotate(Math.sin(t * 2 + i) * 0.5);
      ctx.fillStyle = "rgba(255,255,255,0.92)"; ctx.strokeStyle = "#64748b"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, 0, minD * 0.014, minD * 0.036, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  } else if (effectId === "fx_notes") {
    const syms = ["♪", "♫", "♩"];
    const cols = ["#ec4899", "#38bdf8", "#facc15"];
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `900 ${Math.round(minD * 0.075)}px sans-serif`;
    for (let i = 0; i < Math.min(5, count); i++) {
      const prog = ((t * 0.45 + i / 5) % 1);
      const nx = cx + Math.sin(i * 1.9 + t * 2.2) * minD * 0.34;
      const ny = H * 0.72 - prog * H * 0.52;
      ctx.globalAlpha = prog < 0.2 ? prog * 5 : Math.max(0, 1 - (prog - 0.2) / 0.8);
      ctx.fillStyle = cols[i % cols.length];
      ctx.strokeStyle = "#1e1b18"; ctx.lineWidth = 2.5;
      ctx.strokeText(syms[i % syms.length], nx, ny);
      ctx.fillText(syms[i % syms.length], nx, ny);
    }
  } else if (effectId === "fx_ghost") {
    const gx = cx + Math.cos(t * 2.2) * minD * 0.32;
    const gy = H * 0.36 + Math.sin(t * 3.4) * minD * 0.06;
    const gr = minD * 0.075;
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#1e1b18"; ctx.lineWidth = Math.max(2, minD * 0.01);
    ctx.beginPath();
    ctx.moveTo(gx - gr, gy + gr * 0.7);
    ctx.lineTo(gx - gr, gy);
    ctx.arc(gx, gy, gr, Math.PI, 0);
    ctx.lineTo(gx + gr, gy + gr * 0.7);
    ctx.lineTo(gx + gr * 0.4, gy + gr * 0.4);
    ctx.lineTo(gx, gy + gr * 0.75);
    ctx.lineTo(gx - gr * 0.4, gy + gr * 0.4);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#1e1b18";
    ctx.beginPath(); ctx.arc(gx - gr * 0.35, gy, gr * 0.16, 0, Math.PI * 2); ctx.arc(gx + gr * 0.35, gy, gr * 0.16, 0, Math.PI * 2); ctx.fill();
  } else if (effectId === "fx_electric" || effectId === "fx_awakening") {
    const boltColor = effectId === "fx_awakening" ? "#fde047" : "#38bdf8";
    ctx.strokeStyle = boltColor;
    ctx.lineWidth = Math.max(2, minD * 0.012);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (let i = 0; i < 4; i++) {
      const ang = (t * 5 + i * 1.57);
      const bx = cx + Math.cos(ang) * minD * 0.28;
      const by = H * 0.5 + Math.sin(ang * 1.3) * minD * 0.24;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + minD * 0.04, by + minD * 0.05);
      ctx.lineTo(bx - minD * 0.02, by + minD * 0.07);
      ctx.lineTo(bx + minD * 0.03, by + minD * 0.12);
      ctx.stroke();
    }
  } else if (effectId === "fx_flies") {
    for (let i = 0; i < 3; i++) {
      const ang = t * (4 + i * 0.9) + i * 2.1;
      const fx = cx + Math.cos(ang) * minD * (0.18 + i * 0.05);
      const fy = H * 0.24 + Math.sin(ang * 1.7) * minD * 0.08;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath(); ctx.ellipse(fx - 3, fy - 3, 4, 2.5, -0.4, 0, Math.PI * 2); ctx.ellipse(fx + 3, fy - 3, 4, 2.5, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#0f172a"; ctx.beginPath(); ctx.arc(fx, fy, Math.max(2.5, minD * 0.014), 0, Math.PI * 2); ctx.fill();
    }
  }

  ctx.restore();
}

// ============================================================================
// 9. 오프스크린 아바타 캐싱 & 30fps 경량 이펙트 애니메이션 드라이버
// ============================================================================
const AvatarRenderEngine = (() => {
  const staticCache = new Map();
  const MAX_CACHE = 64;
  const activeCanvases = new Map();
  let rafId = null;
  let lastTickMs = 0;

  function buildStaticCacheKey(cfg, W, H, opts) {
    const clean = { ...(cfg || {}) };
    delete clean.effect;
    return `${W}x${H}|t:${opts?.transparentBg ? 1 : 0}|cx:${opts?.charCenterX ?? "c"}|cy:${opts?.charOffsetY ?? 14}|fi:${opts?.fishingIdle ? 1 : 0}|bl:${opts?.forceEyeBlink ? 1 : 0}|ho:${opts?.headOnly ? 1 : 0}|${JSON.stringify(clean)}`;
  }

  function getOrBakeStaticCanvas(cfg, W, H, opts, bakeFn) {
    const key = buildStaticCacheKey(cfg, W, H, opts);
    if (staticCache.has(key)) {
      const hit = staticCache.get(key);
      staticCache.delete(key);
      staticCache.set(key, hit);
      return hit;
    }
    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    bakeFn(off);
    staticCache.set(key, off);
    if (staticCache.size > MAX_CACHE) {
      const oldestKey = staticCache.keys().next().value;
      staticCache.delete(oldestKey);
    }
    return off;
  }

  function renderCompositeFrame(canvas, entry, phaseSec) {
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    if (!entry.opts.transparentBg && entry.bgOffscreen) {
      ctx.drawImage(entry.bgOffscreen, 0, 0, W, H);
    }
    drawV3EffectLayer(ctx, W, H, entry.effectId, phaseSec, "back", entry.maxParticles);

    const useBlink =
      entry.charBlinkOffscreen &&
      ((phaseSec + (entry.blinkOffset || 0)) % 3.6) < 0.14;
    const charImg = useBlink ? entry.charBlinkOffscreen : entry.charOffscreen;

    if (entry.opts && entry.opts.idleAnim) {
      // 발바닥(400)을 바닥에 고정한 채 무릎만 가볍게 굽혔다 펴는 리듬 바운스
      const cycle = (phaseSec + (entry.idlePhaseOffset || 0)) * (Math.PI * 2 / 1.38);
      const bend = 0.5 - 0.5 * Math.cos(cycle);
      const sx = 1 + bend * 0.02;
      const sy = 1 - bend * 0.046;
      const anchorX = entry.opts.footAnchorX !== undefined ? entry.opts.footAnchorX : W / 2;
      const anchorY = entry.opts.footAnchorY !== undefined ? entry.opts.footAnchorY : H * 0.85;
      ctx.save();
      ctx.translate(anchorX, anchorY);
      ctx.scale(sx, sy);
      ctx.translate(-anchorX, -anchorY);
      ctx.drawImage(charImg, 0, 0, W, H);
      ctx.restore();
    } else {
      ctx.drawImage(charImg, 0, 0, W, H);
    }

    drawV3EffectLayer(ctx, W, H, entry.effectId, phaseSec, "front", entry.maxParticles);
    ctx.restore();
  }

  function isCanvasActuallyVisible(canvas) {
    if (!canvas || !canvas.isConnected) return false;
    if (document.hidden) return false;
    if (canvas.offsetParent === null) {
      const style = window.getComputedStyle ? getComputedStyle(canvas) : null;
      if (!style || style.display === "none") return false;
    }
    const screenAncestor = canvas.closest(".screen-view, .modal-backdrop");
    if (screenAncestor && screenAncestor.classList.contains("hidden")) return false;
    return true;
  }

  function stepLoop(nowMs) {
    if (activeCanvases.size === 0) {
      rafId = null;
      return;
    }
    if (nowMs - lastTickMs >= 28) {
      lastTickMs = nowMs;
      const phaseSec = nowMs / 1000;
      for (const [cv, entry] of activeCanvases.entries()) {
        if (!cv.isConnected) {
          activeCanvases.delete(cv);
          continue;
        }
        if (!isCanvasActuallyVisible(cv)) continue;
        const tickMs = Number(entry.tickMs) || 33;
        if (entry._lastDrawMs && nowMs - entry._lastDrawMs < tickMs) continue;
        entry._lastDrawMs = nowMs;
        renderCompositeFrame(cv, entry, phaseSec);
      }
    }
    if (activeCanvases.size > 0) {
      rafId = requestAnimationFrame(stepLoop);
    } else {
      rafId = null;
    }
  }

  function ensureLoopStarted() {
    if (!rafId && activeCanvases.size > 0) {
      rafId = requestAnimationFrame(stepLoop);
    }
  }

  function unregisterCanvas(canvas) {
    activeCanvases.delete(canvas);
  }

  function registerCanvas(canvas, entry) {
    if (!canvas || !entry) return;
    const seed = canvas.id
      ? canvas.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
      : Math.floor(Math.random() * 100);
    entry.blinkOffset = (seed % 17) * 0.21;
    entry.idlePhaseOffset = (seed % 11) * 0.13;
    entry._lastDrawMs = performance.now();
    activeCanvases.set(canvas, entry);
    renderCompositeFrame(canvas, entry, performance.now() / 1000);
    ensureLoopStarted();
  }

  function warmupAvatar(config) {
    if (typeof renderPixelAvatar !== "function" || !config) return;
    try {
      const dummyFull = document.createElement("canvas");
      dummyFull.width = 840;
      dummyFull.height = 525;
      renderPixelAvatar(dummyFull, config, { transparentBg: false, matchCssAspect: false, skipEffectLoop: true });

      const dummyChar = document.createElement("canvas");
      dummyChar.width = 480;
      dummyChar.height = 480;
      renderPixelAvatar(dummyChar, config, { transparentBg: true, matchCssAspect: false, skipEffectLoop: true });
    } catch (e) {}
  }

  return {
    getOrBakeStaticCanvas,
    renderCompositeFrame,
    registerCanvas,
    unregisterCanvas,
    warmupAvatar,
    clearCache: () => staticCache.clear()
  };
})();
