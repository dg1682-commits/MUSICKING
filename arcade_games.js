// ============================================================================
// [음악왕 V3.0] 오락실 미니게임 8종 통합 엔진 (arcade_games.js)
// - 본게임과 동일한 #1e1b18 굵은 잉크 외곽선 & 선명한 카툰 톤앤매너 통일
// - 1. 별피하기(star_dodge)    2. 니꺼내꺼(side_sort)    3. 짝맞추기(animal_match)
// - 4. 기억하기(melody_memory) 5. 점프점프(jump_runner)  6. 정리고수(color_sort)
// - 7. 뿌셔뿌셔(brick_breaker) 8. 음표팡팡(note_pang)
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

// object-fit: contain 캔버스 비율 보정 공용 포인터 좌표 변환 유틸
function _arcMapCanvasPoint(canvas, logicalW, logicalH, ev) {
  const rect = canvas.getBoundingClientRect();
  const src = (ev.touches && ev.touches[0]) || (ev.changedTouches && ev.changedTouches[0]) || ev;
  const clientX = Number(src.clientX) || 0;
  const clientY = Number(src.clientY) || 0;
  const cw = Math.max(1, rect.width);
  const ch = Math.max(1, rect.height);
  const aspect = logicalW / Math.max(1, logicalH);
  const renderedW = Math.min(cw, ch * aspect);
  const renderedH = Math.min(ch, cw / aspect);
  const offX = rect.left + (cw - renderedW) / 2;
  const offY = rect.top + (ch - renderedH) / 2;
  return {
    x: ((clientX - offX) / Math.max(1, renderedW)) * logicalW,
    y: ((clientY - offY) / Math.max(1, renderedH)) * logicalH,
    clientX,
    clientY
  };
}

