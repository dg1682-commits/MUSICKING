// ============================================================================
// [음악왕 v3.0] 48x48 고밀도 스무스 도트 캐릭터 렌더러 & 상점 시스템 (pixel_avatar.js)
// - 기본 캐릭터 남/여(male/female) 선택 지원
// - 48x48 세밀한 도트 그리드 + 명암/하이라이트/외곽선으로 부드러운 상용 도트 퀄리티 구현
// - 닉네임 변경권 아이템 판매 및 관리자 백엔드 상점 설정 실시간 연동 지원
// ============================================================================

const BASE_AVATAR_SHOP_ITEMS = {
  bg: [
    { id: "meadow", name: "헤네시스 초원 (기본)", price: 0, colors: ["#88d4ff", "#d4f1ff", "#65cf55", "#43a836"] },
    { id: "neon", name: "네온 뮤직뱅크 홀", price: 40, colors: ["#1e1b4b", "#3730a3", "#f43f5e", "#4f46e5"] },
    { id: "sakura", name: "봄날 벚꽃 스테이지", price: 50, colors: ["#fecdd3", "#ffe4e6", "#f472b6", "#e11d48"] },
    { id: "galaxy", name: "스타라이트 우주돔", price: 80, colors: ["#090d16", "#1e293b", "#38bdf8", "#6366f1"] },
    { id: "royal", name: "음악왕 황금 성전", price: 150, colors: ["#fde68a", "#fef3c7", "#f59e0b", "#b45309"] }
  ],
  hair: [
    { id: "default", name: "내추럴 블랙 (기본)", price: 0, color: "#27272a", highlight: "#52525b", style: "default" },
    { id: "blonde", name: "샤이닝 금발", price: 30, color: "#eab308", highlight: "#fef08a", style: "default" },
    { id: "pink_twin", name: "러블리 핑크 트윈", price: 60, color: "#ec4899", highlight: "#fbcfe8", style: "twin" },
    { id: "retro_90s", name: "90s 브릿지 더듬이", price: 50, color: "#78350f", highlight: "#d97706", style: "antenna" },
    { id: "rock_red", name: "록스타 크림슨 장발", price: 70, color: "#dc2626", highlight: "#fca5a5", style: "long" },
    { id: "mint_pop", name: "소다 민트 아이돌", price: 65, color: "#14b8a6", highlight: "#99f6e4", style: "default" },
    { id: "silver_wolf", name: "실버 울프컷", price: 85, color: "#64748b", highlight: "#e2e8f0", style: "long" }
  ],
  hat: [
    { id: "none", name: "착용 안 함", price: 0 },
    { id: "headset", name: "프로 게이밍 헤드셋", price: 45, color: "#0ea5e9", sub: "#bae6fd" },
    { id: "cat_ear", name: "네코미미 헤드폰", price: 65, color: "#f43f5e", sub: "#fecdd3" },
    { id: "beanie", name: "스트릿 힙합 비니", price: 40, color: "#2563eb", sub: "#93c5fd" },
    { id: "beret", name: "아티스트 베레모", price: 55, color: "#e11d48", sub: "#fda4af" },
    { id: "angel", name: "천사의 헤일로 링", price: 90, color: "#facc15", sub: "#fef9c3" },
    { id: "crown", name: "전설의 음악왕 크라운", price: 200, color: "#f59e0b", sub: "#fef08a" }
  ],
  face: [
    { id: "default", name: "초롱초롱 눈망울 (기본)", price: 0 },
    { id: "wink", name: "엔딩요정 윙크", price: 30 },
    { id: "sunglass", name: "연예인 블랙 선글라스", price: 50 },
    { id: "star_glass", name: "슈퍼스타 별안경", price: 75 },
    { id: "singing", name: "고음폭발 열창 표정", price: 40 }
  ],
  outfit: [
    { id: "basic", name: "연습생 후드티 (기본)", price: 0, main: "#4f46e5", sub: "#e0e7ff" },
    { id: "overalls", name: "90s 캔디 멜빵룩", price: 50, main: "#f97316", sub: "#2563eb" },
    { id: "uniform", name: "하이스쿨 교복", price: 60, main: "#1e293b", sub: "#ef4444" },
    { id: "idol_suit", name: "시상식 왕자/공주 제복", price: 85, main: "#0284c7", sub: "#facc15" },
    { id: "rock_leather", name: "인디밴드 라이더재킷", price: 80, main: "#18181b", sub: "#e11d48" },
    { id: "king_robe", name: "음악왕 임페리얼 망토", price: 180, main: "#b45309", sub: "#fde047" }
  ],
  acc: [
    { id: "none", name: "착용 안 함", price: 0 },
    { id: "mic_silver", name: "스튜디오 실버 마이크", price: 0, color: "#94a3b8" },
    { id: "mic_gold", name: "대상 수상 황금마이크", price: 120, color: "#facc15" },
    { id: "guitar", name: "커스텀 레드 일렉기타", price: 110, color: "#ef4444" },
    { id: "lightstick", name: "팬클럽 하트 응원봉", price: 70, color: "#ec4899" },
    { id: "boombox", name: "90s 힙합 붐박스", price: 95, color: "#475569" }
  ],
  special: [
    {
      id: "nickname_ticket",
      name: "✨ 닉네임 변경권",
      price: 100,
      consumable: true,
      desc: "원하는 새 닉네임으로 즉시 변경할 수 있는 스페셜 티켓"
    }
  ]
};

