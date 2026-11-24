/* ==================== CLAN SYSTEM v11 (FULL UI + FIX CLICK) ==================== */

/* ==================== XP CLAN ==================== */
function calculateClanLevel(xp) {
  xp = Number(xp) || 0;
  if (xp <= 0) return 1;
  return Math.floor(Math.sqrt(xp / CLAN_LEVEL_BASE)) + 1;
}

function clanXpForLevel(level) {
  level = Number(level) || 1;
  if (level <= 1) return 0;
  return Math.pow(level - 1, 2) * CLAN_LEVEL_BASE;
}

function clanLevelProgress(xp) {
  const currentLevel = calculateClanLevel(xp);
  const nextXp = clanXpForLevel(currentLevel + 1);
  const currentXp = clanXpForLevel(currentLevel);
  const needed = nextXp - currentXp;
  const progress = (Number(xp) || 0) - currentXp;
  return {
    level: currentLevel,
    needed,
    progress,
    percent: needed > 0 ? Math.min(100, Math.round((progress / needed) * 100)) : 0,
    nextXp
  };
}

/* ==================== NAMA LIVE DI CLAN ==================== */
// Nama diambil dari data user terbaru supaya tidak tertinggal setelah ganti nama.
function clanLiveName(uid, fallback) {
  if (uid && Array.isArray(allUsers)) {
    const u = allUsers.find(x => x.id === uid);
    if (u && u.username) return u.username;
  }
  return fallback || "";
}

// Dipanggil dari profile.js setelah user ganti nama. Menyimpan nama baru ke clan milik user.
async function syncClanNameFromUser(newName) {
  if (!currentUser || !userProfile || !userProfile.clanId) return;
  const clan = clanList.find(c => c.id === userProfile.clanId);
  if (!clan) return;
  try {
    const members = (clan.members || []).map(m => m.userId === currentUser.uid ? { ...m, username: newName } : m);
    const patch = { members };
    if (clan.leaderId === currentUser.uid) patch.leaderName = newName;
    await fbUpdate(COLLECTIONS.CLANS, clan.id, patch);
    clan.members = members;
    if (patch.leaderName) clan.leaderName = newName;
  } catch (e) {
    console.warn("Gagal sinkron nama ke clan:", e);
  }
}

/* ==================== TAMBAH XP CLAN ==================== */
async function addClanXp(clanId, amount, source, member) {
  if (!clanId || !amount || amount <= 0) return false;
  if (!firebaseReady) return false;

  try {
    const clanRef = db.collection(COLLECTIONS.CLANS).doc(clanId);
    const clanDoc = await clanRef.get();
    if (!clanDoc.exists) return false;

    const clan = clanDoc.data();
    const oldXp = Number(clan.xp) || 0;
    const oldLevel = calculateClanLevel(oldXp);
    const newXp = oldXp + amount;
    const newLevel = calculateClanLevel(newXp);

    const members = (clan.members || []).map(m => {
      if (m.userId === member.userId) {
        return { ...m, contribution: (Number(m.contribution) || 0) + amount };
      }
      return m;
    });

    const stats = clan.stats || {};
    if (source === "watch") stats.totalWatches = (stats.totalWatches || 0) + 1;
    if (source === "comment") stats.totalComments = (stats.totalComments || 0) + 1;
    stats.weeklyXp = (stats.weeklyXp || 0) + amount;

    await clanRef.update({ xp: newXp, level: newLevel, members, stats });

    await clanRef.collection("activity").add({
      type: "xp_gain",
      source,
      userId: member.userId,
      username: member.username,
      amount,
      message: `${member.username} menyumbang ${amount} XP (${source})`,
      createdAt: new Date().toISOString()
    });

    if (newLevel > oldLevel) {
      await clanRef.collection("activity").add({
        type: "level_up",
        amount: newLevel,
        message: `Clan naik ke Level ${newLevel}!`,
        createdAt: new Date().toISOString()
      });
    }

    if (typeof clanList !== "undefined") {
      const idx = clanList.findIndex(c => c.id === clanId);
      if (idx > -1) {
        clanList[idx].xp = newXp;
        clanList[idx].level = newLevel;
        clanList[idx].members = members;
        clanList[idx].stats = stats;
      }
    }

    return true;
  } catch (e) {
    console.warn("Gagal tambah XP clan:", e);
    return false;
  }
}

/* ==================== DAILY CAP ==================== */
const CLAN_DAILY_KEY = "miko_clan_daily_xp";

function getClanDailyState() {
  try {
    const raw = localStorage.getItem(CLAN_DAILY_KEY);
    const today = new Date().toDateString();
    if (!raw) return { date: today, watch: 0, comment: 0, login: 0 };
    const data = JSON.parse(raw);
    if (data.date !== today) return { date: today, watch: 0, comment: 0, login: 0 };
    return data;
  } catch (e) {
    return { date: new Date().toDateString(), watch: 0, comment: 0, login: 0 };
  }
}

function saveClanDailyState(state) {
  try { localStorage.setItem(CLAN_DAILY_KEY, JSON.stringify(state)); } catch (e) {}
}

async function claimClanXp(source) {
  if (!userProfile || !userProfile.clanId) return false;
  if (!firebaseReady) return false;

  const reward = CLAN_XP_REWARDS[source.toUpperCase()];
  if (!reward) return false;

  const daily = getClanDailyState();
  const used = daily[source] || 0;
  if (reward.dailyCap > 0 && used >= reward.dailyCap) return false;

  const ok = await addClanXp(
    userProfile.clanId,
    reward.clan,
    source,
    { userId: currentUser.uid, username: userProfile.username, avatar: userProfile.avatar }
  );

  if (ok) {
    daily[source] = used + reward.clan;
    saveClanDailyState(daily);

    if (reward.user > 0) {
      try {
        const newUserXp = (userProfile.xp || 0) + reward.user;
        await fbUpdate(COLLECTIONS.USERS, currentUser.uid, {
          xp: newUserXp,
          level: calculateLevel(newUserXp)
        });
        userProfile.xp = newUserXp;
        userProfile.level = calculateLevel(newUserXp);
        if (currentUserProfile) {
          currentUserProfile.xp = newUserXp;
          currentUserProfile.level = userProfile.level;
        }
      } catch (e) {}
    }
  }
  return ok;
}

/* ==================== REQUEST / ACC ==================== */
async function sendClanRequest(clanId, message = "") {
  if (!currentUser || !userProfile) { showToast("Belum login"); return false; }
  if (userProfile.clanId) { showToast("Kamu udah punya clan"); return false; }
  if (!firebaseReady) return false;

  try {
    const clanDoc = await db.collection(COLLECTIONS.CLANS).doc(clanId).get();
    if (!clanDoc.exists) { showToast("Clan gak ada"); return false; }
    const clan = clanDoc.data();
    
    if (clan.reqLevel && (userProfile.level || 1) < clan.reqLevel) {
      showErrorToast(`Level kamu kurang (Butuh Lvl ${clan.reqLevel})`);
      return false;
    }

    if (clan.reqRank) {
      const rankOrder = { "Mythic": 10, "Legend": 9, "Grandmaster": 8, "Master": 7, "Diamond": 6, "Platinum": 5, "Gold": 4, "Silver": 3, "Bronze": 2, "Rookie": 1 };
      const myRankScore = rankOrder[userProfile.rank || "Rookie"] || 1;
      const reqRankScore = rankOrder[clan.reqRank] || 1;
      if (myRankScore < reqRankScore) {
        showErrorToast(`Rank kamu kurang (Butuh ${clan.reqRank})`);
        return false;
      }
    }

    if (clan.members.length >= clan.maxMembers) { showToast("Clan udah penuh"); return false; }

    const existing = await db.collection(COLLECTIONS.CLANS).doc(clanId)
      .collection("requests")
      .where("userId", "==", currentUser.uid)
      .where("status", "==", "pending")
      .get();
    if (!existing.empty) { showToast("Request kamu masih nunggu ACC"); return false; }

    await db.collection(COLLECTIONS.CLANS).doc(clanId).collection("requests").add({
      userId: currentUser.uid,
      username: userProfile.username,
      avatar: userProfile.avatar,
      level: userProfile.level || 1,
      rank: userProfile.rank || "Rookie",
      message: String(message).slice(0, 200),
      status: "pending",
      createdAt: new Date().toISOString()
    });

    showSuccessToast("Request terkirim, tunggu ACC");
    closeModal();
    return true;
  } catch (e) {
    console.error("Gagal kirim request:", e);
    showErrorToast("Gagal kirim request");
    return false;
  }
}

async function getClanRequests(clanId) {
  if (!firebaseReady) return [];
  try {
    const snap = await db.collection(COLLECTIONS.CLANS).doc(clanId)
      .collection("requests")
      .where("status", "==", "pending")
      .get();
    const list = [];
    snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  } catch (e) {
    return [];
  }
}

