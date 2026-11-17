// ============================================================================
// [음악왕 v10.20] 방치형 소셜 낚시터 전용 모듈 (fishing.js)
// - 채널 변수화 (fishing_room_1 ~ 추후 다중 채널/서버 확장 가능)
// - 매일 KST 오전 06:00 기준 6시간(360분) 일일 한도 즉시 리셋 (실시간 돌파 대응)
// - 기본 6시간 최대 보상: 경험치 +1,000 / CD +3,000 (+ 낚싯대/미끼 배율 확장 구조)
// - 휘발성 실시간 채팅, 5초 fade-out 최상단 z-index 말풍선, 바닥 터치 스무스 이동
// ============================================================================

const FISHING_CHANNELS = [
  { id: "fishing_room_1", name: "1채널 · 잔잔한 호수" }
];
let currentFishingChannelId = FISHING_CHANNELS[0].id;

const FISHING_MAX_SECONDS_PER_DAY = 6 * 60 * 60; // 21,600초 (360분)
const FISHING_BASE_MAX_EXP = 1000;
const FISHING_BASE_MAX_CD = 3000;
const FISHING_EXP_PER_MINUTE = FISHING_BASE_MAX_EXP / 360;
const FISHING_CD_PER_MINUTE = FISHING_BASE_MAX_CD / 360;
const FISHING_KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const FISHING_LOADING_DURATION_MS = 2000;
const FISHING_SYNC_INTERVAL_MS = 60000;

const fishingState = {
  isInside: false,
  isTransitioning: false,
  channel: null,
  timerInterval: null,
  bgAnimFrame: null,
  lastTickAt: 0,
  lastServerSyncAt: 0,
  msCarry: 0,
  daily: {
    date: "",
    seconds: 0,
    earnedExp: 0,
    earnedCd: 0
  },
  myPos: { x: 50, y: 68 },
  playersMap: new Map(),
  knownPeerIds: new Set(),
  hasInitialPresenceSync: false,
  chatMessages: [],
  activeBubbles: new Map(),
  playerNodeMap: new Map(),
  playerAvatarKeys: new Map(),
  topBubbleZ: 100
};

// ============================================================================
// 1. KST 오전 06:00 일일 초기화 계산 & 버프 확장(낚싯대/미끼) 모듈
// ============================================================================
function getFishingCycleKey(timestampMs = Date.now()) {
  const kst = new Date(timestampMs + FISHING_KST_OFFSET_MS);
  if (kst.getUTCHours() < 6) {
    kst.setUTCDate(kst.getUTCDate() - 1);
  }
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getNextFishingResetTimestampMs(timestampMs = Date.now()) {
  const kstMs = timestampMs + FISHING_KST_OFFSET_MS;
  const kst = new Date(kstMs);
  let nextResetKst = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate(), 6, 0, 0, 0);
  if (kstMs >= nextResetKst) {
    nextResetKst += 24 * 60 * 60 * 1000;
  }
  return nextResetKst - FISHING_KST_OFFSET_MS;
}

function getFishingBuffMultipliers() {
  // 추후 상점 '낚싯대(fishing_rod)' / '미끼(fishing_bait)' 등급별 버프 자동 연동
  let expMultiplier = 1.0;
  let cdMultiplier = 1.0;

  if (typeof AVATAR_SHOP_ITEMS !== "undefined" && typeof userState !== "undefined" && userState.avatarConfig) {
    const rodItem = (AVATAR_SHOP_ITEMS.fishing_rod || []).find(r => r.id === userState.avatarConfig.fishingRod);
    const baitItem = (AVATAR_SHOP_ITEMS.fishing_bait || []).find(b => b.id === userState.avatarConfig.fishingBait);
    if (rodItem && Number(rodItem.expMultiplier) > 0) expMultiplier *= Number(rodItem.expMultiplier);
    if (baitItem && Number(baitItem.cdMultiplier) > 0) cdMultiplier *= Number(baitItem.cdMultiplier);
  }

  return {
    expMultiplier,
    cdMultiplier,
    expPerMin: FISHING_EXP_PER_MINUTE * expMultiplier,
    cdPerMin: FISHING_CD_PER_MINUTE * cdMultiplier,
    maxExp: Math.round(FISHING_BASE_MAX_EXP * expMultiplier),
    maxCd: Math.round(FISHING_BASE_MAX_CD * cdMultiplier)
  };
}

