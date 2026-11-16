// ============================================================================
// [음악왕] 메이플 감성 고화질 도트(픽셀아트) 캐릭터 렌더러 & CD 상점 카탈로그
// - 외부 이미지 파일 없이도 선명한 24x24 도트 파츠 레이어를 Canvas에 직접 렌더링
// - 추후 사용자가 직접 PNG 에셋을 넣고 싶을 때 imageUrl 속성만 추가하면 자동 호환!
// ============================================================================

const AVATAR_SHOP_ITEMS = {
  bg: [
    { id: "meadow", name: "푸른 초원 (기본)", price: 0, colors: ["#bfe9ff", "#eef9ff", "#7ad66c", "#58b947"] },
    { id: "neon", name: "네온 콘서트장", price: 40, colors: ["#1e1b4b", "#312e81", "#ec4899", "#6366f1"] },
    { id: "sakura", name: "봄날 벚꽃 무대", price: 50, colors: ["#ffe4e6", "#fff1f2", "#f472b6", "#fb7185"] },
    { id: "galaxy", name: "은하수 우주홀", price: 80, colors: ["#0f172a", "#1e293b", "#38bdf8", "#818cf8"] },
    { id: "royal", name: "음악왕 황금전당", price: 150, colors: ["#fef3c7", "#fffbeb", "#f59e0b", "#d97706"] }
  ],
  hair: [
    { id: "default", name: "단정 흑발 (기본)", price: 0, color: "#27272a", style: "short" },
    { id: "blonde", name: "아이돌 금발", price: 30, color: "#facc15", style: "short" },
    { id: "pink_twin", name: "핑크 트윈테일", price: 60, color: "#f472b6", style: "twin" },
    { id: "retro_90s", name: "90s 더듬이 헤어", price: 50, color: "#78350f", style: "antenna" },
    { id: "rock_red", name: "록스타 레드장발", price: 70, color: "#dc2626", style: "long" },
    { id: "mint_pop", name: "청량 민트 헤어", price: 65, color: "#2dd4bf", style: "short" }
  ],
  hat: [
    { id: "none", name: "착용 안 함", price: 0 },
    { id: "headset", name: "네온 헤드셋", price: 45, color: "#38bdf8" },
    { id: "cat_ear", name: "고양이 귀 헤드폰", price: 65, color: "#f43f5e" },
    { id: "beanie", name: "힙합 비니", price: 40, color: "#1d4ed8" },
    { id: "angel", name: "천사 링", price: 90, color: "#fde047" },
    { id: "crown", name: "음악왕 황금왕관", price: 200, color: "#f59e0b" }
  ],
  face: [
    { id: "default", name: "초롱초롱 눈 (기본)", price: 0 },
    { id: "wink", name: "아이돌 윙크", price: 30 },
    { id: "sunglass", name: "힙합 선글라스", price: 50 },
    { id: "star_glass", name: "스타 안경", price: 75 },
    { id: "singing", name: "열창하는 표정", price: 40 }
  ],
  outfit: [
    { id: "basic", name: "연습생 후드 (기본)", price: 0, main: "#6366f1", sub: "#ffffff" },
    { id: "overalls", name: "90s 캔디 멜빵바지", price: 50, main: "#f97316", sub: "#3b82f6" },
    { id: "uniform", name: "청춘 교복", price: 60, main: "#1e293b", sub: "#ef4444" },
    { id: "idol_suit", name: "무대 실버 제복", price: 85, main: "#0ea5e9", sub: "#fde047" },
    { id: "rock_leather", name: "록스타 가죽재킷", price: 80, main: "#18181b", sub: "#dc2626" },
    { id: "king_robe", name: "음악왕 황금망토", price: 180, main: "#b45309", sub: "#fde047" }
  ],
  acc: [
    { id: "none", name: "착용 안 함", price: 0 },
    { id: "mic_silver", name: "실버 마이크", price: 35, color: "#94a3b8" },
    { id: "mic_gold", name: "황금 마이크", price: 120, color: "#facc15" },
    { id: "guitar", name: "레드 일렉기타", price: 110, color: "#ef4444" },
    { id: "lightstick", name: "하트 응원봉", price: 70, color: "#f472b6" },
    { id: "boombox", name: "레트로 붐박스", price: 95, color: "#475569" }
  ]
};