async function approveClanRequest(clanId, requestId) {
  if (!currentUser) return false;
  try {
    const clanRef = db.collection(COLLECTIONS.CLANS).doc(clanId);
    const clanDoc = await clanRef.get();
    if (!clanDoc.exists) return false;
    const clan = clanDoc.data();

    const me = clan.members.find(m => m.userId === currentUser.uid);
    if (!me || (me.role !== "leader" && me.role !== "owner" && me.role !== "admin" && me.role !== "officer")) {
      showErrorToast("Gak punya izin ACC");
      return false;
    }

    const reqRef = clanRef.collection("requests").doc(requestId);
    const reqDoc = await reqRef.get();
    if (!reqDoc.exists) return false;
    const req = reqDoc.data();

    if (clan.members.length >= clan.maxMembers) {
      showToast("Clan udah penuh");
      return false;
    }

    const newMembers = [...clan.members, {
      userId: req.userId,
      username: req.username,
      avatar: req.avatar,
      role: "member",
      contribution: 0,
      joinedAt: new Date().toISOString()
    }];

    await clanRef.update({ members: newMembers });
    await reqRef.delete();

    await fbUpdate(COLLECTIONS.USERS, req.userId, { clanId, clanName: clan.name });

    await addClanXp(clanId, CLAN_XP_REWARDS.JOIN_APPROVED.clan, "join", {
      userId: req.userId, username: req.username, avatar: req.avatar
    });

    await clanRef.collection("activity").add({
      type: "member_join",
      userId: req.userId,
      username: req.username,
      message: `${req.username} bergabung ke clan`,
      createdAt: new Date().toISOString()
    });

    showSuccessToast(req.username + " diterima");
    return true;
  } catch (e) {
    console.error("Gagal ACC:", e);
    showErrorToast("Gagal ACC request");
    return false;
  }
}

async function rejectClanRequest(clanId, requestId) {
  if (!currentUser) return false;
  try {
    const clanRef = db.collection(COLLECTIONS.CLANS).doc(clanId);
    const clanDoc = await clanRef.get();
    if (!clanDoc.exists) return false;
    const clan = clanDoc.data();

    const me = clan.members.find(m => m.userId === currentUser.uid);
    if (!me || (me.role !== "leader" && me.role !== "owner" && me.role !== "admin" && me.role !== "officer")) {
      showErrorToast("Gak punya izin tolak");
      return false;
    }

    await clanRef.collection("requests").doc(requestId).delete();
    showSuccessToast("Request ditolak");
    return true;
  } catch (e) {
    showErrorToast("Gagal tolak request");
    return false;
  }
}

/* ==================== ROLE MANAGEMENT ==================== */
async function promoteMember(clanId, userId) {
  if (!currentUser) return false;
  try {
    const clanRef = db.collection(COLLECTIONS.CLANS).doc(clanId);
    const clanDoc = await clanRef.get();
    if (!clanDoc.exists) return false;
    const clan = clanDoc.data();
    if (clan.leaderId !== currentUser.uid) { showErrorToast("Cuma leader yang bisa promote"); return false; }

    const newMembers = clan.members.map(m =>
      m.userId === userId && m.role === "member" ? { ...m, role: "officer" } : m
    );
    await clanRef.update({ members: newMembers });
    showSuccessToast("Member di-promote jadi officer");
    return true;
  } catch (e) {
    showErrorToast("Gagal promote");
    return false;
  }
}

async function demoteMember(clanId, userId) {
  if (!currentUser) return false;
  try {
    const clanRef = db.collection(COLLECTIONS.CLANS).doc(clanId);
    const clanDoc = await clanRef.get();
    if (!clanDoc.exists) return false;
    const clan = clanDoc.data();
    if (clan.leaderId !== currentUser.uid) { showErrorToast("Cuma leader yang bisa demote"); return false; }

    const newMembers = clan.members.map(m =>
      m.userId === userId && m.role === "officer" ? { ...m, role: "member" } : m
    );
    await clanRef.update({ members: newMembers });
    showSuccessToast("Officer di-demote");
    return true;
  } catch (e) {
    showErrorToast("Gagal demote");
    return false;
  }
}

/* ==================== ANNOUNCEMENT ==================== */
async function setClanAnnouncement(clanId, text) {
  if (!currentUser) return false;
  try {
    const clanRef = db.collection(COLLECTIONS.CLANS).doc(clanId);
    const clanDoc = await clanRef.get();
    if (!clanDoc.exists) return false;
    const clan = clanDoc.data();

    const me = clan.members.find(m => m.userId === currentUser.uid);
    if (!me || (me.role !== "leader" && me.role !== "owner" && me.role !== "admin" && me.role !== "officer")) {
      showErrorToast("Cuma pengurus yang bisa edit");
      return false;
    }

    await clanRef.update({ announcement: String(text).slice(0, 300) });
    showSuccessToast("Announcement disimpan");
    return true;
  } catch (e) {
    showErrorToast("Gagal simpan");
    return false;
  }
}

/* ==================== ACTIVITY LOG ==================== */
async function getClanActivity(clanId, limit = 20) {
  if (!firebaseReady) return [];
  try {
    const snap = await db.collection(COLLECTIONS.CLANS).doc(clanId)
      .collection("activity")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    const list = [];
    snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
    return list;
  } catch (e) {
    return [];
  }
}

/* ==================== CLAN CHAT ==================== */
let clanChatListener = null;

function listenClanChat(clanId, callback) {
  stopClanChat();
  if (!firebaseReady || !clanId) return;
  try {
    clanChatListener = db.collection(COLLECTIONS.CLANS).doc(clanId)
      .collection("messages")
      .orderBy("createdAt", "desc")
      .limit(50)
      .onSnapshot(snap => {
        const list = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        list.reverse();
        if (typeof callback === "function") callback(list);
      }, err => console.warn("Clan chat error:", err));
  } catch (e) {}
}

function stopClanChat() {
  if (clanChatListener) {
    try { clanChatListener(); } catch (e) {}
    clanChatListener = null;
  }
}

