// ============================================================================
// [음악왕 v4.0] 메인 게임 엔진 (app.js)
// - 기본 폰트: 기본 고딕 적용
// - 모바일 키보드 올라올 때 visualViewport 연동으로 문제 가림 현상 완벽 해결
// - 첫 터치 시 모바일 주소창 자동 숨김(Fullscreen) 트리거
// ============================================================================

const state = {
  decades: new Set(["1990s", "2000s", "2010s", "2020s"]),
  mode: "behind",
  stage: 1,
  questionLimit: 10,
  quizDifficulty: "normal",
  timeAttack: false,
  hardMode: false,

  pool: [],
  currentIndex: 0,
  score: 0,
  streak: 0,
  hearts: 5,
  history: [],

  currentQ: null,
  usedHintLetter: false,
  usedHintKeyword: false,
  usedHintAudio: false,
  usedWrongDelCount: 0,
  wrongDelCooldownUntil: 0,
  wrongDelTimerId: null,
  currentChoices: null,
  pickedArtist: null,
  pickedTitle: null,
  questionEnded: false,
  usedItemsInRun: new Set(),
  item3SecActivatedQIdx: null,
  isUsing3Sec: false,
  doubleAttackActive: false,
  revivedInRun: false,

  timerInterval: null,
  timeLeftMs: 15000,
  maxTimeMs: 15000,

  audioEl: new Audio(),
  audioStopTimer: null,
  audioRequestSeq: 0,
  audioUnlocked: false,
  audioPending: false,
  itunesCache: new Map(),
  oneSecOffsetIndex: 0,
  resultPlayingIndex: null,
  currentScreen: "loginScreen",
  autoFullscreenTried: false
};

state.audioEl.crossOrigin = "anonymous";
state.audioEl.volume = 0.85;

// 모바일 핀치줌·바디 스크롤 차단 & 초기 고정 높이 선점
document.addEventListener("gesturestart", e => e.preventDefault(), { passive: false });
document.addEventListener(
  "touchmove",
  e => {
    const scrollable = e.target.closest(
      ".question-content, .judge-note-box, .history-scroll-box, .modal-content, .md-preview-scroll, .setup-card, .shop-grid, .apf-tile-grid, .shop-multibuy-list, #roomChatLog, .fishing-chat-log, .fishing-online-users-list, .kakao-friend-list, .kakao-chat-messages, .dm-emoji-grid, .arcade-lobby-scroll, .arcade-match-board, .arcade-csort-shelves, .arcade-rank-game-tabs, body.keyboard-open #loginScreen .home-hero, textarea, input[type='range']"
    );
    if (!scrollable) {
      e.preventDefault();
    }
  },
  { passive: false }
);

function isTextInputElement(el) {
  if (!el) return false;
  if (el.isContentEditable) return true;
  if (el.tagName === "TEXTAREA") return !el.readOnly && !el.disabled;
  if (el.tagName !== "INPUT") return false;
  const nonTextTypes = new Set([
    "checkbox",
    "radio",
    "button",
    "submit",
    "reset",
    "range",
    "file",
    "image",
    "hidden",
    "color"
  ]);
  return !nonTextTypes.has(String(el.type || "text").toLowerCase()) && !el.readOnly && !el.disabled;
}

function getPreferredAppViewportSize() {
  const vv = window.visualViewport;
  const w = Math.round(vv ? vv.width : window.innerWidth);
  const innerH = Math.round(window.innerHeight || 0);
  const vvH = Math.round(vv ? vv.height : innerH);
  return {
    w,
    innerH,
    vvH,
    maxH: Math.max(innerH, vvH),
    vv
  };
}

// 초기 스크립트 평가 즉시 가상키보드 오버레이 활성화 & 고정 px 높이 적용 (100vh/dvh 리사이즈 방어)
if ("virtualKeyboard" in navigator) {
  try {
    navigator.virtualKeyboard.overlaysContent = true;
  } catch (e) {}
}
(function prelockInitialAppHeight() {
  const dims = getPreferredAppViewportSize();
  if (dims.maxH > 200) {
    document.documentElement.style.setProperty("--app-locked-h", `${dims.maxH}px`);
  }
})();

// 상점 그리드 고스트 스크롤 (스크롤할 때만 얇은 스크롤바 표시)
document.addEventListener("DOMContentLoaded", () => {
  const shopGrid = document.getElementById("shopItemsGrid");
  if (shopGrid) {
    let scrollTimer = null;
    shopGrid.addEventListener("scroll", () => {
      shopGrid.classList.add("is-scrolling");
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => shopGrid.classList.remove("is-scrolling"), 750);
    }, { passive: true });
  }
});

// Standalone/APK 앱 모드인지 판별 (앱 모드 및 일반 터치 시 크롬의 '전체 화면 종료 스와이프 도움말' 토스트가 강제 노출되지 않도록 자동 requestFullscreen 제거)
function isRunningAsApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.navigator.standalone === true ||
    document.referrer.includes("android-app://")
  );
}

// ============================================================================
// 모바일 웹뷰(원스토어 H5 포함) 가상 키보드 리사이즈·화면 밀림·배경 찌그러짐 원천 차단
// ============================================================================
function setupMobileKeyboardViewportHandler() {
  const shell = document.querySelector(".app-shell");
  if (!shell) return;

  if ("virtualKeyboard" in navigator) {
    try {
      navigator.virtualKeyboard.overlaysContent = true;
    } catch (e) {}
  }

  const initialDims = getPreferredAppViewportSize();
  let lockedWidth = initialDims.w;
  let lockedHeight = initialDims.maxH || 700;
  let lastTextBlurAt = 0;
  let prevKbOpen = false;
  let prevKbHeight = 0;
  let rootScrollClampQueued = false;
  let nativeKbHeight = 0;
  let hasNativeKbListener = false;

  const resetRootScroll = () => {
    if (window.scrollX !== 0 || window.scrollY !== 0) {
      window.scrollTo(0, 0);
    }
    if (document.documentElement && document.documentElement.scrollTop !== 0) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body && document.body.scrollTop !== 0) {
      document.body.scrollTop = 0;
    }
    if (shell.scrollTop !== 0) {
      shell.scrollTop = 0;
    }
    document
      .querySelectorAll(
        "#fishingScreen, .fishing-stage-area, .fishing-chat-panel, .kakao-chat-room, .kakao-screen-card, #battleRoomScreen, #battleRoomScreen > .card, #dmChatScreen, #gameScreen, #battlePlayScreen"
      )
      .forEach(el => {
        if (el.scrollTop !== 0) el.scrollTop = 0;
      });
  };

  const scrollActiveChatToBottom = () => {
    if (state.currentScreen === "fishingScreen") {
      const chatLog = document.getElementById("fishingChatLog");
      if (chatLog) chatLog.scrollTop = chatLog.scrollHeight;
    } else if (state.currentScreen === "dmChatScreen") {
      const dmList = document.getElementById("dmChatMessages");
      if (dmList) dmList.scrollTop = dmList.scrollHeight;
    } else if (state.currentScreen === "battleRoomScreen") {
      const roomChat = document.getElementById("roomChatLog");
      if (roomChat) roomChat.scrollTop = roomChat.scrollHeight;
    }
  };

  const clearLegacyFloatStyles = selector => {
    const box = document.querySelector(selector);
    if (!box) return;
    delete box.dataset.kbLiftPx;
    if (box.style.transform) box.style.transform = "";
  };

  const updateViewport = () => {
    const dims = getPreferredAppViewportSize();
    const activeEl = document.activeElement;
    const isInputFocused = isTextInputElement(activeEl);
    const vkRect = navigator.virtualKeyboard && navigator.virtualKeyboard.boundingRect;
    const vkHeight = vkRect && vkRect.height > 0 ? Math.round(vkRect.height) : 0;

    if (Math.abs(dims.w - lockedWidth) > 20) {
      lockedWidth = dims.w;
      lockedHeight = dims.maxH || lockedHeight;
    } else if (dims.maxH > lockedHeight) {
      lockedHeight = dims.maxH;
    } else if (!isInputFocused && vkHeight === 0 && nativeKbHeight === 0 && Date.now() - lastTextBlurAt > 500) {
      const shrinkDelta = lockedHeight - dims.maxH;
      const isLikelyDesktop = !("ontouchstart" in window) && (navigator.maxTouchPoints || 0) === 0;
      if ((shrinkDelta > 0 && shrinkDelta < 110) || (isLikelyDesktop && shrinkDelta > 0)) {
        lockedHeight = dims.maxH;
      }
    }

    const vvShrink = dims.vv ? Math.max(0, lockedHeight - dims.vvH) : 0;
    const innerShrink = Math.max(0, lockedHeight - dims.innerH);
    const vvOffsetTop = dims.vv ? Math.max(0, Math.round(dims.vv.offsetTop || 0)) : 0;
    const vvFixedLift = dims.vv ? Math.max(0, Math.round(dims.innerH - (vvOffsetTop + dims.vvH))) : 0;
    const rawKbHeight = Math.max(nativeKbHeight, vkHeight, vvShrink, innerShrink);
    const isKbOpen = rawKbHeight > 70 || (isInputFocused && rawKbHeight > 45);
    const effectiveKb = isKbOpen ? rawKbHeight : 0;
    // 브라우저/원스토어 H5 웹뷰가 adjustResize로 innerHeight를 이미 줄인 경우 position:fixed 이중 상승 차단
    const isAdjustResize = innerShrink > 50;
    const overlayKb = isAdjustResize ? 0 : Math.max(nativeKbHeight, vkHeight);
    const fixedKbBottom = isKbOpen ? Math.max(vvFixedLift, overlayKb) : 0;

    // 1) 전체 배경 · 쉘 · 낚시터 무대 높이를 고정 px(--app-locked-h)로 유지
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty("--app-locked-h", `${lockedHeight}px`);
    rootStyle.setProperty("--kb-height", `${effectiveKb}px`);
    rootStyle.setProperty("--kb-fixed-bottom", `${fixedKbBottom}px`);

    const safeOffsetTop = vvOffsetTop;
    shell.style.top = `${safeOffsetTop}px`;
    shell.style.height = `${lockedHeight}px`;

    const fishingStageArea = document.getElementById("fishingStageArea");
    if (fishingStageArea) {
      if (state.currentScreen === "fishingScreen") {
        fishingStageArea.style.flex = "none";
        fishingStageArea.style.height = `${Math.round(lockedHeight * 0.56)}px`;
      } else {
        fishingStageArea.style.flex = "";
        fishingStageArea.style.height = "";
      }
    }

    // 2) 어떤 키보드(천지인 3×4, 쿼티, Gboard 등)에서도 활성 입력창이 키보드 바로 위 고정 도킹
    const activeInsideModal = Boolean(activeEl && activeEl.closest(".modal-backdrop"));
    document.body.classList.toggle("keyboard-open", isKbOpen);

    let activeFloatEl = null;

    const fishingInputBar = document.getElementById("fishingInputBar");
    if (fishingInputBar) {
      const floatFishing = isKbOpen && state.currentScreen === "fishingScreen" && !activeInsideModal;
      fishingInputBar.classList.toggle("is-kb-floating", floatFishing);
      if (floatFishing) activeFloatEl = fishingInputBar;
    }

    const dmInputBar = document.querySelector("#dmChatScreen .kakao-chat-inputbar");
    if (dmInputBar) {
      const floatDm = isKbOpen && state.currentScreen === "dmChatScreen" && !activeInsideModal;
      dmInputBar.classList.toggle("is-kb-floating", floatDm);
      if (floatDm) activeFloatEl = dmInputBar;
    }

    const roomInputBar = document.querySelector("#battleRoomScreen .room-chat-inputbar");
    if (roomInputBar) {
      const floatRoom = isKbOpen && state.currentScreen === "battleRoomScreen" && !activeInsideModal;
      roomInputBar.classList.toggle("is-kb-floating", floatRoom);
      if (floatRoom) activeFloatEl = roomInputBar;
    }

    clearLegacyFloatStyles("#gameScreen .answer-area");
    clearLegacyFloatStyles("#battlePlayInputBox");

    const singleAnswerArea = document.querySelector("#gameScreen .answer-area");
    if (singleAnswerArea) {
      const shouldFloatSingle =
        isKbOpen &&
        isInputFocused &&
        state.currentScreen === "gameScreen" &&
        state.quizDifficulty === "hard" &&
        !activeInsideModal &&
        effectiveKb > 0;
      singleAnswerArea.classList.toggle("is-kb-floating", shouldFloatSingle);
      if (shouldFloatSingle) activeFloatEl = singleAnswerArea;
    }

    const battleInputBox = document.getElementById("battlePlayInputBox");
    if (battleInputBox) {
      const isBattleHard = typeof window.isCurrentBattleHardMode === "function" ? window.isCurrentBattleHardMode() : false;
      const shouldFloatBattle =
        isKbOpen &&
        isInputFocused &&
        state.currentScreen === "battlePlayScreen" &&
        isBattleHard &&
        !activeInsideModal &&
        effectiveKb > 0;
      battleInputBox.classList.toggle("is-kb-floating", shouldFloatBattle);
      if (shouldFloatBattle) activeFloatEl = battleInputBox;
    }

    const floatBarH = activeFloatEl ? Math.max(48, Math.round(activeFloatEl.offsetHeight || 54)) : 60;
    const floatPadPx = isKbOpen ? effectiveKb + floatBarH + 10 : 8;
    rootStyle.setProperty("--kb-float-pad", `${floatPadPx}px`);

    const visibleBottom = lockedHeight - effectiveKb - 10;
    if (isKbOpen && !activeInsideModal && state.currentScreen === "loginScreen" && isInputFocused) {
      const loginHero = document.querySelector("#loginScreen .home-hero");
      if (loginHero && activeEl) {
        const inpRect = activeEl.getBoundingClientRect();
        if (inpRect.bottom > visibleBottom) {
          loginHero.scrollTop += Math.round(inpRect.bottom - visibleBottom + 14);
        }
      }
    }

    if (isKbOpen && (!prevKbOpen || Math.abs(effectiveKb - prevKbHeight) > 8)) {
      scrollActiveChatToBottom();
      setTimeout(scrollActiveChatToBottom, 60);
    }
    prevKbOpen = isKbOpen;
    prevKbHeight = effectiveKb;

    resetRootScroll();
  };

  window.syncFishingViewportLock = updateViewport;

  const scheduleBurstUpdate = () => {
    updateViewport();
    requestAnimationFrame(updateViewport);
    [40, 120, 240, 400].forEach(delay => setTimeout(updateViewport, delay));
  };

  const bindCapacitorKeyboardPlugin = () => {
    const kbPlugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Keyboard;
    if (!kbPlugin || hasNativeKbListener || typeof kbPlugin.addListener !== "function") return;
    hasNativeKbListener = true;
    const onNativeShow = info => {
      const h = Math.round(Number(info && info.keyboardHeight) || 0);
      if (h > 0) {
        nativeKbHeight = h;
        scheduleBurstUpdate();
      }
    };
    const onNativeHide = () => {
      nativeKbHeight = 0;
      scheduleBurstUpdate();
    };
    try { kbPlugin.addListener("keyboardWillShow", onNativeShow); } catch (e) {}
    try { kbPlugin.addListener("keyboardDidShow", onNativeShow); } catch (e) {}
    try { kbPlugin.addListener("keyboardWillHide", onNativeHide); } catch (e) {}
    try { kbPlugin.addListener("keyboardDidHide", onNativeHide); } catch (e) {}
  };
  bindCapacitorKeyboardPlugin();
  setTimeout(bindCapacitorKeyboardPlugin, 500);

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", updateViewport);
    window.visualViewport.addEventListener("scroll", updateViewport);
  }
  if ("virtualKeyboard" in navigator && typeof navigator.virtualKeyboard.addEventListener === "function") {
    navigator.virtualKeyboard.addEventListener("geometrychange", scheduleBurstUpdate);
  }
  window.addEventListener("resize", updateViewport);
  window.addEventListener("orientationchange", scheduleBurstUpdate);

  // 모바일 웹뷰의 focus-reveal 자동 스크롤을 매 프레임 원천 복원
  const onAnyScroll = e => {
    const tgt = e && e.target;
    if (
      tgt === window ||
      tgt === document ||
      tgt === document.documentElement ||
      tgt === document.body ||
      tgt === shell
    ) {
      resetRootScroll();
      if (!rootScrollClampQueued) {
        rootScrollClampQueued = true;
        requestAnimationFrame(() => {
          rootScrollClampQueued = false;
          resetRootScroll();
        });
      }
    }
  };
  window.addEventListener("scroll", onAnyScroll, { passive: true });
  document.addEventListener("scroll", onAnyScroll, true);

  document.addEventListener("focusin", e => {
    if (isTextInputElement(e.target)) {
      bindCapacitorKeyboardPlugin();
      resetRootScroll();
      scheduleBurstUpdate();
    }
  });
  document.addEventListener("focusout", e => {
    if (isTextInputElement(e.target)) {
      lastTextBlurAt = Date.now();
      setTimeout(() => {
        if (!isTextInputElement(document.activeElement)) {
          nativeKbHeight = 0;
        }
        updateViewport();
      }, 90);
      setTimeout(updateViewport, 260);
    }
  });

  updateViewport();
}

