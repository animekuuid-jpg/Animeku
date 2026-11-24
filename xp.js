/* ==================== SISTEM XP: NONTON, CHAT, KOMENTAR, DAN XP CLAN ==================== */
/*
  Aturan:
  - Nonton: setiap 30 detik video benar-benar diputar (tab aktif, tidak pause) dapat 1-20 XP acak.
  - Chat global dan komentar: tiap kirim dapat 1-5 XP acak, maksimal 20 XP per aktivitas, jeda 15 detik.
  - Bonus level: XP dikali 1 + (level x 1%), mentok di level 100 (x2).
  - Batas harian: nonton 600 XP, aktivitas 150 XP. Dihitung per perangkat (localStorage).
  - XP clan: 50% dari XP user dikali faktor rank member (Rookie 1x sampai Divine 2x).
*/

const XP_RULES = {
  WATCH_TICK_SEC: 30,
  WATCH_MIN: 1,
  WATCH_MAX: 20,
  WATCH_CAP_PER_TICK: 40,
  WATCH_DAILY_CAP: 600,
  ACT_MIN: 1,
  ACT_MAX: 5,
  ACT_CAP_PER_ITEM: 20,
  ACT_DAILY_CAP: 150,
  ACT_COOLDOWN_MS: 15000,
  LEVEL_BONUS_PER_LEVEL: 0.01,
  LEVEL_BONUS_MAX_LEVEL: 100,
  CLAN_SHARE: 0.5
};

const XP_RANK_FACTOR = {
  Rookie: 1, Bronze: 1.05, Silver: 1.1, Gold: 1.15, Platinum: 1.2, Diamond: 1.3,
  Master: 1.4, Grandmaster: 1.5, Legend: 1.6, Mythic: 1.8, Divine: 2
};

const XP_DAILY_KEY = "miko_xp_daily";

function xpDailyState() {
  const today = new Date().toDateString();
  try {
    const raw = localStorage.getItem(XP_DAILY_KEY);
    const data = raw ? JSON.parse(raw) : null;
    if (data && data.date === today) return data;
  } catch (e) {}
  return { date: today, watch: 0, act: 0, lastAct: 0 };
}

function xpSaveDailyState(state) {
  try { localStorage.setItem(XP_DAILY_KEY, JSON.stringify(state)); } catch (e) {}
}

function xpLevelMultiplier(level) {
  const lv = Math.min(Number(level) || 1, XP_RULES.LEVEL_BONUS_MAX_LEVEL);
  return 1 + lv * XP_RULES.LEVEL_BONUS_PER_LEVEL;
}

function xpRandInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function xpRankFactor(level) {
  const name = calculateRankV2(level).name;
  return XP_RANK_FACTOR[name] || 1;
}

/* Tambah XP ke user, sekaligus XP ke clan. Mengembalikan jumlah XP user yang masuk. */
async function xpGrant(amount, kind) {
  if (!currentUser || !userProfile || !firebaseReady) return 0;
  const oldLevel = userProfile.level || calculateLevel(userProfile.xp || 0);
  const newXp = (Number(userProfile.xp) || 0) + amount;
  const newLevel = calculateLevel(newXp);

  await fbUpdate(COLLECTIONS.USERS, currentUser.uid, { xp: newXp, level: newLevel });
  userProfile.xp = newXp;
  userProfile.level = newLevel;
  if (currentUserProfile) { currentUserProfile.xp = newXp; currentUserProfile.level = newLevel; }
  if (Array.isArray(allUsers)) {
    const idx = allUsers.findIndex(u => u.id === currentUser.uid);
    if (idx > -1) { allUsers[idx].xp = newXp; allUsers[idx].level = newLevel; }
  }

  if (userProfile.clanId) {
    const clanGain = Math.max(1, Math.round(amount * XP_RULES.CLAN_SHARE * xpRankFactor(oldLevel)));
    await addClanXp(userProfile.clanId, clanGain, kind, {
      userId: currentUser.uid, username: userProfile.username, avatar: userProfile.avatar
    });
  }
  return amount;
}

/* Nonton: dipanggil tiap 30 detik video benar-benar diputar */
async function xpAwardWatch() {
  try {
    const d = xpDailyState();
    if (d.watch >= XP_RULES.WATCH_DAILY_CAP) return;
    const level = userProfile ? (userProfile.level || calculateLevel(userProfile.xp || 0)) : 1;
    const roll = xpRandInt(XP_RULES.WATCH_MIN, XP_RULES.WATCH_MAX);
    let gain = Math.min(XP_RULES.WATCH_CAP_PER_TICK, Math.max(1, Math.round(roll * xpLevelMultiplier(level))));
    gain = Math.min(gain, XP_RULES.WATCH_DAILY_CAP - d.watch);
    const done = await xpGrant(gain, "watch");
    if (done) { d.watch += done; xpSaveDailyState(d); }
  } catch (e) { console.warn("XP nonton gagal:", e); }
}

/* Chat global dan komentar: maksimal 20 XP per aktivitas */
async function xpAwardActivity(kind) {
  try {
    const d = xpDailyState();
    const now = Date.now();
    if (d.act >= XP_RULES.ACT_DAILY_CAP) return;
    if (d.lastAct && now - d.lastAct < XP_RULES.ACT_COOLDOWN_MS) return;
    const level = userProfile ? (userProfile.level || calculateLevel(userProfile.xp || 0)) : 1;
    const roll = xpRandInt(XP_RULES.ACT_MIN, XP_RULES.ACT_MAX);
    let gain = Math.min(XP_RULES.ACT_CAP_PER_ITEM, Math.max(1, Math.round(roll * xpLevelMultiplier(level))));
    gain = Math.min(gain, XP_RULES.ACT_DAILY_CAP - d.act);
    const done = await xpGrant(gain, kind);
    if (done) {
      d.act += done;
      d.lastAct = now;
      xpSaveDailyState(d);
      if (typeof showToast === "function") showToast("+" + done + " XP");
    }
  } catch (e) { console.warn("XP aktivitas gagal:", e); }
}

/* Timer nonton: hanya menghitung waktu video yang benar-benar berjalan dan tab sedang dibuka */
let xpWatchState = { src: "", secs: 0 };
setInterval(function() {
  const v = document.querySelector("video");
  if (!v || v.paused || v.ended || document.hidden || v.readyState < 2) return;
  const src = v.currentSrc || "";
  if (src !== xpWatchState.src) xpWatchState = { src: src, secs: 0 };
  xpWatchState.secs += 1;
  if (xpWatchState.secs >= XP_RULES.WATCH_TICK_SEC) {
    xpWatchState.secs -= XP_RULES.WATCH_TICK_SEC;
    xpAwardWatch();
  }
}, 1000);

/* Hook lama dinonaktifkan supaya XP tidak dobel. Sumber XP sekarang hanya dari xp.js */
window.onEpisodeWatched = async function() {};
window.onCommentSent = async function() {};

/* Pasang hook kirim chat dan komentar setelah semua script termuat */
function xpInstallHooks() {
  if (window.__xpHooked) return;
  window.__xpHooked = true;
  if (typeof sendCommentToFirestore === "function") {
    const origComment = sendCommentToFirestore;
    window.sendCommentToFirestore = async function() {
      const result = await origComment.apply(this, arguments);
      xpAwardActivity("comment");
      return result;
    };
  }
  if (typeof sendGlobalMessage === "function") {
    const origChat = sendGlobalMessage;
    window.sendGlobalMessage = async function() {
      const result = await origChat.apply(this, arguments);
      xpAwardActivity("chat");
      return result;
    };
  }
}
window.addEventListener("load", xpInstallHooks);