function computeCumulativeFishingRewards(secondsInCycle, multipliers = getFishingBuffMultipliers()) {
  const clampedSec = Math.max(0, Math.min(FISHING_MAX_SECONDS_PER_DAY, Math.floor(Number(secondsInCycle) || 0)));
  const ratio = clampedSec / FISHING_MAX_SECONDS_PER_DAY;
  return {
    clampedSec,
    totalExp: Math.floor(ratio * multipliers.maxExp),
    totalCd: Math.floor(ratio * multipliers.maxCd),
    maxExp: multipliers.maxExp,
    maxCd: multipliers.maxCd
  };
}

function loadFishingDailyFromUserState(nowTs = Date.now()) {
  const curKey = getFishingCycleKey(nowTs);
  const saved = (typeof userState !== "undefined" && userState.fishingDaily) || null;
  if (saved && saved.date === curKey) {
    fishingState.daily = {
      date: curKey,
      seconds: Math.max(0, Math.min(FISHING_MAX_SECONDS_PER_DAY, Math.floor(Number(saved.seconds) || 0))),
      earnedExp: Math.max(0, Math.floor(Number(saved.earnedExp) || 0)),
      earnedCd: Math.max(0, Math.floor(Number(saved.earnedCd) || 0))
    };
  } else {
    fishingState.daily = { date: curKey, seconds: 0, earnedExp: 0, earnedCd: 0 };
  }
  syncUserStateFishingDaily();
}

function syncUserStateFishingDaily() {
  if (typeof userState !== "undefined") {
    userState.fishingDaily = { ...fishingState.daily };
  }
}