function safeOn(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

window.closeAllModals = function () {
  if (typeof window.stopSelfAdCountdownTimer === "function") {
    window.stopSelfAdCountdownTimer();
  }
  document.querySelectorAll(".modal-backdrop:not(#customDialogModal)").forEach(m => m.classList.add("hidden"));
  const confettiCv = document.getElementById("confettiCanvas");
  if (confettiCv) confettiCv.classList.add("hidden");
};

window.openModal = function (id) {
  window.closeAllModals();
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove("hidden");
    armAppBackGuard(false);
  }
};

window.closeModal = function (id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("hidden");
  if (id !== "adminGiftPopupModal" && typeof tryShowPendingAdminGiftPopup === "function") {
    setTimeout(() => tryShowPendingAdminGiftPopup(), 240);
  }
};

window.openMultiModeSelect = function () {
  openModal("multiModeSelectModal");
};

window.selectSinglePlay = function () {
  closeModal("multiModeSelectModal");
  showSetup();
};

window.selectMultiRoomMode = function (roomType = "ALL") {
  closeModal("multiModeSelectModal");
  if (typeof plazaState !== "undefined") {
    plazaState.roomFilter = ["1v1", "4p", "ALL"].includes(roomType) ? roomType : "ALL";
  }
  if (typeof enterPlazaScreen === "function") {
    enterPlazaScreen();
  }
};

window.openRankingModal = function () {
  switchScreen("rankingScreen");
  if (typeof loadRankingsList === "function") loadRankingsList();
};

// 기본 폰트: 기본 고딕 (토글 시 도트 폰트와 전환)
window.toggleFontStyle = function () {
  document.body.classList.toggle("use-pixel-font");
  const isPixel = document.body.classList.contains("use-pixel-font");
  const statusEl = document.getElementById("fontStyleStatus");
  if (statusEl) statusEl.textContent = isPixel ? "도트 폰트" : "기본 고딕 (기본)";
};

window.toggleFullscreenMode = function () {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
};

// ============================================================================
// 모바일 물리 '뒤로가기' 종료 · 로그인 회귀 방지 · 백그라운드 사운드 완전 정지
// ============================================================================
let allowAppExit = false;
let appExited = false;
let hasBackGuardPushed = false;

function resetHistoryToExitBase() {
  hasBackGuardPushed = false;
  try {
    history.replaceState({ mkRole: "exit_base", mkScreen: state.currentScreen, ts: Date.now() }, "");
  } catch (e) {}
}

window.resetHistoryToExitBase = resetHistoryToExitBase;

window.isCapacitorNativeApp = function () {
  const cap = window.Capacitor;
  return Boolean(cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform());
};

window.armAppBackGuard = function (forceWithGesture = false) {
  if (appExited || hasBackGuardPushed || state.currentScreen === "loginScreen") return;
  if (window.isCapacitorNativeApp()) return;
  const hasActivation =
    forceWithGesture || (typeof navigator !== "undefined" && navigator.userActivation && navigator.userActivation.hasBeenActive);
  if (!hasActivation) return;
  try {
    history.replaceState({ mkRole: "exit_base", mkScreen: state.currentScreen, ts: Date.now() }, "");
    history.pushState({ mkRole: "app_guard", mkScreen: state.currentScreen, ts: Date.now() }, "");
    hasBackGuardPushed = true;
  } catch (e) {}
};

function getAllBgmAudios() {
  return [
    bgmState.mainAudio,
    bgmState.shopAudio,
    bgmState.fishAudio,
    bgmState.arcadeLobbyAudio,
    bgmState.arcadeGameAudio
  ].filter(Boolean);
}

function pauseBgmAudios(exceptAudio = null) {
  getAllBgmAudios().forEach(audio => {
    if (audio === exceptAudio) return;
    try {
      audio.pause();
    } catch (e) {}
  });
}

function stopAllAppAudio(releaseSources = false) {
  stopAudio();
  stopTimeAttackTimer();
  try {
    pauseBgmAudios(null);
    if (releaseSources) {
      getAllBgmAudios().forEach(audio => {
        try {
          audio.currentTime = 0;
          audio.removeAttribute("src");
          audio.load();
        } catch (e) {}
      });
      bgmState.arcadeGameSrc = "";
    }
    (bgmState.clickPool || []).forEach(a => {
      try {
        a.pause();
        a.currentTime = 0;
      } catch (e) {}
    });
    if (releaseSources && state.audioEl) {
      state.audioEl.currentTime = 0;
      state.audioEl.removeAttribute("src");
      state.audioEl.load();
    }
    if (releaseSources && bgmState.clickCtx) {
      bgmState.clickCtx.close().catch(() => {});
      bgmState.clickCtx = null;
      bgmState.clickBuf = null;
    }
  } catch (e) {}
}
window.stopAllAppAudio = stopAllAppAudio;

window.triggerGameHaptic = function (kind = "light") {
  if (typeof appExited !== "undefined" && appExited) return;
  try {
    if (!window.isCapacitorNativeApp()) return;
    const haptics = window.Capacitor?.Plugins?.Haptics;
    if (!haptics) return;
    if (kind === "success" || kind === "warning" || kind === "error") {
      if (typeof haptics.notification === "function") {
        haptics.notification({ type: kind.toUpperCase() }).catch(() => {});
        return;
      }
    }
    const impactMap = { light: "LIGHT", medium: "MEDIUM", heavy: "HEAVY" };
    const style = impactMap[kind] || "LIGHT";
    if (typeof haptics.impact === "function") {
      haptics.impact({ style }).catch(() => {});
    }
  } catch (e) {}
};

function applyCapacitorImmersiveMode() {
  try {
    if (!window.isCapacitorNativeApp()) return;
    const sysBars = window.Capacitor?.Plugins?.SystemBars;
    if (sysBars && typeof sysBars.setVisible === "function") {
      sysBars.setVisible({ statusBar: false, navigationBar: false }).catch(() => {});
    }
    if (sysBars && typeof sysBars.setStyle === "function") {
      sysBars.setStyle({ style: "DARK" }).catch(() => {});
    }
  } catch (e) {}
}

let capacitorNativeBridgeReady = false;
function initCapacitorNativeBridge() {
  if (capacitorNativeBridgeReady) return;
  if (!window.isCapacitorNativeApp()) return;
  const cap = window.Capacitor;
  capacitorNativeBridgeReady = true;

  applyCapacitorImmersiveMode();
  try {
    cap.Plugins?.SplashScreen?.hide({ fadeOutDuration: 240 }).catch(() => {});
  } catch (e) {}

  const appPlugin = cap.Plugins?.App;
  if (appPlugin && typeof appPlugin.addListener === "function") {
    try {
      appPlugin.addListener("backButton", () => {
        if (typeof window.processInAppBackStep === "function") {
          window.processInAppBackStep(false);
        }
      });
    } catch (e) {}

    try {
      appPlugin.addListener("appStateChange", stateInfo => {
        if (stateInfo && stateInfo.isActive) {
          applyCapacitorImmersiveMode();
          if (typeof recoverAppForegroundState === "function") {
            recoverAppForegroundState();
          }
        } else {
          if (typeof handleFishingVisibilityChange === "function") {
            handleFishingVisibilityChange(true);
          }
          stopAllAppAudio(false);
        }
      });
    } catch (e) {}
  }

  let lastOfflineWarnAt = 0;
  window.addEventListener("offline", () => {
    const now = Date.now();
    if (now - lastOfflineWarnAt < 6000) return;
    lastOfflineWarnAt = now;
    if (typeof gameAlert === "function") {
      gameAlert("인터넷 연결이 끊어졌습니다.\nWi-Fi 또는 모바일 데이터를 확인한 뒤 다시 시도해주세요.", "📡 네트워크 연결 확인");
    }
  });
}

function performCleanAppExit() {
  appExited = true;
  allowAppExit = true;
  hasBackGuardPushed = false;

  if (typeof cleanupFishingRuntime === "function") cleanupFishingRuntime(true);
  stopAllAppAudio(true);
  try {
    if (typeof stopGlobalOnlinePresence === "function") stopGlobalOnlinePresence();
    if (typeof stopGlobalDmNotiListener === "function") stopGlobalDmNotiListener();
    if (typeof stopDmRealtime === "function") stopDmRealtime();
  } catch (e) {}

  if (!document.getElementById("appExitedOverlay")) {
    const overlay = document.createElement("div");
    overlay.id = "appExitedOverlay";
    overlay.className = "app-exited-overlay";
    overlay.innerHTML =
      `<div style="font-size:2.4rem;">👑</div><h2 style="font-size:1.18rem; font-weight:900;">음악왕이 종료되었습니다</h2><p style="font-size:0.86rem; color:#94a3b8; line-height:1.5;">모든 사운드와 연결이 정지되었습니다.<br/>앱 또는 브라우저 창을 닫아주세요.</p>`;
    document.body.appendChild(overlay);
  }

  try {
    if (window.isCapacitorNativeApp()) {
      const capApp = window.Capacitor?.Plugins?.App;
      if (capApp && typeof capApp.exitApp === "function") {
        capApp.exitApp();
        return;
      }
    }
  } catch (e) {}

  try {
    if (window.onestoreSdk && typeof window.onestoreSdk.isSupported === "function" && window.onestoreSdk.isSupported()) {
      window.onestoreSdk.quit();
      return;
    }
  } catch (e) {}

  try {
    window.close();
  } catch (e) {}
  try {
    if (window.history.state && window.history.state.mkRole === "app_guard") {
      history.back();
    }
  } catch (e) {}
}

window.openAdminBackendPage = function () {
  if (typeof closeModal === "function") closeModal("settingsModal");
  location.replace("admin.html?v=25.0");
};

const PATCH_NOTES_LATEST_VERSION = "v25.0";
const PATCH_NOTES_SEEN_STORAGE_KEY = "mk_seen_patch_version";

window.syncPatchNotesNotiDot = function () {
  const dot = document.getElementById("patchNotesNotiDot");
  if (!dot) return;
  let seenVer = "";
  try {
    seenVer = localStorage.getItem(PATCH_NOTES_SEEN_STORAGE_KEY) || "";
  } catch (e) {}
  dot.classList.toggle("hidden", seenVer === PATCH_NOTES_LATEST_VERSION);
};

window.openPatchNotesModal = function () {
  try {
    localStorage.setItem(PATCH_NOTES_SEEN_STORAGE_KEY, PATCH_NOTES_LATEST_VERSION);
  } catch (e) {}
  window.syncPatchNotesNotiDot();
  if (typeof openModal === "function") {
    openModal("patchNotesModal");
  }
};

window.processInAppBackStep = function (fromOnestore = false) {
  if (appExited || allowAppExit) {
    stopAllAppAudio(true);
    return false;
  }

  if (!fromOnestore) {
    hasBackGuardPushed = false;
  }

  const tutOv = document.getElementById("v32TutorialOverlay");
  if (tutOv && !tutOv.classList.contains("hidden") && typeof finishV32Tutorial === "function") {
    finishV32Tutorial(true);
    if (!fromOnestore) armAppBackGuard(true);
    return true;
  }

  const dialog = document.getElementById("customDialogModal");
  if (dialog && !dialog.classList.contains("hidden")) {
    if (dialog.dataset.isExitConfirm === "true") {
      // 종료 확인 창이 열린 상태에서 뒤로가기를 한 번 더 누르면 모달만 닫지 않고 종료를 원할 수 있으므로 확인창 유지/재무장
      dialog.classList.add("hidden");
      delete dialog.dataset.isExitConfirm;
      if (!fromOnestore) armAppBackGuard(true);
      return true;
    }
    dialog.classList.add("hidden");
    if (!fromOnestore) armAppBackGuard(true);
    return true;
  }

  const openModals = Array.from(document.querySelectorAll(".modal-backdrop:not(.hidden)"));
  if (openModals.length > 0) {
    window.closeAllModals();
    if (!fromOnestore) armAppBackGuard(true);
    return true;
  }

  if (state.currentScreen === "battlePlayScreen") {
    if (typeof confirmExitOnlineBattle === "function") confirmExitOnlineBattle();
    if (!fromOnestore) armAppBackGuard(true);
    return true;
  }

  if (state.currentScreen === "fishingScreen") {
    if (typeof confirmExitFishingRoom === "function") confirmExitFishingRoom();
    else if (typeof exitFishingScreenWithLoading === "function") exitFishingScreenWithLoading();
    else showHome();
    if (!fromOnestore) armAppBackGuard(true);
    return true;
  }

  if (state.currentScreen === "battleRoomScreen") {
    leaveBattleRoom();
    if (!fromOnestore) armAppBackGuard(true);
    return true;
  }

  if (state.currentScreen === "dmChatScreen") {
    if (typeof returnFromDmChatScreen === "function") {
      returnFromDmChatScreen();
    } else {
      switchScreen("socialScreen");
      if (typeof loadFriendsData === "function") loadFriendsData();
    }
    if (!fromOnestore) armAppBackGuard(true);
    return true;
  }

  if (state.currentScreen === "arcadePlayScreen") {
    if (typeof quitArcadeGameConfirm === "function") quitArcadeGameConfirm();
    if (!fromOnestore) armAppBackGuard(true);
    return true;
  }

  if (state.currentScreen === "arcadeScreen") {
    if (typeof exitArcadeScreenWithLoading === "function") exitArcadeScreenWithLoading();
    else if (typeof openOutingHubScreen === "function") openOutingHubScreen();
    else showHome();
    if (!fromOnestore) armAppBackGuard(true);
    return true;
  }

  if (["setupScreen", "plazaScreen", "playHubScreen", "outingHubScreen", "bagScreen", "resultScreen", "shopScreen", "rankingScreen", "socialScreen"].includes(state.currentScreen)) {
    showHome();
    if (!fromOnestore) armAppBackGuard(true);
    return true;
  }

  if (["gameScreen", "judgeScreen"].includes(state.currentScreen)) {
    confirmExitSingleGame();
    if (!fromOnestore) armAppBackGuard(true);
    return true;
  }

  if (state.currentScreen === "homeScreen") {
    if (fromOnestore) return false;
    const dlg = document.getElementById("customDialogModal");
    if (dlg) dlg.dataset.isExitConfirm = "true";
    gameConfirm(
      "음악왕을 종료하고 나가시겠습니까?",
      () => {
        if (dlg) delete dlg.dataset.isExitConfirm;
        performCleanAppExit();
      },
      "👑 음악왕 종료",
      () => {
        if (dlg) delete dlg.dataset.isExitConfirm;
        armAppBackGuard(true);
      }
    );
    return true;
  }

  return false;
};

window.handleOnestoreBackPressed = function () {
  return window.processInAppBackStep(true) === true;
};

window.addEventListener("popstate", () => {
  window.processInAppBackStep(false);
});

window.addEventListener("pageshow", e => {
  if (e.persisted && !appExited) {
    if (typeof closeAllModals === "function") closeAllModals();
    armAppBackGuard(false);
  }
});

// ============================================================================
// 문제 데이터 및 정답 판정
// ============================================================================
function getAllQuestions() {
  return QUESTIONS_DB;
}

function getFilteredQuestions() {
  return getAllQuestions().filter(q => {
    if (!state.decades.has(q.decade)) return false;
    if (state.hardMode && !q.hardMode) return false;
    return true;
  });
}

function normalizeAnswer(str) {
  if (typeof normalizeQuizText === "function") return normalizeQuizText(str);
  return str ? str.toString().toLowerCase().trim() : "";
}

function isArtistMatch(userInput, q) {
  const normUser = normalizeAnswer(userInput);
  if (!normUser) return false;
  const candidates = [q.artist, ...(q.artistAliases || [])];
  return candidates.some(c => normalizeAnswer(c) === normUser);
}

function isTitleMatch(userInput, q) {
  const normUser = normalizeAnswer(userInput);
  if (!normUser) return false;
  const candidates = [q.title, ...(q.titleAliases || [])];
  return candidates.some(c => normalizeAnswer(c) === normUser);
}

function buildLetterBoxHint(text) {
  if (typeof buildQuizLetterHint === "function") return buildQuizLetterHint(text);
  return String(text || "").trim();
}