async function sendClanChat(clanId, text) {
  if (!currentUser || !text || !text.trim()) return false;
  try {
    await db.collection(COLLECTIONS.CLANS).doc(clanId).collection("messages").add({
      uid: currentUser.uid,
      user: userProfile.username,
      userId: userProfile.userId,
      avatar: userProfile.avatar,
      text: text.trim().slice(0, 300),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return true;
  } catch (e) {
    showErrorToast("Gagal kirim");
    return false;
  }
}

async function deleteClanChat(clanId, msgId) {
  if (!currentUser) return false;
  try {
    const ref = db.collection(COLLECTIONS.CLANS).doc(clanId).collection("messages").doc(msgId);
    const doc = await ref.get();
    if (!doc.exists) return false;
    const data = doc.data();
    if (data.uid !== currentUser.uid) { showErrorToast("Cuma bisa hapus pesan sendiri"); return false; }
    await ref.delete();
    return true;
  } catch (e) {
    return false;
  }
}

/* ==================== HOOK DARI FITUR LAIN ==================== */
async function onEpisodeWatched(animeSlug, episode) {
  await claimClanXp("watch");
}

async function onCommentSent() {
  await claimClanXp("comment");
}

async function onDailyLogin() {
  await claimClanXp("login");
}

/* ==================== STATE ==================== */
let currentClanTab = "overview";
let currentClanRequestsCache = [];
let currentClanActivityCache = [];

/* ==================== OPEN PAGE ==================== */
function openClanPage() {
  if (typeof unlockScroll === "function") unlockScroll();
  if (typeof exitFakeFullscreen === "function") exitFakeFullscreen();
  watchFromTab = currentTab;
  currentTab = "clan";
  currentClanTab = userProfile.clanId ? "overview" : "browse";
  watchOpen = false;
  if (typeof stopAutoSlide === "function") stopAutoSlide();
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  renderPage();
  window.scrollTo({ top: 0 });
}

function setClanTab(tab) {
  if (currentClanTab === "chat" && tab !== "chat") stopClanChat();
  currentClanTab = tab;
  renderPage();
}

/* ==================== RENDER PAGE ==================== */
function renderClanPage(main) {
  const myClan = userProfile.clanId ? clanList.find(c => c.id === userProfile.clanId) : null;

  if (!myClan && currentClanTab === "create") {
    main.innerHTML =
      '<div class="clan-page">' +
      '<div class="clan-topbar">' +
      '<button class="clan-back" onclick="setClanTab(\'browse\')">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>' +
      '</button>' +
      '<div class="clan-title">Bikin Clan</div>' +
      '</div>' +
      '<div class="clan-body">' + renderCreateClanFormV2() + '</div>' +
      '</div>';
    return;
  }

  main.innerHTML =
    '<div class="clan-page">' +
    '<div class="clan-topbar">' +
    '<button class="clan-back" onclick="switchTab(\'profil\')">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>' +
    '</button>' +
    '<div class="clan-title">Clan</div>' +
    '</div>' +
    (myClan ? renderClanHeaderV2(myClan) + renderClanTabsV2(myClan) : '') +
    '<div class="clan-body" id="clan-body">' +
    (myClan ? renderClanTabContent(myClan) : renderBrowseClanV2()) +
    '</div>' +
    '</div>';

  if (myClan) {
    if (currentClanTab === "requests") loadClanRequests(myClan.id);
    if (currentClanTab === "overview") loadClanActivity(myClan.id);
    if (currentClanTab === "chat") loadClanChat(myClan.id);
  }
}

/* ==================== HEADER ==================== */

/* ==================== GAYA CLAN: WARNA SOLID / CAMPUR / SENDIRI ==================== */
const CLAN_GRADIENTS = [
  ["#a855f7", "#ec4899"], ["#06b6d4", "#3b82f6"], ["#f97316", "#ef4444"], ["#10b981", "#84cc16"], ["#fbbf24", "#f97316"],
  ["#1e293b", "#7c3aed"], ["#0ea5e9", "#14b8a6"], ["#ec4899", "#f43f5e"], ["#111827", "#eab308"], ["#6366f1", "#22d3ee"]
];
let selectedClanColor2 = "";

function clanFillCSS(obj) {
  const a = (obj && obj.color) || "#a855f7";
  const b = obj && obj.color2;
  return b ? "linear-gradient(135deg, " + a + ", " + b + ")" : a;
}
function clanEmblemStyle(obj) {
  const a = (obj && obj.color) || "#a855f7";
  return "background:" + clanFillCSS(obj) + ";color:#fff;border:2px solid rgba(255,255,255,0.35);" +
    "box-shadow:0 0 0 4px color-mix(in srgb, " + a + " 22%, transparent), 0 10px 28px color-mix(in srgb, " + a + " 55%, transparent), inset 0 1px 0 rgba(255,255,255,0.35);";
}
function renderClanColorPicker() {
  const a = selectedClanColor, b = selectedClanColor2;
  const solids = CLAN_COLORS.map(function(c) {
    const on = !b && c === a;
    return '<div onclick="setClanSolid(\'' + c + '\')" style="aspect-ratio:1;border-radius:50%;background:' + c + ';border:2px solid ' + (on ? "#fff" : "transparent") + ';cursor:pointer;transform:' + (on ? "scale(1.12)" : "scale(1)") + ';"></div>';
  }).join("");
  const grads = CLAN_GRADIENTS.map(function(g) {
    const on = a === g[0] && b === g[1];
    return '<div onclick="setClanGradient(\'' + g[0] + '\',\'' + g[1] + '\')" style="aspect-ratio:1.4;border-radius:12px;background:linear-gradient(135deg,' + g[0] + ',' + g[1] + ');border:2px solid ' + (on ? "#fff" : "transparent") + ';cursor:pointer;transform:' + (on ? "scale(1.06)" : "scale(1)") + ';"></div>';
  }).join("");
  return '<div style="font-size:11px;color:var(--text-mute);margin:10px 0 6px;">Solid</div>' +
    '<div style="display:grid;grid-template-columns:repeat(8,1fr);gap:6px;">' + solids + '</div>' +
    '<div style="font-size:11px;color:var(--text-mute);margin:12px 0 6px;">Campur (gradasi)</div>' +
    '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;">' + grads + '</div>' +
    '<div style="font-size:11px;color:var(--text-mute);margin:12px 0 6px;">Warna sendiri</div>' +
    '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
      '<label style="font-size:12px;color:var(--text-dim);display:flex;align-items:center;gap:6px;">Warna 1 <input type="color" value="' + a + '" oninput="setClanCustom(1,this.value)" style="width:44px;height:32px;border:none;background:none;padding:0;cursor:pointer;"></label>' +
      '<label style="font-size:12px;color:var(--text-dim);display:flex;align-items:center;gap:6px;">Warna 2 <input type="color" value="' + (b || a) + '" oninput="setClanCustom(2,this.value)" style="width:44px;height:32px;border:none;background:none;padding:0;cursor:pointer;"></label>' +
      '<div id="clan-color-preview" style="flex:1;min-width:120px;height:32px;border-radius:10px;background:' + clanFillCSS({ color: a, color2: b }) + ';"></div></div>';
}
function refreshClanColorPicker() {
  const el = document.getElementById("clan-color-picker");
  if (el) el.innerHTML = renderClanColorPicker();
}
function setClanSolid(c) { selectedClanColor = c; selectedClanColor2 = ""; refreshClanColorPicker(); }
function setClanGradient(a, b) { selectedClanColor = a; selectedClanColor2 = b; refreshClanColorPicker(); }
function setClanCustom(which, v) {
  if (which === 1) selectedClanColor = v; else selectedClanColor2 = v;
  const pv = document.getElementById("clan-color-preview");
  if (pv) pv.style.background = clanFillCSS({ color: selectedClanColor, color2: selectedClanColor2 });
}

function renderClanHeaderV2(clan) {
  const progress = clanLevelProgress(clan.xp || 0);
  const logo = getClanLogo(clan.logo);
  return '<div class="clan-hero" style="--clan-color:' + clan.color + ';">' +
    '<div class="clan-hero-glow"></div>' +
    '<div class="clan-hero-emblem" style="' + clanEmblemStyle(clan) + '">' + logo + '</div>' +
    '<div class="clan-hero-name">' + escapeHtml(clan.name) + '</div>' +
    '<div class="clan-hero-tag">' + (clan.tag ? '[' + escapeHtml(clan.tag) + '] · ' : '') + 'Leader: ' + escapeHtml(clanLiveName(clan.leaderId, clan.leaderName)) + '</div>' +
    '<div class="clan-hero-level-row">' +
    '<span class="clan-hero-level">Lvl ' + progress.level + '</span>' +
    '<span class="clan-hero-xp">' + formatXP(clan.xp || 0) + ' / ' + formatXP(progress.nextXp) + ' XP</span>' +
    '</div>' +
    '<div class="clan-level-bar"><div class="clan-level-fill" style="width:' + progress.percent + '%"></div></div>' +
    '<div class="clan-hero-stats">' +
    '<div><b>' + clan.members.length + '</b><small>member</small></div>' +
    '<div><b>' + formatXP(clan.xp || 0) + '</b><small>total XP</small></div>' +
    '<div><b>' + formatXP((clan.stats && clan.stats.weeklyXp) || 0) + '</b><small>weekly</small></div>' +
    '</div>' +
    '</div>';
}

/* ==================== TABS ==================== */
function renderClanTabsV2(clan) {
  const me = clan.members.find(m => m.userId === (currentUser && currentUser.uid));
  const canManage = me && (me.role === "leader" || me.role === "owner" || me.role === "admin" || me.role === "officer");
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "members", label: "Members" },
    { id: "requests", label: "Requests", show: canManage },
    { id: "chat", label: "Chat" },
    { id: "stats", label: "Stats" }
  ];
  return '<div class="clan-tabs-v2">' +
    tabs.filter(t => t.show !== false).map(t =>
      '<button class="clan-tab-v2 ' + (currentClanTab === t.id ? "active" : "") + '" onclick="setClanTab(\'' + t.id + '\')">' + t.label + '</button>'
    ).join("") +
    '</div>';
}

function renderClanTabContent(clan) {
  if (currentClanTab === "overview") return renderClanOverview(clan);
  if (currentClanTab === "members") return renderClanMembers(clan);
  if (currentClanTab === "requests") return '<div class="clan-pad"><div id="clan-requests-list"><p style="text-align:center;color:var(--text-mute);padding:30px 0;">Memuat...</p></div></div>';
  if (currentClanTab === "chat") return renderClanChat(clan);
  if (currentClanTab === "stats") return renderClanStats(clan);
  return "";
}

