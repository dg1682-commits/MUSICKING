// ============================================================================
// [음악왕 v3.0] Supabase 전면 클라우드 연동 & 상점 미리보기(입어보기) & 멀티 시스템 (online.js)
// - 모든 데이터(프로필, CD, 아바타, 랭킹, 친구, DM, 대전방, 관리자 수정 곡/아이템) Supabase 동기화
// - 짜치는 시스템 alert/confirm/prompt 완전 제거 -> 커스텀 게임 모달 팝업 사용
// - 상점 아이템 클릭 시 '입어보기(프리뷰)' 후 구매/장착 결정 방식으로 분리
// - 닉네임 변경권 아이템 판매 및 기본 캐릭터 남/여 선택 지원
// ============================================================================

const SUPABASE_URL = "https://szafomntmenppcbczrwl.supabase.co";
const SUPABASE_KEY = "sb_publishable_msR49lWjgSJQnMQxSzIaug_XXlJUd4Z";

let sbClient = null;
if (window.supabase && window.supabase.createClient) {
  sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// ============================================================================
// 커스텀 상용 게임 스타일 알림/확인/입력 모달 (시스템 기본 팝업 대체)
// ============================================================================
window.gameAlert = function (message, title = "👑 음악왕 알림") {
  const modal = document.getElementById("customDialogModal");
  if (!modal) return;
  document.getElementById("dialogTitle").textContent = title;
  document.getElementById("dialogMessage").innerHTML = String(message).replace(/\n/g, "<br/>");
  document.getElementById("dialogInputWrap").classList.add("hidden");
  document.getElementById("dialogCancelBtn").classList.add("hidden");

  const okBtn = document.getElementById("dialogConfirmBtn");
  okBtn.textContent = "확인";
  okBtn.onclick = () => {
    modal.classList.add("hidden");
  };
  modal.classList.remove("hidden");
};

window.gameConfirm = function (message, onConfirm, title = "✨ 확인해주세요") {
  const modal = document.getElementById("customDialogModal");
  if (!modal) return;
  document.getElementById("dialogTitle").textContent = title;
  document.getElementById("dialogMessage").innerHTML = String(message).replace(/\n/g, "<br/>");
  document.getElementById("dialogInputWrap").classList.add("hidden");

  const cancelBtn = document.getElementById("dialogCancelBtn");
  cancelBtn.classList.remove("hidden");
  cancelBtn.textContent = "취소";
  cancelBtn.onclick = () => modal.classList.add("hidden");

  const okBtn = document.getElementById("dialogConfirmBtn");
  okBtn.textContent = "확인";
  okBtn.onclick = () => {
    modal.classList.add("hidden");
    if (typeof onConfirm === "function") onConfirm();
  };
  modal.classList.remove("hidden");
};

window.gamePrompt = function (message, defaultValue = "", onConfirm, title = "✏️ 입력하기") {
  const modal = document.getElementById("customDialogModal");
  if (!modal) return;
  document.getElementById("dialogTitle").textContent = title;
  document.getElementById("dialogMessage").innerHTML = String(message).replace(/\n/g, "<br/>");

  const inputWrap = document.getElementById("dialogInputWrap");
  const inputEl = document.getElementById("dialogPromptInput");
  inputWrap.classList.remove("hidden");
  inputEl.value = defaultValue;

  const cancelBtn = document.getElementById("dialogCancelBtn");
  cancelBtn.classList.remove("hidden");
  cancelBtn.textContent = "취소";
  cancelBtn.onclick = () => modal.classList.add("hidden");

  const okBtn = document.getElementById("dialogConfirmBtn");
  okBtn.textContent = "완료";
  okBtn.onclick = () => {
    const val = inputEl.value.trim();
    modal.classList.add("hidden");
    if (typeof onConfirm === "function") onConfirm(val);
  };
  modal.classList.remove("hidden");
  setTimeout(() => inputEl.focus(), 60);
};

// ============================================================================
// 유저 상태 (Supabase DB 중심 동기화)
// ============================================================================
const userState = {
  id: null,
  nickname: "게스트도전자",
  bio: "안녕하세요! 음악왕 도전자입니다.",
  cdCoins: 100,
  avatarConfig: { ...DEFAULT_AVATAR_CONFIG },
  ownedItems: ["meadow", "default", "none", "basic", "mic_silver"],
  isLoggedIn: false
};

// 상점 입어보기(프리뷰) 전용 임시 상태 (구매/장착 전까지는 실제 캐릭터에 반영 안 됨!)
const shopPreviewState = {
  config: { ...DEFAULT_AVATAR_CONFIG },
  selectedCat: "hair",
  selectedItem: null
};

const plazaState = {
  channel: null,
  onlinePlayers: new Map(),
  myX: 140,
  myDir: 1,
  myChat: "",
  myChatExpire: 0,
  animFrame: null,
  currentRoom: null,
  roomChannel: null
};

// 회원가입 화면에서 기본 성별 선택
window.selectSignupGender = function (gender) {
  userState.avatarConfig.gender = gender;
  document.querySelectorAll("[data-signup-gender]").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-signup-gender") === gender);
  });
  const loginPreview = document.getElementById("loginCharPreview");
  if (loginPreview) renderPixelAvatar(loginPreview, userState.avatarConfig);
};

function updateHeaderUserUI() {
  const cdEl = document.getElementById("headerCdCount");
  if (cdEl) cdEl.textContent = `${userState.cdCoins}`;

  const nickEl = document.getElementById("headerUserNick");
  if (nickEl) {
    nickEl.textContent = userState.isLoggedIn ? userState.nickname : "게스트";
  }

  const miniCanvas = document.getElementById("headerMiniAvatar");
  if (miniCanvas) renderPixelAvatar(miniCanvas, userState.avatarConfig);

  const homeCanvas = document.getElementById("homeHeroAvatar");
  if (homeCanvas) renderPixelAvatar(homeCanvas, userState.avatarConfig);

  const loginPreview = document.getElementById("loginCharPreview");
  if (loginPreview) renderPixelAvatar(loginPreview, userState.avatarConfig);
}

