// ============================================================================
// [음악왕] 메인 게임 로직 (모바일 최적화 · 화이트톤 · 전용 정답/오답 화면 전환)
// ============================================================================

const state = {
  decades: new Set(["1990s", "2000s", "2010s", "2020s"]),
  mode: "behind",      // 'behind' | 'lyrics' | 'onesec'
  stage: 1,            // 1: 노래 맞히기 | 2: 가수 맞히기 | 3: 가수+노래 맞히기
  questionLimit: 10,   // 10 | 20 | 50 | 'infinite'

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
  questionEnded: false,

  audioEl: new Audio(),
  audioStopTimer: null,
  itunesCache: new Map(),
  oneSecOffsetIndex: 0
};

state.audioEl.crossOrigin = "anonymous";

// 모바일 핀치줌·더블탭 확대 및 불필요한 바디 스크롤 방지
document.addEventListener("gesturestart", e => e.preventDefault(), { passive: false });
document.addEventListener(
  "touchmove",
  e => {
    const scrollable = e.target.closest(".question-content, .judge-note-box, #historyList, .modal-content, textarea");
    if (!scrollable) {
      e.preventDefault();
    }
  },
  { passive: false }
);

function getCustomQuestions() {
  try {
    const raw = localStorage.getItem("music_king_custom_q");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCustomQuestions(list) {
  try {
    localStorage.setItem("music_king_custom_q", JSON.stringify(list));
  } catch (e) {}
}

function getAllQuestions() {
  return [...QUESTIONS_DB, ...getCustomQuestions()];
}

function normalizeAnswer(str) {
  if (!str) return "";
  return str
    .toString()
    .toLowerCase()
    .replace(/[\s\.\,\!\?\-\_\~\'\"\(\)\[\]\{\}\:\;\/\\&]/g, "");
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
  const trimmed = text.trim();
  const boxes = Array.from(trimmed)
    .map(ch => (ch === " " ? " " : "□"))
    .join("");
  const charCount = trimmed.replace(/\s+/g, "").length;
  return `${boxes}(${charCount}자)`;
}

async function fetchItunesTrack(q) {
  if (state.itunesCache.has(q.id)) {
    return state.itunesCache.get(q.id);
  }

  const query = encodeURIComponent(q.itunesQuery || `${q.artist} ${q.title}`);
  const urls = [
    `https://itunes.apple.com/search?term=${query}&country=KR&entity=song&limit=5`,
    `https://itunes.apple.com/search?term=${query}&country=US&entity=song&limit=5`
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const track = data.results.find(r => r.previewUrl) || data.results[0];
        if (track && track.previewUrl) {
          const info = {
            previewUrl: track.previewUrl,
            artworkUrl: (track.artworkUrl100 || "").replace("100x100bb", "300x300bb"),
            trackName: track.trackName,
            artistName: track.artistName
          };
          state.itunesCache.set(q.id, info);
          return info;
        }
      }
    } catch (err) {}
  }

  const fallback = { previewUrl: null, artworkUrl: "" };
  state.itunesCache.set(q.id, fallback);
  return fallback;
}

function stopAudio() {
  if (state.audioStopTimer) {
    clearTimeout(state.audioStopTimer);
    state.audioStopTimer = null;
  }
  try {
    state.audioEl.pause();
  } catch (e) {}
  const disc = document.getElementById("vinylDisc");
  if (disc) disc.classList.remove("spinning");
}

async function playAudioSnippet(durationSec, startOffsetSec = 6) {
  stopAudio();
  const q = state.currentQ;
  if (!q) return;

  const statusEl = document.getElementById("audioStatusText");
  if (statusEl) statusEl.textContent = "음원 불러오는 중...";

  const track = await fetchItunesTrack(q);
  if (!track || !track.previewUrl) {
    if (statusEl) statusEl.textContent = "⚠️ 이 곡의 미리듣기 음원을 찾을 수 없습니다.";
    alert("이 곡의 미리듣기 음원을 불러올 수 없습니다.");
    return;
  }

  try {
    if (state.audioEl.src !== track.previewUrl) {
      state.audioEl.src = track.previewUrl;
      await new Promise((resolve, reject) => {
        const cleanup = () => {
          state.audioEl.removeEventListener("loadedmetadata", onLoaded);
          state.audioEl.removeEventListener("error", onError);
        };
        const onLoaded = () => { cleanup(); resolve(); };
        const onError = (e) => { cleanup(); reject(e); };
        state.audioEl.addEventListener("loadedmetadata", onLoaded);
        state.audioEl.addEventListener("error", onError);
        state.audioEl.load();
      });
    }

    const safeOffset = Math.min(startOffsetSec, Math.max(0, (state.audioEl.duration || 29) - durationSec - 1));
    state.audioEl.currentTime = safeOffset;

    const disc = document.getElementById("vinylDisc");
    if (disc) disc.classList.add("spinning");
    if (statusEl) statusEl.textContent = `🔊 ${durationSec}초 재생 중...`;

    await state.audioEl.play();

    state.audioStopTimer = setTimeout(() => {
      state.audioEl.pause();
      if (disc) disc.classList.remove("spinning");
      if (statusEl) statusEl.textContent = `✅ ${durationSec}초 재생 완료!`;
    }, durationSec * 1000);
  } catch (err) {
    if (statusEl) statusEl.textContent = "⚠️ 오디오 재생 버튼을 다시 눌러주세요.";
  }
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ============================================================================
// 화면 전환 헬퍼 (5개 화면)
// ============================================================================
function switchScreen(targetId) {
  stopAudio();
  ["homeScreen", "setupScreen", "gameScreen", "judgeScreen", "resultScreen"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", id !== targetId);
  });
}

function showHome() {
  switchScreen("homeScreen");
}

function showSetup() {
  updateLobbyCounts();
  switchScreen("setupScreen");
}

function updateLobbyCounts() {
  const all = getAllQuestions();
  const filtered = all.filter(q => state.decades.has(q.decade));
  const countBadge = document.getElementById("availablePoolCount");
  if (countBadge) {
    countBadge.textContent = `총 ${filtered.length}문제`;
  }
}

function initEvents() {
  // 메인 화면 -> 설정 화면 ("음악왕 도전" 버튼)
  document.getElementById("enterSetupBtn").addEventListener("click", showSetup);
  document.getElementById("setupBackHomeBtn").addEventListener("click", showHome);
  document.getElementById("brandHome").addEventListener("click", showHome);

  // 연대 선택
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

  // 모드 선택
  document.querySelectorAll("[data-mode]").forEach(el => {
    el.addEventListener("click", () => {
      state.mode = el.getAttribute("data-mode");
      document.querySelectorAll("[data-mode]").forEach(c => c.classList.remove("active"));
      el.classList.add("active");
    });
  });

  // 단계 선택
  document.querySelectorAll("[data-stage]").forEach(el => {
    el.addEventListener("click", () => {
      state.stage = Number(el.getAttribute("data-stage"));
      document.querySelectorAll("[data-stage]").forEach(c => c.classList.remove("active"));
      el.classList.add("active");
    });
  });

  // 문제 수 선택
  document.querySelectorAll("[data-limit]").forEach(el => {
    el.addEventListener("click", () => {
      const val = el.getAttribute("data-limit");
      state.questionLimit = val === "infinite" ? "infinite" : Number(val);
      document.querySelectorAll("[data-limit]").forEach(c => c.classList.remove("active"));
      el.classList.add("active");
    });
  });

  document.getElementById("startGameBtn").addEventListener("click", startGame);
  document.getElementById("backToLobbyBtn").addEventListener("click", showSetup);
  document.getElementById("restartSameBtn").addEventListener("click", startGame);
  document.getElementById("resultToLobbyBtn").addEventListener("click", showHome);

  // 힌트 및 정답 버튼
  document.getElementById("hintLetterBtn").addEventListener("click", useLetterHint);
  document.getElementById("hintKeywordBtn").addEventListener("click", useKeywordHint);
  document.getElementById("hintAudioBtn").addEventListener("click", useAudioHint);
  document.getElementById("submitAnswerBtn").addEventListener("click", checkUserAnswer);
  document.getElementById("skipQuestionBtn").addEventListener("click", skipQuestion);
  document.getElementById("nextQuestionBtn").addEventListener("click", nextQuestion);

  ["artistInput", "titleInput"].forEach(id => {
    const input = document.getElementById(id);
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        checkUserAnswer();
      }
    });
  });

  // MD 모달
  document.getElementById("openMdModalBtn").addEventListener("click", () => {
    document.getElementById("mdModal").classList.remove("hidden");
    renderCustomQuestionCount();
  });
  document.getElementById("closeMdModalBtn").addEventListener("click", () => {
    document.getElementById("mdModal").classList.add("hidden");
  });
  document.getElementById("mdFileInput").addEventListener("change", handleMdFileUpload);
  document.getElementById("parseMdTextBtn").addEventListener("click", handleMdTextParse);
  document.getElementById("clearCustomBtn").addEventListener("click", () => {
    if (confirm("추가한 커스텀 문제를 초기화할까요?")) {
      saveCustomQuestions([]);
      renderCustomQuestionCount();
      updateLobbyCounts();
    }
  });

  syncDecadeChips();
  updateLobbyCounts();
}

