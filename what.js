/* ==================== WATCH SYSTEM ==================== */
/* Auto skip intro (tombol only, no auto skip), simpan progress per akun, auto next episode, history */

const INTRO_DEFAULT = { start: 30, end: 180 };
const WATCH_PROGRESS_SAVE_INTERVAL = 5000;
const AUTO_NEXT_COUNTDOWN = 5;
const MIN_PLAY_TIME = 20;

let progressSaveInterval = null;
let autoNextCountdownInterval = null;
let progressListenersBound = false;

/* ==================== INTRO DATA ==================== */
function getIntroData(animeSlug, episode) {
  if (typeof animeList !== "undefined" && Array.isArray(animeList)) {
    var anime = animeList.find(function(a) { return a.slug === animeSlug; });
    if (anime && anime.intro && anime.intro.start && anime.intro.end) {
      return anime.intro;
    }
  }
  if (window.__introData && window.__introData[animeSlug]) {
    var data = window.__introData[animeSlug];
    if (data[episode]) return data[episode];
    if (data.default) return data.default;
  }
  return INTRO_DEFAULT;
}

/* ==================== KEY PROGRESS ==================== */
function getProgressDocId(animeSlug, episode) {
  if (!currentUser) return null;
  return currentUser.uid + "_" + animeSlug + "_ep" + Number(episode);
}

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

/* ==================== AUTO SKIP INTRO (Tombol Only) ==================== */
function setupAutoSkipIntro(videoEl, animeSlug, episode) {
  if (!videoEl || videoEl.tagName !== "VIDEO") return;
  if (typeof getSetting !== "function") return;

  var autoSkip = getSetting("autoSkipIntro");
  if (!autoSkip) return;

  var intro = getIntroData(animeSlug, episode);
  var skipWindowStart = intro.start;
  var skipWindowEnd = intro.end;

  var hasSkipped = false;
  var buttonShown = false;

  var skipHandler = function() {
    var currentTime = videoEl.currentTime;

    if (currentTime < MIN_PLAY_TIME) return;
    if (hasSkipped) return;

    // Udah lewat window intro → hapus tombol
    if (currentTime >= skipWindowEnd) {
      hasSkipped = true;
      hideSkipIntroButton();
      return;
    }

    // Di dalam window intro → tampilkan tombol sekali
    if (currentTime >= skipWindowStart && currentTime < skipWindowEnd) {
      if (!buttonShown) {
        showSkipIntroButton(videoEl, skipWindowEnd);
        buttonShown = true;
      }
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
  hideSkipIntroButton();
}

/* ==================== TOMBOL SKIP INTRO ==================== */
function showSkipIntroButton(videoEl, skipToTime) {
  var wrapper = document.getElementById("watch-player-wrapper");
  if (!wrapper) return;

  var oldBtn = document.getElementById("skip-intro-btn");
  if (oldBtn) oldBtn.remove();

  var btn = document.createElement("button");
  btn.id = "skip-intro-btn";
  btn.className = "skip-intro-btn";
  btn.innerHTML = '⏭️ Skip Intro';
  btn.onclick = function(e) {
    e.stopPropagation();
    videoEl.currentTime = skipToTime;
    btn.remove();
    if (typeof showToast === "function") showToast("Intro di-skip ⏩");
  };

  wrapper.appendChild(btn);

  // Auto-hide setelah 10 detik kalau gak diklik
  setTimeout(function() {
    if (btn && btn.parentNode) {
      btn.style.opacity = "0";
      setTimeout(function() { if (btn.parentNode) btn.remove(); }, 300);
    }
  }, 10000);
}

function hideSkipIntroButton() {
  var btn = document.getElementById("skip-intro-btn");
  if (btn) {
    btn.style.opacity = "0";
    setTimeout(function() { if (btn.parentNode) btn.remove(); }, 300);
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

    saveWatchProgressLocal(currentAnimeSlug, currentEpisode, time, duration);
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