function nicknameToEmail(nick) {
  const hex = Array.from(nick.trim())
    .map(c => c.charCodeAt(0).toString(16))
    .join("");
  return `u_${hex.slice(0, 36)}@musicking.com`;
}

// ============================================================================
// Supabase 관리자 설정(커스텀 수정 음악 & 커스텀 상점 아이템) 실시간 로드
// ============================================================================
async function loadServerGlobalConfigs() {
  if (!sbClient) return;
  try {
    // 관리자 설정 전용 레코드(nickname = '__ADMIN_CONFIG__')에서 곡 수정본 및 상점 설정 로드
    const { data } = await sbClient
      .from("profiles")
      .select("avatar_config, owned_items")
      .eq("nickname", "__ADMIN_CONFIG__")
      .maybeSingle();

    if (data) {
      // avatar_config에 상점 카탈로그 오버라이드 저장됨
      if (data.avatar_config && data.avatar_config.shopCatalog) {
        applyServerShopCatalog(data.avatar_config.shopCatalog);
      }
      // owned_items에 수정/추가된 곡 배열 저장됨
      if (Array.isArray(data.owned_items) && data.owned_items.length > 0) {
        applyServerSongsOverride(data.owned_items);
      }
    }
  } catch (e) {}
}

function applyServerSongsOverride(serverSongs) {
  if (!Array.isArray(serverSongs)) return;
  const map = new Map(QUESTIONS_DB.map((q, idx) => [q.id, idx]));
  serverSongs.forEach(sq => {
    if (!sq || !sq.id) return;
    if (sq._deleted) {
      const i = QUESTIONS_DB.findIndex(item => item.id === sq.id);
      if (i !== -1) QUESTIONS_DB.splice(i, 1);
      return;
    }
    if (map.has(sq.id)) {
      const idx = QUESTIONS_DB.findIndex(item => item.id === sq.id);
      if (idx !== -1) QUESTIONS_DB[idx] = { ...QUESTIONS_DB[idx], ...sq };
    } else {
      QUESTIONS_DB.push(sq);
    }
  });
  if (typeof updateLobbyCounts === "function") updateLobbyCounts();
}

// 앱 시작 시 기존 Supabase 세션 복원
async function restoreSupabaseSession() {
  await loadServerGlobalConfigs();
  if (!sbClient) return;
  try {
    const { data } = await sbClient.auth.getSession();
    const sessionUser = data?.session?.user;
    if (sessionUser) {
      const { data: prof } = await sbClient
        .from("profiles")
        .select("*")
        .eq("id", sessionUser.id)
        .maybeSingle();

      if (prof && prof.nickname !== "__ADMIN_CONFIG__") {
        userState.id = sessionUser.id;
        userState.nickname = prof.nickname;
        userState.bio = prof.bio || userState.bio;
        userState.cdCoins = prof.cd_coins ?? 100;
        userState.avatarConfig = { ...DEFAULT_AVATAR_CONFIG, ...(prof.avatar_config || {}) };
        userState.ownedItems = Array.isArray(prof.owned_items)
          ? prof.owned_items
          : ["meadow", "default", "none", "basic", "mic_silver"];
        userState.isLoggedIn = true;
        updateHeaderUserUI();
        if (typeof showHome === "function") showHome();
      }
    }
  } catch (e) {}
}

async function addCdCoins(amount) {
  userState.cdCoins = Math.max(0, userState.cdCoins + amount);
  updateHeaderUserUI();
  await syncProfileToServer();
}

async function syncProfileToServer() {
  updateHeaderUserUI();
  if (!sbClient || !userState.isLoggedIn || !userState.id) return;
  try {
    await sbClient.from("profiles").upsert({
      id: userState.id,
      nickname: userState.nickname,
      bio: userState.bio,
      cd_coins: userState.cdCoins,
      avatar_config: userState.avatarConfig,
      owned_items: userState.ownedItems,
      updated_at: new Date().toISOString()
    });
  } catch (e) {}
}

// ============================================================================
// 1. 회원가입 / 로그인 / 로그아웃
// ============================================================================
window.handleAuthSubmit = async function (mode) {
  const nickInput = document.getElementById("authNicknameInput").value.trim();
  const pwInput = document.getElementById("authPasswordInput").value.trim();

  if (!nickInput || nickInput.length < 2) {
    gameAlert("닉네임을 2글자 이상 입력해주세요.");
    return;
  }
  if (!pwInput || pwInput.length < 6) {
    gameAlert("비밀번호는 6자리 이상 입력해주세요.");
    return;
  }
  if (!sbClient) {
    gameAlert("서버 연결을 초기화할 수 없습니다.");
    return;
  }

  const email = nicknameToEmail(nickInput);

  try {
    if (mode === "signup") {
      const { data: existNick } = await sbClient
        .from("profiles")
        .select("id")
        .eq("nickname", nickInput)
        .maybeSingle();

      if (existNick) {
        gameAlert("이미 사용 중인 닉네임입니다!\n다른 닉네임을 입력하거나 [로그인]을 눌러주세요.");
        return;
      }

      const { data, error } = await sbClient.auth.signUp({
        email,
        password: pwInput
      });

      if (error) {
        gameAlert(`회원가입 오류: ${error.message}`);
        return;
      }

      const uid = data?.user?.id;
      if (!uid) {
        gameAlert("회원가입 처리 중 문제가 발생했습니다.");
        return;
      }

      userState.id = uid;
      userState.nickname = nickInput;
      userState.cdCoins = 100;
      userState.isLoggedIn = true;

      await sbClient.from("profiles").upsert({
        id: uid,
        nickname: nickInput,
        bio: userState.bio,
        cd_coins: userState.cdCoins,
        avatar_config: userState.avatarConfig,
        owned_items: userState.ownedItems
      });

      updateHeaderUserUI();
      showHome();
      gameAlert(`환영합니다, [${nickInput}]님!\n웰컴 보너스 💿 100 CD가 지급되었습니다!`, "🎉 가입 완료");
    } else {
      const { data, error } = await sbClient.auth.signInWithPassword({
        email,
        password: pwInput
      });

      if (error) {
        gameAlert("닉네임 또는 비밀번호가 일치하지 않습니다.\n처음 오셨다면 [회원가입] 버튼을 눌러주세요!");
        return;
      }

      const uid = data.user.id;
      const { data: prof } = await sbClient
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();

      // 관리자가 비밀번호/데이터 초기화 플래그를 걸어둔 경우 처리
      userState.id = uid;
      userState.nickname = prof?.nickname || nickInput;
      userState.bio = prof?.bio || userState.bio;
      userState.cdCoins = prof?.cd_coins ?? 100;
      userState.avatarConfig = { ...DEFAULT_AVATAR_CONFIG, ...(prof?.avatar_config || {}) };
      userState.ownedItems = prof?.owned_items || userState.ownedItems;
      userState.isLoggedIn = true;

      updateHeaderUserUI();
      showHome();
      gameAlert(`반갑습니다, [${userState.nickname}]님!`, "👋 로그인 성공");
    }
  } catch (err) {
    gameAlert("서버 통신 중 오류가 발생했습니다.");
  }
};

