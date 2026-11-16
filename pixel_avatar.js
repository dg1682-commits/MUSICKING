// ============================================================================
// [음악왕 v4.0] 480x480 초고해상도 캐릭터 & 아이템 렌더러 (pixel_avatar.js)
// - 모든 캐릭터 및 장착 아이템을 480x480 네이티브 고해상도 캔버스에 정밀 렌더링
// - 상점 내 개별 아이템 썸네일(480x480 스케일) 렌더링 지원
// - 기본 캐릭터 남/여(male/female) 선택 및 닉네임 변경권 포함
// ============================================================================

const BASE_AVATAR_SHOP_ITEMS = {
  bg: [
    { id: "meadow", name: "헤네시스 초원 (기본)", price: 0, colors: ["#7dd3fc", "#e0f2fe", "#4ade80", "#16a34a"] },
    { id: "neon", name: "네온 콘서트 아레나", price: 40, colors: ["#1e1b4b", "#312e81", "#f43f5e", "#4f46e5"] },
    { id: "sakura", name: "봄날 벚꽃 스테이지", price: 50, colors: ["#fecdd3", "#fff1f2", "#f472b6", "#db2777"] },
    { id: "galaxy", name: "스타라이트 우주돔", price: 80, colors: ["#0f172a", "#1e293b", "#38bdf8", "#6366f1"] },
    { id: "royal", name: "음악왕 황금 성전", price: 150, colors: ["#fef08a", "#fef9c3", "#f59e0b", "#b45309"] }
  ],
  hair: [
    { id: "default", name: "내추럴 블랙 (기본)", price: 0, color: "#27272a", shade: "#18181b", highlight: "#71717a", style: "default" },
    { id: "blonde", name: "샤이닝 아이돌 금발", price: 30, color: "#eab308", shade: "#ca8a04", highlight: "#fef08a", style: "default" },
    { id: "pink_twin", name: "러블리 핑크 트윈테일", price: 60, color: "#ec4899", shade: "#be185d", highlight: "#fbcfe8", style: "twin" },
    { id: "retro_90s", name: "90s 브릿지 더듬이", price: 50, color: "#78350f", shade: "#451a03", highlight: "#d97706", style: "antenna" },
    { id: "rock_red", name: "크림슨 록스타 장발", price: 70, color: "#dc2626", shade: "#991b1b", highlight: "#fca5a5", style: "long" },
    { id: "mint_pop", name: "소다 민트 팝스타", price: 65, color: "#14b8a6", shade: "#0f766e", highlight: "#99f6e4", style: "default" },
    { id: "silver_wolf", name: "실버 울프컷", price: 85, color: "#64748b", shade: "#334155", highlight: "#f1f5f9", style: "long" }
  ],
  hat: [
    { id: "none", name: "착용 안 함", price: 0 },
    { id: "headset", name: "프로 스튜디오 헤드셋", price: 45, color: "#0ea5e9", sub: "#bae6fd" },
    { id: "cat_ear", name: "네코미미 게이밍 헤드폰", price: 65, color: "#f43f5e", sub: "#fecdd3" },
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
    { id: "idol_suit", name: "시상식 로얄 제복", price: 85, main: "#0284c7", sub: "#facc15" },
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
  gender: "male",
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

// 둥근 도트/캐주얼 사각형 헬퍼 (480x480 기준 정밀 렌더링)
function fillRoundRect(ctx, x, y, w, h, radius, fill, stroke = null, strokeWidth = 6) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

// ============================================================================
// 480x480 초고해상도 캐릭터 렌더러 (상용 캐주얼 게임 퀄리티 + 정밀 픽셀 디테일)
// ============================================================================
function renderPixelAvatar(canvas, config = DEFAULT_AVATAR_CONFIG, options = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  ctx.save();
  ctx.clearRect(0, 0, W, H);
  // 모든 캔버스 크기에 관계없이 내부 좌표계를 480x480 기준으로 스케일링!
  ctx.scale(W / 480, H / 480);

  const cfg = { ...DEFAULT_AVATAR_CONFIG, ...(config || {}) };
  const isFemale = cfg.gender === "female";

  const bgItem = getItemById("bg", cfg.bg);
  const hairItem = getItemById("hair", cfg.hair);
  const hatItem = getItemById("hat", cfg.hat);
  const faceItem = getItemById("face", cfg.face);
  const outfitItem = getItemById("outfit", cfg.outfit);
  const accItem = getItemById("acc", cfg.acc);

  const outline = "#1e293b";
  const hairMain = hairItem.color || "#27272a";
  const hairShade = hairItem.shade || "#18181b";
  const hairHi = hairItem.highlight || "#71717a";

  // 1. 480x480 배경 스테이지
  if (!options.transparentBg && bgItem && bgItem.colors) {
    const grad = ctx.createLinearGradient(0, 0, 0, 360);
    grad.addColorStop(0, bgItem.colors[0]);
    grad.addColorStop(1, bgItem.colors[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 480, 370);

    // 구름 / 별빛 디테일
    fillRoundRect(ctx, 45, 55, 100, 34, 17, "rgba(255,255,255,0.85)");
    fillRoundRect(ctx, 65, 38, 60, 26, 13, "rgba(255,255,255,0.85)");
    fillRoundRect(ctx, 325, 70, 110, 34, 17, "rgba(255,255,255,0.85)");
    fillRoundRect(ctx, 350, 52, 65, 26, 13, "rgba(255,255,255,0.85)");

    // 바닥 스테이지
    ctx.fillStyle = bgItem.colors[3];
    ctx.fillRect(0, 365, 480, 115);
    ctx.fillStyle = bgItem.colors[2];
    ctx.fillRect(0, 355, 480, 24);
    ctx.strokeStyle = outline;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 355);
    ctx.lineTo(480, 355);
    ctx.stroke();
  }

  // 발밑 그림자
  ctx.fillStyle = "rgba(15, 23, 42, 0.22)";
  ctx.beginPath();
  ctx.ellipse(240, 405, 95, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. 황금 망토 & 뒷머리 레이어
  if (outfitItem.id === "king_robe") {
    fillRoundRect(ctx, 115, 245, 250, 145, 28, "#dc2626", outline, 7);
    fillRoundRect(ctx, 128, 255, 224, 125, 20, "#b91c1c");
    fillRoundRect(ctx, 115, 368, 250, 22, 8, "#facc15", outline, 5);
  }

  if (hairItem.style === "long" || (isFemale && hairItem.style === "default")) {
    fillRoundRect(ctx, 120, 150, 240, 175, 48, hairMain, outline, 8);
    fillRoundRect(ctx, 136, 170, 208, 145, 36, hairShade);
  }

  if (hairItem.style === "twin" || (isFemale && hairItem.id === "pink_twin")) {
    fillRoundRect(ctx, 68, 165, 68, 155, 30, hairMain, outline, 8);
    fillRoundRect(ctx, 344, 165, 68, 155, 30, hairMain, outline, 8);
    // 트윈테일 머리끈
    fillRoundRect(ctx, 82, 162, 42, 22, 8, "#f43f5e", outline, 5);
    fillRoundRect(ctx, 356, 162, 42, 22, 8, "#f43f5e", outline, 5);
  }

  // 3. 다리 & 신발
  fillRoundRect(ctx, 184, 332, 42, 58, 14, "#ffe4c8", outline, 7);
  fillRoundRect(ctx, 254, 332, 42, 58, 14, "#ffe4c8", outline, 7);
  // 신발
  const shoeColor = isFemale ? "#e11d48" : "#334155";
  fillRoundRect(ctx, 172, 370, 58, 34, 14, shoeColor, outline, 7);
  fillRoundRect(ctx, 250, 370, 58, 34, 14, shoeColor, outline, 7);
  fillRoundRect(ctx, 182, 376, 24, 10, 5, "#ffffff");
  fillRoundRect(ctx, 260, 376, 24, 10, 5, "#ffffff");

  // 4. 몸통 & 의상
  const outMain = outfitItem.main || "#4f46e5";
  const outSub = outfitItem.sub || "#e0e7ff";

  // 양팔
  fillRoundRect(ctx, 122, 256, 46, 76, 20, outMain, outline, 7);
  fillRoundRect(ctx, 312, 256, 46, 76, 20, outMain, outline, 7);
  // 양손
  fillRoundRect(ctx, 126, 312, 36, 32, 15, "#ffe4c8", outline, 6);
  fillRoundRect(ctx, 318, 312, 36, 32, 15, "#ffe4c8", outline, 6);

  // 상의 몸통
  fillRoundRect(ctx, 152, 248, 176, 102, 28, outMain, outline, 8);
  // 이너 셔츠 / 넥타이 / 칼라 디테일
  fillRoundRect(ctx, 208, 250, 64, 72, 12, outSub, outline, 5);
  if (outfitItem.id === "overalls") {
    fillRoundRect(ctx, 178, 250, 22, 95, 6, outSub, outline, 5);
    fillRoundRect(ctx, 280, 250, 22, 95, 6, outSub, outline, 5);
  } else if (outfitItem.id === "uniform") {
    fillRoundRect(ctx, 228, 262, 24, 52, 6, "#ef4444", outline, 4);
  }

  // 하의 (여캐 플리츠 스커트 / 남캐 팬츠)
  if (isFemale) {
    fillRoundRect(ctx, 144, 322, 192, 34, 14, outSub, outline, 7);
  } else {
    fillRoundRect(ctx, 160, 324, 160, 30, 10, "#1e293b", outline, 7);
  }

  // 5. 얼굴 & 귀 (480x480 매끄러운 2등신 헤드)
  fillRoundRect(ctx, 110, 168, 36, 48, 16, "#fed7aa", outline, 7);
  fillRoundRect(ctx, 334, 168, 36, 48, 16, "#fed7aa", outline, 7);

  const faceGrad = ctx.createLinearGradient(240, 105, 240, 260);
  faceGrad.addColorStop(0, "#fff5eb");
  faceGrad.addColorStop(0.7, "#ffe4c8");
  faceGrad.addColorStop(1, "#fed7aa");
  fillRoundRect(ctx, 130, 105, 220, 156, 66, faceGrad, outline, 8);

  // 볼터치
  ctx.fillStyle = isFemale ? "rgba(251, 113, 133, 0.55)" : "rgba(253, 164, 175, 0.45)";
  ctx.beginPath();
  ctx.ellipse(166, 214, 22, 12, 0, 0, Math.PI * 2);
  ctx.ellipse(314, 214, 22, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // 6. 고해상도 눈매 & 표정 & 안경
  const drawSparkleEye = (cx, cy) => {
    fillRoundRect(ctx, cx - 22, cy - 24, 44, 48, 18, outline);
    fillRoundRect(ctx, cx - 18, cy - 18, 36, 38, 14, "#312e81");
    fillRoundRect(ctx, cx - 14, cy - 4, 28, 22, 10, "#6366f1");
    // 하이라이트 물방울
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx - 7, cy - 9, 8, 0, Math.PI * 2);
    ctx.arc(cx + 8, cy + 7, 4, 0, Math.PI * 2);
    ctx.fill();
    if (isFemale) {
      // 여캐 속눈썹
      ctx.strokeStyle = outline;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cx - 24, cy - 18);
      ctx.lineTo(cx - 32, cy - 25);
      ctx.stroke();
    }
  };

  if (faceItem.id === "wink") {
    // 왼쪽 윙크
    ctx.strokeStyle = outline;
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(166, 190);
    ctx.quadraticCurveTo(188, 174, 208, 190);
    ctx.stroke();
    drawSparkleEye(292, 190);
    fillRoundRect(ctx, 224, 222, 32, 18, 9, "#f43f5e", outline, 5);
  } else if (faceItem.id === "sunglass") {
    fillRoundRect(ctx, 148, 166, 82, 48, 14, "#0f172a", outline, 6);
    fillRoundRect(ctx, 250, 166, 82, 48, 14, "#0f172a", outline, 6);
    ctx.strokeStyle = outline;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(230, 182);
    ctx.lineTo(250, 182);
    ctx.stroke();
    fillRoundRect(ctx, 162, 176, 26, 10, 4, "#38bdf8");
    fillRoundRect(ctx, 264, 176, 26, 10, 4, "#38bdf8");
    fillRoundRect(ctx, 226, 226, 28, 10, 5, "#e11d48");
  } else if (faceItem.id === "star_glass") {
    fillRoundRect(ctx, 150, 164, 78, 52, 20, "#facc15", outline, 6);
    fillRoundRect(ctx, 252, 164, 78, 52, 20, "#facc15", outline, 6);
    fillRoundRect(ctx, 172, 178, 34, 26, 10, "#1e293b");
    fillRoundRect(ctx, 274, 178, 34, 26, 10, "#1e293b");
    fillRoundRect(ctx, 224, 224, 32, 16, 8, "#f43f5e", outline, 5);
  } else if (faceItem.id === "singing") {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(166, 188);
    ctx.quadraticCurveTo(188, 174, 208, 188);
    ctx.moveTo(272, 188);
    ctx.quadraticCurveTo(292, 174, 314, 188);
    ctx.stroke();
    fillRoundRect(ctx, 214, 214, 52, 32, 16, "#be123c", outline, 6);
    fillRoundRect(ctx, 224, 226, 32, 16, 8, "#fb7185");
  } else {
    drawSparkleEye(188, 190);
    drawSparkleEye(292, 190);
    // 미소 입
    ctx.strokeStyle = outline;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(240, 220, 16, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  // 7. 앞머리 & 헤어 디테일 + 엔젤링 하이라이트
  fillRoundRect(ctx, 122, 82, 236, 76, 38, hairMain, outline, 8);
  // 좌우 옆머리
  fillRoundRect(ctx, 120, 120, 38, 76, 18, hairMain, outline, 7);
  fillRoundRect(ctx, 322, 120, 38, 76, 18, hairMain, outline, 7);
  // 앞머리 뱅 디테일
  fillRoundRect(ctx, 164, 118, 48, 44, 16, hairMain, outline, 6);
  fillRoundRect(ctx, 216, 118, 52, 46, 16, hairMain, outline, 6);
  fillRoundRect(ctx, 270, 118, 48, 44, 16, hairMain, outline, 6);

  // 엔젤링 하이라이트
  fillRoundRect(ctx, 160, 98, 65, 16, 8, hairHi);
  fillRoundRect(ctx, 255, 98, 65, 16, 8, hairHi);

  if (hairItem.style === "antenna") {
    fillRoundRect(ctx, 175, 130, 22, 65, 10, hairHi, outline, 5);
    fillRoundRect(ctx, 283, 130, 22, 65, 10, hairHi, outline, 5);
  }

  if (isFemale && hatItem.id === "none") {
    fillRoundRect(ctx, 308, 106, 44, 28, 10, "#f43f5e", outline, 5);
    fillRoundRect(ctx, 322, 113, 16, 14, 5, "#ffe4e6");
  }

  // 8. 모자 / 헤드셋 / 왕관
  if (hatItem.id === "headset") {
    fillRoundRect(ctx, 112, 70, 256, 26, 13, hatItem.color, outline, 7);
    fillRoundRect(ctx, 92, 142, 38, 78, 16, hatItem.color, outline, 7);
    fillRoundRect(ctx, 350, 142, 38, 78, 16, hatItem.color, outline, 7);
  } else if (hatItem.id === "cat_ear") {
    fillRoundRect(ctx, 112, 70, 256, 24, 12, hatItem.color, outline, 7);
    fillRoundRect(ctx, 128, 32, 54, 48, 14, hatItem.color, outline, 7);
    fillRoundRect(ctx, 140, 44, 30, 26, 8, hatItem.sub || "#fecdd3");
    fillRoundRect(ctx, 298, 32, 54, 48, 14, hatItem.color, outline, 7);
    fillRoundRect(ctx, 310, 44, 30, 26, 8, hatItem.sub || "#fecdd3");
    fillRoundRect(ctx, 92, 142, 38, 78, 16, hatItem.color, outline, 7);
    fillRoundRect(ctx, 350, 142, 38, 78, 16, hatItem.color, outline, 7);
  } else if (hatItem.id === "beanie") {
    fillRoundRect(ctx, 124, 52, 232, 66, 32, hatItem.color, outline, 8);
    fillRoundRect(ctx, 118, 96, 244, 26, 12, hatItem.sub || "#93c5fd", outline, 7);
  } else if (hatItem.id === "beret") {
    fillRoundRect(ctx, 118, 54, 236, 54, 26, hatItem.color, outline, 8);
    fillRoundRect(ctx, 232, 36, 16, 20, 6, outline);
  } else if (hatItem.id === "angel") {
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.ellipse(240, 42, 85, 18, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#fef08a";
    ctx.lineWidth = 6;
    ctx.stroke();
  } else if (hatItem.id === "crown") {
    fillRoundRect(ctx, 152, 34, 176, 62, 14, "#facc15", outline, 8);
    fillRoundRect(ctx, 224, 16, 32, 32, 10, "#f59e0b", outline, 6);
    fillRoundRect(ctx, 228, 54, 24, 24, 8, "#ef4444", outline, 5);
    fillRoundRect(ctx, 176, 58, 18, 18, 6, "#38bdf8", outline, 4);
    fillRoundRect(ctx, 286, 58, 18, 18, 6, "#38bdf8", outline, 4);
  }

  // 9. 손 악기 / 마이크 / 응원봉
  if (accItem.id === "mic_silver" || accItem.id === "mic_gold") {
    fillRoundRect(ctx, 352, 248, 26, 78, 10, "#475569", outline, 7);
    fillRoundRect(ctx, 338, 206, 54, 52, 24, accItem.color || "#94a3b8", outline, 7);
  } else if (accItem.id === "guitar") {
    fillRoundRect(ctx, 366, 165, 28, 110, 8, "#78350f", outline, 7);
    fillRoundRect(ctx, 320, 242, 92, 92, 32, accItem.color || "#ef4444", outline, 8);
    fillRoundRect(ctx, 346, 268, 40, 40, 20, "#ffffff", outline, 5);
  } else if (accItem.id === "lightstick") {
    fillRoundRect(ctx, 354, 250, 24, 78, 10, "#f8fafc", outline, 7);
    fillRoundRect(ctx, 332, 194, 68, 62, 26, accItem.color || "#ec4899", outline, 7);
  } else if (accItem.id === "boombox") {
    fillRoundRect(ctx, 318, 268, 124, 82, 16, accItem.color || "#475569", outline, 8);
    fillRoundRect(ctx, 334, 286, 36, 36, 18, "#0f172a", "#94a3b8", 5);
    fillRoundRect(ctx, 390, 286, 36, 36, 18, "#0f172a", "#94a3b8", 5);
  }

  ctx.restore();
}

// 상점 아이템 카드용 480x480 고해상도 개별 파츠 아이콘 렌더링
function renderItemThumbnail(canvas, category, item, baseGender = "male") {
  if (!canvas || !item) return;
  if (category === "special") {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(canvas.width / 480, canvas.height / 480);
    fillRoundRect(ctx, 40, 110, 400, 260, 36, "#fef3c7", "#b45309", 12);
    fillRoundRect(ctx, 70, 140, 340, 200, 24, "#fde68a", "#f59e0b", 8);
    ctx.fillStyle = "#b45309";
    ctx.font = "900 90px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🎫 VIP", 240, 270);
    ctx.restore();
    return;
  }

  const sampleCfg = {
    ...DEFAULT_AVATAR_CONFIG,
    gender: baseGender,
    [category]: item.id
  };
  renderPixelAvatar(canvas, sampleCfg);
}