/* ==================== OVERVIEW ==================== */
function renderClanOverview(clan) {
  const topContrib = [...clan.members].sort((a, b) => (b.contribution || 0) - (a.contribution || 0)).slice(0, 3);
  const me = clan.members.find(m => m.userId === (currentUser && currentUser.uid));
  const canManage = me && (me.role === "leader" || me.role === "owner" || me.role === "admin" || me.role === "officer");

  return '<div class="clan-overview">' +
    (clan.announcement ?
      '<div class="clan-announcement"><div class="clan-announcement-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;display:inline-block;vertical-align:-2px;margin-right:4px;"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg> Announcement</div><div class="clan-announcement-text">' + escapeHtml(clan.announcement) + '</div></div>'
      : (canManage ? '<button class="clan-announcement-empty" onclick="openAnnouncementModal(\'' + clan.id + '\')">+ Tambah announcement</button>' : '')) +
    
    // TAMPILIN SYARAT DI SINI
    (clan.reqText ? '<div class="clan-announcement" style="border-color:var(--accent-2)"><div class="clan-announcement-label" style="color:var(--accent-2)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;display:inline-block;vertical-align:-2px;margin-right:4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Syarat Masuk</div><div class="clan-announcement-text">' + escapeHtml(clan.reqText) + '</div></div>' : '') +
    (clan.description ? '<div class="clan-desc-v2">"' + escapeHtml(clan.description) + '"</div>' : '') +
    
    '<div class="clan-section-head"><div class="clan-section-title">Top Kontributor</div></div>' +
    '<div class="clan-top-contrib">' +
    (topContrib.length === 0
      ? '<p style="color:var(--text-mute);font-size:12px;">Belum ada kontribusi</p>'
      : topContrib.map((m, i) => {
          const safeName = escapeAttr(m.username || "");
          return '<div class="clan-contrib-item" onclick="openPublicProfile(\'' + safeName + '\')">' +
            '<div class="clan-contrib-rank">#' + (i + 1) + '</div>' +
            '<img class="clan-contrib-avatar" src="' + (m.avatar || 'https://i.pravatar.cc/150') + '" alt="">' +
            '<div class="clan-contrib-info">' +
            '<div class="clan-contrib-name">' + escapeHtml(clanLiveName(m.userId, m.username)) + '</div>' +
            '<div class="clan-contrib-xp">' + formatXP(m.contribution || 0) + ' XP</div>' +
            '</div>' +
            '</div>';
        }).join("")) +
    '</div>' +
    '<div class="clan-section-head"><div class="clan-section-title">Aktivitas Terbaru</div></div>' +
    '<div id="clan-activity-list"><p style="text-align:center;color:var(--text-mute);padding:20px 0;font-size:12px;">Memuat...</p></div>' +
    '<div class="clan-actions-row" style="margin-top:16px;">' +
    (canManage ? '<button class="clan-btn clan-btn-secondary" onclick="openEditClanModal()">' + icons.edit + ' Edit Clan</button>' : '') +
    (me && (me.role === "leader" || me.role === "owner")
      ? '<button class="clan-btn clan-btn-danger" onclick="disbandClan()">' + icons.trash + ' Bubarkan</button>'
      : '<button class="clan-btn clan-btn-danger" onclick="leaveClan()">' + icons.exit + ' Keluar</button>') +
    '</div>' +
    '</div>';
}

async function loadClanActivity(clanId) {
  const list = await getClanActivity(clanId, 15);
  currentClanActivityCache = list;
  const el = document.getElementById("clan-activity-list");
  if (!el) return;
  if (list.length === 0) {
    el.innerHTML = '<p style="text-align:center;color:var(--text-mute);padding:20px 0;font-size:12px;">Belum ada aktivitas</p>';
    return;
  }
  el.innerHTML = list.map(a =>
    '<div class="clan-activity-item">' +
    '<div class="clan-activity-dot type-' + a.type + '"></div>' +
    '<div class="clan-activity-text">' + escapeHtml(a.message || "") + '</div>' +
    '<div class="clan-activity-time">' + formatCommentTime(a.createdAt) + '</div>' +
    '</div>'
  ).join("");
}

/* ==================== MEMBERS ==================== */
function renderClanMembers(clan) {
  const me = clan.members.find(m => m.userId === (currentUser && currentUser.uid));
  const isLeader = me && (me.role === "leader" || me.role === "owner");
  const isOfficer = me && (me.role === "officer" || me.role === "admin");
  const canManage = isLeader || isOfficer;

  return '<div class="clan-pad"><div class="clan-members-v2">' +
    '<div class="clan-section-head"><div class="clan-section-title">Anggota (' + clan.members.length + '/' + clan.maxMembers + ')</div></div>' +
    clan.members
      .slice()
      .sort((a, b) => {
        const order = { owner: 0, leader: 0, admin: 1, officer: 2, donatur: 3, member: 4 };
        return (order[a.role] || 5) - (order[b.role] || 5);
      })
      .map(m => renderMemberCardV2(m, clan, canManage, isLeader))
      .join("") +
    '</div></div>';
}

function renderMemberCardV2(m, clan, canManage, isLeader) {
  const safeName = escapeAttr(m.username || "");
  const isMe = m.userId === (currentUser && currentUser.uid);
  const role = m.role || "member";
  const isOwner = role === "owner" || role === "leader"; 
  
  const roleConfig = {
    owner:    { label: "OWNER",    color: "#fbbf24", bg: "rgba(251, 191, 36, 0.15)", border: "rgba(251, 191, 36, 0.4)" },
    leader:   { label: "OWNER",    color: "#fbbf24", bg: "rgba(251, 191, 36, 0.15)", border: "rgba(251, 191, 36, 0.4)" },
    admin:    { label: "ADMIN",    color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.4)" },
    officer:  { label: "OFFICER",  color: "#06b6d4", bg: "rgba(6, 182, 212, 0.15)", border: "rgba(6, 182, 212, 0.4)" },
    donatur:  { label: "DONATUR",  color: "#a855f7", bg: "rgba(168, 85, 247, 0.15)", border: "rgba(168, 85, 247, 0.4)" },
    member:   { label: "MEMBER",   color: "var(--text-mute)", bg: "var(--bg-3)", border: "var(--border)" }
  };
  
  const r = roleConfig[role] || roleConfig.member;

  const roleBadge = `<span class="clan-role-badge" style="color:${r.color}; background:${r.bg}; border:1px solid ${r.border};">${r.label}</span>`;

  let actionBtnHTML = "";
  if (canManage && !isOwner && !isMe) {
    actionBtnHTML = `<button class="clan-mini-btn" onclick="openManageMemberModal('${clan.id}', '${m.userId}', '${safeName}')" title="Atur Role">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    </button>`;
  }

  return '<div class="clan-member-card">' +
    '<img class="clan-member-avatar" src="' + (m.avatar || 'https://i.pravatar.cc/150') + '" alt="" onclick="openPublicProfile(\'' + safeName + '\')">' +
    '<div class="clan-member-info">' +
    '<div class="clan-member-name-row">' +
    roleBadge +
    '<span class="clan-member-name" onclick="openPublicProfile(\'' + safeName + '\')">' + escapeHtml(clanLiveName(m.userId, m.username)) + (isMe ? ' <span style="color:var(--accent-2);font-size:10px;">(kamu)</span>' : '') + '</span>' +
    '</div>' +
    '<div class="clan-member-meta">' + formatXP(m.contribution || 0) + ' XP kontribusi</div>' +
    '</div>' +
    '<div class="clan-member-actions">' + actionBtnHTML + '</div>' +
    '</div>';
}