// ==================== v25.0 공용 객관식 보기 생성 · 오답제거 · 2×2 / 2×4 렌더링 엔진 ====================
function hashChoiceSeedStr(str) {
  let h = 2166136261 >>> 0;
  const s = String(str || "seed");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createSeededPrng(seedNum) {
  let a = (Number(seedNum) || 1) >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffleArray(arr, rand) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickFourFieldOptions(q, field, preferredPool, rand) {
  const allDb = typeof getAllQuestions === "function" ? getAllQuestions() : (typeof QUESTIONS_DB !== "undefined" ? QUESTIONS_DB : []);
  const acceptedList =
    field === "artist"
      ? [q.artist, ...(q.artistAliases || [])]
      : [q.title, ...(q.titleAliases || [])];
  const forbiddenNorms = new Set(acceptedList.map(normalizeAnswer).filter(Boolean));
  const correctLabel = String((field === "artist" ? q.artist : q.title) || "").trim();
  const seenNorms = new Set([normalizeAnswer(correctLabel), ...forbiddenNorms].filter(Boolean));

  const tryCollectFromPool = (poolList, picked) => {
    const shuffled = seededShuffleArray(poolList, rand);
    for (const item of shuffled) {
      if (picked.length >= 3) break;
      if (!item || item.id === q.id) continue;
      const val = String((field === "artist" ? item.artist : item.title) || "").trim();
      if (!val) continue;
      const itemAllNorms = (
        field === "artist"
          ? [item.artist, ...(item.artistAliases || [])]
          : [item.title, ...(item.titleAliases || [])]
      )
        .map(normalizeAnswer)
        .filter(Boolean);
      const valNorm = normalizeAnswer(val);
      if (!valNorm || itemAllNorms.some(n => seenNorms.has(n))) continue;
      seenNorms.add(valNorm);
      itemAllNorms.forEach(n => seenNorms.add(n));
      picked.push(val);
    }
  };

  const distractors = [];
  const sameDecadePool = (Array.isArray(preferredPool) && preferredPool.length > 0 ? preferredPool : allDb).filter(
    item => item && item.decade === q.decade
  );
  tryCollectFromPool(sameDecadePool, distractors);
  if (distractors.length < 3 && Array.isArray(preferredPool) && preferredPool.length > 0) {
    tryCollectFromPool(preferredPool, distractors);
  }
  if (distractors.length < 3) {
    tryCollectFromPool(allDb, distractors);
  }
  while (distractors.length < 3) {
    distractors.push(`${field === "artist" ? "아티스트" : "노래"} #${distractors.length + 1}`);
  }

  return seededShuffleArray([correctLabel, ...distractors.slice(0, 3)], rand).map(label => ({
    label,
    eliminated: false
  }));
}

window.buildQuizChoicesForQuestion = function (q, stage, preferredPool, seedStr) {
  if (!q) return null;
  const st = Number(stage) || 1;
  const rand = createSeededPrng(hashChoiceSeedStr(seedStr || `${q.id}_${st}_${Date.now()}`));
  if (st === 3) {
    return {
      stage: 3,
      correctArtist: q.artist,
      correctTitle: q.title,
      artists: pickFourFieldOptions(q, "artist", preferredPool, rand),
      titles: pickFourFieldOptions(q, "title", preferredPool, rand)
    };
  }
  const field = st === 2 ? "artist" : "title";
  return {
    stage: st,
    correctValue: field === "artist" ? q.artist : q.title,
    options: pickFourFieldOptions(q, field, preferredPool, rand)
  };
};

window.toCompactChoiceData = function (choiceData) {
  if (!choiceData) return null;
  if (Number(choiceData.stage) === 3) {
    return {
      s: 3,
      arts: (choiceData.artists || []).map(o => o.label),
      ttls: (choiceData.titles || []).map(o => o.label),
      ansA: choiceData.correctArtist || "",
      ansT: choiceData.correctTitle || ""
    };
  }
  return {
    s: Number(choiceData.stage) || 1,
    opts: (choiceData.options || []).map(o => o.label),
    ans: choiceData.correctValue || ""
  };
};

window.buildChoiceStateFromCompact = function (compact, q, stage) {
  if (!compact) return null;
  const st = Number(compact.s || stage) || 1;
  if (st === 3) {
    return {
      stage: 3,
      correctArtist: compact.ansA || (q && q.artist) || "",
      correctTitle: compact.ansT || (q && q.title) || "",
      artists: (Array.isArray(compact.arts) ? compact.arts : []).map(label => ({ label: String(label), eliminated: false })),
      titles: (Array.isArray(compact.ttls) ? compact.ttls : []).map(label => ({ label: String(label), eliminated: false }))
    };
  }
  return {
    stage: st,
    correctValue: compact.ans || (q ? (st === 2 ? q.artist : q.title) : ""),
    options: (Array.isArray(compact.opts) ? compact.opts : []).map(label => ({ label: String(label), eliminated: false }))
  };
};

window.countRemainingWrongChoices = function (choiceData, q, stage) {
  if (!choiceData || !q) return 0;
  const st = Number(choiceData.stage || stage) || 1;
  if (st === 3) {
    const remA = (choiceData.artists || []).filter(o => !o.eliminated && !isArtistMatch(o.label, q)).length;
    const remT = (choiceData.titles || []).filter(o => !o.eliminated && !isTitleMatch(o.label, q)).length;
    return remA + remT;
  }
  return (choiceData.options || []).filter(o => !o.eliminated && !(st === 2 ? isArtistMatch(o.label, q) : isTitleMatch(o.label, q))).length;
};

window.eliminateWrongChoiceInData = function (choiceData, q, stage) {
  if (!choiceData || !q) return { changed: false, eliminatedArtists: [], eliminatedTitles: [], eliminatedOptions: [] };
  const st = Number(choiceData.stage || stage) || 1;
  if (st === 3) {
    const eliminatedArtists = [];
    const eliminatedTitles = [];
    const wrongA = (choiceData.artists || []).filter(o => !o.eliminated && !isArtistMatch(o.label, q));
    const wrongT = (choiceData.titles || []).filter(o => !o.eliminated && !isTitleMatch(o.label, q));
    if (wrongA.length > 0) {
      const pickA = wrongA[Math.floor(Math.random() * wrongA.length)];
      pickA.eliminated = true;
      eliminatedArtists.push(pickA.label);
    }
    if (wrongT.length > 0) {
      const pickT = wrongT[Math.floor(Math.random() * wrongT.length)];
      pickT.eliminated = true;
      eliminatedTitles.push(pickT.label);
    }
    return {
      changed: eliminatedArtists.length > 0 || eliminatedTitles.length > 0,
      eliminatedArtists,
      eliminatedTitles,
      eliminatedOptions: []
    };
  }
  const wrongOpts = (choiceData.options || []).filter(
    o => !o.eliminated && !(st === 2 ? isArtistMatch(o.label, q) : isTitleMatch(o.label, q))
  );
  if (wrongOpts.length === 0) {
    return { changed: false, eliminatedArtists: [], eliminatedTitles: [], eliminatedOptions: [] };
  }
  const pick = wrongOpts[Math.floor(Math.random() * wrongOpts.length)];
  pick.eliminated = true;
  return {
    changed: true,
    eliminatedArtists: [],
    eliminatedTitles: [],
    eliminatedOptions: [pick.label]
  };
};

window.renderQuizChoiceGrid = function ({
  containerEl,
  guideEl,
  choiceData,
  stage,
  pickedArtist,
  pickedTitle,
  winnerReveal,
  penaltyLocked,
  onSelectSingle,
  onSelectStage3Artist,
  onSelectStage3Title
}) {
  if (!containerEl || !choiceData) return;
  const st = Number(choiceData.stage || stage) || 1;
  const revSingle = winnerReveal && winnerReveal.singleChoice ? normalizeAnswer(winnerReveal.singleChoice) : "";
  const revArtist = winnerReveal && winnerReveal.pickedArtist ? normalizeAnswer(winnerReveal.pickedArtist) : "";
  const revTitle = winnerReveal && winnerReveal.pickedTitle ? normalizeAnswer(winnerReveal.pickedTitle) : "";
  const isRevealActive = Boolean(winnerReveal);

  containerEl.innerHTML = "";

  if (st === 3) {
    if (guideEl) {
      guideEl.classList.remove("hidden");
      if (isRevealActive) {
        guideEl.textContent = `🎉 ${winnerReveal.winnerNick || "도전자"}님 정답 조합 확인 중!`;
      } else if (pickedArtist && !pickedTitle) {
        guideEl.textContent = `🎤 [${pickedArtist}] 선택됨 · 오른쪽 노래를 누르면 즉시 판정!`;
      } else if (!pickedArtist && pickedTitle) {
        guideEl.textContent = `🎵 [${pickedTitle}] 선택됨 · 왼쪽 가수를 누르면 즉시 판정!`;
      } else {
        guideEl.textContent = "🎤 가수 + 🎵 노래 차례로 터치 (2번째 선택 즉시 판정!)";
      }
    }

    const cols = document.createElement("div");
    cols.className = "choice-3stage-cols";

    const buildCol = (headerText, list, currentPick, revNorm, onClickFn) => {
      const col = document.createElement("div");
      col.className = "choice-col";
      const hdr = document.createElement("div");
      hdr.className = "choice-col-header";
      hdr.textContent = headerText;
      col.appendChild(hdr);

      (list || []).forEach((opt, idx) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "quiz-choice-btn";
        const span = document.createElement("span");
        span.className = "quiz-choice-btn-text";
        span.textContent = opt.label;
        btn.appendChild(span);

        const isSel = currentPick && currentPick === opt.label;
        const isRevMatch = isRevealActive && revNorm && normalizeAnswer(opt.label) === revNorm;
        if (opt.eliminated) btn.classList.add("is-eliminated");
        if (isSel && !isRevMatch) btn.classList.add("is-selected");
        if (isRevMatch) btn.classList.add("is-winner-reveal");
        if (penaltyLocked) btn.classList.add("is-penalty-locked");

        btn.disabled = Boolean(opt.eliminated || penaltyLocked || isRevealActive);
        btn.addEventListener("click", () => {
          if (btn.disabled || typeof onClickFn !== "function") return;
          onClickFn(opt.label, idx, btn);
        });
        col.appendChild(btn);
      });
      return col;
    };

    cols.appendChild(buildCol("🎤 가수 선택", choiceData.artists, pickedArtist, revArtist, onSelectStage3Artist));
    cols.appendChild(buildCol("🎵 노래 선택", choiceData.titles, pickedTitle, revTitle, onSelectStage3Title));
    containerEl.appendChild(cols);
    return;
  }

  if (guideEl) {
    guideEl.classList.remove("hidden");
    guideEl.textContent = isRevealActive
      ? `🎉 ${winnerReveal.winnerNick || "도전자"}님이 고른 정답!`
      : st === 2
      ? "🎤 알맞은 가수를 터치하면 즉시 정답 판정!"
      : "🎵 알맞은 노래 제목을 터치하면 즉시 정답 판정!";
  }

  const grid = document.createElement("div");
  grid.className = "choice-grid-2x2";
  (choiceData.options || []).forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quiz-choice-btn";
    const span = document.createElement("span");
    span.className = "quiz-choice-btn-text";
    span.textContent = opt.label;
    btn.appendChild(span);

    const isRevMatch = isRevealActive && revSingle && normalizeAnswer(opt.label) === revSingle;
    if (opt.eliminated) btn.classList.add("is-eliminated");
    if (isRevMatch) btn.classList.add("is-winner-reveal");
    if (penaltyLocked) btn.classList.add("is-penalty-locked");

    btn.disabled = Boolean(opt.eliminated || penaltyLocked || isRevealActive);
    btn.addEventListener("click", () => {
      if (btn.disabled || typeof onSelectSingle !== "function") return;
      onSelectSingle(opt.label, idx, btn);
    });
    grid.appendChild(btn);
  });
  containerEl.appendChild(grid);
};

async function fetchItunesTrack(q) {
  if (state.itunesCache.has(q.id)) {
    return state.itunesCache.get(q.id);
  }
  const info =
    typeof fetchItunesSongMeta === "function"
      ? await fetchItunesSongMeta(q)
      : { previewUrl: null, artworkUrl: "" };
  if (info && info.previewUrl) {
    state.itunesCache.set(q.id, info);
  }
  return info;
}

const SILENT_AUDIO_URI =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

function syncResultPreviewButtons() {
  document.querySelectorAll(".result-preview-btn").forEach(btn => {
    const idx = Number(btn.dataset.histIdx);
    const active = state.resultPlayingIndex === idx && !appExited;
    btn.classList.toggle("is-playing", active);
    btn.textContent = active ? (state.audioPending ? "⏳..." : "⏹ 정지") : "▶ 듣기";
  });
}

function stopAudio() {
  state.audioRequestSeq = (state.audioRequestSeq || 0) + 1;
  state.audioPending = false;
  state.resultPlayingIndex = null;
  if (state.audioStopTimer) {
    clearTimeout(state.audioStopTimer);
    state.audioStopTimer = null;
  }
  try {
    state.audioEl.pause();
  } catch (e) {}
  ["vinylDisc", "battleVinylDisc"].forEach(id => {
    const disc = document.getElementById(id);
    if (disc) disc.classList.remove("spinning");
  });
  syncResultPreviewButtons();
}

function unlockQuizAudio() {
  if (appExited || state.audioUnlocked || !state.audioEl || state.audioPending) return;
  try {
    if (!state.audioEl.paused) return;
    const seqAtStart = state.audioRequestSeq || 0;
    if (!state.audioEl.src) {
      state.audioEl.src = SILENT_AUDIO_URI;
    }
    const p = state.audioEl.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        state.audioUnlocked = true;
        preloadClickSfxBuffer();
        if (state.audioEl.src === SILENT_AUDIO_URI && (state.audioRequestSeq || 0) === seqAtStart && !state.audioPending) {
          try {
            state.audioEl.pause();
          } catch (e) {}
        }
      }).catch(() => {});
    }
  } catch (e) {}
}

function stopTimeAttackTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function startTimeAttackTimer() {
  stopTimeAttackTimer();
  const wrap = document.getElementById("timerBarWrap");
  const fill = document.getElementById("timerBarFill");
  if (!state.timeAttack) {
    if (wrap) wrap.classList.add("hidden");
    return;
  }

  wrap.classList.remove("hidden");
  state.timeLeftMs = state.maxTimeMs;
  fill.style.width = "100%";

  state.timerInterval = setInterval(() => {
    if (state.questionEnded) {
      stopTimeAttackTimer();
      return;
    }
    state.timeLeftMs -= 100;
    const pct = Math.max(0, (state.timeLeftMs / state.maxTimeMs) * 100);
    fill.style.width = `${pct}%`;

    if (state.timeLeftMs <= 0) {
      stopTimeAttackTimer();
      finalizeQuestion(false, "⏱️ 시간 초과! (타임어택 15초 경과)");
    }
  }, 100);
}

async function startAudioStreamAt(previewUrl, startOffsetSec, durationSec, reqId, onBeforePlay, onFinished) {
  if (appExited || reqId !== state.audioRequestSeq) return false;
  if (state.audioEl.src !== previewUrl) {
    state.audioEl.src = previewUrl;
    await new Promise((resolve, reject) => {
      const cleanup = () => {
        state.audioEl.removeEventListener("loadedmetadata", onLoaded);
        state.audioEl.removeEventListener("error", onError);
      };
      const onLoaded = () => {
        cleanup();
        resolve();
      };
      const onError = e => {
        cleanup();
        reject(e);
      };
      state.audioEl.addEventListener("loadedmetadata", onLoaded);
      state.audioEl.addEventListener("error", onError);
      state.audioEl.load();
    });
  }

  if (appExited || reqId !== state.audioRequestSeq) return false;

  const safeOffset = Math.min(startOffsetSec, Math.max(0, (state.audioEl.duration || 29) - durationSec - 1));
  state.audioEl.currentTime = safeOffset;
  if (typeof onBeforePlay === "function") onBeforePlay();

  await state.audioEl.play();
  if (appExited || reqId !== state.audioRequestSeq) {
    try {
      state.audioEl.pause();
    } catch (e) {}
    return false;
  }
  state.audioUnlocked = true;
  state.audioPending = false;

  state.audioStopTimer = setTimeout(() => {
    if (reqId !== state.audioRequestSeq) return;
    state.audioEl.pause();
    if (typeof onFinished === "function") onFinished();
  }, durationSec * 1000);
  return true;
}