window.continueAsGuest = function () {
  userState.isLoggedIn = false;
  userState.nickname = "게스트도전자";
  updateHeaderUserUI();
  showHome();
};

window.handleLogout = async function () {
  gameConfirm("정말 로그아웃 하시겠습니까?", async () => {
    if (sbClient) {
      try { await sbClient.auth.signOut(); } catch (e) {}
    }
    userState.id = null;
    userState.isLoggedIn = false;
    userState.nickname = "게스트도전자";
    closeAllModals();
    showLoginScreen();
  }, "🚪 로그아웃");
};

// ============================================================================
// 2. 점수 랭킹 시스템
// ============================================================================
async function submitScoreToRanking(record) {
  if (!sbClient || !userState.isLoggedIn || !userState.id) return;
  try {
    await sbClient.from("rankings").insert({
      user_id: userState.id,
      nickname: userState.nickname,
      avatar_config: userState.avatarConfig,
      decade_filter: record.decadeFilter,
      game_mode: record.mode,
      stage: record.stage,
      question_limit: String(record.limit),
      time_attack: Boolean(record.timeAttack),
      score: record.score,
      accuracy: record.accuracy
    });
  } catch (e) {}
}

window.loadRankingsList = async function () {
  const listEl = document.getElementById("rankingListContainer");
  if (!listEl) return;
  listEl.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-sub);">랭킹 데이터를 불러오는 중...</div>`;

  if (!sbClient) return;

  const modeFilter = document.getElementById("rankFilterMode")?.value || "ALL";
  const stageFilter = document.getElementById("rankFilterStage")?.value || "ALL";

  try {
    let query = sbClient
      .from("rankings")
      .select("*")
      .order("score", { ascending: false })
      .limit(50);

    if (modeFilter !== "ALL") query = query.eq("game_mode", modeFilter);
    if (stageFilter !== "ALL") query = query.eq("stage", Number(stageFilter));

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      listEl.innerHTML = `<div style="text-align:center; padding:24px; color:var(--text-sub);">아직 등록된 랭킹 기록이 없습니다.<br/>첫 번째 1등에 도전해보세요!</div>`;
      return;
    }

    const modeLabel = { behind: "비하인드", lyrics: "가사", onesec: "1초듣기" };
    listEl.innerHTML = data
      .map((row, idx) => {
        const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;
        return `
        <div class="pixel-list-item" onclick="inspectOtherUser('${row.user_id}', '${row.nickname}')">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-weight:900; min-width:28px; color:var(--primary);">${medal}</span>
            <canvas class="rank-mini-canvas" width="40" height="40" data-avatar='${JSON.stringify(row.avatar_config || DEFAULT_AVATAR_CONFIG)}'></canvas>
            <div>
              <div style="font-weight:800; font-size:0.88rem;">${row.nickname} ${row.time_attack ? "⏱️" : ""}</div>
              <div style="font-size:0.74rem; color:var(--text-sub);">${modeLabel[row.game_mode] || row.game_mode} · ${row.stage}단계 · 정답률 ${row.accuracy}%</div>
            </div>
          </div>
          <div style="font-weight:900; color:var(--primary); font-size:0.95rem;">${row.score}점</div>
        </div>
      `;
      })
      .join("");

    listEl.querySelectorAll(".rank-mini-canvas").forEach(cv => {
      try {
        renderPixelAvatar(cv, JSON.parse(cv.getAttribute("data-avatar")));
      } catch (e) {}
    });
  } catch (err) {
    listEl.innerHTML = `<div style="text-align:center; padding:20px;">랭킹 조회 중 오류가 발생했습니다.</div>`;
  }
};

// ============================================================================
// 3. 캐릭터 옷장 & CD 상점 (입어보기 프리뷰 -> 구매/장착 확정 분리 + 닉변권)
// ============================================================================
window.openShopModal = function () {
  // 현재 내 실제 장착 상태를 프리뷰 초기값으로 복사
  shopPreviewState.config = { ...userState.avatarConfig };
  shopPreviewState.selectedItem = null;
  openModal("shopModal");
  renderShopCategory(shopPreviewState.selectedCat || "hair");
  updateShopPreviewCanvas();
};

window.changeShopGenderPreview = function (gender) {
  shopPreviewState.config.gender = gender;
  shopPreviewState.selectedItem = { cat: "gender", id: gender, name: gender === "male" ? "남자 기본 캐릭터" : "여자 기본 캐릭터", price: 0 };
  updateShopPreviewCanvas();
};

