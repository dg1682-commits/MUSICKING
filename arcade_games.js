// ============================================================================
// [음악왕 V3.0] 오락실 미니게임 7종 통합 엔진 (arcade_games.js)
// - 본게임과 동일한 #1e1b18 굵은 잉크 외곽선 & 선명한 카툰 톤앤매너 통일
// - 1. 별피하기(star_dodge)    2. 니꺼내꺼(side_sort)    3. 짝맞추기(animal_match)
// - 4. 기억하기(melody_memory) 5. 점프점프(jump_runner)  6. 정리고수(color_sort)
// - 7. 뿌셔뿌셔(brick_breaker)
// ============================================================================

const ArcadeSfx = (() => {
  let audioCtx = null;

  function isMuted() {
    if (typeof appExited !== "undefined" && appExited) return true;
    if (document.hidden) return true;
    if (typeof bgmState !== "undefined" && bgmState.muted) return true;
    if (window.__onestorePaused || window.__onestoreRingerSilent) return true;
    return false;
  }

  function ensureCtx() {
    if (isMuted()) return null;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
      }
      return audioCtx;
    } catch (e) {
      return null;
    }
  }

  function unlock() {
    ensureCtx();
  }

  function tone(freq, dur = 0.16, type = "triangle", vol = 0.16, slideTo = null) {
    const ctx = ensureCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + dur);
      }
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.014);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    } catch (e) {}
  }

  function coin() {
    tone(987.77, 0.08, "square", 0.09);
    setTimeout(() => tone(1318.51, 0.18, "square", 0.09), 65);
  }

  function jump(isDouble = false) {
    tone(isDouble ? 420 : 290, 0.14, "triangle", 0.14, isDouble ? 820 : 620);
  }

  function pop(combo = 1) {
    const pitch = Math.min(1046, 440 + combo * 42);
    tone(pitch, 0.12, "sine", 0.15, pitch * 1.28);
  }

  function hit() {
    tone(180, 0.22, "sawtooth", 0.12, 75);
  }

  function wrong() {
    tone(195, 0.16, "sawtooth", 0.1, 130);
  }

  function clear() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      setTimeout(() => tone(f, 0.18, "triangle", 0.15), idx * 75);
    });
  }

  return { unlock, tone, coin, jump, pop, hit, wrong, clear };
})();

// 사용자 현재 착용 아바타(투명 배경)를 미니게임용 경량 오프스크린으로 1회 베이킹
function createBakedMiniPlayerCanvas(size = 128) {
  const off = document.createElement("canvas");
  off.width = size;
  off.height = size;
  const cfg =
    typeof userState !== "undefined" && userState.avatarConfig
      ? userState.avatarConfig
      : typeof DEFAULT_AVATAR_CONFIG !== "undefined"
      ? DEFAULT_AVATAR_CONFIG
      : null;
  if (cfg && typeof renderPixelAvatar === "function") {
    try {
      renderPixelAvatar(off, cfg, { transparentBg: true, matchCssAspect: false, skipEffectLoop: true });
      return off;
    } catch (e) {}
  }
  const ctx = off.getContext("2d");
  ctx.fillStyle = "#fffdf9";
  ctx.strokeStyle = "#1e1b18";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  return off;
}

// 공통 #1e1b18 둥근 사각 유틸 (pixel_avatar.js 미로드 방어용)
function _arcFillRoundRect(ctx, x, y, w, h, r, fill, stroke = "#1e1b18", lw = 3) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