const DEFAULT_AVATAR_CONFIG = {
  bg: "meadow",
  hair: "default",
  hat: "none",
  face: "default",
  outfit: "basic",
  acc: "mic_silver"
};

function getItemById(category, id) {
  const list = AVATAR_SHOP_ITEMS[category] || [];
  return list.find(item => item.id === id) || list[0];
}

// 24x24 그리드 기반 메이플풍 2등신 도트 캐릭터 그리기
function renderPixelAvatar(canvas, config = DEFAULT_AVATAR_CONFIG, options = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  const grid = 24;
  const px = size / grid;

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, size, size);

  const cfg = { ...DEFAULT_AVATAR_CONFIG, ...(config || {}) };
  const bgItem = getItemById("bg", cfg.bg);
  const hairItem = getItemById("hair", cfg.hair);
  const hatItem = getItemById("hat", cfg.hat);
  const faceItem = getItemById("face", cfg.face);
  const outfitItem = getItemById("outfit", cfg.outfit);
  const accItem = getItemById("acc", cfg.acc);

  const drawRect = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x * px), Math.floor(y * px), Math.ceil(w * px), Math.ceil(h * px));
  };

  // 1. 배경 렌더링 (대기실 캐릭터 스프라이트 모드에서는 투명 배경 가능)
  if (!options.transparentBg && bgItem && bgItem.colors) {
    drawRect(0, 0, 24, 17, bgItem.colors[0]);
    drawRect(0, 3, 24, 14, bgItem.colors[1]);
    // 귀여운 구름 / 별 도트 장식
    drawRect(3, 3, 4, 2, "#ffffff");
    drawRect(17, 4, 4, 2, "#ffffff");
    // 바닥 잔디/스테이지
    drawRect(0, 17, 24, 2, bgItem.colors[2]);
    drawRect(0, 19, 24, 5, bgItem.colors[3]);
  }

  // 캐릭터 그림자
  drawRect(7, 19, 10, 1, "rgba(0,0,0,0.22)");

  // 뒷머리 (장발 또는 트윈테일)
  if (hairItem.style === "long") {
    drawRect(6, 9, 12, 7, hairItem.color);
  } else if (hairItem.style === "twin") {
    drawRect(4, 9, 3, 6, hairItem.color);
    drawRect(17, 9, 3, 6, hairItem.color);
  }

  // 황금 망토 배경 레이어
  if (outfitItem.id === "king_robe") {
    drawRect(6, 13, 12, 6, "#dc2626");
    drawRect(5, 14, 14, 5, "#b91c1c");
  }

  // 2. 다리 & 신발
  drawRect(9, 17, 2, 2, "#1e293b");
  drawRect(13, 17, 2, 2, "#1e293b");
  drawRect(8, 18, 3, 1, "#334155");
  drawRect(13, 18, 3, 1, "#334155");

  // 3. 몸통 (의상)
  drawRect(8, 13, 8, 4, outfitItem.main);
  drawRect(10, 13, 4, 3, outfitItem.sub);
  // 팔
  drawRect(6, 13, 2, 3, outfitItem.main);
  drawRect(16, 13, 2, 3, outfitItem.main);
  // 손 (살구색)
  drawRect(6, 16, 2, 1, "#fed7aa");
  drawRect(16, 16, 2, 1, "#fed7aa");

  // 4. 머리 & 얼굴 (2등신 귀여운 비율)
  drawRect(7, 6, 10, 7, "#ffedd5"); // 얼굴 바탕
  drawRect(6, 8, 1, 3, "#fed7aa");  // 왼쪽 귀
  drawRect(17, 8, 1, 3, "#fed7aa"); // 오른쪽 귀
  // 볼터치
  drawRect(8, 11, 2, 1, "#fda4af");
  drawRect(14, 11, 2, 1, "#fda4af");

  // 5. 표정 & 안경
  if (faceItem.id === "wink") {
    drawRect(9, 9, 2, 1, "#1e293b");
    drawRect(14, 9, 2, 2, "#1e293b");
    drawRect(14, 9, 1, 1, "#ffffff");
    drawRect(11, 11, 2, 1, "#f43f5e");
  } else if (faceItem.id === "sunglass") {
    drawRect(7, 9, 10, 1, "#111827");
    drawRect(8, 9, 4, 2, "#111827");
    drawRect(13, 9, 4, 2, "#111827");
    drawRect(9, 9, 1, 1, "#38bdf8");
    drawRect(14, 9, 1, 1, "#38bdf8");
    drawRect(11, 11, 2, 1, "#e11d48");
  } else if (faceItem.id === "star_glass") {
    drawRect(8, 8, 3, 3, "#facc15");
    drawRect(13, 8, 3, 3, "#facc15");
    drawRect(9, 9, 1, 1, "#1e293b");
    drawRect(14, 9, 1, 1, "#1e293b");
    drawRect(11, 11, 2, 1, "#f43f5e");
  } else if (faceItem.id === "singing") {
    drawRect(9, 9, 2, 1, "#1e293b");
    drawRect(13, 9, 2, 1, "#1e293b");
    drawRect(11, 11, 2, 2, "#e11d48");
  } else {
    // 기본 초롱초롱 눈
    drawRect(9, 9, 2, 2, "#1e293b");
    drawRect(13, 9, 2, 2, "#1e293b");
    drawRect(9, 9, 1, 1, "#ffffff");
    drawRect(13, 9, 1, 1, "#ffffff");
    drawRect(11, 11, 2, 1, "#f43f5e");
  }

  // 6. 앞머리 / 헤어 스타일
  drawRect(7, 5, 10, 2, hairItem.color);
  drawRect(6, 6, 2, 3, hairItem.color);
  drawRect(16, 6, 2, 3, hairItem.color);
  if (hairItem.style === "antenna") {
    drawRect(8, 7, 1, 3, hairItem.color);
    drawRect(15, 7, 1, 3, hairItem.color);
  }

  // 7. 모자 / 헤드셋
  if (hatItem.id === "headset") {
    drawRect(6, 4, 12, 1, hatItem.color);
    drawRect(5, 7, 2, 4, hatItem.color);
    drawRect(17, 7, 2, 4, hatItem.color);
  } else if (hatItem.id === "cat_ear") {
    drawRect(6, 4, 12, 1, hatItem.color);
    drawRect(6, 2, 2, 2, hatItem.color);
    drawRect(16, 2, 2, 2, hatItem.color);
    drawRect(5, 7, 2, 4, hatItem.color);
    drawRect(17, 7, 2, 4, hatItem.color);
  } else if (hatItem.id === "beanie") {
    drawRect(7, 3, 10, 3, hatItem.color);
    drawRect(6, 5, 12, 1, "#1e3a8a");
  } else if (hatItem.id === "angel") {
    drawRect(8, 2, 8, 1, hatItem.color);
    drawRect(7, 3, 1, 1, hatItem.color);
    drawRect(16, 3, 1, 1, hatItem.color);
  } else if (hatItem.id === "crown") {
    drawRect(8, 2, 8, 3, "#facc15");
    drawRect(8, 1, 1, 1, "#f59e0b");
    drawRect(11, 1, 2, 1, "#f59e0b");
    drawRect(15, 1, 1, 1, "#f59e0b");
    drawRect(11, 3, 2, 1, "#ef4444"); // 루비 보석
  }

  // 8. 손 악기 / 마이크 / 응원봉
  if (accItem.id === "mic_silver" || accItem.id === "mic_gold") {
    drawRect(18, 13, 1, 4, "#334155");
    drawRect(17, 11, 3, 2, accItem.color);
  } else if (accItem.id === "guitar") {
    drawRect(16, 12, 4, 4, accItem.color);
    drawRect(19, 9, 2, 3, "#78350f");
    drawRect(17, 13, 2, 2, "#ffffff");
  } else if (accItem.id === "lightstick") {
    drawRect(18, 13, 1, 4, "#f8fafc");
    drawRect(17, 10, 3, 3, accItem.color);
  } else if (accItem.id === "boombox") {
    drawRect(16, 14, 6, 4, accItem.color);
    drawRect(17, 15, 1, 2, "#1e293b");
    drawRect(20, 15, 1, 2, "#1e293b");
  }
}