function updateShopPreviewCanvas() {
  const cv = document.getElementById("shopAvatarCanvas");
  if (cv) renderPixelAvatar(cv, shopPreviewState.config);

  const cdSpan = document.getElementById("shopCdBalance");
  if (cdSpan) cdSpan.textContent = `${userState.cdCoins} CD`;

  document.querySelectorAll("[data-shop-gender]").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-shop-gender") === shopPreviewState.config.gender);
  });

  // 하단 구매/장착 액션 바 업데이트
  const bar = document.getElementById("shopPreviewActionBar");
  const infoText = document.getElementById("shopPreviewStatusText");
  const confirmBtn = document.getElementById("shopConfirmActionBtn");

  if (!bar || !infoText || !confirmBtn) return;

  const sel = shopPreviewState.selectedItem;
  if (!sel) {
    infoText.textContent = "💡 아래 아이템을 터치하면 먼저 입어볼 수 있습니다!";
    confirmBtn.textContent = "✅ 현재 모습 저장";
    confirmBtn.className = "btn btn-primary";
    confirmBtn.onclick = saveCurrentPreviewLook;
    return;
  }

  if (sel.cat === "special" && sel.id === "nickname_ticket") {
    infoText.textContent = `🎫 [${sel.name}] (가격: ${sel.price} CD)`;
    confirmBtn.textContent = `🛍️ ${sel.price} CD로 구매·닉변하기`;
    confirmBtn.className = "btn btn-gold";
    confirmBtn.onclick = purchaseNicknameTicket;
    return;
  }

  const isOwned = sel.price === 0 || userState.ownedItems.includes(sel.id);
  if (isOwned) {
    infoText.textContent = `👗 [${sel.name}] 입어보는 중 (보유함)`;
    confirmBtn.textContent = "✅ 이 스타일 장착 저장";
    confirmBtn.className = "btn btn-primary";
    confirmBtn.onclick = saveCurrentPreviewLook;
  } else {
    infoText.textContent = `👗 [${sel.name}] 입어보는 중 (미보유 · ${sel.price} CD)`;
    confirmBtn.textContent = `🛍️ 구매 후 장착 (${sel.price} CD)`;
    confirmBtn.className = "btn btn-gold";
    confirmBtn.onclick = () => purchaseAndEquipPreviewItem(sel);
  }
}

window.resetShopPreview = function () {
  shopPreviewState.config = { ...userState.avatarConfig };
  shopPreviewState.selectedItem = null;
  renderShopCategory(shopPreviewState.selectedCat);
  updateShopPreviewCanvas();
};

async function saveCurrentPreviewLook() {
  // 미보유 아이템이 프리뷰에 포함되어 있는지 확인
  for (const cat of ["bg", "hair", "hat", "face", "outfit", "acc"]) {
    const id = shopPreviewState.config[cat];
    const item = getItemById(cat, id);
    if (item && item.price > 0 && !userState.ownedItems.includes(id)) {
      gameAlert(`[${item.name}] 아이템은 아직 구매하지 않았습니다!\n먼저 구매 버튼을 눌러주세요.`);
      return;
    }
  }
  userState.avatarConfig = { ...shopPreviewState.config };
  await syncProfileToServer();
  renderShopCategory(shopPreviewState.selectedCat);
  updateShopPreviewCanvas();
  gameAlert("캐릭터 스타일이 멋지게 저장되었습니다!", "👗 장착 완료");
}

async function purchaseAndEquipPreviewItem(sel) {
  if (userState.cdCoins < sel.price) {
    gameAlert(`💿 CD가 부족합니다!\n(보유: ${userState.cdCoins} CD / 필요: ${sel.price} CD)\n문제를 풀고 점수를 얻으면 CD가 지급됩니다!`);
    return;
  }

  gameConfirm(`[${sel.name}] 아이템을 💿 ${sel.price} CD에 구매하고 바로 장착할까요?`, async () => {
    userState.cdCoins -= sel.price;
    if (!userState.ownedItems.includes(sel.id)) {
      userState.ownedItems.push(sel.id);
    }
    userState.avatarConfig = { ...shopPreviewState.config };
    await syncProfileToServer();
    renderShopCategory(shopPreviewState.selectedCat);
    updateShopPreviewCanvas();
    gameAlert(`🎉 [${sel.name}] 구매 및 장착이 완료되었습니다!`, "🛍️ 구매 성공");
  }, "🛍️ 아이템 구매");
}

function purchaseNicknameTicket() {
  const item = getItemById("special", "nickname_ticket");
  const price = item ? item.price : 100;

  if (!userState.isLoggedIn) {
    gameAlert("닉네임 변경권은 로그인한 계정에서 사용할 수 있습니다!");
    return;
  }
  if (userState.cdCoins < price) {
    gameAlert(`💿 CD가 부족합니다! (보유: ${userState.cdCoins} CD / 필요: ${price} CD)`);
    return;
  }

  gamePrompt(`🎫 닉네임 변경권 (${price} CD)\n변경하실 새로운 닉네임을 입력해주세요 (2~12자):`, userState.nickname, async newNick => {
    if (!newNick || newNick.length < 2) {
      gameAlert("닉네임은 2글자 이상이어야 합니다.");
      return;
    }
    if (newNick === userState.nickname) {
      gameAlert("현재 사용 중인 닉네임과 동일합니다.");
      return;
    }

    const { data: exist } = await sbClient
      .from("profiles")
      .select("id")
      .eq("nickname", newNick)
      .maybeSingle();

    if (exist) {
      gameAlert("이미 다른 유저가 사용 중인 닉네임입니다!");
      return;
    }

    userState.cdCoins -= price;
    userState.nickname = newNick;
    await syncProfileToServer();
    updateShopPreviewCanvas();
    gameAlert(`✨ 닉네임이 [${newNick}](으)로 성공적으로 변경되었습니다!`, "🎫 닉네임 변경 완료");
  }, "🎫 닉네임 변경권 사용");
}