/* ==================== MODAL ATUR ROLE (UI ONLY) ==================== */
function openManageMemberModal(clanId, userId, username) {
  const clan = clanList.find(c => c.id === clanId);
  if (!clan) return;
  
  const member = clan.members.find(m => m.userId === userId);
  if (!member) return;

  const roles = [
    { id: "owner", label: "Owner", desc: "Akses penuh (Pemilik)", color: "#fbbf24" },
    { id: "admin", label: "Admin", desc: "Bisa ACC & Kick", color: "#ef4444" },
    { id: "officer", label: "Officer", desc: "Bisa ACC Request", color: "#06b6d4" },
    { id: "donatur", label: "Donatur", desc: "Badge spesial pendonor", color: "#a855f7" },
    { id: "member", label: "Member", desc: "Anggota biasa", color: "var(--text-mute)" }
  ];

  document.getElementById("modal-title").textContent = "Atur Role";
  
  let html = `
    <div style="text-align:center; margin-bottom: 16px;">
      <img src="${member.avatar || 'https://i.pravatar.cc/150'}" style="width:60px; height:60px; border-radius:50%; border:2px solid var(--border); margin-bottom:8px; object-fit:cover;">
      <div style="font-size:16px; font-weight:800;">${escapeHtml(username)}</div>
      <div style="font-size:11px; color:var(--text-mute);">Pilih role baru untuk member ini</div>
    </div>
    <div style="display:flex; flex-direction:column; gap:8px;">
  `;

  roles.forEach(r => {
    const isCurrent = member.role === r.id || (r.id === "owner" && member.role === "leader");
    html += `
      <button class="settings-modal-option ${isCurrent ? 'selected' : ''}" onclick="showToast('Fitur simpan role segera hadir')">
        <div style="flex:1; text-align:left;">
          <div style="font-size:13px; font-weight:800; color:${r.color}; margin-bottom:2px;">${r.label}</div>
          <div style="font-size:11px; color:var(--text-mute);">${r.desc}</div>
        </div>
        ${isCurrent ? `<span class="settings-modal-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></span>` : ''}
      </button>
    `;
  });

  html += `</div>
    <div class="form-actions" style="margin-top:16px;">
      <button class="form-btn form-btn-cancel" onclick="closeModal()">Batal</button>
    </div>
  `;
  
  document.getElementById("modal-body").innerHTML = html;
  openModal();
}

async function handleKick(clanId, username) {
  if (!confirm("Kick " + username + " dari clan?")) return;
  const target = allUsers.find(u => u.username === username);
  if (!target) return;
  const ok = await kickMember(clanId, target.id || target.userId);
  if (ok) await reloadClanData();
}

async function kickMember(clanId, targetId) {
  if (!currentUser) return false;
  try {
    const clanRef = db.collection(COLLECTIONS.CLANS).doc(clanId);
    const clanDoc = await clanRef.get();
    if (!clanDoc.exists) return false;
    const clan = clanDoc.data();

    const me = clan.members.find(m => m.userId === currentUser.uid);
    if (!me || (me.role !== "leader" && me.role !== "owner" && me.role !== "admin" && me.role !== "officer")) {
      showErrorToast("Gak punya izin");
      return false;
    }

    const target = clan.members.find(m => m.userId === targetId);
    if (!target) return false;
    if (target.role === "leader" || target.role === "owner") { showErrorToast("Gak bisa kick leader"); return false; }
    
    const targetRank = { admin: 3, officer: 2, donatur: 1, member: 0 };
    const meRank = { owner: 5, leader: 5, admin: 3, officer: 2, donatur: 1, member: 0 };
    
    if ((meRank[me.role] || 0) <= (targetRank[target.role] || 0)) {
      showErrorToast("Jabatan kamu gak cukup buat kick dia");
      return false;
    }

    const newMembers = clan.members.filter(m => m.userId !== targetId);
    await clanRef.update({ members: newMembers });
    await fbUpdate(COLLECTIONS.USERS, targetId, { clanId: "", clanName: "" });
    showSuccessToast("Member di-kick");
    return true;
  } catch (e) {
    showErrorToast("Gagal kick");
    return false;
  }
}

async function leaveClan() {
  if (!confirm("Yakin keluar dari clan?")) return;
  const clan = clanList.find(c => c.id === userProfile.clanId);
  if (!clan) return;
  if (clan.leaderId === currentUser.uid) { showToast("Kamu leader, bubarkan dulu"); return; }
  try {
    const newMembers = clan.members.filter(m => m.userId !== currentUser.uid);
    await fbUpdate(COLLECTIONS.CLANS, clan.id, { members: newMembers });
    await fbUpdate(COLLECTIONS.USERS, currentUser.uid, { clanId: "", clanName: "" });
    userProfile.clanId = "";
    userProfile.clanName = "";
    if (currentUserProfile) { currentUserProfile.clanId = ""; currentUserProfile.clanName = ""; }
    const idx = clanList.findIndex(c => c.id === clan.id);
    if (idx > -1) clanList[idx].members = newMembers;
    showSuccessToast("Keluar clan");
    currentClanTab = "browse";
    renderPage();
  } catch (e) {
    showErrorToast("Gagal keluar");
  }
}

async function disbandClan() {
  if (!confirm("Bubarkan clan? Semua member keluar.")) return;
  const clan = clanList.find(c => c.id === userProfile.clanId);
  if (!clan || clan.leaderId !== currentUser.uid) return;
  try {
    for (const m of clan.members) {
      if (m.userId === currentUser.uid) continue;
      try { await fbUpdate(COLLECTIONS.USERS, m.userId, { clanId: "", clanName: "" }); } catch (e) {}
    }
    await fbDelete(COLLECTIONS.CLANS, clan.id);
    await fbUpdate(COLLECTIONS.USERS, currentUser.uid, { clanId: "", clanName: "" });
    userProfile.clanId = "";
    userProfile.clanName = "";
    if (currentUserProfile) { currentUserProfile.clanId = ""; currentUserProfile.clanName = ""; }
    const idx = clanList.findIndex(c => c.id === clan.id);
    if (idx > -1) clanList.splice(idx, 1);
    showSuccessToast("Clan dibubarkan");
    currentClanTab = "browse";
    renderPage();
  } catch (e) {
    showErrorToast("Gagal bubarkan");
  }
}

/* ==================== REQUESTS ==================== */
async function loadClanRequests(clanId) {
  const list = await getClanRequests(clanId);
  currentClanRequestsCache = list;
  const el = document.getElementById("clan-requests-list");
  if (!el) return;
  if (list.length === 0) {
    el.innerHTML = '<p style="text-align:center;color:var(--text-mute);padding:40px 0;">Belum ada request</p>';
    return;
  }
  el.innerHTML = '<div class="clan-section-head"><div class="clan-section-title">' + list.length + ' Request Pending</div></div>' +
    list.map(r => {
      const safeName = escapeAttr(r.username || "");
      return '<div class="clan-request-card">' +
        '<img class="clan-request-avatar" src="' + (r.avatar || 'https://i.pravatar.cc/150') + '" alt="">' +
        '<div class="clan-request-info">' +
        '<div class="clan-request-name" onclick="openPublicProfile(\'' + safeName + '\')">' + escapeHtml(r.username) + '</div>' +
        '<div class="clan-request-meta">Lvl ' + (r.level || 1) + ' · ' + escapeHtml(r.rank || "Rookie") + '</div>' +
        (r.message ? '<div class="clan-request-msg">"' + escapeHtml(r.message) + '"</div>' : '') +
        '</div>' +
        '<div class="clan-request-actions">' +
        '<button class="clan-request-btn accept" onclick="handleApprove(\'' + clanId + '\', \'' + r.id + '\')"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>' +
        '<button class="clan-request-btn reject" onclick="handleReject(\'' + clanId + '\', \'' + r.id + '\')"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
        '</div>' +
        '</div>';
    }).join("");
}

async function handleApprove(clanId, reqId) {
  const ok = await approveClanRequest(clanId, reqId);
  if (ok) {
    await reloadClanData();
    loadClanRequests(clanId);
  }
}

async function handleReject(clanId, reqId) {
  const ok = await rejectClanRequest(clanId, reqId);
  if (ok) loadClanRequests(clanId);
}

/* ==================== CHAT ==================== */
function renderClanChat(clan) {
  return '<div class="clan-chat-wrap">' +
    '<div class="clan-chat-list" id="clan-chat-list"><p style="text-align:center;color:var(--text-mute);padding:20px 0;">Memuat...</p></div>' +
    '<div class="clan-chat-input-bar">' +
    '<input id="clan-chat-input" class="clan-chat-input" placeholder="Ketik pesan..." maxlength="300" onkeydown="if(event.key===\'Enter\')handleSendClanChat(\'' + clan.id + '\')">' +
    '<button class="clan-chat-send" onclick="handleSendClanChat(\'' + clan.id + '\')">' + icons.send + '</button>' +
    '</div>' +
    '</div>';
}

function loadClanChat(clanId) {
  listenClanChat(clanId, (messages) => {
    const el = document.getElementById("clan-chat-list");
    if (!el) return;
    if (messages.length === 0) {
      el.innerHTML = '<p style="text-align:center;color:var(--text-mute);padding:20px 0;font-size:12px;">Belum ada pesan</p>';
      return;
    }
    el.innerHTML = messages.map(m => {
      const isOwn = m.uid === (currentUser && currentUser.uid);
      const safeName = escapeAttr(m.user || "");
      return '<div class="clan-chat-msg ' + (isOwn ? "own" : "") + '">' +
        '<img class="clan-chat-avatar" src="' + (m.avatar || 'https://i.pravatar.cc/150') + '" alt="" onclick="openPublicProfile(\'' + safeName + '\')">' +
        '<div class="clan-chat-body">' +
        '<div class="clan-chat-header">' +
        '<span class="clan-chat-name" onclick="openPublicProfile(\'' + safeName + '\')">' + escapeHtml(m.user) + '</span>' +
        '<span class="clan-chat-time">' + formatChatTime(m.createdAt) + '</span>' +
        '</div>' +
        '<div class="clan-chat-text">' + escapeHtml(m.text) + '</div>' +
        (isOwn ? '<button class="clan-chat-del" onclick="handleDeleteClanChat(\'' + clanId + '\', \'' + m.id + '\')">' + icons.x + '</button>' : '') +
        '</div>' +
        '</div>';
    }).join("");
    el.scrollTop = el.scrollHeight;
  });
}

async function handleSendClanChat(clanId) {
  const input = document.getElementById("clan-chat-input");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  await sendClanChat(clanId, text);
}

async function handleDeleteClanChat(clanId, msgId) {
  if (!confirm("Hapus pesan?")) return;
  await deleteClanChat(clanId, msgId);
}

/* ==================== STATS ==================== */
function renderClanStats(clan) {
  const stats = clan.stats || {};
  return '<div class="clan-pad"><div class="clan-stats-v2">' +
    '<div class="clan-stat-card"><div class="clan-stat-value">' + formatXP(stats.totalWatches || 0) + '</div><div class="clan-stat-label">Episode ditonton</div></div>' +
    '<div class="clan-stat-card"><div class="clan-stat-value">' + formatXP(stats.totalComments || 0) + '</div><div class="clan-stat-label">Komentar</div></div>' +
    '<div class="clan-stat-card"><div class="clan-stat-value">' + formatXP(stats.weeklyXp || 0) + '</div><div class="clan-stat-label">Weekly XP</div></div>' +
    '<div class="clan-stat-card"><div class="clan-stat-value">' + formatXP(clan.xp || 0) + '</div><div class="clan-stat-label">Total XP</div></div>' +
    '</div></div>';
}

/* ==================== BROWSE ==================== */
function renderBrowseClanV2() {
  if (clanList.length === 0) {
    return '<div class="clan-empty-state fade-up">' +
      '<div class="clan-empty-icon">' + icons.shield + '</div>' +
      '<div class="clan-empty-title">Belum Ada Clan</div>' +
      '<div class="clan-empty-sub">Jadilah yang pertama bikin clan!</div>' +
      '<button class="clan-action-btn" onclick="setClanTab(\'create\')">' + icons.plus + ' Bikin Clan Baru</button>' +
      '</div>';
  }

  return '<div class="clan-browse-v2">' +
    '<div class="clan-section-head"><div class="clan-section-title">Daftar Clan</div><div class="clan-section-count">' + clanList.length + '</div></div>' +
    (userProfile.clanId ? '' : '<button class="clan-action-btn" onclick="setClanTab(\'create\')" style="margin-bottom:14px;">' + icons.plus + ' Bikin Clan Baru</button>') +
    clanList.map(c => {
      const progress = clanLevelProgress(c.xp || 0);
      const full = c.members.length >= c.maxMembers;
      const logo = getClanLogo(c.logo);
      return '<div class="clan-card-v2" style="--clan-color:' + c.color + ';" onclick="openJoinClanModal(\'' + c.id + '\')">' +
        '<div class="clan-card-v2-emblem" style="' + clanEmblemStyle(c) + '">' + logo + '</div>' +
        '<div class="clan-card-v2-info">' +
        '<div class="clan-card-v2-name">' + escapeHtml(c.name) + ' <span class="clan-card-v2-lvl">Lvl ' + progress.level + '</span></div>' +
        '<div class="clan-card-v2-meta">' + c.members.length + '/' + c.maxMembers + ' member · ' + formatXP(c.xp || 0) + ' XP</div>' +
        '<div style="font-size:10px;color:var(--accent-2);margin-top:2px;">' + (c.requireApproval !== false ? 'Perlu ACC' : 'Bebas Join') + '</div>' +
        '</div>' +
        (full
          ? '<span class="clan-card-v2-join full">Penuh</span>'
          : (userProfile.clanId
              ? '<span class="clan-card-v2-join full">Udah Punya</span>'
              : '<button class="clan-card-v2-join" onclick="event.stopPropagation(); openJoinClanModal(\'' + c.id + '\')">Join</button>')) +
        '</div>';
    }).join("") +
    '</div>';
}

/* ==================== MODAL JOIN (SQUAD STYLE) ==================== */
function openJoinClanModal(clanId) {
  const clan = clanList.find(c => c.id === clanId);
  if (!clan) return;

  const typeText = clan.requireApproval !== false ? "Perlu Persetujuan (ACC)" : "Langsung Masuk";

  document.getElementById("modal-title").textContent = "Detail Clan";
  document.getElementById("modal-body").innerHTML = `
    <div style="text-align:center;margin-bottom:16px;">
      <div style="width:70px;height:70px;border-radius:20px;${clanEmblemStyle(clan)}display:flex;align-items:center;justify-content:center;margin:0 auto 12px;padding:16px;box-shadow:0 8px 24px ${clan.color}60;">
        ${getClanLogo(clan.logo)}
      </div>
      <div style="font-size:20px;font-weight:800;">${escapeHtml(clan.name)}</div>
      <div style="font-size:12px;color:var(--text-mute);margin-top:4px;">Lvl ${clanLevelProgress(clan.xp || 0).level} · ${clan.members.length}/${clan.maxMembers} member</div>
    </div>

    <div style="background:var(--bg-3);border-radius:12px;padding:12px;margin-bottom:16px;">
      <div style="font-size:11px;font-weight:700;color:var(--text-dim);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Informasi Join</div>
      <div style="display:flex;align-items:center;gap:8px;font-size:12.5px;margin-bottom:6px;">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--accent-2)" fill="none" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <span>${typeText}</span>
      </div>
      ${clan.reqText ? `
      <div style="display:flex;align-items:flex-start;gap:8px;font-size:12.5px;">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--gold)" fill="none" stroke-width="2" style="flex-shrink:0;margin-top:2px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        <span style="white-space:pre-wrap;">${escapeHtml(clan.reqText)}</span>
      </div>
      ` : ''}
    </div>

    ${clan.requireApproval !== false ? `
      <div class="clan-form-group">
        <label class="clan-form-label">Pesan Join (Opsional)</label>
        <textarea id="join-clan-msg" class="clan-form-input clan-form-textarea" placeholder="Halo leader, izin join ya..." maxlength="100"></textarea>
      </div>
    ` : ''}

    <div class="form-actions">
      <button class="form-btn form-btn-cancel" onclick="closeModal()">Batal</button>
      <button class="form-btn form-btn-save" style="background:${clanFillCSS(clan)}" onclick="submitJoinClan('${clan.id}')">
        ${clan.requireApproval !== false ? 'Kirim Request' : 'Join Sekarang'}
      </button>
    </div>
  `;
  openModal();
}

async function submitJoinClan(clanId) {
  const clan = clanList.find(c => c.id === clanId);
  if (!clan) return;
  
  const msgEl = document.getElementById("join-clan-msg");
  const msg = msgEl ? msgEl.value.trim() : "";

  if (clan.requireApproval !== false) {
    await sendClanRequest(clanId, msg);
  } else {
    if (clan.reqLevel && (userProfile.level || 1) < clan.reqLevel) { showErrorToast(`Level kurang (Min. ${clan.reqLevel})`); return; }
    if (clan.reqRank) { 
      const ro = { "Mythic": 10, "Legend": 9, "Grandmaster": 8, "Master": 7, "Diamond": 6, "Platinum": 5, "Gold": 4, "Silver": 3, "Bronze": 2, "Rookie": 1 };
      if ((ro[userProfile.rank || "Rookie"] || 1) < (ro[clan.reqRank] || 1)) { showErrorToast(`Rank kurang (Min. ${clan.reqRank})`); return; }
    }

    showLoadingToast("Join clan...");
    const newMember = { userId: currentUser.uid, username: userProfile.username, avatar: userProfile.avatar, role: "member", contribution: 0, joinedAt: new Date().toISOString() };
    const newMembers = [...clan.members, newMember];
    try {
      await fbUpdate(COLLECTIONS.CLANS, clanId, { members: newMembers });
      await fbUpdate(COLLECTIONS.USERS, currentUser.uid, { clanId, clanName: clan.name });
      userProfile.clanId = clanId;
      userProfile.clanName = clan.name;
      if (currentUserProfile) { currentUserProfile.clanId = clanId; currentUserProfile.clanName = clan.name; }
      clan.members = newMembers;
      showSuccessToast("Join " + clan.name);
      closeModal();
      currentClanTab = "overview";
      renderPage();
    } catch (e) { showErrorToast("Gagal join"); }
  }
}

/* ==================== CREATE FORM ==================== */
function renderCreateClanFormV2() {
  return '<div class="clan-card fade-up">' +
    '<div class="clan-section-head" style="margin-bottom:16px;"><div class="clan-section-title">Bikin Clan Baru</div></div>' +
    
    '<div class="clan-form-group"><label class="clan-form-label">Nama Clan *</label><input id="clan-name-input" class="clan-form-input" placeholder="Contoh: MAOU" maxlength="20"></div>' +
    '<div class="clan-form-group"><label class="clan-form-label">Tag (opsional)</label><input id="clan-tag-input" class="clan-form-input" placeholder="MOU" maxlength="5"></div>' +
    '<div class="clan-form-group"><label class="clan-form-label">Deskripsi (opsional)</label><textarea id="clan-desc-input" class="clan-form-input clan-form-textarea" maxlength="100"></textarea></div>' +
    
    // --- SISTEM JOIN & SYARAT ---
    '<div class="clan-form-group" style="background:var(--bg-3);padding:12px;border-radius:12px;border:1px solid var(--border);margin-bottom:14px;">' +
      '<label class="clan-form-label" style="color:var(--accent-2);margin-bottom:8px;display:flex;align-items:center;gap:6px;">' +
        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' +
        'Sistem Join' +
      '</label>' +
      '<select id="clan-approval-input" class="clan-form-input" style="background:var(--bg-2);">' +
        '<option value="true">Perlu Persetujuan (ACC)</option>' +
        '<option value="false">Bebas Join (Otomatis)</option>' +
      '</select>' +
    '</div>' +

    '<div class="clan-form-group" style="background:var(--bg-3);padding:12px;border-radius:12px;border:1px solid var(--border);margin-bottom:14px;">' +
      '<label class="clan-form-label" style="color:var(--gold);margin-bottom:8px;display:flex;align-items:center;gap:6px;">' +
        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' +
        'Syarat Masuk (Custom)' +
      '</label>' +
      '<textarea id="clan-req-text" class="clan-form-input clan-form-textarea" placeholder="Contoh: Wajib Lvl 10, Rank Gold, Rajin Nonton, dll..." maxlength="150" style="background:var(--bg-2);margin-bottom:8px;"></textarea>' +
      '<div style="display:flex;gap:8px;">' +
        '<select id="clan-req-level" class="clan-form-input" style="flex:1;background:var(--bg-2);">' +
          '<option value="0">Min. Level: Bebas</option>' +
          '<option value="5">Min. Level: 5</option>' +
          '<option value="10">Min. Level: 10</option>' +
          '<option value="20">Min. Level: 20</option>' +
          '<option value="50">Min. Level: 50</option>' +
        '</select>' +
        '<select id="clan-req-rank" class="clan-form-input" style="flex:1;background:var(--bg-2);">' +
          '<option value="">Min. Rank: Bebas</option>' +
          '<option value="Bronze">Bronze</option>' +
          '<option value="Silver">Silver</option>' +
          '<option value="Gold">Gold</option>' +
          '<option value="Platinum">Platinum</option>' +
          '<option value="Diamond">Diamond</option>' +
          '<option value="Master">Master</option>' +
          '<option value="Grandmaster">Grandmaster</option>' +
          '<option value="Legend">Legend</option>' +
          '<option value="Mythic">Mythic</option>' +
        '</select>' +
      '</div>' +
    '</div>' +
    // --- END SISTEM JOIN ---

    // BAGIAN LOGO (Dikecilin grid-nya jadi 6 kolom)
    '<div class="clan-form-group" style="position:relative; z-index:99;">' +
      '<label class="clan-form-label">Logo Clan</label>' +
      '<div style="display:grid; grid-template-columns:repeat(6, 1fr); gap:6px; margin-top:8px;">' +
      Object.keys(CLAN_LOGOS).map(key => {
        const isSel = key === selectedClanLogo;
        const border = isSel ? "2px solid var(--accent-2)" : "2px solid var(--border)";
        const bg = isSel ? "rgba(6, 182, 212, 0.1)" : "var(--bg-2)";
        const color = isSel ? "var(--accent-2)" : "var(--text-mute)";
        return `<div class="clan-logo-btn ${isSel ? 'selected' : ''}" onclick="selectClanLogo('${key}')" style="aspect-ratio:1; border:${border}; background:${bg}; color:${color}; border-radius:8px; display:flex; align-items:center; justify-content:center; padding:6px; cursor:pointer; position:relative; z-index:100; pointer-events:auto;">${getClanLogo(key)}</div>`;
      }).join("") +
      '</div>' +
    '</div>' +

    // BAGIAN WARNA (Dikecilin grid-nya jadi 8 kolom)
    '<div class="clan-form-group" style="position:relative; z-index:99;">' +
      '<label class="clan-form-label">Warna Clan</label>' +
      '<div id="clan-color-picker">' + renderClanColorPicker() + '</div>' +
    '</div>' +

    '<button class="clan-action-btn" onclick="createClanV2()" style="margin-top:16px;">' + icons.plus + ' Bikin Clan</button>' +
    '</div>';
}

async function createClanV2() {
  const name = ((document.getElementById("clan-name-input") || {}).value || "").trim();
  const tag = ((document.getElementById("clan-tag-input") || {}).value || "").trim();
  const desc = ((document.getElementById("clan-desc-input") || {}).value || "").trim();
  const approvalVal = ((document.getElementById("clan-approval-input") || {}).value || "true");
  const reqLevelVal = Number((document.getElementById("clan-req-level") || {}).value || 0);
  const reqRankVal = ((document.getElementById("clan-req-rank") || {}).value || "");
  const reqTextVal = ((document.getElementById("clan-req-text") || {}).value || "").trim();

  if (!name || name.length < 2) { showToast("Nama minimal 2 karakter"); return; }
  if (name.length > 20) { showToast("Nama maksimal 20 karakter"); return; }
  if (clanList.find(c => c.name.toLowerCase() === name.toLowerCase())) { showToast("Nama udah dipakai"); return; }
  if (userProfile.clanId) { showToast("Kamu udah punya clan"); return; }

  showLoadingToast("Bikin clan...");
  try {
    const clanData = {
      name, tag, description: desc,
      logo: selectedClanLogo, color: selectedClanColor, color2: selectedClanColor2 || "",
      leaderId: currentUser.uid, leaderName: userProfile.username,
      xp: 0, level: 1,
      members: [{
        userId: currentUser.uid, username: userProfile.username,
        avatar: userProfile.avatar, role: "owner", contribution: 0,
        joinedAt: new Date().toISOString()
      }],
      maxMembers: 20, isOpen: true, 
      requireApproval: approvalVal === "true",
      reqLevel: reqLevelVal,
      reqRank: reqRankVal,
      reqText: reqTextVal,
      announcement: "", stats: { totalWatches: 0, totalComments: 0, weeklyXp: 0 },
      createdAt: new Date().toISOString()
    };

    const newId = await fbAdd(COLLECTIONS.CLANS, clanData);
    if (!newId) throw new Error("Gagal");
    clanData.id = newId;
    clanList.push(clanData);

    userProfile.clanId = newId;
    userProfile.clanName = name;
    if (currentUserProfile) { currentUserProfile.clanId = newId; currentUserProfile.clanName = name; }
    await fbUpdate(COLLECTIONS.USERS, currentUser.uid, { clanId: newId, clanName: name });

    await addClanXp(newId, CLAN_XP_REWARDS.CREATE_CLAN.clan, "create", {
      userId: currentUser.uid, username: userProfile.username, avatar: userProfile.avatar
    });

    showSuccessToast("Clan dibuat!");
    currentClanTab = "overview";
    renderPage();
  } catch (e) {
    showErrorToast("Gagal: " + e.message);
  }
}

/* ==================== EDIT ==================== */
function openEditClanModal() {
  const clan = clanList.find(c => c.id === userProfile.clanId);
  if (!clan) return;
  selectedClanLogo = clan.logo || "shield";
  selectedClanColor = clan.color || "#a855f7";
  selectedClanColor2 = clan.color2 || "";

  document.getElementById("modal-title").textContent = "Edit Clan";
  document.getElementById("modal-body").innerHTML =
    '<div class="clan-form-group"><label class="clan-form-label">Nama</label><input id="clan-name-input" class="clan-form-input" value="' + escapeAttr(clan.name) + '" maxlength="20"></div>' +
    '<div class="clan-form-group"><label class="clan-form-label">Tag</label><input id="clan-tag-input" class="clan-form-input" value="' + escapeAttr(clan.tag || "") + '" maxlength="5"></div>' +
    '<div class="clan-form-group"><label class="clan-form-label">Deskripsi</label><textarea id="clan-desc-input" class="clan-form-input clan-form-textarea" maxlength="100">' + escapeHtml(clan.description || "") + '</textarea></div>' +
    
    '<div class="clan-form-group" style="background:var(--bg-3);padding:12px;border-radius:12px;border:1px solid var(--border);">' +
      '<label class="clan-form-label" style="color:var(--accent-2);margin-bottom:8px;display:flex;align-items:center;gap:6px;">' +
        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' +
        'Sistem Join' +
      '</label>' +
      '<select id="clan-approval-input" class="clan-form-input" style="background:var(--bg-2);">' +
        '<option value="true" ' + (clan.requireApproval !== false ? "selected" : "") + '>Perlu Persetujuan (ACC)</option>' +
        '<option value="false" ' + (clan.requireApproval === false ? "selected" : "") + '>Bebas Join (Otomatis)</option>' +
      '</select>' +
    '</div>' +

    '<div class="clan-form-group" style="background:var(--bg-3);padding:12px;border-radius:12px;border:1px solid var(--border);">' +
      '<label class="clan-form-label" style="color:var(--gold);margin-bottom:8px;display:flex;align-items:center;gap:6px;">' +
        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' +
        'Syarat Masuk (Custom)' +
      '</label>' +
      '<textarea id="clan-req-text" class="clan-form-input clan-form-textarea" placeholder="Contoh: Wajib Lvl 10, Rank Gold, Rajin Nonton, dll..." maxlength="150" style="background:var(--bg-2);margin-bottom:8px;">' + escapeHtml(clan.reqText || "") + '</textarea>' +
      '<div style="display:flex;gap:8px;">' +
        '<select id="clan-req-level" class="clan-form-input" style="flex:1;background:var(--bg-2);">' +
          '<option value="0" ' + (!clan.reqLevel ? "selected" : "") + '>Min. Level: Bebas</option>' +
          '<option value="5" ' + (clan.reqLevel == 5 ? "selected" : "") + '>Min. Level: 5</option>' +
          '<option value="10" ' + (clan.reqLevel == 10 ? "selected" : "") + '>Min. Level: 10</option>' +
          '<option value="20" ' + (clan.reqLevel == 20 ? "selected" : "") + '>Min. Level: 20</option>' +
          '<option value="50" ' + (clan.reqLevel == 50 ? "selected" : "") + '>Min. Level: 50</option>' +
        '</select>' +
        '<select id="clan-req-rank" class="clan-form-input" style="flex:1;background:var(--bg-2);">' +
          '<option value="" ' + (!clan.reqRank ? "selected" : "") + '>Min. Rank: Bebas</option>' +
          '<option value="Bronze" ' + (clan.reqRank === "Bronze" ? "selected" : "") + '>Bronze</option>' +
          '<option value="Silver" ' + (clan.reqRank === "Silver" ? "selected" : "") + '>Silver</option>' +
          '<option value="Gold" ' + (clan.reqRank === "Gold" ? "selected" : "") + '>Gold</option>' +
          '<option value="Platinum" ' + (clan.reqRank === "Platinum" ? "selected" : "") + '>Platinum</option>' +
          '<option value="Diamond" ' + (clan.reqRank === "Diamond" ? "selected" : "") + '>Diamond</option>' +
          '<option value="Master" ' + (clan.reqRank === "Master" ? "selected" : "") + '>Master</option>' +
          '<option value="Grandmaster" ' + (clan.reqRank === "Grandmaster" ? "selected" : "") + '>Grandmaster</option>' +
          '<option value="Legend" ' + (clan.reqRank === "Legend" ? "selected" : "") + '>Legend</option>' +
          '<option value="Mythic" ' + (clan.reqRank === "Mythic" ? "selected" : "") + '>Mythic</option>' +
        '</select>' +
      '</div>' +
    '</div>' +

    // LOGO (6 kolom)
    '<div class="clan-form-group" style="position:relative; z-index:99;">' +
      '<label class="clan-form-label">Logo</label>' +
      '<div style="display:grid; grid-template-columns:repeat(6, 1fr); gap:6px; margin-top:8px;">' +
      Object.keys(CLAN_LOGOS).map(key => {
        const isSel = key === selectedClanLogo;
        const border = isSel ? "2px solid var(--accent-2)" : "2px solid var(--border)";
        const bg = isSel ? "rgba(6, 182, 212, 0.1)" : "var(--bg-2)";
        const color = isSel ? "var(--accent-2)" : "var(--text-mute)";
        return `<div class="clan-logo-btn ${isSel ? 'selected' : ''}" onclick="selectClanLogo('${key}')" style="aspect-ratio:1; border:${border}; background:${bg}; color:${color}; border-radius:8px; display:flex; align-items:center; justify-content:center; padding:6px; cursor:pointer; position:relative; z-index:100; pointer-events:auto;">${getClanLogo(key)}</div>`;
      }).join("") +
      '</div>' +
    '</div>' +

    // WARNA (8 kolom)
    '<div class="clan-form-group" style="position:relative; z-index:99;">' +
      '<label class="clan-form-label">Warna</label>' +
      '<div id="clan-color-picker">' + renderClanColorPicker() + '</div>' +
    '</div>' +

    '<div class="form-actions"><button class="form-btn form-btn-cancel" onclick="closeModal()">Batal</button><button class="form-btn form-btn-save" onclick="saveClanEditV2()">Simpan</button></div>';
  openModal();
}

async function saveClanEditV2() {
  const clan = clanList.find(c => c.id === userProfile.clanId);
  if (!clan) return;
  const name = ((document.getElementById("clan-name-input") || {}).value || "").trim();
  const tag = ((document.getElementById("clan-tag-input") || {}).value || "").trim();
  const desc = ((document.getElementById("clan-desc-input") || {}).value || "").trim();
  const approvalVal = ((document.getElementById("clan-approval-input") || {}).value || "true");
  const reqLevelVal = Number((document.getElementById("clan-req-level") || {}).value || 0);
  const reqRankVal = ((document.getElementById("clan-req-rank") || {}).value || "");
  const reqTextVal = ((document.getElementById("clan-req-text") || {}).value || "").trim();

  if (!name || name.length < 2) { showToast("Nama minimal 2 karakter"); return; }

  try {
    await fbUpdate(COLLECTIONS.CLANS, clan.id, {
      name, tag, description: desc,
      logo: selectedClanLogo, color: selectedClanColor, color2: selectedClanColor2 || "",
      requireApproval: approvalVal === "true",
      reqLevel: reqLevelVal,
      reqRank: reqRankVal,
      reqText: reqTextVal
    });
    Object.assign(clan, { 
      name, tag, description: desc, logo: selectedClanLogo, color: selectedClanColor, color2: selectedClanColor2 || "",
      requireApproval: approvalVal === "true", reqLevel: reqLevelVal, reqRank: reqRankVal, reqText: reqTextVal
    });
    if (currentUser) {
      await fbUpdate(COLLECTIONS.USERS, currentUser.uid, { clanName: name });
      userProfile.clanName = name;
      if (currentUserProfile) currentUserProfile.clanName = name;
    }
    closeModal();
    showSuccessToast("Clan diupdate");
    renderPage();
  } catch (e) { showErrorToast("Gagal"); }
}

/* ==================== ANNOUNCEMENT MODAL ==================== */
function openAnnouncementModal(clanId) {
  const clan = clanList.find(c => c.id === clanId);
  if (!clan) return;
  document.getElementById("modal-title").textContent = "Announcement";
  document.getElementById("modal-body").innerHTML =
    '<textarea id="clan-ann-input" class="clan-form-input clan-form-textarea" maxlength="300" placeholder="Pengumuman untuk member...">' + escapeHtml(clan.announcement || "") + '</textarea>' +
    '<div class="form-actions"><button class="form-btn form-btn-cancel" onclick="closeModal()">Batal</button><button class="form-btn form-btn-save" onclick="saveAnnouncement(\'' + clanId + '\')">Simpan</button></div>';
  openModal();
}

async function saveAnnouncement(clanId) {
  const text = ((document.getElementById("clan-ann-input") || {}).value || "").trim();
  const ok = await setClanAnnouncement(clanId, text);
  if (ok) {
    const clan = clanList.find(c => c.id === clanId);
    if (clan) clan.announcement = text;
    closeModal();
    renderPage();
  }
}

/* ==================== CLICK HANDLERS (DOM MANIPULATION) ==================== */
function selectClanLogo(key) {
  selectedClanLogo = key;
  const btns = document.querySelectorAll('.clan-logo-btn');
  btns.forEach(btn => {
    if (btn.getAttribute('onclick').includes(`'${key}'`)) {
      btn.classList.add('selected');
      btn.style.borderColor = "var(--accent-2)";
      btn.style.color = "var(--accent-2)";
      btn.style.background = "rgba(6, 182, 212, 0.1)";
      btn.style.boxShadow = "0 0 10px rgba(6, 182, 212, 0.3)";
    } else {
      btn.classList.remove('selected');
      btn.style.borderColor = "var(--border)";
      btn.style.color = "var(--text-mute)";
      btn.style.background = "var(--bg-2)";
      btn.style.boxShadow = "none";
    }
  });
}

function selectClanColor(color) {
  selectedClanColor = color;
  const btns = document.querySelectorAll('.clan-color-btn');
  btns.forEach(btn => {
    if (btn.getAttribute('onclick').includes(`'${color}'`)) {
      btn.classList.add('selected');
      btn.style.borderColor = "white";
      btn.style.transform = "scale(1.15)";
      btn.style.boxShadow = "0 0 8px rgba(255, 255, 255, 0.5)";
    } else {
      btn.classList.remove('selected');
      btn.style.borderColor = "transparent";
      btn.style.transform = "scale(1)";
      btn.style.boxShadow = "none";
    }
  });
}

/* ==================== RELOAD ==================== */
async function reloadClanData() {
  try {
    const docs = await fbGetAll(COLLECTIONS.CLANS);
    clanList.length = 0;
    (docs || []).forEach(c => {
      clanList.push({
        id: c.id, name: c.name || "Tanpa Nama", tag: c.tag || "",
        description: c.description || "", logo: c.logo || "shield",
        color: c.color || generateClanColor(c.name || ""), color2: c.color2 || "",
        leaderId: c.leaderId || "", leaderName: c.leaderName || "",
        members: c.members || [], maxMembers: c.maxMembers || 20,
        isOpen: c.isOpen !== false, requireApproval: c.requireApproval !== false,
        reqLevel: c.reqLevel || 0, reqRank: c.reqRank || "", reqText: c.reqText || "",
        announcement: c.announcement || "",
        xp: c.xp || 0, level: c.level || 1,
        stats: c.stats || {},
        createdAt: c.createdAt || ""
      });
    });
    renderPage();
  } catch (e) {}
}

console.log("Clan system v11 (Full UI) loaded");