// 캔버스 + 하단 빈 여백(슬라이드 패드 포함) 전체 좌우 터치/키보드 공용 컨트롤러
function _arcBindSlideControl({ mountEl, canvas, slidePadEl, logicalW, marginX, onX, onKeyState, allowMouseHover = false }) {
  const prevTouchAction = mountEl.style.touchAction;
  mountEl.style.touchAction = "none";

  const mapPointerX = ev => {
    const pt = _arcMapCanvasPoint(canvas, logicalW, canvas.height || 1, ev);
    return Math.max(marginX, Math.min(logicalW - marginX, pt.x));
  };

  let dragging = false;
  let activePointerId = null;

  const setActiveVisual = active => {
    if (slidePadEl) slidePadEl.classList.toggle("is-active", Boolean(active));
  };

  const onDown = ev => {
    if (ev.pointerType !== "mouse" && typeof ev.preventDefault === "function") {
      ev.preventDefault();
    }
    dragging = true;
    activePointerId = ev.pointerId ?? null;
    setActiveVisual(true);
    onX(mapPointerX(ev));
    ArcadeSfx.unlock();
  };

  const onMove = ev => {
    if (activePointerId !== null && ev.pointerId != null && ev.pointerId !== activePointerId) return;
    if (dragging || (allowMouseHover && ev.pointerType === "mouse")) {
      if (dragging && ev.pointerType !== "mouse" && typeof ev.preventDefault === "function") {
        ev.preventDefault();
      }
      onX(mapPointerX(ev));
    }
  };

  const onUp = ev => {
    if (activePointerId !== null && ev.pointerId != null && ev.pointerId !== activePointerId) return;
    dragging = false;
    activePointerId = null;
    setActiveVisual(false);
  };

  const onKeyDown = ev => {
    if (ev.key === "ArrowLeft" || ev.key === "a" || ev.key === "A") onKeyState("left", true);
    if (ev.key === "ArrowRight" || ev.key === "d" || ev.key === "D") onKeyState("right", true);
  };

  const onKeyUp = ev => {
    if (ev.key === "ArrowLeft" || ev.key === "a" || ev.key === "A") onKeyState("left", false);
    if (ev.key === "ArrowRight" || ev.key === "d" || ev.key === "D") onKeyState("right", false);
  };

  mountEl.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove, { passive: false });
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  return () => {
    mountEl.style.touchAction = prevTouchAction;
    mountEl.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  };
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
    <div class="arcade-canvas-wrap has-slide-pad">
      <canvas id="arcStarCanvas" class="arcade-game-canvas" width="${W}" height="${H}"></canvas>
      <div id="arcStarSlidePad" class="arcade-slide-pad">
        <span>◀</span>
        <span>여기를 좌우로 문질러도 이동해요!</span>
        <span>▶</span>
      </div>
    </div>
  `;
  const canvas = document.getElementById("arcStarCanvas");
  const slidePadEl = document.getElementById("arcStarSlidePad");
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

  const unbindSlide = _arcBindSlideControl({
    mountEl,
    canvas,
    slidePadEl,
    logicalW: W,
    marginX: 32,
    onX: nx => { targetX = nx; },
    onKeyState: (dir, isDown) => { keys[dir] = isDown; }
  });

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
      unbindSlide();
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
  let normalStreak = 0;
  let inFever = false;
  let feverLeft = 0;
  let timeLeft = 35.0;
  let stunUntil = 0;
  let missFlashUntil = 0;
  let lastMs = performance.now();
  const queue = Array.from({ length: 6 }, () => TYPES[Math.floor(Math.random() * 4)]);
  const flyItems = [];
  const popups = [];

  function syncHud() {
    hooks.onHud({
      score,
      timeSec: Math.max(0, timeLeft),
      extra: inFever
        ? `🔥 FEVER 남은 ${feverLeft}/20 (+0.5s)`
        : `🔥 ${normalStreak}/20연속 · 틀리면 -3초`
    });
  }

  function finishSideSort(reason) {
    if (stopped) return;
    timeLeft = Math.max(0, timeLeft);
    stopped = true;
    syncHud();
    hooks.onFinish(score, reason);
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
      const basePts = 25 + Math.min(30, combo * 2);
      const pts = inFever ? Math.round(basePts * 1.5) : basePts;
      score += pts;

      if (inFever) {
        timeLeft = Math.min(99.0, timeLeft + 0.5);
        feverLeft -= 1;
        popups.push({ text: `+0.5초! (+${pts})`, x: W / 2, y: 244, col: "#d97706", alpha: 1.15 });
        ArcadeSfx.pop(Math.min(14, combo + 3));
        if (feverLeft <= 0) {
          inFever = false;
          feverLeft = 0;
          normalStreak = 0;
          ArcadeSfx.clear();
          popups.push({ text: "✨ FEVER 완료! 20연속 재도전!", x: W / 2, y: 208, col: "#2563eb", alpha: 1.45 });
        }
      } else {
        normalStreak += 1;
        ArcadeSfx.pop(combo);
        if (normalStreak >= 20) {
          inFever = true;
          feverLeft = 20;
          normalStreak = 0;
          ArcadeSfx.clear();
          popups.push({ text: "🔥 FEVER TIME! (+0.5s × 20개)", x: W / 2, y: 214, col: "#dc2626", alpha: 1.55 });
        }
      }

      flyItems.push({
        type: current,
        x: W / 2,
        y: 304,
        vx: dir === "left" ? -900 : 900,
        vy: -140,
        alpha: 1
      });
      queue.shift();
      queue.push(TYPES[Math.floor(Math.random() * 4)]);
    } else {
      const wasFever = inFever;
      combo = 0;
      normalStreak = 0;
      inFever = false;
      feverLeft = 0;
      timeLeft = Math.max(0, timeLeft - 3.0);
      stunUntil = now + 240;
      missFlashUntil = now + 380;
      ArcadeSfx.wrong();
      popups.push({
        text: wasFever ? "-3.0초! FEVER 종료" : "-3.0초!",
        x: W / 2,
        y: 236,
        col: "#dc2626",
        alpha: 1.35
      });
      if (timeLeft <= 0) {
        finishSideSort("시간 종료! 분류 완료");
        return;
      }
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
      finishSideSort("시간 종료! 분류 완료");
      return;
    }

    // 배경 무대 (좌: 파스텔 스카이 / 우: 파스텔 선셋, 피버타임 황금빛!)
    const skyL = ctx.createLinearGradient(0, 0, 0, H);
    skyL.addColorStop(0, inFever ? "#fef08a" : "#dbeafe");
    skyL.addColorStop(1, inFever ? "#fffbeb" : "#eff6ff");
    ctx.fillStyle = skyL;
    ctx.fillRect(0, 0, W / 2, H);

    const skyR = ctx.createLinearGradient(0, 0, 0, H);
    skyR.addColorStop(0, inFever ? "#fed7aa" : "#ffedd5");
    skyR.addColorStop(1, "#fffbeb");
    ctx.fillStyle = skyR;
    ctx.fillRect(W / 2, 0, W / 2, H);

    if (inFever) {
      ctx.save();
      ctx.strokeStyle = now % 320 < 160 ? "#f59e0b" : "#ec4899";
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, W - 8, H - 8);
      ctx.restore();
    } else if (now < missFlashUntil) {
      ctx.fillStyle = "rgba(239, 68, 68, 0.22)";
      ctx.fillRect(0, 0, W, H);
    }

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

    // FEVER 게이지 바 (표지판 아래 중앙)
    const barW = W - 120;
    const barX = 60;
    const barY = 82;
    const fillRatio = inFever ? Math.max(0, feverLeft / 20) : Math.max(0, normalStreak / 20);
    _arcFillRoundRect(ctx, barX, barY, barW, 24, 12, "#1e1b18", "#1e1b18", 2.5);
    if (fillRatio > 0) {
      const innerW = Math.max(12, Math.round((barW - 6) * fillRatio));
      _arcFillRoundRect(ctx, barX + 3, barY + 3, innerW, 18, 9, inFever ? "#fbbf24" : "#38bdf8", null, 0);
    }
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#1e1b18";
    ctx.lineWidth = 3;
    ctx.font = "900 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const barTxt = inFever ? `🔥 FEVER TIME! 남은 ${feverLeft}/20 (+0.5s)` : `FEVER 게이지 ${normalStreak} / 20`;
    ctx.strokeText(barTxt, W / 2, barY + 12);
    ctx.fillText(barTxt, W / 2, barY + 12);

    // 대기열 (위에서 아래로 정렬)
    const stunShake = now < stunUntil ? Math.sin(now * 0.08) * 10 : 0;
    for (let i = Math.min(3, queue.length - 1); i >= 1; i--) {
      const y = 304 - i * 50;
      const r = Math.max(17, 29 - i * 3);
      ctx.save();
      ctx.globalAlpha = Math.max(0.38, 1 - i * 0.16);
      drawCelestialAsset(ctx, queue[i], W / 2, y, r);
      ctx.restore();
    }

    // 현재 분류 대상 강조 링
    ctx.save();
    if (now < stunUntil) {
      _arcFillRoundRect(ctx, W / 2 - 48 + stunShake, 260, 96, 90, 22, "#fecaca", "#dc2626", 4);
    } else if (inFever) {
      _arcFillRoundRect(ctx, W / 2 - 48, 260, 96, 90, 22, "#fef9c3", "#f59e0b", 4.5);
    } else {
      _arcFillRoundRect(ctx, W / 2 - 48, 260, 96, 90, 22, "#ffffff", "#1e1b18", 4);
    }
    drawCelestialAsset(ctx, queue[0], W / 2 + stunShake, 305, 34);
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

    // +0.5초 / -3.0초 / FEVER 팝업
    for (let i = popups.length - 1; i >= 0; i--) {
      const p = popups[i];
      p.y -= 36 * dt;
      p.alpha -= dt * 1.3;
      if (p.alpha <= 0) {
        popups.splice(i, 1);
      } else {
        ctx.save();
        ctx.globalAlpha = Math.min(1, Math.max(0, p.alpha));
        ctx.font = "900 17px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#ffffff";
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = p.col;
        ctx.fillText(p.text, p.x, p.y);
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
  mountEl.addEventListener("pointerdown", onDown);
  window.addEventListener("keydown", onKeyDown);

  function findSpawnObstacleNearby(x, padX) {
    return obstacles.find(o => Math.abs(o.x - x) < padX) || null;
  }

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

    // 토관 / 몬스터 스폰 (토관 높이 하향: 30~50px + 서로 간격 확보)
    spawnObsTimer -= dt;
    if (spawnObsTimer <= 0) {
      const spawnX = W + 32;
      if (findSpawnObstacleNearby(spawnX, 95)) {
        spawnObsTimer = 0.25;
      } else {
        spawnObsTimer = Math.max(0.78, 1.48 - (speed - 240) * 0.0022) + Math.random() * 0.45;
        const isEnemy = Math.random() < 0.42;
        obstacles.push(
          isEnemy
            ? { kind: "goomba", x: spawnX, y: GROUND_Y - 22, w: 36, h: 36, dead: false }
            : { kind: "pipe", x: spawnX, h: 30 + Math.random() * 20, w: 42 }
        );
      }
    }

    // ? 물음표 블록 스폰 (기존 장애물·코인·?블록과 겹치지 않는 X/Y만 허용)
    spawnQBlockTimer -= dt;
    if (spawnQBlockTimer <= 0) {
      const qx = W + 32;
      const qy = GROUND_Y - 138;
      const conflictObs = findSpawnObstacleNearby(qx, 62);
      const conflictQ = qBlocks.some(qb => Math.abs(qb.x - qx) < 92);
      const conflictCoin = coins.some(c => Math.abs(c.x - qx) < 52 && Math.abs(c.y - qy) < 42);
      if (conflictObs || conflictQ || conflictCoin) {
        spawnQBlockTimer = 0.45;
      } else {
        spawnQBlockTimer = 4.2 + Math.random() * 2.5;
        qBlocks.push({ x: qx, y: qy, hit: false });
      }
    }

    // 코인 스폰 (토관/몬스터/?블록/다른 코인과 절대 겹치지 않게 배치)
    spawnCoinTimer -= dt;
    if (spawnCoinTimer <= 0) {
      const cx = W + 30;
      const nearCoin = coins.some(c => Math.abs(c.x - cx) < 38);
      if (nearCoin) {
        spawnCoinTimer = 0.25;
      } else {
        const nearObs = findSpawnObstacleNearby(cx, 66);
        const nearQ = qBlocks.find(qb => Math.abs(qb.x - cx) < 54);
        let cy = null;
        if (nearObs) {
          // 장애물 위는 높은 점프 궤적 아치로만 배치 (물음표 블록과 겹치면 건너뜀)
          const arcY = nearObs.kind === "pipe" ? Math.min(GROUND_Y - 118, GROUND_Y - nearObs.h - 68) : GROUND_Y - 122;
          if (!qBlocks.some(qb => Math.abs(qb.x - cx) < 52 && Math.abs(qb.y - arcY) < 40)) {
            cy = arcY;
          }
        } else if (nearQ) {
          // ?블록 주변엔 낮은 레인으로만 코인 배치
          cy = GROUND_Y - 52;
        } else {
          cy = Math.random() < 0.5 ? GROUND_Y - 128 : GROUND_Y - 54;
        }

        if (cy !== null) {
          spawnCoinTimer = 0.85 + Math.random() * 0.7;
          coins.push({ x: cx, y: cy });
        } else {
          spawnCoinTimer = 0.28;
        }
      }
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
          Math.abs(player.x - o.x) < o.w * 0.34 + 12 &&
          player.y + 18 > pyTop + 7
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
      mountEl.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKeyDown);
    }
  };
}

// ============================================================================
// [게임 6] 정리고수 (color_sort) — 액퍼 『엄마의 삼단정리』 3열 블록 정리 콤보!
// ============================================================================
function createColorSortGame(mountEl, hooks) {
  const W = 420;
  const H = 540;
  const COLORS = [
    { id: "red", bg: "#ef4444", cheek: "#fda4af", face: "cat" },
    { id: "blue", bg: "#3b82f6", cheek: "#93c5fd", face: "bear" },
    { id: "yellow", bg: "#facc15", cheek: "#fef08a", face: "smile" },
    { id: "green", bg: "#22c55e", cheek: "#86efac", face: "frog" },
    { id: "purple", bg: "#a855f7", cheek: "#e9d5ff", face: "wink" }
  ];
  const COLOR_MAP = Object.fromEntries(COLORS.map(c => [c.id, c]));

  const BOARD_TOP = 104;
  const COL_W = 122;
  const COL_GAP = 8;
  const BOARD_X = (W - (COL_W * 3 + COL_GAP * 2)) / 2; // 19
  const BLOCK_H = 33;
  const ROW_PITCH = 38;
  const DANGER_ROWS = 9; // 0..8 안전, 9번째(10개째) 넘으면 위험선 초과 게임오버
  const DANGER_Y = BOARD_TOP + DANGER_ROWS * ROW_PITCH + 2; // 448

  mountEl.innerHTML = `
    <div class="arcade-csort-canvas-shell">
      <canvas id="arcCSortCanvas" class="arcade-game-canvas" width="${W}" height="${H}"></canvas>
      <div class="arcade-csort-actionbar">
        <span class="arcade-touch-hint" style="text-align:left;">👆 줄을 눌러 끝 블록을 옮겨 3개 맞추기!</span>
        <button type="button" id="arcCSortPushBtn" class="btn btn-gold arcade-csort-push-btn">⚡ 다음 줄 내리기</button>
      </div>
    </div>
  `;

  const canvas = document.getElementById("arcCSortCanvas");
  const ctx = canvas.getContext("2d");
  const pushBtn = document.getElementById("arcCSortPushBtn");
  const playerOffscreen = createBakedMiniPlayerCanvas(108);

  let stopped = false;
  let rafId = null;
  let lastMs = performance.now();
  let elapsedSec = 0;
  let score = 0;
  let combo = 0;
  let comboWindow = 0;
  let pushTimer = 0;
  let rowAnimY = 0;

  const cols = [[], [], []];
  let held = null; // { fromCol, color, count }
  let dragPickCol = -1;
  const particles = [];
  const popups = [];

  function activeColorPoolSize() {
    return score >= 1400 ? 5 : 4;
  }

  function randomColorId(excludeId = null) {
    const n = activeColorPoolSize();
    let pick = COLORS[Math.floor(Math.random() * n)].id;
    if (excludeId && pick === excludeId) {
      pick = COLORS[(COLORS.findIndex(c => c.id === pick) + 1 + Math.floor(Math.random() * (n - 1))) % n].id;
    }
    return pick;
  }

  function generateSafeRow(avoidTripleAtTop = true) {
    const row = [];
    for (let c = 0; c < 3; c++) {
      let colId = randomColorId();
      if (avoidTripleAtTop && cols[c].length >= 2 && cols[c][0] === colId && cols[c][1] === colId) {
        colId = randomColorId(colId);
      }
      row.push(colId);
    }
    // 한 줄 3칸이 전부 똑같은 색으로 나오는 건 지양
    if (row[0] === row[1] && row[1] === row[2]) {
      row[2] = randomColorId(row[0]);
    }
    return row;
  }

  // 시작 시 4줄 세팅 (즉시 자동 터짐 없이 균형 있게)
  for (let r = 0; r < 4; r++) {
    const row = generateSafeRow(true);
    for (let c = 0; c < 3; c++) cols[c].unshift(row[c]);
  }

  function syncHud() {
    const maxLen = Math.max(cols[0].length, cols[1].length, cols[2].length);
    const lv = Math.min(9, 1 + Math.floor(elapsedSec / 18));
    hooks.onHud({
      score,
      extra: maxLen >= 8 ? `⚠️ 위험! ${combo > 1 ? `· 🔥${combo} COMBO` : ""}` : combo >= 2 ? `🔥 ${combo} COMBO! · LV.${lv}` : `LV.${lv} · 3개 모으면 팡!`
    });
  }

  function colCenterX(ci) {
    return BOARD_X + ci * (COL_W + COL_GAP) + COL_W / 2;
  }

  function spawnBlockBurst(ci, rowIdx, colorId) {
    const meta = COLOR_MAP[colorId] || COLORS[0];
    const cx = colCenterX(ci);
    const cy = BOARD_TOP + rowIdx * ROW_PITCH + BLOCK_H / 2;
    for (let k = 0; k < 7; k++) {
      const ang = (Math.PI * 2 * k) / 7 + Math.random() * 0.4;
      const spd = 75 + Math.random() * 140;
      particles.push({
        x: cx + (Math.random() - 0.5) * 44,
        y: cy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 45,
        r: 4 + Math.random() * 4,
        col: meta.bg,
        life: 0.55
      });
    }
  }

  function resolveAllMatches() {
    let anyPopped = true;
    while (anyPopped) {
      anyPopped = false;
      for (let c = 0; c < 3; c++) {
        const stack = cols[c];
        if (stack.length < 3) continue;
        const removeFlags = new Array(stack.length).fill(false);
        const matchedRuns = [];
        let i = 0;
        while (i < stack.length) {
          let j = i + 1;
          while (j < stack.length && stack[j] === stack[i]) j++;
          const runLen = j - i;
          if (runLen >= 3) {
            for (let k = i; k < j; k++) removeFlags[k] = true;
            matchedRuns.push({ len: runLen, midRow: (i + j - 1) / 2 });
            anyPopped = true;
          }
          i = j;
        }
        if (matchedRuns.length > 0) {
          for (let r = 0; r < stack.length; r++) {
            if (removeFlags[r]) spawnBlockBurst(c, r, stack[r]);
          }
          cols[c] = stack.filter((_, idx) => !removeFlags[idx]);
          matchedRuns.forEach(run => {
            combo += 1;
            comboWindow = 2.9;
            const pts = Math.round((110 + (run.len - 3) * 45) * (1 + Math.min(8, combo - 1) * 0.45));
            score += pts;
            ArcadeSfx.pop(Math.min(14, combo));
            popups.push({
              x: colCenterX(c),
              y: BOARD_TOP + run.midRow * ROW_PITCH,
              text: combo >= 2 ? `${combo} COMBO! +${pts}` : `+${pts}`,
              col: combo >= 3 ? "#fde047" : "#ffffff",
              alpha: 1.35
            });
          });
        }
      }
    }
  }

  function checkOverflowEnd() {
    if (stopped) return true;
    const overflow = cols.some(c => c.length > DANGER_ROWS);
    if (overflow) {
      held = null;
      stopped = true;
      ArcadeSfx.hit();
      syncHud();
      hooks.onFinish(score, "블록이 바닥 위험선을 넘었습니다!");
      return true;
    }
    return false;
  }

  function pushNewRow(fromUser = false) {
    if (stopped) return;
    ArcadeSfx.unlock();
    pushTimer = 0;
    rowAnimY = -ROW_PITCH;
    const row = generateSafeRow(false);
    for (let c = 0; c < 3; c++) cols[c].unshift(row[c]);
    if (fromUser) {
      score += 20;
      ArcadeSfx.tone(660, 0.06, "triangle", 0.09);
      popups.push({ x: W / 2, y: 112, text: "⚡ +20", col: "#38bdf8", alpha: 0.9 });
    } else {
      ArcadeSfx.tone(240, 0.07, "triangle", 0.08);
    }
    resolveAllMatches();
    checkOverflowEnd();
    syncHud();
  }

  function pickUpFromCol(ci) {
    const stack = cols[ci];
    if (!stack || stack.length === 0) return false;
    const color = stack[stack.length - 1];
    let count = 1;
    while (stack.length - 1 - count >= 0 && stack[stack.length - 1 - count] === color) {
      count++;
    }
    stack.splice(stack.length - count, count);
    held = { fromCol: ci, color, count };
    ArcadeSfx.tone(540, 0.05, "triangle", 0.11);
    return true;
  }

  function dropToCol(ci) {
    if (!held) return;
    const { fromCol, color, count } = held;
    held = null;
    for (let k = 0; k < count; k++) cols[ci].push(color);
    ArcadeSfx.tone(440, 0.05, "triangle", 0.1);
    if (ci !== fromCol) {
      resolveAllMatches();
    }
    checkOverflowEnd();
    syncHud();
  }

  function mapCanvasCoords(ev) {
    return _arcMapCanvasPoint(canvas, W, H, ev);
  }

  function colFromX(x) {
    if (x < BOARD_X + COL_W + COL_GAP / 2) return 0;
    if (x < BOARD_X + (COL_W + COL_GAP) * 2 - COL_GAP / 2) return 1;
    return 2;
  }

  const onCanvasDown = ev => {
    if (stopped) return;
    if (ev.pointerType !== "mouse" && typeof ev.preventDefault === "function") ev.preventDefault();
    ArcadeSfx.unlock();
    const pt = mapCanvasCoords(ev);
    if (pt.y < BOARD_TOP && pt.x < 176) {
      pushNewRow(true);
      return;
    }
    const ci = colFromX(pt.x);
    if (!held) {
      if (pickUpFromCol(ci)) dragPickCol = ci;
    } else {
      dragPickCol = -1;
      dropToCol(ci);
    }
  };

  const onWindowUp = ev => {
    if (stopped || dragPickCol === -1 || !held) {
      dragPickCol = -1;
      return;
    }
    const pt = mapCanvasCoords(ev);
    const upCol = colFromX(pt.x);
    const pickedFrom = dragPickCol;
    dragPickCol = -1;
    if (upCol !== pickedFrom) {
      dropToCol(upCol);
    }
  };

  const onPushClick = () => pushNewRow(true);

  const onKeyDown = ev => {
    if (stopped) return;
    if (ev.key === "1" || ev.key === "a" || ev.key === "A" || ev.key === "ArrowLeft") {
      if (!held) pickUpFromCol(0); else dropToCol(0);
    } else if (ev.key === "2" || ev.key === "s" || ev.key === "S" || ev.key === "ArrowDown") {
      if (!held) pickUpFromCol(1); else dropToCol(1);
    } else if (ev.key === "3" || ev.key === "d" || ev.key === "D" || ev.key === "ArrowRight") {
      if (!held) pickUpFromCol(2); else dropToCol(2);
    } else if (ev.key === " ") {
      ev.preventDefault();
      pushNewRow(true);
    }
  };

  canvas.addEventListener("pointerdown", onCanvasDown);
  window.addEventListener("pointerup", onWindowUp);
  if (pushBtn) pushBtn.addEventListener("click", onPushClick);
  window.addEventListener("keydown", onKeyDown);

  function drawFaceBlock(x, y, w, h, colorId, isHeldBlock = false, dangerGlow = false) {
    const meta = COLOR_MAP[colorId] || COLORS[0];
    ctx.save();
    _arcFillRoundRect(
      ctx,
      x,
      y,
      w,
      h,
      9,
      meta.bg,
      dangerGlow ? "#ef4444" : isHeldBlock ? "#fde047" : "#1e1b18",
      isHeldBlock ? 4 : 3
    );
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(x + 8, y + 3, w - 16, 4);

    const cx = x + w / 2;
    const cy = y + h / 2 + 1;
    // 볼터치
    ctx.fillStyle = meta.cheek;
    ctx.beginPath();
    ctx.ellipse(cx - 24, cy + 3, 5.5, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 24, cy + 3, 5.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // 눈
    ctx.fillStyle = "#1e1b18";
    ctx.strokeStyle = "#1e1b18";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    if (meta.face === "wink") {
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy - 4); ctx.lineTo(cx - 12, cy - 1); ctx.lineTo(cx - 18, cy + 2);
      ctx.moveTo(cx + 18, cy - 4); ctx.lineTo(cx + 12, cy - 1); ctx.lineTo(cx + 18, cy + 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(cx - 14, cy - 2, 3.2, 0, Math.PI * 2);
      ctx.arc(cx + 14, cy - 2, 3.2, 0, Math.PI * 2);
      ctx.fill();
      if (meta.face === "bear") {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(cx - 15, cy - 3, 1.1, 0, Math.PI * 2); ctx.arc(cx + 13, cy - 3, 1.1, 0, Math.PI * 2); ctx.fill();
      }
    }

    // 입 표정
    ctx.strokeStyle = "#1e1b18";
    ctx.lineWidth = 2.2;
    if (meta.face === "cat") {
      ctx.beginPath();
      ctx.arc(cx - 3.5, cy + 2, 3.5, 0, Math.PI);
      ctx.arc(cx + 3.5, cy + 2, 3.5, 0, Math.PI);
      ctx.stroke();
    } else if (meta.face === "bear") {
      _arcFillRoundRect(ctx, cx - 10, cy - 1, 20, 8, 4, "#ffffff", "#1e1b18", 2);
      ctx.beginPath(); ctx.moveTo(cx - 4, cy - 1); ctx.lineTo(cx - 4, cy + 7); ctx.moveTo(cx + 4, cy - 1); ctx.lineTo(cx + 4, cy + 7); ctx.stroke();
    } else if (meta.face === "frog") {
      _arcFillRoundRect(ctx, cx - 5, cy - 1, 10, 7, 4, "#fb7185", "#1e1b18", 2);
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy + 1, 6, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
    ctx.restore();
  }

  function frame(now) {
    if (stopped) return;
    const dt = Math.min(0.05, Math.max(0.005, (now - lastMs) / 1000));
    lastMs = now;
    elapsedSec += dt;

    if (comboWindow > 0) {
      comboWindow -= dt;
      if (comboWindow <= 0) combo = 0;
    }
    if (rowAnimY < 0) {
      rowAnimY = Math.min(0, rowAnimY + 280 * dt);
    }

    const pushInterval = Math.max(3.6, 7.4 - elapsedSec * 0.028);
    pushTimer += dt;
    if (pushTimer >= pushInterval) {
      pushNewRow(false);
      if (stopped) return;
    }

    // 1) 상단 하늘 + 아바타 + 폭탄 게이지 + 점수 말풍선
    const skyG = ctx.createLinearGradient(0, 0, 0, 96);
    skyG.addColorStop(0, "#38bdf8");
    skyG.addColorStop(1, "#e0f2fe");
    ctx.fillStyle = skyG;
    ctx.fillRect(0, 0, W, 96);

    // 풀밭 & 울타리 경계
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(0, 82, W, 16);
    ctx.strokeStyle = "#1e1b18";
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(0, 82); ctx.lineTo(W, 82); ctx.moveTo(0, 98); ctx.lineTo(W, 98); ctx.stroke();

    // 중앙 내 캐릭터 + 작은 빗자루
    const bob = Math.sin(elapsedSec * 5.2) * 2.5;
    ctx.save();
    ctx.translate(W / 2, 54 + bob);
    ctx.strokeStyle = "#92400e";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-20, 12); ctx.lineTo(-42, -6); ctx.stroke();
    ctx.fillStyle = "#4ade80";
    ctx.strokeStyle = "#1e1b18";
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-42, -6); ctx.lineTo(-54, -14); ctx.lineTo(-48, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.drawImage(playerOffscreen, -28, -32, 56, 56);
    ctx.restore();

    // 좌상단 폭탄 시간 게이지 (클릭 가능)
    const fuseRatio = Math.max(0, Math.min(1, pushTimer / pushInterval));
    _arcFillRoundRect(ctx, 12, 24, 142, 34, 12, "#1e1b18", "#1e1b18", 2.5);
    if (fuseRatio > 0) {
      const fCol = fuseRatio > 0.78 ? "#ef4444" : fuseRatio > 0.45 ? "#f59e0b" : "#22c55e";
      _arcFillRoundRect(ctx, 16, 28, Math.max(10, Math.round(134 * fuseRatio)), 26, 9, fCol, null, 0);
    }
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#1e1b18";
    ctx.lineWidth = 3;
    ctx.font = "900 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText("💣 탭: 즉시 줄 등장!", 83, 41);
    ctx.fillText("💣 탭: 즉시 줄 등장!", 83, 41);

    // 우상단 콤보/점수 말풍선
    _arcFillRoundRect(ctx, W - 154, 18, 142, 46, 16, "#271206", "#1e1b18", 3);
    ctx.fillStyle = "#fde047";
    ctx.font = "900 11px sans-serif";
    ctx.fillText(combo >= 2 ? `🔥 ${combo} COMBO!` : "✨ 3단 정리!", W - 83, 32);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 16px sans-serif";
    ctx.fillText(`${score.toLocaleString()}점`, W - 83, 50);

    // 2) 어두운 흙 배경 보드 + 3개 세로 레인
    const soilG = ctx.createLinearGradient(0, 98, 0, H);
    soilG.addColorStop(0, "#451a03");
    soilG.addColorStop(1, "#271206");
    ctx.fillStyle = soilG;
    ctx.fillRect(0, 98, W, H - 98);

    // 3개 레인 가이드 & 들려진 블록 대상 강조
    for (let c = 0; c < 3; c++) {
      const rx = BOARD_X + c * (COL_W + COL_GAP);
      const isDangerCol = cols[c].length >= DANGER_ROWS - 1;
      const isSourceCol = held && held.fromCol === c;
      ctx.fillStyle = isDangerCol && Math.floor(elapsedSec * 6) % 2 === 0
        ? "rgba(239, 68, 68, 0.2)"
        : held && !isSourceCol
        ? "rgba(250, 204, 21, 0.14)"
        : "rgba(255, 255, 255, 0.05)";
      _arcFillRoundRect(ctx, rx, BOARD_TOP - 2, COL_W, DANGER_Y - BOARD_TOP + 2, 10, ctx.fillStyle, held && !isSourceCol ? "rgba(250, 204, 21, 0.55)" : "rgba(255,255,255,0.12)", 2);

      const stack = cols[c];
      for (let r = 0; r < stack.length; r++) {
        const bx = rx + 4;
        const by = BOARD_TOP + r * ROW_PITCH + rowAnimY;
        const warnGlow = r >= DANGER_ROWS - 1;
        drawFaceBlock(bx, by, COL_W - 8, BLOCK_H, stack[r], false, warnGlow);
      }
    }

    // 위험 경계선 (y = DANGER_Y)
    ctx.save();
    ctx.strokeStyle = "#ef4444";
    ctx.setLineDash([10, 6]);
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(12, DANGER_Y); ctx.lineTo(W - 12, DANGER_Y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(239, 68, 68, 0.85)";
    ctx.font = "900 10px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("⚠️ 위험선 (넘으면 종료)", W - 18, DANGER_Y - 7);
    ctx.restore();

    // 현재 집어 들고 있는 블록 (하단 프리뷰 존: y = 456..534)
    if (held) {
      const hx = BOARD_X + held.fromCol * (COL_W + COL_GAP) + 4;
      const baseHy = DANGER_Y + 12 + Math.sin(elapsedSec * 9) * 3;
      const previewCount = Math.min(2, held.count);
      for (let k = 0; k < previewCount; k++) {
        drawFaceBlock(hx, baseHy + k * 28, COL_W - 8, 26, held.color, true, false);
      }
      ctx.fillStyle = "#fde047";
      ctx.font = "900 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`👆 옮길 줄을 선택! (${held.count}개)`, W / 2, H - 14);
    } else {
      ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
      ctx.font = "800 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("원하는 줄을 눌러 맨 아래 블록을 집어 옮기세요!", W / 2, H - 18);
    }

    // 폭발 파티클
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 320 * dt;
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
      } else {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
        ctx.fillStyle = p.col;
        ctx.strokeStyle = "#1e1b18";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    }

    // 콤보 점수 팝업
    for (let i = popups.length - 1; i >= 0; i--) {
      const p = popups[i];
      p.y -= 34 * dt;
      p.alpha -= dt * 1.25;
      if (p.alpha <= 0) {
        popups.splice(i, 1);
      } else {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
        ctx.font = "900 16px sans-serif";
        ctx.textAlign = "center";
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#1e1b18";
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = p.col;
        ctx.fillText(p.text, p.x, p.y);
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
      canvas.removeEventListener("pointerdown", onCanvasDown);
      window.removeEventListener("pointerup", onWindowUp);
      if (pushBtn) pushBtn.removeEventListener("click", onPushClick);
      window.removeEventListener("keydown", onKeyDown);
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
    <div class="arcade-canvas-wrap has-slide-pad">
      <canvas id="arcBrickCanvas" class="arcade-game-canvas" width="${W}" height="${H}"></canvas>
      <div id="arcBrickSlidePad" class="arcade-slide-pad">
        <span>◀</span>
        <span>여기를 좌우로 문질러도 이동해요!</span>
        <span>▶</span>
      </div>
    </div>
  `;
  const canvas = document.getElementById("arcBrickCanvas");
  const slidePadEl = document.getElementById("arcBrickSlidePad");
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

  const unbindSlide = _arcBindSlideControl({
    mountEl,
    canvas,
    slidePadEl,
    logicalW: W,
    marginX: 38,
    allowMouseHover: true,
    onX: nx => {
      targetPadX = Math.max(paddle.w / 2 + 6, Math.min(W - paddle.w / 2 - 6, nx));
    },
    onKeyState: (dir, isDown) => { keys[dir] = isDown; }
  });

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
      unbindSlide();
    }
  };
}