function syncDecadeChips() {
  document.querySelectorAll("[data-decade]").forEach(el => {
    const dec = el.getAttribute("data-decade");
    el.classList.toggle("active", state.decades.has(dec));
  });
}

// ============================================================================
// 게임 시작 및 문제 로드
// ============================================================================
function startGame() {
  stopAudio();
  const candidates = getAllQuestions().filter(q => state.decades.has(q.decade));
  if (candidates.length === 0) {
    alert("선택한 연대에 문제가 없습니다.");
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

  loadCurrentQuestion();
}

function loadCurrentQuestion() {
  switchScreen("gameScreen");
  const q = state.pool[state.currentIndex];
  state.currentQ = q;
  state.usedHintLetter = false;
  state.usedHintKeyword = false;
  state.usedHintAudio = false;
  state.questionEnded = false;
  state.oneSecOffsetIndex = 0;

  fetchItunesTrack(q);

  const modeNames = { behind: "비하인드", lyrics: "가사", onesec: "1초듣기" };
  const stageNames = { 1: "1단계·노래", 2: "2단계·가수", 3: "3단계·가수+노래" };

  document.getElementById("badgeDecade").textContent = `${q.year}년`;
  document.getElementById("badgeMode").textContent = modeNames[state.mode];
  document.getElementById("badgeStage").textContent = stageNames[state.stage];

  const totalText = state.questionLimit === "infinite" ? `${state.pool.length}` : `${state.pool.length}`;
  document.getElementById("progressText").textContent = `${state.currentIndex + 1}/${totalText}`;
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
    givenBanner.classList.remove("hidden");
    givenBanner.innerHTML = `<span>🎤 가수 힌트</span><strong>${q.artist}</strong>`;
  } else if (state.stage === 2) {
    givenBanner.classList.remove("hidden");
    givenBanner.innerHTML = `<span>🎯 목표</span><strong>이 곡의 가수를 맞히세요!</strong>`;
  } else {
    givenBanner.classList.remove("hidden");
    givenBanner.innerHTML = `<span>🎯 목표</span><strong>가수와 노래 제목 모두 입력</strong>`;
  }

  const qContent = document.getElementById("questionContent");
  const oneSecBox = document.getElementById("oneSecContainer");
  const qTypeTag = document.getElementById("questionTypeTag");

  if (state.mode === "behind") {
    qTypeTag.textContent = "💡 비하인드 스토리 퀴즈";
    qContent.className = "question-content";
    qContent.textContent = q.behindQuestion;
    qContent.classList.remove("hidden");
    oneSecBox.classList.add("hidden");
  } else if (state.mode === "lyrics") {
    qTypeTag.textContent = "🎶 가사 보고 맞히기";
    qContent.className = "question-content lyrics-style";
    qContent.innerHTML = `" ${q.lyricsQuestion.replace(/\//g, "<br>")} "`;
    qContent.classList.remove("hidden");
    oneSecBox.classList.add("hidden");
  } else {
    qTypeTag.textContent = "⚡ 1초 듣고 맞히기";
    qContent.classList.add("hidden");
    oneSecBox.classList.remove("hidden");
    document.getElementById("audioStatusText").textContent = "아래 [▶ 1초 듣기] 버튼을 눌러주세요!";
  }

  // 힌트 버튼 초기화 (1초 듣기 모드에서는 노래 힌트 제외)
  const btnLetter = document.getElementById("hintLetterBtn");
  const btnKeyword = document.getElementById("hintKeywordBtn");
  const btnAudio = document.getElementById("hintAudioBtn");

  btnLetter.disabled = false;
  btnLetter.classList.remove("used");
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
  document.getElementById("partialFeedback").classList.add("hidden");

  const artistGroup = document.getElementById("artistInputGroup");
  const titleGroup = document.getElementById("titleInputGroup");
  const artistInput = document.getElementById("artistInput");
  const titleInput = document.getElementById("titleInput");

  artistInput.value = "";
  titleInput.value = "";

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

  appendHintBox("🔑 포인트 단어", `<strong>${q.keywordHint}</strong>`);
}