// 니꺼내꺼(태양·구름·별·달) 공용 고화질 벡터 일러스트 렌더러
function drawCelestialAsset(ctx, type, cx, cy, r = 28) {
  const outline = "#1e1b18";
  ctx.save();
  ctx.translate(cx, cy);

  if (type === "sun") {
    ctx.fillStyle = "#f97316";
    ctx.strokeStyle = outline;
    ctx.lineWidth = Math.max(2.5, r * 0.11);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(-r * 0.22, -r * 0.68);
      ctx.lineTo(0, -r * 1.08);
      ctx.lineTo(r * 0.22, -r * 0.68);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    const g = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.08, 0, 0, r * 0.72);
    g.addColorStop(0, "#fef08a");
    g.addColorStop(1, "#f59e0b");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 귀여운 눈
    ctx.fillStyle = outline;
    ctx.beginPath();
    ctx.arc(-r * 0.2, -r * 0.04, r * 0.08, 0, Math.PI * 2);
    ctx.arc(r * 0.2, -r * 0.04, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = Math.max(2, r * 0.08);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, r * 0.1, r * 0.16, 0.15, Math.PI - 0.15);
    ctx.stroke();
  } else if (type === "cloud") {
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = outline;
    ctx.lineWidth = Math.max(2.5, r * 0.11);
    ctx.beginPath();
    ctx.arc(-r * 0.36, r * 0.1, r * 0.38, Math.PI * 0.5, Math.PI * 1.65);
    ctx.arc(0, -r * 0.18, r * 0.44, Math.PI * 1.05, Math.PI * 1.98);
    ctx.arc(r * 0.4, r * 0.08, r * 0.36, Math.PI * 1.45, Math.PI * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#bae6fd";
    ctx.beginPath();
    ctx.ellipse(0, r * 0.3, r * 0.58, r * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = outline;
    ctx.beginPath();
    ctx.arc(-r * 0.18, r * 0.06, r * 0.075, 0, Math.PI * 2);
    ctx.arc(r * 0.18, r * 0.06, r * 0.075, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === "star") {
    ctx.fillStyle = "#fde047";
    ctx.strokeStyle = outline;
    ctx.lineWidth = Math.max(2.5, r * 0.11);
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 === 0 ? r * 0.96 : r * 0.46;
      const px = Math.cos(ang) * rad;
      const py = Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-r * 0.15, -r * 0.25, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = outline;
    ctx.beginPath();
    ctx.arc(-r * 0.16, 0, r * 0.07, 0, Math.PI * 2);
    ctx.arc(r * 0.16, 0, r * 0.07, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // moon (초승달)
    ctx.fillStyle = "#fef08a";
    ctx.strokeStyle = outline;
    ctx.lineWidth = Math.max(2.5, r * 0.11);
    ctx.beginPath();
    ctx.arc(-r * 0.05, 0, r * 0.82, Math.PI * 0.32, Math.PI * 1.68);
    ctx.quadraticCurveTo(-r * 0.05, 0, Math.cos(Math.PI * 0.32) * r * 0.82 - r * 0.05, Math.sin(Math.PI * 0.32) * r * 0.82);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 졸린 듯 귀여운 눈 + 반짝 점
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(r * 0.44, -r * 0.34, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = outline;
    ctx.beginPath();
    ctx.arc(-r * 0.38, -r * 0.05, r * 0.075, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// 짝맞추기 귀여운 동물 8종 일러스트 (#1e1b18 다크잉크 통일)
function drawAnimalChibi(ctx, kind, cx, cy, r = 30) {
  const outline = "#1e1b18";
  ctx.save();
  ctx.translate(cx, cy);
  const lw = Math.max(2.5, r * 0.11);

  if (kind === "dog") {
    _arcFillRoundRect(ctx, -r * 0.92, -r * 0.42, r * 0.36, r * 0.86, r * 0.18, "#92400e", outline, lw);
    _arcFillRoundRect(ctx, r * 0.56, -r * 0.42, r * 0.36, r * 0.86, r * 0.18, "#92400e", outline, lw);
    _arcFillRoundRect(ctx, -r * 0.68, -r * 0.62, r * 1.36, r * 1.24, r * 0.55, "#fbbf24", outline, lw);
    ctx.fillStyle = outline;
    ctx.beginPath();
    ctx.arc(-r * 0.24, -r * 0.08, r * 0.09, 0, Math.PI * 2);
    ctx.arc(r * 0.24, -r * 0.08, r * 0.09, 0, Math.PI * 2);
    ctx.arc(0, r * 0.14, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f43f5e";
    ctx.beginPath();
    ctx.arc(0, r * 0.34, r * 0.13, 0, Math.PI);
    ctx.fill();
  } else if (kind === "cat") {
    ctx.fillStyle = "#fde68a";
    ctx.strokeStyle = outline;
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.25); ctx.lineTo(-r * 0.58, -r * 0.88); ctx.lineTo(-r * 0.14, -r * 0.52); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r * 0.6, -r * 0.25); ctx.lineTo(r * 0.58, -r * 0.88); ctx.lineTo(r * 0.14, -r * 0.52); ctx.closePath(); ctx.fill(); ctx.stroke();
    _arcFillRoundRect(ctx, -r * 0.68, -r * 0.58, r * 1.36, r * 1.18, r * 0.52, "#fef3c7", outline, lw);
    ctx.fillStyle = "#d97706";
    ctx.fillRect(-r * 0.06, -r * 0.56, r * 0.12, r * 0.24);
    ctx.fillStyle = outline;
    ctx.beginPath(); ctx.arc(-r * 0.25, -r * 0.02, r * 0.09, 0, Math.PI * 2); ctx.arc(r * 0.25, -r * 0.02, r * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f43f5e"; ctx.beginPath(); ctx.arc(0, r * 0.14, r * 0.07, 0, Math.PI * 2); ctx.fill();
  } else if (kind === "rabbit") {
    _arcFillRoundRect(ctx, -r * 0.48, -r * 1.02, r * 0.32, r * 0.68, r * 0.16, "#ffffff", outline, lw);
    _arcFillRoundRect(ctx, r * 0.16, -r * 1.02, r * 0.32, r * 0.68, r * 0.16, "#ffffff", outline, lw);
    _arcFillRoundRect(ctx, -r * 0.4, -r * 0.9, r * 0.16, r * 0.44, r * 0.08, "#fda4af", null, 0);
    _arcFillRoundRect(ctx, r * 0.24, -r * 0.9, r * 0.16, r * 0.44, r * 0.08, "#fda4af", null, 0);
    _arcFillRoundRect(ctx, -r * 0.66, -r * 0.46, r * 1.32, r * 1.14, r * 0.52, "#ffffff", outline, lw);
    ctx.fillStyle = "#e11d48";
    ctx.beginPath(); ctx.arc(-r * 0.23, r * 0.04, r * 0.09, 0, Math.PI * 2); ctx.arc(r * 0.23, r * 0.04, r * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fda4af";
    ctx.beginPath(); ctx.arc(-r * 0.36, r * 0.24, r * 0.11, 0, Math.PI * 2); ctx.arc(r * 0.36, r * 0.24, r * 0.11, 0, Math.PI * 2); ctx.fill();
  } else if (kind === "pig") {
    _arcFillRoundRect(ctx, -r * 0.68, -r * 0.72, r * 0.36, r * 0.36, r * 0.12, "#f472b6", outline, lw);
    _arcFillRoundRect(ctx, r * 0.32, -r * 0.72, r * 0.36, r * 0.36, r * 0.12, "#f472b6", outline, lw);
    _arcFillRoundRect(ctx, -r * 0.7, -r * 0.56, r * 1.4, r * 1.18, r * 0.55, "#fbcfe8", outline, lw);
    _arcFillRoundRect(ctx, -r * 0.3, r * 0.04, r * 0.6, r * 0.38, r * 0.19, "#f472b6", outline, lw * 0.8);
    ctx.fillStyle = outline;
    ctx.beginPath(); ctx.arc(-r * 0.26, -r * 0.16, r * 0.08, 0, Math.PI * 2); ctx.arc(r * 0.26, -r * 0.16, r * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-r * 0.12, r * 0.23, r * 0.065, 0, Math.PI * 2); ctx.arc(r * 0.12, r * 0.23, r * 0.065, 0, Math.PI * 2); ctx.fill();
  } else if (kind === "horse") {
    _arcFillRoundRect(ctx, -r * 0.46, -r * 0.9, r * 0.26, r * 0.4, r * 0.1, "#92400e", outline, lw);
    _arcFillRoundRect(ctx, r * 0.2, -r * 0.9, r * 0.26, r * 0.4, r * 0.1, "#92400e", outline, lw);
    _arcFillRoundRect(ctx, -r * 0.58, -r * 0.64, r * 1.16, r * 1.32, r * 0.45, "#92400e", outline, lw);
    _arcFillRoundRect(ctx, -r * 0.42, r * 0.02, r * 0.84, r * 0.6, r * 0.28, "#fde68a", outline, lw * 0.85);
    ctx.fillStyle = outline;
    ctx.beginPath(); ctx.arc(-r * 0.24, -r * 0.18, r * 0.085, 0, Math.PI * 2); ctx.arc(r * 0.24, -r * 0.18, r * 0.085, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-r * 0.14, r * 0.26, r * 0.07, 0, Math.PI * 2); ctx.arc(r * 0.14, r * 0.26, r * 0.07, 0, Math.PI * 2); ctx.fill();
  } else if (kind === "monkey") {
    ctx.fillStyle = "#6b3410"; ctx.strokeStyle = outline; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(-r * 0.66, 0, r * 0.26, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(r * 0.66, 0, r * 0.26, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    _arcFillRoundRect(ctx, -r * 0.62, -r * 0.56, r * 1.24, r * 1.16, r * 0.52, "#6b3410", outline, lw);
    _arcFillRoundRect(ctx, -r * 0.48, -r * 0.22, r * 0.96, r * 0.72, r * 0.34, "#fef3c7", outline, lw * 0.7);
    ctx.fillStyle = outline;
    ctx.beginPath(); ctx.arc(-r * 0.2, 0, r * 0.08, 0, Math.PI * 2); ctx.arc(r * 0.2, 0, r * 0.08, 0, Math.PI * 2); ctx.fill();
  } else if (kind === "bear") {
    ctx.fillStyle = "#78350f"; ctx.strokeStyle = outline; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(-r * 0.52, -r * 0.54, r * 0.26, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(r * 0.52, -r * 0.54, r * 0.26, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    _arcFillRoundRect(ctx, -r * 0.66, -r * 0.56, r * 1.32, r * 1.16, r * 0.54, "#b45309", outline, lw);
    _arcFillRoundRect(ctx, -r * 0.28, r * 0.04, r * 0.56, r * 0.4, r * 0.2, "#fef3c7", outline, lw * 0.7);
    ctx.fillStyle = outline;
    ctx.beginPath(); ctx.arc(-r * 0.24, -r * 0.1, r * 0.085, 0, Math.PI * 2); ctx.arc(r * 0.24, -r * 0.1, r * 0.085, 0, Math.PI * 2); ctx.arc(0, r * 0.16, r * 0.09, 0, Math.PI * 2); ctx.fill();
  } else {
    // frog
    ctx.fillStyle = "#4ade80"; ctx.strokeStyle = outline; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(-r * 0.38, -r * 0.48, r * 0.28, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(r * 0.38, -r * 0.48, r * 0.28, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    _arcFillRoundRect(ctx, -r * 0.68, -r * 0.42, r * 1.36, r * 0.98, r * 0.46, "#4ade80", outline, lw);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(-r * 0.38, -r * 0.48, r * 0.16, 0, Math.PI * 2); ctx.arc(r * 0.38, -r * 0.48, r * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = outline;
    ctx.beginPath(); ctx.arc(-r * 0.38, -r * 0.48, r * 0.08, 0, Math.PI * 2); ctx.arc(r * 0.38, -r * 0.48, r * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = lw * 0.8; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(0, r * 0.08, r * 0.3, 0.2, Math.PI - 0.2); ctx.stroke();
  }

  ctx.restore();
}

// ============================================================================
// [게임 1] 별피하기 (star_dodge) — 우주 배경 · 내 캐릭터 로켓 회피
// ============================================================================
function createStarDodgeGame(mountEl, hooks) {
  const W = 420;
  const H = 560;
  mountEl.innerHTML = `
    <div class="arcade-canvas-wrap">
      <canvas id="arcStarCanvas" class="arcade-game-canvas" width="${W}" height="${H}"></canvas>
      <div class="arcade-touch-hint">👆 화면 좌우 드래그(또는 ◀▶ 키)로 쏟아지는 유성을 피하세요!</div>
    </div>
  `;
  const canvas = document.getElementById("arcStarCanvas");
  const ctx = canvas.getContext("2d");
  const playerOffscreen = createBakedMiniPlayerCanvas(128);

  let rafId = null;
  let stopped = false;
  let lastMs = performance.now();
  let elapsedSec = 0;
  let score = 0;
  let hearts = 3;
  let hasShield = false;
  let invulnSec = 0;
  let playerX = W / 2;
  let targetX = W / 2;
  let spawnTimer = 0;
  let gemTimer = 1.8;
  const keys = { left: false, right: false };

  const bgStars = Array.from({ length: 42 }, (_, i) => ({
    x: (i * 97) % W,
    y: (i * 151) % H,
    r: 1 + (i % 3),
    spd: 28 + (i % 4) * 18
  }));
  const meteors = [];
  const gems = [];

  function syncHud() {
    hooks.onHud({ score: Math.floor(score), hearts, extra: hasShield ? "🛡️ 실드 ON" : `${Math.floor(elapsedSec)}초 생존` });
  }

  function pointerToX(ev) {
    const rect = canvas.getBoundingClientRect();
    const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
    return Math.max(32, Math.min(W - 32, ((clientX - rect.left) / Math.max(1, rect.width)) * W));
  }

  let dragging = false;
  const onDown = ev => { dragging = true; targetX = pointerToX(ev); ArcadeSfx.unlock(); };
  const onMove = ev => { if (dragging) targetX = pointerToX(ev); };
  const onUp = () => { dragging = false; };
  const onKeyDown = ev => {
    if (ev.key === "ArrowLeft" || ev.key === "a" || ev.key === "A") keys.left = true;
    if (ev.key === "ArrowRight" || ev.key === "d" || ev.key === "D") keys.right = true;
  };
  const onKeyUp = ev => {
    if (ev.key === "ArrowLeft" || ev.key === "a" || ev.key === "A") keys.left = false;
    if (ev.key === "ArrowRight" || ev.key === "d" || ev.key === "D") keys.right = false;
  };

  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  function frame(now) {
    if (stopped) return;
    const dt = Math.min(0.05, Math.max(0.004, (now - lastMs) / 1000));
    lastMs = now;
    elapsedSec += dt;

    if (keys.left) targetX -= 360 * dt;
    if (keys.right) targetX += 360 * dt;
    targetX = Math.max(32, Math.min(W - 32, targetX));
    playerX += (targetX - playerX) * Math.min(1, dt * 15);
    if (invulnSec > 0) invulnSec -= dt;

    // 생존 점수 (+24 pts/sec)
    score += 24 * dt;

    // 유성 스폰 (시간이 갈수록 빠르고 촘촘해짐)
    const interval = Math.max(0.22, 0.72 - elapsedSec * 0.008);
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = interval;
      const spd = 210 + Math.min(340, elapsedSec * 6.5) + Math.random() * 80;
      meteors.push({
        x: 24 + Math.random() * (W - 48),
        y: -26,
        vx: (Math.random() - 0.5) * Math.min(90, elapsedSec * 1.8),
        vy: spd,
        r: 14 + Math.random() * 9,
        hot: Math.random() < 0.35,
        rot: Math.random() * 6
      });
    }

    gemTimer -= dt;
    if (gemTimer <= 0) {
      gemTimer = 2.4 + Math.random() * 1.4;
      gems.push({
        x: 30 + Math.random() * (W - 60),
        y: -22,
        vy: 165 + Math.min(110, elapsedSec * 2),
        isShield: !hasShield && Math.random() < 0.16
      });
    }

    // 배경 우주 렌더
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, "#020617");
    bgGrad.addColorStop(0.55, "#1e1b4b");
    bgGrad.addColorStop(1, "#312e81");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 토성 행성
    ctx.fillStyle = "rgba(250, 204, 21, 0.25)";
    ctx.beginPath(); ctx.arc(340, 96, 36, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(196, 181, 253, 0.4)";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(340, 96, 60, 14, -0.25, 0, Math.PI * 2); ctx.stroke();

    bgStars.forEach(s => {
      s.y = (s.y + s.spd * dt) % H;
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillRect(s.x, s.y, s.r, s.r);
    });

    const py = H - 72;

    // 코인 / 실드 업데이트 & 충돌
    for (let i = gems.length - 1; i >= 0; i--) {
      const g = gems[i];
      g.y += g.vy * dt;
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.fillStyle = g.isShield ? "#38bdf8" : "#fde047";
      ctx.strokeStyle = "#1e1b18";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#1e1b18";
      ctx.font = "900 13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(g.isShield ? "🛡" : "★", 0, 1);
      ctx.restore();

      const dx = g.x - playerX;
      const dy = g.y - py;
      if (dx * dx + dy * dy < 34 * 34) {
        if (g.isShield) {
          hasShield = true;
          score += 40;
          ArcadeSfx.pop(3);
        } else {
          score += 55;
          ArcadeSfx.coin();
        }
        gems.splice(i, 1);
      } else if (g.y > H + 30) {
        gems.splice(i, 1);
      }
    }

    // 유성 업데이트 & 충돌
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.rot += dt * 4.5;

      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.fillStyle = m.hot ? "rgba(239, 68, 68, 0.35)" : "rgba(250, 204, 21, 0.35)";
      ctx.beginPath();
      ctx.moveTo(-m.r * 0.65, 0);
      ctx.lineTo(0, -m.r * 2.2);
      ctx.lineTo(m.r * 0.65, 0);
      ctx.closePath();
      ctx.fill();

      ctx.rotate(m.rot);
      ctx.fillStyle = m.hot ? "#ef4444" : "#facc15";
      ctx.strokeStyle = "#1e1b18";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const ang = (k * Math.PI) / 5;
        const rad = k % 2 === 0 ? m.r : m.r * 0.52;
        if (k === 0) ctx.moveTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
        else ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      const dx = m.x - playerX;
      const dy = m.y - py;
      const hitDist = m.r + 18;
      if (invulnSec <= 0 && dx * dx + dy * dy < hitDist * hitDist) {
        meteors.splice(i, 1);
        if (hasShield) {
          hasShield = false;
          invulnSec = 0.8;
          ArcadeSfx.pop(1);
        } else {
          hearts -= 1;
          invulnSec = 1.1;
          ArcadeSfx.hit();
          if (hearts <= 0) {
            stopped = true;
            syncHud();
            hooks.onFinish(Math.floor(score), "유성 충돌! 게임 종료");
            return;
          }
        }
      } else if (m.y > H + 40) {
        meteors.splice(i, 1);
      }
    }

    // 내 캐릭터 + 부스터 불꽃 그리기
    if (invulnSec <= 0 || Math.floor(invulnSec * 14) % 2 === 0) {
      ctx.save();
      ctx.translate(playerX, py);
      // 로켓 불꽃
      const fLen = 14 + Math.sin(elapsedSec * 36) * 5;
      ctx.fillStyle = "#f97316";
      ctx.beginPath(); ctx.moveTo(-10, 26); ctx.lineTo(0, 28 + fLen); ctx.lineTo(10, 26); ctx.closePath(); ctx.fill();
      // 미니 보드
      _arcFillRoundRect(ctx, -22, 16, 44, 14, 7, "#38bdf8", "#1e1b18", 3);
      ctx.drawImage(playerOffscreen, -32, -36, 64, 64);
      if (hasShield) {
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.arc(0, -2, 36, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }

    syncHud();
    rafId = requestAnimationFrame(frame);
  }

  syncHud();
  rafId = requestAnimationFrame(frame);

  return {
    getScore: () => Math.floor(score),
    destroy: () => {
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    }
  };
}

// ============================================================================
// [게임 2] 니꺼내꺼 (side_sort) — 태양·구름·별·달 · 새 게임마다 좌/우 랜덤 배치!
// ============================================================================
function createSideSortGame(mountEl, hooks) {
  const TYPES = ["sun", "cloud", "star", "moon"];
  const NAMES = { sun: "태양", cloud: "구름", star: "별", moon: "달" };

  // 매 새 게임마다 4종을 랜덤 섞어서 왼쪽 2개 / 오른쪽 2개로 결정!
  const shuffled = [...TYPES].sort(() => Math.random() - 0.5);
  const leftTypes = shuffled.slice(0, 2);
  const rightTypes = shuffled.slice(2, 4);

  const W = 420;
  const H = 370;

  mountEl.innerHTML = `
    <div class="arcade-sort-shell">
      <div class="arcade-canvas-wrap">
        <canvas id="arcSideCanvas" class="arcade-game-canvas" width="${W}" height="${H}"></canvas>
      </div>
      <div class="arcade-side-btn-row">
        <button type="button" id="arcSideLeftBtn" class="arcade-side-btn is-left">
          <div class="arcade-side-btn-label">⬅️ 내꺼 (왼쪽)</div>
          <canvas id="arcSideLeftIcons" width="220" height="72" class="arcade-side-mini-cv"></canvas>
          <div class="arcade-side-btn-names">${NAMES[leftTypes[0]]} · ${NAMES[leftTypes[1]]}</div>
        </button>
        <button type="button" id="arcSideRightBtn" class="arcade-side-btn is-right">
          <div class="arcade-side-btn-label">니꺼 (오른쪽) ➡️</div>
          <canvas id="arcSideRightIcons" width="220" height="72" class="arcade-side-mini-cv"></canvas>
          <div class="arcade-side-btn-names">${NAMES[rightTypes[0]]} · ${NAMES[rightTypes[1]]}</div>
        </button>
      </div>
    </div>
  `;

  const canvas = document.getElementById("arcSideCanvas");
  const ctx = canvas.getContext("2d");

  const drawSideButtonIcons = (cvId, pair) => {
    const cv = document.getElementById(cvId);
    if (!cv) return;
    const c = cv.getContext("2d");
    c.clearRect(0, 0, cv.width, cv.height);
    drawCelestialAsset(c, pair[0], 68, 36, 25);
    drawCelestialAsset(c, pair[1], 152, 36, 25);
  };
  drawSideButtonIcons("arcSideLeftIcons", leftTypes);
  drawSideButtonIcons("arcSideRightIcons", rightTypes);

  let stopped = false;
  let rafId = null;
  let score = 0;
  let combo = 0;
  let timeLeft = 35.0;
  let stunUntil = 0;
  let lastMs = performance.now();
  const queue = Array.from({ length: 6 }, () => TYPES[Math.floor(Math.random() * 4)]);
  const flyItems = [];

  function syncHud() {
    hooks.onHud({
      score,
      timeSec: Math.max(0, timeLeft),
      extra: combo >= 3 ? `🔥 ${combo}콤보!` : "좌/우 분류!"
    });
  }

  function pickSide(dir) {
    if (stopped || timeLeft <= 0) return;
    ArcadeSfx.unlock();
    const now = performance.now();
    if (now < stunUntil) return;

    const current = queue[0];
    const allowed = dir === "left" ? leftTypes : rightTypes;
    if (allowed.includes(current)) {
      combo += 1;
      const pts = 25 + Math.min(25, combo * 2);
      score += pts;
      ArcadeSfx.pop(combo);
      flyItems.push({
        type: current,
        x: W / 2,
        y: 288,
        vx: dir === "left" ? -900 : 900,
        vy: -140,
        alpha: 1
      });
      queue.shift();
      queue.push(TYPES[Math.floor(Math.random() * 4)]);
    } else {
      combo = 0;
      stunUntil = now + 360;
      ArcadeSfx.wrong();
    }
    syncHud();
  }

  const leftBtn = document.getElementById("arcSideLeftBtn");
  const rightBtn = document.getElementById("arcSideRightBtn");
  const onLeft = ev => { ev.preventDefault(); pickSide("left"); };
  const onRight = ev => { ev.preventDefault(); pickSide("right"); };
  leftBtn.addEventListener("pointerdown", onLeft);
  rightBtn.addEventListener("pointerdown", onRight);

  const onKeyDown = ev => {
    if (ev.key === "ArrowLeft" || ev.key === "a" || ev.key === "A") pickSide("left");
    if (ev.key === "ArrowRight" || ev.key === "d" || ev.key === "D") pickSide("right");
  };
  window.addEventListener("keydown", onKeyDown);

  let swipeStartX = null;
  const onCvDown = ev => { swipeStartX = ev.clientX; };
  const onCvUp = ev => {
    if (swipeStartX === null) return;
    const dx = ev.clientX - swipeStartX;
    swipeStartX = null;
    if (Math.abs(dx) > 22) pickSide(dx < 0 ? "left" : "right");
  };
  canvas.addEventListener("pointerdown", onCvDown);
  canvas.addEventListener("pointerup", onCvUp);

  function frame(now) {
    if (stopped) return;
    const dt = Math.min(0.05, Math.max(0.005, (now - lastMs) / 1000));
    lastMs = now;
    timeLeft -= dt;

    if (timeLeft <= 0) {
      timeLeft = 0;
      stopped = true;
      syncHud();
      hooks.onFinish(score, "시간 종료! 분류 완료");
      return;
    }

    // 배경 무대 (좌: 파스텔 스카이 / 우: 파스텔 선셋)
    const skyL = ctx.createLinearGradient(0, 0, 0, H);
    skyL.addColorStop(0, "#dbeafe");
    skyL.addColorStop(1, "#eff6ff");
    ctx.fillStyle = skyL;
    ctx.fillRect(0, 0, W / 2, H);

    const skyR = ctx.createLinearGradient(0, 0, 0, H);
    skyR.addColorStop(0, "#ffedd5");
    skyR.addColorStop(1, "#fffbeb");
    ctx.fillStyle = skyR;
    ctx.fillRect(W / 2, 0, W / 2, H);

    ctx.strokeStyle = "rgba(30, 27, 24, 0.16)";
    ctx.setLineDash([8, 8]);
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
    ctx.setLineDash([]);

    // 상단 좌/우 기준 표지판
    _arcFillRoundRect(ctx, 12, 12, 134, 62, 14, "#ffffff", "#1e1b18", 3);
    drawCelestialAsset(ctx, leftTypes[0], 48, 43, 18);
    drawCelestialAsset(ctx, leftTypes[1], 106, 43, 18);

    _arcFillRoundRect(ctx, W - 146, 12, 134, 62, 14, "#ffffff", "#1e1b18", 3);
    drawCelestialAsset(ctx, rightTypes[0], W - 110, 43, 18);
    drawCelestialAsset(ctx, rightTypes[1], W - 52, 43, 18);

    // 대기열 5개 (위에서 아래로 정렬)
    const stunShake = now < stunUntil ? Math.sin(now * 0.08) * 10 : 0;
    for (let i = Math.min(4, queue.length - 1); i >= 1; i--) {
      const y = 288 - i * 54;
      const r = Math.max(17, 30 - i * 3);
      ctx.save();
      ctx.globalAlpha = Math.max(0.35, 1 - i * 0.15);
      drawCelestialAsset(ctx, queue[i], W / 2, y, r);
      ctx.restore();
    }

    // 현재 분류 대상 강조 링
    ctx.save();
    if (now < stunUntil) {
      _arcFillRoundRect(ctx, W / 2 - 48 + stunShake, 242, 96, 92, 22, "#fecaca", "#dc2626", 4);
    } else {
      _arcFillRoundRect(ctx, W / 2 - 48, 242, 96, 92, 22, "#ffffff", "#1e1b18", 4);
    }
    drawCelestialAsset(ctx, queue[0], W / 2 + stunShake, 288, 34);
    ctx.restore();

    // 날아가는 분류 모션
    for (let i = flyItems.length - 1; i >= 0; i--) {
      const f = flyItems[i];
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.alpha -= dt * 3.4;
      if (f.alpha <= 0) {
        flyItems.splice(i, 1);
      } else {
        ctx.save();
        ctx.globalAlpha = Math.max(0, f.alpha);
        drawCelestialAsset(ctx, f.type, f.x, f.y, 28);
        ctx.restore();
      }
    }

    syncHud();
    rafId = requestAnimationFrame(frame);
  }

  syncHud();
  rafId = requestAnimationFrame(frame);

  return {
    getScore: () => score,
    destroy: () => {
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
      leftBtn.removeEventListener("pointerdown", onLeft);
      rightBtn.removeEventListener("pointerdown", onRight);
      canvas.removeEventListener("pointerdown", onCvDown);
      canvas.removeEventListener("pointerup", onCvUp);
      window.removeEventListener("keydown", onKeyDown);
    }
  };
}

// ============================================================================
// [게임 3] 짝맞추기 (animal_match) — 귀여운 동물들 8종 카드 뒤집기
// ============================================================================
function createAnimalMatchGame(mountEl, hooks) {
  const ANIMALS = ["dog", "cat", "rabbit", "pig", "horse", "monkey", "bear", "frog"];

  let stopped = false;
  let score = 0;
  let combo = 0;
  let stage = 1;
  let timeLeft = 60.0;
  let cards = [];
  let flippedIds = [];
  let mismatchTimer = null;
  let peekTimer = null;
  let isPeeking = false;
  let tickTimer = null;

  mountEl.innerHTML = `<div id="arcMatchBoard" class="arcade-match-board"></div>`;
  const boardEl = document.getElementById("arcMatchBoard");

  function syncHud() {
    hooks.onHud({
      score,
      timeSec: Math.max(0, timeLeft),
      extra: `STAGE ${stage}${isPeeking ? " · 👀 외우세요!" : ""}`
    });
  }

  function setupStage() {
    const pairCount = stage === 1 ? 3 : stage === 2 ? 6 : 8;
    const cols = stage === 1 ? 3 : 4;
    const picked = [...ANIMALS].sort(() => Math.random() - 0.5).slice(0, pairCount);
    const deck = [...picked, ...picked].sort(() => Math.random() - 0.5);
    cards = deck.map((kind, idx) => ({ id: idx, kind, matched: false, open: true }));
    flippedIds = [];
    isPeeking = true;

    boardEl.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    renderBoard();
    syncHud();

    if (peekTimer) clearTimeout(peekTimer);
    peekTimer = setTimeout(() => {
      if (stopped) return;
      isPeeking = false;
      cards.forEach(c => { if (!c.matched) c.open = false; });
      renderBoard();
      syncHud();
    }, 850);
  }

  function renderBoard() {
    boardEl.innerHTML = cards
      .map(
        c => `
      <button type="button" class="arcade-match-card ${c.open || c.matched ? "is-open" : ""} ${c.matched ? "is-matched" : ""}" data-card-id="${c.id}">
        ${
          c.open || c.matched
            ? `<canvas class="arcade-match-cv" data-animal="${c.kind}" width="120" height="120"></canvas>`
            : `<span class="arcade-match-back">🐾</span>`
        }
      </button>
    `
      )
      .join("");

    boardEl.querySelectorAll(".arcade-match-cv").forEach(cv => {
      const cctx = cv.getContext("2d");
      cctx.clearRect(0, 0, cv.width, cv.height);
      drawAnimalChibi(cctx, cv.dataset.animal, 60, 62, 42);
    });
  }

  function onCardClick(ev) {
    if (stopped || isPeeking || timeLeft <= 0) return;
    const btn = ev.target.closest("[data-card-id]");
    if (!btn) return;
    ArcadeSfx.unlock();
    const cid = Number(btn.dataset.cardId);
    const card = cards[cid];
    if (!card || card.matched || card.open) return;

    // 2장 불일치 대기 중 빠르게 다음 카드를 누르면 즉시 덮고 새로 진행 (반응성 보장!)
    if (mismatchTimer) {
      clearTimeout(mismatchTimer);
      mismatchTimer = null;
      cards.forEach(c => { if (!c.matched) c.open = false; });
      flippedIds = [];
    }

    card.open = true;
    flippedIds.push(cid);
    ArcadeSfx.tone(520, 0.06, "sine", 0.08);
    renderBoard();

    if (flippedIds.length === 2) {
      const [idA, idB] = flippedIds;
      const cA = cards[idA];
      const cB = cards[idB];
      if (cA.kind === cB.kind) {
        cA.matched = true;
        cB.matched = true;
        flippedIds = [];
        combo += 1;
        score += 70 + combo * 15;
        ArcadeSfx.pop(combo);
        renderBoard();

        if (cards.every(c => c.matched)) {
          score += 220;
          timeLeft = Math.min(75, timeLeft + 5);
          stage += 1;
          ArcadeSfx.clear();
          setTimeout(() => {
            if (!stopped) setupStage();
          }, 420);
        }
      } else {
        combo = 0;
        ArcadeSfx.wrong();
        mismatchTimer = setTimeout(() => {
          mismatchTimer = null;
          cA.open = false;
          cB.open = false;
          flippedIds = [];
          if (!stopped) renderBoard();
        }, 360);
      }
      syncHud();
    }
  }

  boardEl.addEventListener("click", onCardClick);
  setupStage();

  let lastMs = performance.now();
  tickTimer = setInterval(() => {
    if (stopped) return;
    const now = performance.now();
    timeLeft -= (now - lastMs) / 1000;
    lastMs = now;
    if (timeLeft <= 0) {
      timeLeft = 0;
      stopped = true;
      clearInterval(tickTimer);
      syncHud();
      hooks.onFinish(score, "시간 종료! 동물 짝맞추기 완료");
      return;
    }
    syncHud();
  }, 150);

  return {
    getScore: () => score,
    destroy: () => {
      stopped = true;
      if (tickTimer) clearInterval(tickTimer);
      if (mismatchTimer) clearTimeout(mismatchTimer);
      if (peekTimer) clearTimeout(peekTimer);
      boardEl.removeEventListener("click", onCardClick);
    }
  };
}

// ============================================================================
// [게임 4] 기억하기 (melody_memory) — 9패드(3×3) · 9색 + 9음정 다르게!
// ============================================================================
function createMelodyMemoryGame(mountEl, hooks) {
  const PADS = [
    { idx: 0, label: "도", color: "#ef4444", freq: 261.63 },
    { idx: 1, label: "레", color: "#f97316", freq: 293.66 },
    { idx: 2, label: "미", color: "#facc15", freq: 329.63 },
    { idx: 3, label: "파", color: "#84cc16", freq: 349.23 },
    { idx: 4, label: "솔", color: "#10b981", freq: 392.00 },
    { idx: 5, label: "라", color: "#06b6d4", freq: 440.00 },
    { idx: 6, label: "시", color: "#3b82f6", freq: 493.88 },
    { idx: 7, label: "도↑", color: "#8b5cf6", freq: 523.25 },
    { idx: 8, label: "레↑", color: "#ec4899", freq: 587.33 }
  ];

  mountEl.innerHTML = `
    <div class="arcade-memory-shell">
      <div id="arcMemoryBanner" class="arcade-memory-banner">👀 순서와 소리를 잘 기억하세요!</div>
      <div id="arcMemoryGrid" class="arcade-9pad-grid">
        ${PADS.map(
          p => `
          <button type="button" class="arcade-9pad-btn" data-pad="${p.idx}" style="--pad-col:${p.color};">
            <span class="arcade-9pad-note">♪ ${p.label}</span>
          </button>
        `
        ).join("")}
      </div>
    </div>
  `;

  const bannerEl = document.getElementById("arcMemoryBanner");
  const gridEl = document.getElementById("arcMemoryGrid");
  const padBtns = Array.from(gridEl.querySelectorAll(".arcade-9pad-btn"));

  let stopped = false;
  let score = 0;
  let round = 1;
  let hearts = 3;
  let phase = "demo"; // 'demo' | 'input'
  let sequence = [];
  let inputPos = 0;
  const timers = new Set();

  function safeTimeout(fn, ms) {
    const id = setTimeout(() => {
      timers.delete(id);
      if (!stopped) fn();
    }, ms);
    timers.add(id);
    return id;
  }

  function syncHud() {
    hooks.onHud({
      score,
      hearts,
      extra: `ROUND ${round} · ${sequence.length}음`
    });
  }

  function lightPad(padIdx, durMs = 280) {
    const pad = PADS[padIdx];
    const btn = padBtns[padIdx];
    if (!pad || !btn) return;
    btn.classList.add("is-lit");
    ArcadeSfx.tone(pad.freq, durMs / 1000 + 0.06, "triangle", 0.22);
    safeTimeout(() => btn.classList.remove("is-lit"), durMs);
  }

  function playSequenceDemo() {
    phase = "demo";
    inputPos = 0;
    if (bannerEl) bannerEl.textContent = `👀 ROUND ${round} 시범 재생 중...`;
    syncHud();

    const stepMs = Math.max(330, 560 - round * 24);
    const litMs = Math.max(200, Math.round(stepMs * 0.62));
    sequence.forEach((padIdx, i) => {
      safeTimeout(() => lightPad(padIdx, litMs), 380 + i * stepMs);
    });
    safeTimeout(() => {
      phase = "input";
      if (bannerEl) bannerEl.textContent = `👆 순서대로 터치하세요! (0/${sequence.length})`;
    }, 420 + sequence.length * stepMs);
  }

  function startNextRound(addStep = true) {
    if (addStep) {
      if (round === 1) {
        sequence = [Math.floor(Math.random() * 9), Math.floor(Math.random() * 9)];
      } else {
        sequence.push(Math.floor(Math.random() * 9));
      }
    }
    playSequenceDemo();
  }

  function pressPad(padIdx) {
    if (stopped || phase !== "input") return;
    ArcadeSfx.unlock();
    lightPad(padIdx, 220);

    if (sequence[inputPos] === padIdx) {
      inputPos += 1;
      score += 35;
      if (bannerEl) bannerEl.textContent = `👍 정확해요! (${inputPos}/${sequence.length})`;
      if (inputPos >= sequence.length) {
        score += 100 + round * 30;
        round += 1;
        phase = "wait";
        if (bannerEl) bannerEl.textContent = "🎉 라운드 클리어! 다음 단계 준비 중...";
        ArcadeSfx.clear();
        syncHud();
        safeTimeout(() => startNextRound(true), 680);
        return;
      }
      syncHud();
    } else {
      hearts -= 1;
      ArcadeSfx.wrong();
      syncHud();
      if (hearts <= 0) {
        stopped = true;
        hooks.onFinish(score, `${round}라운드에서 종료!`);
        return;
      }
      phase = "wait";
      if (bannerEl) bannerEl.textContent = `😅 앗! 실수 (남은 기회 ❤️${hearts}) 다시 시범을 보세요`;
      safeTimeout(() => startNextRound(false), 750);
    }
  }

  const onGridClick = ev => {
    const btn = ev.target.closest("[data-pad]");
    if (!btn) return;
    pressPad(Number(btn.dataset.pad));
  };
  gridEl.addEventListener("pointerdown", onGridClick);

  const onKeyDown = ev => {
    if (ev.key >= "1" && ev.key <= "9") pressPad(Number(ev.key) - 1);
  };
  window.addEventListener("keydown", onKeyDown);

  startNextRound(true);

  return {
    getScore: () => score,
    destroy: () => {
      stopped = true;
      timers.forEach(id => clearTimeout(id));
      timers.clear();
      gridEl.removeEventListener("pointerdown", onGridClick);
      window.removeEventListener("keydown", onKeyDown);
    }
  };
}

// ============================================================================
// [게임 5] 점프점프 (jump_runner) — 마리오 느낌 배경 + 이단점프 + 토관/몬스터/코인
// ============================================================================
function createJumpRunnerGame(mountEl, hooks) {
  const W = 420;
  const H = 480;
  const GROUND_Y = 390;

  mountEl.innerHTML = `
    <div class="arcade-canvas-wrap">
      <canvas id="arcJumpCanvas" class="arcade-game-canvas" width="${W}" height="${H}"></canvas>
      <div class="arcade-touch-hint">👆 화면 터치(또는 스페이스바)로 점프 · 공중 터치로 이단점프!</div>
    </div>
  `;
  const canvas = document.getElementById("arcJumpCanvas");
  const ctx = canvas.getContext("2d");
  const playerOffscreen = createBakedMiniPlayerCanvas(128);

  let stopped = false;
  let rafId = null;
  let lastMs = performance.now();
  let score = 0;
  let hearts = 3;
  let invulnSec = 0;
  let scrollX = 0;
  let speed = 240;

  const player = {
    x: 86,
    y: GROUND_Y - 30,
    vy: 0,
    jumpsLeft: 2,
    onGround: true,
    spin: 0
  };

  let spawnObsTimer = 0.8;
  let spawnCoinTimer = 0.9;
  const obstacles = [];
  const coins = [];
  const qBlocks = [];
  let spawnQBlockTimer = 3.2;

  function syncHud() {
    hooks.onHud({ score: Math.floor(score), hearts, extra: `속도 x${(speed / 240).toFixed(1)}` });
  }

  function doJump() {
    if (stopped || player.jumpsLeft <= 0) return;
    ArcadeSfx.unlock();
    const isDouble = !player.onGround;
    player.vy = isDouble ? -540 : -610;
    player.onGround = false;
    player.jumpsLeft -= 1;
    if (isDouble) player.spin = 1;
    ArcadeSfx.jump(isDouble);
  }

  const onDown = ev => { ev.preventDefault(); doJump(); };
  const onKeyDown = ev => {
    if (ev.key === " " || ev.key === "ArrowUp" || ev.key === "w" || ev.key === "W") {
      ev.preventDefault();
      doJump();
    }
  };
  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("keydown", onKeyDown);

  function frame(now) {
    if (stopped) return;
    const dt = Math.min(0.05, Math.max(0.005, (now - lastMs) / 1000));
    lastMs = now;

    speed = Math.min(470, speed + dt * 5.2);
    scrollX += speed * dt;
    score += 24 * dt;
    if (invulnSec > 0) invulnSec -= dt;

    // 물리 점프
    player.vy += 1550 * dt;
    player.y += player.vy * dt;
    if (player.spin > 0) player.spin = Math.max(0, player.spin - dt * 2.8);

    if (player.y >= GROUND_Y - 28) {
      player.y = GROUND_Y - 28;
      player.vy = 0;
      player.onGround = true;
      player.jumpsLeft = 2;
    }

    // 토관 / 몬스터 스폰
    spawnObsTimer -= dt;
    if (spawnObsTimer <= 0) {
      spawnObsTimer = Math.max(0.75, 1.48 - (speed - 240) * 0.0022) + Math.random() * 0.45;
      const isEnemy = Math.random() < 0.42;
      obstacles.push(
        isEnemy
          ? { kind: "goomba", x: W + 30, y: GROUND_Y - 22, w: 36, h: 36, dead: false }
          : { kind: "pipe", x: W + 30, h: 46 + Math.random() * 38, w: 46 }
      );
    }

    spawnCoinTimer -= dt;
    if (spawnCoinTimer <= 0) {
      spawnCoinTimer = 0.85 + Math.random() * 0.7;
      const high = Math.random() < 0.5;
      coins.push({ x: W + 24, y: high ? GROUND_Y - 140 : GROUND_Y - 58 });
    }

    spawnQBlockTimer -= dt;
    if (spawnQBlockTimer <= 0) {
      spawnQBlockTimer = 4.2 + Math.random() * 2.5;
      qBlocks.push({ x: W + 30, y: GROUND_Y - 138, hit: false });
    }

    // 1) 마리오풍 하늘 + 구름 + 초록 언덕 + 벽돌 바닥 배경
    const skyG = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    skyG.addColorStop(0, "#38bdf8");
    skyG.addColorStop(1, "#bae6fd");
    ctx.fillStyle = skyG;
    ctx.fillRect(0, 0, W, GROUND_Y);

    // 둥실 뭉게구름
    for (let i = 0; i < 4; i++) {
      const cx = ((i * 150 - scrollX * 0.25) % (W + 140) + W + 140) % (W + 140) - 70;
      const cy = 62 + (i % 2) * 34;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#1e1b18";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx - 18, cy + 4, 18, Math.PI * 0.5, Math.PI * 1.7);
      ctx.arc(cx, cy - 8, 22, Math.PI, 0);
      ctx.arc(cx + 20, cy + 4, 18, Math.PI * 1.3, Math.PI * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // 마리오풍 초록 언덕 실루엣
    for (let i = 0; i < 4; i++) {
      const hx = ((i * 170 - scrollX * 0.42) % (W + 170) + W + 170) % (W + 170) - 85;
      ctx.fillStyle = i % 2 === 0 ? "#4ade80" : "#22c55e";
      ctx.strokeStyle = "#1e1b18";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(hx, GROUND_Y, 72, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // 잔디 + 벽돌 땅 바닥
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(0, GROUND_Y, W, 16);
    ctx.fillStyle = "#b45309";
    ctx.fillRect(0, GROUND_Y + 16, W, H - GROUND_Y - 16);
    ctx.strokeStyle = "#1e1b18";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(W, GROUND_Y); ctx.stroke();

    // 스크롤 벽돌 무늬
    ctx.strokeStyle = "rgba(30,27,24,0.45)";
    ctx.lineWidth = 2.5;
    const brickOff = Math.floor(scrollX) % 44;
    for (let bx = -brickOff; bx < W + 44; bx += 44) {
      ctx.strokeRect(bx, GROUND_Y + 18, 44, 34);
      ctx.strokeRect(bx - 22, GROUND_Y + 52, 44, 38);
    }

    // ? 물음표 블록
    for (let i = qBlocks.length - 1; i >= 0; i--) {
      const qb = qBlocks[i];
      qb.x -= speed * dt;
      _arcFillRoundRect(ctx, qb.x - 18, qb.y - 18, 36, 36, 6, qb.hit ? "#94a3b8" : "#facc15", "#1e1b18", 3.5);
      ctx.fillStyle = "#1e1b18";
      ctx.font = "900 20px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(qb.hit ? "✓" : "?", qb.x, qb.y + 1);

      if (!qb.hit && Math.abs(player.x - qb.x) < 34 && Math.abs(player.y - qb.y) < 36) {
        qb.hit = true;
        score += 80;
        ArcadeSfx.coin();
      }
      if (qb.x < -50) qBlocks.splice(i, 1);
    }

    // 코인 렌더 & 수집
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      c.x -= speed * dt;
      ctx.fillStyle = "#fde047";
      ctx.strokeStyle = "#1e1b18";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(c.x, c.y, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#b45309";
      ctx.font = "900 13px sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("♪", c.x, c.y + 1);

      if (Math.hypot(c.x - player.x, c.y - player.y) < 34) {
        score += 40;
        ArcadeSfx.coin();
        coins.splice(i, 1);
      } else if (c.x < -30) {
        coins.splice(i, 1);
      }
    }

    // 토관 / 몬스터 렌더 & 충돌
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.x -= (o.kind === "goomba" ? speed + 45 : speed) * dt;

      if (o.kind === "pipe") {
        const pyTop = GROUND_Y - o.h;
        _arcFillRoundRect(ctx, o.x - o.w * 0.42, pyTop + 16, o.w * 0.84, o.h - 16, 4, "#16a34a", "#1e1b18", 3.5);
        _arcFillRoundRect(ctx, o.x - o.w * 0.52, pyTop, o.w * 1.04, 18, 6, "#22c55e", "#1e1b18", 3.5);
        ctx.fillStyle = "#86efac";
        ctx.fillRect(o.x - o.w * 0.3, pyTop + 18, 6, Math.max(0, o.h - 22));

        if (
          invulnSec <= 0 &&
          Math.abs(player.x - o.x) < o.w * 0.4 + 16 &&
          player.y + 22 > pyTop + 4
        ) {
          hearts -= 1;
          invulnSec = 1.05;
          ArcadeSfx.hit();
          if (hearts <= 0) {
            stopped = true;
            syncHud();
            hooks.onFinish(Math.floor(score), "토관 충돌! 점프점프 완료");
            return;
          }
        }
      } else {
        // 뾰족 몬스터
        _arcFillRoundRect(ctx, o.x - 18, o.y - 18, 36, 36, 14, "#9333ea", "#1e1b18", 3.5);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(o.x - 6, o.y - 4, 4, 0, Math.PI * 2); ctx.arc(o.x + 6, o.y - 4, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#1e1b18";
        ctx.beginPath(); ctx.arc(o.x - 6, o.y - 4, 2, 0, Math.PI * 2); ctx.arc(o.x + 6, o.y - 4, 2, 0, Math.PI * 2); ctx.fill();

        const dx = Math.abs(player.x - o.x);
        const dy = player.y - o.y;
        if (dx < 28 && Math.abs(dy) < 30) {
          // 위에서 밟으면 밟기 보상 + 통통 바운스!
          if (player.vy > 0 && dy < -6) {
            score += 75;
            player.vy = -440;
            player.jumpsLeft = 1;
            ArcadeSfx.pop(2);
            obstacles.splice(i, 1);
            continue;
          } else if (invulnSec <= 0) {
            hearts -= 1;
            invulnSec = 1.05;
            ArcadeSfx.hit();
            obstacles.splice(i, 1);
            if (hearts <= 0) {
              stopped = true;
              syncHud();
              hooks.onFinish(Math.floor(score), "몬스터 충돌! 점프점프 완료");
              return;
            }
            continue;
          }
        }
      }

      if (o.x < -70) obstacles.splice(i, 1);
    }

    // 내 캐릭터 그리기
    if (invulnSec <= 0 || Math.floor(invulnSec * 14) % 2 === 0) {
      ctx.save();
      ctx.translate(player.x, player.y);
      const bob = player.onGround ? Math.sin(scrollX * 0.08) * 3 : 0;
      if (player.spin > 0) ctx.rotate((1 - player.spin) * Math.PI * 2);
      ctx.drawImage(playerOffscreen, -30, -34 + bob, 60, 60);
      ctx.restore();
    }

    syncHud();
    rafId = requestAnimationFrame(frame);
  }

  syncHud();
  rafId = requestAnimationFrame(frame);

  return {
    getScore: () => Math.floor(score),
    destroy: () => {
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKeyDown);
    }
  };
}

// ============================================================================
// [게임 6] 정리고수 (color_sort) — 색깔 블록 3칸 정리 퍼즐
// ============================================================================
function createColorSortGame(mountEl, hooks) {
  const BLOCKS = [
    { id: "red", bg: "#ef4444", sym: "♥" },
    { id: "blue", bg: "#3b82f6", sym: "●" },
    { id: "yellow", bg: "#facc15", sym: "★" },
    { id: "green", bg: "#22c55e", sym: "◆" },
    { id: "purple", bg: "#a855f7", sym: "▲" },
    { id: "cyan", bg: "#06b6d4", sym: "✚" }
  ];

  mountEl.innerHTML = `
    <div class="arcade-csort-shell">
      <div class="arcade-csort-toprow">
        <span id="arcCSortHint" class="arcade-csort-hint">같은 색깔 블록 3개를 아래칸에 모아 터뜨리세요!</span>
        <button type="button" id="arcCSortShuffleBtn" class="btn btn-gold" style="padding:5px 10px; font-size:0.74rem; white-space:nowrap;">🔀 섞기 (2)</button>
      </div>
      <div id="arcCSortShelves" class="arcade-csort-shelves"></div>
      <div class="arcade-csort-tray-wrap">
        <div class="arcade-csort-tray-label">📦 정리 트레이 (6칸 차면 종료!)</div>
        <div id="arcCSortTray" class="arcade-csort-tray"></div>
      </div>
    </div>
  `;

  const shelvesEl = document.getElementById("arcCSortShelves");
  const trayEl = document.getElementById("arcCSortTray");
  const shuffleBtn = document.getElementById("arcCSortShuffleBtn");

  let stopped = false;
  let score = 0;
  let combo = 0;
  let stage = 1;
  let timeLeft = 65.0;
  let shufflesLeft = 2;
  let bins = []; // [{ front: [id|null, id|null, id|null], back: [id|null, id|null, id|null] }]
  let tray = [];
  let tickTimer = null;

  function syncHud() {
    hooks.onHud({
      score,
      timeSec: Math.max(0, timeLeft),
      extra: `STAGE ${stage}`
    });
  }

  function setupStage() {
    const binCount = stage === 1 ? 4 : stage === 2 ? 6 : 8;
    const colorCount = Math.min(6, 4 + Math.floor(stage / 2));
    const tripletsCount = binCount * 2; // 앞 3칸 + 뒤 3칸 = 총 binCount * 6칸 (짝수 배수) -> 3의 배수 맞춰 채우기
    const totalTriplets = Math.max(4, Math.floor((binCount * 5) / 3));
    const pool = [];
    for (let t = 0; t < totalTriplets; t++) {
      const col = BLOCKS[t % colorCount];
      pool.push(col.id, col.id, col.id);
    }
    pool.sort(() => Math.random() - 0.5);

    bins = Array.from({ length: binCount }, () => ({ front: [null, null, null], back: [null, null, null] }));
    let ptr = 0;
    for (let b = 0; b < binCount; b++) {
      for (let s = 0; s < 3; s++) {
        if (ptr < pool.length) bins[b].front[s] = pool[ptr++];
      }
    }
    for (let b = 0; b < binCount; b++) {
      for (let s = 0; s < 3; s++) {
        if (ptr < pool.length) bins[b].back[s] = pool[ptr++];
      }
    }
    shufflesLeft = 2;
    if (shuffleBtn) shuffleBtn.textContent = `🔀 섞기 (${shufflesLeft})`;
    renderAll();
  }

  function renderBlockHtml(colorId, attr) {
    if (!colorId) return `<div class="arcade-cblock-empty"></div>`;
    const meta = BLOCKS.find(x => x.id === colorId) || BLOCKS[0];
    return `<button type="button" class="arcade-cblock" ${attr} style="background:${meta.bg}; color:${meta.id === "yellow" ? "#1e1b18" : "#ffffff"};">${meta.sym}</button>`;
  }

  function renderAll() {
    shelvesEl.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
    shelvesEl.innerHTML = bins
      .map(
        (bin, bi) => `
      <div class="arcade-csort-bin">
        <div class="arcade-csort-back-row">
          ${bin.back.map(id => (id ? `<span class="arcade-cblock-mini" style="background:${(BLOCKS.find(x => x.id === id) || BLOCKS[0]).bg};"></span>` : `<span class="arcade-cblock-mini is-empty"></span>`)).join("")}
        </div>
        <div class="arcade-csort-front-row">
          ${bin.front.map((id, si) => renderBlockHtml(id, `data-bin="${bi}" data-slot="${si}"`)).join("")}
        </div>
      </div>
    `
      )
      .join("");

    const traySlots = [];
    for (let i = 0; i < 6; i++) {
      const id = tray[i] || null;
      if (id) {
        const meta = BLOCKS.find(x => x.id === id) || BLOCKS[0];
        traySlots.push(`<div class="arcade-cblock is-in-tray" style="background:${meta.bg}; color:${meta.id === "yellow" ? "#1e1b18" : "#ffffff"};">${meta.sym}</div>`);
      } else {
        traySlots.push(`<div class="arcade-cblock-empty is-tray-slot"></div>`);
      }
    }
    trayEl.innerHTML = traySlots.join("");
    trayEl.classList.toggle("is-danger", tray.length >= 5);
  }

  function onShelfClick(ev) {
    if (stopped || timeLeft <= 0) return;
    const btn = ev.target.closest("[data-bin][data-slot]");
    if (!btn) return;
    ArcadeSfx.unlock();
    const bi = Number(btn.dataset.bin);
    const si = Number(btn.dataset.slot);
    const bin = bins[bi];
    if (!bin || !bin.front[si]) return;

    const pickedId = bin.front[si];
    bin.front[si] = null;
    // 뒷줄이 전부 있거나 해당 칸 뒤에 블록이 있으면 앞으로 당겨오기!
    if (bin.back[si]) {
      bin.front[si] = bin.back[si];
      bin.back[si] = null;
    }

    // 트레이에서 같은 색 옆에 정렬 삽입
    const lastIdx = tray.lastIndexOf(pickedId);
    if (lastIdx !== -1) {
      tray.splice(lastIdx + 1, 0, pickedId);
    } else {
      tray.push(pickedId);
    }
    ArcadeSfx.tone(540, 0.06, "triangle", 0.12);

    // 3개 연속 매치 체크!
    let matchedPop = false;
    for (let i = 0; i <= tray.length - 3; i++) {
      if (tray[i] && tray[i] === tray[i + 1] && tray[i] === tray[i + 2]) {
        tray.splice(i, 3);
        matchedPop = true;
        combo += 1;
        score += 95 + combo * 25;
        ArcadeSfx.pop(combo);
        break;
      }
    }
    if (!matchedPop && tray.length >= 6) {
      combo = 0;
      renderAll();
      stopped = true;
      syncHud();
      ArcadeSfx.hit();
      hooks.onFinish(score, "트레이가 가득 찼습니다!");
      return;
    }

    // 모든 선반이 비었는지 확인
    const remaining = bins.some(b => b.front.some(Boolean) || b.back.some(Boolean));
    if (!remaining && tray.length === 0) {
      score += 260;
      timeLeft = Math.min(80, timeLeft + 7);
      stage += 1;
      ArcadeSfx.clear();
      syncHud();
      setTimeout(() => {
        if (!stopped) setupStage();
      }, 360);
      return;
    }

    renderAll();
    syncHud();
  }

  function onShuffle() {
    if (stopped || shufflesLeft <= 0) return;
    ArcadeSfx.unlock();
    shufflesLeft -= 1;
    if (shuffleBtn) shuffleBtn.textContent = `🔀 섞기 (${shufflesLeft})`;
    const flat = [];
    bins.forEach(b => {
      b.front.forEach((v, idx) => { if (v) { flat.push(v); b.front[idx] = null; } });
      b.back.forEach((v, idx) => { if (v) { flat.push(v); b.back[idx] = null; } });
    });
    flat.sort(() => Math.random() - 0.5);
    let p = 0;
    bins.forEach(b => {
      for (let i = 0; i < 3; i++) if (p < flat.length) b.front[i] = flat[p++];
    });
    bins.forEach(b => {
      for (let i = 0; i < 3; i++) if (p < flat.length) b.back[i] = flat[p++];
    });
    ArcadeSfx.pop(2);
    renderAll();
  }

  shelvesEl.addEventListener("click", onShelfClick);
  if (shuffleBtn) shuffleBtn.addEventListener("click", onShuffle);

  setupStage();
  let lastMs = performance.now();
  tickTimer = setInterval(() => {
    if (stopped) return;
    const now = performance.now();
    timeLeft -= (now - lastMs) / 1000;
    lastMs = now;
    if (timeLeft <= 0) {
      timeLeft = 0;
      stopped = true;
      clearInterval(tickTimer);
      syncHud();
      hooks.onFinish(score, "시간 종료! 정리고수 완료");
      return;
    }
    syncHud();
  }, 150);

  return {
    getScore: () => score,
    destroy: () => {
      stopped = true;
      if (tickTimer) clearInterval(tickTimer);
      shelvesEl.removeEventListener("click", onShelfClick);
      if (shuffleBtn) shuffleBtn.removeEventListener("click", onShuffle);
    }
  };
}

// ============================================================================
// [게임 7] 뿌셔뿌셔 (brick_breaker) — 다채로운 색상 벽돌 + 멀티볼/와이드 파워업
// ============================================================================
function createBrickBreakerGame(mountEl, hooks) {
  const W = 420;
  const H = 540;

  mountEl.innerHTML = `
    <div class="arcade-canvas-wrap">
      <canvas id="arcBrickCanvas" class="arcade-game-canvas" width="${W}" height="${H}"></canvas>
      <div class="arcade-touch-hint">👆 패들을 좌우 드래그(또는 ◀▶ 키)해 알록달록 벽돌을 부수세요!</div>
    </div>
  `;
  const canvas = document.getElementById("arcBrickCanvas");
  const ctx = canvas.getContext("2d");

  const ROW_COLORS = [
    "#ef4444", "#f97316", "#facc15", "#22c55e", "#06b6d4", "#6366f1", "#ec4899"
  ];

  let stopped = false;
  let rafId = null;
  let lastMs = performance.now();
  let score = 0;
  let stage = 1;
  let hearts = 3;
  let combo = 0;
  let wideSec = 0;
  let guardSec = 0;

  const paddle = { x: W / 2, w: 94, h: 16, y: H - 44 };
  let targetPadX = W / 2;
  const keys = { left: false, right: false };

  let bricks = [];
  let balls = [];
  const powerUps = [];

  function spawnBricks() {
    bricks = [];
    const cols = 7;
    const rows = Math.min(7, 5 + (stage - 1));
    const padX = 14;
    const gap = 5;
    const bw = (W - padX * 2 - gap * (cols - 1)) / cols;
    const bh = 22;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isTough = stage >= 2 && (r + c) % 6 === 0;
        const col = ROW_COLORS[(r + c + stage) % ROW_COLORS.length];
        bricks.push({
          x: padX + c * (bw + gap),
          y: 44 + r * (bh + gap),
          w: bw,
          h: bh,
          color: isTough ? "#cbd5e1" : col,
          hp: isTough ? 2 : 1,
          maxHp: isTough ? 2 : 1
        });
      }
    }
  }

  function resetSingleBall() {
    balls = [
      {
        x: paddle.x,
        y: paddle.y - 14,
        vx: (Math.random() < 0.5 ? -1 : 1) * (150 + stage * 15),
        vy: -(295 + stage * 20),
        r: 9
      }
    ];
  }

  spawnBricks();
  resetSingleBall();

  function syncHud() {
    hooks.onHud({
      score,
      hearts,
      extra: `STAGE ${stage}${balls.length > 1 ? ` · 공×${balls.length}` : ""}`
    });
  }

  const pointerX = ev => {
    const rect = canvas.getBoundingClientRect();
    const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
    return Math.max(paddle.w / 2 + 6, Math.min(W - paddle.w / 2 - 6, ((clientX - rect.left) / Math.max(1, rect.width)) * W));
  };

  let dragging = false;
  const onDown = ev => { dragging = true; targetPadX = pointerX(ev); ArcadeSfx.unlock(); };
  const onMove = ev => { if (dragging || ev.pointerType === "mouse") targetPadX = pointerX(ev); };
  const onUp = () => { dragging = false; };
  const onKeyDown = ev => {
    if (ev.key === "ArrowLeft" || ev.key === "a" || ev.key === "A") keys.left = true;
    if (ev.key === "ArrowRight" || ev.key === "d" || ev.key === "D") keys.right = true;
  };
  const onKeyUp = ev => {
    if (ev.key === "ArrowLeft" || ev.key === "a" || ev.key === "A") keys.left = false;
    if (ev.key === "ArrowRight" || ev.key === "d" || ev.key === "D") keys.right = false;
  };

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  function frame(now) {
    if (stopped) return;
    const dt = Math.min(0.035, Math.max(0.005, (now - lastMs) / 1000));
    lastMs = now;

    if (wideSec > 0) wideSec -= dt;
    if (guardSec > 0) guardSec -= dt;
    paddle.w = wideSec > 0 ? 132 : 94;

    if (keys.left) targetPadX -= 420 * dt;
    if (keys.right) targetPadX += 420 * dt;
    targetPadX = Math.max(paddle.w / 2 + 6, Math.min(W - paddle.w / 2 - 6, targetPadX));
    paddle.x += (targetPadX - paddle.x) * Math.min(1, dt * 20);

    // 배경
    const bgG = ctx.createLinearGradient(0, 0, 0, H);
    bgG.addColorStop(0, "#1e1b4b");
    bgG.addColorStop(1, "#0f172a");
    ctx.fillStyle = bgG;
    ctx.fillRect(0, 0, W, H);

    // 바닥 세이프가드 바
    if (guardSec > 0) {
      _arcFillRoundRect(ctx, 8, H - 14, W - 16, 8, 4, "#38bdf8", "#1e1b18", 2);
    }

    // 벽돌 그리기
    bricks.forEach(b => {
      _arcFillRoundRect(ctx, b.x, b.y, b.w, b.h, 6, b.color, "#1e1b18", 2.5);
      ctx.fillStyle = "rgba(255,255,255,0.34)";
      ctx.fillRect(b.x + 4, b.y + 3, b.w - 8, 4);
      if (b.maxHp === 2 && b.hp === 1) {
        ctx.strokeStyle = "#1e1b18";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(b.x + 12, b.y + 4); ctx.lineTo(b.x + 22, b.y + 14); ctx.lineTo(b.x + 16, b.y + 19); ctx.stroke();
      }
    });

    // 파워업 캡슐
    for (let i = powerUps.length - 1; i >= 0; i--) {
      const pu = powerUps[i];
      pu.y += 145 * dt;
      _arcFillRoundRect(ctx, pu.x - 18, pu.y - 10, 36, 20, 10, pu.col, "#1e1b18", 2.5);
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 11px sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(pu.label, pu.x, pu.y + 1);

      if (Math.abs(pu.x - paddle.x) < paddle.w / 2 + 16 && Math.abs(pu.y - paddle.y) < 18) {
        if (pu.kind === "multi") {
          const ref = balls[0] || { x: paddle.x, y: paddle.y - 20, vy: -310, r: 9 };
          if (balls.length < 4) {
            balls.push({ x: ref.x, y: ref.y, vx: -180, vy: -Math.abs(ref.vy || 300), r: 9 });
            balls.push({ x: ref.x, y: ref.y, vx: 180, vy: -Math.abs(ref.vy || 300), r: 9 });
          }
        } else if (pu.kind === "wide") {
          wideSec = 9;
        } else {
          guardSec = 8;
        }
        ArcadeSfx.coin();
        powerUps.splice(i, 1);
      } else if (pu.y > H + 20) {
        powerUps.splice(i, 1);
      }
    }

    // 공 업데이트 & 충돌
    for (let bi = balls.length - 1; bi >= 0; bi--) {
      const ball = balls[bi];
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); ArcadeSfx.tone(420, 0.04, "sine", 0.06); }
      if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); ArcadeSfx.tone(420, 0.04, "sine", 0.06); }
      if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); ArcadeSfx.tone(480, 0.04, "sine", 0.06); }

      if (guardSec > 0 && ball.vy > 0 && ball.y + ball.r >= H - 14) {
        ball.y = H - 14 - ball.r;
        ball.vy = -Math.abs(ball.vy);
        ArcadeSfx.tone(520, 0.06, "triangle", 0.08);
      }

      // 패들 충돌
      if (
        ball.vy > 0 &&
        ball.y + ball.r >= paddle.y &&
        ball.y - ball.r <= paddle.y + paddle.h &&
        ball.x >= paddle.x - paddle.w / 2 - 4 &&
        ball.x <= paddle.x + paddle.w / 2 + 4
      ) {
        const hitNorm = Math.max(-0.92, Math.min(0.92, (ball.x - paddle.x) / (paddle.w / 2)));
        const spd = Math.min(540, Math.hypot(ball.vx, ball.vy) * 1.015);
        const angle = hitNorm * (Math.PI * 0.36);
        ball.vx = Math.sin(angle) * spd;
        ball.vy = -Math.max(200, Math.cos(angle) * spd);
        ball.y = paddle.y - ball.r - 1;
        combo = 0;
        ArcadeSfx.tone(360, 0.06, "triangle", 0.12);
      }

      // 벽돌 충돌
      for (let k = bricks.length - 1; k >= 0; k--) {
        const br = bricks[k];
        const nearX = Math.max(br.x, Math.min(ball.x, br.x + br.w));
        const nearY = Math.max(br.y, Math.min(ball.y, br.y + br.h));
        const dx = ball.x - nearX;
        const dy = ball.y - nearY;
        if (dx * dx + dy * dy <= ball.r * ball.r) {
          if (Math.abs(dx) > Math.abs(dy)) ball.vx = -ball.vx;
          else ball.vy = -ball.vy;

          br.hp -= 1;
          combo += 1;
          score += 25 + Math.min(35, combo * 3);
          ArcadeSfx.pop(combo);

          if (br.hp <= 0) {
            if (Math.random() < 0.17) {
              const pKinds = [
                { kind: "multi", label: "×3", col: "#ec4899" },
                { kind: "wide", label: "넓음", col: "#22c55e" },
                { kind: "guard", label: "방어", col: "#0284c7" }
              ];
              const pk = pKinds[Math.floor(Math.random() * pKinds.length)];
              powerUps.push({ ...pk, x: br.x + br.w / 2, y: br.y + br.h / 2 });
            }
            bricks.splice(k, 1);
          }
          break;
        }
      }

      // 공 렌더
      ctx.fillStyle = "#fde047";
      ctx.strokeStyle = "#1e1b18";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      if (ball.y - ball.r > H + 12) {
        balls.splice(bi, 1);
      }
    }

    if (balls.length === 0) {
      hearts -= 1;
      combo = 0;
      ArcadeSfx.hit();
      if (hearts <= 0) {
        stopped = true;
        syncHud();
        hooks.onFinish(score, "공을 모두 놓쳤습니다!");
        return;
      }
      resetSingleBall();
    }

    if (bricks.length === 0) {
      score += 320;
      stage += 1;
      ArcadeSfx.clear();
      spawnBricks();
      resetSingleBall();
    }

    // 패들 렌더
    _arcFillRoundRect(ctx, paddle.x - paddle.w / 2, paddle.y, paddle.w, paddle.h, 8, "#38bdf8", "#1e1b18", 3);
    _arcFillRoundRect(ctx, paddle.x - paddle.w / 2 + 8, paddle.y + 3, paddle.w - 16, 4, 2, "#e0f2fe", null, 0);

    syncHud();
    rafId = requestAnimationFrame(frame);
  }

  syncHud();
  rafId = requestAnimationFrame(frame);

  return {
    getScore: () => score,
    destroy: () => {
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    }
  };
}

const ARCADE_MINI_GAME_FACTORIES = {
  star_dodge: createStarDodgeGame,
  side_sort: createSideSortGame,
  animal_match: createAnimalMatchGame,
  melody_memory: createMelodyMemoryGame,
  jump_runner: createJumpRunnerGame,
  color_sort: createColorSortGame,
  brick_breaker: createBrickBreakerGame
};
