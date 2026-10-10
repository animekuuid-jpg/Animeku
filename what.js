/* ==================== WATCH SYSTEM ==================== */
/* Auto skip intro, simpan progress per akun, auto next episode, history */

const INTRO_DEFAULT = { start: 10, end: 90 };
const WATCH_PROGRESS_SAVE_INTERVAL = 5000; // 5 detik
const AUTO_NEXT_COUNTDOWN = 5;

let progressSaveInterval = null;
let autoNextCountdownInterval = null;
let progressListenersBound = false;

/* ==================== INTRO DATA ==================== */
function getIntroData(animeSlug, episode) {
  if (window.__introData && window.__introData[animeSlug]) {
    var data = window.__introData[animeSlug];
    if (data[episode]) return data[episode];
    if (data.default) return data.default;
  }
  return INTRO_DEFAULT;
}

/* ==================== KEY PROGRESS (per user, per anime, per episode) ==================== */
/* Format Firestore doc ID: {uid}_{slug}_ep{episode} */
function getProgressDocId(animeSlug, episode) {
  if (!currentUser) return null;
  return currentUser.uid + "_" + animeSlug + "_ep" + Number(episode);
}

/* Local storage key (per user) */
function getProgressLocalKey(animeSlug, episode) {
  var uid = currentUser ? currentUser.uid : "guest";
  return uid + "_" + animeSlug + "-ep" + Number(episode);
}

/* ==================== ADD TO HISTORY ==================== */
function addToHistory(animeSlug, episode) {
  if (!animeSlug || !episode) return;
  var anime = (typeof getAnimeBySlug === "function") ? getAnimeBySlug(animeSlug) : null;
  if (!anime) return;
  episode = Number(episode);

  var existingIdx = historyList.findIndex(function(h) {
    return h.animeSlug === animeSlug && Number(h.episode) === episode;
  });

  var nowIso = new Date().toISOString();
  var entry = {
    animeSlug: animeSlug,
    animeTitle: anime.title,
    cover: anime.cover,
    thumb: anime.cover,
    episode: episode,
    progress: 0,
    duration: 0,
    watchedAt: nowIso
  };

  if (existingIdx > -1) {
    historyList[existingIdx].watchedAt = nowIso;
    historyList[existingIdx].animeTitle = anime.title;
    historyList[existingIdx].cover = anime.cover;
    historyList[existingIdx].thumb = anime.cover;
  } else {
    historyList.unshift(entry);
    if (historyList.length > 100) historyList = historyList.slice(0, 100);
  }

  if (typeof saveHistory === "function") saveHistory();
}

/* ==================== AUTO SKIP INTRO ==================== */
function setupAutoSkipIntro(videoEl, animeSlug, episode) {
  if (!videoEl || videoEl.tagName !== "VIDEO") return;
  if (typeof getSetting !== "function") return;

  var autoSkip = getSetting("autoSkipIntro");
  if (!autoSkip) return;

  var intro = getIntroData(animeSlug, episode);
  showToast("Auto skip intro: " + intro.start + "s");

  var hasSkipped = false;
  var skipHandler = function() {
    var currentTime = videoEl.currentTime;
    if (!hasSkipped && currentTime >= intro.start && currentTime < intro.end) {
      videoEl.currentTime = intro.end;
      hasSkipped = true;
      showToast("Intro di-skip");
    }
  };
  videoEl.addEventListener("timeupdate", skipHandler);
  videoEl.__skipHandler = skipHandler;
}

function removeAutoSkipIntro(videoEl) {
  if (!videoEl) return;
  if (videoEl.__skipHandler) {
    videoEl.removeEventListener("timeupdate", videoEl.__skipHandler);
    delete videoEl.__skipHandler;
  }
}