window.renderShopCategory = function (cat) {
  shopPreviewState.selectedCat = cat;
  document.querySelectorAll("[data-shop-cat]").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-shop-cat") === cat);
  });

  const grid = document.getElementById("shopItemsGrid");
  if (!grid) return;

  const items = AVATAR_SHOP_ITEMS[cat] || [];
  grid.innerHTML = items
    .map(item => {
      if (cat === "special") {
        return `
        <div class="shop-item-card" style="grid-column: span 2;" onclick="previewShopItem('special', '${item.id}')">
          <div class="shop-item-name">${item.name} (💿 ${item.price} CD)</div>
          <p style="font-size:0.75rem; color:var(--text-sub); margin-bottom:6px;">${item.desc || ""}</p>
          <button class="btn btn-gold" style="width:100%; padding:7px; font-size:0.8rem;">🎫 선택하기</button>
        </div>
      `;
      }

      const owned = item.price === 0 || userState.ownedItems.includes(item.id);
      const actuallyEquipped = userState.avatarConfig[cat] === item.id;
      const previewing = shopPreviewState.config[cat] === item.id;

      let badgeText = actuallyEquipped ? "✅ 현재 장착중" : owned ? "보유중 (입어보기)" : `💿 ${item.price} CD (입어보기)`;
      return `
      <div class="shop-item-card ${previewing ? "equipped" : ""}" onclick="previewShopItem('${cat}', '${item.id}')">
        <div class="shop-item-name">${item.name}</div>
        <div style="font-size:0.74rem; font-weight:800; color:${owned ? "var(--primary)" : "#b45309"};">
          ${badgeText}
        </div>
      </div>
    `;
    })
    .join("");
};

// 아이템 클릭 시 바로 구매되지 않고 '입어보기(미리보기)'만 동작!
window.previewShopItem = function (cat, itemId) {
  const item = getItemById(cat, itemId);
  shopPreviewState.selectedItem = { cat, ...item };
  if (cat !== "special") {
    shopPreviewState.config[cat] = itemId;
  }
  renderShopCategory(cat);
  updateShopPreviewCanvas();
};

// ============================================================================
// 4. 내 프로필 & 타 유저 프로필 / 친구 추가 / 1:1 DM
// ============================================================================
window.openMyProfileModal = function () {
  if (!userState.isLoggedIn) {
    gameConfirm("로그인이 필요한 기능입니다.\n로그인 화면으로 이동할까요?", () => showLoginScreen());
    return;
  }
  openModal("profileModal");
  const cv = document.getElementById("profileAvatarCanvas");
  if (cv) renderPixelAvatar(cv, userState.avatarConfig);
  document.getElementById("profileNickDisplay").textContent = userState.nickname;
  document.getElementById("profileCdDisplay").textContent = `💿 보유 CD: ${userState.cdCoins}개`;
  document.getElementById("profileBioInput").value = userState.bio;
};

window.saveMyBio = async function () {
  const newBio = document.getElementById("profileBioInput").value.trim();
  userState.bio = newBio || "안녕하세요! 음악왕 도전자입니다.";
  await syncProfileToServer();
  gameAlert("프로필 소개글이 저장되었습니다!");
};

window.inspectOtherUser = async function (targetId, fallbackNick) {
  if (!targetId || targetId === "undefined") return;
  openModal("userInspectModal");
  document.getElementById("inspectNick").textContent = fallbackNick || "유저";
  document.getElementById("inspectBio").textContent = "프로필 불러오는 중...";
  document.getElementById("inspectTargetId").value = targetId;

  if (sbClient) {
    const { data } = await sbClient.from("profiles").select("*").eq("id", targetId).maybeSingle();
    if (data) {
      document.getElementById("inspectNick").textContent = data.nickname;
      document.getElementById("inspectBio").textContent = data.bio || "소개가 없습니다.";
      const cv = document.getElementById("inspectAvatarCanvas");
      if (cv) renderPixelAvatar(cv, data.avatar_config || DEFAULT_AVATAR_CONFIG);
    }
  }
};

window.openSocialModal = async function (tab = "friends") {
  if (!userState.isLoggedIn) {
    gameConfirm("친구 및 DM 기능은 로그인 후 이용하실 수 있습니다.\n로그인 화면으로 이동할까요?", () => showLoginScreen());
    return;
  }
  openModal("socialModal");
  switchSocialTab(tab);
};

window.switchSocialTab = async function (tab) {
  document.getElementById("socialTabFriends").classList.toggle("active", tab === "friends");
  document.getElementById("socialTabDm").classList.toggle("active", tab === "dm");
  document.getElementById("socialFriendsPane").classList.toggle("hidden", tab !== "friends");
  document.getElementById("socialDmPane").classList.toggle("hidden", tab !== "dm");

  if (tab === "friends") {
    await loadFriendsData();
  } else {
    await loadDirectMessages();
  }
};

window.sendFriendRequestByNick = async function (targetNickParam) {
  if (!userState.isLoggedIn) {
    showLoginScreen();
    return;
  }
  const nick = targetNickParam || document.getElementById("friendSearchInput").value.trim();
  if (!nick) {
    gameAlert("친구 추가할 닉네임을 입력해주세요.");
    return;
  }
  if (nick === userState.nickname) {
    gameAlert("자기 자신에게는 친구 신청을 보낼 수 없습니다.");
    return;
  }

  const { data: targetProf } = await sbClient
    .from("profiles")
    .select("id, nickname")
    .eq("nickname", nick)
    .maybeSingle();

  if (!targetProf) {
    gameAlert(`[${nick}] 닉네임을 가진 유저를 찾을 수 없습니다.`);
    return;
  }

  const { error } = await sbClient.from("friendships").insert({
    requester_id: userState.id,
    receiver_id: targetProf.id,
    status: "pending"
  });

  if (error) {
    gameAlert("이미 친구 신청을 보냈거나 친구 상태입니다.");
    return;
  }

  gameAlert(`💌 [${targetProf.nickname}]님에게 친구 신청을 보냈습니다!`);
  loadFriendsData();
};