async function playAudioSnippet(durationSec, startOffsetSec = 6, customQ = null, customDisc = null, customStatus = null, opts = {}) {
  if (appExited) return;
  stopAudio();
  const reqId = state.audioRequestSeq;
  const isAutoPlay = Boolean(opts && opts.isAutoPlay);
  const q = customQ || state.currentQ;
  if (!q) return;

  const disc = customDisc || document.getElementById("vinylDisc");
  const statusEl = customStatus || document.getElementById("audioStatusText");
  if (statusEl) {
    statusEl.textContent = isAutoPlay ? "🎵 1초 음원 자동재생 준비 중..." : "음원 불러오는 중...";
  }

  state.audioPending = true;
  try {
    const track = await fetchItunesTrack(q);
    if (appExited || reqId !== state.audioRequestSeq) return false;
    if (!track || !track.previewUrl) {
      if (statusEl) statusEl.textContent = "⚠️ 미리듣기 음원을 찾을 수 없습니다.";
      if (!isAutoPlay) {
        gameAlert("이 곡의 미리듣기 음원을 불러올 수 없습니다.");
      }
      return false;
    }

    const played = await startAudioStreamAt(
      track.previewUrl,
      startOffsetSec,
      durationSec,
      reqId,
      () => {
        if (disc) disc.classList.add("spinning");
        if (statusEl) statusEl.textContent = `🔊 ${durationSec}초 재생 중...`;
      },
      () => {
        if (disc) disc.classList.remove("spinning");
        if (statusEl) statusEl.textContent = `✅ ${durationSec}초 재생 완료! (버튼으로 다시 듣기 가능)`;
      }
    );
    if (!played && disc) disc.classList.remove("spinning");
    return Boolean(played);
  } catch (err) {
    if (reqId !== state.audioRequestSeq) return false;
    if (disc) disc.classList.remove("spinning");
    if (statusEl) {
      statusEl.textContent = isAutoPlay
        ? "🔇 자동재생이 차단되었습니다. [▶ 1초 듣기]를 눌러주세요!"
        : "⚠️ 오디오 재생 버튼을 다시 눌러주세요.";
    }
    return false;
  } finally {
    if (reqId === state.audioRequestSeq) {
      state.audioPending = false;
    }
  }
}

window.toggleResultSongPreview = async function (idx) {
  if (appExited) return;
  if (state.resultPlayingIndex === idx && (state.audioPending || (state.audioEl && !state.audioEl.paused))) {
    stopAudio();
    return;
  }

  const item = state.history && state.history[idx];
  if (!item || !item.q) return;

  stopAudio();
  const reqId = state.audioRequestSeq;
  state.resultPlayingIndex = idx;
  state.audioPending = true;
  syncResultPreviewButtons();

  try {
    const track = await fetchItunesTrack(item.q);
    if (appExited || reqId !== state.audioRequestSeq) return;
    if (!track || !track.previewUrl) {
      stopAudio();
      gameAlert("이 곡의 미리듣기 음원을 찾을 수 없습니다.");
      return;
    }

    const started = await startAudioStreamAt(
      track.previewUrl,
      5,
      15,
      reqId,
      () => {
        state.audioPending = false;
        syncResultPreviewButtons();
      },
      () => {
        stopAudio();
      }
    );
    if (!started && reqId === state.audioRequestSeq) {
      stopAudio();
    }
  } catch (err) {
    if (reqId === state.audioRequestSeq) {
      stopAudio();
      gameAlert("미리듣기 재생을 시작할 수 없습니다.");
    }
  }
};

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

window.confirmExitSingleGame = function () {
  gameConfirm(
    "지금 나가면 풀던 문제와 현재 점수가 모두 삭제됩니다.\n정말 게임을 중단하고 나가시겠습니까?",
    () => {
      if (typeof stopWrongDelCooldownTimer === "function") stopWrongDelCooldownTimer();
      showSetup();
    },
    "⚠️ 게임 중단 경고"
  );
};

// ============================================================================
// 배경음악(BGM) & 모든 버튼 클릭 효과음(bgm/click.wav) 컨트롤
// ============================================================================
const FISH_BGM_CANDIDATES = ["./bgm/fish.mp3?v=10.21", "./bgm/FISH.MP3?v=10.21", "./BGM/fish.mp3?v=10.21"];
const ARCADE_LOBBY_BGM_SRC = "./bgm/arcade.mp3";
const ARCADE_GAME_BGM_MAP = {
  star_dodge: "./bgm/ar_1.mp3",
  side_sort: "./bgm/ar_2.mp3",
  animal_match: "./bgm/ar_3.mp3",
  melody_memory: null, // 기억하기는 9패드 멜로디를 들어야 하므로 BGM 미재생
  jump_runner: "./bgm/ar_5.mp3",
  color_sort: "./bgm/ar_6.mp3",
  brick_breaker: "./bgm/ar_7.mp3",
  note_pang: "./bgm/ar_8.mp3"
};

const bgmState = {
  mainAudio: new Audio("./bgm/main.mp3"),
  shopAudio: new Audio("./bgm/shop.mp3"),
  fishAudio: new Audio(),
  fishAudioIdx: 0,
  arcadeLobbyAudio: new Audio(),
  arcadeGameAudio: new Audio(),
  arcadeGameSrc: "",
  clickPool: Array.from({ length: 4 }, () => {
    const a = new Audio("./bgm/click.wav");
    a.volume = 0.45;
    return a;
  }),
  clickIdx: 0,
  clickCtx: null,
  clickBuf: null,
  clickBufLoading: false,
  muted: localStorage.getItem("mk_bgm_muted") === "true",
  currentType: "none"
};
bgmState.mainAudio.loop = true;
bgmState.mainAudio.volume = 0.22;
bgmState.shopAudio.loop = true;
bgmState.shopAudio.volume = 0.22;
bgmState.fishAudio.loop = true;
bgmState.fishAudio.volume = 0.25;
bgmState.fishAudio.preload = "none";
bgmState.arcadeLobbyAudio.loop = true;
bgmState.arcadeLobbyAudio.volume = 0.22;
bgmState.arcadeLobbyAudio.preload = "none";
bgmState.arcadeGameAudio.loop = true;
bgmState.arcadeGameAudio.volume = 0.20;
bgmState.arcadeGameAudio.preload = "none";

function isAppAudioBlocked() {
  return Boolean(appExited || document.hidden || bgmState.muted || window.__onestorePaused || window.__onestoreRingerSilent);
}

bgmState.fishAudio.addEventListener("error", () => {
  if (appExited || !bgmState.fishAudio.getAttribute("src")) return;
  if (bgmState.fishAudioIdx + 1 < FISH_BGM_CANDIDATES.length) {
    bgmState.fishAudioIdx += 1;
    bgmState.fishAudio.src = FISH_BGM_CANDIDATES[bgmState.fishAudioIdx];
    bgmState.fishAudio.load();
    if (!isAppAudioBlocked() && bgmState.currentType === "fish") {
      bgmState.fishAudio.play().catch(() => {});
    }
  }
});

function bindLazyBgmCanPlay(audioEl, expectedType) {
  audioEl.addEventListener("canplay", () => {
    if (!isAppAudioBlocked() && bgmState.currentType === expectedType && audioEl.paused) {
      audioEl.play().catch(() => {});
    }
  });
}

bindLazyBgmCanPlay(bgmState.fishAudio, "fish");
bindLazyBgmCanPlay(bgmState.arcadeLobbyAudio, "arcade_lobby");
bindLazyBgmCanPlay(bgmState.arcadeGameAudio, "arcade_game");

function playFishingBgmSafely() {
  if (!bgmState.fishAudio || isAppAudioBlocked()) return;
  const hasSrc = Boolean(bgmState.fishAudio.getAttribute("src"));
  if (!hasSrc || bgmState.fishAudio.error) {
    bgmState.fishAudioIdx = 0;
    bgmState.fishAudio.src = FISH_BGM_CANDIDATES[0];
    bgmState.fishAudio.load();
  }
  if (bgmState.fishAudio.paused) {
    bgmState.fishAudio.play().catch(() => {});
  }
}

function playArcadeLobbyBgmSafely() {
  if (!bgmState.arcadeLobbyAudio || isAppAudioBlocked()) return;
  const hasSrc = Boolean(bgmState.arcadeLobbyAudio.getAttribute("src"));
  if (!hasSrc || bgmState.arcadeLobbyAudio.error) {
    bgmState.arcadeLobbyAudio.src = ARCADE_LOBBY_BGM_SRC;
    bgmState.arcadeLobbyAudio.load();
  }
  if (bgmState.arcadeLobbyAudio.paused) {
    bgmState.arcadeLobbyAudio.play().catch(() => {});
  }
}

function playArcadeGameBgmSafely(gameId, restart = false) {
  const src =
    gameId && Object.prototype.hasOwnProperty.call(ARCADE_GAME_BGM_MAP, gameId)
      ? ARCADE_GAME_BGM_MAP[gameId]
      : null;
  if (!bgmState.arcadeGameAudio || !src || isAppAudioBlocked()) return;
  if (bgmState.arcadeGameSrc !== src || bgmState.arcadeGameAudio.error) {
    bgmState.arcadeGameSrc = src;
    bgmState.arcadeGameAudio.src = src;
    bgmState.arcadeGameAudio.load();
  } else if (restart) {
    try {
      bgmState.arcadeGameAudio.currentTime = 0;
    } catch (e) {}
  }
  if (bgmState.arcadeGameAudio.paused) {
    bgmState.arcadeGameAudio.play().catch(() => {});
  }
}

window.stopArcadeGameBgm = function () {
  if (bgmState.arcadeGameAudio) {
    try {
      bgmState.arcadeGameAudio.pause();
      bgmState.arcadeGameAudio.currentTime = 0;
    } catch (e) {}
  }
  if (bgmState.currentType === "arcade_game") {
    bgmState.currentType = "none";
  }
};

function getClickAudioCtx() {
  if (appExited) return null;
  if (!bgmState.clickCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    bgmState.clickCtx = new Ctx({ latencyHint: "interactive" });
  }
  if (bgmState.clickCtx.state === "suspended") {
    bgmState.clickCtx.resume().catch(() => {});
  }
  return bgmState.clickCtx;
}

function preloadClickSfxBuffer() {
  if (appExited || bgmState.clickBuf || bgmState.clickBufLoading) return;
  const ctx = getClickAudioCtx();
  if (!ctx || typeof fetch !== "function") return;
  bgmState.clickBufLoading = true;
  fetch("./bgm/click.wav")
    .then(res => (res.ok ? res.arrayBuffer() : Promise.reject(new Error("click fetch failed"))))
    .then(raw => ctx.decodeAudioData(raw))
    .then(decoded => {
      bgmState.clickBuf = decoded;
      bgmState.clickBufLoading = false;
    })
    .catch(() => {
      bgmState.clickBufLoading = false;
    });
}

window.playClickSfx = function () {
  if (isAppAudioBlocked()) return;
  try {
    const ctx = getClickAudioCtx();
    if (ctx && bgmState.clickBuf) {
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = 0.45;
      src.buffer = bgmState.clickBuf;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start(0);
      return;
    }
    preloadClickSfxBuffer();
    const sfx = bgmState.clickPool[bgmState.clickIdx];
    bgmState.clickIdx = (bgmState.clickIdx + 1) % bgmState.clickPool.length;
    sfx.currentTime = 0;
    sfx.play().catch(() => {});
  } catch (e) {}
};

function isOnlineOneSecRoomActive() {
  return (
    typeof plazaState !== "undefined" &&
    plazaState.currentRoom &&
    plazaState.currentRoom.game_config &&
    plazaState.currentRoom.game_config.mode === "onesec"
  );
}

function shouldSuppressClickSfx(clickable) {
  if (!clickable) return false;
  if (clickable.closest("#arcadePlayStage")) return true;
  // 1초 듣기 모드(싱글/온라인 대전)에서는 재생 충돌 방지를 위해 클릭 효과음(click.wav) 무음 처리
  if (state.mode === "onesec") {
    if (clickable.closest("#gameScreen, #judgeScreen")) return true;
    if (clickable.id === "startGameBtn" || clickable.id === "restartSameBtn") return true;
  }
  if (isOnlineOneSecRoomActive()) {
    if (clickable.closest("#battlePlayScreen")) return true;
    if (clickable.id === "battleHostStartBtn") return true;
  }
  return false;
}

// 모든 버튼·탭·칩·리스트 클릭 시 즉시 bgm/click.wav 재생 (1초 듣기 컨텍스트 제외)
document.addEventListener(
  "click",
  e => {
    const clickable = e.target.closest(
      "button, .btn, .header-btn, .option-chip, .apf-tab, .apf-tile, .apf-back-circle, .rank-chip, .pixel-list-item, .kakao-friend-row, .kakao-send-btn, .toggle-banner, .user-profile-trigger, .home-title-pill, .floating-sound-btn, .hint-btn, .auth-check-label"
    );
    if (clickable && !shouldSuppressClickSfx(clickable)) {
      playClickSfx();
    }
  },
  true
);

function syncFloatingSoundBtn(screenId) {
  const fishSoundBtn = document.getElementById("fishingSoundBtn");
  if (fishSoundBtn) {
    fishSoundBtn.textContent = bgmState.muted ? "🔇" : "🔊";
    fishSoundBtn.classList.toggle("is-muted", bgmState.muted);
  }
  const arcadeSoundBtn = document.getElementById("arcadePlaySoundBtn");
  if (arcadeSoundBtn) {
    arcadeSoundBtn.textContent = bgmState.muted ? "🔇" : "🔊";
    arcadeSoundBtn.classList.toggle("is-muted", bgmState.muted);
  }
  const homeSoundBtn = document.getElementById("homeSoundBtn");
  const homeSoundIcon = document.getElementById("homeSoundIcon");
  if (homeSoundBtn) homeSoundBtn.classList.toggle("is-muted", bgmState.muted);
  if (homeSoundIcon) homeSoundIcon.textContent = bgmState.muted ? "🔇" : "🔊";

  const btn = document.getElementById("floatingSoundBtn");
  if (!btn) return;
  const showBtn = ["loginScreen", "rankingScreen", "shopScreen", "socialScreen", "outingHubScreen", "arcadeScreen"].includes(screenId);
  btn.classList.toggle("hidden", !showBtn);
  btn.textContent = bgmState.muted ? "🔇" : "🔊";
  btn.classList.toggle("is-muted", bgmState.muted);
}

window.toggleBgmMute = function () {
  bgmState.muted = !bgmState.muted;
  localStorage.setItem("mk_bgm_muted", bgmState.muted ? "true" : "false");
  updateBgmForScreen(state.currentScreen);
};

function updateBgmForScreen(screenId) {
  syncFloatingSoundBtn(screenId);

  if (isAppAudioBlocked()) {
    pauseBgmAudios(null);
    bgmState.currentType = "none";
    return;
  }

  // 퀴즈 진행/판정/결과/온라인 대결 플레이 화면은 BGM 정지
  if (["gameScreen", "judgeScreen", "resultScreen", "battlePlayScreen"].includes(screenId)) {
    pauseBgmAudios(null);
    bgmState.currentType = "none";
    return;
  }

  if (screenId === "arcadePlayScreen") {
    const arcEnded = typeof arcadeState !== "undefined" && Boolean(arcadeState.isGameEnded);
    const activeGameId = typeof arcadeState !== "undefined" ? arcadeState.activeGameId : null;
    const gameBgmSrc =
      !arcEnded && activeGameId && Object.prototype.hasOwnProperty.call(ARCADE_GAME_BGM_MAP, activeGameId)
        ? ARCADE_GAME_BGM_MAP[activeGameId]
        : null;
    if (!gameBgmSrc) {
      // 기억하기(melody_memory) 또는 결과 정산 모달 대기 상태에서는 BGM 무음
      pauseBgmAudios(null);
      bgmState.currentType = "none";
      return;
    }
    pauseBgmAudios(bgmState.arcadeGameAudio);
    bgmState.currentType = "arcade_game";
    const shouldRestart = typeof arcadeState !== "undefined" && Boolean(arcadeState.bgmNeedsRestart);
    if (typeof arcadeState !== "undefined") arcadeState.bgmNeedsRestart = false;
    playArcadeGameBgmSafely(activeGameId, shouldRestart);
    return;
  }

  if (screenId === "arcadeScreen") {
    pauseBgmAudios(bgmState.arcadeLobbyAudio);
    bgmState.currentType = "arcade_lobby";
    playArcadeLobbyBgmSafely();
    return;
  }

  if (screenId === "shopScreen") {
    pauseBgmAudios(bgmState.shopAudio);
    bgmState.currentType = "shop";
    if (bgmState.shopAudio.paused) {
      bgmState.shopAudio.play().catch(() => {});
    }
  } else if (screenId === "fishingScreen") {
    pauseBgmAudios(bgmState.fishAudio);
    bgmState.currentType = "fish";
    playFishingBgmSafely();
  } else {
    pauseBgmAudios(bgmState.mainAudio);
    bgmState.currentType = "main";
    if (bgmState.mainAudio.paused) {
      bgmState.mainAudio.play().catch(() => {});
    }
  }
}