function formatFishingHms(totalSec) {
  const sec = Math.max(0, Math.floor(Number(totalSec) || 0));
  const h = String(Math.floor(sec / 3600)).padStart(2, "0");
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function renderFishingHud() {
  const mults = getFishingBuffMultipliers();
  const sec = Math.max(0, Math.min(FISHING_MAX_SECONDS_PER_DAY, fishingState.daily.seconds || 0));
  const earnedExp = fishingState.daily.earnedExp || 0;
  const earnedCd = fishingState.daily.earnedCd || 0;
  const isCapped = sec >= FISHING_MAX_SECONDS_PER_DAY;

  const timerEl = document.getElementById("fishingElapsedTimer");
  if (timerEl) {
    timerEl.textContent = isCapped
      ? `⏱️ ${formatFishingHms(sec)} / 06:00:00 (MAX)`
      : `⏱️ ${formatFishingHms(sec)} / 06:00:00`;
  }

  const expValEl = document.getElementById("fishingExpStatText");
  const expFillEl = document.getElementById("fishingExpBarFill");
  const cdValEl = document.getElementById("fishingCdStatText");
  const cdFillEl = document.getElementById("fishingCdBarFill");

  if (expValEl) expValEl.textContent = `경험치 +${earnedExp.toLocaleString()} (${earnedExp.toLocaleString()}/${mults.maxExp.toLocaleString()})`;
  if (expFillEl) {
    const pct = Math.min(100, Math.max(0, (earnedExp / Math.max(1, mults.maxExp)) * 100));
    expFillEl.style.width = `${pct.toFixed(1)}%`;
  }

  if (cdValEl) cdValEl.textContent = `CD +${earnedCd.toLocaleString()} (${earnedCd.toLocaleString()}/${mults.maxCd.toLocaleString()})`;
  if (cdFillEl) {
    const pct = Math.min(100, Math.max(0, (earnedCd / Math.max(1, mults.maxCd)) * 100));
    cdFillEl.style.width = `${pct.toFixed(1)}%`;
  }
}

// 낚시터 안에 머문 상태에서만 시간 흐름 (화면 내려놓기·오전 06:00 돌파 모두 정확히 분할 계산!)
window.advanceFishingClockTo = function (nowTs = Date.now()) {
  if (!fishingState.isInside) return;
  if (typeof state !== "undefined" && state.currentScreen !== "fishingScreen") return;

  let cursor = fishingState.lastTickAt || nowTs;
  if (nowTs < cursor) {
    fishingState.lastTickAt = nowTs;
    return;
  }

  const mults = getFishingBuffMultipliers();
  let changedRewards = false;
  let crossedReset = false;

  while (cursor < nowTs) {
    const nextReset = getNextFishingResetTimestampMs(cursor);
    const segmentEnd = Math.min(nowTs, nextReset);
    const segKey = getFishingCycleKey(cursor);

    if (fishingState.daily.date !== segKey) {
      fishingState.daily = { date: segKey, seconds: 0, earnedExp: 0, earnedCd: 0 };
      fishingState.msCarry = 0;
      crossedReset = true;
    }

    fishingState.msCarry += segmentEnd - cursor;
    const deltaSec = Math.floor(fishingState.msCarry / 1000);
    if (deltaSec > 0) {
      fishingState.msCarry -= deltaSec * 1000;
      const nextSec = Math.min(FISHING_MAX_SECONDS_PER_DAY, fishingState.daily.seconds + deltaSec);
      fishingState.daily.seconds = nextSec;

      const calc = computeCumulativeFishingRewards(nextSec, mults);
      const gainExp = Math.max(0, calc.totalExp - fishingState.daily.earnedExp);
      const gainCd = Math.max(0, calc.totalCd - fishingState.daily.earnedCd);

      if (gainExp > 0 || gainCd > 0) {
        fishingState.daily.earnedExp += gainExp;
        fishingState.daily.earnedCd += gainCd;
        if (typeof userState !== "undefined") {
          userState.exp = (Number(userState.exp) || 0) + gainExp;
          userState.cdCoins = (Number(userState.cdCoins) || 0) + gainCd;
        }
        changedRewards = true;
      }
    }

    cursor = segmentEnd;
    if (cursor >= nextReset) {
      // 오전 06:00 정각 돌파 시 미사용 잔여 시간 즉시 폐기하고 00:00:00으로 새 주기 시작!
      const newKey = getFishingCycleKey(nextReset);
      fishingState.daily = { date: newKey, seconds: 0, earnedExp: 0, earnedCd: 0 };
      fishingState.msCarry = 0;
      crossedReset = true;
    }
  }

  fishingState.lastTickAt = nowTs;
  syncUserStateFishingDaily();
  renderFishingHud();

  if (changedRewards && typeof updateHeaderUserUI === "function") {
    const cdEl = document.getElementById("headerCdCount");
    if (cdEl && typeof userState !== "undefined") cdEl.textContent = `${userState.cdCoins}`;
  }

  if (crossedReset) {
    appendFishingSystemMessage("🌅 오전 06:00 일일 초기화! 새로운 6시간 낚시가 시작되었습니다.");
  }

  if (changedRewards && nowTs - fishingState.lastServerSyncAt >= FISHING_SYNC_INTERVAL_MS) {
    fishingState.lastServerSyncAt = nowTs;
    if (typeof syncProfileToServer === "function") syncProfileToServer();
  }
};

function startFishingRewardTimer() {
  stopFishingRewardTimer();
  fishingState.lastTickAt = Date.now();
  fishingState.lastServerSyncAt = Date.now();
  fishingState.msCarry = 0;

  fishingState.timerInterval = setInterval(() => {
    if (!fishingState.isInside || (typeof state !== "undefined" && state.currentScreen !== "fishingScreen")) {
      stopFishingRewardTimer();
      return;
    }
    window.advanceFishingClockTo(Date.now());
  }, 1000);
}

function stopFishingRewardTimer() {
  if (fishingState.timerInterval) {
    clearInterval(fishingState.timerInterval);
    fishingState.timerInterval = null;
  }
}

// ============================================================================
// 2. 상단 낚시터 배경 캔버스 (부드러운 물결 & 햇살 + 수변 데크)
// ============================================================================
function startFishingBgLoop() {
  stopFishingBgLoop();
  const canvas = document.getElementById("fishingBgCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let lastDraw = 0;

  const drawFrame = ts => {
    if (!fishingState.isInside || (typeof state !== "undefined" && state.currentScreen !== "fishingScreen")) {
      return;
    }
    fishingState.bgAnimFrame = requestAnimationFrame(drawFrame);
    if (document.hidden) return;
    if (ts - lastDraw < 65) return; // 약 15fps 물결 애니메이션으로 6시간 배터리 최적화!
    lastDraw = ts;

    const area = canvas.parentElement;
    if (area && area.clientWidth > 20 && area.clientHeight > 20) {
      const tw = Math.round(area.clientWidth * 2);
      const th = Math.round(area.clientHeight * 2);
      if (Math.abs(canvas.width - tw) > 6 || Math.abs(canvas.height - th) > 6) {
        canvas.width = tw;
        canvas.height = th;
      }
    }

    const W = canvas.width;
    const H = canvas.height;
    const t = ts * 0.0014;
    const shoreY = H * 0.50;
    const waterTop = H * 0.23;

    // 1) 맑은 하늘 & 먼 산 능선
    const skyGrad = ctx.createLinearGradient(0, 0, 0, waterTop + 10);
    skyGrad.addColorStop(0, "#38bdf8");
    skyGrad.addColorStop(1, "#bae6fd");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, waterTop + 10);

    // 구름 2개
    [0.22, 0.72].forEach((cx, idx) => {
      const x = W * cx + Math.sin(t * 0.3 + idx) * (W * 0.015);
      const y = H * (0.09 + idx * 0.03);
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.beginPath();
      ctx.arc(x - 16, y + 4, 14, 0, Math.PI * 2);
      ctx.arc(x, y - 3, 18, 0, Math.PI * 2);
      ctx.arc(x + 16, y + 4, 14, 0, Math.PI * 2);
      ctx.fill();
    });

    // 먼 초록 언덕 실루엣
    ctx.fillStyle = "#34d399";
    ctx.beginPath();
    ctx.moveTo(0, waterTop);
    ctx.quadraticCurveTo(W * 0.26, waterTop - H * 0.09, W * 0.52, waterTop);
    ctx.quadraticCurveTo(W * 0.78, waterTop - H * 0.11, W, waterTop);
    ctx.closePath();
    ctx.fill();

    // 2) 반짝이는 호수 물가
    const waterGrad = ctx.createLinearGradient(0, waterTop, 0, shoreY);
    waterGrad.addColorStop(0, "#0284c7");
    waterGrad.addColorStop(1, "#38bdf8");
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, waterTop, W, shoreY - waterTop);

    // 물결 윤슬 반짝이
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = Math.max(2, W * 0.003);
    ctx.lineCap = "round";
    for (let row = 0; row < 5; row++) {
      const ry = waterTop + (shoreY - waterTop) * (0.18 + row * 0.17);
      for (let col = 0; col < 4; col++) {
        const rx = ((W * (0.14 + col * 0.25 + (row % 2) * 0.08)) + Math.sin(t + row + col) * 14) % W;
        ctx.beginPath();
        ctx.moveTo(rx - W * 0.04, ry);
        ctx.lineTo(rx + W * 0.04, ry);
        ctx.stroke();
      }
    }

    // 수변 하얀 포말 테두리
    ctx.fillStyle = "rgba(224, 242, 254, 0.85)";
    for (let x = 0; x <= W + 24; x += W * 0.065) {
      const waveY = shoreY + Math.sin(t * 2 + x * 0.02) * 2.5;
      ctx.beginPath();
      ctx.arc(x, waveY, W * 0.036, Math.PI, 0);
      ctx.fill();
    }

    // 3) 캐릭터 이동 가능한 초원 · 나무 데크 바닥 영역
    const groundGrad = ctx.createLinearGradient(0, shoreY, 0, H);
    groundGrad.addColorStop(0, "#86efac");
    groundGrad.addColorStop(0.28, "#4ade80");
    groundGrad.addColorStop(1, "#22c55e");
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, shoreY, W, H - shoreY);

    // 중앙 나무 부두 데크(낚시 포인트 장식)
    const deckX = W * 0.14;
    const deckW = W * 0.72;
    const deckY = shoreY - H * 0.03;
    const deckH = H * 0.22;
    ctx.fillStyle = "#b45309";
    ctx.strokeStyle = "#451a03";
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") ctx.roundRect(deckX, deckY, deckW, deckH, 10);
    else ctx.rect(deckX, deckY, deckW, deckH);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "rgba(69, 26, 3, 0.45)";
    ctx.lineWidth = 2;
    for (let px = deckX + W * 0.07; px < deckX + deckW - 10; px += W * 0.07) {
      ctx.beginPath(); ctx.moveTo(px, deckY + 2); ctx.lineTo(px, deckY + deckH - 2); ctx.stroke();
    }
    ctx.fillStyle = "#d97706";
    ctx.fillRect(deckX + 4, deckY + 4, deckW - 8, H * 0.03);

    // 바닥 풀잎 디테일
    ctx.fillStyle = "#15803d";
    [[0.08, 0.78], [0.24, 0.88], [0.76, 0.85], [0.91, 0.74]].forEach(([gx, gy]) => {
      ctx.beginPath();
      ctx.arc(W * gx, H * gy, W * 0.012, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  fishingState.bgAnimFrame = requestAnimationFrame(drawFrame);
}

function stopFishingBgLoop() {
  if (fishingState.bgAnimFrame) {
    cancelAnimationFrame(fishingState.bgAnimFrame);
    fishingState.bgAnimFrame = null;
  }
}

// ============================================================================
// 3. 캐릭터 스탠딩 DOM 렌더링 · 바닥 터치 스무스 이동 · 5초 말풍선 최상단 z-index
// ============================================================================
function getMyFishingKey() {
  return (typeof userState !== "undefined" && userState.id) || `guest_${Math.floor(Math.random() * 99999)}`;
}

function handleFishingStageTap(e) {
  if (!fishingState.isInside) return;
  if (e.target.closest(".fishing-player-node, .fishing-hud-box, .fishing-users-overlay, .fishing-top-left")) {
    return;
  }
  const stageArea = document.getElementById("fishingStageArea");
  if (!stageArea) return;
  const rect = stageArea.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;

  const clientX = e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY;
  const rawX = ((clientX - rect.left) / rect.width) * 100;
  const rawY = ((clientY - rect.top) / rect.height) * 100;

  // 물 위나 UI 위를 터치해도 안전하게 걸어다닐 수 있는 바닥 범위(Y: 54% ~ 88%)로 클램프!
  const targetX = Math.max(9, Math.min(91, Math.round(rawX * 10) / 10));
  const targetY = Math.max(54, Math.min(88, Math.round(rawY * 10) / 10));

  fishingState.myPos = { x: targetX, y: targetY };

  const myKey = getMyFishingKey();
  const prev = fishingState.playersMap.get(myKey) || {};
  fishingState.playersMap.set(myKey, {
    ...prev,
    key: myKey,
    userId: userState.id,
    nickname: userState.nickname,
    avatarConfig: userState.avatarConfig,
    x: targetX,
    y: targetY
  });
  syncFishingPlayersDOM();
  trackMyFishingPresence(true);
}

function syncFishingPlayersDOM() {
  const layer = document.getElementById("fishingPlayersLayer");
  if (!layer) return;

  const activePlayers = [];
  fishingState.playersMap.forEach((p, key) => {
    if (!p) return;
    if (typeof isUserBlocked === "function" && isUserBlocked(p.userId, p.nickname)) return;
    activePlayers.push({ ...p, key });
  });

  const activeKeys = new Set(activePlayers.map(p => p.key));

  // 나간 유저 DOM 정리
  fishingState.playerNodeMap.forEach((node, key) => {
    if (!activeKeys.has(key)) {
      node.remove();
      fishingState.playerNodeMap.delete(key);
      fishingState.playerAvatarKeys.delete(key);
    }
  });

  const myKey = getMyFishingKey();

  activePlayers.forEach(p => {
    let node = fishingState.playerNodeMap.get(p.key);
    const isMe = p.key === myKey || (userState.id && p.userId === userState.id);
    const cfg = typeof sanitizeAvatarConfigShape === "function"
      ? sanitizeAvatarConfigShape(p.avatarConfig || DEFAULT_AVATAR_CONFIG)
      : (p.avatarConfig || DEFAULT_AVATAR_CONFIG);
    const cfgSig = JSON.stringify(cfg);

    if (!node) {
      node = document.createElement("div");
      node.className = `fishing-player-node${isMe ? " is-me" : ""}`;
      node.innerHTML = `
        <div class="fishing-bubble-slot"></div>
        <canvas class="fishing-player-canvas" width="480" height="480"></canvas>
        <div class="fishing-player-nick">${escapeFishingHtml(p.nickname || "도전자")}</div>
      `;
      node.addEventListener("click", ev => {
        ev.stopPropagation();
        if (isMe) {
          if (typeof openMyProfileModal === "function") openMyProfileModal();
        } else if (typeof inspectOtherUser === "function") {
          inspectOtherUser(p.userId || "", p.nickname || "");
        }
      });
      layer.appendChild(node);
      fishingState.playerNodeMap.set(p.key, node);
    }

    node.style.left = `${Math.max(8, Math.min(92, Number(p.x) || 50))}%`;
    node.style.top = `${Math.max(52, Math.min(89, Number(p.y) || 68))}%`;

    const nickEl = node.querySelector(".fishing-player-nick");
    if (nickEl) nickEl.textContent = p.nickname || "도전자";

    // 아바타가 변경되었을 때만 480x480 캔버스 렌더링 (6시간 배터리 최적화!)
    if (fishingState.playerAvatarKeys.get(p.key) !== cfgSig) {
      fishingState.playerAvatarKeys.set(p.key, cfgSig);
      const cv = node.querySelector(".fishing-player-canvas");
      if (cv && typeof renderPixelAvatar === "function") {
        renderPixelAvatar(cv, cfg, { transparentBg: true, matchCssAspect: false });
      }
    }
  });

  renderFishingOnlineUsersList(activePlayers);
}

function renderFishingOnlineUsersList(playersList = null) {
  const countEl = document.getElementById("fishingOnlineCount");
  const listEl = document.getElementById("fishingOnlineUsersList");
  if (!listEl) return;

  const players = playersList || Array.from(fishingState.playersMap.values()).filter(
    p => p && !(typeof isUserBlocked === "function" && isUserBlocked(p.userId, p.nickname))
  );

  if (countEl) countEl.textContent = `접속자 ${players.length}명`;

  listEl.innerHTML = players
    .map(p => {
      const safeId = typeof escapeJsSingleArg === "function" ? escapeJsSingleArg(p.userId || "") : "";
      const safeNick = typeof escapeJsSingleArg === "function" ? escapeJsSingleArg(p.nickname || "") : "";
      const isMe = userState.id && p.userId === userState.id;
      return `<div class="fishing-user-item${isMe ? " is-me" : ""}" onclick="event.stopPropagation(); ${isMe ? "openMyProfileModal()" : `inspectOtherUser('${safeId}', '${safeNick}')`}">${escapeFishingHtml(p.nickname || "도전자")}</div>`;
    })
    .join("");
}

function showFishingSpeechBubble(playerKey, text) {
  const node = fishingState.playerNodeMap.get(playerKey);
  if (!node) return;
  const slot = node.querySelector(".fishing-bubble-slot");
  if (!slot) return;

  const existing = fishingState.activeBubbles.get(playerKey);
  if (existing) {
    clearTimeout(existing.fadeTimer);
    clearTimeout(existing.removeTimer);
  }

  // 가장 최근 말풍선이 화면 맨 위로 덮여 보이도록 z-index 최상단 상승!
  const nextZ = ++fishingState.topBubbleZ;
  node.style.zIndex = String(nextZ);

  slot.innerHTML = "";
  const bubble = document.createElement("div");
  bubble.className = "fishing-speech-bubble";
  bubble.style.zIndex = String(nextZ);
  bubble.textContent = String(text || "").slice(0, 60);
  slot.appendChild(bubble);

  const fadeTimer = setTimeout(() => {
    bubble.classList.add("is-fading");
  }, 4550);

  const removeTimer = setTimeout(() => {
    if (bubble.parentNode === slot) {
      slot.innerHTML = "";
    }
    fishingState.activeBubbles.delete(playerKey);
  }, 5000);

  fishingState.activeBubbles.set(playerKey, { fadeTimer, removeTimer });
}

// ============================================================================
// 4. 휘발성 실시간 채팅 & Supabase Realtime (Presence + Broadcast)
// ============================================================================
function escapeFishingHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function appendFishingChatRow(htmlContent, rowClass = "chat-row") {
  const logEl = document.getElementById("fishingChatLog");
  if (!logEl) return;
  fishingState.chatMessages.push({ htmlContent, rowClass });
  if (fishingState.chatMessages.length > 90) {
    fishingState.chatMessages.shift();
    if (logEl.firstChild) logEl.removeChild(logEl.firstChild);
  }
  const div = document.createElement("div");
  div.className = `fishing-chat-item ${rowClass}`;
  div.innerHTML = htmlContent;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

function appendFishingSystemMessage(text) {
  appendFishingChatRow(escapeFishingHtml(text), "system-join");
}

function appendFishingUserChat(nick, msg, isMe = false) {
  appendFishingChatRow(
    `<strong class="fishing-chat-nick${isMe ? " is-me" : ""}">${escapeFishingHtml(nick)}:</strong> <span>${escapeFishingHtml(msg)}</span>`,
    "user-msg"
  );
}

async function trackMyFishingPresence(alsoBroadcastMove = false) {
  const myKey = getMyFishingKey();
  const payload = {
    key: myKey,
    userId: userState.id,
    nickname: userState.nickname,
    avatarConfig: userState.avatarConfig,
    x: fishingState.myPos.x,
    y: fishingState.myPos.y,
    joinedAt: Date.now()
  };
  fishingState.playersMap.set(myKey, payload);

  if (fishingState.channel) {
    try {
      await fishingState.channel.track(payload);
      if (alsoBroadcastMove) {
        fishingState.channel.send({
          type: "broadcast",
          event: "fishing_move",
          payload: { key: myKey, userId: userState.id, x: payload.x, y: payload.y }
        });
      }
    } catch (e) {}
  }
}

function connectFishingRealtimeChannel() {
  disconnectFishingRealtimeChannel();

  const myKey = getMyFishingKey();
  const initX = 24 + Math.floor(Math.random() * 52);
  const initY = 60 + Math.floor(Math.random() * 22);
  fishingState.myPos = { x: initX, y: initY };
  fishingState.playersMap.clear();
  fishingState.knownPeerIds = new Set([myKey]);
  fishingState.hasInitialPresenceSync = false;

  const myInitialPayload = {
    key: myKey,
    userId: userState.id,
    nickname: userState.nickname,
    avatarConfig: userState.avatarConfig,
    x: initX,
    y: initY,
    joinedAt: Date.now()
  };
  fishingState.playersMap.set(myKey, myInitialPayload);
  syncFishingPlayersDOM();

  if (!sbClient) return;

  fishingState.channel = sbClient.channel(currentFishingChannelId, {
    config: { presence: { key: myKey } }
  });

  fishingState.channel
    .on("presence", { event: "sync" }, () => {
      if (!fishingState.channel) return;
      const pres = fishingState.channel.presenceState();
      const nextMap = new Map();
      const nextKeys = new Set();

      Object.entries(pres).forEach(([presKey, arr]) => {
        const entry = Array.isArray(arr) && arr[0];
        if (!entry) return;
        const k = entry.key || presKey;
        nextKeys.add(k);
        const prev = fishingState.playersMap.get(k);
        nextMap.set(k, prev ? { ...entry, x: prev.x ?? entry.x, y: prev.y ?? entry.y } : entry);

        if (fishingState.hasInitialPresenceSync && !fishingState.knownPeerIds.has(k) && k !== myKey) {
          if (!(typeof isUserBlocked === "function" && isUserBlocked(entry.userId, entry.nickname))) {
            appendFishingSystemMessage(`[${entry.nickname || "도전자"}]님이 입장하였습니다`);
          }
        }
      });

      if (!nextMap.has(myKey)) {
        nextMap.set(myKey, {
          ...myInitialPayload,
          x: fishingState.myPos.x,
          y: fishingState.myPos.y
        });
        nextKeys.add(myKey);
      }

      fishingState.playersMap = nextMap;
      fishingState.knownPeerIds = nextKeys;
      fishingState.hasInitialPresenceSync = true;
      syncFishingPlayersDOM();
    })
    .on("broadcast", { event: "fishing_move" }, ({ payload }) => {
      if (!payload || !payload.key) return;
      if (payload.key === myKey) return;
      const existing = fishingState.playersMap.get(payload.key);
      if (existing) {
        existing.x = payload.x;
        existing.y = payload.y;
        syncFishingPlayersDOM();
      }
    })
    .on("broadcast", { event: "fishing_chat" }, ({ payload }) => {
      if (!payload || !payload.msg) return;
      if (typeof isUserBlocked === "function" && isUserBlocked(payload.userId, payload.nickname)) return;
      const senderKey = payload.key || payload.userId;
      const isMe = senderKey === myKey;
      appendFishingUserChat(payload.nickname || "도전자", payload.msg, isMe);
      showFishingSpeechBubble(senderKey, payload.msg);
    })
    .subscribe(async status => {
      if (status === "SUBSCRIBED") {
        await trackMyFishingPresence(false);
        appendFishingSystemMessage(`[${userState.nickname || "도전자"}]님이 입장하였습니다`);
      }
    });
}

function disconnectFishingRealtimeChannel() {
  if (fishingState.channel && sbClient) {
    try {
      sbClient.removeChannel(fishingState.channel);
    } catch (e) {}
  }
  fishingState.channel = null;
  fishingState.activeBubbles.forEach(b => {
    clearTimeout(b.fadeTimer);
    clearTimeout(b.removeTimer);
  });
  fishingState.activeBubbles.clear();
  fishingState.playerNodeMap.clear();
  fishingState.playerAvatarKeys.clear();
  const layer = document.getElementById("fishingPlayersLayer");
  if (layer) layer.innerHTML = "";
}

window.sendFishingChat = function () {
  if (!fishingState.isInside) return;
  const input = document.getElementById("fishingChatInput");
  if (!input) return;
  const msg = input.value.trim();
  if (!msg) return;
  input.value = "";

  const myKey = getMyFishingKey();
  const payload = {
    key: myKey,
    userId: userState.id,
    nickname: userState.nickname || "도전자",
    msg: msg.slice(0, 80),
    ts: Date.now()
  };

  if (fishingState.channel) {
    fishingState.channel.send({
      type: "broadcast",
      event: "fishing_chat",
      payload
    });
  } else {
    appendFishingUserChat(payload.nickname, payload.msg, true);
    showFishingSpeechBubble(myKey, payload.msg);
  }
};

// ============================================================================
// 5. 2초 로딩 오버레이 & 낚시터 입·퇴장 라이프사이클
// ============================================================================
function showFishingLoadingOverlay(labelText) {
  const overlay = document.getElementById("fishingLoadingOverlay");
  const titleEl = document.getElementById("fishingLoadingTitle");
  const barEl = document.getElementById("fishingLoadingBarFill");
  const avatarCv = document.getElementById("fishingLoadingAvatar");
  if (!overlay) return;

  if (titleEl) titleEl.textContent = labelText;
  if (avatarCv && typeof renderPixelAvatar === "function") {
    const cfg = typeof userState !== "undefined" ? userState.avatarConfig : DEFAULT_AVATAR_CONFIG;
    renderPixelAvatar(avatarCv, cfg, { transparentBg: true, matchCssAspect: false });
  }
  if (barEl) {
    barEl.style.transition = "none";
    barEl.style.width = "0%";
    void barEl.offsetWidth;
    barEl.style.transition = `width ${FISHING_LOADING_DURATION_MS}ms linear`;
    barEl.style.width = "100%";
  }
  overlay.classList.remove("hidden");
}

function hideFishingLoadingOverlay() {
  const overlay = document.getElementById("fishingLoadingOverlay");
  if (overlay) overlay.classList.add("hidden");
}

window.enterFishingRoom = function (channelId = FISHING_CHANNELS[0].id) {
  if (fishingState.isTransitioning) return;
  if (typeof userState !== "undefined" && !userState.isLoggedIn) {
    gameConfirm("낚시터는 로그인한 계정으로만 입장할 수 있습니다.\n로그인 화면으로 이동할까요?", () => showLoginScreen());
    return;
  }

  fishingState.isTransitioning = true;
  currentFishingChannelId = channelId || FISHING_CHANNELS[0].id;
  fishingState.chatMessages = [];
  const logEl = document.getElementById("fishingChatLog");
  if (logEl) logEl.innerHTML = "";

  const chInfo = FISHING_CHANNELS.find(c => c.id === currentFishingChannelId) || FISHING_CHANNELS[0];
  const chBadge = document.getElementById("fishingChannelLabel");
  if (chBadge) chBadge.textContent = `🎣 ${chInfo.name}`;

  loadFishingDailyFromUserState(Date.now());
  renderFishingHud();

  showFishingLoadingOverlay("🎣 낚시터 가는중..");

  // 로딩 연출 중 화면 미리 전환 + Realtime 구독 준비 완료!
  if (typeof switchScreen === "function") {
    switchScreen("fishingScreen");
  }
  fishingState.isInside = true;
  connectFishingRealtimeChannel();
  startFishingBgLoop();
  startFishingRewardTimer();

  setTimeout(() => {
    hideFishingLoadingOverlay();
    fishingState.isTransitioning = false;
    if (typeof syncFishingViewportLock === "function") syncFishingViewportLock();
  }, FISHING_LOADING_DURATION_MS);
};

window.cleanupFishingRuntime = function (shouldSyncServer = true) {
  if (fishingState.isInside) {
    window.advanceFishingClockTo(Date.now());
  }
  fishingState.isInside = false;
  stopFishingRewardTimer();
  stopFishingBgLoop();
  disconnectFishingRealtimeChannel();

  const chatInput = document.getElementById("fishingChatInput");
  if (chatInput) chatInput.blur();
  const inputBar = document.getElementById("fishingInputBar");
  if (inputBar) inputBar.style.transform = "";

  if (shouldSyncServer && typeof syncProfileToServer === "function") {
    syncProfileToServer();
  }
};

window.exitFishingScreenWithLoading = function () {
  if (fishingState.isTransitioning) return;
  fishingState.isTransitioning = true;

  window.cleanupFishingRuntime(true);
  showFishingLoadingOverlay("🏠 낚시터 나오는중..");

  setTimeout(() => {
    hideFishingLoadingOverlay();
    fishingState.isTransitioning = false;
    if (typeof showHome === "function") {
      showHome();
    }
  }, FISHING_LOADING_DURATION_MS);
};