/* ==================== SIMPAN PROGRESS (per akun) ==================== */
async function saveWatchProgressToFirestore(animeSlug, episode, currentTime, duration) {
  if (!currentUser || !currentUserProfile) return;
  if (!firebaseReady) return;
  if (!animeSlug || !episode) return;
  if (currentTime < 3) return;

  try {
    var docId = getProgressDocId(animeSlug, episode);
    if (!docId) return;

    var progressData = {
      uid: currentUser.uid,
      userProfileId: currentUserProfile.userId || "",
      animeSlug: String(animeSlug),
      episode: Number(episode),
      currentTime: Math.floor(currentTime),
      duration: Math.floor(duration || 0),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await db.collection(COLLECTIONS.WATCH_PROGRESS).doc(docId).set(progressData, { merge: true });
  } catch (e) {
    console.warn("Gagal simpan progress ke Firestore:", e);
  }
}

function saveWatchProgressLocal(animeSlug, episode, currentTime, duration) {
  if (!animeSlug || !episode) return;

  var key = getProgressLocalKey(animeSlug, episode);
  window.__watchProgress = window.__watchProgress || {};
  window.__watchProgress[key] = {
    time: Math.floor(currentTime),
    duration: Math.floor(duration || 0),
    updatedAt: Date.now()
  };
  if (typeof saveWatchProgress === "function") saveWatchProgress();

  // Update history entry juga
  var historyIdx = historyList.findIndex(function(h) {
    return h.animeSlug === animeSlug && Number(h.episode) === Number(episode);
  });
  if (historyIdx > -1) {
    historyList[historyIdx].progress = Math.floor(currentTime);
    historyList[historyIdx].duration = Math.floor(duration || 0);
    historyList[historyIdx].watchedAt = new Date().toISOString();
    if (typeof saveHistory === "function") saveHistory();
  }
}

/* ==================== AMBIL PROGRESS ==================== */
function getWatchProgressLocal(animeSlug, episode) {
  var key = getProgressLocalKey(animeSlug, episode);
  var data = (window.__watchProgress || {})[key];
  if (!data) return 0;
  if (typeof data === "object" && data.time !== undefined) return data.time;
  return Number(data) || 0;
}

async function getWatchProgressFromFirestore(animeSlug, episode) {
  if (!currentUser || !firebaseReady) return 0;
  if (!animeSlug || !episode) return 0;

  try {
    var docId = getProgressDocId(animeSlug, episode);
    if (!docId) return 0;
    var doc = await db.collection(COLLECTIONS.WATCH_PROGRESS).doc(docId).get();
    if (!doc.exists) return 0;
    return doc.data().currentTime || 0;
  } catch (e) {
    console.warn("Gagal ambil progress dari Firestore:", e);
    return 0;
  }
}

async function getWatchProgress(animeSlug, episode) {
  var localTime = getWatchProgressLocal(animeSlug, episode);
  var firestoreTime = await getWatchProgressFromFirestore(animeSlug, episode);
  return Math.max(localTime, firestoreTime);
}

/* ==================== AUTO NEXT EPISODE ==================== */
function setupAutoNextEpisode(videoEl, animeSlug, episode, hasNextEpisode) {
  if (!videoEl || videoEl.tagName !== "VIDEO") return;
  if (!hasNextEpisode) return;
  if (typeof getSetting !== "function") return;

  var autoNext = getSetting("autoNextEpisode");
  if (!autoNext) return;

  var nextHandler = function() {
    var nextEp = Number(episode) + 1;
    showAutoNextCountdown(nextEp);
  };
  videoEl.addEventListener("ended", nextHandler);
  videoEl.__nextHandler = nextHandler;
}

function showAutoNextCountdown(nextEpisode) {
  removeAutoNextCountdown();
  var countdown = AUTO_NEXT_COUNTDOWN;

  var overlay = document.createElement("div");
  overlay.id = "auto-next-overlay";
  overlay.className = "auto-next-overlay";
  overlay.innerHTML =
    '<div class="auto-next-card">' +
    '<div class="auto-next-text">Lanjut ke Episode ' + nextEpisode + ' dalam <span class="auto-next-count" id="auto-next-count">' + countdown + '</span> detik</div>' +
    '<div class="auto-next-actions">' +
    '<button class="auto-next-btn auto-next-btn-cancel" onclick="cancelAutoNext()">Batal</button>' +
    '<button class="auto-next-btn auto-next-btn-go" onclick="goToNextEpisode(' + nextEpisode + ')">Lanjut Sekarang</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  autoNextCountdownInterval = setInterval(function() {
    countdown--;
    var countEl = document.getElementById("auto-next-count");
    if (countEl) countEl.textContent = countdown;
    if (countdown <= 0) {
      clearInterval(autoNextCountdownInterval);
      autoNextCountdownInterval = null;
      goToNextEpisode(nextEpisode);
    }
  }, 1000);
}