async function loadFriendsData() {
  const box = document.getElementById("friendsListContainer");
  if (!box || !sbClient || !userState.id) return;
  box.innerHTML = `<div style="text-align:center; padding:12px;">불러오는 중...</div>`;

  const { data: rels } = await sbClient
    .from("friendships")
    .select("*")
    .or(`requester_id.eq.${userState.id},receiver_id.eq.${userState.id}`);

  if (!rels || rels.length === 0) {
    box.innerHTML = `<div style="text-align:center; padding:18px; color:var(--text-sub);">등록된 친구가 없습니다.<br/>닉네임으로 친구를 추가해보세요!</div>`;
    return;
  }

  const otherIds = rels.map(r => (r.requester_id === userState.id ? r.receiver_id : r.requester_id));
  const { data: profs } = await sbClient.from("profiles").select("*").in("id", otherIds);
  const profMap = new Map((profs || []).map(p => [p.id, p]));

  box.innerHTML = rels
    .map(r => {
      const isIncoming = r.receiver_id === userState.id && r.status === "pending";
      const otherId = r.requester_id === userState.id ? r.receiver_id : r.requester_id;
      const p = profMap.get(otherId) || { nickname: "유저" };

      return `
      <div class="pixel-list-item">
        <div>
          <strong>${p.nickname}</strong>
          <span style="font-size:0.75rem; color:var(--text-sub); margin-left:6px;">
            ${r.status === "accepted" ? "✅ 친구" : isIncoming ? "📩 받은 요청" : "⏳ 수락 대기중"}
          </span>
        </div>
        <div style="display:flex; gap:4px;">
          ${
            isIncoming
              ? `<button class="btn btn-primary" style="padding:4px 8px; font-size:0.74rem;" onclick="acceptFriendRequest(${r.id})">수락</button>`
              : ""
          }
          <button class="btn" style="padding:4px 8px; font-size:0.74rem;" onclick="prepareDmTo('${otherId}', '${p.nickname}')">💬 DM</button>
        </div>
      </div>
    `;
    })
    .join("");
}

window.acceptFriendRequest = async function (friendshipId) {
  await sbClient.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
  loadFriendsData();
};

window.prepareDmTo = function (receiverId, receiverNick) {
  closeModal("userInspectModal");
  openModal("socialModal");
  switchSocialTab("dm");
  document.getElementById("dmTargetId").value = receiverId;
  document.getElementById("dmTargetNickInput").value = receiverNick;
  document.getElementById("dmContentInput").focus();
};

window.sendDirectMessage = async function () {
  const targetNick = document.getElementById("dmTargetNickInput").value.trim();
  const content = document.getElementById("dmContentInput").value.trim();
  let targetId = document.getElementById("dmTargetId").value;

  if (!targetNick || !content) {
    gameAlert("받는 사람 닉네임과 메시지 내용을 입력해주세요.");
    return;
  }

  if (!targetId) {
    const { data: prof } = await sbClient
      .from("profiles")
      .select("id")
      .eq("nickname", targetNick)
      .maybeSingle();
    if (!prof) {
      gameAlert(`[${targetNick}] 유저를 찾을 수 없습니다.`);
      return;
    }
    targetId = prof.id;
  }

  await sbClient.from("direct_messages").insert({
    sender_id: userState.id,
    receiver_id: targetId,
    content
  });

  document.getElementById("dmContentInput").value = "";
  loadDirectMessages();
};

async function loadDirectMessages() {
  const box = document.getElementById("dmListContainer");
  if (!box || !sbClient || !userState.id) return;

  const { data: msgs } = await sbClient
    .from("direct_messages")
    .select("*")
    .or(`sender_id.eq.${userState.id},receiver_id.eq.${userState.id}`)
    .order("created_at", { ascending: false })
    .limit(40);

  if (!msgs || msgs.length === 0) {
    box.innerHTML = `<div style="text-align:center; padding:18px; color:var(--text-sub);">주고받은 DM 메시지가 없습니다.</div>`;
    return;
  }

  const uids = [...new Set(msgs.flatMap(m => [m.sender_id, m.receiver_id]))];
  const { data: profs } = await sbClient.from("profiles").select("id, nickname").in("id", uids);
  const nameMap = new Map((profs || []).map(p => [p.id, p.nickname]));

  box.innerHTML = msgs
    .map(m => {
      const isMine = m.sender_id === userState.id;
      const otherId = isMine ? m.receiver_id : m.sender_id;
      const otherNick = nameMap.get(otherId) || "유저";
      return `
      <div class="pixel-list-item" style="flex-direction:column; align-items:flex-start; gap:3px;" onclick="prepareDmTo('${otherId}', '${otherNick}')">
        <div style="font-size:0.74rem; color:var(--primary); font-weight:800;">
          ${isMine ? `📤 나 ➔ ${otherNick}` : `📩 ${otherNick} ➔ 나`}
        </div>
        <div style="font-size:0.86rem; color:var(--text-main);">${m.content}</div>
      </div>
    `;
    })
    .join("");
}

