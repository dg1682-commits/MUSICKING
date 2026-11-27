// ============================================================================
// [음악왕 V4.0] 직접 손낚시 미니게임 · 어망(최대 50) · 물고기 도감 & Top 5 · 전용 낚시상점 NPC
// ============================================================================

const MANUAL_FISH_BAG_LIMIT = 50;
const MANUAL_FISH_BAG_WARN = 40;

// C: 50 CD / 5 EXP · B: 100 CD / 10 EXP · A: 200 CD / 20 EXP · S: 300 CD / 30 EXP
const FISH_CATALOG = [
  // ==================== C급 (7종 · 50 CD / 5 EXP) ====================
  { id: "fish_songsa", name: "송사리", grade: "C", minCm: 2.0, maxCm: 5.8, price: 50, exp: 5, shape: "tiny", bodyCol: "#94a3b8", bellyCol: "#f1f5f9", finCol: "#cbd5e1", desc: "맑은 여울에서 무리 지어 헤엄치는 작고 투명한 민물고기" },
  { id: "fish_pirami", name: "피라미", grade: "C", minCm: 6.0, maxCm: 18.4, price: 50, exp: 5, shape: "slim", bodyCol: "#38bdf8", bellyCol: "#f8fafc", finCol: "#fb923c", desc: "반짝이는 은빛 비늘에 주황빛 지느러미가 돋보이는 하천의 단골손님" },
  { id: "fish_mikkuraji", name: "미꾸라지", grade: "C", minCm: 8.0, maxCm: 22.6, price: 50, exp: 5, shape: "eel", bodyCol: "#78350f", bellyCol: "#d97706", finCol: "#451a03", desc: "수염을 쫑긋거리며 진흙 바닥을 재빠르게 누비는 매끈한 물고기" },
  { id: "fish_mangdung", name: "망둥어", grade: "C", minCm: 8.0, maxCm: 24.3, price: 50, exp: 5, shape: "bottom", bodyCol: "#a8a29e", bellyCol: "#f5f5f4", finCol: "#78716c", desc: "동그랗게 튀어나온 두 눈으로 갯벌과 모래바닥을 지키는 장난꾸러기" },
  { id: "fish_bungeo", name: "붕어", grade: "C", minCm: 10.0, maxCm: 35.7, price: 50, exp: 5, shape: "plump", bodyCol: "#d97706", bellyCol: "#fef08a", finCol: "#b45309", desc: "도톰하고 황금빛 비늘이 은은한 민물낚시의 영원한 스테디셀러" },
  { id: "fish_jeongaeng", name: "전갱이", grade: "C", minCm: 15.0, maxCm: 40.5, price: 50, exp: 5, shape: "slim", bodyCol: "#0284c7", bellyCol: "#e0f2fe", finCol: "#facc15", desc: "노란 꼬리지느러미가 날렵한 연안의 인기 회유어" },
  { id: "fish_godeung", name: "고등어", grade: "C", minCm: 25.0, maxCm: 50.8, price: 50, exp: 5, shape: "striped", bodyCol: "#1d4ed8", bellyCol: "#f8fafc", finCol: "#60a5fa", desc: "푸른 물결 무늬 등짝을 자랑하는 국민 생선! 구워 먹으면 밥도둑" },

  // ==================== B급 (6종 · 100 CD / 10 EXP) ====================
  { id: "fish_ojingeo", name: "오징어", grade: "B", minCm: 20.0, maxCm: 50.4, price: 100, exp: 10, shape: "squid", bodyCol: "#fb7185", bellyCol: "#ffe4e6", finCol: "#f43f5e", desc: "열 개의 다리로 물살을 가르며 힘차게 솟구치는 바다 명사수" },
  { id: "fish_ssogari", name: "쏘가리", grade: "B", minCm: 20.0, maxCm: 55.6, price: 100, exp: 10, shape: "spotted", bodyCol: "#ca8a04", bellyCol: "#fef9c3", finCol: "#a16207", desc: "호랑이 무늬와 날카로운 등지느러미를 가진 민물의 황제" },
  { id: "fish_ureok", name: "우럭", grade: "B", minCm: 20.0, maxCm: 55.9, price: 100, exp: 10, shape: "plump", bodyCol: "#475569", bellyCol: "#cbd5e1", finCol: "#334155", desc: "바위틈에 숨어 있다가 묵직한 손맛을 안겨주는 바닷속 터줏대감" },
  { id: "fish_megi", name: "메기", grade: "B", minCm: 25.0, maxCm: 70.2, price: 100, exp: 10, shape: "bottom", bodyCol: "#334155", bellyCol: "#94a3b8", finCol: "#1e293b", desc: "긴 수염을 휘날리며 호수 깊은 곳에 사는 묵직한 대물" },
  { id: "fish_gwangeo", name: "광어", grade: "B", minCm: 30.0, maxCm: 80.7, price: 100, exp: 10, shape: "flat", bodyCol: "#a16207", bellyCol: "#fef3c7", finCol: "#78350f", desc: "모래바닥에 딱 붙어 눈 두 개가 한쪽으로 모인 넓적한 고급 횟감" },
  { id: "fish_ingeo", name: "잉어", grade: "B", minCm: 30.0, maxCm: 85.4, price: 100, exp: 10, shape: "plump", bodyCol: "#ea580c", bellyCol: "#fed7aa", finCol: "#c2410c", desc: "큼직한 덩치와 힘찬 꼬리치기로 낚싯대를 휘게 만드는 힘장사" },

  // ==================== A급 (4종 · 200 CD / 20 EXP) ====================
  { id: "fish_chamdom", name: "참돔", grade: "A", minCm: 30.0, maxCm: 90.6, price: 200, exp: 20, shape: "plump", bodyCol: "#e11d48", bellyCol: "#fecdd3", finCol: "#be123c", desc: "영롱한 붉은빛과 푸른 별점이 박힌 바다의 여왕 참돔" },
  { id: "fish_nongeo", name: "농어", grade: "A", minCm: 40.0, maxCm: 100.8, price: 200, exp: 20, shape: "slim", bodyCol: "#0ea5e9", bellyCol: "#f0f9ff", finCol: "#0369a1", desc: "시원한 바늘털이 점프로 강태공을 열광시키는 은빛 파이터" },
  { id: "fish_yeoneo", name: "연어", grade: "A", minCm: 50.0, maxCm: 112.4, price: 200, exp: 20, shape: "slim", bodyCol: "#fb7185", bellyCol: "#ffedd5", finCol: "#e11d48", desc: "거친 물살을 거슬러 오르는 강인한 붉은빛 회귀 전사" },
  { id: "fish_jangeo", name: "장어", grade: "A", minCm: 45.0, maxCm: 121.5, price: 200, exp: 20, shape: "eel", bodyCol: "#1e293b", bellyCol: "#fde047", finCol: "#0f172a", desc: "길쭉한 몸으로 밤하늘을 가르듯 빠져나가는 스태미나 보양식" },

  // ==================== S급 (3종 · 300 CD / 30 EXP) ====================
  { id: "fish_gold_ingeo", name: "황금잉어", grade: "S", minCm: 50.0, maxCm: 132.4, price: 300, exp: 30, shape: "plump", bodyCol: "#facc15", bellyCol: "#fef9c3", finCol: "#f59e0b", desc: "온몸이 24K 순금빛으로 반짝이며 행운을 가져다주는 전설의 잉어", isLegendary: true },
  { id: "fish_king_muneo", name: "대왕문어", grade: "S", minCm: 100.0, maxCm: 252.8, price: 300, exp: 30, shape: "octopus", bodyCol: "#dc2626", bellyCol: "#fecaca", finCol: "#991b1b", desc: "거대한 머리와 여덟 다리로 심해를 주름잡는 초대형 바다 괴수", isLegendary: true },
  { id: "fish_chamdaraeng", name: "참다랑어", grade: "S", minCm: 120.0, maxCm: 284.7, price: 300, exp: 30, shape: "tuna", bodyCol: "#0f172a", bellyCol: "#bae6fd", finCol: "#facc15", desc: "바다의 로또! 총알처럼 질주하는 최고급 초거대 참치", isLegendary: true }
];

const MANUAL_FISH_ROD_REDUCTION = {
  none: 0,
  rod_c: 1.0,
  rod_b: 2.0,
  rod_a: 3.5,
  rod_s: 5.0
};

const MANUAL_FISH_GAUGE_WIDTH = {
  C: 28,
  B: 22,
  A: 15,
  S: 10
};

const MANUAL_BAIT_RATES = {
  none: { C: 85, B: 15, A: 0, S: 0 },
  bait_c: { C: 75, B: 15, A: 10, S: 0 },
  bait_b: { C: 70, B: 15, A: 10, S: 5 },
  bait_a: { C: 62, B: 18, A: 12, S: 8 },
  bait_s: { C: 50, B: 20, A: 15, S: 15 }
};

function getFishCatalogItem(fishId) {
  return FISH_CATALOG.find(f => f.id === fishId) || null;
}
window.getFishCatalogItem = getFishCatalogItem;

function getSafeFishBag() {
  if (typeof userState === "undefined") return [];
  if (!Array.isArray(userState.fishBag)) userState.fishBag = [];
  return userState.fishBag;
}

function getSafeFishDex() {
  if (typeof userState === "undefined") return {};
  if (!userState.fishDex || typeof userState.fishDex !== "object" || Array.isArray(userState.fishDex)) {
    userState.fishDex = {};
  }
  return userState.fishDex;
}

function getEffectiveEquippedBaitId() {
  if (typeof userState === "undefined" || !userState.avatarConfig) return "none";
  const baitId = userState.avatarConfig.fishingBait || "none";
  if (baitId === "none") return "none";
  const cnt = typeof getConsumableCount === "function" ? getConsumableCount(baitId) : 0;
  return cnt > 0 ? baitId : "none";
}

function rollFishGrade(baitId) {
  const rates = MANUAL_BAIT_RATES[baitId] || MANUAL_BAIT_RATES.none;
  const r = Math.random() * 100;
  if (r < rates.S) return "S";
  if (r < rates.S + rates.A) return "A";
  if (r < rates.S + rates.A + rates.B) return "B";
  return "C";
}

function rollFishSpeciesByGrade(grade) {
  const pool = FISH_CATALOG.filter(f => f.grade === grade);
  if (pool.length === 0) return FISH_CATALOG[0];
  return pool[Math.floor(Math.random() * pool.length)];
}

function rollFishSizeCm(fish) {
  if (!fish) return { cm: 10.0, isMax: false };
  if (Math.random() < 0.001) {
    return { cm: Number(fish.maxCm.toFixed(1)), isMax: true };
  }
  const minVal = Number(fish.minCm) || 1.0;
  const maxMinus = Math.max(minVal, Number((fish.maxCm - 0.1).toFixed(1)));
  const raw = minVal + Math.random() * (maxMinus - minVal);
  const rounded = Math.round(raw * 10) / 10;
  return {
    cm: Math.max(minVal, Math.min(maxMinus, rounded)),
    isMax: false
  };
}

function escapeFishHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ============================================================================
// 1. 픽셀 잉크 외곽선 어종 스프라이트 렌더러 (도감 · 어망 · 상점 · 결과 공용)
// ============================================================================
function drawFishCatalogSprite(canvas, fish, opts = {}) {
  if (!canvas || !fish) return;
  if (canvas.width < 480) canvas.width = 480;
  if (canvas.height < 480) canvas.height = 480;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const locked = Boolean(opts.locked);
  const outline = locked ? "#334155" : "#1e1b18";
  const bodyCol = locked ? "#475569" : fish.bodyCol;
  const bellyCol = locked ? "#64748b" : fish.bellyCol;
  const finCol = locked ? "#334155" : fish.finCol;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.clearRect(0, 0, W, H);
  ctx.translate(W / 2, H / 2);
  const sc = Math.min(W, H) / 480;
  ctx.scale(sc, sc);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const lw = 12;

  // 은은한 물빛 후광 원판 & 거품 (해금된 어종만)
  if (!locked) {
    const bgGlow = ctx.createRadialGradient(0, 0, 24, 0, 0, 210);
    bgGlow.addColorStop(0, fish.isLegendary ? "rgba(254, 240, 138, 0.55)" : "rgba(186, 230, 253, 0.5)");
    bgGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = bgGlow;
    ctx.beginPath();
    ctx.arc(0, 0, 210, 0, Math.PI * 2);
    ctx.fill();

    // 물방울 2개
    [[-158, -124, 14], [164, 118, 10]].forEach(([bx, by, br]) => {
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  if (fish.shape === "squid") {
    // 오징어 (480px 고해상도 입체 음영)
    for (let i = -2; i <= 2; i++) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 24;
      ctx.beginPath();
      ctx.moveTo(i * 30, 56);
      ctx.quadraticCurveTo(i * 38, 126, i * 44 + (i % 2 ? 18 : -18), 178);
      ctx.stroke();
      ctx.strokeStyle = bodyCol;
      ctx.lineWidth = 12;
      ctx.stroke();
    }
    const sqGrad = ctx.createLinearGradient(0, -190, 0, 80);
    sqGrad.addColorStop(0, bodyCol);
    sqGrad.addColorStop(1, bellyCol);
    ctx.fillStyle = locked ? bodyCol : sqGrad;
    ctx.strokeStyle = outline;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(0, -192);
    ctx.lineTo(-102, -88);
    ctx.lineTo(102, -88);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-64, -94);
    ctx.quadraticCurveTo(-72, 72, 0, 78);
    ctx.quadraticCurveTo(72, 72, 64, -94);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (!locked) {
      ctx.fillStyle = "rgba(255,255,255,0.34)";
      ctx.beginPath();
      ctx.ellipse(-20, -40, 14, 46, -0.15, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (fish.shape === "octopus") {
    // 대왕문어
    for (let i = -3; i <= 3; i++) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 30;
      ctx.beginPath();
      ctx.moveTo(i * 28, 40);
      ctx.bezierCurveTo(i * 52, 98, i * 28, 142, i * 52 + (i % 2 ? 20 : -20), 184);
      ctx.stroke();
      ctx.strokeStyle = bodyCol;
      ctx.lineWidth = 17;
      ctx.stroke();
    }
    const octGrad = ctx.createRadialGradient(-30, -82, 16, 0, -40, 120);
    octGrad.addColorStop(0, bellyCol);
    octGrad.addColorStop(1, bodyCol);
    ctx.fillStyle = locked ? bodyCol : octGrad;
    ctx.strokeStyle = outline;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(0, -42, 110, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.36)";
    ctx.beginPath();
    ctx.ellipse(-42, -82, 26, 15, -0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (fish.shape === "eel") {
    // 미꾸라지 / 장어
    ctx.fillStyle = finCol;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(-158, 46);
    ctx.lineTo(-204, 14);
    ctx.lineTo(-196, 84);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = outline;
    ctx.lineWidth = 86;
    ctx.beginPath();
    ctx.moveTo(-158, 46);
    ctx.bezierCurveTo(-64, -76, 48, 88, 154, -28);
    ctx.stroke();
    ctx.strokeStyle = bodyCol;
    ctx.lineWidth = 60;
    ctx.stroke();
    ctx.strokeStyle = bellyCol;
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(-136, 52);
    ctx.bezierCurveTo(-52, -34, 48, 98, 142, -12);
    ctx.stroke();
  } else if (fish.shape === "flat") {
    // 광어
    ctx.fillStyle = finCol;
    ctx.strokeStyle = outline;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(-104, 0);
    ctx.lineTo(-184, -66);
    ctx.lineTo(-168, 66);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const flGrad = ctx.createLinearGradient(0, -110, 0, 110);
    flGrad.addColorStop(0, bodyCol);
    flGrad.addColorStop(1, bellyCol);
    ctx.fillStyle = locked ? bodyCol : flGrad;
    ctx.beginPath();
    ctx.ellipse(18, 0, 148, 112, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (!locked) {
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.beginPath();
      ctx.ellipse(-8, -56, 78, 22, -0.1, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // 일반 / 줄무늬 / 점박이 / 참다랑어 / 둥글 어류 (480px 그라데이션 & 지느러미 결)
    const rx = fish.shape === "slim" || fish.shape === "tuna" ? 146 : fish.shape === "tiny" ? 106 : fish.shape === "plump" ? 124 : 130;
    const ry = fish.shape === "slim" || fish.shape === "tuna" ? 72 : fish.shape === "tiny" ? 60 : fish.shape === "plump" ? 100 : 90;

    // 꼬리 지느러미
    ctx.fillStyle = finCol;
    ctx.strokeStyle = outline;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(-rx + 22, 0);
    ctx.lineTo(-rx - 66, -70);
    ctx.lineTo(-rx - 40, 0);
    ctx.lineTo(-rx - 66, 70);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 등 지느러미
    ctx.beginPath();
    ctx.moveTo(-42, -ry + 8);
    ctx.lineTo(2, -ry - 54);
    ctx.lineTo(58, -ry + 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 배 지느러미
    ctx.beginPath();
    ctx.moveTo(-24, ry - 10);
    ctx.lineTo(10, ry + 42);
    ctx.lineTo(48, ry - 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 몸통 (상하 그라데이션)
    const bGrad = ctx.createLinearGradient(0, -ry, 0, ry);
    bGrad.addColorStop(0, bodyCol);
    bGrad.addColorStop(0.62, bodyCol);
    bGrad.addColorStop(1, bellyCol);
    ctx.fillStyle = locked ? bodyCol : bGrad;
    ctx.beginPath();
    ctx.ellipse(12, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 배 하이라이트
    ctx.fillStyle = bellyCol;
    ctx.beginPath();
    ctx.ellipse(16, ry * 0.36, rx * 0.72, ry * 0.42, 0, 0, Math.PI);
    ctx.fill();

    if (!locked) {
      // 등쪽 반사 하이라이트
      ctx.fillStyle = "rgba(255,255,255,0.34)";
      ctx.beginPath();
      ctx.ellipse(-4, -ry * 0.48, rx * 0.48, ry * 0.16, -0.08, 0, Math.PI * 2);
      ctx.fill();

      // 아가미 & 옆지느러미
      ctx.strokeStyle = outline;
      ctx.lineWidth = 7.5;
      ctx.beginPath();
      ctx.arc(46, 2, ry * 0.56, Math.PI * 0.68, Math.PI * 1.32);
      ctx.stroke();

      ctx.fillStyle = finCol;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(22, 16);
      ctx.quadraticCurveTo(-24, 34, -18, 52);
      ctx.quadraticCurveTo(18, 42, 34, 24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    if (!locked && fish.shape === "striped") {
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 10;
      [-52, -12, 28, 62].forEach(sx => {
        ctx.beginPath();
        ctx.moveTo(sx, -ry + 16);
        ctx.quadraticCurveTo(sx + 14, -18, sx - 6, -4);
        ctx.stroke();
      });
    } else if (!locked && fish.shape === "spotted") {
      ctx.fillStyle = "#451a03";
      [[-42, -24], [12, -36], [52, -15], [-12, 18]].forEach(([px, py]) => {
        ctx.beginPath();
        ctx.arc(px, py, 11, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    if (!locked && fish.isLegendary) {
      ctx.fillStyle = "#fef08a";
      ctx.strokeStyle = "#ca8a04";
      ctx.lineWidth = 3;
      [[-18, -ry - 64, 13], [116, -84, 11], [-128, 86, 10]].forEach(([sx, sy, sr]) => {
        ctx.beginPath();
        ctx.moveTo(sx, sy - sr);
        ctx.lineTo(sx + sr * 0.35, sy - sr * 0.35);
        ctx.lineTo(sx + sr, sy);
        ctx.lineTo(sx + sr * 0.35, sy + sr * 0.35);
        ctx.lineTo(sx, sy + sr);
        ctx.lineTo(sx - sr * 0.35, sy + sr * 0.35);
        ctx.lineTo(sx - sr, sy);
        ctx.lineTo(sx - sr * 0.35, sy - sr * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
    }
  }

  // 눈 & 빛 반사 (잠금 아닌 경우)
  if (!locked) {
    const ex = fish.shape === "squid" ? -26 : fish.shape === "octopus" ? -40 : fish.shape === "eel" ? 124 : 88;
    const ey = fish.shape === "squid" ? 6 : fish.shape === "octopus" ? -28 : fish.shape === "eel" ? -34 : -18;
    const drawEye = (cx, cy) => {
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = outline;
      ctx.lineWidth = 8.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 19, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(cx + 4, cy, 9.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(cx + 7, cy - 4, 3.8, 0, Math.PI * 2);
      ctx.fill();
    };
    drawEye(ex, ey);
    if (fish.shape === "squid" || fish.shape === "octopus") {
      drawEye(-ex, ey);
    }
  } else {
    ctx.fillStyle = "#e2e8f0";
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 10;
    ctx.font = "900 104px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText("?", 0, 8);
    ctx.fillText("?", 0, 8);
  }

  ctx.restore();
}
window.drawFishCatalogSprite = drawFishCatalogSprite;

// ============================================================================
// 2. 손낚시 효과음 유틸 (음소거·차단 상태 100% 준수)
// ============================================================================
let _manualFishAudioCtx = null;
function playManualFishSfx(kind) {
  if (typeof isAppAudioBlocked === "function" && isAppAudioBlocked()) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!_manualFishAudioCtx) _manualFishAudioCtx = new AudioCtx();
    if (_manualFishAudioCtx.state === "suspended") {
      _manualFishAudioCtx.resume().catch(() => {});
    }
    const ctx = _manualFishAudioCtx;
    const now = ctx.currentTime;
    const playTone = (freq, startOffset, dur, type = "sine", vol = 0.14) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + startOffset);
      g.gain.setValueAtTime(vol, now + startOffset);
      g.gain.exponentialRampToValueAtTime(0.001, now + startOffset + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + dur + 0.02);
    };
    if (kind === "cast") {
      playTone(420, 0, 0.08, "triangle", 0.12);
      playTone(260, 0.08, 0.14, "sine", 0.14);
    } else if (kind === "bite") {
      playTone(880, 0, 0.07, "square", 0.12);
      playTone(1174, 0.08, 0.09, "square", 0.13);
      playTone(1318, 0.17, 0.16, "triangle", 0.14);
    } else if (kind === "catch") {
      playTone(523.25, 0, 0.1, "triangle", 0.14);
      playTone(659.25, 0.08, 0.1, "triangle", 0.14);
      playTone(783.99, 0.16, 0.12, "triangle", 0.15);
      playTone(1046.5, 0.25, 0.35, "sine", 0.16);
    } else if (kind === "max") {
      [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) => {
        playTone(f, i * 0.07, 0.24, "triangle", 0.16);
      });
    } else if (kind === "fail") {
      playTone(300, 0, 0.14, "sawtooth", 0.09);
      playTone(190, 0.14, 0.24, "sawtooth", 0.09);
    }
  } catch (e) {}
}

// ============================================================================
// 3. 손낚시 풀스크린 오버레이 (#manualFishingOverlay) 상태 머신 & 캔버스 무대
// ============================================================================
const manualFishingState = {
  isOpen: false,
  phase: "idle", // idle | waiting | bite | gauge | result
  waitTimerId: null,
  waitStartAt: 0,
  waitDurationMs: 0,
  biteTimerId: null,
  biteDeadlineAt: 0,
  biteSpot: { leftPct: 52, topPct: 50 },
  gaugeRafId: null,
  gaugeStartedAt: 0,
  gaugeReadyAt: 0,
  gaugeDurationMs: 20000,
  gaugePos: 50,
  gaugeDir: 1,
  gaugeLastTs: 0,
  gaugeZoneStart: 35,
  gaugeZoneWidth: 28,
  targetFish: null,
  lastCatch: null,
  sceneRafId: null,
  rippleUntil: 0,
  splashAt: 0
};

window.isManualFishingOverlayOpen = function () {
  return Boolean(manualFishingState.isOpen);
};

window.isManualFishingForegroundActive = function () {
  if (!manualFishingState.isOpen) return false;
  if (typeof state !== "undefined" && state.currentScreen !== "fishingScreen") return false;
  if (document.hidden || window.__onestorePaused) return false;
  const shopModal = document.getElementById("fishingShopModal");
  if (shopModal && !shopModal.classList.contains("hidden")) return false;
  const dexModal = document.getElementById("fishDexModal");
  if (dexModal && !dexModal.classList.contains("hidden")) return false;
  return true;
};

function clearManualFishingPhaseTimers() {
  if (manualFishingState.waitTimerId) {
    clearTimeout(manualFishingState.waitTimerId);
    manualFishingState.waitTimerId = null;
  }
  if (manualFishingState.biteTimerId) {
    clearInterval(manualFishingState.biteTimerId);
    manualFishingState.biteTimerId = null;
  }
  if (manualFishingState.gaugeRafId) {
    cancelAnimationFrame(manualFishingState.gaugeRafId);
    manualFishingState.gaugeRafId = null;
  }
}

function stopManualFishingSceneLoop() {
  if (manualFishingState.sceneRafId) {
    cancelAnimationFrame(manualFishingState.sceneRafId);
    manualFishingState.sceneRafId = null;
  }
}

window.openManualFishingOverlay = function () {
  if (typeof userState === "undefined" || !userState.isLoggedIn) {
    if (typeof gameAlert === "function") gameAlert("손낚시는 로그인 후 이용할 수 있습니다!");
    return;
  }
  const ov = document.getElementById("manualFishingOverlay");
  if (!ov) return;

  clearManualFishingPhaseTimers();
  manualFishingState.isOpen = true;
  manualFishingState.phase = "idle";
  manualFishingState.targetFish = null;
  manualFishingState.lastCatch = null;
  ov.classList.remove("hidden");

  renderManualFishingUi();
  startManualFishingSceneLoop();
};

window.closeManualFishingOverlay = function () {
  clearManualFishingPhaseTimers();
  stopManualFishingSceneLoop();
  manualFishingState.isOpen = false;
  manualFishingState.phase = "idle";
  manualFishingState.targetFish = null;

  const ov = document.getElementById("manualFishingOverlay");
  if (ov) ov.classList.add("hidden");
  if (typeof renderFishingHud === "function") renderFishingHud();
};

function startManualFishingSceneLoop() {
  stopManualFishingSceneLoop();
  const canvas = document.getElementById("manualFishingCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const avatarOff = document.createElement("canvas");
  avatarOff.width = 480;
  avatarOff.height = 480;
  let lastAvatarSig = "";

  const refreshAvatarSprite = () => {
    const cfg = typeof getPublicFishingAvatarConfig === "function"
      ? getPublicFishingAvatarConfig()
      : (userState.avatarConfig || DEFAULT_AVATAR_CONFIG);
    const sig = JSON.stringify(cfg);
    if (sig !== lastAvatarSig && typeof renderPixelAvatar === "function") {
      lastAvatarSig = sig;
      try {
        renderPixelAvatar(avatarOff, cfg, { transparentBg: true, matchCssAspect: false, skipEffectLoop: true, fishingIdle: true });
      } catch (e) {}
    }
  };
  refreshAvatarSprite();

  let lastDraw = 0;
  const frame = ts => {
    if (!manualFishingState.isOpen) {
      manualFishingState.sceneRafId = null;
      return;
    }
    manualFishingState.sceneRafId = requestAnimationFrame(frame);
    if (document.hidden || ts - lastDraw < 33) return;
    lastDraw = ts;
    refreshAvatarSprite();

    const rect = canvas.parentElement;
    if (rect && rect.clientWidth > 20 && rect.clientHeight > 20) {
      const tw = Math.round(rect.clientWidth * 2);
      const th = Math.round(rect.clientHeight * 2);
      if (Math.abs(canvas.width - tw) > 6 || Math.abs(canvas.height - th) > 6) {
        canvas.width = tw;
        canvas.height = th;
      }
    }

    const W = canvas.width || 720;
    const H = canvas.height || 760;
    const t = ts * 0.002;
    const horizon = H * 0.30;
    const shoreY = H * 0.68;

    // 1) 맑은 하늘 & 구름
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, "#0284c7");
    sky.addColorStop(0.55, "#38bdf8");
    sky.addColorStop(1, "#bae6fd");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, horizon + 6);

    // 햇님 & 구름
    ctx.fillStyle = "#fef08a";
    ctx.strokeStyle = "#1e1b18";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(W * 0.82, H * 0.11, W * 0.052, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 먼 산
    ctx.fillStyle = "#34d399";
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    ctx.quadraticCurveTo(W * 0.25, horizon - H * 0.09, W * 0.52, horizon - H * 0.01);
    ctx.quadraticCurveTo(W * 0.8, horizon - H * 0.11, W, horizon - H * 0.02);
    ctx.lineTo(W, horizon + 6);
    ctx.lineTo(0, horizon + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2) 깊은 호수 수면
    const water = ctx.createLinearGradient(0, horizon, 0, H);
    water.addColorStop(0, "#0369a1");
    water.addColorStop(0.55, "#0ea5e9");
    water.addColorStop(1, "#0284c7");
    ctx.fillStyle = water;
    ctx.fillRect(0, horizon, W, H - horizon);

    ctx.strokeStyle = "#1e1b18";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    ctx.lineTo(W, horizon);
    ctx.stroke();

    // 물결 윤슬
    ctx.strokeStyle = "rgba(255,255,255,0.42)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    for (let r = 0; r < 5; r++) {
      const y = horizon + (H - horizon) * (0.14 + r * 0.17);
      for (let c = 0; c < 3; c++) {
        const x = ((W * (0.18 + c * 0.33)) + Math.sin(t * 0.7 + r + c) * 20) % W;
        ctx.beginPath();
        ctx.moveTo(x - 24, y);
        ctx.lineTo(x + 24, y);
        ctx.stroke();
      }
    }

    // 3) 나무 부두 (아래 좌측에 캐릭터가 서는 공간)
    const deckY = shoreY;
    ctx.fillStyle = "#b45309";
    ctx.strokeStyle = "#1e1b18";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(W * 0.05, deckY, W * 0.48, H * 0.16, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ea8c2f";
    ctx.fillRect(W * 0.05 + 4, deckY + 4, W * 0.48 - 8, H * 0.025);
    ctx.strokeStyle = "#451a03";
    ctx.lineWidth = 2.5;
    for (let x = W * 0.12; x < W * 0.50; x += W * 0.065) {
      ctx.beginPath();
      ctx.moveTo(x, deckY + 4);
      ctx.lineTo(x, deckY + H * 0.16 - 4);
      ctx.stroke();
    }

    // 4) 내 아바타 (부두 왼쪽 위 스탠딩)
    const avSize = Math.min(W * 0.38, H * 0.34);
    const avX = W * 0.10;
    const avY = deckY - avSize * 0.80;
    const shake = manualFishingState.phase === "gauge" ? Math.sin(ts * 0.03) * 4 : Math.sin(t * 1.4) * 2;
    ctx.drawImage(avatarOff, avX + shake, avY, avSize, avSize);

    // 낚싯대 & 줄 & 찌 위치 계산
    const rodTipX = avX + avSize * 0.92 + (manualFishingState.phase === "bite" ? 8 : 0);
    const rodTipY = avY + avSize * 0.24 - (manualFishingState.phase === "bite" ? Math.sin(ts * 0.06) * 8 : 0);

    // 대나무/황금 낚싯대 선 강조
    const rodId = userState?.avatarConfig?.fishingRod || "none";
    const rodCol =
      rodId === "rod_s" ? "#facc15" : rodId === "rod_a" ? "#e11d48" : rodId === "rod_b" ? "#0284c7" : "#b45309";
    ctx.strokeStyle = "#1e1b18";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(avX + avSize * 0.62, avY + avSize * 0.62);
    ctx.quadraticCurveTo(avX + avSize * 0.80, avY + avSize * 0.40, rodTipX, rodTipY);
    ctx.stroke();
    ctx.strokeStyle = rodCol;
    ctx.lineWidth = 4.5;
    ctx.stroke();

    // 물 위 찌 좌표
    const bobX = W * 0.68;
    const baseBobY = horizon + (H - horizon) * 0.34;
    let bobY = baseBobY + Math.sin(t * 2.1) * 4;

    if (manualFishingState.phase === "bite") {
      bobY = baseBobY + 12 + Math.sin(ts * 0.04) * 6;
    } else if (manualFishingState.phase === "gauge") {
      bobY = baseBobY + 6 + Math.sin(ts * 0.025) * 8;
    }

    if (manualFishingState.phase !== "idle" && manualFishingState.phase !== "result") {
      // 낚싯줄
      ctx.strokeStyle = "#e0f2fe";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(rodTipX, rodTipY);
      ctx.quadraticCurveTo((rodTipX + bobX) * 0.5, Math.min(rodTipY, bobY) + 32, bobX, bobY);
      ctx.stroke();

      // 물결 파동
      const waveCycle = (ts * 0.0025) % 1;
      const ringAlpha = manualFishingState.phase === "bite" ? 0.9 : 0.45 * (1 - waveCycle);
      ctx.strokeStyle = `rgba(255,255,255,${ringAlpha.toFixed(2)})`;
      ctx.lineWidth = manualFishingState.phase === "bite" ? 4 : 2.5;
      ctx.beginPath();
      ctx.ellipse(bobX, baseBobY + 6, 18 + waveCycle * 36, 7 + waveCycle * 12, 0, 0, Math.PI * 2);
      ctx.stroke();

      if (manualFishingState.phase === "bite") {
        ctx.beginPath();
        ctx.ellipse(bobX, baseBobY + 6, 36 + ((waveCycle + 0.5) % 1) * 40, 12 + ((waveCycle + 0.5) % 1) * 14, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 빨강-하양 낚시 찌
      ctx.fillStyle = "#ef4444";
      ctx.strokeStyle = "#1e1b18";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(bobX, bobY - 3, 10, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(bobX, bobY - 3, 10, 0, Math.PI);
      ctx.fill();
      ctx.stroke();

      // 입질 느낌표 (!) 말풍선
      if (manualFishingState.phase === "bite") {
        const bounce = Math.sin(ts * 0.025) * 6;
        ctx.fillStyle = "#fef08a";
        ctx.strokeStyle = "#1e1b18";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(bobX, bobY - 56 + bounce, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#dc2626";
        ctx.font = "900 34px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("!", bobX, bobY - 54 + bounce);
      }
    }
  };
  manualFishingState.sceneRafId = requestAnimationFrame(frame);
}

window.syncManualFishingHud = function () {
  if (!manualFishingState.isOpen) return;
  renderManualFishingTopBar();
};

function renderManualFishingTopBar() {
  const bag = getSafeFishBag();
  const bagCnt = bag.length;
  const bagBtn = document.getElementById("manualFishBagBtn");
  const bagBadge = document.getElementById("manualFishBagWarn");
  if (bagBtn) {
    bagBtn.textContent = `🐟 어망 (${bagCnt}/${MANUAL_FISH_BAG_LIMIT})`;
    bagBtn.classList.toggle("is-warn", bagCnt >= MANUAL_FISH_BAG_WARN && bagCnt < MANUAL_FISH_BAG_LIMIT);
    bagBtn.classList.toggle("is-full", bagCnt >= MANUAL_FISH_BAG_LIMIT);
  }
  if (bagBadge) {
    if (bagCnt >= MANUAL_FISH_BAG_LIMIT) {
      bagBadge.textContent = "가득 참! 판매 필요";
      bagBadge.classList.remove("hidden");
    } else if (bagCnt >= MANUAL_FISH_BAG_WARN) {
      bagBadge.textContent = "가득 참 임박";
      bagBadge.classList.remove("hidden");
    } else {
      bagBadge.classList.add("hidden");
    }
  }

  const baitId = getEffectiveEquippedBaitId();
  const baitMeta = typeof getItemById === "function" ? getItemById("fishing_bait", baitId) : null;
  const baitCnt = baitId !== "none" && typeof getConsumableCount === "function" ? getConsumableCount(baitId) : 0;
  const baitBtn = document.getElementById("manualFishBaitBtn");
  if (baitBtn) {
    baitBtn.textContent = baitId !== "none" && baitMeta
      ? `🪱 ${baitMeta.name} (${baitCnt})`
      : "🪱 미끼 없음";
  }

  const rodId = userState?.avatarConfig?.fishingRod || "none";
  const rodMeta = typeof getItemById === "function" ? getItemById("fishing_rod", rodId) : null;
  const rodPill = document.getElementById("manualFishRodBadge");
  if (rodPill) {
    const secCut = MANUAL_FISH_ROD_REDUCTION[rodId] || 0;
    rodPill.textContent = rodId !== "none" && rodMeta
      ? `🎣 ${rodMeta.name} (-${secCut}초)`
      : "🎣 기본 낚싯대";
  }
}

function renderManualFishingUi() {
  renderManualFishingTopBar();

  const overlayEl = document.getElementById("manualFishingOverlay");
  const statusTextEl = document.getElementById("manualFishStatusBanner");
  const gaugeWrap = document.getElementById("manualFishGaugeWrap");
  const resultCard = document.getElementById("manualFishResultCard");
  const actionBtn = document.getElementById("manualFishActionBtn");
  const biteBtn = document.getElementById("manualFishBiteCircleBtn");
  const timerEl = document.getElementById("manualFishTimerBadge");

  if (!actionBtn || !statusTextEl) return;

  const phase = manualFishingState.phase;
  if (gaugeWrap) gaugeWrap.classList.toggle("hidden", phase !== "gauge");
  if (resultCard) resultCard.classList.toggle("hidden", phase !== "result");
  if (timerEl) timerEl.classList.toggle("hidden", phase !== "bite" && phase !== "gauge");
  if (overlayEl) {
    overlayEl.classList.toggle("is-bite-mode", phase === "bite");
    overlayEl.classList.toggle("is-gauge-mode", phase === "gauge");
  }

  if (biteBtn) {
    if (phase === "bite") {
      const spot = manualFishingState.biteSpot || { leftPct: 52, topPct: 50 };
      biteBtn.style.left = `${spot.leftPct}%`;
      biteBtn.style.top = `${spot.topPct}%`;
      biteBtn.classList.remove("hidden");
    } else {
      biteBtn.classList.add("hidden");
    }
  }

  if (phase === "idle") {
    const bagCnt = getSafeFishBag().length;
    statusTextEl.textContent = bagCnt >= MANUAL_FISH_BAG_LIMIT
      ? "⚠️ 어망이 가득 찼습니다! [🏪 낚시상점]에서 물고기를 판매해 주세요."
      : "낚싯대를 던져 호수 속 대물을 낚아보세요! (잠수 보상도 동시 적립중)";
    actionBtn.textContent = "🎣 낚싯대 던지기";
    actionBtn.className = "btn btn-primary manual-fish-main-btn";
    actionBtn.disabled = false;
    actionBtn.classList.remove("hidden");
  } else if (phase === "waiting") {
    statusTextEl.textContent = "🌊 찌가 흔들리길 기다리는 중... 입질이 오면 원형 버튼을 터치하세요!";
    actionBtn.textContent = "⏳ 입질 대기중...";
    actionBtn.className = "btn manual-fish-main-btn";
    actionBtn.disabled = true;
    actionBtn.classList.remove("hidden");
  } else if (phase === "bite") {
    statusTextEl.textContent = "⚡ 화면에 뜬 반짝이는 원형 버튼을 3초 안에 터치하세요!";
    actionBtn.classList.add("hidden");
    actionBtn.disabled = true;
  } else if (phase === "gauge") {
    const f = manualFishingState.targetFish;
    const grade = f ? f.grade : "C";
    statusTextEl.textContent = `🎯 [${grade}등급] 어종 포착! 화면 아무 곳이나 터치해 노란 구간을 맞추세요!`;
    actionBtn.classList.add("hidden");
    actionBtn.disabled = true;
  } else if (phase === "result") {
    actionBtn.textContent = "🎣 다시 낚싯대 던지기";
    actionBtn.className = "btn btn-primary manual-fish-main-btn";
    actionBtn.disabled = false;
    actionBtn.classList.remove("hidden");
  }
}

window.handleManualBiteCircleTap = function (e) {
  if (e) {
    e.stopPropagation();
    if (typeof e.preventDefault === "function") e.preventDefault();
  }
  if (!manualFishingState.isOpen || manualFishingState.phase !== "bite") return;
  triggerManualBiteSuccess();
};

window.handleManualFishingScreenTap = function (e) {
  if (!manualFishingState.isOpen || manualFishingState.phase !== "gauge") return;
  if (performance.now() < (manualFishingState.gaugeReadyAt || 0)) return;
  if (e && e.target && typeof e.target.closest === "function") {
    if (e.target.closest(".manual-fish-topbar button")) return;
  }
  if (e && typeof e.preventDefault === "function") e.preventDefault();
  resolveManualGaugeAttempt();
};

window.handleManualFishMainAction = function () {
  if (!manualFishingState.isOpen) return;
  const phase = manualFishingState.phase;

  if (phase === "idle" || phase === "result") {
    startManualFishingCast();
  } else if (phase === "bite") {
    triggerManualBiteSuccess();
  } else if (phase === "gauge") {
    resolveManualGaugeAttempt();
  }
};

function startManualFishingCast() {
  if (performance.now() < (manualFishingState.actionCooldownUntil || 0)) return;
  const bag = getSafeFishBag();
  if (bag.length >= MANUAL_FISH_BAG_LIMIT) {
    if (typeof gameAlert === "function") {
      gameAlert("어망이 가득 찼습니다! 낚시상점에서 판매해 주세요.", "🐟 어망 가득 참");
    }
    renderManualFishingUi();
    return;
  }

  clearManualFishingPhaseTimers();
  manualFishingState.phase = "waiting";
  manualFishingState.lastCatch = null;
  playManualFishSfx("cast");

  const baseWaitSec = 5 + Math.random() * 10; // 5 ~ 15s
  const rodId = userState?.avatarConfig?.fishingRod || "none";
  const cutSec = MANUAL_FISH_ROD_REDUCTION[rodId] || 0;
  const finalWaitSec = Math.max(2, baseWaitSec - cutSec);
  manualFishingState.waitStartAt = Date.now();
  manualFishingState.waitDurationMs = Math.round(finalWaitSec * 1000);

  renderManualFishingUi();

  manualFishingState.waitTimerId = setTimeout(() => {
    manualFishingState.waitTimerId = null;
    if (!manualFishingState.isOpen || manualFishingState.phase !== "waiting") return;
    enterManualBitePhase();
  }, manualFishingState.waitDurationMs);
}

function enterManualBitePhase() {
  clearManualFishingPhaseTimers();
  manualFishingState.phase = "bite";
  manualFishingState.biteDeadlineAt = Date.now() + 3000;
  manualFishingState.biteSpot = {
    leftPct: Math.round(20 + Math.random() * 60),
    topPct: Math.round(30 + Math.random() * 40)
  };
  const biteBtn = document.getElementById("manualFishBiteCircleBtn");
  if (biteBtn) {
    biteBtn.classList.remove("is-pop");
    void biteBtn.offsetWidth;
    biteBtn.classList.add("is-pop");
  }
  playManualFishSfx("bite");
  if (typeof window.triggerGameHaptic === "function") window.triggerGameHaptic("medium");
  renderManualFishingUi();

  const timerEl = document.getElementById("manualFishTimerBadge");
  const updateBiteTimer = () => {
    const remMs = Math.max(0, manualFishingState.biteDeadlineAt - Date.now());
    if (timerEl) timerEl.textContent = `⏱️ ${(remMs / 1000).toFixed(1)}초`;
    if (remMs <= 0) {
      clearManualFishingPhaseTimers();
      failManualFishing("💨 입질을 놓쳤습니다! 물고기가 미끼만 먹고 도망갔어요...");
    }
  };
  updateBiteTimer();
  manualFishingState.biteTimerId = setInterval(updateBiteTimer, 80);
}

function triggerManualBiteSuccess() {
  clearManualFishingPhaseTimers();
  const baitId = getEffectiveEquippedBaitId();
  const grade = rollFishGrade(baitId);
  const fish = rollFishSpeciesByGrade(grade);
  const width = MANUAL_FISH_GAUGE_WIDTH[grade] || 28;
  const zoneStart = Math.round((8 + Math.random() * (84 - width)) * 10) / 10;

  manualFishingState.targetFish = fish;
  manualFishingState.gaugeZoneStart = zoneStart;
  manualFishingState.gaugeZoneWidth = width;
  manualFishingState.gaugePos = Math.random() < 0.5 ? 2 : 98;
  manualFishingState.gaugeDir = manualFishingState.gaugePos < 50 ? 1 : -1;
  manualFishingState.gaugeStartedAt = performance.now();
  manualFishingState.gaugeReadyAt = manualFishingState.gaugeStartedAt + 240;
  manualFishingState.gaugeLastTs = manualFishingState.gaugeStartedAt;
  manualFishingState.phase = "gauge";

  const zoneEl = document.getElementById("manualFishGaugeZone");
  if (zoneEl) {
    zoneEl.style.left = `${zoneStart}%`;
    zoneEl.style.width = `${width}%`;
  }
  renderManualFishingUi();

  const cursorEl = document.getElementById("manualFishGaugeCursor");
  const timerEl = document.getElementById("manualFishTimerBadge");
  const speedMap = { C: 84, B: 102, A: 122, S: 142 }; // % per second
  const speed = speedMap[grade] || 90;

  const stepGauge = now => {
    if (!manualFishingState.isOpen || manualFishingState.phase !== "gauge") {
      manualFishingState.gaugeRafId = null;
      return;
    }
    const elapsedMs = now - manualFishingState.gaugeStartedAt;
    const remMs = Math.max(0, manualFishingState.gaugeDurationMs - elapsedMs);
    if (timerEl) timerEl.textContent = `⏱️ ${(remMs / 1000).toFixed(1)}초`;

    if (remMs <= 0) {
      clearManualFishingPhaseTimers();
      failManualFishing("⏳ 제한시간(20초)이 초과되어 물고기가 줄을 끊고 도망갔습니다!");
      return;
    }

    const dt = Math.min(0.05, Math.max(0.001, (now - manualFishingState.gaugeLastTs) / 1000));
    manualFishingState.gaugeLastTs = now;
    manualFishingState.gaugePos += manualFishingState.gaugeDir * speed * dt;
    if (manualFishingState.gaugePos >= 100) {
      manualFishingState.gaugePos = 100 - (manualFishingState.gaugePos - 100);
      manualFishingState.gaugeDir = -1;
    } else if (manualFishingState.gaugePos <= 0) {
      manualFishingState.gaugePos = -manualFishingState.gaugePos;
      manualFishingState.gaugeDir = 1;
    }
    if (cursorEl) {
      cursorEl.style.left = `${manualFishingState.gaugePos.toFixed(2)}%`;
    }
    manualFishingState.gaugeRafId = requestAnimationFrame(stepGauge);
  };
  manualFishingState.gaugeRafId = requestAnimationFrame(stepGauge);
}

async function resolveManualGaugeAttempt() {
  const pos = manualFishingState.gaugePos;
  const start = manualFishingState.gaugeZoneStart;
  const end = start + manualFishingState.gaugeZoneWidth;
  clearManualFishingPhaseTimers();
  manualFishingState.actionCooldownUntil = performance.now() + 340;

  if (pos < start || pos > end) {
    failManualFishing("💦 타이밍이 살짝 빗나갔어요! 물고기가 바늘을 털고 달아났습니다.");
    return;
  }

  const fish = manualFishingState.targetFish || FISH_CATALOG[0];
  const { cm, isMax } = rollFishSizeCm(fish);
  const bag = getSafeFishBag();
  const dex = getSafeFishDex();

  const uid = `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const caughtItem = {
    uid,
    fishId: fish.id,
    name: fish.name,
    grade: fish.grade,
    cm,
    isMax,
    price: fish.price,
    exp: fish.exp,
    caughtAt: Date.now()
  };

  bag.unshift(caughtItem);
  if (bag.length > MANUAL_FISH_BAG_LIMIT) bag.length = MANUAL_FISH_BAG_LIMIT;
  userState.fishBag = bag;

  const prevDex = dex[fish.id] || { count: 0, maxCm: 0, isMaxCaught: false };
  const isFirstEver = prevDex.count <= 0;
  const isNewMyBest = cm > (Number(prevDex.maxCm) || 0);
  dex[fish.id] = {
    count: (Number(prevDex.count) || 0) + 1,
    maxCm: Math.max(Number(prevDex.maxCm) || 0, cm),
    isMaxCaught: Boolean(prevDex.isMaxCaught || isMax)
  };
  userState.fishDex = dex;

  manualFishingState.phase = "result";
  manualFishingState.lastCatch = {
    ...caughtItem,
    isFirstEver,
    isNewMyBest,
    fish
  };

  playManualFishSfx(isMax ? "max" : "catch");
  if (typeof window.triggerGameHaptic === "function") {
    window.triggerGameHaptic(isMax ? "success" : "medium");
  }

  renderManualFishingUi();
  renderManualCatchResultCard();

  if (typeof syncProfileToServer === "function") syncProfileToServer();
  if (sbClient && userState.isLoggedIn && (isNewMyBest || isMax)) {
    try {
      sbClient.rpc("submit_fish_ranking_record", {
        p_fish_id: fish.id,
        p_cm: cm,
        p_is_max: isMax
      }).catch(() => {});
    } catch (e) {}
  }
}

function renderManualCatchResultCard() {
  const card = document.getElementById("manualFishResultCard");
  const cv = document.getElementById("manualFishResultCanvas");
  const titleEl = document.getElementById("manualFishResultTitle");
  const metaEl = document.getElementById("manualFishResultMeta");
  const banner = document.getElementById("manualFishStatusBanner");
  const c = manualFishingState.lastCatch;
  if (!card || !c) return;

  if (banner) {
    banner.textContent = c.isMax
      ? `👑 전설의 MAX 크기 [${c.name} ${c.cm.toFixed(1)}cm]를 낚았습니다!!`
      : `🎉 [${c.grade}급 ${c.name}] (${c.cm.toFixed(1)}cm) 포획 성공!`;
  }
  if (cv) {
    drawFishCatalogSprite(cv, c.fish, { locked: false });
  }
  if (titleEl) {
    const badges = [];
    badges.push(`<span class="fish-grade-pill is-${c.grade}">${c.grade}급</span>`);
    if (c.isMax) badges.push(`<span class="fish-max-badge">👑 MAX</span>`);
    if (c.isFirstEver) badges.push(`<span class="fish-new-badge">NEW 도감!</span>`);
    else if (c.isNewMyBest) badges.push(`<span class="fish-new-badge is-best">신기록!</span>`);
    titleEl.innerHTML = `${badges.join(" ")} <strong>${escapeFishHtml(c.name)}</strong>`;
  }
  if (metaEl) {
    metaEl.innerHTML = `
      <div>📏 크기: <strong>${c.cm.toFixed(1)}cm</strong> (이론상 MAX ${c.fish.maxCm.toFixed(1)}cm)</div>
      <div>💰 예상 판매가: <strong>💿 ${c.price} CD</strong> · <strong>✨ ${c.exp} EXP</strong></div>
    `;
  }
  card.classList.toggle("is-max-card", Boolean(c.isMax));
}

function failManualFishing(reasonText) {
  manualFishingState.actionCooldownUntil = performance.now() + 340;
  manualFishingState.phase = "idle";
  manualFishingState.targetFish = null;
  playManualFishSfx("fail");
  renderManualFishingUi();
  const statusEl = document.getElementById("manualFishStatusBanner");
  if (statusEl) statusEl.textContent = reasonText;
}

// 실시간 미끼 교체 팝업
window.openManualBaitPickerModal = function () {
  const listEl = document.getElementById("manualBaitPickerList");
  if (!listEl) return;

  const baits = (typeof AVATAR_SHOP_ITEMS !== "undefined" && AVATAR_SHOP_ITEMS.fishing_bait) || [];
  const curId = getEffectiveEquippedBaitId();

  const rows = [
    `<div class="manual-bait-row ${curId === "none" ? "is-active" : ""}" onclick="selectManualBaitFromPopup('none')">
      <div>
        <strong>🚫 미끼 미착용</strong>
        <div class="manual-bait-sub">C 85% / B 15% (기본 확률)</div>
      </div>
      <span class="badge ${curId === "none" ? "gold" : ""}">${curId === "none" ? "사용중" : "선택"}</span>
    </div>`
  ];

  baits.forEach(b => {
    const cnt = typeof getConsumableCount === "function" ? getConsumableCount(b.id) : 0;
    const r = MANUAL_BAIT_RATES[b.id] || MANUAL_BAIT_RATES.none;
    const active = curId === b.id;
    rows.push(`
      <div class="manual-bait-row ${active ? "is-active" : ""} ${cnt <= 0 ? "is-empty" : ""}" onclick="${cnt > 0 ? `selectManualBaitFromPopup('${b.id}')` : `closeModal('manualBaitPickerModal'); openFishingShopModal('buy')`}">
        <div style="display:flex; align-items:center; gap:9px; min-width:0;">
          <canvas class="manual-bait-thumb" width="480" height="480" data-bait-id="${b.id}"></canvas>
          <div style="min-width:0;">
            <strong>${escapeFishHtml(b.name)} <span style="color:#b45309;">(${cnt}개)</span></strong>
            <div class="manual-bait-sub">C ${r.C}% · B ${r.B}% · A ${r.A}% · S ${r.S}%</div>
          </div>
        </div>
        <span class="badge ${active ? "gold" : cnt > 0 ? "primary" : ""}">${active ? "사용중" : cnt > 0 ? "장착" : "구매"}</span>
      </div>
    `);
  });

  listEl.innerHTML = rows.join("");
  listEl.querySelectorAll(".manual-bait-thumb").forEach(cv => {
    const b = baits.find(x => x.id === cv.getAttribute("data-bait-id"));
    if (b && typeof renderItemThumbnail === "function") {
      renderItemThumbnail(cv, "fishing_bait", b);
    }
  });
  if (typeof openModal === "function") openModal("manualBaitPickerModal");
};

window.selectManualBaitFromPopup = async function (baitId) {
  if (typeof userState === "undefined" || !userState.avatarConfig) return;
  if (baitId !== "none") {
    const cnt = typeof getConsumableCount === "function" ? getConsumableCount(baitId) : 0;
    if (cnt <= 0) {
      if (typeof gameAlert === "function") gameAlert("보유한 미끼가 없습니다. 낚시상점에서 구매해 주세요!");
      return;
    }
  }
  userState.avatarConfig.fishingBait = baitId;
  if (typeof shopPreviewState !== "undefined" && shopPreviewState.config) {
    shopPreviewState.config.fishingBait = baitId;
  }
  if (typeof closeModal === "function") closeModal("manualBaitPickerModal");
  if (typeof renderFishingHud === "function") renderFishingHud();
  renderManualFishingTopBar();
  if (typeof syncFishingPlayersDOM === "function") {
    try { syncFishingPlayersDOM(); } catch (e) {}
  }
  if (typeof syncProfileToServer === "function") await syncProfileToServer();
};

// ============================================================================
// 4. 가방 [🐟 어망] 탭 연동 (#bagScreen)
// ============================================================================
let activeBagMainTab = "items";

window.switchBagMainTab = function (tab) {
  activeBagMainTab = tab === "fish" ? "fish" : "items";
  const tabItem = document.getElementById("bagTabBtn_items");
  const tabFish = document.getElementById("bagTabBtn_fish");
  const itemPane = document.getElementById("bagItemsPane");
  const fishPane = document.getElementById("bagFishPane");
  if (tabItem) tabItem.classList.toggle("active", activeBagMainTab === "items");
  if (tabFish) tabFish.classList.toggle("active", activeBagMainTab === "fish");
  if (itemPane) itemPane.classList.toggle("hidden", activeBagMainTab !== "items");
  if (fishPane) fishPane.classList.toggle("hidden", activeBagMainTab !== "fish");
  if (activeBagMainTab === "fish") {
    renderBagFishTab();
  }
};

window.renderBagFishTab = function () {
  const countEl = document.getElementById("bagFishCountLabel");
  const listEl = document.getElementById("bagFishList");
  const warnEl = document.getElementById("bagFishWarnBanner");
  const bag = getSafeFishBag();

  if (countEl) {
    const totCd = bag.reduce((s, f) => s + (Number(f.price) || 0), 0);
    const totExp = bag.reduce((s, f) => s + (Number(f.exp) || 0), 0);
    countEl.textContent = `🐟 보관 ${bag.length} / ${MANUAL_FISH_BAG_LIMIT}마리 (총 💿 ${totCd.toLocaleString()} · ✨ ${totExp.toLocaleString()})`;
  }
  if (warnEl) {
    if (bag.length >= MANUAL_FISH_BAG_LIMIT) {
      warnEl.textContent = "🚨 어망이 가득 찼습니다! 낚시상점에서 판매해야 손낚시를 계속할 수 있습니다.";
      warnEl.classList.remove("hidden");
    } else if (bag.length >= MANUAL_FISH_BAG_WARN) {
      warnEl.textContent = `⚠️ 어망이 곧 가득 찹니다 (${bag.length}/${MANUAL_FISH_BAG_LIMIT}마리). 낚시상점에서 판매해 보세요!`;
      warnEl.classList.remove("hidden");
    } else {
      warnEl.classList.add("hidden");
    }
  }
  if (!listEl) return;
  if (bag.length === 0) {
    listEl.innerHTML = `<div style="text-align:center; padding:34px 12px; color:var(--text-sub); font-size:0.84rem; font-weight:700;">어망이 비어 있습니다.<br/>낚시터에서 [🎣 낚시하기]로 물고기를 잡아보세요!</div>`;
    return;
  }

  listEl.innerHTML = bag.map(item => {
    const fish = getFishCatalogItem(item.fishId);
    return `
      <div class="fish-bag-row ${item.isMax ? "is-max-row" : ""}">
        <canvas class="fish-mini-canvas" width="480" height="480" data-fish-id="${escapeFishHtml(item.fishId)}"></canvas>
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:5px; flex-wrap:wrap;">
            <span class="fish-grade-pill is-${item.grade}">${item.grade}</span>
            <strong style="font-size:0.88rem; color:#1e1b18;">${escapeFishHtml(item.name)}</strong>
            ${item.isMax ? `<span class="fish-max-badge">👑 MAX</span>` : ""}
          </div>
          <div style="font-size:0.75rem; font-weight:800; color:#475569; margin-top:2px;">
            📏 ${Number(item.cm || 0).toFixed(1)}cm · 판매가 💿 ${item.price} / ✨ ${item.exp} EXP
          </div>
        </div>
      </div>
    `;
  }).join("");

  listEl.querySelectorAll(".fish-mini-canvas").forEach(cv => {
    const f = getFishCatalogItem(cv.getAttribute("data-fish-id"));
    if (f) drawFishCatalogSprite(cv, f, { locked: false });
  });
};

// ============================================================================
// 5. 물고기 도감 & 어종별 Top 5 랭킹 모달 (#fishDexModal)
// ============================================================================
let fishDexFilterGrade = "ALL";
let fishDexSelectedId = FISH_CATALOG[0].id;

window.openFishDexModal = function (initialFishId = null) {
  if (initialFishId && getFishCatalogItem(initialFishId)) {
    fishDexSelectedId = initialFishId;
  }
  fishDexFilterGrade = "ALL";
  if (typeof openModal === "function") openModal("fishDexModal");
  renderFishDexModal();
  selectFishDexDetail(fishDexSelectedId);
};

window.setFishDexGradeFilter = function (grade) {
  fishDexFilterGrade = grade || "ALL";
  renderFishDexModal();
};

function renderFishDexModal() {
  const dex = getSafeFishDex();
  const caughtSpeciesCount = FISH_CATALOG.filter(f => (dex[f.id]?.count || 0) > 0).length;
  const maxCaughtCount = FISH_CATALOG.filter(f => dex[f.id]?.isMaxCaught).length;

  const summaryEl = document.getElementById("fishDexSummaryBanner");
  if (summaryEl) {
    summaryEl.textContent = `📖 발견 ${caughtSpeciesCount}/${FISH_CATALOG.length}종 · 👑 MAX 기록 ${maxCaughtCount}종`;
  }

  document.querySelectorAll("[data-dex-grade]").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-dex-grade") === fishDexFilterGrade);
  });

  const gridEl = document.getElementById("fishDexGrid");
  if (!gridEl) return;
  const filtered = FISH_CATALOG.filter(f => fishDexFilterGrade === "ALL" || f.grade === fishDexFilterGrade);

  gridEl.innerHTML = filtered.map(f => {
    const rec = dex[f.id];
    const unlocked = Boolean(rec && Number(rec.count) > 0);
    const isSel = fishDexSelectedId === f.id;
    return `
      <div class="fish-dex-tile ${unlocked ? "is-unlocked" : "is-locked"} ${isSel ? "is-selected" : ""}" onclick="selectFishDexDetail('${f.id}')">
        <span class="fish-grade-pill is-${f.grade} dex-pill">${f.grade}</span>
        ${rec?.isMaxCaught ? `<span class="fish-max-badge dex-max">👑</span>` : ""}
        <canvas class="fish-dex-thumb" width="480" height="480" data-fish-id="${f.id}" data-locked="${unlocked ? "0" : "1"}"></canvas>
        <div class="fish-dex-name">${unlocked ? escapeFishHtml(f.name) : "???"}</div>
        <div class="fish-dex-cm">${unlocked ? `${Number(rec.maxCm || 0).toFixed(1)}cm` : `MAX ${f.maxCm.toFixed(1)}`}</div>
      </div>
    `;
  }).join("");

  gridEl.querySelectorAll(".fish-dex-thumb").forEach(cv => {
    const f = getFishCatalogItem(cv.getAttribute("data-fish-id"));
    if (f) drawFishCatalogSprite(cv, f, { locked: cv.getAttribute("data-locked") === "1" });
  });
}

window.selectFishDexDetail = async function (fishId) {
  const f = getFishCatalogItem(fishId);
  if (!f) return;
  fishDexSelectedId = fishId;
  renderFishDexModal();

  const dex = getSafeFishDex();
  const rec = dex[fishId] || { count: 0, maxCm: 0, isMaxCaught: false };
  const unlocked = Number(rec.count) > 0;

  const cv = document.getElementById("fishDexDetailCanvas");
  const titleEl = document.getElementById("fishDexDetailTitle");
  const descEl = document.getElementById("fishDexDetailDesc");
  const rankListEl = document.getElementById("fishDexTop5List");

  if (cv) drawFishCatalogSprite(cv, f, { locked: !unlocked });
  if (titleEl) {
    titleEl.innerHTML = `
      <span class="fish-grade-pill is-${f.grade}">${f.grade}급</span>
      <strong>${unlocked ? escapeFishHtml(f.name) : "미발견 어종"}</strong>
      ${rec.isMaxCaught ? `<span class="fish-max-badge">👑 MAX</span>` : ""}
      <span class="badge gold" style="font-size:0.68rem;">이론상 MAX ${f.maxCm.toFixed(1)}cm</span>
    `;
  }
  if (descEl) {
    const myTxt = unlocked
      ? `내 최고기록: ${Number(rec.maxCm).toFixed(1)}cm (${rec.count}마리 포획) · 판매 💿 ${f.price} / ✨ ${f.exp} EXP`
      : `크기 범위: ${f.minCm.toFixed(1)}~${f.maxCm.toFixed(1)}cm · 판매 💿 ${f.price} / ✨ ${f.exp} EXP`;
    descEl.innerHTML = `<div>${escapeFishHtml(unlocked ? f.desc : "낚시터에서 [🎣 낚시하기]로 이 물고기를 잡아보세요!")}</div><div style="margin-top:3px; color:#b45309; font-weight:900;">${myTxt}</div>`;
  }

  if (!rankListEl) return;
  rankListEl.innerHTML = `<div style="text-align:center; padding:12px; font-size:0.78rem; color:var(--text-sub);">🏆 Top 5 랭킹 불러오는 중...</div>`;

  if (!sbClient) {
    rankListEl.innerHTML = `<div style="text-align:center; padding:12px; font-size:0.78rem; color:var(--text-sub);">오프라인 상태에서는 랭킹을 불러올 수 없습니다.</div>`;
    return;
  }

  try {
    const { data, error } = await sbClient
      .from("fish_rankings")
      .select("user_id, nickname, cm, is_max, caught_at")
      .eq("fish_id", fishId)
      .order("cm", { ascending: false })
      .order("caught_at", { ascending: true })
      .limit(5);

    if (error || !Array.isArray(data) || data.length === 0) {
      rankListEl.innerHTML = `<div style="text-align:center; padding:12px; font-size:0.78rem; color:var(--text-sub);">아직 등록된 기록이 없습니다. 첫 번째 1등에 도전해보세요!</div>`;
      return;
    }

    const medals = ["🥇 1위", "🥈 2위", "🥉 3위", "4위", "5위"];
    rankListEl.innerHTML = data.map((row, idx) => {
      const isMe = userState?.id && row.user_id === userState.id;
      return `
        <div class="fish-rank-row ${row.is_max ? "is-max-row" : ""} ${isMe ? "is-me" : ""}">
          <span><strong>${medals[idx] || `${idx + 1}위`}</strong> ${escapeFishHtml(row.nickname || "도전자")}${row.is_max ? ` <span class="fish-max-badge">👑 MAX</span>` : ""}</span>
          <strong style="color:#0369a1;">${Number(row.cm || 0).toFixed(1)}cm</strong>
        </div>
      `;
    }).join("");
  } catch (e) {
    rankListEl.innerHTML = `<div style="text-align:center; padding:12px; font-size:0.78rem; color:var(--danger);">랭킹 조회 중 오류가 발생했습니다.</div>`;
  }
};

// ============================================================================
// 6. 공용 전용 배경 낚시상점 NPC 모달 (#fishingShopModal)
// ============================================================================
let fishingShopTab = "buy";

const FISHING_SHOP_NPC_AVATAR_CFG = {
  gender: "male",
  bg: "meadow",
  hair: "silver_perm",
  hat: "bucket_hat",
  face: "tough_beard",
  outfit: "overalls",
  acc: "none",
  wing: "none",
  effect: "none",
  fishingRod: "rod_s",
  fishingBait: "none"
};

let _fishingShopNpcAvatarOffscreen = null;

function getFishingShopNpcAvatarCanvas() {
  if (_fishingShopNpcAvatarOffscreen) return _fishingShopNpcAvatarOffscreen;
  if (typeof renderPixelAvatar !== "function") return null;
  const off = document.createElement("canvas");
  off.width = 480;
  off.height = 480;
  renderPixelAvatar(off, FISHING_SHOP_NPC_AVATAR_CFG, {
    transparentBg: true,
    matchCssAspect: false,
    skipEffectLoop: true,
    fishingIdle: true
  });
  _fishingShopNpcAvatarOffscreen = off;
  return off;
}

function drawFishingShopSceneAndNpc(speechMsg = null, mood = "idle") {
  const cv = document.getElementById("fishingShopNpcCanvas");
  const speechEl = document.getElementById("fishingShopNpcSpeech");
  if (speechEl && speechMsg) speechEl.textContent = speechMsg;
  if (!cv) return;

  if (cv.width < 960 || cv.height < 400) {
    cv.width = 960;
    cv.height = 400;
  }

  const ctx = cv.getContext("2d");
  const CW = cv.width;
  const CH = cv.height;
  const W = 960;
  const H = 400;
  const outline = "#1e1b18";
  const isHappy = mood === "happy";

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.clearRect(0, 0, CW, CH);
  ctx.scale(CW / W, CH / H);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // 1) 화창한 호수 하늘 & 부드러운 구름
  const sky = ctx.createLinearGradient(0, 0, 0, 224);
  sky.addColorStop(0, "#0ea5e9");
  sky.addColorStop(0.58, "#7dd3fc");
  sky.addColorStop(1, "#fef9c3");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 224);

  [[190, 88, 1.0], [760, 74, 0.9]].forEach(([cx, cy, cs]) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(cs, cs);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath();
    ctx.arc(-28, 8, 22, 0, Math.PI * 2);
    ctx.arc(4, -2, 28, 0, Math.PI * 2);
    ctx.arc(36, 10, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // 2) 먼 산 & 소나무 능선
  ctx.fillStyle = "#16a34a";
  ctx.strokeStyle = outline;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 212);
  ctx.quadraticCurveTo(180, 134, 380, 204);
  ctx.quadraticCurveTo(560, 146, 740, 198);
  ctx.quadraticCurveTo(860, 152, W, 196);
  ctx.lineTo(W, 224);
  ctx.lineTo(0, 224);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3) 반짝이는 호수 수면
  const lake = ctx.createLinearGradient(0, 198, 0, 292);
  lake.addColorStop(0, "#0284c7");
  lake.addColorStop(1, "#0369a1");
  ctx.fillStyle = lake;
  ctx.fillRect(0, 198, W, 96);
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 3.5;
  [[150, 224], [250, 246], [710, 222], [810, 248]].forEach(([wx, wy]) => {
    ctx.beginPath();
    ctx.moveTo(wx - 34, wy);
    ctx.lineTo(wx + 34, wy);
    ctx.stroke();
  });

  // 4) 좌우 낚시 오두막 목재 기둥 & 선반 진열대
  ctx.fillStyle = "#78350f";
  ctx.strokeStyle = outline;
  ctx.lineWidth = 4.5;
  ctx.fillRect(28, 44, 34, 244);
  ctx.strokeRect(28, 44, 34, 244);
  ctx.fillRect(W - 62, 44, 34, 244);
  ctx.strokeRect(W - 62, 44, 34, 244);

  // 왼쪽 나무 진열 선반 & 매달린 장식 찌/랜턴
  ctx.fillStyle = "#92400e";
  ctx.beginPath();
  ctx.roundRect(74, 152, 146, 18, 6);
  ctx.fill();
  ctx.stroke();

  // 선반 위 유리 떡밥 병 2개
  [{ x: 96, col: "#fb7185" }, { x: 146, col: "#facc15" }].forEach(jar => {
    ctx.fillStyle = "#e0f2fe";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(jar.x, 108, 36, 44, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = jar.col;
    ctx.fillRect(jar.x + 6, 122, 24, 24);
    ctx.fillStyle = "#b45309";
    ctx.beginPath();
    ctx.roundRect(jar.x + 5, 101, 26, 9, 4);
    ctx.fill();
    ctx.stroke();
  });

  // 따뜻한 노란 랜턴
  ctx.strokeStyle = outline;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(212, 46);
  ctx.lineTo(212, 92);
  ctx.stroke();
  ctx.fillStyle = "#fef08a";
  ctx.beginPath();
  ctx.arc(212, 114, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(253, 224, 71, 0.28)";
  ctx.beginPath();
  ctx.arc(212, 114, 42, 0, Math.PI * 2);
  ctx.fill();

  // 오른쪽 진열 목판 안내판 ("강태공 낚시상회")
  ctx.fillStyle = "#fef3c7";
  ctx.strokeStyle = outline;
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.roundRect(710, 82, 174, 62, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#78350f";
  ctx.font = "900 22px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("강태공 상회", 797, 106);
  ctx.fillStyle = "#0369a1";
  ctx.font = "800 15px sans-serif";
  ctx.fillText("장비·미끼·어망매입", 797, 130);

  // 5) 가운데 우리 게임 480×480 유저 스타일 캐릭터 NPC ("강태공 사장님")
  const npcSprite = getFishingShopNpcAvatarCanvas();
  if (npcSprite) {
    const npcSize = 368;
    const npcX = W / 2 - npcSize / 2;
    const npcY = isHappy ? 0 : 10;
    ctx.drawImage(npcSprite, npcX, npcY, npcSize, npcSize);
  }

  // 구매·판매 성공 시 황금 반짝임 효과
  if (isHappy) {
    [
      [340, 128, 16],
      [626, 112, 15],
      [372, 228, 11],
      [612, 214, 12]
    ].forEach(([sx, sy, sr]) => {
      ctx.fillStyle = "#fde047";
      ctx.strokeStyle = outline;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sx, sy - sr);
      ctx.lineTo(sx + sr * 0.35, sy - sr * 0.35);
      ctx.lineTo(sx + sr, sy);
      ctx.lineTo(sx + sr * 0.35, sy + sr * 0.35);
      ctx.lineTo(sx, sy + sr);
      ctx.lineTo(sx - sr * 0.35, sy + sr * 0.35);
      ctx.lineTo(sx - sr, sy);
      ctx.lineTo(sx - sr * 0.35, sy - sr * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
  }

  // 6) 상점 줄무늬 어닝 차양 (스칼럽 마감 - 모자가 가려지지 않는 컴팩트 높이)
  const stripeCount = 20;
  const sw = W / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#0284c7" : "#fef08a";
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.rect(i * sw, 0, sw, 14);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(i * sw + sw / 2, 14, sw / 2, 0, Math.PI);
    ctx.fill();
    ctx.stroke();
  }

  // 7) 전경 원목 상점 카운터 & 얼음 물고기 바구니 & 카운터 찌
  const counterTopY = 286;
  const woodGrad = ctx.createLinearGradient(0, counterTopY, 0, H);
  woodGrad.addColorStop(0, "#d97706");
  woodGrad.addColorStop(0.2, "#b45309");
  woodGrad.addColorStop(1, "#78350f");
  ctx.fillStyle = woodGrad;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(14, counterTopY, W - 28, H - counterTopY + 10, 14);
  ctx.fill();
  ctx.stroke();

  // 카운터 상판 하이라이트
  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.roundRect(14, counterTopY, W - 28, 22, 10);
  ctx.fill();
  ctx.stroke();

  // 나무 결 패널 라인
  ctx.strokeStyle = "rgba(69, 26, 3, 0.45)";
  ctx.lineWidth = 3.5;
  [180, 380, 580, 780].forEach(px => {
    ctx.beginPath();
    ctx.moveTo(px, counterTopY + 26);
    ctx.lineTo(px, H - 6);
    ctx.stroke();
  });

  // 카운터 왼쪽: 작은 나무 태클 박스
  ctx.fillStyle = "#16a34a";
  ctx.strokeStyle = outline;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(72, counterTopY - 34, 88, 42, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#facc15";
  ctx.fillRect(108, counterTopY - 18, 16, 12);
  ctx.strokeRect(108, counterTopY - 18, 16, 12);

  // 카운터 오른쪽: 얼음 물고기 양동이
  ctx.fillStyle = "#94a3b8";
  ctx.beginPath();
  ctx.roundRect(748, counterTopY - 46, 86, 56, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#38bdf8";
  ctx.beginPath();
  ctx.ellipse(792, counterTopY - 46, 36, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fb7185";
  ctx.beginPath();
  ctx.ellipse(804, counterTopY - 52, 20, 11, -0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 카운터 중앙 명찰 (나무 각인 명패)
  ctx.fillStyle = "#fef08a";
  ctx.strokeStyle = outline;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(386, counterTopY + 38, 188, 44, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#1e1b18";
  ctx.font = "900 21px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🎣 강태공 사장님", 480, counterTopY + 61);

  ctx.restore();
}

window.openFishingShopModal = function (defaultTab = "buy") {
  fishingShopTab = defaultTab === "sell" ? "sell" : "buy";
  if (typeof openModal === "function") openModal("fishingShopModal");
  renderFishingShopModal(
    fishingShopTab === "sell"
      ? "월척 잡으셨나~? 팔고 싶은 물고기를 골라보쇼!"
      : "어서오쇼! 낚싯대와 싱싱한 미끼 다 준비돼 있소~"
  );
};

window.switchFishingShopTab = function (tab) {
  fishingShopTab = tab === "sell" ? "sell" : "buy";
  renderFishingShopModal(
    fishingShopTab === "sell"
      ? "자~ 오늘 잡은 물고기들 시세대로 쳐드리리다!"
      : "좋은 장비일수록 대물 만날 확률이 확 올라간다오!"
  );
};

window.refreshFishingShopModalIfOpen = function () {
  const modal = document.getElementById("fishingShopModal");
  if (modal && !modal.classList.contains("hidden")) {
    renderFishingShopModal(null, "happy");
  }
};

window.renderFishingShopModal = function (speechMsg = null, npcMood = "idle") {
  drawFishingShopSceneAndNpc(speechMsg, npcMood);

  const cdEl = document.getElementById("fishingShopCdBalance");
  if (cdEl) cdEl.textContent = (Number(userState?.cdCoins) || 0).toLocaleString();

  const buyBtn = document.getElementById("fishingShopTab_buy");
  const sellBtn = document.getElementById("fishingShopTab_sell");
  const buyPane = document.getElementById("fishingShopBuyPane");
  const sellPane = document.getElementById("fishingShopSellPane");
  if (buyBtn) buyBtn.classList.toggle("active", fishingShopTab === "buy");
  if (sellBtn) sellBtn.classList.toggle("active", fishingShopTab === "sell");
  if (buyPane) buyPane.classList.toggle("hidden", fishingShopTab !== "buy");
  if (sellPane) sellPane.classList.toggle("hidden", fishingShopTab !== "sell");

  // 현재 장착 중인 낚싯대 / 미끼 2칸 슬롯 (일반 상점에서 이관)
  const cfg = userState?.avatarConfig || {};
  const rodId = cfg.fishingRod || "none";
  const rodItem = typeof getItemById === "function" ? getItemById("fishing_rod", rodId) : null;
  const baitId = getEffectiveEquippedBaitId();
  const baitItem = typeof getItemById === "function" ? getItemById("fishing_bait", baitId) : null;
  const baitCnt = baitId !== "none" && typeof getConsumableCount === "function" ? getConsumableCount(baitId) : 0;

  const rodCanvas = document.getElementById("fishShopCurRodCanvas");
  const rodNameEl = document.getElementById("fishShopCurRodName");
  const rodSubEl = document.getElementById("fishShopCurRodSub");
  const rodUnequipBtn = document.getElementById("fishShopUnequipRodBtn");
  if (rodCanvas && typeof renderItemThumbnail === "function") {
    renderItemThumbnail(rodCanvas, "fishing_rod", rodItem);
  }
  if (rodNameEl) rodNameEl.textContent = rodId !== "none" && rodItem ? rodItem.name : "낚싯대 미착용";
  if (rodSubEl) {
    const expPct = rodId !== "none" && rodItem ? Math.round(((Number(rodItem.expMultiplier) || 1) - 1) * 100) : 0;
    const cutSec = MANUAL_FISH_ROD_REDUCTION[rodId] || 0;
    rodSubEl.textContent = rodId !== "none" ? `입질 -${cutSec}초 · 방치 EXP+${expPct}%` : "기본 대기(5~15초)";
  }
  if (rodUnequipBtn) rodUnequipBtn.classList.toggle("hidden", rodId === "none");

  const baitCanvas = document.getElementById("fishShopCurBaitCanvas");
  const baitNameEl = document.getElementById("fishShopCurBaitName");
  const baitSubEl = document.getElementById("fishShopCurBaitSub");
  const baitUnequipBtn = document.getElementById("fishShopUnequipBaitBtn");
  if (baitCanvas && typeof renderItemThumbnail === "function") {
    renderItemThumbnail(baitCanvas, "fishing_bait", baitItem);
  }
  if (baitNameEl) baitNameEl.textContent = baitId !== "none" && baitItem ? `${baitItem.name} (${baitCnt}개)` : "미끼 미착용";
  if (baitSubEl) {
    const cdPct = baitId !== "none" && baitItem ? Math.round(((Number(baitItem.cdMultiplier) || 1) - 1) * 100) : 0;
    baitSubEl.textContent = baitId !== "none" ? `대물확률 UP · 방치 CD+${cdPct}%` : "기본 확률 (C 85% / B 15%)";
  }
  if (baitUnequipBtn) baitUnequipBtn.classList.toggle("hidden", baitId === "none");

  if (fishingShopTab === "buy") {
    renderFishingShopBuyPane();
  } else {
    renderFishingShopSellPane();
  }
};

function renderFishingShopBuyPane() {
  const container = document.getElementById("fishingShopBuyPane");
  if (!container) return;

  const rods = (typeof AVATAR_SHOP_ITEMS !== "undefined" && AVATAR_SHOP_ITEMS.fishing_rod) || [];
  const baits = (typeof AVATAR_SHOP_ITEMS !== "undefined" && AVATAR_SHOP_ITEMS.fishing_bait) || [];
  const curRodId = userState?.avatarConfig?.fishingRod || "none";
  const curBaitId = getEffectiveEquippedBaitId();

  const rodHtml = rods.map((rod, idx) => {
    const owned = Array.isArray(userState?.ownedItems) && userState.ownedItems.includes(rod.id);
    const equipped = curRodId === rod.id;
    const expPct = Math.round(((Number(rod.expMultiplier) || 1) - 1) * 100);
    const cutSec = MANUAL_FISH_ROD_REDUCTION[rod.id] || 0;
    const btnHtml = equipped
      ? `<button type="button" class="btn" style="padding:6px 10px; font-size:0.74rem;" onclick="unequipFishingShopGear('fishing_rod')">해제</button>`
      : owned
      ? `<button type="button" class="btn btn-primary" style="padding:6px 10px; font-size:0.74rem;" onclick="equipFishingShopGear('fishing_rod', '${rod.id}')">장착</button>`
      : `<button type="button" class="btn btn-gold" style="padding:6px 10px; font-size:0.74rem;" onclick="buyFishingShopRod('${rod.id}')">💿 ${Number(rod.price).toLocaleString()}</button>`;
    return `
      <div class="fshop-item-row ${equipped ? "is-equipped" : ""}">
        <canvas id="fshopRodCv_${idx}" class="fshop-item-cv" width="480" height="480"></canvas>
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:5px; flex-wrap:wrap;">
            <span class="fish-grade-pill is-${rod.grade || "C"}">${rod.grade || "C"}</span>
            <strong style="font-size:0.86rem; color:#1e1b18;">${escapeFishHtml(rod.name)}</strong>
            ${equipped ? `<span class="badge gold" style="font-size:0.64rem;">착용중</span>` : owned ? `<span class="badge primary" style="font-size:0.64rem;">보유</span>` : ""}
          </div>
          <div style="font-size:0.72rem; color:#475569; font-weight:700; margin-top:2px;">입질 시간 -${cutSec}초 · 방치 EXP +${expPct}%</div>
        </div>
        ${btnHtml}
      </div>
    `;
  }).join("");

  const baitHtml = baits.map((bait, idx) => {
    const cnt = typeof getConsumableCount === "function" ? getConsumableCount(bait.id) : 0;
    const equipped = curBaitId === bait.id && cnt > 0;
    const r = MANUAL_BAIT_RATES[bait.id] || MANUAL_BAIT_RATES.none;
    const cdPct = Math.round(((Number(bait.cdMultiplier) || 1) - 1) * 100);
    return `
      <div class="fshop-item-row ${equipped ? "is-equipped" : ""}">
        <canvas id="fshopBaitCv_${idx}" class="fshop-item-cv" width="480" height="480"></canvas>
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:5px; flex-wrap:wrap;">
            <span class="fish-grade-pill is-${bait.grade || "C"}">${bait.grade || "C"}</span>
            <strong style="font-size:0.86rem; color:#1e1b18;">${escapeFishHtml(bait.name)}</strong>
            <span class="badge" style="font-size:0.64rem;">보유 ${cnt}개</span>
            ${equipped ? `<span class="badge gold" style="font-size:0.64rem;">착용중</span>` : ""}
          </div>
          <div style="font-size:0.71rem; color:#475569; font-weight:700; margin-top:2px;">손낚시 A ${r.A}%/S ${r.S}% · 방치 CD +${cdPct}% (30분당 1개)</div>
        </div>
        <div style="display:flex; gap:4px; flex-shrink:0;">
          ${cnt > 0 && !equipped ? `<button type="button" class="btn btn-primary" style="padding:6px 8px; font-size:0.72rem;" onclick="equipFishingShopGear('fishing_bait', '${bait.id}')">장착</button>` : ""}
          ${equipped ? `<button type="button" class="btn" style="padding:6px 8px; font-size:0.72rem;" onclick="unequipFishingShopGear('fishing_bait')">해제</button>` : ""}
          <button type="button" class="btn btn-gold" style="padding:6px 8px; font-size:0.72rem;" onclick="buyFishingShopBait('${bait.id}')">💿 ${Number(bait.price).toLocaleString()}</button>
        </div>
      </div>
    `;
  }).join("");

  container.innerHTML = `
    <div class="fshop-sec-title">🎣 낚싯대 (영구 장비)</div>
    <div class="fshop-list">${rodHtml}</div>
    <div class="fshop-sec-title" style="margin-top:8px;">🪱 미끼 (30분당 1개 소모)</div>
    <div class="fshop-list">${baitHtml}</div>
  `;

  if (typeof renderItemThumbnail === "function") {
    rods.forEach((rod, idx) => {
      const cv = document.getElementById(`fshopRodCv_${idx}`);
      if (cv) renderItemThumbnail(cv, "fishing_rod", rod);
    });
    baits.forEach((bait, idx) => {
      const cv = document.getElementById(`fshopBaitCv_${idx}`);
      if (cv) renderItemThumbnail(cv, "fishing_bait", bait);
    });
  }
}

window.buyFishingShopRod = function (rodId) {
  if (!userState?.isLoggedIn) {
    if (typeof gameAlert === "function") gameAlert("로그인이 필요합니다!");
    return;
  }
  const rod = typeof getItemById === "function" ? getItemById("fishing_rod", rodId) : null;
  if (!rod || rod.id === "none") return;
  const price = Number(rod.price) || 0;
  if ((Number(userState.cdCoins) || 0) < price) {
    if (typeof gameAlert === "function") {
      gameAlert(`💿 CD가 부족합니다! (보유: ${userState.cdCoins.toLocaleString()} CD / 필요: ${price.toLocaleString()} CD)`);
    }
    return;
  }
  if (typeof gameConfirm === "function") {
    gameConfirm(
      `[${rod.name}]을(를) 💿 ${price.toLocaleString()} CD에 구매하고 즉시 장착할까요?`,
      async () => {
        if ((Number(userState.cdCoins) || 0) < price) return;
        userState.cdCoins -= price;
        if (!Array.isArray(userState.ownedItems)) userState.ownedItems = [];
        if (!userState.ownedItems.includes(rod.id)) userState.ownedItems.push(rod.id);
        userState.avatarConfig.fishingRod = rod.id;
        if (typeof shopPreviewState !== "undefined" && shopPreviewState.config) {
          shopPreviewState.config.fishingRod = rod.id;
        }
        await syncProfileToServer();
        if (typeof renderFishingHud === "function") renderFishingHud();
        if (typeof syncFishingPlayersDOM === "function") { try { syncFishingPlayersDOM(); } catch (e) {} }
        renderManualFishingTopBar();
        renderFishingShopModal(`[${rod.name}] 장만하셨구먼! 큰 놈 낚으실 거요~`, "happy");
      },
      "🎣 낚싯대 구매"
    );
  }
};

window.buyFishingShopBait = function (baitId) {
  if (!userState?.isLoggedIn) {
    if (typeof gameAlert === "function") gameAlert("로그인이 필요합니다!");
    return;
  }
  const bait = typeof getItemById === "function" ? getItemById("fishing_bait", baitId) : null;
  if (!bait || bait.id === "none") return;
  if (typeof purchaseConsumableShopItem === "function") {
    purchaseConsumableShopItem("fishing_bait", bait);
  }
};

window.equipFishingShopGear = async function (cat, itemId) {
  const key = cat === "fishing_rod" ? "fishingRod" : "fishingBait";
  userState.avatarConfig[key] = itemId;
  if (typeof shopPreviewState !== "undefined" && shopPreviewState.config) {
    shopPreviewState.config[key] = itemId;
  }
  await syncProfileToServer();
  if (typeof renderFishingHud === "function") renderFishingHud();
  if (typeof syncFishingPlayersDOM === "function") { try { syncFishingPlayersDOM(); } catch (e) {} }
  renderManualFishingTopBar();
  renderFishingShopModal("딱 맞게 장착해드렸소!", "happy");
};

window.unequipFishingShopGear = async function (cat) {
  const key = cat === "fishing_rod" ? "fishingRod" : "fishingBait";
  userState.avatarConfig[key] = "none";
  if (typeof shopPreviewState !== "undefined" && shopPreviewState.config) {
    shopPreviewState.config[key] = "none";
  }
  await syncProfileToServer();
  if (typeof renderFishingHud === "function") renderFishingHud();
  if (typeof syncFishingPlayersDOM === "function") { try { syncFishingPlayersDOM(); } catch (e) {} }
  renderManualFishingTopBar();
  renderFishingShopModal("장착을 깔끔하게 해제했소!");
};

function renderFishingShopSellPane() {
  const container = document.getElementById("fishingShopSellPane");
  if (!container) return;

  const bag = getSafeFishBag();
  if (bag.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:34px 12px; color:var(--text-sub); font-size:0.84rem; font-weight:700;">어망에 판매할 물고기가 없습니다.<br/>낚시터에서 [🎣 낚시하기]로 물고기를 낚아보세요!</div>`;
    return;
  }

  const totCd = bag.reduce((s, f) => s + (Number(f.price) || 0), 0);
  const totExp = bag.reduce((s, f) => s + (Number(f.exp) || 0), 0);

  const listHtml = bag.map((item, idx) => `
    <div class="fshop-item-row ${item.isMax ? "is-max-row" : ""}">
      <canvas id="fshopSellCv_${idx}" class="fshop-item-cv" width="480" height="480"></canvas>
      <div style="flex:1; min-width:0;">
        <div style="display:flex; align-items:center; gap:5px; flex-wrap:wrap;">
          <span class="fish-grade-pill is-${item.grade}">${item.grade}</span>
          <strong style="font-size:0.86rem; color:#1e1b18;">${escapeFishHtml(item.name)}</strong>
          ${item.isMax ? `<span class="fish-max-badge">👑 MAX</span>` : ""}
        </div>
        <div style="font-size:0.72rem; color:#475569; font-weight:800; margin-top:2px;">
          📏 ${Number(item.cm || 0).toFixed(1)}cm · 💿 ${item.price} CD · ✨ ${item.exp} EXP
        </div>
      </div>
      <button type="button" class="btn btn-gold" style="padding:6px 10px; font-size:0.74rem; flex-shrink:0;" onclick="sellSingleFishFromBag('${escapeFishHtml(item.uid)}')">판매</button>
    </div>
  `).join("");

  container.innerHTML = `
    <div class="fshop-sell-summary">
      <div>
        <div style="font-size:0.78rem; font-weight:900; color:#1e1b18;">🐟 어망 ${bag.length}/${MANUAL_FISH_BAG_LIMIT}마리</div>
        <div style="font-size:0.74rem; font-weight:800; color:#b45309;">일괄 판매: 💿 +${totCd.toLocaleString()} CD · ✨ +${totExp.toLocaleString()} EXP</div>
      </div>
      <button type="button" class="btn btn-gold" style="padding:8px 12px; font-size:0.8rem;" onclick="sellAllFishFromBag()">💰 모두 팔기</button>
    </div>
    <div class="fshop-list">${listHtml}</div>
  `;

  bag.forEach((item, idx) => {
    const cv = document.getElementById(`fshopSellCv_${idx}`);
    const f = getFishCatalogItem(item.fishId);
    if (cv && f) drawFishCatalogSprite(cv, f, { locked: false });
  });
}

window.sellSingleFishFromBag = async function (fishUid) {
  const bag = getSafeFishBag();
  const idx = bag.findIndex(f => f.uid === fishUid);
  if (idx === -1) return;
  const item = bag[idx];
  const gainCd = Math.max(0, Number(item.price) || 0);
  const gainExp = Math.max(0, Number(item.exp) || 0);

  bag.splice(idx, 1);
  userState.fishBag = bag;
  userState.cdCoins = (Number(userState.cdCoins) || 0) + gainCd;
  userState.exp = (Number(userState.exp) || 0) + gainExp;

  playManualFishSfx("catch");
  if (typeof syncProfileToServer === "function") await syncProfileToServer();
  if (typeof updateHeaderUserUI === "function") updateHeaderUserUI();
  renderManualFishingTopBar();
  if (typeof renderBagFishTab === "function") renderBagFishTab();
  renderFishingShopModal(`[${item.name}] 잘 샀소! 💿 +${gainCd} CD · ✨ +${gainExp} EXP 드렸소!`, "happy");
};

window.sellAllFishFromBag = function () {
  const bag = getSafeFishBag();
  if (bag.length === 0) return;
  const cnt = bag.length;
  const totCd = bag.reduce((s, f) => s + (Number(f.price) || 0), 0);
  const totExp = bag.reduce((s, f) => s + (Number(f.exp) || 0), 0);

  const doSellAll = async () => {
    const latestBag = getSafeFishBag();
    if (latestBag.length === 0) return;
    const sumCd = latestBag.reduce((s, f) => s + (Number(f.price) || 0), 0);
    const sumExp = latestBag.reduce((s, f) => s + (Number(f.exp) || 0), 0);
    const soldCnt = latestBag.length;

    userState.fishBag = [];
    userState.cdCoins = (Number(userState.cdCoins) || 0) + sumCd;
    userState.exp = (Number(userState.exp) || 0) + sumExp;

    playManualFishSfx("max");
    if (typeof syncProfileToServer === "function") await syncProfileToServer();
    if (typeof updateHeaderUserUI === "function") updateHeaderUserUI();
    renderManualFishingTopBar();
    if (typeof renderBagFishTab === "function") renderBagFishTab();
    renderFishingShopModal(`${soldCnt}마리 싹 다 매입했소! 💿 +${sumCd.toLocaleString()} CD · ✨ +${sumExp.toLocaleString()} EXP!`, "happy");
    if (typeof gameAlert === "function") {
      gameAlert(`🎉 물고기 ${soldCnt}마리를 모두 판매했습니다!\n💿 +${sumCd.toLocaleString()} CD · ✨ +${sumExp.toLocaleString()} EXP 지급 완료!`, "💰 판매 완료");
    }
  };

  if (typeof gameConfirm === "function") {
    gameConfirm(
      `어망 속 물고기 ${cnt}마리를 모두 판매할까요?\n획득 보상: 💿 +${totCd.toLocaleString()} CD · ✨ +${totExp.toLocaleString()} EXP`,
      doSellAll,
      "💰 물고기 일괄 판매"
    );
  } else {
    doSellAll();
  }
};


// ============================================================================
// [V4.0 디자인] 상점 허브 거리 파노라마 캔버스 일러스트 (#shopHubBannerCanvas)
// ============================================================================
window.drawShopHubBannerArt = function () {
  const cv = document.getElementById("shopHubBannerCanvas");
  if (!cv) return;
  const targetW = 960;
  const targetH = 260;
  if (cv.width !== targetW || cv.height !== targetH) {
    cv.width = targetW;
    cv.height = targetH;
  }
  const ctx = cv.getContext("2d");
  const W = targetW;
  const H = targetH;
  const outline = "#1e1b18";

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.clearRect(0, 0, W, H);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // 1) 하늘 + 구름 + 호수/잔디 바닥
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.65);
  sky.addColorStop(0, "#38bdf8");
  sky.addColorStop(1, "#bae6fd");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H * 0.68);

  // 구름 2개
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = outline;
  ctx.lineWidth = 4;
  [[W * 0.25, 48], [W * 0.74, 42]].forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx - 26, cy + 5, 18, 0, Math.PI * 2);
    ctx.arc(cx, cy - 3, 24, 0, Math.PI * 2);
    ctx.arc(cx + 26, cy + 5, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  // 2) 왼쪽 일반 상점 (분홍 부티크) + 오른쪽 호수가 낚시상점 (청록 매점)
  const drawStorefront = (x, y, w, h, roofCols, wallCol, title) => {
    ctx.fillStyle = wallCol;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(x, y + 36, w, h - 36, 12);
    ctx.fill();
    ctx.stroke();

    // 창문/진열대
    ctx.fillStyle = "#fef9c3";
    ctx.beginPath();
    ctx.roundRect(x + 22, y + 66, w - 44, h - 84, 8);
    ctx.fill();
    ctx.stroke();

    // 간판
    ctx.fillStyle = "#1e1b18";
    ctx.font = "900 24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(title, x + w / 2, y + 66 + (h - 84) / 2);

    // 줄무늬 어닝
    const sw = w / 6;
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = roofCols[i % 2];
      ctx.beginPath();
      ctx.rect(x + i * sw, y + 10, sw, 26);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + i * sw + sw / 2, y + 36, sw / 2, 0, Math.PI);
      ctx.fill();
      ctx.stroke();
    }
  };

  drawStorefront(36, 40, 290, 174, ["#f43f5e", "#ffffff"], "#ffe4e6", "👗 FASHION SHOP");
  drawStorefront(W - 326, 40, 290, 174, ["#0284c7", "#fef08a"], "#e0f2fe", "🏪 낚시 매점");

  // 바닥 잔디·돌길
  ctx.fillStyle = "#4ade80";
  ctx.fillRect(0, H * 0.72, W, H * 0.28);
  ctx.fillStyle = "#fde68a";
  ctx.strokeStyle = outline;
  ctx.lineWidth = 4.5;
  ctx.fillRect(0, H * 0.74, W, H * 0.16);
  ctx.beginPath();
  ctx.moveTo(0, H * 0.74);
  ctx.lineTo(W, H * 0.74);
  ctx.stroke();

  // 중앙 고해상도 480×480 내 아바타 배치
  if (typeof renderPixelAvatar === "function" && typeof userState !== "undefined") {
    const off = document.createElement("canvas");
    off.width = 480;
    off.height = 480;
    try {
      const cfg = typeof sanitizeAvatarConfigShape === "function"
        ? sanitizeAvatarConfigShape(userState.avatarConfig)
        : userState.avatarConfig;
      renderPixelAvatar(off, cfg, { transparentBg: true, matchCssAspect: false, skipEffectLoop: true });
      ctx.drawImage(off, W / 2 - 84, 46, 168, 168);
    } catch (e) {}
  }

  ctx.restore();
};