document.addEventListener(
  "pointerdown",
  () => {
    if (appExited || document.hidden || window.__onestorePaused) return;
    armAppBackGuard(true);
    unlockQuizAudio();
    if (!isAppAudioBlocked() && bgmState.currentType !== "none") {
      if (bgmState.currentType === "fish") {
        playFishingBgmSafely();
      } else if (bgmState.currentType === "arcade_lobby") {
        playArcadeLobbyBgmSafely();
      } else if (bgmState.currentType === "arcade_game") {
        const activeGameId = typeof arcadeState !== "undefined" ? arcadeState.activeGameId : null;
        playArcadeGameBgmSafely(activeGameId, false);
      } else {
        const targetAudio = bgmState.currentType === "shop" ? bgmState.shopAudio : bgmState.mainAudio;
        if (targetAudio && targetAudio.paused) {
          targetAudio.play().catch(() => {});
        }
      }
    }
  },
  { passive: true }
);

function recoverAppForegroundState() {
  if (appExited) return;
  if (typeof handleFishingVisibilityChange === "function") {
    handleFishingVisibilityChange(false);
  } else if (state.currentScreen === "fishingScreen" && typeof advanceFishingClockTo === "function") {
    advanceFishingClockTo(Date.now());
  }
  if (typeof ensureGlobalOnlinePresenceHealthy === "function") {
    ensureGlobalOnlinePresenceHealthy(true);
  }
  if (typeof refreshUnreadDmNotis === "function") refreshUnreadDmNotis();
  if (typeof refreshAdminGifts === "function") refreshAdminGifts(true);
  updateBgmForScreen(state.currentScreen);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (typeof handleFishingVisibilityChange === "function") {
      handleFishingVisibilityChange(true);
    } else if (state.currentScreen === "fishingScreen" && typeof advanceFishingClockTo === "function") {
      advanceFishingClockTo(Date.now());
      if (typeof syncProfileToServer === "function") syncProfileToServer();
    }
    stopAllAppAudio(false);
    if ((state.mode === "onesec" || isOnlineOneSecRoomActive()) && state.currentScreen === "gameScreen") {
      const st = document.getElementById("audioStatusText");
      if (st) st.textContent = "⏸️ 백그라운드 전환으로 정지됨 · [▶ 1초 듣기]를 눌러주세요!";
    }
  } else {
    recoverAppForegroundState();
  }
});

window.addEventListener("online", () => {
  if (!appExited && !document.hidden && !window.__onestorePaused && typeof ensureGlobalOnlinePresenceHealthy === "function") {
    ensureGlobalOnlinePresenceHealthy(true);
  }
});

window.addEventListener("pagehide", e => {
  if (typeof handleFishingForcedExit === "function") {
    handleFishingForcedExit(e);
  }
  stopAllAppAudio(false);
});

window.addEventListener("beforeunload", e => {
  if (typeof handleFishingForcedExit === "function") {
    handleFishingForcedExit(e);
  }
});

window.onOnestorePause = function () {
  window.__onestorePaused = true;
  if (typeof handleFishingVisibilityChange === "function") {
    handleFishingVisibilityChange(true);
  } else if (state.currentScreen === "fishingScreen" && typeof advanceFishingClockTo === "function") {
    advanceFishingClockTo(Date.now());
    if (typeof syncProfileToServer === "function") syncProfileToServer();
  }
  stopAllAppAudio(false);
};

window.onOnestoreResume = function (event) {
  window.__onestorePaused = false;
  if (event && typeof event.ringerSilent === "boolean") {
    window.__onestoreRingerSilent = event.ringerSilent;
  }
  recoverAppForegroundState();
};

window.onOnestoreExit = function () {
  if (typeof stopGlobalOnlinePresence === "function") {
    stopGlobalOnlinePresence();
  }
  if (typeof handleFishingForcedExit === "function") {
    handleFishingForcedExit();
  }
  stopAllAppAudio(true);
};

window.onOnestoreGameStarted = function () {
  updateBgmForScreen(state.currentScreen);
  requestAnimationFrame(() => {
    if (typeof updateHeaderUserUI === "function") updateHeaderUserUI();
    syncHomeCornerFloatingButtons();
  });
};

// 쿠팡 파트너스 동적 배너가 body 루트 등 외부로 떨어졌을 경우 홈 하단 전용 슬롯(#homeCoupangFrameWrap)으로 안전 재배치
function relocateCoupangAdBanner() {
  const wrap = document.getElementById("homeCoupangFrameWrap");
  if (!wrap) return;
  document.querySelectorAll('iframe[src*="coupang.com"], iframe[src*="ads-partners.coupang"]').forEach(el => {
    const hostNode = el.closest("div[id^='coupang'], div[class*='coupang']") || el;
    if (hostNode && hostNode !== wrap && !wrap.contains(hostNode) && !hostNode.contains(wrap)) {
      wrap.innerHTML = "";
      wrap.appendChild(hostNode);
    }
  });
}

window.confirmAppExitFromHeader = function () {
  gameConfirm("음악왕을 종료하고 나가시겠습니까?", () => {
    if (typeof performCleanAppExit === "function") {
      performCleanAppExit();
    }
  }, "🚪 앱 종료");
};

// 비홈 화면 플로팅 버튼 인라인 스타일 정리 (홈 화면은 4×2 퀵그리드 고정 배치 사용)
window.syncHomeCornerFloatingButtons = function () {
  const notiBtn = document.getElementById("floatingDmNotiBtn");
  const soundBtn = document.getElementById("floatingSoundBtn");
  if (notiBtn) {
    notiBtn.style.top = "";
    notiBtn.style.left = "";
    notiBtn.style.right = "";
  }
  if (soundBtn) {
    soundBtn.style.top = "";
    soundBtn.style.right = "";
    soundBtn.style.left = "";
    soundBtn.style.bottom = "";
  }
};

// ============================================================================
// 화면 전환
// ============================================================================
window.switchScreen = function (targetId, opts = {}) {
  stopAudio();
  stopTimeAttackTimer();
  window.closeAllModals();

  const prevScreen = state.currentScreen;
  if (
    prevScreen === "fishingScreen" &&
    targetId !== "fishingScreen" &&
    typeof cleanupFishingRuntime === "function" &&
    !(typeof fishingState !== "undefined" && fishingState.isTransitioning)
  ) {
    cleanupFishingRuntime(true);
  }
  if (
    prevScreen === "arcadePlayScreen" &&
    targetId !== "arcadePlayScreen" &&
    typeof cleanupArcadeRuntime === "function"
  ) {
    cleanupArcadeRuntime();
  }

  state.currentScreen = targetId;
  if (opts && opts.replaceHistory) {
    resetHistoryToExitBase();
  } else if (targetId !== "loginScreen") {
    armAppBackGuard(false);
  }

  document.body.classList.toggle("on-home-screen", targetId === "homeScreen");
  document.body.classList.toggle("on-fishing-screen", targetId === "fishingScreen");
  // 싱글/멀티 전용 플레이 화면일 때 전자 미디(MIDI) 다크 스튜디오 배경 활성화
  document.body.classList.toggle("midi-play-theme", ["gameScreen", "battlePlayScreen"].includes(targetId));

  if (targetId === "homeScreen") {
    relocateCoupangAdBanner();
    if (typeof updateHomeAdBannerPlatform === "function") updateHomeAdBannerPlatform();
    if (typeof syncHomeV2BadgesUI === "function") syncHomeV2BadgesUI();
    if (typeof syncPatchNotesNotiDot === "function") syncPatchNotesNotiDot();
    if (typeof syncHomeOnlineUsersBtn === "function") syncHomeOnlineUsersBtn();
    setTimeout(() => {
      if (typeof maybeStartV32Tutorial === "function") maybeStartV32Tutorial();
    }, 340);
  }
  if (typeof syncGlobalOnlineActivity === "function") {
    syncGlobalOnlineActivity(targetId);
  }

  if (targetId !== "dmChatScreen") {
    if (typeof stopDmRealtime === "function") stopDmRealtime();
    if (typeof closeDmEmojiDrawer === "function") closeDmEmojiDrawer();
  }

  const headerEl = document.getElementById("topHeader");
  if (headerEl) {
    headerEl.classList.toggle(
      "hidden",
      ["loginScreen", "shopScreen", "fishingScreen", "outingHubScreen", "arcadeScreen", "arcadePlayScreen", "battleRoomScreen", "battlePlayScreen", "rankingScreen", "socialScreen", "dmChatScreen"].includes(targetId)
    );
  }

  [
    "loginScreen",
    "homeScreen",
    "playHubScreen",
    "outingHubScreen",
    "arcadeScreen",
    "arcadePlayScreen",
    "bagScreen",
    "setupScreen",
    "gameScreen",
    "judgeScreen",
    "resultScreen",
    "plazaScreen",
    "shopScreen",
    "fishingScreen",
    "battleRoomScreen",
    "battlePlayScreen",
    "rankingScreen",
    "socialScreen",
    "dmChatScreen"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", id !== targetId);
  });

  const helpBtn = document.getElementById("floatingHelpBtn");
  if (helpBtn) {
    helpBtn.classList.toggle("hidden", targetId !== "homeScreen");
  }
  if (typeof syncDmNotiBadgeUI === "function") {
    syncDmNotiBadgeUI();
  }

  updateBgmForScreen(targetId);
  if (typeof syncFishingViewportLock === "function") {
    syncFishingViewportLock();
  }

  // 숨겨져 있던 캔버스가 표시된 직후 실제 CSS 크기에 맞춘 1:1 정배율 렌더링 & 홈 모서리 버튼 정렬!
  requestAnimationFrame(() => {
    if (typeof updateHeaderUserUI === "function") updateHeaderUserUI();
    if (targetId === "shopScreen" && typeof updateShopPreviewCanvas === "function") {
      updateShopPreviewCanvas();
    } else if (targetId === "bagScreen" && typeof renderPixelAvatar === "function" && typeof userState !== "undefined") {
      const avCv = document.getElementById("bagAvatarCanvas");
      if (avCv) renderPixelAvatar(avCv, userState.avatarConfig);
    }
    syncHomeCornerFloatingButtons();
  });

  if (typeof tryShowPendingAdminGiftPopup === "function") {
    setTimeout(() => tryShowPendingAdminGiftPopup(), 240);
  }
};

window.showLoginScreen = function (opts = {}) {
  switchScreen("loginScreen", opts);
  updateHeaderUserUI();
};

window.showHome = function (opts = {}) {
  updateHeaderUserUI();
  switchScreen("homeScreen", opts);
};

let _bootWarmupPromise = null;
window.runBootWarmupToHome = async function (opts = {}) {
  if (_bootWarmupPromise) return _bootWarmupPromise;
  _bootWarmupPromise = (async () => {
    const durationMs = Math.max(350, Number(opts.durationMs) || 650);
    const overlay = document.getElementById("bootWarmupOverlay");
    const avatarCv = document.getElementById("bootWarmupAvatar");
    const barFill = document.getElementById("bootWarmupBarFill");
    const cfg =
      typeof userState !== "undefined" && userState.avatarConfig
        ? userState.avatarConfig
        : typeof DEFAULT_AVATAR_CONFIG !== "undefined"
        ? DEFAULT_AVATAR_CONFIG
        : null;

    try {
      if (overlay) overlay.classList.remove("hidden");
      if (barFill) barFill.style.width = "18%";
      if (avatarCv && cfg && typeof renderPixelAvatar === "function") {
        renderPixelAvatar(avatarCv, cfg, { transparentBg: true, skipEffectLoop: true });
      }

      if (typeof AvatarRenderEngine !== "undefined" && typeof AvatarRenderEngine.warmupAvatar === "function" && cfg) {
        AvatarRenderEngine.warmupAvatar(cfg);
      }
      if (barFill) barFill.style.width = "52%";

      await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, Math.round(durationMs * 0.45))));
      if (typeof unlockQuizAudio === "function") {
        try { unlockQuizAudio(); } catch (e) {}
      }
      if (barFill) barFill.style.width = "82%";

      if (typeof claimMyArcadeWeeklyRewardsSilent === "function") {
        try { await claimMyArcadeWeeklyRewardsSilent(); } catch (e) {}
      }

      await new Promise(resolve => setTimeout(resolve, Math.round(durationMs * 0.45)));
      if (barFill) barFill.style.width = "100%";
      if (typeof showHome === "function") {
        showHome({ replaceHistory: opts.replaceHistory !== false });
      }
    } catch (e) {
      if (typeof showHome === "function") {
        showHome({ replaceHistory: opts.replaceHistory !== false });
      }
    } finally {
      if (overlay) {
        setTimeout(() => {
          overlay.classList.add("hidden");
          if (barFill) barFill.style.width = "0%";
        }, 90);
      }
      _bootWarmupPromise = null;
    }
  })();
  return _bootWarmupPromise;
};

window.showSetup = function () {
  updateLobbyCounts();
  switchScreen("setupScreen");
};

window.updateLobbyCounts = function () {
  const filtered = getFilteredQuestions();
  const countBadge = document.getElementById("availablePoolCount");
  if (countBadge) {
    const diffTag = state.quizDifficulty === "hard" ? "🔥고수×2 " : "";
    countBadge.textContent = `${diffTag}${state.hardMode ? "하드풀 " : ""}총 ${filtered.length}문제`;
  }
};

window.selectQuizDifficulty = function (diff) {
  state.quizDifficulty = diff === "hard" ? "hard" : "normal";
  syncSetupOptionChips();
  updateLobbyCounts();
};

function initEvents() {
  setupMobileKeyboardViewportHandler();
  resetHistoryToExitBase();
  updateHeaderUserUI();

  safeOn("headerMyProfileTrigger", "click", openMyProfileModal);
  safeOn("headerCdBtn", "click", openShopModal);
  safeOn("openPatchBtn", "click", openPatchNotesModal);
  safeOn("openSettingsBtn", "click", () => openModal("settingsModal"));
  safeOn("setupBackHomeBtn", "click", showHome);
  syncPatchNotesNotiDot();

  safeOn("volumeSlider", "input", e => {
    state.audioEl.volume = Number(e.target.value);
  });

  document.querySelectorAll("[data-decade]").forEach(el => {
    el.addEventListener("click", () => {
      const dec = el.getAttribute("data-decade");
      if (state.decades.has(dec)) {
        if (state.decades.size > 1) state.decades.delete(dec);
      } else {
        state.decades.add(dec);
      }
      syncDecadeChips();
      updateLobbyCounts();
    });
  });

  document.querySelectorAll("[data-mode]").forEach(el => {
    el.addEventListener("click", () => {
      state.mode = el.getAttribute("data-mode");
      document.querySelectorAll("[data-mode]").forEach(c => c.classList.remove("active"));
      el.classList.add("active");
    });
  });

  document.querySelectorAll("[data-stage]").forEach(el => {
    el.addEventListener("click", () => {
      state.stage = Number(el.getAttribute("data-stage"));
      document.querySelectorAll("[data-stage]").forEach(c => c.classList.remove("active"));
      el.classList.add("active");
    });
  });

  document.querySelectorAll("[data-limit]").forEach(el => {
    el.addEventListener("click", () => {
      const val = el.getAttribute("data-limit");
      state.questionLimit = val === "infinite" ? "infinite" : Number(val);
      document.querySelectorAll("[data-limit]").forEach(c => c.classList.remove("active"));
      el.classList.add("active");
    });
  });

  safeOn("toggleTimeAttackBtn", "click", () => {
    state.timeAttack = !state.timeAttack;
    const btn = document.getElementById("toggleTimeAttackBtn");
    if (btn) btn.classList.toggle("active-time", state.timeAttack);
    const txt = document.getElementById("timeAttackStateText");
    if (txt) txt.textContent = state.timeAttack ? "ON (15초)" : "OFF";
  });

  safeOn("toggleHardModeBtn", "click", () => {
    state.hardMode = !state.hardMode;
    const btn = document.getElementById("toggleHardModeBtn");
    if (btn) btn.classList.toggle("active-hard", state.hardMode);
    const txt = document.getElementById("hardModeStateText");
    if (txt) txt.textContent = state.hardMode ? "ON" : "OFF";
    updateLobbyCounts();
  });

  safeOn("startGameBtn", "click", startGame);
  safeOn("backToLobbyBtn", "click", confirmExitSingleGame);
  safeOn("restartSameBtn", "click", startGame);
  safeOn("resultToLobbyBtn", "click", showHome);
  safeOn("shareResultBtn", "click", shareResultImage);

  safeOn("hintLetterBtn", "click", useLetterHint);
  safeOn("hintWrongDelBtn", "click", useWrongDeleteHint);
  safeOn("hintKeywordBtn", "click", useKeywordHint);
  safeOn("hintAudioBtn", "click", useAudioHint);
  safeOn("submitAnswerBtn", "click", checkUserAnswer);
  safeOn("skipQuestionBtn", "click", skipQuestion);
  safeOn("nextQuestionBtn", "click", nextQuestion);

  safeOn("artistInput", "keydown", e => {
    if (e.key === "Enter" && !e.isComposing) {
      e.preventDefault();
      const titleEl = document.getElementById("titleInput");
      if (state.stage === 3 && titleEl && !titleEl.value.trim()) {
        titleEl.focus();
        return;
      }
      checkUserAnswer();
    }
  });

  safeOn("titleInput", "keydown", e => {
    if (e.key === "Enter" && !e.isComposing) {
      e.preventDefault();
      checkUserAnswer();
    }
  });

  syncSetupOptionChips();
  updateLobbyCounts();
  window.closeAllModals();
  showLoginScreen();

  if (typeof loadRemoteQuestionsDb === "function") {
    loadRemoteQuestionsDb().then(() => {
      if (typeof updateLobbyCounts === "function") updateLobbyCounts();
    });
  }
  if (typeof initAuthPreferences === "function") {
    initAuthPreferences();
  }
  if (typeof restoreSupabaseSession === "function") {
    restoreSupabaseSession();
  }
}