// ============================================================================
// 5. 대기실(광장) & 실시간 온라인 대전 (방 만들기 모달 지원)
// ============================================================================
window.enterPlazaScreen = async function () {
  switchScreen("plazaScreen");
  startPlazaCanvasLoop();
  await refreshRoomsList();

  if (sbClient && !plazaState.channel) {
    const myKey = userState.id || `guest_${Math.floor(Math.random() * 9999)}`;
    plazaState.channel = sbClient.channel("music_king_plaza", {
      config: { presence: { key: myKey } }
    });

    plazaState.channel
      .on("presence", { event: "sync" }, () => {
        const stateObj = plazaState.channel.presenceState();
        plazaState.onlinePlayers.clear();
        Object.values(stateObj).forEach(arr => {
          const p = arr[0];
          if (p) plazaState.onlinePlayers.set(p.key, p);
        });
        const countEl = document.getElementById("plazaOnlineCount");
        if (countEl) countEl.textContent = `접속 ${plazaState.onlinePlayers.size}명`;
      })
      .on("broadcast", { event: "plaza_move" }, ({ payload }) => {
        if (payload && payload.key) {
          plazaState.onlinePlayers.set(payload.key, payload);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => {
        refreshRoomsList();
      })
      .subscribe(async status => {
        if (status === "SUBSCRIBED") {
          await broadcastMyPlazaState();
        }
      });
  } else {
    broadcastMyPlazaState();
  }
};

async function broadcastMyPlazaState() {
  const myKey = userState.id || "guest_me";
  const payload = {
    key: myKey,
    nickname: userState.nickname,
    avatarConfig: userState.avatarConfig,
    x: plazaState.myX,
    dir: plazaState.myDir,
    chatMsg: Date.now() < plazaState.myChatExpire ? plazaState.myChat : ""
  };
  plazaState.onlinePlayers.set(myKey, payload);

  if (plazaState.channel) {
    try {
      await plazaState.channel.track(payload);
      await plazaState.channel.send({
        type: "broadcast",
        event: "plaza_move",
        payload
      });
    } catch (e) {}
  }
}

window.sendPlazaChat = function () {
  const input = document.getElementById("plazaChatInput");
  const msg = input.value.trim();
  if (!msg) return;
  input.value = "";
  plazaState.myChat = msg;
  plazaState.myChatExpire = Date.now() + 5000;
  broadcastMyPlazaState();
};

function startPlazaCanvasLoop() {
  const canvas = document.getElementById("plazaStageCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  canvas.onclick = e => {
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    plazaState.myDir = clickX >= plazaState.myX ? 1 : -1;
    plazaState.myX = Math.max(30, Math.min(canvas.width - 30, clickX));
    broadcastMyPlazaState();
  };

  const offscreen = document.createElement("canvas");
  offscreen.width = 56;
  offscreen.height = 56;

  const renderLoop = () => {
    if (document.getElementById("plazaScreen").classList.contains("hidden")) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 메이플풍 광장 배경
    ctx.fillStyle = "#88d4ff";
    ctx.fillRect(0, 0, canvas.width, 40);
    ctx.fillStyle = "#c8ebff";
    ctx.fillRect(0, 40, canvas.width, 65);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(35, 16, 56, 16);
    ctx.fillRect(250, 22, 68, 16);
    ctx.fillStyle = "#65cf55";
    ctx.fillRect(0, 105, canvas.width, 9);
    ctx.fillStyle = "#43a836";
    ctx.fillRect(0, 114, canvas.width, 35);

    const players = Array.from(plazaState.onlinePlayers.values());
    if (players.length === 0) {
      players.push({
        key: "me",
        nickname: userState.nickname,
        avatarConfig: userState.avatarConfig,
        x: plazaState.myX,
        chatMsg: Date.now() < plazaState.myChatExpire ? plazaState.myChat : ""
      });
    }

    players.forEach(p => {
      renderPixelAvatar(offscreen, p.avatarConfig || DEFAULT_AVATAR_CONFIG, { transparentBg: true });
      const drawX = Math.max(24, Math.min(canvas.width - 48, p.x || 140));
      ctx.drawImage(offscreen, drawX - 28, 58, 56, 56);

      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
      const tagW = ctx.measureText(p.nickname).width + 12;
      ctx.fillRect(drawX - tagW / 2, 114, tagW, 17);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(p.nickname, drawX, 126);

      if (p.chatMsg) {
        ctx.fillStyle = "#ffffff";
        const msgW = Math.min(180, ctx.measureText(p.chatMsg).width + 16);
        ctx.fillRect(drawX - msgW / 2, 34, msgW, 21);
        ctx.strokeStyle = "#4f46e5";
        ctx.lineWidth = 2;
        ctx.strokeRect(drawX - msgW / 2, 34, msgW, 21);
        ctx.fillStyle = "#1e293b";
        ctx.fillText(p.chatMsg.slice(0, 18), drawX, 48);
      }
    });

    plazaState.animFrame = requestAnimationFrame(renderLoop);
  };

  if (plazaState.animFrame) cancelAnimationFrame(plazaState.animFrame);
  plazaState.animFrame = requestAnimationFrame(renderLoop);
}

window.refreshRoomsList = async function () {
  const box = document.getElementById("plazaRoomsList");
  if (!box || !sbClient) return;

  const { data: rooms } = await sbClient
    .from("rooms")
    .select("*")
    .eq("status", "waiting")
    .order("created_at", { ascending: false })
    .limit(15);

  if (!rooms || rooms.length === 0) {
    box.innerHTML = `<div style="text-align:center; padding:18px; color:var(--text-sub); font-size:0.84rem;">현재 대기 중인 대전 방이 없습니다.<br/>아래 <strong>[⚔️ 방 만들기]</strong> 버튼으로 새 대전을 열어보세요!</div>`;
    return;
  }

  box.innerHTML = rooms
    .map(room => {
      const maxP = room.room_type === "1v1" ? 2 : 4;
      const curP = Array.isArray(room.players) ? room.players.length : 1;
      return `
      <div class="pixel-list-item">
        <div>
          <span class="badge primary" style="margin-right:4px;">${room.room_type === "1v1" ? "1:1 선착순" : "4인 점수제"}</span>
          <strong>${room.title}</strong>
          <span style="font-size:0.76rem; color:var(--text-sub);">(${curP}/${maxP}명)</span>
        </div>
        <button class="btn btn-primary" style="padding:5px 10px; font-size:0.78rem;" onclick="joinOnlineRoom('${room.id}')">입장</button>
      </div>
    `;
    })
    .join("");
};

window.openCreateRoomModal = function (defaultType = "1v1") {
  if (!userState.isLoggedIn) {
    gameConfirm("온라인 방 만들기는 로그인 후 가능합니다.\n로그인 화면으로 이동할까요?", () => showLoginScreen());
    return;
  }
  gamePrompt(
    `${defaultType === "1v1" ? "⚡ [1:1 선착순 대전]" : "🏆 [4인 점수제 대전]"} 방 제목을 입력해주세요:`,
    `${userState.nickname}님의 음악왕 대결!`,
    async title => {
      if (!title) return;
      const shuffledIds = shuffleArray(QUESTIONS_DB).slice(0, 10).map(q => q.id);
      const initialPlayers = [{ id: userState.id, nickname: userState.nickname, score: 0 }];

      const { data, error } = await sbClient
        .from("rooms")
        .insert({
          title,
          host_id: userState.id,
          room_type: defaultType,
          game_config: { mode: "behind", stage: 1 },
          status: "waiting",
          players: initialPlayers,
          current_q_index: 0,
          question_ids: shuffledIds
        })
        .select()
        .single();

      if (error || !data) {
        gameAlert("방 생성 중 오류가 발생했습니다.");
        return;
      }

      joinOnlineRoom(data.id);
    },
    "⚔️ 온라인 대전 방 만들기"
  );
};

window.joinOnlineRoom = async function (roomId) {
  if (!userState.isLoggedIn) {
    gameConfirm("온라인 대전은 로그인 후 입장하실 수 있습니다.\n로그인 화면으로 이동할까요?", () => showLoginScreen());
    return;
  }

  const { data: room } = await sbClient.from("rooms").select("*").eq("id", roomId).maybeSingle();
  if (!room) {
    gameAlert("존재하지 않거나 이미 종료된 방입니다.");
    refreshRoomsList();
    return;
  }

  const maxP = room.room_type === "1v1" ? 2 : 4;
  let players = Array.isArray(room.players) ? [...room.players] : [];
  if (!players.some(p => p.id === userState.id)) {
    if (players.length >= maxP) {
      gameAlert("방 인원이 가득 찼습니다!");
      return;
    }
    players.push({ id: userState.id, nickname: userState.nickname, score: 0 });
    await sbClient.from("rooms").update({ players }).eq("id", roomId);
    room.players = players;
  }

  plazaState.currentRoom = room;
  subscribeToBattleRoom(room);
};

function subscribeToBattleRoom(room) {
  if (plazaState.roomChannel) {
    sbClient.removeChannel(plazaState.roomChannel);
  }

  openModal("battleRoomModal");
  renderBattleRoomState(room);

  plazaState.roomChannel = sbClient
    .channel(`room_${room.id}`)
    .on("broadcast", { event: "room_update" }, ({ payload }) => {
      if (payload) {
        plazaState.currentRoom = payload;
        renderBattleRoomState(payload);
      }
    })
    .subscribe();

  setTimeout(() => {
    if (plazaState.roomChannel) {
      plazaState.roomChannel.send({
        type: "broadcast",
        event: "room_update",
        payload: room
      });
    }
  }, 300);
}

function renderBattleRoomState(room) {
  document.getElementById("battleRoomTitle").textContent = `[${room.room_type === "1v1" ? "1:1 선착순" : "4인 점수제"}] ${room.title}`;

  const playersEl = document.getElementById("battlePlayersBoard");
  playersEl.innerHTML = (room.players || [])
    .map(
      p => `
      <div class="score-rule-item">
        <span>👤 ${p.nickname}</span>
        <strong class="score-plus">${p.score || 0}점</strong>
      </div>
    `
    )
    .join("");

  const startBtn = document.getElementById("battleHostStartBtn");
  const playArea = document.getElementById("battlePlayArea");

  if (room.status === "waiting") {
    playArea.classList.add("hidden");
    startBtn.classList.toggle("hidden", room.host_id !== userState.id);
  } else if (room.status === "playing") {
    startBtn.classList.add("hidden");
    playArea.classList.remove("hidden");
    const qId = (room.question_ids || [])[room.current_q_index || 0];
    const q = QUESTIONS_DB.find(item => item.id === qId) || QUESTIONS_DB[0];
    document.getElementById("battleQProgress").textContent = `라운드 ${(room.current_q_index || 0) + 1} / ${(room.question_ids || []).length}`;
    document.getElementById("battleArtistHint").textContent = `🎤 가수 힌트: ${q.artist} (${q.year}년)`;
    document.getElementById("battleQuestionText").textContent = q.behindQuestion;
  } else if (room.status === "finished") {
    startBtn.classList.add("hidden");
    playArea.classList.remove("hidden");
    const sorted = [...(room.players || [])].sort((a, b) => (b.score || 0) - (a.score || 0));
    const winner = sorted[0];
    document.getElementById("battleQuestionText").innerHTML = `🏆 <strong>대전 종료! 우승자: ${winner ? winner.nickname : "없음"} (${winner ? winner.score : 0}점)</strong>`;
  }
}

window.hostStartOnlineBattle = async function () {
  const room = plazaState.currentRoom;
  if (!room) return;
  room.status = "playing";
  room.current_q_index = 0;
  await sbClient.from("rooms").update({ status: "playing", current_q_index: 0 }).eq("id", room.id);
  plazaState.roomChannel.send({ type: "broadcast", event: "room_update", payload: room });
  renderBattleRoomState(room);
};

window.submitOnlineBattleAnswer = async function () {
  const room = plazaState.currentRoom;
  if (!room || room.status !== "playing") return;

  const input = document.getElementById("battleAnswerInput");
  const val = input.value.trim();
  if (!val) return;

  const qId = (room.question_ids || [])[room.current_q_index || 0];
  const q = QUESTIONS_DB.find(item => item.id === qId) || QUESTIONS_DB[0];

  if (isTitleMatch(val, q) || isArtistMatch(val, q)) {
    input.value = "";
    room.players = (room.players || []).map(p =>
      p.id === userState.id ? { ...p, score: (p.score || 0) + 100 } : p
    );

    if ((room.current_q_index || 0) + 1 >= (room.question_ids || []).length) {
      room.status = "finished";
      addCdCoins(30);
    } else {
      room.current_q_index = (room.current_q_index || 0) + 1;
    }

    await sbClient
      .from("rooms")
      .update({
        players: room.players,
        current_q_index: room.current_q_index,
        status: room.status
      })
      .eq("id", room.id);

    plazaState.roomChannel.send({ type: "broadcast", event: "room_update", payload: room });
    renderBattleRoomState(room);
  } else {
    gameAlert("❌ 오답입니다! 다시 생각해보세요!");
  }
};

window.leaveBattleRoom = function () {
  if (plazaState.roomChannel && sbClient) {
    sbClient.removeChannel(plazaState.roomChannel);
    plazaState.roomChannel = null;
  }
  plazaState.currentRoom = null;
  closeModal("battleRoomModal");
  refreshRoomsList();
};
