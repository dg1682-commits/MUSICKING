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

// [V3.0] 황금오락실 공용 오프스크린 에셋 캐시 (로딩 중 사전 베이킹해 플레이 렉 방지)
const ArcadeAssetCache = (() => {
  const playerMap = new Map();
  const headMap = new Map();
  const blockFaceMap = new Map();
  const animalMap = new Map();
  const celestialMap = new Map();

  function getCfgKey() {
    const cfg =
      typeof userState !== "undefined" && userState.avatarConfig
        ? userState.avatarConfig
        : typeof DEFAULT_AVATAR_CONFIG !== "undefined"
        ? DEFAULT_AVATAR_CONFIG
        : null;
    try {
      return cfg ? JSON.stringify(cfg) : "default";
    } catch (e) {
      return "default";
    }
  }

  function bakePlayer(size = 128, headOnly = false) {
    const cfgKey = `${getCfgKey()}|${size}|${headOnly ? "H" : "F"}`;
    const map = headOnly ? headMap : playerMap;
    if (map.has(cfgKey)) return map.get(cfgKey);

    const off = document.createElement("canvas");
    off.width = size;
    off.height = size;
    const cfg =
      typeof userState !== "undefined" && userState.avatarConfig
        ? userState.avatarConfig
        : typeof DEFAULT_AVATAR_CONFIG !== "undefined"
        ? DEFAULT_AVATAR_CONFIG
        : null;
    let rendered = false;
    if (cfg && typeof renderPixelAvatar === "function") {
      try {
        renderPixelAvatar(off, cfg, { transparentBg: true, matchCssAspect: false, skipEffectLoop: true, headOnly });
        rendered = true;
      } catch (e) {}
    }
    if (!rendered) {
      const ctx = off.getContext("2d");
      ctx.fillStyle = "#fffdf9";
      ctx.strokeStyle = "#1e1b18";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    if (map.size > 8) map.clear();
    map.set(cfgKey, off);
    return off;
  }

  function getBlockFace(faceId, withCheek = true) {
    const key = `${faceId}|${withCheek ? 1 : 0}`;
    if (blockFaceMap.has(key)) return blockFaceMap.get(key);

    // 음악왕 자체 drawDetailedFace() 에셋을 블록용 고해상도 스탬프로 사전 베이킹
    const off = document.createElement("canvas");
    off.width = 160;
    off.height = 96;
    const c = off.getContext("2d");
    c.save();
    c.translate(80, 48);
    c.scale(0.36, 0.36);
    c.translate(-240, -206);
    if (withCheek) {
      c.fillStyle = "#fda4af";
      c.beginPath();
      c.ellipse(164, 222, 24, 13, 0, 0, Math.PI * 2);
      c.ellipse(316, 222, 24, 13, 0, 0, Math.PI * 2);
      c.fill();
    }
    if (typeof drawDetailedFace === "function") {
      drawDetailedFace(c, { id: faceId });
    } else {
      c.fillStyle = "#1e1b18";
      c.beginPath(); c.arc(190, 192, 14, 0, Math.PI * 2); c.arc(290, 192, 14, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "#1e1b18"; c.lineWidth = 8;
      c.beginPath(); c.arc(240, 222, 24, 0.1 * Math.PI, 0.9 * Math.PI); c.stroke();
    }
    c.restore();
    blockFaceMap.set(key, off);
    return off;
  }

  function getAnimalStamp(kind) {
    if (animalMap.has(kind)) return animalMap.get(kind);
    const off = document.createElement("canvas");
    off.width = 120;
    off.height = 120;
    const c = off.getContext("2d");
    if (typeof drawAnimalChibi === "function") drawAnimalChibi(c, kind, 60, 62, 42);
    animalMap.set(kind, off);
    return off;
  }

  function getCelestialStamp(type) {
    if (celestialMap.has(type)) return celestialMap.get(type);
    const off = document.createElement("canvas");
    off.width = 96;
    off.height = 96;
    const c = off.getContext("2d");
    if (typeof drawCelestialAsset === "function") drawCelestialAsset(c, type, 48, 48, 34);
    celestialMap.set(type, off);
    return off;
  }

  function warmup() {
    try { ArcadeSfx.unlock(); } catch (e) {}
    bakePlayer(128, false);
    bakePlayer(108, false);
    bakePlayer(480, true);
    ["xd_laugh", "star_eyes", "heart_eyes", "surprised", "cat_face"].forEach(fid => getBlockFace(fid, true));
    ["dog", "cat", "rabbit", "pig", "horse", "monkey", "bear", "frog"].forEach(k => getAnimalStamp(k));
    ["sun", "cloud", "star", "moon"].forEach(t => getCelestialStamp(t));
  }

  return { bakePlayer, getBlockFace, getAnimalStamp, getCelestialStamp, warmup };
})();

if (typeof window !== "undefined") {
  window.ArcadeAssetCache = ArcadeAssetCache;
}

// 사용자 현재 착용 아바타(투명 배경)를 미니게임용 경량 오프스크린으로 1회 베이킹
function createBakedMiniPlayerCanvas(size = 128) {
  return ArcadeAssetCache.bakePlayer(size, false);
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

// 풀스크린 캔버스 컨테이너 비율에 맞춰 논리 높이를 자동 동기화 (상하 흰 여백 제거)
function _arcSyncCanvasAspect(canvas, logicalW, currentH, minH, maxH, onResize) {
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  if (cw > 20 && ch > 20) {
    const targetH = Math.max(minH, Math.min(maxH, Math.round(logicalW * (ch / cw))));
    if (Math.abs(currentH - targetH) > 2 || canvas.height !== targetH) {
      canvas.height = targetH;
      onResize(targetH);
      return targetH;
    }
  }
  return currentH;
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
    hooks.onHud({ score: Math.floor(score), extra: hasShield ? "🛡️ 실드 ON" : `${Math.floor(elapsedSec)}초 생존` });
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
          ArcadeSfx.hit();
          stopped = true;
          syncHud();
          hooks.onFinish(Math.floor(score), "유성 충돌! 게임 종료");
          return;
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
  let H = 440;

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

  const syncSideAspect = () => {
    H = _arcSyncCanvasAspect(canvas, W, H, 300, 740, nextH => { H = nextH; });
  };
  syncSideAspect();
  requestAnimationFrame(syncSideAspect);

  const getTargetY = () => Math.max(250, Math.round(H * 0.74));

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
        y: getTargetY(),
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
    syncSideAspect();
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

    // 대기열 & 활성 카드 (풀스크린 세로 비율 맞춤)
    const targetY = getTargetY();
    const queueGap = Math.max(46, Math.min(68, Math.round((targetY - 122) / 3.1)));
    const stunShake = now < stunUntil ? Math.sin(now * 0.08) * 10 : 0;
    for (let i = Math.min(3, queue.length - 1); i >= 1; i--) {
      const y = targetY - i * queueGap;
      const r = Math.max(18, 30 - i * 3);
      ctx.save();
      ctx.globalAlpha = Math.max(0.38, 1 - i * 0.16);
      drawCelestialAsset(ctx, queue[i], W / 2, y, r);
      ctx.restore();
    }

    // 현재 분류 대상 강조 링
    ctx.save();
    if (now < stunUntil) {
      _arcFillRoundRect(ctx, W / 2 - 50 + stunShake, targetY - 46, 100, 92, 22, "#fecaca", "#dc2626", 4);
    } else if (inFever) {
      _arcFillRoundRect(ctx, W / 2 - 50, targetY - 46, 100, 92, 22, "#fef9c3", "#f59e0b", 4.5);
    } else {
      _arcFillRoundRect(ctx, W / 2 - 50, targetY - 46, 100, 92, 22, "#ffffff", "#1e1b18", 4);
    }
    drawCelestialAsset(ctx, queue[0], W / 2 + stunShake, targetY, 35);
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
  let invulnSec = 0;
  let dyingTimer = 0;
  let dyingReason = "";
  let scrollX = 0;
  let speed = 240;

  const BASE_PLAYER_X = 86;
  const PIPE_TIERS = [
    { h: 34, w: 42 }, // 1단: 작은 토관
    { h: 58, w: 46 }, // 2단: 중간 토관
    { h: 82, w: 50 }  // 3단: 높은 토관 (2단점프 권장!)
  ];

  const player = {
    x: BASE_PLAYER_X,
    y: GROUND_Y - 28,
    vx: 0,
    vy: 0,
    jumpsLeft: 2,
    onGround: true,
    spin: 0,
    knockSec: 0
  };

  let spawnObsTimer = 0.85;
  let spawnCoinTimer = 0.9;
  const obstacles = [];
  const coins = [];
  const qBlocks = [];
  let spawnQBlockTimer = 3.2;

  function syncHud() {
    hooks.onHud({ score: Math.floor(score), extra: `속도 x${(speed / 240).toFixed(1)}` });
  }

  function doJump() {
    if (stopped || dyingTimer > 0 || player.jumpsLeft <= 0) return;
    ArcadeSfx.unlock();
    const isDouble = !player.onGround;
    player.vy = isDouble ? -555 : -625;
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

  function hasCoinOverlapAt(cx, cy) {
    if (coins.some(c => Math.hypot(c.x - cx, c.y - cy) < 38)) return true;
    if (qBlocks.some(qb => Math.abs(qb.x - cx) < 50 && Math.abs(qb.y - cy) < 42)) return true;
    for (const o of obstacles) {
      if (o.kind === "pipe") {
        const pyTop = GROUND_Y - o.h;
        if (Math.abs(o.x - cx) < o.w * 0.68 + 20 && cy + 18 > pyTop - 8) return true;
      } else {
        if (Math.abs(o.x - cx) < 52 && Math.abs(o.y - cy) < 46) return true;
      }
    }
    return false;
  }

  function frame(now) {
    if (stopped) return;
    const dt = Math.min(0.05, Math.max(0.005, (now - lastMs) / 1000));
    lastMs = now;

    if (dyingTimer > 0) {
      dyingTimer -= dt;
      if (dyingTimer <= 0) {
        stopped = true;
        syncHud();
        hooks.onFinish(Math.floor(score), dyingReason || "충돌! 점프점프 완료");
        return;
      }
    } else {
      speed = Math.min(470, speed + dt * 5.2);
      scrollX += speed * dt;
      score += 24 * dt;
      if (invulnSec > 0) invulnSec -= dt;
    }

    const prevBottom = player.y + 24;

    // 넉백 반동 및 X 복귀 물리
    if (player.knockSec > 0) {
      player.knockSec -= dt;
      player.x = Math.max(26, player.x + player.vx * dt);
      player.vx *= Math.max(0, 1 - 4.5 * dt);
    } else if (dyingTimer <= 0 && Math.abs(player.x - BASE_PLAYER_X) > 0.5) {
      player.x += (BASE_PLAYER_X - player.x) * Math.min(1, dt * 4.5);
    }

    // 물리 점프 (중력)
    player.vy += 1550 * dt;
    player.y += player.vy * dt;
    if (player.spin > 0) player.spin = Math.max(0, player.spin - dt * 2.8);

    if (player.y >= GROUND_Y - 24) {
      player.y = GROUND_Y - 24;
      player.vy = 0;
      if (dyingTimer <= 0) {
        player.onGround = true;
        player.jumpsLeft = 2;
      }
    }

    // 토관(3단: 소/중/대) / 뾰족 몬스터 스폰 (등속 스크롤로 코인 추월 겹침 방지)
    if (dyingTimer <= 0) {
      spawnObsTimer -= dt;
      if (spawnObsTimer <= 0) {
      const spawnX = W + 38;
      if (findSpawnObstacleNearby(spawnX, 118)) {
        spawnObsTimer = 0.25;
      } else {
        spawnObsTimer = Math.max(0.84, 1.54 - (speed - 240) * 0.0022) + Math.random() * 0.45;
        const isEnemy = Math.random() < 0.36;
        if (isEnemy) {
          obstacles.push({
            kind: "goomba",
            x: spawnX,
            y: GROUND_Y - 20,
            w: 36,
            h: 36,
            bounced: false,
            vx: 0,
            vy: 0,
            hopSeed: Math.random() * Math.PI * 2
          });
        } else {
          const tier = PIPE_TIERS[Math.floor(Math.random() * PIPE_TIERS.length)];
          obstacles.push({ kind: "pipe", x: spawnX, h: tier.h, w: tier.w });
        }
      }
      }

      // ? 물음표 블록 스폰
      spawnQBlockTimer -= dt;
      if (spawnQBlockTimer <= 0) {
        const qx = W + 36;
        const qy = GROUND_Y - 144;
        const conflictObs = findSpawnObstacleNearby(qx, 70);
        const conflictQ = qBlocks.some(qb => Math.abs(qb.x - qx) < 96);
        const conflictCoin = coins.some(c => Math.abs(c.x - qx) < 54 && Math.abs(c.y - qy) < 46);
        if (conflictObs || conflictQ || conflictCoin) {
          spawnQBlockTimer = 0.45;
        } else {
          spawnQBlockTimer = 4.2 + Math.random() * 2.5;
          qBlocks.push({ x: qx, y: qy, hit: false });
        }
      }

      // 코인 스폰 (토관/몬스터/?블록/코인 간 물리적 겹침 0% 차단)
      spawnCoinTimer -= dt;
      if (spawnCoinTimer <= 0) {
        const cx = W + 34;
        const nearObs = findSpawnObstacleNearby(cx, 74);
        let candY = null;
        if (nearObs) {
          candY = nearObs.kind === "pipe" ? Math.min(GROUND_Y - 118, GROUND_Y - nearObs.h - 46) : GROUND_Y - 126;
        } else {
          candY = Math.random() < 0.48 ? GROUND_Y - 134 : GROUND_Y - 52;
        }

        if (candY !== null && !hasCoinOverlapAt(cx, candY)) {
          spawnCoinTimer = 0.88 + Math.random() * 0.68;
          coins.push({ x: cx, y: candY });
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

    // 토관(상단 착지 + 옆면 튕김) / 몬스터(밟기 + 부딪히면 쌍방 튕김!) 렌더 & 충돌
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      if (o.bounced) {
        o.x += o.vx * dt;
        o.vy += 1200 * dt;
        o.y += o.vy * dt;
      } else {
        o.x -= speed * dt;
      }

      if (o.kind === "pipe") {
        const pyTop = GROUND_Y - o.h;
        _arcFillRoundRect(ctx, o.x - o.w * 0.42, pyTop + 16, o.w * 0.84, o.h - 16, 4, "#16a34a", "#1e1b18", 3.5);
        _arcFillRoundRect(ctx, o.x - o.w * 0.52, pyTop, o.w * 1.04, 18, 6, "#22c55e", "#1e1b18", 3.5);
        ctx.fillStyle = "#86efac";
        ctx.fillRect(o.x - o.w * 0.3, pyTop + 18, 6, Math.max(0, o.h - 22));

        // 1) 토관 위 착지 판정 (마리오처럼 밟고 지나가거나 2단점프 출발!)
        if (dyingTimer <= 0 && Math.abs(player.x - o.x) < o.w * 0.46 + 10 && player.vy >= 0 && prevBottom <= pyTop + 14 && player.y + 24 >= pyTop) {
          player.y = pyTop - 24;
          player.vy = 0;
          player.onGround = true;
          player.jumpsLeft = 2;
        } else if (dyingTimer <= 0 && Math.abs(player.x - o.x) < o.w * 0.44 + 16 && player.y + 20 > pyTop + 8) {
          // 2) 옆면 충돌: 뚫고 가지 않고 뒤·위로 튕겨난 뒤 게임 종료!
          const pipeLeft = o.x - o.w * 0.52 - 18;
          if (player.x <= o.x) {
            player.x = Math.max(24, Math.min(player.x, pipeLeft));
          }
          invulnSec = 1.0;
          player.vx = -175;
          player.vy = -410;
          player.onGround = false;
          player.jumpsLeft = 0;
          player.knockSec = 0.42;
          dyingTimer = 0.42;
          dyingReason = "토관 충돌! 점프점프 완료";
          ArcadeSfx.hit();
        }
      } else {
        // 뾰족 몬스터 (살짝 통통 뛰며 접근)
        const hopY = o.bounced ? 0 : Math.abs(Math.sin(scrollX * 0.055 + (o.hopSeed || 0))) * -5;
        const drawY = o.y + hopY;
        _arcFillRoundRect(ctx, o.x - 18, drawY - 18, 36, 36, 14, "#9333ea", "#1e1b18", 3.5);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(o.x - 6, drawY - 4, 4, 0, Math.PI * 2); ctx.arc(o.x + 6, drawY - 4, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#1e1b18";
        ctx.beginPath(); ctx.arc(o.x - 6, drawY - 4, 2, 0, Math.PI * 2); ctx.arc(o.x + 6, drawY - 4, 2, 0, Math.PI * 2); ctx.fill();

        if (!o.bounced && dyingTimer <= 0) {
          const dx = Math.abs(player.x - o.x);
          const dy = player.y - drawY;
          if (dx < 28 && Math.abs(dy) < 30) {
            // 위에서 밟으면 밟기 보상 + 통통 바운스!
            if (player.vy > 0 && dy < -6) {
              score += 75;
              player.vy = -440;
              player.jumpsLeft = 1;
              ArcadeSfx.pop(2);
              obstacles.splice(i, 1);
              continue;
            } else {
              // 옆면 충돌: 캐릭터는 뒤·위로, 몹은 앞·위로 서로 튕겨나간 뒤 게임 종료!
              invulnSec = 1.0;
              player.x = Math.max(26, o.x - 32);
              player.vx = -175;
              player.vy = -380;
              player.onGround = false;
              player.jumpsLeft = 0;
              player.knockSec = 0.42;
              o.bounced = true;
              o.vx = 240;
              o.vy = -290;
              dyingTimer = 0.42;
              dyingReason = "몬스터 충돌! 점프점프 완료";
              ArcadeSfx.hit();
              continue;
            }
          }
        }
      }

      if (o.x < -70 || o.x > W + 90 || o.y > H + 60) obstacles.splice(i, 1);
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
// [게임 6] 정리고수 (color_sort) — 음악왕 3열 블록 정리 콤보 (풀스크린 + 초록 숲 테마)
// ============================================================================
function createColorSortGame(mountEl, hooks) {
  const W = 420;
  let H = 640;
  const COLORS = [
    { id: "red", bg: "#ef4444", faceId: "xd_laugh" },
    { id: "blue", bg: "#3b82f6", faceId: "star_eyes" },
    { id: "yellow", bg: "#facc15", faceId: "heart_eyes" },
    { id: "green", bg: "#4ade80", faceId: "surprised" },
    { id: "purple", bg: "#a855f7", faceId: "cat_face" }
  ];
  const COLOR_MAP = Object.fromEntries(COLORS.map(c => [c.id, c]));

  const BOARD_TOP = 74;
  const COL_W = 128;
  const COL_GAP = 8;
  const BOARD_X = (W - (COL_W * 3 + COL_GAP * 2)) / 2; // 10
  const DANGER_ROWS = 9; // 0..8 안전, 9번째(10개째) 넘으면 위험선 초과 게임오버
  let DANGER_Y = H - 72;
  let ROW_PITCH = Math.floor((DANGER_Y - BOARD_TOP - 10) / DANGER_ROWS);
  let BLOCK_H = Math.max(34, ROW_PITCH - 5);

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

  function syncCanvasAspect() {
    H = _arcSyncCanvasAspect(canvas, W, H, 480, 860, nextH => {
      H = nextH;
      DANGER_Y = H - 72;
      ROW_PITCH = Math.floor((DANGER_Y - BOARD_TOP - 10) / DANGER_ROWS);
      BLOCK_H = Math.max(34, ROW_PITCH - 5);
    });
  }
  syncCanvasAspect();
  requestAnimationFrame(syncCanvasAspect);

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
      11,
      meta.bg,
      dangerGlow ? "#ef4444" : isHeldBlock ? "#fde047" : "#1e1b18",
      isHeldBlock ? 4 : 3.2
    );
    ctx.fillStyle = "rgba(255,255,255,0.32)";
    ctx.fillRect(x + 10, y + 3, w - 20, 5);

    const cx = x + w / 2;
    const cy = y + h / 2 + 1;
    // 음악왕 자체 drawDetailedFace 스탬프(사전 베이킹) 합성
    const stamp = ArcadeAssetCache.getBlockFace(meta.faceId, true);
    if (stamp) {
      ctx.drawImage(stamp, cx - 44, cy - 23, 88, 48);
    }
    ctx.restore();
  }

  function frame(now) {
    if (stopped) return;
    syncCanvasAspect();
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

    // 1) 컴팩트 상단 민트 하늘 + 아바타 + 음표 타이머 게이지 + 점수 말풍선
    const skyG = ctx.createLinearGradient(0, 0, 0, BOARD_TOP);
    skyG.addColorStop(0, "#6ee7b7");
    skyG.addColorStop(1, "#ecfdf5");
    ctx.fillStyle = skyG;
    ctx.fillRect(0, 0, W, BOARD_TOP);

    ctx.fillStyle = "#10b981";
    ctx.fillRect(0, 60, W, 14);
    ctx.strokeStyle = "#1e1b18";
    ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(0, 60); ctx.lineTo(W, 60); ctx.moveTo(0, 74); ctx.lineTo(W, 74); ctx.stroke();

    // 중앙 내 캐릭터
    const bob = Math.sin(elapsedSec * 5.2) * 2;
    ctx.save();
    ctx.translate(W / 2, 41 + bob);
    ctx.drawImage(playerOffscreen, -24, -28, 48, 48);
    ctx.restore();

    // 좌상단 다음 줄 게이지 (클릭 가능)
    const fuseRatio = Math.max(0, Math.min(1, pushTimer / pushInterval));
    _arcFillRoundRect(ctx, 10, 14, 148, 34, 12, "#022c22", "#1e1b18", 2.5);
    if (fuseRatio > 0) {
      const fCol = fuseRatio > 0.78 ? "#ef4444" : fuseRatio > 0.45 ? "#f59e0b" : "#34d399";
      _arcFillRoundRect(ctx, 14, 18, Math.max(10, Math.round(140 * fuseRatio)), 26, 9, fCol, null, 0);
    }
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#1e1b18";
    ctx.lineWidth = 3;
    ctx.font = "900 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText("🎵 탭: 즉시 줄 등장!", 84, 31);
    ctx.fillText("🎵 탭: 즉시 줄 등장!", 84, 31);

    // 우상단 콤보/점수 말풍선
    _arcFillRoundRect(ctx, W - 158, 12, 148, 42, 14, "#064e3b", "#1e1b18", 3);
    ctx.fillStyle = "#fde047";
    ctx.font = "900 11px sans-serif";
    ctx.fillText(combo >= 2 ? `🔥 ${combo} COMBO!` : "✨ 정리고수!", W - 84, 24);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 15px sans-serif";
    ctx.fillText(`${score.toLocaleString()}점`, W - 84, 41);

    // 2) 음악왕 딥 포레스트 그린 배경 보드 + 은은한 음표 워터마크 + 3개 대형 세로 레인
    const greenBoardG = ctx.createLinearGradient(0, BOARD_TOP, 0, H);
    greenBoardG.addColorStop(0, "#065f46");
    greenBoardG.addColorStop(0.55, "#064e3b");
    greenBoardG.addColorStop(1, "#022c22");
    ctx.fillStyle = greenBoardG;
    ctx.fillRect(0, BOARD_TOP, W, H - BOARD_TOP);

    ctx.save();
    ctx.fillStyle = "rgba(167, 243, 208, 0.08)";
    ctx.font = "900 28px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const bgNotes = ["♪", "♫", "♬", "♩"];
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 4; c++) {
        ctx.fillText(bgNotes[(r + c) % bgNotes.length], 54 + c * 104, BOARD_TOP + 42 + r * Math.round((H - BOARD_TOP) / 6));
      }
    }
    ctx.restore();

    // 3개 레인 가이드 & 들려진 블록 대상 강조
    for (let c = 0; c < 3; c++) {
      const rx = BOARD_X + c * (COL_W + COL_GAP);
      const isDangerCol = cols[c].length >= DANGER_ROWS - 1;
      const isSourceCol = held && held.fromCol === c;
      ctx.fillStyle = isDangerCol && Math.floor(elapsedSec * 6) % 2 === 0
        ? "rgba(239, 68, 68, 0.22)"
        : held && !isSourceCol
        ? "rgba(250, 204, 21, 0.16)"
        : "rgba(236, 253, 245, 0.09)";
      _arcFillRoundRect(ctx, rx, BOARD_TOP + 4, COL_W, DANGER_Y - BOARD_TOP - 4, 12, ctx.fillStyle, held && !isSourceCol ? "rgba(250, 204, 21, 0.65)" : "rgba(167, 243, 208, 0.25)", 2);

      const stack = cols[c];
      for (let r = 0; r < stack.length; r++) {
        const bx = rx + 4;
        const by = BOARD_TOP + 6 + r * ROW_PITCH + rowAnimY;
        const warnGlow = r >= DANGER_ROWS - 1;
        drawFaceBlock(bx, by, COL_W - 8, BLOCK_H, stack[r], false, warnGlow);
      }
    }

    // 위험 경계선 (y = DANGER_Y)
    ctx.save();
    ctx.strokeStyle = "#fca5a5";
    ctx.setLineDash([10, 6]);
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(10, DANGER_Y); ctx.lineTo(W - 10, DANGER_Y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#fecaca";
    ctx.font = "900 11px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("⚠️ 위험선 (넘으면 종료)", W - 14, DANGER_Y - 7);
    ctx.restore();

    // 현재 집어 들고 있는 블록 (하단 프리뷰 존)
    if (held) {
      const hx = BOARD_X + held.fromCol * (COL_W + COL_GAP) + 4;
      const baseHy = DANGER_Y + 8 + Math.sin(elapsedSec * 9) * 2.5;
      const previewCount = Math.min(2, held.count);
      for (let k = 0; k < previewCount; k++) {
        drawFaceBlock(hx, baseHy + k * 27, COL_W - 8, 25, held.color, true, false);
      }
      ctx.fillStyle = "#fde047";
      ctx.font = "900 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`👆 옮길 줄을 선택! (${held.count}개)`, W / 2, H - 11);
    } else {
      ctx.fillStyle = "rgba(236, 253, 245, 0.85)";
      ctx.font = "800 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("원하는 줄을 눌러 맨 아래 블록을 집어 옮기세요!", W / 2, H - 22);
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
  let combo = 0;
  let wideSec = 0;
  let guardSec = 0;

  const paddle = { x: W / 2, w: 94, h: 16, y: H - 44 };
  let targetPadX = W / 2;
  const keys = { left: false, right: false };

  let bricks = [];
  let balls = [];
  const powerUps = [];

  function getStageMaxBallSpd() {
    return Math.min(860, 560 + (stage - 1) * 75);
  }

  function spawnBricks() {
    bricks = [];
    const cols = 7;
    const rows = Math.min(7, 5 + Math.floor((stage - 1) / 1));
    const padX = 14;
    const gap = 5;
    const bw = (W - padX * 2 - gap * (cols - 1)) / cols;
    const bh = 22;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isUltra = stage >= 3 && (r * 7 + c) % 8 === 0;
        const isTough = !isUltra && stage >= 2 && (r + c) % (stage >= 3 ? 3 : 4) === 0;
        const maxHp = isUltra ? 3 : isTough ? 2 : 1;
        const col = isUltra ? "#94a3b8" : isTough ? "#cbd5e1" : ROW_COLORS[(r + c + stage) % ROW_COLORS.length];
        bricks.push({
          x: padX + c * (bw + gap),
          y: 44 + r * (bh + gap),
          w: bw,
          h: bh,
          color: col,
          hp: maxHp,
          maxHp
        });
      }
    }
  }

  function resetSingleBall() {
    const dir = Math.random() < 0.5 ? -1 : 1;
    const vxBase = 175 + (stage - 1) * 35;
    const vyBase = 340 + (stage - 1) * 65;
    balls = [
      {
        x: paddle.x,
        y: paddle.y - 14,
        vx: dir * vxBase,
        vy: -vyBase,
        r: 9
      }
    ];
  }

  spawnBricks();
  resetSingleBall();

  function syncHud() {
    const spdScale = (1 + (stage - 1) * 0.22).toFixed(1);
    hooks.onHud({
      score,
      extra: `STAGE ${stage}${balls.length > 1 ? ` · 공×${balls.length}` : ""} · 속도 x${spdScale}`
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

    const keyPadSpd = 460 + (stage - 1) * 35;
    if (keys.left) targetPadX -= keyPadSpd * dt;
    if (keys.right) targetPadX += keyPadSpd * dt;
    targetPadX = Math.max(paddle.w / 2 + 6, Math.min(W - paddle.w / 2 - 6, targetPadX));
    paddle.x += (targetPadX - paddle.x) * Math.min(1, dt * 22);

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

    // 벽돌 그리기 (단단한 2~3HP 금이 간 연출)
    bricks.forEach(b => {
      _arcFillRoundRect(ctx, b.x, b.y, b.w, b.h, 6, b.color, b.maxHp >= 3 ? "#f59e0b" : "#1e1b18", b.maxHp >= 3 ? 3 : 2.5);
      ctx.fillStyle = "rgba(255,255,255,0.34)";
      ctx.fillRect(b.x + 4, b.y + 3, b.w - 8, 4);
      if (b.hp < b.maxHp) {
        ctx.strokeStyle = "#1e1b18";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(b.x + 12, b.y + 4); ctx.lineTo(b.x + 22, b.y + 14); ctx.lineTo(b.x + 16, b.y + 19);
        if (b.maxHp - b.hp >= 2) {
          ctx.moveTo(b.x + b.w - 14, b.y + 5); ctx.lineTo(b.x + b.w - 22, b.y + 16);
        }
        ctx.stroke();
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

    // 공 업데이트 & 충돌 (빠른 공 관통 방지를 위해 2-substep 판정 + 스테이지별 가속)
    const maxSpd = getStageMaxBallSpd();
    const subSteps = 2;
    const subDt = dt / subSteps;

    for (let bi = balls.length - 1; bi >= 0; bi--) {
      const ball = balls[bi];
      for (let st = 0; st < subSteps; st++) {
        ball.x += ball.vx * subDt;
        ball.y += ball.vy * subDt;

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
          const spd = Math.min(maxSpd, Math.hypot(ball.vx, ball.vy) * 1.022);
          const angle = hitNorm * (Math.PI * 0.36);
          ball.vx = Math.sin(angle) * spd;
          ball.vy = -Math.max(240, Math.cos(angle) * spd);
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
      combo = 0;
      ArcadeSfx.hit();
      stopped = true;
      syncHud();
      hooks.onFinish(score, "공을 놓쳤습니다!");
      return;
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
  const shockwaves = [];
  const beams = [];
  const popGhosts = [];
  const popups = [];
  let shakeTimer = 0;
  let shakeAmp = 0;

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

  function spawnPangEffects(r, c, cell) {
    const meta = TILES[cell.color] || TILES[0];
    const cx = PAD_X + c * CELL + CELL / 2;
    const cy = BOARD_Y + r * CELL + CELL / 2;
    popGhosts.push({ cx, cy, col: meta.bg, sym: meta.sym, txtCol: meta.txtCol, isRainbow: cell.special === "rainbow", life: 0.2, maxLife: 0.2 });
    shockwaves.push({ x: cx, y: cy, r: 8, maxR: CELL * (cell.special ? 1.55 : 0.95), col: cell.special ? "#fde047" : meta.bg, life: 0.26, maxLife: 0.26 });

    if (cell.special === "lineH") {
      beams.push({ x1: PAD_X, y1: cy, x2: PAD_X + GRID * CELL, y2: cy, col: "#fde047", width: 22, life: 0.24, maxLife: 0.24 });
    } else if (cell.special === "lineV") {
      beams.push({ x1: cx, y1: BOARD_Y, x2: cx, y2: BOARD_Y + GRID * CELL, col: "#fde047", width: 22, life: 0.24, maxLife: 0.24 });
    } else if (cell.special === "rainbow") {
      const rCols = ["#ef4444", "#f97316", "#facc15", "#22c55e", "#38bdf8", "#a855f7"];
      for (let i = 0; i < 8; i++) {
        const ang = (Math.PI * 2 * i) / 8;
        beams.push({
          x1: cx,
          y1: cy,
          x2: cx + Math.cos(ang) * 210,
          y2: cy + Math.sin(ang) * 210,
          col: rCols[i % rCols.length],
          width: 14,
          life: 0.3,
          maxLife: 0.3
        });
      }
    }

    const pCount = cell.special ? 14 : 9;
    const shapes = ["dot", "star", "note"];
    for (let k = 0; k < pCount; k++) {
      const a = (Math.PI * 2 * k) / pCount + Math.random() * 0.5;
      const s = 75 + Math.random() * (cell.special ? 185 : 140);
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 24,
        r: 4 + Math.random() * 4,
        col: cell.special === "rainbow" ? TILES[k % TILES.length].bg : meta.bg,
        shape: shapes[k % shapes.length],
        rot: Math.random() * Math.PI * 2,
        rotSpd: (Math.random() - 0.5) * 12,
        life: 0.48 + Math.random() * 0.14
      });
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
    const bonusSec = wave * 0.5;
    score += wavePts;
    timeLeft = Math.min(150, timeLeft + bonusSec);
    ArcadeSfx.pop(Math.min(14, wave * 2));

    let sumX = 0;
    let sumY = 0;
    let n = 0;
    let hadSpecial = false;
    visited.forEach(k => {
      const [rr, cc] = k.split(",").map(Number);
      const cell = grid[rr][cc];
      if (cell) {
        if (cell.special) hadSpecial = true;
        spawnPangEffects(rr, cc, cell);
      }
      grid[rr][cc] = null;
      sumX += PAD_X + cc * CELL + CELL / 2;
      sumY += BOARD_Y + rr * CELL + CELL / 2;
      n++;
    });

    if (hadSpecial || wave >= 2 || visited.size >= 4) {
      shakeTimer = Math.max(shakeTimer, hadSpecial ? 0.24 : 0.14);
      shakeAmp = Math.max(shakeAmp, hadSpecial ? 7 : Math.min(6, 2.5 + wave * 1.1));
    }

    newSpecials.forEach(sp => {
      grid[sp.r][sp.c] = makeCell(sp.color, sp.special, 0);
    });

    if (n > 0) {
      popups.push({
        x: Math.max(96, Math.min(W - 96, sumX / n)),
        y: Math.max(BOARD_Y + 30, sumY / n),
        text: wave > 1 ? `🔥 ${wave}연쇄! +${wavePts} (+${bonusSec.toFixed(1)}s)` : `+${wavePts} (+0.5s)`,
        col: wave >= 3 ? "#f59e0b" : "#1e1b18",
        alpha: 1.3
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

    // 배경 & 상단 배너 (+ 콤보/특수폭발 보드 쉐이크)
    const bgG = ctx.createLinearGradient(0, 0, 0, H);
    bgG.addColorStop(0, "#ccfbf1");
    bgG.addColorStop(1, "#fef9c3");
    ctx.fillStyle = bgG;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    if (shakeTimer > 0) {
      shakeTimer = Math.max(0, shakeTimer - dt);
      const mag = shakeAmp * (shakeTimer / 0.24);
      ctx.translate((Math.random() - 0.5) * mag * 2, (Math.random() - 0.5) * mag * 2);
      if (shakeTimer <= 0) shakeAmp = 0;
    }

    _arcFillRoundRect(ctx, 18, 10, W - 36, 36, 12, "#ffffff", "#1e1b18", 3);
    ctx.fillStyle = wave >= 2 ? "#dc2626" : "#0f766e";
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

    // 1) 터지며 커지는 플래시 고스트 타일
    for (let i = popGhosts.length - 1; i >= 0; i--) {
      const g = popGhosts[i];
      g.life -= dt;
      if (g.life <= 0) {
        popGhosts.splice(i, 1);
      } else {
        const p = 1 - g.life / g.maxLife;
        const sz = CELL * (0.9 + p * 0.45);
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - p);
        _arcFillRoundRect(ctx, g.cx - sz / 2, g.cy - sz / 2, sz, sz, 12, "#ffffff", "#fde047", 3);
        ctx.restore();
      }
    }

    // 2) 번개줄 & 무지개 광선 빔
    for (let i = beams.length - 1; i >= 0; i--) {
      const b = beams[i];
      b.life -= dt;
      if (b.life <= 0) {
        beams.splice(i, 1);
      } else {
        const ratio = Math.max(0, b.life / b.maxLife);
        ctx.save();
        ctx.globalAlpha = ratio;
        ctx.lineCap = "round";
        ctx.strokeStyle = b.col;
        ctx.lineWidth = b.width * ratio + 6;
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = b.width * ratio * 0.45;
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
        ctx.restore();
      }
    }

    // 3) 확산 충격파 링
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      const sw = shockwaves[i];
      sw.life -= dt;
      if (sw.life <= 0) {
        shockwaves.splice(i, 1);
      } else {
        const prog = 1 - sw.life / sw.maxLife;
        const rad = sw.r + (sw.maxR - sw.r) * prog;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 0.9 * (1 - prog));
        ctx.strokeStyle = sw.col;
        ctx.lineWidth = Math.max(1.5, 5 * (1 - prog));
        ctx.beginPath(); ctx.arc(sw.x, sw.y, rad, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }

    // 4) 회전 반짝이 · 별 · 음표 파티클
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 260 * dt;
      p.rot += (p.rotSpd || 0) * dt;
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
      } else {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot || 0);
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2.3));
        if (p.shape === "star" || p.shape === "note") {
          ctx.font = "900 14px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.lineWidth = 3;
          ctx.strokeStyle = "#1e1b18";
          const ch = p.shape === "note" ? "♪" : "★";
          ctx.strokeText(ch, 0, 0);
          ctx.fillStyle = p.shape === "star" ? "#fde047" : p.col;
          ctx.fillText(ch, 0, 0);
        } else {
          ctx.fillStyle = p.col;
          ctx.strokeStyle = "#1e1b18";
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
        ctx.restore();
      }
    }

    // 5) 타격감 콤보 점수 팝업
    for (let i = popups.length - 1; i >= 0; i--) {
      const p = popups[i];
      p.y -= 36 * dt;
      p.alpha -= dt * 1.25;
      if (p.alpha <= 0) {
        popups.splice(i, 1);
      } else {
        const bounce = p.alpha > 1.05 ? 1.22 : 1.0;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(bounce, bounce);
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
        ctx.font = "900 18px sans-serif";
        ctx.textAlign = "center";
        ctx.lineWidth = 4.5;
        ctx.strokeStyle = "#ffffff";
        ctx.strokeText(p.text, 0, 0);
        ctx.fillStyle = p.col;
        ctx.fillText(p.text, 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();

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