function syncDecadeChips() {
  document.querySelectorAll("[data-decade]").forEach(el => {
    const dec = el.getAttribute("data-decade");
    el.classList.toggle("active", state.decades.has(dec));
  });
}

function syncSetupOptionChips() {
  syncDecadeChips();
  document.querySelectorAll("[data-mode]").forEach(el => {
    el.classList.toggle("active", el.getAttribute("data-mode") === state.mode);
  });
  document.querySelectorAll("[data-stage]").forEach(el => {
    el.classList.toggle("active", Number(el.getAttribute("data-stage")) === state.stage);
  });
  document.querySelectorAll("[data-limit]").forEach(el => {
    el.classList.toggle("active", el.getAttribute("data-limit") === String(state.questionLimit));
  });

  const isHard = state.quizDifficulty === "hard";
  const singleDiffWrap = document.getElementById("singleDifficultyToggle");
  if (singleDiffWrap) {
    singleDiffWrap.querySelectorAll(".diff-toggle-btn").forEach(btn => {
      const val = btn.getAttribute("data-quiz-diff") || btn.getAttribute("data-diff");
      btn.classList.toggle("active", val === state.quizDifficulty);
    });
  }
  const baseEl = document.getElementById("scoreRuleBasePts");
  const st3El = document.getElementById("scoreRuleStage3Pts");
  const hintLbl = document.getElementById("scoreRuleHintLabel");
  if (baseEl) baseEl.textContent = isHard ? "+200점 (×2)" : "+100점";
  if (st3El) st3El.textContent = isHard ? "+40점 (×2)" : "+20점";
  if (hintLbl) hintLbl.textContent = isHard ? "🔤·🔑·🎧 힌트" : "❌·🔑·🎧 힌트";
}

window.startRandomGame = function () {
  unlockQuizAudio();
  const modes = ["behind", "lyrics", "onesec"];
  const stages = [1, 2, 3];
  state.decades = new Set(["1990s", "2000s", "2010s", "2020s"]);
  state.mode = modes[Math.floor(Math.random() * modes.length)];
  state.stage = stages[Math.floor(Math.random() * stages.length)];
  state.questionLimit = 10;
  syncSetupOptionChips();
  updateLobbyCounts();
  startGame();
};

// ============================================================================
// 게임 시작 및 진행
// ============================================================================
window.startGame = function () {
  stopAudio();
  unlockQuizAudio();
  const candidates = getFilteredQuestions();
  if (candidates.length === 0) {
    gameAlert("선택한 조건에 해당하는 문제가 없습니다.");
    return;
  }

  const shuffled = shuffleArray(candidates);
  state.pool =
    state.questionLimit === "infinite"
      ? shuffled
      : shuffled.slice(0, Math.min(state.questionLimit, shuffled.length));

  state.currentIndex = 0;
  state.score = 0;
  state.streak = 0;
  state.hearts = 5;
  state.history = [];
  state.usedItemsInRun = new Set();
  state.item3SecActivatedQIdx = null;
  state.isUsing3Sec = false;
  state.doubleAttackActive = false;
  state.revivedInRun = false;
  state.usedWrongDelCount = 0;
  state.wrongDelCooldownUntil = 0;
  stopWrongDelCooldownTimer();
  state.currentChoices = null;
  state.pickedArtist = null;
  state.pickedTitle = null;

  loadCurrentQuestion();
};

function stopWrongDelCooldownTimer() {
  if (state.wrongDelTimerId) {
    clearInterval(state.wrongDelTimerId);
    state.wrongDelTimerId = null;
  }
}

function syncWrongDelButtonUI() {
  const btn = document.getElementById("hintWrongDelBtn");
  if (!btn) return;
  if (state.quizDifficulty !== "normal") {
    btn.classList.add("hidden");
    return;
  }
  btn.classList.remove("hidden");
  const remWrong = typeof window.countRemainingWrongChoices === "function"
    ? window.countRemainingWrongChoices(state.currentChoices, state.currentQ, state.stage)
    : 0;
  const remainMs = Math.max(0, (Number(state.wrongDelCooldownUntil) || 0) - Date.now());
  if (remainMs > 0) {
    const sec = Math.ceil(remainMs / 1000);
    btn.disabled = true;
    btn.classList.add("is-cooldown");
    btn.classList.remove("used");
    btn.innerHTML = `⏳ 쿨타임 ${sec}초<span class="hint-cost">(-15점)</span>`;
    return;
  }
  btn.classList.remove("is-cooldown");
  if (remWrong <= 0) {
    btn.disabled = true;
    btn.classList.add("used");
    btn.innerHTML = `❌ 제거 완료<span class="hint-cost">(-15점)</span>`;
  } else {
    btn.disabled = Boolean(state.questionEnded);
    btn.classList.remove("used");
    btn.innerHTML = `❌ 오답 지우기<span class="hint-cost">(-15점)</span>`;
  }
}

function startWrongDelCooldownTimer() {
  stopWrongDelCooldownTimer();
  syncWrongDelButtonUI();
  state.wrongDelTimerId = setInterval(() => {
    const remainMs = (Number(state.wrongDelCooldownUntil) || 0) - Date.now();
    syncWrongDelButtonUI();
    if (remainMs <= 0 || state.currentScreen !== "gameScreen") {
      stopWrongDelCooldownTimer();
    }
  }, 250);
}

function handleSingleChoiceSelect(type, label) {
  if (state.questionEnded || state.quizDifficulty !== "normal") return;
  const q = state.currentQ;
  if (!q) return;
  if (state.stage !== 3) {
    const ok = state.stage === 2 ? isArtistMatch(label, q) : isTitleMatch(label, q);
    finalizeQuestion(ok, `내 선택: ${label}`);
    return;
  }

  if (type === "artist") {
    if (state.pickedTitle) {
      state.pickedArtist = label;
      const artistOk = isArtistMatch(state.pickedArtist, q);
      const titleOk = isTitleMatch(state.pickedTitle, q);
      finalizeQuestion(artistOk && titleOk, `내 선택: ${state.pickedArtist} - ${state.pickedTitle}`);
      return;
    }
    state.pickedArtist = state.pickedArtist === label ? null : label;
    renderSingleChoices();
    return;
  }

  if (type === "title") {
    if (state.pickedArtist) {
      state.pickedTitle = label;
      const artistOk = isArtistMatch(state.pickedArtist, q);
      const titleOk = isTitleMatch(state.pickedTitle, q);
      finalizeQuestion(artistOk && titleOk, `내 선택: ${state.pickedArtist} - ${state.pickedTitle}`);
      return;
    }
    state.pickedTitle = state.pickedTitle === label ? null : label;
    renderSingleChoices();
  }
}

function renderSingleChoices() {
  const grid = document.getElementById("singleChoiceGrid");
  const guide = document.getElementById("singleChoiceGuide");
  if (!grid || !state.currentChoices) return;
  window.renderQuizChoiceGrid({
    containerEl: grid,
    guideEl: guide,
    choiceData: state.currentChoices,
    stage: state.stage,
    pickedArtist: state.pickedArtist,
    pickedTitle: state.pickedTitle,
    winnerReveal: null,
    penaltyLocked: false,
    onSelectSingle: label => handleSingleChoiceSelect("single", label),
    onSelectStage3Artist: label => handleSingleChoiceSelect("artist", label),
    onSelectStage3Title: label => handleSingleChoiceSelect("title", label)
  });
}

function loadCurrentQuestion() {
  switchScreen("gameScreen");
  const q = state.pool[state.currentIndex];
  const isNormal = state.quizDifficulty !== "hard";
  state.currentQ = q;
  state.usedHintLetter = false;
  state.usedHintKeyword = false;
  state.usedHintAudio = false;
  state.usedWrongDelCount = 0;
  state.pickedArtist = null;
  state.pickedTitle = null;
  state.questionEnded = false;
  state.oneSecOffsetIndex = 0;

  if (state.mode !== "onesec") {
    fetchItunesTrack(q);
  }

  const modeNames = { behind: "비하인드", lyrics: "가사", onesec: "1초듣기" };
  const stageNames = { 1: "1단계·노래", 2: "2단계·가수", 3: "3단계·모두" };

  document.getElementById("badgeDecade").textContent = `${q.year}년`;
  document.getElementById("badgeMode").textContent = modeNames[state.mode];
  document.getElementById("badgeStage").textContent = stageNames[state.stage];
  const diffBadge = document.getElementById("badgeDifficulty");
  if (diffBadge) {
    diffBadge.textContent = isNormal ? "😊 일반" : "🔥 고수×2";
    diffBadge.classList.toggle("is-normal-badge", isNormal);
    diffBadge.classList.toggle("is-hard-badge", !isNormal);
  }
  document.getElementById("badgeTimeAttack").classList.toggle("hidden", !state.timeAttack);

  const gameScreenEl = document.getElementById("gameScreen");
  if (gameScreenEl) {
    gameScreenEl.classList.toggle("is-choice-mode", isNormal);
    gameScreenEl.classList.toggle("has-3stage-choices", isNormal && state.stage === 3);
  }

  document.getElementById("progressText").textContent = `${state.currentIndex + 1}/${state.pool.length}`;
  document.getElementById("scoreText").textContent = `${state.score}점`;

  const heartsEl = document.getElementById("heartsDisplay");
  if (state.questionLimit === "infinite") {
    heartsEl.classList.remove("hidden");
    heartsEl.textContent = `❤️${state.hearts}`;
  } else {
    heartsEl.classList.add("hidden");
  }

  const givenBanner = document.getElementById("givenInfoBanner");
  if (state.stage === 1) {
    givenBanner.innerHTML = `<span>🎤 가수 힌트</span><strong>${q.artist}</strong>`;
  } else if (state.stage === 2) {
    givenBanner.innerHTML = `<span>🎯 목표</span><strong>이 곡의 가수를 맞히세요!</strong>`;
  } else {
    givenBanner.innerHTML = `<span>🎯 목표</span><strong>${isNormal ? "가수 + 노래 차례로 선택!" : "가수와 노래 제목 모두 입력"}</strong>`;
  }

  const qContent = document.getElementById("questionContent");
  const oneSecBox = document.getElementById("oneSecContainer");
  const qTypeTag = document.getElementById("questionTypeTag");

  if (state.mode === "behind") {
    qTypeTag.textContent = !isNormal ? "🔥 고수 비하인드 퀴즈" : "💡 비하인드 스토리 퀴즈";
    qContent.className = "question-content";
    qContent.textContent = q.behindQuestion;
    qContent.classList.remove("hidden");
    oneSecBox.classList.add("hidden");
  } else if (state.mode === "lyrics") {
    qTypeTag.textContent = "🎶 하이라이트 가사 보고 맞히기";
    qContent.className = "question-content lyrics-style";
    qContent.innerHTML = `" ${q.lyricsQuestion.replace(/\//g, "<br>")} "`;
    qContent.classList.remove("hidden");
    oneSecBox.classList.add("hidden");
  } else {
    qTypeTag.textContent = "⚡ 1초 듣고 맞히기";
    qContent.classList.add("hidden");
    oneSecBox.classList.remove("hidden");
    playAudioSnippet(1.0, 6, q, null, null, { isAutoPlay: true });
  }

  const btnLetter = document.getElementById("hintLetterBtn");
  const btnWrongDel = document.getElementById("hintWrongDelBtn");
  const btnKeyword = document.getElementById("hintKeywordBtn");
  const btnAudio = document.getElementById("hintAudioBtn");

  btnLetter.classList.toggle("hidden", isNormal);
  btnLetter.disabled = false;
  btnLetter.classList.remove("used");
  if (btnWrongDel) btnWrongDel.classList.toggle("hidden", !isNormal);
  btnKeyword.disabled = false;
  btnKeyword.classList.remove("used");

  if (state.mode === "onesec") {
    btnAudio.classList.add("hidden");
  } else {
    btnAudio.classList.remove("hidden");
    btnAudio.disabled = false;
    btnAudio.classList.remove("used");
  }

  document.getElementById("hintsDisplay").innerHTML = "";

  const answerArea = document.getElementById("singleAnswerArea");
  const choiceWrap = document.getElementById("singleChoiceWrap");
  const typingRow = document.getElementById("singleTypingInputRow");
  const submitBtn = document.getElementById("submitAnswerBtn");
  const artistGroup = document.getElementById("artistInputGroup");
  const titleGroup = document.getElementById("titleInputGroup");
  const artistInput = document.getElementById("artistInput");
  const titleInput = document.getElementById("titleInput");

  artistInput.value = "";
  titleInput.value = "";
  artistInput.enterKeyHint = state.stage === 3 ? "next" : "done";
  titleInput.enterKeyHint = "done";

  if (answerArea) answerArea.classList.toggle("is-choice-mode", isNormal);

  if (isNormal) {
    state.currentChoices = window.buildQuizChoicesForQuestion(
      q,
      state.stage,
      getFilteredQuestions(),
      `${Date.now()}_${q.id}_${state.currentIndex}_${Math.random()}`
    );
    if (choiceWrap) choiceWrap.classList.remove("hidden");
    if (typingRow) typingRow.classList.add("hidden");
    if (submitBtn) submitBtn.classList.add("hidden");
    renderSingleChoices();
    if ((Number(state.wrongDelCooldownUntil) || 0) > Date.now()) {
      startWrongDelCooldownTimer();
    } else {
      syncWrongDelButtonUI();
    }
  } else {
    state.currentChoices = null;
    if (choiceWrap) choiceWrap.classList.add("hidden");
    if (typingRow) typingRow.classList.remove("hidden");
    if (submitBtn) submitBtn.classList.remove("hidden");
    if (state.stage === 1) {
      artistGroup.classList.add("hidden");
      titleGroup.classList.remove("hidden");
    } else if (state.stage === 2) {
      artistGroup.classList.remove("hidden");
      titleGroup.classList.add("hidden");
    } else {
      artistGroup.classList.remove("hidden");
      titleGroup.classList.remove("hidden");
    }
  }

  startTimeAttackTimer();
  renderSingleItemSlotsBar();
}

function getChosungString(str) {
  const CHO = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
  let res = "";
  for (const ch of String(str || "")) {
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      res += CHO[Math.floor((code - 0xac00) / 588)];
    } else {
      res += ch;
    }
  }
  return res;
}
window.getChosungString = getChosungString;