let AVATAR_SHOP_ITEMS = JSON.parse(JSON.stringify(BASE_AVATAR_SHOP_ITEMS));

const DEFAULT_AVATAR_CONFIG = {
  gender: "male", // 'male' | 'female'
  bg: "meadow",
  hair: "default",
  hat: "none",
  face: "default",
  outfit: "basic",
  acc: "mic_silver"
};

function applyServerShopCatalog(customCatalog) {
  if (!customCatalog || typeof customCatalog !== "object") return;
  Object.keys(customCatalog).forEach(cat => {
    if (Array.isArray(customCatalog[cat])) {
      AVATAR_SHOP_ITEMS[cat] = customCatalog[cat];
    }
  });
}

function getItemById(category, id) {
  const list = AVATAR_SHOP_ITEMS[category] || [];
  return list.find(item => item.id === id) || list[0] || { id: "none", name: "없음", price: 0 };
}

// ============================================================================
// 48x48 고밀도 스무스 도트 캐릭터 렌더러 (기존 대비 4배 해상도 + 남/여 구분)
// ============================================================================
function renderPixelAvatar(canvas, config = DEFAULT_AVATAR_CONFIG, options = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const grid = 48;
  const px = w / grid;

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);

  const cfg = { ...DEFAULT_AVATAR_CONFIG, ...(config || {}) };
  const isFemale = cfg.gender === "female";

  const bgItem = getItemById("bg", cfg.bg);
  const hairItem = getItemById("hair", cfg.hair);
  const hatItem = getItemById("hat", cfg.hat);
  const faceItem = getItemById("face", cfg.face);
  const outfitItem = getItemById("outfit", cfg.outfit);
  const accItem = getItemById("acc", cfg.acc);

  const r = (x, y, rw, rh, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x * px), Math.floor(y * px), Math.ceil(rw * px), Math.ceil(rh * px));
  };

  // 1. 배경 스테이지 (48x48 정밀 도트 배경)
  if (!options.transparentBg && bgItem && bgItem.colors) {
    r(0, 0, 48, 36, bgItem.colors[0]);
    r(0, 8, 48, 28, bgItem.colors[1]);
    // 구름 및 반짝이 도트
    r(5, 6, 9, 3, "rgba(255,255,255,0.85)");
    r(7, 4, 5, 2, "rgba(255,255,255,0.85)");
    r(33, 8, 10, 3, "rgba(255,255,255,0.85)");
    r(35, 6, 6, 2, "rgba(255,255,255,0.85)");
    // 스테이지 바닥
    r(0, 35, 48, 3, bgItem.colors[2]);
    r(0, 38, 48, 10, bgItem.colors[3]);
    // 잔디/조명 도트 디테일
    for (let i = 2; i < 46; i += 6) {
      r(i, 34, 2, 1, bgItem.colors[2]);
    }
  }

  // 발밑 그림자 (부드러운 타원형 도트)
  r(14, 39, 20, 2, "rgba(15,23,42,0.22)");
  r(16, 38, 16, 1, "rgba(15,23,42,0.15)");

  const outline = "#1e293b";
  const skinLight = "#fff3e6";
  const skinBase = "#ffe4c8";
  const skinShade = "#f5cba7";
  const hairColor = hairItem.color || "#27272a";
  const hairHi = hairItem.highlight || "#52525b";

  // 2. 뒷머리 & 망토 레이어
  if (outfitItem.id === "king_robe") {
    r(11, 25, 26, 14, "#991b1b");
    r(12, 26, 24, 12, "#dc2626");
    r(11, 37, 26, 2, "#facc15");
  }

  if (hairItem.style === "long" || (isFemale && hairItem.style === "default")) {
    r(12, 16, 24, 16, outline);
    r(13, 17, 22, 14, hairColor);
  }
  if (hairItem.style === "twin" || (isFemale && hairItem.id === "pink_twin")) {
    r(7, 17, 6, 14, outline);
    r(8, 18, 4, 12, hairColor);
    r(35, 17, 6, 14, outline);
    r(36, 18, 4, 12, hairColor);
  }

  // 3. 다리 & 신발
  r(18, 34, 4, 5, outline);
  r(26, 34, 4, 5, outline);
  r(19, 34, 2, 3, skinBase);
  r(27, 34, 2, 3, skinBase);
  // 신발
  r(17, 37, 6, 3, outline);
  r(25, 37, 6, 3, outline);
  r(18, 37, 4, 2, isFemale ? "#e11d48" : "#334155");
  r(26, 37, 4, 2, isFemale ? "#e11d48" : "#334155");

  // 4. 몸통 & 의상 (남/여 핏 디테일)
  const outMain = outfitItem.main || "#4f46e5";
  const outSub = outfitItem.sub || "#ffffff";

  r(15, 25, 18, 10, outline);
  r(16, 26, 16, 8, outMain);
  // 중앙 이너/넥라인 포인트
  r(21, 26, 6, 6, outSub);
  r(22, 26, 4, 2, skinShade);

  // 여캐 스커트 / 남캐 팬츠 라인
  if (isFemale) {
    r(14, 32, 20, 3, outline);
    r(15, 32, 18, 2, outSub);
  } else {
    r(16, 32, 16, 3, "#1e293b");
  }

  // 양팔 & 손
  r(12, 26, 4, 7, outline);
  r(13, 27, 2, 5, outMain);
  r(13, 31, 2, 2, skinBase);

  r(32, 26, 4, 7, outline);
  r(33, 27, 2, 5, outMain);
  r(33, 31, 2, 2, skinBase);

  // 5. 얼굴 & 귀 (부드러운 곡선형 48x48 도트 헤드)
  r(14, 11, 20, 15, outline);
  r(13, 13, 22, 11, outline);
  r(15, 12, 18, 13, skinBase);
  r(14, 14, 20, 9, skinBase);
  r(16, 13, 16, 3, skinLight);
  r(16, 23, 16, 2, skinShade);

  // 양쪽 귀
  r(11, 17, 3, 5, outline);
  r(12, 18, 2, 3, skinShade);
  r(34, 17, 3, 5, outline);
  r(34, 18, 2, 3, skinShade);

  // 볼터치 (여캐는 더 화사한 핑크)
  r(15, 21, 3, 2, isFemale ? "#fb7185" : "#fda4af");
  r(30, 21, 3, 2, isFemale ? "#fb7185" : "#fda4af");

  // 6. 눈매 & 표정 & 안경
  if (isFemale) {
    // 여캐 속눈썹 포인트
    r(16, 17, 1, 1, outline);
    r(31, 17, 1, 1, outline);
  }

  if (faceItem.id === "wink") {
    r(17, 19, 4, 1, outline);
    r(18, 18, 2, 1, outline);
    // 오른쪽 눈 초롱초롱
    r(27, 17, 4, 4, outline);
    r(27, 17, 2, 2, "#ffffff");
    r(29, 19, 2, 2, "#4f46e5");
    r(22, 22, 4, 2, "#f43f5e");
  } else if (faceItem.id === "sunglass") {
    r(14, 17, 20, 2, "#0f172a");
    r(16, 17, 7, 4, "#0f172a");
    r(25, 17, 7, 4, "#0f172a");
    r(17, 18, 2, 1, "#38bdf8");
    r(26, 18, 2, 1, "#38bdf8");
    r(22, 22, 4, 1, "#e11d48");
  } else if (faceItem.id === "star_glass") {
    r(15, 16, 7, 5, "#facc15");
    r(26, 16, 7, 5, "#facc15");
    r(17, 17, 3, 3, "#1e293b");
    r(28, 17, 3, 3, "#1e293b");
    r(22, 22, 4, 2, "#f43f5e");
  } else if (faceItem.id === "singing") {
    r(17, 18, 4, 2, outline);
    r(27, 18, 4, 2, outline);
    r(21, 21, 6, 3, "#be123c");
    r(22, 22, 4, 2, "#fb7185");
  } else {
    // 기본 초롱초롱 큰 눈
    r(17, 17, 4, 4, outline);
    r(27, 17, 4, 4, outline);
    r(17, 17, 2, 2, "#ffffff");
    r(27, 17, 2, 2, "#ffffff");
    r(19, 19, 2, 2, "#312e81");
    r(29, 19, 2, 2, "#312e81");
    // 미소 입
    r(22, 22, 4, 1, "#e11d48");
    if (isFemale) r(23, 23, 2, 1, "#fb7185");
  }

  // 7. 앞머리 & 헤어 결 + 엔젤링 하이라이트
  r(13, 9, 22, 5, outline);
  r(12, 11, 24, 5, hairColor);
  r(14, 10, 20, 4, hairColor);
  // 머리결 엔젤링 하이라이트
  r(16, 11, 5, 2, hairHi);
  r(26, 11, 5, 2, hairHi);
  // 앞머리 잔머리 디테일
  r(13, 14, 3, 5, hairColor);
  r(32, 14, 3, 5, hairColor);
  r(18, 14, 3, 2, hairColor);
  r(25, 14, 4, 2, hairColor);

  if (hairItem.style === "antenna") {
    r(17, 14, 2, 5, hairColor);
    r(29, 14, 2, 5, hairColor);
  }

  // 여캐 기본 리본핀 포인트
  if (isFemale && hatItem.id === "none") {
    r(31, 11, 4, 3, "#f43f5e");
    r(32, 12, 2, 1, "#ffe4e6");
  }

  // 8. 모자 / 헤드셋 / 왕관
  if (hatItem.id === "headset") {
    r(12, 8, 24, 2, hatItem.color);
    r(10, 14, 3, 7, outline);
    r(11, 15, 2, 5, hatItem.color);
    r(35, 14, 3, 7, outline);
    r(35, 15, 2, 5, hatItem.color);
  } else if (hatItem.id === "cat_ear") {
    r(12, 8, 24, 2, hatItem.color);
    r(13, 4, 5, 4, hatItem.color);
    r(14, 5, 3, 2, hatItem.sub || "#fecdd3");
    r(30, 4, 5, 4, hatItem.color);
    r(31, 5, 3, 2, hatItem.sub || "#fecdd3");
    r(10, 14, 3, 7, hatItem.color);
    r(35, 14, 3, 7, hatItem.color);
  } else if (hatItem.id === "beanie") {
    r(13, 6, 22, 6, outline);
    r(14, 7, 20, 4, hatItem.color);
    r(13, 10, 22, 2, hatItem.sub || "#93c5fd");
  } else if (hatItem.id === "beret") {
    r(12, 6, 22, 5, outline);
    r(13, 7, 20, 4, hatItem.color);
    r(23, 4, 2, 2, outline);
  } else if (hatItem.id === "angel") {
    r(16, 3, 16, 2, "#facc15");
    r(14, 4, 2, 2, "#fde047");
    r(32, 4, 2, 2, "#fde047");
    r(16, 5, 16, 1, "#fef08a");
  } else if (hatItem.id === "crown") {
    r(15, 3, 18, 6, outline);
    r(16, 5, 16, 4, "#facc15");
    r(16, 3, 3, 2, "#f59e0b");
    r(22, 2, 4, 3, "#f59e0b");
    r(29, 3, 3, 2, "#f59e0b");
    r(23, 6, 2, 2, "#ef4444"); // 중앙 루비
    r(18, 6, 2, 2, "#38bdf8"); // 사파이어
    r(28, 6, 2, 2, "#38bdf8");
  }

  // 9. 손 악기 / 마이크 / 응원봉
  if (accItem.id === "mic_silver" || accItem.id === "mic_gold") {
    r(35, 25, 3, 8, outline);
    r(36, 26, 1, 6, "#475569");
    r(34, 21, 5, 5, outline);
    r(35, 22, 3, 3, accItem.color || "#94a3b8");
  } else if (accItem.id === "guitar") {
    r(31, 24, 9, 9, outline);
    r(32, 25, 7, 7, accItem.color || "#ef4444");
    r(34, 27, 3, 3, "#ffffff");
    r(37, 17, 4, 8, "#78350f");
  } else if (accItem.id === "lightstick") {
    r(35, 25, 3, 8, "#f8fafc");
    r(33, 19, 7, 6, outline);
    r(34, 20, 5, 4, accItem.color || "#ec4899");
  } else if (accItem.id === "boombox") {
    r(32, 27, 12, 8, outline);
    r(33, 28, 10, 6, accItem.color || "#475569");
    r(34, 29, 3, 3, "#0f172a");
    r(39, 29, 3, 3, "#0f172a");
  }
}