function removeAutoNextCountdown() {
  var overlay = document.getElementById("auto-next-overlay");
  if (overlay) overlay.remove();
  if (autoNextCountdownInterval) {
    clearInterval(autoNextCountdownInterval);
    autoNextCountdownInterval = null;
  }
}

function cancelAutoNext() {
  removeAutoNextCountdown();
  showToast("Auto next dibatalkan");
}

function goToNextEpisode(nextEpisode) {
  removeAutoNextCountdown();
  if (typeof changeEpisode === "function") changeEpisode(nextEpisode);
}

/* ==================== BIND EVENT KELUAR APP ==================== */
/* Simpan progress pas:
   - Tab hidden (user pindah app)
   - beforeunload (user close tab)
   - pagehide (mobile Safari)
   - blur (user switch window) */
function bindProgressOnExit() {
  if (progressListenersBound) return;
  progressListenersBound = true;

  var saveNow = function() {
    var v = document.getElementById("video-player");
    if (!v || v.tagName !== "VIDEO") return;
    if (!currentAnimeSlug || !currentEpisode) return;
    if (!v.duration || v.currentTime < 3) return;

    var time = v.currentTime;
    var duration = v.duration || 0;

    // Save local dulu (instant)
    saveWatchProgressLocal(currentAnimeSlug, currentEpisode, time, duration);

    // Save ke Firestore (async, fire and forget)
    saveWatchProgressToFirestore(currentAnimeSlug, currentEpisode, time, duration).catch(function() {});
  };

  document.addEventListener("visibilitychange", function() {
    if (document.visibilityState === "hidden") saveNow();
  });

  window.addEventListener("beforeunload", saveNow);
  window.addEventListener("pagehide", saveNow);
  window.addEventListener("blur", saveNow);
}

/* ==================== SETUP WATCH PLAYER ==================== */
function setupWatchPlayer(videoEl, animeSlug, episode, hasNextEpisode) {
  if (!videoEl) return;
  if (videoEl.tagName !== "VIDEO") return;

  addToHistory(animeSlug, episode);
  setupAutoSkipIntro(videoEl, animeSlug, episode);
  setupAutoNextEpisode(videoEl, animeSlug, episode, hasNextEpisode);
  setupProgressAutoSave(videoEl, animeSlug, episode);
  bindProgressOnExit();

  if (typeof getSetting === "function" && getSetting("autoPlay")) {
    videoEl.play().catch(function() {});
  }
}

/* ==================== AUTO SAVE PROGRESS ==================== */
function setupProgressAutoSave(videoEl, animeSlug, episode) {
  if (progressSaveInterval) {
    clearInterval(progressSaveInterval);
    progressSaveInterval = null;
  }

  progressSaveInterval = setInterval(function() {
    if (!videoEl || videoEl.paused || videoEl.ended) return;
    if (videoEl.currentTime < 3) return;

    var currentTime = videoEl.currentTime;
    var duration = videoEl.duration || 0;

    saveWatchProgressLocal(animeSlug, episode, currentTime, duration);
    saveWatchProgressToFirestore(animeSlug, episode, currentTime, duration);
  }, WATCH_PROGRESS_SAVE_INTERVAL);
}

/* ==================== CLEANUP ==================== */
function cleanupWatchPlayer(videoEl) {
  if (videoEl) {
    removeAutoSkipIntro(videoEl);
    if (videoEl.__nextHandler) {
      videoEl.removeEventListener("ended", videoEl.__nextHandler);
      delete videoEl.__nextHandler;
    }
  }
  if (progressSaveInterval) {
    clearInterval(progressSaveInterval);
    progressSaveInterval = null;
  }
  removeAutoNextCountdown();
}

console.log("Watch system loaded");