window.renderSingleItemSlotsBar = function () {
  const bar = document.getElementById("singleItemSlotsBar");
  if (!bar) return;
  const equipped = (typeof userState !== "undefined" && Array.isArray(userState.equippedItems)) ? userState.equippedItems : [];
  if (equipped.length === 0) {
    bar.innerHTML = `<span style="font-size:0.72rem; color:#94a3b8;">🎒 가방에서 아이템을 장착하면 여기서 바로 쓸 수 있습니다</span>`;
    return;
  }
  bar.innerHTML = equipped
    .map(id => {
      const meta = typeof getGameItemById === "function" ? getGameItemById(id) : null;
      if (!meta) return "";
      const cnt = typeof getConsumableCount === "function" ? getConsumableCount(id) : 0;
      const isSameQ3Sec = id === "item_3sec" && state.item3SecActivatedQIdx === state.currentIndex;
      const used = state.usedItemsInRun && state.usedItemsInRun.has(id) && !isSameQ3Sec;
      let scopeDisabled = false;
      if (id === "item_hourglass" && !state.timeAttack) scopeDisabled = true;
      if ((id === "item_heart" || id === "item_revive") && state.questionLimit !== "infinite") scopeDisabled = true;
      const isNormalChosung = id === "item_chosung" && state.quizDifficulty !== "hard";
      if (isNormalChosung && typeof window.countRemainingWrongChoices === "function") {
        if (window.countRemainingWrongChoices(state.currentChoices, state.currentQ, state.stage) <= 0) {
          scopeDisabled = true;
        }
      }
      const isPassiveRevive = id === "item_revive";
      const disabled = used || (!isSameQ3Sec && cnt <= 0) || scopeDisabled || isPassiveRevive;
      const title = isPassiveRevive
        ? "하트 0 시 자동 발동"
        : isSameQ3Sec
        ? "이 문제에서 추가 차감 없이 다시 듣기"
        : isNormalChosung
        ? "일반 난이도: 오답 보기 1개를 즉시 지웁니다 (3단계는 가수+노래 각 1개)"
        : meta.desc;
      const labelText = isSameQ3Sec
        ? "🎧 3초 다시듣기 (무료)"
        : isNormalChosung
        ? `❌ 오답지우기 (${cnt})`
        : `${meta.name} (${cnt})`;
      return `<button type="button" class="quick-item-btn ${used ? "is-used" : ""}" ${disabled ? "disabled" : ""} title="${title}" onclick="useSingleGameItem('${id}')">${labelText}</button>`;
    })
    .join("");
};

window.useSingleGameItem = async function (itemId) {
  if (state.questionEnded) return;
  if (!state.usedItemsInRun) state.usedItemsInRun = new Set();

  const q = state.currentQ;
  if (itemId === "item_3sec" && state.item3SecActivatedQIdx === state.currentIndex) {
    if (state.isUsing3Sec) return;
    state.isUsing3Sec = true;
    try {
      await playAudioSnippet(3.0, 6, q, null, null, { isAutoPlay: false });
    } finally {
      state.isUsing3Sec = false;
    }
    return;
  }

  if (state.usedItemsInRun.has(itemId)) {
    gameAlert("이 아이템은 판당 1회만 사용할 수 있습니다!");
    return;
  }
  if (itemId === "item_hourglass" && !state.timeAttack) {
    gameAlert("모래시계는 타임어택 ON 모드에서만 사용할 수 있습니다!");
    return;
  }
  if (itemId === "item_heart" && state.questionLimit !== "infinite") {
    gameAlert("하트요정은 무한도전 모드에서만 사용할 수 있습니다!");
    return;
  }
  if (itemId === "item_revive") {
    gameAlert("부활날개는 장착 시 하트가 0이 될 때 자동으로 부활 여부를 물어봅니다!");
    return;
  }

  const cnt = typeof getConsumableCount === "function" ? getConsumableCount(itemId) : 0;
  if (cnt <= 0) {
    gameAlert("보유 수량이 부족합니다!");
    return;
  }

  if (itemId === "item_3sec") {
    if (state.isUsing3Sec) return;
    state.isUsing3Sec = true;
    let playedOk = false;
    try {
      playedOk = await playAudioSnippet(3.0, 6, q, null, null, { isAutoPlay: false });
    } finally {
      state.isUsing3Sec = false;
    }
    if (!playedOk || state.questionEnded) {
      return;
    }
    const latestCnt = typeof getConsumableCount === "function" ? getConsumableCount(itemId) : cnt;
    userState.inventory[itemId] = Math.max(0, latestCnt - 1);
    state.usedItemsInRun.add(itemId);
    state.item3SecActivatedQIdx = state.currentIndex;
    if (typeof syncProfileToServer === "function") syncProfileToServer();
    appendHintBox("🎧 3초 듣기", "하이라이트 3초 재생! (이 문제에서는 재재생 무료)");
    renderSingleItemSlotsBar();
    return;
  }

  if (itemId === "item_chosung" && state.quizDifficulty !== "hard") {
    if (!state.currentChoices || typeof window.countRemainingWrongChoices !== "function" || window.countRemainingWrongChoices(state.currentChoices, q, state.stage) <= 0) {
      gameAlert("더 이상 지울 수 있는 오답 보기가 없습니다!");
      return;
    }
  }

  userState.inventory[itemId] = cnt - 1;
  state.usedItemsInRun.add(itemId);
  if (typeof syncProfileToServer === "function") syncProfileToServer();

  if (itemId === "item_chosung") {
    if (state.quizDifficulty !== "hard" && typeof window.eliminateWrongChoiceInData === "function") {
      const elim = window.eliminateWrongChoiceInData(state.currentChoices, q, state.stage);
      if (elim && elim.changed) {
        if (state.pickedArtist && elim.eliminatedArtists.includes(state.pickedArtist)) state.pickedArtist = null;
        if (state.pickedTitle && elim.eliminatedTitles.includes(state.pickedTitle)) state.pickedTitle = null;
        renderSingleChoices();
        syncWrongDelButtonUI();
        const msg =
          state.stage === 3
            ? "가수 1개 · 노래 1개 오답을 제거했습니다!"
            : `오답 보기 [${(elim.eliminatedOptions || [])[0] || ""}] 제거 완료!`;
        appendHintBox("❌ 오답지우기 아이템", msg);
      }
    } else {
      const chosungText =
        state.stage === 1
          ? `노래 초성: <strong>${getChosungString(q.title)}</strong>`
          : state.stage === 2
          ? `가수 초성: <strong>${getChosungString(q.artist)}</strong>`
          : `가수: <strong>${getChosungString(q.artist)}</strong> / 노래: <strong>${getChosungString(q.title)}</strong>`;
      appendHintBox("🔤 초성힌트", chosungText);
    }
  } else if (itemId === "item_hourglass") {
    state.timeLeftMs = (Number(state.timeLeftMs) || 0) + 10000;
    state.maxTimeMs = Math.max(Number(state.maxTimeMs) || 15000, state.timeLeftMs);
    appendHintBox("⏳ 모래시계", "제한시간 +10초 연장!");
  } else if (itemId === "item_heart") {
    state.hearts = (Number(state.hearts) || 0) + 1;
    const heartsEl = document.getElementById("heartsDisplay");
    if (heartsEl) heartsEl.textContent = `❤️${state.hearts}`;
    appendHintBox("💖 하트요정", `하트 +1 추가 (현재 ❤️${state.hearts})`);
  } else if (itemId === "item_double") {
    state.doubleAttackActive = true;
    appendHintBox("⚡ 더블어택", "이번 판 최종 점수(랭킹)·EXP·CD 2배 적용!");
  }
  renderSingleItemSlotsBar();
};

window.playOneSecMain = function () {
  const offsets = [6, 12, 18];
  const offset = offsets[state.oneSecOffsetIndex % offsets.length];
  playAudioSnippet(1.0, offset);
};

window.playOneSecAltOffset = function () {
  state.oneSecOffsetIndex++;
  const offsets = [6, 12, 18];
  const offset = offsets[state.oneSecOffsetIndex % offsets.length];
  playAudioSnippet(1.0, offset);
};

function useWrongDeleteHint() {
  if (state.questionEnded || state.quizDifficulty !== "normal") return;
  const now = Date.now();
  if ((Number(state.wrongDelCooldownUntil) || 0) > now) {
    const remSec = Math.ceil((state.wrongDelCooldownUntil - now) / 1000);
    gameAlert(`❌ 오답 지우기 쿨타임 중입니다! (${remSec}초 남음)`);
    return;
  }
  const q = state.currentQ;
  if (!q || !state.currentChoices || typeof window.eliminateWrongChoiceInData !== "function") return;
  const elim = window.eliminateWrongChoiceInData(state.currentChoices, q, state.stage);
  if (!elim || !elim.changed) {
    gameAlert("더 이상 지울 수 있는 오답 보기가 없습니다!");
    syncWrongDelButtonUI();
    return;
  }
  if (state.pickedArtist && elim.eliminatedArtists.includes(state.pickedArtist)) state.pickedArtist = null;
  if (state.pickedTitle && elim.eliminatedTitles.includes(state.pickedTitle)) state.pickedTitle = null;

  state.usedWrongDelCount = (Number(state.usedWrongDelCount) || 0) + 1;
  state.wrongDelCooldownUntil = Date.now() + 20000;
  renderSingleChoices();
  startWrongDelCooldownTimer();

  const detail =
    state.stage === 3
      ? "오답 가수 1명 + 노래 1곡 제거됨 (쿨타임 20초)"
      : `오답 [${(elim.eliminatedOptions || [])[0] || ""}] 제거됨 (쿨타임 20초)`;
  appendHintBox("❌ 오답 지우기", detail);
}

function useLetterHint() {
  if (state.usedHintLetter || state.questionEnded) return;
  state.usedHintLetter = true;
  const q = state.currentQ;

  const btn = document.getElementById("hintLetterBtn");
  btn.classList.add("used");
  btn.disabled = true;

  let text = "";
  if (state.stage === 1) {
    text = `노래: <span class="letter-boxes">${buildLetterBoxHint(q.title)}</span>`;
  } else if (state.stage === 2) {
    text = `가수: <span class="letter-boxes">${buildLetterBoxHint(q.artist)}</span>`;
  } else {
    text = `가수 <span class="letter-boxes">${buildLetterBoxHint(q.artist)}</span> / 노래 <span class="letter-boxes">${buildLetterBoxHint(q.title)}</span>`;
  }

  appendHintBox("🔤 글자수", text);
}

function useKeywordHint() {
  if (state.usedHintKeyword || state.questionEnded) return;
  state.usedHintKeyword = true;
  const q = state.currentQ;

  const btn = document.getElementById("hintKeywordBtn");
  btn.classList.add("used");
  btn.disabled = true;

  const safeKeywordHint =
    typeof sanitizeKeywordHint === "function"
      ? sanitizeKeywordHint(q.keywordHint, q, {
          maskArtist: state.stage !== 1,
          maskTitle: state.stage !== 2
        })
      : q.keywordHint;

  appendHintBox("🔑 포인트 단어", `<strong>${safeKeywordHint}</strong>`);
}

function useAudioHint() {
  if (state.mode === "onesec" || state.questionEnded) return;
  if (!state.usedHintAudio) {
    state.usedHintAudio = true;
    const btn = document.getElementById("hintAudioBtn");
    btn.classList.add("used");
    appendHintBox("🎧 노래 힌트", "2.5초 하이라이트 재생됨");
  }
  playAudioSnippet(2.5, 8);
}

function appendHintBox(label, htmlContent) {
  const container = document.getElementById("hintsDisplay");
  const box = document.createElement("div");
  box.className = "hint-box";
  box.innerHTML = `<span>${label}</span><span>${htmlContent}</span>`;
  container.appendChild(box);
}

function checkUserAnswer() {
  if (state.questionEnded) return;
  const q = state.currentQ;
  const artistVal = document.getElementById("artistInput").value.trim();
  const titleVal = document.getElementById("titleInput").value.trim();

  if (state.stage === 1 && !titleVal) {
    gameAlert("노래 제목을 입력해주세요!");
    return;
  }
  if (state.stage === 2 && !artistVal) {
    gameAlert("가수 이름을 입력해주세요!");
    return;
  }
  if (state.stage === 3 && (!artistVal || !titleVal)) {
    gameAlert("3단계는 가수 이름과 노래 제목을 모두 입력해야 합니다!");
    return;
  }

  const artistOk = state.stage === 1 ? true : isArtistMatch(artistVal, q);
  const titleOk = state.stage === 2 ? true : isTitleMatch(titleVal, q);
  const isCorrect = artistOk && titleOk;

  let userSubmitSummary = "";
  if (state.stage === 1) userSubmitSummary = `내 입력: ${titleVal}`;
  else if (state.stage === 2) userSubmitSummary = `내 입력: ${artistVal}`;
  else userSubmitSummary = `내 입력: ${artistVal} - ${titleVal}`;

  finalizeQuestion(isCorrect, userSubmitSummary);
}

function skipQuestion() {
  if (state.questionEnded) return;
  finalizeQuestion(false, "내 선택: 패스 (모르겠어요)");
}

async function finalizeQuestion(isCorrect, userSubmitSummary) {
  state.questionEnded = true;
  stopAudio();
  stopTimeAttackTimer();
  const q = state.currentQ;
  const isHardDiff = state.quizDifficulty === "hard";

  let gained = 0;
  if (isCorrect) {
    gained = 100;
    if (state.usedHintLetter) gained -= 15;
    if (state.usedHintKeyword) gained -= 15;
    if (state.usedHintAudio) gained -= 20;
    if (state.usedWrongDelCount > 0) gained -= Math.min(45, state.usedWrongDelCount * 15);
    gained = Math.max(10, gained);
    if (state.stage === 3) gained += 20;
    if (state.timeAttack) gained *= 2;
    if (isHardDiff) gained *= 2;
    state.score += gained;
    state.streak++;
    if (typeof window.triggerGameHaptic === "function") window.triggerGameHaptic("success");
  } else {
    state.streak = 0;
    if (state.questionLimit === "infinite") {
      state.hearts--;
    }
    if (typeof window.triggerGameHaptic === "function") window.triggerGameHaptic("error");
  }

  state.history.push({ q, correct: isCorrect, gained });

  const judgeCard = document.getElementById("judgeCard");
  const statusPill = document.getElementById("judgeStatusPill");
  const submitInfo = document.getElementById("judgeUserSubmitInfo");

  judgeCard.classList.toggle("is-correct", isCorrect);
  judgeCard.classList.toggle("is-wrong", !isCorrect);

  if (isCorrect) {
    statusPill.textContent = `⭕ 정답입니다! (+${gained}점${state.timeAttack ? " · 타임어택×2" : ""}${isHardDiff ? " · 고수×2" : ""})`;
  } else {
    statusPill.textContent =
      state.questionLimit === "infinite" && state.hearts <= 0
        ? "💔 오답! 하트를 모두 소진했습니다"
        : "❌ 아쉽네요! 오답입니다";
  }

  submitInfo.textContent = userSubmitSummary;
  document.getElementById("revealTitle").textContent = `${q.artist} - ${q.title}`;
  document.getElementById("revealAliases").textContent =
    q.artistAliases && q.artistAliases.length > 0
      ? `${q.year}년 발매 · 인정 답안: ${[q.artist, ...q.artistAliases].join(", ")}`
      : `${q.year}년 발매 (${q.decade.replace("s", "년대")})`;
  document.getElementById("revealNote").textContent = q.behindAnswerNote || q.behindQuestion;

  const thumb = document.getElementById("revealThumb");
  thumb.src =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='100%' height='100%' fill='%23eef2ff'/><text x='50%' y='54%' font-size='28' text-anchor='middle'>🎵</text></svg>";

  switchScreen("judgeScreen");

  const nextBtn = document.getElementById("nextQuestionBtn");
  const isLast =
    state.questionLimit === "infinite"
      ? state.hearts <= 0
      : state.currentIndex + 1 >= state.pool.length;
  nextBtn.textContent = isLast ? "🏆 최종 결과 보기 ➔" : "다음 문제 넘어가기 ➔";

  const track = await fetchItunesTrack(q);
  if (track && track.artworkUrl) {
    thumb.src = track.artworkUrl;
  }
}

window.playFullPreviewInReveal = function () {
  playAudioSnippet(10, 5);
};

function nextQuestion() {
  stopAudio();
  if (state.questionLimit === "infinite") {
    if (state.hearts <= 0) {
      const canRevive =
        !state.revivedInRun &&
        typeof userState !== "undefined" &&
        Array.isArray(userState.equippedItems) &&
        userState.equippedItems.includes("item_revive") &&
        typeof getConsumableCount === "function" &&
        getConsumableCount("item_revive") > 0;

      if (canRevive) {
        gameConfirm(
          "하트가 모두 소진되었습니다!\n장착 중인 [🪽 부활날개] 1개를 사용하여 하트 1개로 이어하시겠습니까?",
          async () => {
            userState.inventory.item_revive = getConsumableCount("item_revive") - 1;
            if (!state.usedItemsInRun) state.usedItemsInRun = new Set();
            state.usedItemsInRun.add("item_revive");
            state.revivedInRun = true;
            state.hearts = 1;
            if (typeof syncProfileToServer === "function") await syncProfileToServer();
            advanceInfiniteNextQuestion();
          },
          "🪽 부활날개 발동!",
          () => showFinalResult()
        );
        return;
      }
      showFinalResult();
      return;
    }
    advanceInfiniteNextQuestion();
    return;
  }

  if (state.currentIndex + 1 >= state.pool.length) {
    showFinalResult();
  } else {
    state.currentIndex++;
    loadCurrentQuestion();
  }
}