function useAudioHint() {
  if (state.mode === "onesec" || state.questionEnded) return;
  if (!state.usedHintAudio) {
    state.usedHintAudio = true;
    const btn = document.getElementById("hintAudioBtn");
    btn.classList.add("used");
    appendHintBox("🎧 노래 힌트", "2.5초 하이라이트 재생됨 (버튼 클릭 시 재재생)");
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

// ============================================================================
// 정답 제출 -> 전용 정답/오답 화면(#judgeScreen)으로 즉시 전환
// ============================================================================
function checkUserAnswer() {
  if (state.questionEnded) return;
  const q = state.currentQ;
  const artistVal = document.getElementById("artistInput").value.trim();
  const titleVal = document.getElementById("titleInput").value.trim();

  // 빈칸 실수 방지
  if (state.stage === 1 && !titleVal) {
    alert("노래 제목을 입력해주세요!");
    return;
  }
  if (state.stage === 2 && !artistVal) {
    alert("가수 이름을 입력해주세요!");
    return;
  }
  if (state.stage === 3 && (!artistVal || !titleVal)) {
    alert("3단계는 가수 이름과 노래 제목을 모두 입력해야 합니다!");
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
  const q = state.currentQ;

  let gained = 0;
  if (isCorrect) {
    gained = 100;
    if (state.usedHintLetter) gained -= 15;
    if (state.usedHintKeyword) gained -= 15;
    if (state.usedHintAudio) gained -= 20;
    if (state.stage === 3) gained += 20;
    state.score += gained;
    state.streak++;
  } else {
    state.streak = 0;
    if (state.questionLimit === "infinite") {
      state.hearts--;
    }
  }

  state.history.push({ q, correct: isCorrect, gained });

  // 전용 정답/오답 화면 구성 및 전환
  const judgeCard = document.getElementById("judgeCard");
  const statusPill = document.getElementById("judgeStatusPill");
  const submitInfo = document.getElementById("judgeUserSubmitInfo");

  judgeCard.classList.toggle("is-correct", isCorrect);
  judgeCard.classList.toggle("is-wrong", !isCorrect);

  if (isCorrect) {
    statusPill.textContent = `⭕ 정답입니다! (+${gained}점)`;
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
    state.currentIndex + 1 >= state.pool.length ||
    (state.questionLimit === "infinite" && state.hearts <= 0);
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
  const isGameOver =
    state.currentIndex + 1 >= state.pool.length ||
    (state.questionLimit === "infinite" && state.hearts <= 0);

  if (isGameOver) {
    showFinalResult();
  } else {
    state.currentIndex++;
    loadCurrentQuestion();
  }
}

function showFinalResult() {
  switchScreen("resultScreen");

  const solvedCount = state.history.filter(h => h.correct).length;
  const totalTried = state.history.length;
  const accuracy = totalTried > 0 ? Math.round((solvedCount / totalTried) * 100) : 0;

  let rankTitle = "🎧 음악 입문자";
  if (accuracy >= 90 && solvedCount >= 8) rankTitle = "👑 전설의 음악왕";
  else if (accuracy >= 75) rankTitle = "🔥 가요계 척척박사";
  else if (accuracy >= 50) rankTitle = "🎶 음악 고수";

  document.getElementById("finalRankTitle").textContent = rankTitle;
  document.getElementById("finalScoreText").textContent = `총점 ${state.score}점 (정답 ${solvedCount}/${totalTried} · ${accuracy}%)`;

  const listEl = document.getElementById("historyList");
  listEl.innerHTML = state.history
    .map(
      (item, idx) => `
      <div class="hint-box" style="background:${item.correct ? "#ecfdf5" : "#fff1f2"}; border-color:${item.correct ? "#a7f3d0" : "#fecdd3"}; color:var(--text-main);">
        <span><strong>#${idx + 1}</strong> [${item.q.year}] ${item.q.artist} - ${item.q.title}</span>
        <span style="font-weight:800; color:${item.correct ? "var(--success)" : "var(--danger)"};">${item.correct ? "⭕ 정답" : "❌ 오답"}</span>
      </div>
    `
    )
    .join("");
}

// ============================================================================
// MD 파일 파서
// ============================================================================
function parseMarkdownToQuestions(mdText) {
  const blocks = mdText.split(/\n---+\n|\n(?=##\s+)/g);
  const parsed = [];

  blocks.forEach((block, idx) => {
    const getField = regex => {
      const m = block.match(regex);
      return m ? m[1].trim() : "";
    };

    const artist = getField(/(?:가수|아티스트|Artist)\s*[:：]\s*(.+)/i);
    const title = getField(/(?:노래|곡명|제목|Title)\s*[:：]\s*(.+)/i);
    if (!artist || !title) return;

    const yearRaw = getField(/(?:연도|발매연도|Year)\s*[:：]\s*(\d{4})/i);
    const year = yearRaw ? Number(yearRaw) : 2010;
    let decade = "2010s";
    if (year < 2000) decade = "1990s";
    else if (year < 2010) decade = "2000s";
    else if (year < 2020) decade = "2010s";
    else decade = "2020s";

    const aliasesRaw = getField(/(?:동의어|복수정답|별칭|Aliases)\s*[:：]\s*(.+)/i);
    const artistAliases = aliasesRaw
      ? aliasesRaw.split(/[,/]/).map(s => s.trim()).filter(Boolean)
      : [];

    let behind = getField(/(?:비하인드|문제|여담|Behind)\s*[:：]\s*([\s\S]+?)(?=\n(?:가사|키워드|힌트|해설|$))/i);
    if (!behind) behind = `${year}년에 발매되어 큰 사랑을 받은 명곡입니다.`;

    const maskedBehind = behind.replaceAll(artist, "[이 가수]").replaceAll(title, "[이 곡]");
    const lyrics = getField(/(?:가사|Lyrics)\s*[:：]\s*(.+)/i) || "하이라이트 가사가 등록된 곡입니다.";
    const keyword = getField(/(?:키워드|포인트단어|힌트|Keyword)\s*[:：]\s*(.+)/i) || `${year}년 히트곡`;

    parsed.push({
      id: `custom_${Date.now()}_${idx}`,
      decade,
      year,
      artist,
      artistAliases,
      title,
      titleAliases: [],
      behindQuestion: maskedBehind,
      behindAnswerNote: `${artist} - '${title}' (${year}). ${behind}`,
      lyricsQuestion: lyrics,
      keywordHint: keyword,
      itunesQuery: `${artist} ${title}`
    });
  });

  return parsed;
}

function handleMdFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    document.getElementById("mdRawTextarea").value = reader.result;
    handleMdTextParse();
  };
  reader.readAsText(file, "utf-8");
}

function handleMdTextParse() {
  const raw = document.getElementById("mdRawTextarea").value.trim();
  if (!raw) {
    alert("변환할 MD 텍스트를 입력하거나 파일을 선택해주세요.");
    return;
  }
  const newQs = parseMarkdownToQuestions(raw);
  if (newQs.length === 0) {
    alert("가수: / 노래: 형식을 찾을 수 없습니다.");
    return;
  }
  const existing = getCustomQuestions();
  saveCustomQuestions([...existing, ...newQs]);
  renderCustomQuestionCount();
  updateLobbyCounts();
  alert(`🎉 총 ${newQs.length}개의 문제가 추가되었습니다!`);
}

function renderCustomQuestionCount() {
  const custom = getCustomQuestions();
  const el = document.getElementById("customQCountText");
  if (el) {
    el.textContent = `기본 ${QUESTIONS_DB.length}문제 + 추가 ${custom.length}문제`;
  }
}

document.addEventListener("DOMContentLoaded", initEvents);
