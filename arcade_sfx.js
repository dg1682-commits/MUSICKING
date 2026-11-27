// ============================================================================
// [음악왕 V3.1] 오락실 미니게임 전용 순수 Web Audio API 레트로 SFX 엔진 (arcade_sfx.js)
// - 외부 오디오 파일 없이 Oscillator + Filtered White Noise 합성으로 구현
// - DynamicsCompressor + 마스터 게인 + 종별 쿨타임(쓰로틀)으로 모바일/웹뷰 찢어짐 방지
// - 추후 오락실 BGM 추가 시에도 충돌하지 않도록 독립 AudioContext·뮤트 연동 유지
// ============================================================================

const ArcadeSfx = (() => {
  const MASTER_VOLUME = 0.72;
  let audioCtx = null;
  let masterGain = null;
  let compressor = null;
  let cachedNoiseBuffer = null;
  const lastTriggerMs = new Map();

  function isMuted() {
    if (typeof appExited !== "undefined" && appExited) return true;
    if (document.hidden) return true;
    if (typeof bgmState !== "undefined" && bgmState.muted) return true;
    if (window.__onestorePaused || window.__onestoreRingerSilent) return true;
    return false;
  }

  function ensureGraph() {
    if (isMuted()) return null;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!audioCtx) {
        audioCtx = new AC();
        compressor = audioCtx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-16, audioCtx.currentTime);
        compressor.knee.setValueAtTime(18, audioCtx.currentTime);
        compressor.ratio.setValueAtTime(6, audioCtx.currentTime);
        compressor.attack.setValueAtTime(0.004, audioCtx.currentTime);
        compressor.release.setValueAtTime(0.14, audioCtx.currentTime);

        masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(MASTER_VOLUME, audioCtx.currentTime);

        compressor.connect(masterGain);
        masterGain.connect(audioCtx.destination);
      }
      if (audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
      }
      return { ctx: audioCtx, out: compressor };
    } catch (e) {
      return null;
    }
  }

  function getNoiseBuffer(ctx) {
    if (cachedNoiseBuffer && cachedNoiseBuffer.sampleRate === ctx.sampleRate) {
      return cachedNoiseBuffer;
    }
    const len = Math.floor(ctx.sampleRate * 1.0);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    cachedNoiseBuffer = buf;
    return buf;
  }

  function canTrigger(key, cooldownMs = 28) {
    if (!key || cooldownMs <= 0) return true;
    const now = performance.now();
    const prev = lastTriggerMs.get(key) || 0;
    if (now - prev < cooldownMs) return false;
    lastTriggerMs.set(key, now);
    return true;
  }

  function unlock() {
    ensureGraph();
  }

  function setVolume(vol) {
    const v = Math.max(0, Math.min(1, Number(vol) || 0));
    if (masterGain && audioCtx) {
      try {
        masterGain.gain.setValueAtTime(v, audioCtx.currentTime);
      } catch (e) {}
    }
  }

  /**
   * 단일 오실레이터 톤(피치 슬라이드 / 딜레이 / 엔벨로프 지원)
   */
  function spawnTone(graph, opts) {
    const {
      freq = 440,
      dur = 0.14,
      type = "triangle",
      vol = 0.16,
      slideTo = null,
      slideMid = null,
      delay = 0,
      attack = 0.008,
      lowpass = 0
    } = opts || {};

    try {
      const { ctx, out } = graph;
      const t0 = ctx.currentTime + Math.max(0, delay);
      const tEnd = t0 + Math.max(0.02, dur);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(25, freq), t0);

      if (slideMid) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(25, slideMid), t0 + dur * 0.42);
      }
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(25, slideTo), tEnd);
      }

      const safeVol = Math.max(0.002, vol);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(safeVol, t0 + Math.min(dur * 0.45, attack));
      gain.gain.exponentialRampToValueAtTime(0.0005, tEnd);

      if (lowpass > 0) {
        const flt = ctx.createBiquadFilter();
        flt.type = "lowpass";
        flt.frequency.setValueAtTime(lowpass, t0);
        osc.connect(flt);
        flt.connect(gain);
      } else {
        osc.connect(gain);
      }

      gain.connect(out);
      osc.start(t0);
      osc.stop(tEnd + 0.02);
    } catch (e) {}
  }

  /**
   * 필터링된 화이트 노이즈 버스트(폭발, 파편, 카드 스윽, 타격 어택용)
   */
  function spawnNoise(graph, opts) {
    const {
      dur = 0.12,
      vol = 0.16,
      delay = 0,
      filterType = "bandpass",
      freqStart = 1200,
      freqEnd = 400,
      q = 1.4,
      attack = 0.006,
      offsetSec = -1
    } = opts || {};

    try {
      const { ctx, out } = graph;
      const t0 = ctx.currentTime + Math.max(0, delay);
      const tEnd = t0 + Math.max(0.02, dur);

      const src = ctx.createBufferSource();
      src.buffer = getNoiseBuffer(ctx);

      const flt = ctx.createBiquadFilter();
      flt.type = filterType;
      flt.Q.setValueAtTime(Math.max(0.2, q), t0);
      flt.frequency.setValueAtTime(Math.max(40, freqStart), t0);
      if (freqEnd && freqEnd !== freqStart) {
        flt.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), tEnd);
      }

      const gain = ctx.createGain();
      const safeVol = Math.max(0.002, vol);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(safeVol, t0 + Math.min(dur * 0.4, attack));
      gain.gain.exponentialRampToValueAtTime(0.0005, tEnd);

      src.connect(flt);
      flt.connect(gain);
      gain.connect(out);

      const maxStart = Math.max(0, src.buffer.duration - dur - 0.05);
      const bufStart = offsetSec >= 0 ? Math.min(maxStart, offsetSec) : Math.random() * maxStart;
      src.start(t0, bufStart, dur + 0.03);
      src.stop(tEnd + 0.02);
    } catch (e) {}
  }

  function scheduleSequence(graph, notes) {
    notes.forEach(n => {
      spawnTone(graph, n);
    });
  }

  // Legacy-compatible raw tone helper (기억하기 9패드 고유 음계 등)
  function tone(freq, dur = 0.16, type = "triangle", vol = 0.16, slideTo = null) {
    const graph = ensureGraph();
    if (!graph) return;
    spawnTone(graph, { freq, dur, type, vol, slideTo, attack: 0.012 });
  }

  // ── 1. UI 터치음: 클릭1 / 클릭2 ───────────────────────────────────────────
  // 클릭1: 가볍고 또렷한 선택/집기 ("틱")
  function click1() {
    if (!canTrigger("click1", 25)) return;
    const graph = ensureGraph();
    if (!graph) return;
    spawnTone(graph, { freq: 920, slideTo: 1380, dur: 0.042, type: "triangle", vol: 0.13, attack: 0.003 });
    spawnTone(graph, { freq: 1840, slideTo: 1520, dur: 0.024, type: "sine", vol: 0.06, attack: 0.002 });
  }

  // 클릭2: 배치·스왑·확인용 경쾌한 터치음 ("톡딱")
  function click2() {
    if (!canTrigger("click2", 25)) return;
    const graph = ensureGraph();
    if (!graph) return;
    spawnTone(graph, { freq: 620, slideTo: 930, dur: 0.048, type: "square", vol: 0.075, lowpass: 3400, attack: 0.003 });
    spawnTone(graph, { freq: 1240, slideTo: 1560, dur: 0.042, type: "triangle", vol: 0.09, delay: 0.022, attack: 0.003 });
  }

  // ── 2. 점프1 / 점프2 ───────────────────────────────────────────────────────
  // 점프1: 1단 점프
  function jump1() {
    if (!canTrigger("jump", 35)) return;
    const graph = ensureGraph();
    if (!graph) return;
    spawnTone(graph, { freq: 270, slideTo: 590, dur: 0.135, type: "square", vol: 0.075, lowpass: 2900, attack: 0.006 });
    spawnTone(graph, { freq: 290, slideTo: 650, dur: 0.14, type: "triangle", vol: 0.13, attack: 0.006 });
  }

  // 점프2: 2단 공중 회전 점프 (더 높고 반짝이는 상승 피치)
  function jump2() {
    if (!canTrigger("jump", 35)) return;
    const graph = ensureGraph();
    if (!graph) return;
    spawnTone(graph, { freq: 440, slideTo: 1020, dur: 0.15, type: "triangle", vol: 0.14, attack: 0.005 });
    spawnTone(graph, { freq: 660, slideTo: 1320, dur: 0.13, type: "square", vol: 0.065, delay: 0.024, lowpass: 3800, attack: 0.005 });
  }

  function jump(isDouble = false) {
    if (isDouble) jump2();
    else jump1();
  }

  // ── 3. 폭발음: 펑1 (소) / 펑2 (중) / 펑3 (대) ────────────────────────────
  function boom1() {
    if (!canTrigger("boom1", 32)) return;
    const graph = ensureGraph();
    if (!graph) return;
    spawnTone(graph, { freq: 210, slideTo: 58, dur: 0.125, type: "triangle", vol: 0.18, attack: 0.004 });
    spawnNoise(graph, { dur: 0.12, vol: 0.16, filterType: "bandpass", freqStart: 1200, freqEnd: 260, q: 1.1 });
  }

  function boom2() {
    if (!canTrigger("boom2", 45)) return;
    const graph = ensureGraph();
    if (!graph) return;
    spawnTone(graph, { freq: 185, slideTo: 42, dur: 0.21, type: "sawtooth", vol: 0.12, lowpass: 720, attack: 0.004 });
    spawnTone(graph, { freq: 135, slideTo: 36, dur: 0.22, type: "triangle", vol: 0.19, attack: 0.005 });
    spawnNoise(graph, { dur: 0.21, vol: 0.22, filterType: "lowpass", freqStart: 1700, freqEnd: 170, q: 0.9 });
  }

  function boom3() {
    if (!canTrigger("boom3", 70)) return;
    if (typeof window.triggerGameHaptic === "function") window.triggerGameHaptic("heavy");
    const graph = ensureGraph();
    if (!graph) return;
    spawnNoise(graph, { dur: 0.06, vol: 0.2, filterType: "highpass", freqStart: 2200, freqEnd: 1400, q: 0.8 });
    spawnTone(graph, { freq: 150, slideTo: 28, dur: 0.36, type: "sawtooth", vol: 0.15, lowpass: 620, attack: 0.004 });
    spawnTone(graph, { freq: 110, slideTo: 26, dur: 0.38, type: "triangle", vol: 0.24, attack: 0.005 });
    spawnNoise(graph, { dur: 0.36, vol: 0.28, filterType: "lowpass", freqStart: 1300, freqEnd: 95, q: 1.0, delay: 0.015 });
  }

  function boom(size = 1) {
    if (size >= 3) boom3();
    else if (size === 2) boom2();
    else boom1();
  }

  // ── 4. 탄성음: 바운스1 / 바운스2 ───────────────────────────────────────────
  // 바운스1: 벽·가벼운 반사 ("뾱")
  function bounce1() {
    if (!canTrigger("bounce1", 28)) return;
    const graph = ensureGraph();
    if (!graph) return;
    spawnTone(graph, { freq: 360, slideMid: 580, slideTo: 460, dur: 0.072, type: "sine", vol: 0.13, attack: 0.004 });
    spawnTone(graph, { freq: 720, slideTo: 540, dur: 0.045, type: "triangle", vol: 0.05, attack: 0.003 });
  }

  // 바운스2: 패들·방어막·몬스터 밟기 ("띠용!")
  function bounce2() {
    if (!canTrigger("bounce2", 30)) return;
    const graph = ensureGraph();
    if (!graph) return;
    spawnTone(graph, { freq: 245, slideMid: 620, slideTo: 490, dur: 0.115, type: "triangle", vol: 0.17, attack: 0.005 });
    spawnTone(graph, { freq: 490, slideTo: 790, dur: 0.095, type: "sine", vol: 0.1, delay: 0.014, attack: 0.005 });
  }

  function bounce(kind = 1) {
    if (kind >= 2) bounce2();
    else bounce1();
  }

  // ── 5. 타격·피격: 히트1 / 히트2 / 피격소리 ────────────────────────────────
  // 히트1: 경쾌한 타격 (단단한 벽돌 1타 / ?블록 머리박기)
  function hit1() {
    if (!canTrigger("hit1", 26)) return;
    const graph = ensureGraph();
    if (!graph) return;
    spawnTone(graph, { freq: 340, slideTo: 135, dur: 0.072, type: "square", vol: 0.09, lowpass: 2400, attack: 0.003 });
    spawnNoise(graph, { dur: 0.045, vol: 0.14, filterType: "bandpass", freqStart: 1900, freqEnd: 850, q: 1.5 });
  }

  // 히트2: 묵직한 충격 (초강력 철벽돌 / 압박 블록 줄 추가)
  function hit2() {
    if (!canTrigger("hit2", 32)) return;
    const graph = ensureGraph();
    if (!graph) return;
    spawnTone(graph, { freq: 165, slideTo: 54, dur: 0.105, type: "triangle", vol: 0.21, attack: 0.003 });
    spawnNoise(graph, { dur: 0.072, vol: 0.17, filterType: "lowpass", freqStart: 780, freqEnd: 160, q: 1.1 });
  }

  // 피격소리: 몬스터·유성 충돌, 라이프 차감, 스턴 페널티
  function hitDamage() {
    if (!canTrigger("hitDamage", 75)) return;
    if (typeof window.triggerGameHaptic === "function") window.triggerGameHaptic("medium");
    const graph = ensureGraph();
    if (!graph) return;
    spawnTone(graph, { freq: 235, slideTo: 66, dur: 0.22, type: "sawtooth", vol: 0.14, lowpass: 1450, attack: 0.004 });
    spawnTone(graph, { freq: 175, slideTo: 52, dur: 0.21, type: "square", vol: 0.08, delay: 0.025, lowpass: 900, attack: 0.005 });
    spawnNoise(graph, { dur: 0.17, vol: 0.21, filterType: "bandpass", freqStart: 1100, freqEnd: 170, q: 1.2 });
  }

  // ── 6. 파편·파괴: 크래쉬 / 벽돌 깨는 소리 ─────────────────────────────────
  // 크래쉬: 실드 방어 파손 / 대형 특수블록 폭발 잔해
  function crash() {
    if (!canTrigger("crash", 55)) return;
    const graph = ensureGraph();
    if (!graph) return;
    spawnNoise(graph, { dur: 0.19, vol: 0.23, filterType: "highpass", freqStart: 2100, freqEnd: 950, q: 0.9 });
    spawnNoise(graph, { dur: 0.11, vol: 0.16, filterType: "bandpass", freqStart: 4200, freqEnd: 1800, q: 1.8, delay: 0.035 });
    spawnTone(graph, { freq: 640, slideTo: 190, dur: 0.11, type: "square", vol: 0.075, lowpass: 3000, attack: 0.003 });
  }

  // 벽돌 깨는 소리: 파각! + 콤보에 따른 경쾌한 상승 파편음
  function brickBreak(combo = 1) {
    if (!canTrigger("brickBreak", 24)) return;
    const graph = ensureGraph();
    if (!graph) return;
    const lift = Math.min(10, Math.max(0, combo - 1)) * 45;
    spawnTone(graph, { freq: 480 + lift, slideTo: 165, dur: 0.068, type: "square", vol: 0.085, lowpass: 2800, attack: 0.003 });
    spawnNoise(graph, { dur: 0.11, vol: 0.18, filterType: "bandpass", freqStart: 2700 + lift * 2, freqEnd: 900, q: 1.4 });
    spawnTone(graph, { freq: 740 + lift * 1.4, slideTo: 980 + lift * 1.4, dur: 0.065, type: "triangle", vol: 0.09, delay: 0.022, attack: 0.003 });
  }

  // ── 7. 카드 뒤집는 소리 ("스윽") ──────────────────────────────────────────
  function cardFlip() {
    if (!canTrigger("cardFlip", 30)) return;
    const graph = ensureGraph();
    if (!graph) return;
    spawnNoise(graph, {
      dur: 0.078,
      vol: 0.16,
      filterType: "bandpass",
      freqStart: 780,
      freqEnd: 2650,
      q: 1.7,
      attack: 0.012
    });
    spawnTone(graph, { freq: 620, slideTo: 890, dur: 0.036, type: "triangle", vol: 0.07, delay: 0.028, attack: 0.003 });
  }

  // ── 8. 피버! / 스테이지 클리어 팡파르 / 파워업 / 코인 / 콤보팝 / 오답 ─────
  // 피버!: 텐션 폭발 8비트 상승 아르페지오
  function fever() {
    if (!canTrigger("fever", 140)) return;
    const graph = ensureGraph();
    if (!graph) return;
    const freqs = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.51];
    freqs.forEach((f, idx) => {
      const d = idx * 0.048;
      const dur = idx === freqs.length - 1 ? 0.24 : 0.085;
      spawnTone(graph, { freq: f, dur, type: "square", vol: 0.08, delay: d, lowpass: 4200, attack: 0.005 });
      spawnTone(graph, { freq: f * 0.5, dur, type: "triangle", vol: 0.12, delay: d, attack: 0.005 });
    });
  }

  // 다음 스테이지 통과 / 라운드 클리어 팡파르
  function stageClear() {
    if (!canTrigger("stageClear", 180)) return;
    if (typeof window.triggerGameHaptic === "function") window.triggerGameHaptic("success");
    const graph = ensureGraph();
    if (!graph) return;
    const melody = [
      { f: 523.25, d: 0.0, len: 0.09 },
      { f: 659.25, d: 0.072, len: 0.09 },
      { f: 783.99, d: 0.144, len: 0.09 },
      { f: 1046.5, d: 0.216, len: 0.11 },
      { f: 1318.51, d: 0.305, len: 0.32 }
    ];
    melody.forEach(step => {
      spawnTone(graph, { freq: step.f, dur: step.len, type: "square", vol: 0.085, delay: step.d, lowpass: 4500, attack: 0.006 });
      spawnTone(graph, { freq: step.f * 0.5, dur: step.len, type: "triangle", vol: 0.12, delay: step.d, attack: 0.006 });
    });
    spawnTone(graph, { freq: 783.99, dur: 0.32, type: "triangle", vol: 0.1, delay: 0.305, attack: 0.01 });
  }

  // 실드 / 패들 확장 / 특수 파워업 획득
  function powerup() {
    if (!canTrigger("powerup", 80)) return;
    const graph = ensureGraph();
    if (!graph) return;
    [440, 554.37, 659.25, 880, 1108.73].forEach((f, idx) => {
      spawnTone(graph, { freq: f, dur: 0.11, type: "triangle", vol: 0.13, delay: idx * 0.044, attack: 0.005 });
    });
  }

  // 오락실 동전 / 보석 수집 (레트로 8비트 2단 차임)
  function coin() {
    if (!canTrigger("coin", 38)) return;
    const graph = ensureGraph();
    if (!graph) return;
    scheduleSequence(graph, [
      { freq: 987.77, dur: 0.075, type: "square", vol: 0.08, lowpass: 4200, attack: 0.004 },
      { freq: 1318.51, dur: 0.19, type: "square", vol: 0.085, delay: 0.064, lowpass: 4200, attack: 0.004 },
      { freq: 1318.51, dur: 0.18, type: "triangle", vol: 0.09, delay: 0.064, attack: 0.004 }
    ]);
  }

  // 콤보 상승 팝 (펜타토닉 음계 기반 상승으로 고콤보에서도 듣기 좋음)
  function pop(combo = 1) {
    if (!canTrigger("pop", 26)) return;
    const graph = ensureGraph();
    if (!graph) return;
    const scale = [392.0, 440.0, 493.88, 523.25, 587.33, 659.25, 739.99, 783.99, 880.0, 987.77, 1046.5, 1174.66, 1318.51];
    const idx = Math.max(0, Math.min(scale.length - 1, Math.floor(Number(combo) || 1) - 1));
    const pitch = scale[idx];
    spawnTone(graph, { freq: pitch, slideTo: pitch * 1.24, dur: 0.11, type: "sine", vol: 0.15, attack: 0.005 });
    spawnTone(graph, { freq: pitch * 1.5, dur: 0.075, type: "triangle", vol: 0.065, delay: 0.015, attack: 0.004 });
  }

  // 오답/불발 버저 ("땡!")
  function wrong() {
    if (!canTrigger("wrong", 55)) return;
    const graph = ensureGraph();
    if (!graph) return;
    spawnTone(graph, { freq: 210, slideTo: 165, dur: 0.09, type: "sawtooth", vol: 0.09, lowpass: 1350, attack: 0.004 });
    spawnTone(graph, { freq: 155, slideTo: 112, dur: 0.14, type: "sawtooth", vol: 0.1, delay: 0.075, lowpass: 1100, attack: 0.005 });
  }

  // 이름 기반 호출 도우미 (콘솔 테스트/프리셋 연동용)
  const presets = {
    click1,
    click2,
    jump1,
    jump2,
    boom1,
    boom2,
    boom3,
    bounce1,
    bounce2,
    hit1,
    hit2,
    hitDamage,
    crash,
    brickBreak,
    cardFlip,
    fever,
    stageClear,
    powerup,
    coin,
    pop,
    wrong
  };

  function play(name, ...args) {
    const fn = presets[name];
    if (typeof fn === "function") fn(...args);
  }

  return {
    unlock,
    setVolume,
    tone,
    click1,
    click2,
    jump1,
    jump2,
    jump,
    boom1,
    boom2,
    boom3,
    boom,
    bounce1,
    bounce2,
    bounce,
    hit1,
    hit2,
    hitDamage,
    hit: hitDamage,
    crash,
    brickBreak,
    cardFlip,
    fever,
    stageClear,
    clear: stageClear,
    powerup,
    coin,
    pop,
    wrong,
    play,
    presets
  };
})();