function advanceInfiniteNextQuestion() {
  if (state.currentIndex + 1 >= state.pool.length) {
    const extra = shuffleArray(getFilteredQuestions());
    if (extra.length > 0) {
      state.pool.push(...extra);
    }
  }
  if (state.currentIndex + 1 >= state.pool.length) {
    showFinalResult();
  } else {
    state.currentIndex++;
    loadCurrentQuestion();
  }
}

async function showFinalResult() {
  switchScreen("resultScreen");

  const solvedCount = state.history.filter(h => h.correct).length;
  const totalTried = state.history.length;
  const accuracy = totalTried > 0 ? Math.round((solvedCount / totalTried) * 100) : 0;

  let rankTitle = "🎧 음악 입문자";
  if (accuracy >= 90 && solvedCount >= 8) rankTitle = "👑 전설의 음악왕";
  else if (accuracy >= 75) rankTitle = "🔥 가요계 척척박사";
  else if (accuracy >= 50) rankTitle = "🎶 음악 고수";

  const effectiveScore = state.doubleAttackActive ? state.score * 2 : state.score;
  const isNoItemClear = !state.usedItemsInRun || state.usedItemsInRun.size === 0;
  const isPerfectClear =
    state.questionLimit !== "infinite" &&
    totalTried > 0 &&
    totalTried === state.pool.length &&
    state.history.every(h => h.correct);

  let infiniteTierRate = 0;
  let infiniteTierLabel = "";
  if (state.questionLimit === "infinite") {
    if (solvedCount >= 100) {
      infiniteTierRate = 0.50;
      infiniteTierLabel = "🔥 100+정답 +50%";
    } else if (solvedCount >= 70) {
      infiniteTierRate = 0.30;
      infiniteTierLabel = "🔥 70+정답 +30%";
    } else if (solvedCount >= 50) {
      infiniteTierRate = 0.20;
      infiniteTierLabel = "🔥 50+정답 +20%";
    } else if (solvedCount >= 30) {
      infiniteTierRate = 0.10;
      infiniteTierLabel = "🔥 30+정답 +10%";
    }
  }

  const totalBonusRate = (isNoItemClear ? 0.10 : 0) + (isPerfectClear ? 0.10 : 0) + infiniteTierRate;
  const totalBonusPct = Math.round(totalBonusRate * 100);
  const bonusTags = [];
  if (isNoItemClear) bonusTags.push("🌿 노템 +10%");
  if (isPerfectClear) bonusTags.push("✨ 퍼펙트 +10%");
  if (infiniteTierLabel) bonusTags.push(infiniteTierLabel);

  document.getElementById("finalPlayerBadge").textContent = `🎤 도전자: ${userState?.nickname || "도전자"}`;
  document.getElementById("finalRankTitle").textContent = rankTitle;
  document.getElementById("finalScoreText").textContent =
    state.doubleAttackActive
      ? `총점 ${effectiveScore}점 (기본 ${state.score} ×2 · 정답 ${solvedCount}/${totalTried} · ${accuracy}%)`
      : `총점 ${effectiveScore}점 (정답 ${solvedCount}/${totalTried} · ${accuracy}%)`;

  const decadeStr =
    state.decades.size === 4
      ? "전연대(90~20s)"
      : Array.from(state.decades)
          .map(d => d.replace("s", "년대"))
          .join("·");
  const modeStr = { behind: "📖비하인드", lyrics: "📝가사", onesec: "⚡1초듣기" }[state.mode];
  const stageStr = `${state.stage}단계(${state.stage === 1 ? "노래" : state.stage === 2 ? "가수" : "가수+노래"})`;
  const limitStr = state.questionLimit === "infinite" ? "🔥무한도전" : `${state.questionLimit}문제`;

  const isHardDiff = state.quizDifficulty === "hard";
  const specsBar = document.getElementById("clearedSpecsBar");
  specsBar.innerHTML = `
    <span class="badge ${isHardDiff ? "is-hard-badge" : "is-normal-badge"}">${isHardDiff ? "🔥고수×2" : "😊일반"}</span>
    <span class="badge primary">${decadeStr}</span>
    <span class="badge accent">${modeStr}</span>
    <span class="badge">${stageStr}</span>
    <span class="badge">${limitStr}</span>
    ${state.timeAttack ? `<span class="badge gold">⏱️타임어택×2</span>` : ""}
    ${state.hardMode ? `<span class="badge" style="background:#fff1f2; color:#be123c; border-color:#f43f5e;">🔥하드모드</span>` : ""}
    ${state.doubleAttackActive ? `<span class="badge gold">⚡더블어택×2</span>` : ""}
    ${isNoItemClear ? `<span class="badge" style="background:#ecfdf5; color:#047857; border-color:#6ee7b7;">🌿노템 +10%</span>` : ""}
    ${isPerfectClear ? `<span class="badge" style="background:#fef3c7; color:#b45309; border-color:#f59e0b;">✨퍼펙트 +10%</span>` : ""}
    ${infiniteTierLabel ? `<span class="badge" style="background:#ffe4e6; color:#be123c; border-color:#fb7185;">${infiniteTierLabel}</span>` : ""}
  `;

  const rawBaseCd = Math.max(solvedCount > 0 ? (isHardDiff ? 10 : 5) : 0, Math.floor(effectiveScore / 10));
  const rawBaseExp = Math.max(0, Math.round(effectiveScore * 0.1));
  const bonusMult = 1 + totalBonusRate;
  const baseCd = rawBaseCd > 0 ? Math.round(rawBaseCd * bonusMult) : 0;
  const baseExpVal = rawBaseExp > 0 ? Math.round(rawBaseExp * bonusMult) : 0;

  let insertedRankRowId = null;
  if (effectiveScore > 0 && typeof submitScoreToRanking === "function") {
    insertedRankRowId = await submitScoreToRanking({
      decadeFilter: decadeStr,
      mode: state.mode,
      stage: state.stage,
      limit: state.questionLimit,
      timeAttack: state.timeAttack,
      score: effectiveScore,
      accuracy
    });
  }

  let rewardResult = {
    baseCd,
    earnedCd: baseCd,
    finalCd: baseCd,
    baseExp: baseExpVal,
    finalExp: baseExpVal,
    multiplier: 1,
    achievedTopRank: null,
    totalBonusPct,
    bonusTags,
    expBefore: userState.exp || 0,
    expAfter: (userState.exp || 0) + baseExpVal
  };
  if (typeof checkAndProcessGameRewards === "function") {
    const res = await checkAndProcessGameRewards(effectiveScore, state.mode, state.stage, baseCd, {
      baseExpOverride: baseExpVal,
      insertedRankRowId
    });
    rewardResult = { ...rewardResult, ...res, totalBonusPct, bonusTags };
  } else {
    if (baseCd > 0) userState.cdCoins = (Number(userState.cdCoins) || 0) + baseCd;
    if (baseExpVal > 0) userState.exp = (Number(userState.exp) || 0) + baseExpVal;
  }

  const finalCdGain = Number(rewardResult.earnedCd) || 0;
  const bonusNoteStr =
    totalBonusPct > 0 ? ` [${bonusTags.join(" + ")} = 총 +${totalBonusPct}%]` : "";
  document.getElementById("finalCdEarnedText").textContent =
    rewardResult.multiplier > 1
      ? `💿 획득 보상: +${finalCdGain.toLocaleString()} CD${bonusNoteStr} (🏆 랭킹 ${rewardResult.achievedTopRank}위 ×${rewardResult.multiplier}배!) 지급 완료! (보유: ${(userState.cdCoins || 0).toLocaleString()} CD)`
      : `💿 획득 보상: +${finalCdGain.toLocaleString()} CD${bonusNoteStr} 지급 완료! (보유: ${(userState.cdCoins || 0).toLocaleString()} CD)`;

  state.resultPlayingIndex = null;
  const listEl = document.getElementById("historyList");
  listEl.innerHTML = state.history
    .map(
      (item, idx) => `
      <div class="hint-box result-history-row" style="background:${item.correct ? "#ecfdf5" : "#fff1f2"}; border-color:${item.correct ? "#a7f3d0" : "#fecdd3"}; color:var(--text-main);">
        <span class="result-history-title"><strong>#${idx + 1}</strong> [${item.q.year}] ${item.q.artist} - ${item.q.title}</span>
        <span class="result-history-actions">
          <button type="button" class="result-preview-btn" data-hist-idx="${idx}" onclick="toggleResultSongPreview(${idx})">▶ 듣기</button>
          <span style="font-weight:800; color:${item.correct ? "var(--success)" : "var(--danger)"};">${item.correct ? "⭕ 정답" : "❌ 오답"}</span>
        </span>
      </div>
    `
    )
    .join("");

  if (typeof window.recordDailyQuestProgress === "function") {
    try { window.recordDailyQuestProgress("quiz", 1); } catch (e) {}
  }

  showRewardSummaryModal(rewardResult);
}

// ============================================================================
// 결과 보상 정산 · 경험치 바 상승(%) 애니메이션 · TOP 3 폭죽 파티클
// ============================================================================
let confettiAnimId = null;

window.launchTop3Confetti = function () {
  const cv = document.getElementById("confettiCanvas");
  if (!cv) return;
  cv.classList.remove("hidden");
  cv.width = window.innerWidth;
  cv.height = window.innerHeight;
  const ctx = cv.getContext("2d");

  const colors = ["#facc15", "#f43f5e", "#38bdf8", "#4ade80", "#a855f7", "#fb923c"];
  const particles = Array.from({ length: 120 }, () => ({
    x: Math.random() * cv.width,
    y: Math.random() * -cv.height * 0.6 - 20,
    vx: (Math.random() - 0.5) * 6,
    vy: Math.random() * 4 + 3,
    w: Math.random() * 10 + 6,
    h: Math.random() * 6 + 4,
    rot: Math.random() * Math.PI * 2,
    vRot: (Math.random() - 0.5) * 0.25,
    color: colors[Math.floor(Math.random() * colors.length)]
  }));

  if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
  const startTime = Date.now();

  const frame = () => {
    ctx.clearRect(0, 0, cv.width, cv.height);
    let alive = false;
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.rot += p.vRot;
      if (p.y < cv.height + 30) alive = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    if (alive && Date.now() - startTime < 4500) {
      confettiAnimId = requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, cv.width, cv.height);
      cv.classList.add("hidden");
    }
  };
  confettiAnimId = requestAnimationFrame(frame);
};

window.showRewardSummaryModal = function (res) {
  const modal = document.getElementById("rewardSummaryModal");
  if (!modal) return;

  const beforeLv = getLevelInfo(res.expBefore);
  const afterLv = getLevelInfo(res.expAfter);

  const top3Banner = document.getElementById("rewardTop3Banner");
  if (top3Banner) {
    if (res.achievedTopRank && res.achievedTopRank <= 3) {
      const medal = res.achievedTopRank === 1 ? "🥇 1위" : res.achievedTopRank === 2 ? "🥈 2위" : "🥉 3위";
      top3Banner.innerHTML = `🎉 축하합니다! 랭킹 <strong>${medal}</strong> 신규 달성!<br/>보너스 경험치 · CD <strong>×${res.multiplier}배</strong> 동시 적용!`;
      top3Banner.classList.remove("hidden");
      launchTop3Confetti();
    } else {
      top3Banner.classList.add("hidden");
    }
  }

  const cdGainVal = Number(res.earnedCd) || 0;
  const bonusTags = Array.isArray(res.bonusTags) ? res.bonusTags : [];
  const totalBonusPct = Number(res.totalBonusPct) || 0;
  const bonusBanner = document.getElementById("rewardBonusBanner");
  if (bonusBanner) {
    if (totalBonusPct > 0 && bonusTags.length > 0) {
      bonusBanner.innerHTML = `${bonusTags.join(" · ")} <strong>(총 +${totalBonusPct}% 적용${res.multiplier > 1 ? ` × 랭킹 ${res.multiplier}배 중첩!` : ""})</strong>`;
      bonusBanner.classList.remove("hidden");
    } else {
      bonusBanner.classList.add("hidden");
    }
  }

  document.getElementById("rewardCdGain").textContent =
    res.multiplier > 1
      ? `+${cdGainVal.toLocaleString()} CD (×${res.multiplier}배!)`
      : `+${cdGainVal.toLocaleString()} CD`;
  document.getElementById("rewardExpGain").textContent =
    res.multiplier > 1
      ? `+${res.finalExp.toLocaleString()} EXP (×${res.multiplier}배!)`
      : `+${res.finalExp.toLocaleString()} EXP`;

  const rLvEl = document.getElementById("rewardLevelTitle");
  if (rLvEl) {
    rLvEl.innerHTML = typeof formatMusicRankBadgeHtml === "function"
      ? formatMusicRankBadgeHtml(res.expAfter, { size: 20 })
      : `Lv.${afterLv.level} ${afterLv.title}`;
  }
  document.getElementById("rewardLevelUpTag").classList.toggle("hidden", afterLv.level <= beforeLv.level);

  const leveledUp = afterLv.level > beforeLv.level;
  const startPct = leveledUp ? 0 : beforeLv.percent;
  const endPct = afterLv.percent;
  const deltaPct = leveledUp
    ? (100 - beforeLv.percent + endPct)
    : Math.max(0, endPct - beforeLv.percent);

  document.getElementById("rewardExpDetailText").textContent = afterLv.isMax
    ? `MAX (${afterLv.exp.toLocaleString()} EXP)`
    : `${afterLv.inLevelExp.toLocaleString()} / ${afterLv.needInLevel.toLocaleString()} EXP`;
  document.getElementById("rewardPercentDeltaText").textContent = `${endPct.toFixed(1)}% (+${deltaPct.toFixed(1)}% ↑)`;

  const barFill = document.getElementById("rewardExpBarFill");
  barFill.style.transition = "none";
  barFill.style.width = `${startPct.toFixed(1)}%`;

  modal.classList.remove("hidden");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      barFill.style.transition = "width 1.15s cubic-bezier(0.22, 1, 0.36, 1)";
      barFill.style.width = `${endPct.toFixed(1)}%`;
    });
  });
};

window.closeRewardSummaryModal = function () {
  closeModal("rewardSummaryModal");
  const cv = document.getElementById("confettiCanvas");
  if (cv) {
    if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
    cv.classList.add("hidden");
  }
};

async function shareResultImage() {
  const target = document.getElementById("resultCaptureTarget");
  const bottomBtns = document.getElementById("resultBottomActions");
  if (!target || typeof html2canvas === "undefined") {
    gameAlert("캡처 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
    return;
  }

  const previewBtns = Array.from(target.querySelectorAll(".result-preview-btn"));
  try {
    bottomBtns.classList.add("hidden");
    previewBtns.forEach(btn => btn.classList.add("hidden"));
    const canvas = await html2canvas(target, {
      backgroundColor: "#ffffff",
      scale: 2
    });
    bottomBtns.classList.remove("hidden");
    previewBtns.forEach(btn => btn.classList.remove("hidden"));

    canvas.toBlob(async blob => {
      if (!blob) return;
      const file = new File([blob], "music_king_result.png", { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `[${userState?.nickname || "도전자"}] 음악왕 결과`,
            text: `[${userState?.nickname || "도전자"}] ${document.getElementById("finalScoreText").textContent}`,
            files: [file]
          });
          return;
        } catch (e) {}
      }

      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        gameAlert("📸 결과 화면이 클립보드에 이미지로 복사되었습니다!\n메신저 채팅창에 바로 붙여넣기(Ctrl+V) 해보세요!");
      } catch (clipErr) {
        const link = document.createElement("a");
        link.download = `음악왕_결과_${Date.now()}.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
        gameAlert("📸 결과 화면 캡처 이미지가 저장되었습니다!");
      }
    }, "image/png");
  } catch (err) {
    bottomBtns.classList.remove("hidden");
    previewBtns.forEach(btn => btn.classList.remove("hidden"));
    gameAlert("화면 캡처 중 오류가 발생했습니다.");
  }
}

window.addEventListener("resize", () => {
  if (["homeScreen", "loginScreen"].includes(state.currentScreen) && typeof updateHeaderUserUI === "function") {
    updateHeaderUserUI();
  }
  syncHomeCornerFloatingButtons();
});

window.addEventListener("load", syncHomeCornerFloatingButtons);

document.addEventListener("DOMContentLoaded", () => {
  initEvents();
  initCapacitorNativeBridge();
  preloadClickSfxBuffer();
  if (typeof window.__markMusickingBootReady === "function") {
    window.__markMusickingBootReady();
  }
  relocateCoupangAdBanner();
  setTimeout(relocateCoupangAdBanner, 450);
  setTimeout(relocateCoupangAdBanner, 1500);
  // PWA & PWABuilder Android APK 전용: Capacitor 네이티브 앱 내부에서는 로컬 번들 제공을 위해 SW 등록 생략
  if ("serviceWorker" in navigator && !window.isCapacitorNativeApp()) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
});