// ============================================================================
// [게임 8] 음표팡팡 (note_pang) — 캔디크러시 스타일 7×7 스왑 3매치 퍼즐
// ============================================================================
function createNotePangGame(mountEl, hooks) {
  const W = 420;
  const H = 456;
  const GRID = 7;
  const CELL = 52;
  const PAD_X = (W - GRID * CELL) / 2; // 28
  const BOARD_Y = 58;

  const TILES = [
    { color: 0, bg: "#ef4444", sym: "♪", txtCol: "#ffffff" },
    { color: 1, bg: "#f97316", sym: "★", txtCol: "#ffffff" },
    { color: 2, bg: "#facc15", sym: "♫", txtCol: "#1e1b18" },
    { color: 3, bg: "#22c55e", sym: "♣", txtCol: "#ffffff" },
    { color: 4, bg: "#38bdf8", sym: "♬", txtCol: "#1e1b18" },
    { color: 5, bg: "#a855f7", sym: "♥", txtCol: "#ffffff" }
  ];

  mountEl.innerHTML = `
    <div class="arcade-canvas-wrap">
      <canvas id="arcPangCanvas" class="arcade-game-canvas" width="${W}" height="${H}"></canvas>
      <div class="arcade-touch-hint">👆 인접한 두 음표를 스와이프하거나 두 번 눌러 3개 이상 맞추세요!</div>
    </div>
  `;

  const canvas = document.getElementById("arcPangCanvas");
  const ctx = canvas.getContext("2d");

  let stopped = false;
  let rafId = null;
  let lastMs = performance.now();
  let score = 0;
  let timeLeft = 60.0;
  let wave = 0;
  let phase = "idle"; // 'idle' | 'swap' | 'bounce' | 'fall'
  let phaseTimer = 0;
  let selected = null;
  let dragAnchor = null;
  let activeSwap = null; // { r1, c1, r2, c2, progress }

  const grid = Array.from({ length: GRID }, () => Array(GRID).fill(null));
  const particles = [];
  const popups = [];

  function makeCell(color, special = null, yOff = 0) {
    return { color, special, yOff };
  }

  function hasMatchAt(r, c, color) {
    if (c >= 2 && grid[r][c - 1]?.color === color && grid[r][c - 2]?.color === color) return true;
    if (r >= 2 && grid[r - 1][c]?.color === color && grid[r - 2][c]?.color === color) return true;
    return false;
  }

  function findMatchClusters() {
    const hMatched = Array.from({ length: GRID }, () => Array(GRID).fill(false));
    const vMatched = Array.from({ length: GRID }, () => Array(GRID).fill(false));

    for (let r = 0; r < GRID; r++) {
      let c = 0;
      while (c < GRID) {
        const col = grid[r][c]?.color;
        if (col === undefined || grid[r][c]?.special === "rainbow") { c++; continue; }
        let k = c + 1;
        while (k < GRID && grid[r][k] && grid[r][k].special !== "rainbow" && grid[r][k].color === col) k++;
        if (k - c >= 3) {
          for (let x = c; x < k; x++) hMatched[r][x] = true;
        }
        c = k;
      }
    }

    for (let c = 0; c < GRID; c++) {
      let r = 0;
      while (r < GRID) {
        const col = grid[r][c]?.color;
        if (col === undefined || grid[r][c]?.special === "rainbow") { r++; continue; }
        let k = r + 1;
        while (k < GRID && grid[k][c] && grid[k][c].special !== "rainbow" && grid[k][c].color === col) k++;
        if (k - r >= 3) {
          for (let y = r; y < k; y++) vMatched[y][c] = true;
        }
        r = k;
      }
    }

    const visited = Array.from({ length: GRID }, () => Array(GRID).fill(false));
    const clusters = [];
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        if ((!hMatched[r][c] && !vMatched[r][c]) || visited[r][c]) continue;
        const targetColor = grid[r][c].color;
        const cells = [];
        let hasH = false;
        let hasV = false;
        const q = [{ r, c }];
        visited[r][c] = true;
        while (q.length > 0) {
          const cur = q.shift();
          cells.push(cur);
          if (hMatched[cur.r][cur.c]) hasH = true;
          if (vMatched[cur.r][cur.c]) hasV = true;
          const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
          for (const [dr, dc] of dirs) {
            const nr = cur.r + dr;
            const nc = cur.c + dc;
            if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID || visited[nr][nc]) continue;
            if ((hMatched[nr][nc] || vMatched[nr][nc]) && grid[nr][nc]?.color === targetColor) {
              visited[nr][nc] = true;
              q.push({ r: nr, c: nc });
            }
          }
        }
        clusters.push({ cells, color: targetColor, isCross: hasH && hasV, hasH, hasV });
      }
    }
    return clusters;
  }

  function swapCells(r1, c1, r2, c2) {
    const tmp = grid[r1][c1];
    grid[r1][c1] = grid[r2][c2];
    grid[r2][c2] = tmp;
  }

  function hasAnyValidMove() {
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        if (grid[r][c]?.special === "rainbow") return true;
        const neighbors = [[r, c + 1], [r + 1, c]];
        for (const [nr, nc] of neighbors) {
          if (nr >= GRID || nc >= GRID) continue;
          if (grid[nr][nc]?.special === "rainbow") return true;
          if (grid[r][c]?.color === grid[nr][nc]?.color) continue;
          swapCells(r, c, nr, nc);
          const ok = findMatchClusters().length > 0;
          swapCells(r, c, nr, nc);
          if (ok) return true;
        }
      }
    }
    return false;
  }

  function fillFreshBoard() {
    for (let attempt = 0; attempt < 25; attempt++) {
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          let col = Math.floor(Math.random() * TILES.length);
          let tries = 0;
          while (hasMatchAt(r, c, col) && tries < 12) {
            col = (col + 1) % TILES.length;
            tries++;
          }
          grid[r][c] = makeCell(col, null, 0);
        }
      }
      if (findMatchClusters().length === 0 && hasAnyValidMove()) return;
    }
    // 보장 폴백: 좌상단 근처에 확정 1수 배치
    const fc = grid[0][0].color;
    grid[0][1] = makeCell(fc, null, 0);
    grid[1][2] = makeCell(fc, null, 0);
  }

  function reshuffleExistingBoard() {
    const pool = [];
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        if (grid[r][c]) pool.push(grid[r][c]);
      }
    }
    for (let attempt = 0; attempt < 25; attempt++) {
      pool.sort(() => Math.random() - 0.5);
      let idx = 0;
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          grid[r][c] = pool[idx++];
          grid[r][c].yOff = -16;
        }
      }
      if (findMatchClusters().length === 0 && hasAnyValidMove()) {
        popups.push({ x: W / 2, y: BOARD_Y + 160, text: "🔀 자동 섞기!", col: "#0f766e", alpha: 1.3 });
        return;
      }
    }
    fillFreshBoard();
    popups.push({ x: W / 2, y: BOARD_Y + 160, text: "🔀 새 판 생성!", col: "#0f766e", alpha: 1.3 });
  }

  fillFreshBoard();

  function syncHud() {
    hooks.onHud({
      score,
      timeSec: Math.max(0, timeLeft),
      extra: wave >= 2 ? `🔥 ${wave}연쇄!` : "3개 이상 매치!"
    });
  }

  function spawnPangParticles(r, c, colorIdx) {
    const meta = TILES[colorIdx] || TILES[0];
    const cx = PAD_X + c * CELL + CELL / 2;
    const cy = BOARD_Y + r * CELL + CELL / 2;
    for (let k = 0; k < 5; k++) {
      const a = (Math.PI * 2 * k) / 5 + Math.random() * 0.6;
      const s = 60 + Math.random() * 120;
      particles.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 4, col: meta.bg, life: 0.42 });
    }
  }

  function applyClearAndGravity(baseClearCoords, newSpecials, basePts) {
    const key = (r, c) => `${r},${c}`;
    const visited = new Set();
    const queue = [];

    baseClearCoords.forEach(({ r, c }) => {
      const k = key(r, c);
      if (!visited.has(k)) {
        visited.add(k);
        queue.push({ r, c });
      }
    });

    while (queue.length > 0) {
      const { r, c } = queue.shift();
      const cell = grid[r][c];
      if (!cell) continue;
      if (cell.special === "lineH") {
        for (let cc = 0; cc < GRID; cc++) {
          const nk = key(r, cc);
          if (!visited.has(nk)) { visited.add(nk); queue.push({ r, c: cc }); }
        }
      } else if (cell.special === "lineV") {
        for (let rr = 0; rr < GRID; rr++) {
          const nk = key(rr, c);
          if (!visited.has(nk)) { visited.add(nk); queue.push({ r: rr, c }); }
        }
      } else if (cell.special === "rainbow") {
        // 보드에서 가장 많은 색상 제거
        const counts = new Array(TILES.length).fill(0);
        for (let rr = 0; rr < GRID; rr++) {
          for (let cc = 0; cc < GRID; cc++) {
            const ct = grid[rr][cc];
            if (ct && ct.special !== "rainbow") counts[ct.color]++;
          }
        }
        const bestCol = counts.indexOf(Math.max(...counts));
        for (let rr = 0; rr < GRID; rr++) {
          for (let cc = 0; cc < GRID; cc++) {
            if (grid[rr][cc]?.color === bestCol) {
              const nk = key(rr, cc);
              if (!visited.has(nk)) { visited.add(nk); queue.push({ r: rr, c: cc }); }
            }
          }
        }
      }
    }

    const extraBlasted = Math.max(0, visited.size - baseClearCoords.length);
    const mult = 1 + Math.min(6, Math.max(0, wave - 1)) * 0.45;
    const wavePts = Math.round((basePts + extraBlasted * 35) * mult) + (wave > 1 ? wave * 45 : 0);
    score += wavePts;
    ArcadeSfx.pop(Math.min(14, wave * 2));

    let sumX = 0;
    let sumY = 0;
    let n = 0;
    visited.forEach(k => {
      const [rr, cc] = k.split(",").map(Number);
      const cell = grid[rr][cc];
      if (cell) spawnPangParticles(rr, cc, cell.color);
      grid[rr][cc] = null;
      sumX += PAD_X + cc * CELL + CELL / 2;
      sumY += BOARD_Y + rr * CELL + CELL / 2;
      n++;
    });

    newSpecials.forEach(sp => {
      grid[sp.r][sp.c] = makeCell(sp.color, sp.special, 0);
    });

    if (n > 0) {
      popups.push({
        x: Math.max(85, Math.min(W - 85, sumX / n)),
        y: Math.max(BOARD_Y + 30, sumY / n),
        text: wave > 1 ? `🔥 ${wave}연쇄! +${wavePts}` : `+${wavePts}`,
        col: wave >= 3 ? "#f59e0b" : "#1e1b18",
        alpha: 1.25
      });
    }

    // 위에서 아래로 중력 낙하 + 상단 신규 채우기
    for (let c = 0; c < GRID; c++) {
      let writeR = GRID - 1;
      for (let r = GRID - 1; r >= 0; r--) {
        if (grid[r][c]) {
          const cell = grid[r][c];
          if (writeR !== r) {
            cell.yOff = (r - writeR) * CELL;
            grid[writeR][c] = cell;
            grid[r][c] = null;
          }
          writeR--;
        }
      }
      const emptyCount = writeR + 1;
      for (let r = writeR; r >= 0; r--) {
        const colIdx = Math.floor(Math.random() * TILES.length);
        grid[r][c] = makeCell(colIdx, null, -emptyCount * CELL);
      }
    }

    phase = "fall";
    phaseTimer = 0;
    syncHud();
  }

  function resolveCurrentBoardMatches(swappedFocus = []) {
    const clusters = findMatchClusters();
    if (clusters.length === 0) {
      wave = 0;
      phase = "idle";
      if (!hasAnyValidMove()) reshuffleExistingBoard();
      syncHud();
      return false;
    }

    wave += 1;
    const clearList = [];
    const newSpecials = [];
    let pts = 0;

    clusters.forEach(cl => {
      const len = cl.cells.length;
      if (len >= 5 || cl.isCross) pts += 300;
      else if (len === 4) pts += 180;
      else pts += 90;

      cl.cells.forEach(pt => clearList.push(pt));

      if (len >= 5 || cl.isCross) {
        const anchor = cl.cells.find(p => swappedFocus.some(s => s.r === p.r && s.c === p.c)) || cl.cells[Math.floor(len / 2)];
        newSpecials.push({ r: anchor.r, c: anchor.c, color: cl.color, special: "rainbow" });
      } else if (len === 4) {
        const anchor = cl.cells.find(p => swappedFocus.some(s => s.r === p.r && s.c === p.c)) || cl.cells[1];
        newSpecials.push({ r: anchor.r, c: anchor.c, color: cl.color, special: cl.hasH ? "lineV" : "lineH" });
      }
    });

    applyClearAndGravity(clearList, newSpecials, pts);
    return true;
  }

  function trySwap(a, b) {
    if (phase !== "idle" || stopped) return;
    if (Math.abs(a.r - b.r) + Math.abs(a.c - b.c) !== 1) return;
    selected = null;
    dragAnchor = null;
    activeSwap = { r1: a.r, c1: a.c, r2: b.r, c2: b.c, progress: 0 };
    swapCells(a.r, a.c, b.r, b.c);

    const cell1 = grid[a.r][a.c];
    const cell2 = grid[b.r][b.c];
    const isRainbowSwap = cell1?.special === "rainbow" || cell2?.special === "rainbow";

    if (!isRainbowSwap && findMatchClusters().length === 0) {
      // 불발 시 살짝 바운스 후 원복
      phase = "bounce";
      phaseTimer = 0.14;
      ArcadeSfx.wrong();
    } else {
      phase = "swap";
      phaseTimer = 0.11;
    }
  }

  function finishRainbowSwap(a, b) {
    wave = 1;
    const c1 = grid[a.r][a.c];
    const c2 = grid[b.r][b.c];
    const clearList = [];
    if (c1?.special === "rainbow" && c2?.special === "rainbow") {
      for (let rr = 0; rr < GRID; rr++) {
        for (let cc = 0; cc < GRID; cc++) clearList.push({ r: rr, c: cc });
      }
      applyClearAndGravity(clearList, [], 550);
    } else {
      const rbPos = c1?.special === "rainbow" ? a : b;
      const otherCell = c1?.special === "rainbow" ? c2 : c1;
      const targetColor = otherCell ? otherCell.color : 0;
      if (grid[rbPos.r][rbPos.c]) grid[rbPos.r][rbPos.c].special = null;
      clearList.push(rbPos);
      for (let rr = 0; rr < GRID; rr++) {
        for (let cc = 0; cc < GRID; cc++) {
          if (grid[rr][cc]?.color === targetColor) clearList.push({ r: rr, c: cc });
        }
      }
      applyClearAndGravity(clearList, [], 340);
    }
  }

  function mapBoardPointer(ev) {
    const pt = _arcMapCanvasPoint(canvas, W, H, ev);
    return {
      px: pt.x,
      py: pt.y,
      clientX: pt.clientX,
      clientY: pt.clientY,
      c: Math.floor((pt.x - PAD_X) / CELL),
      r: Math.floor((pt.y - BOARD_Y) / CELL)
    };
  }

  const onPointerDown = ev => {
    if (stopped || phase !== "idle") return;
    if (ev.pointerType !== "mouse" && typeof ev.preventDefault === "function") ev.preventDefault();
    ArcadeSfx.unlock();
    const pt = mapBoardPointer(ev);
    if (pt.r < 0 || pt.r >= GRID || pt.c < 0 || pt.c >= GRID) {
      selected = null;
      return;
    }
    dragAnchor = { r: pt.r, c: pt.c, x: pt.clientX, y: pt.clientY, swapped: false };
  };

  const onPointerMove = ev => {
    if (stopped || phase !== "idle" || !dragAnchor || dragAnchor.swapped) return;
    const clientX = ev.touches && ev.touches[0] ? ev.touches[0].clientX : ev.clientX;
    const clientY = ev.touches && ev.touches[0] ? ev.touches[0].clientY : ev.clientY;
    const dx = clientX - dragAnchor.x;
    const dy = clientY - dragAnchor.y;
    if (Math.hypot(dx, dy) < 16) return;
    let nr = dragAnchor.r;
    let nc = dragAnchor.c;
    if (Math.abs(dx) > Math.abs(dy)) nc += dx > 0 ? 1 : -1;
    else nr += dy > 0 ? 1 : -1;
    if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID) {
      const origin = { r: dragAnchor.r, c: dragAnchor.c };
      dragAnchor.swapped = true;
      trySwap(origin, { r: nr, c: nc });
    }
  };

  const onPointerUp = () => {
    if (!dragAnchor || stopped) { dragAnchor = null; return; }
    if (!dragAnchor.swapped && phase === "idle") {
      const tapped = { r: dragAnchor.r, c: dragAnchor.c };
      if (!selected) {
        selected = tapped;
        ArcadeSfx.tone(520, 0.05, "sine", 0.08);
      } else if (selected.r === tapped.r && selected.c === tapped.c) {
        selected = null;
      } else if (Math.abs(selected.r - tapped.r) + Math.abs(selected.c - tapped.c) === 1) {
        trySwap(selected, tapped);
      } else {
        selected = tapped;
        ArcadeSfx.tone(520, 0.05, "sine", 0.08);
      }
    }
    dragAnchor = null;
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);

  function drawTile(x, y, size, cell, isSel) {
    const isRainbow = cell.special === "rainbow";
    const meta = TILES[cell.color] || TILES[0];
    const pad = 3;
    const rx = x + pad;
    const ry = y + pad;
    const rw = size - pad * 2;
    const bg = isRainbow ? "#1e1b4b" : meta.bg;

    _arcFillRoundRect(ctx, rx, ry, rw, rw, 12, bg, isSel ? "#fde047" : "#1e1b18", isSel ? 4 : 3);
    if (isRainbow) {
      const cols = ["#ef4444", "#facc15", "#22c55e", "#38bdf8", "#a855f7"];
      cols.forEach((rc, i) => {
        ctx.fillStyle = rc;
        ctx.beginPath();
        ctx.arc(rx + rw / 2 + Math.cos((i * Math.PI * 2) / 5) * 10, ry + rw / 2 + Math.sin((i * Math.PI * 2) / 5) * 10, 5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 18px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("👑", rx + rw / 2, ry + rw / 2 + 1);
      return;
    }

    ctx.fillStyle = "rgba(255,255,255,0.3)";
    _arcFillRoundRect(ctx, rx + 5, ry + 4, rw - 10, 6, 3, "rgba(255,255,255,0.3)", null, 0);

    ctx.fillStyle = meta.txtCol;
    ctx.font = "900 22px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(meta.sym, rx + rw / 2, ry + rw / 2 + 2);

    if (cell.special === "lineH" || cell.special === "lineV") {
      ctx.strokeStyle = "#fde047";
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (cell.special === "lineH") {
        ctx.moveTo(rx + 4, ry + rw / 2); ctx.lineTo(rx + rw - 4, ry + rw / 2);
      } else {
        ctx.moveTo(rx + rw / 2, ry + 4); ctx.lineTo(rx + rw / 2, ry + rw - 4);
      }
      ctx.stroke();
    }
  }

  function frame(now) {
    if (stopped) return;
    const dt = Math.min(0.05, Math.max(0.005, (now - lastMs) / 1000));
    lastMs = now;

    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      stopped = true;
      syncHud();
      hooks.onFinish(score, "시간 종료! 음표팡팡 완료");
      return;
    }

    if (phase === "swap") {
      phaseTimer -= dt;
      if (phaseTimer <= 0 && activeSwap) {
        const s = activeSwap;
        activeSwap = null;
        const c1 = grid[s.r1][s.c1];
        const c2 = grid[s.r2][s.c2];
        if (c1?.special === "rainbow" || c2?.special === "rainbow") {
          finishRainbowSwap({ r: s.r1, c: s.c1 }, { r: s.r2, c: s.c2 });
        } else {
          resolveCurrentBoardMatches([{ r: s.r1, c: s.c1 }, { r: s.r2, c: s.c2 }]);
        }
      }
    } else if (phase === "bounce") {
      phaseTimer -= dt;
      if (phaseTimer <= 0 && activeSwap) {
        swapCells(activeSwap.r1, activeSwap.c1, activeSwap.r2, activeSwap.c2);
        activeSwap = null;
        phase = "idle";
      }
    } else if (phase === "fall") {
      let anyFalling = false;
      const dropSpd = CELL * 14 * dt;
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          const cell = grid[r][c];
          if (cell && cell.yOff < 0) {
            cell.yOff = Math.min(0, cell.yOff + dropSpd);
            if (cell.yOff < 0) anyFalling = true;
          }
        }
      }
      if (!anyFalling) {
        resolveCurrentBoardMatches([]);
      }
    }

    // 배경 & 상단 배너
    const bgG = ctx.createLinearGradient(0, 0, 0, H);
    bgG.addColorStop(0, "#ccfbf1");
    bgG.addColorStop(1, "#fef9c3");
    ctx.fillStyle = bgG;
    ctx.fillRect(0, 0, W, H);

    _arcFillRoundRect(ctx, 18, 10, W - 36, 36, 12, "#ffffff", "#1e1b18", 3);
    ctx.fillStyle = "#0f766e";
    ctx.font = "900 13px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(wave >= 2 ? `🔥 ${wave}연쇄 콤보 폭발중!!` : "🎵 4개=번개줄 · 5개/십자=무지개왕관!", W / 2, 29);

    // 7×7 보드 프레임
    _arcFillRoundRect(ctx, PAD_X - 8, BOARD_Y - 8, GRID * CELL + 16, GRID * CELL + 16, 16, "#134e4a", "#1e1b18", 3.5);

    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const bgSlot = (r + c) % 2 === 0 ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)";
        ctx.fillStyle = bgSlot;
        ctx.fillRect(PAD_X + c * CELL, BOARD_Y + r * CELL, CELL, CELL);
      }
    }

    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const cell = grid[r][c];
        if (!cell) continue;
        const isSel = selected && selected.r === r && selected.c === c;
        drawTile(PAD_X + c * CELL, BOARD_Y + r * CELL + (cell.yOff || 0), CELL, cell, isSel);
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
      } else {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2.4));
        ctx.fillStyle = p.col;
        ctx.strokeStyle = "#1e1b18";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    }

    for (let i = popups.length - 1; i >= 0; i--) {
      const p = popups[i];
      p.y -= 32 * dt;
      p.alpha -= dt * 1.3;
      if (p.alpha <= 0) {
        popups.splice(i, 1);
      } else {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
        ctx.font = "900 17px sans-serif";
        ctx.textAlign = "center";
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#ffffff";
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = p.col;
        ctx.fillText(p.text, p.x, p.y);
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
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
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
  brick_breaker: createBrickBreakerGame,
  note_pang: createNotePangGame
};
