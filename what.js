/* ==================== WATCH SYSTEM ==================== */
/* Auto skip intro, simpan progress, auto next episode */

/* ==================== CONSTANTS ==================== */
const INTRO_DEFAULT = {
  start: 10,
  end: 90
};

const WATCH_PROGRESS_SAVE_INTERVAL = 5000;
const AUTO_NEXT_COUNTDOWN = 5;

let progressSaveInterval = null;
let autoNextCountdownInterval = null;

/* ==================== INTRO DATA ==================== */
function getIntroData(animeSlug, episode) {
  if (window.__introData && window.__introData[animeSlug]) {
    const data = window.__introData[animeSlug];
    if (data[episode]) return data[episode];
    if (data.default) return data.default;
  }
  return INTRO_DEFAULT;
}

/* ==================== AUTO SKIP INTRO ==================== */
function setupAutoSkipIntro(videoEl, animeSlug, episode) {
  if (!videoEl || videoEl.tagName !== "VIDEO") return;
  if (typeof getSetting !== "function") return;
  
  const autoSkip = getSetting("autoSkipIntro");
  if (!autoSkip) {
    console.log("Auto skip intro OFF");
    return;
  }
  
  const intro = getIntroData(animeSlug, episode);
  console.log("Auto skip intro aktif: " + intro.start + "s - " + intro.end + "s");
  
  showToast("Auto skip intro: " + intro.start + "s");
  
  let hasSkipped = false;
  
  const skipHandler = () => {
    const currentTime = videoEl.currentTime;
    
    if (!hasSkipped && currentTime >= intro.start && currentTime < intro.end) {
      videoEl.currentTime = intro.end;
      hasSkipped = true;
      showToast("Intro di-skip");
      console.log("Intro skipped ke " + intro.end);
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

/* ==================== SIMPAN PROGRESS ==================== */
async function saveWatchProgressToFirestore(animeSlug, episode, currentTime, duration) {
  if (!currentUser || !currentUserProfile) return;
  if (!firebaseReady) return;
  if (!animeSlug || !episode) return;
  
  try {
    const docId = currentUser.uid + "_" + animeSlug + "_ep" + episode;
    const progressData = {
      uid: currentUser.uid,
      animeSlug: animeSlug,
      episode: Number(episode),
      currentTime: Math.floor(currentTime),
      duration: Math.floor(duration),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection("watch_progress").doc(docId).set(progressData, { merge: true });
  } catch (e) {
    console.warn("Gagal simpan progress ke Firestore:", e);
  }
}

function saveWatchProgressLocal(animeSlug, episode, currentTime, duration) {
  if (!animeSlug || !episode) return;
  const key = animeSlug + "-ep" + episode;
  window.__watchProgress = window.__watchProgress || {};
  window.__watchProgress[key] = {
    time: Math.floor(currentTime),
    duration: Math.floor(duration),
    updatedAt: Date.now()
  };
  if (typeof saveWatchProgress === "function") saveWatchProgress();
}

function getWatchProgressLocal(animeSlug, episode) {
  const key = animeSlug + "-ep" + episode;
  const data = (window.__watchProgress || {})[key];
  if (!data) return 0;
  if (typeof data === "object" && data.time !== undefined) return data.time;
  return Number(data) || 0;
}

async function getWatchProgressFromFirestore(animeSlug, episode) {
  if (!currentUser || !firebaseReady) return 0;
  if (!animeSlug || !episode) return 0;
  
  try {
    const docId = currentUser.uid + "_" + animeSlug + "_ep" + episode;
    const doc = await db.collection("watch_progress").doc(docId).get();
    if (!doc.exists) return 0;
    return doc.data().currentTime || 0;
  } catch (e) {
    console.warn("Gagal ambil progress dari Firestore:", e);
    return 0;
  }
}

async function getWatchProgress(animeSlug, episode) {
  const localTime = getWatchProgressLocal(animeSlug, episode);
  const firestoreTime = await getWatchProgressFromFirestore(animeSlug, episode);
  return Math.max(localTime, firestoreTime);
}

/* ==================== AUTO NEXT EPISODE ==================== */
function setupAutoNextEpisode(videoEl, animeSlug, episode, hasNextEpisode) {
  if (!videoEl || videoEl.tagName !== "VIDEO") return;
  if (!hasNextEpisode) return;
  if (typeof getSetting !== "function") return;
  
  const autoNext = getSetting("autoNextEpisode");
  if (!autoNext) {
    console.log("Auto next episode OFF");
    return;
  }
  
  const nextHandler = () => {
    const nextEp = Number(episode) + 1;
    console.log("Video habis, countdown ke episode " + nextEp);
    showAutoNextCountdown(nextEp);
  };
  
  videoEl.addEventListener("ended", nextHandler);
  videoEl.__nextHandler = nextHandler;
}

function showAutoNextCountdown(nextEpisode) {
  removeAutoNextCountdown();
  
  let countdown = AUTO_NEXT_COUNTDOWN;
  
  const overlay = document.createElement("div");
  overlay.id = "auto-next-overlay";
  overlay.className = "auto-next-overlay";
  overlay.innerHTML = `
    <div class="auto-next-card">
      <div class="auto-next-text">
        Lanjut ke Episode ${nextEpisode} dalam
        <span class="auto-next-count" id="auto-next-count">${countdown}</span>
        detik
      </div>
      <div class="auto-next-actions">
        <button class="auto-next-btn auto-next-btn-cancel" onclick="cancelAutoNext()">
          Batal
        </button>
        <button class="auto-next-btn auto-next-btn-go" onclick="goToNextEpisode(${nextEpisode})">
          Lanjut Sekarang
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  
  autoNextCountdownInterval = setInterval(() => {
    countdown--;
    const countEl = document.getElementById("auto-next-count");
    if (countEl) countEl.textContent = countdown;
    
    if (countdown <= 0) {
      clearInterval(autoNextCountdownInterval);
      autoNextCountdownInterval = null;
      goToNextEpisode(nextEpisode);
    }
  }, 1000);
}

function removeAutoNextCountdown() {
  const overlay = document.getElementById("auto-next-overlay");
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
  if (typeof changeEpisode === "function") {
    changeEpisode(nextEpisode);
  }
}

/* ==================== SETUP WATCH PLAYER ==================== */
function setupWatchPlayer(videoEl, animeSlug, episode, hasNextEpisode) {
  if (!videoEl) return;
  if (videoEl.tagName !== "VIDEO") return;
  
  setupAutoSkipIntro(videoEl, animeSlug, episode);
  setupAutoNextEpisode(videoEl, animeSlug, episode, hasNextEpisode);
  setupProgressAutoSave(videoEl, animeSlug, episode);
  
  if (typeof getSetting === "function" && getSetting("autoPlay")) {
    videoEl.play().catch(() => {});
  }
}

/* ==================== AUTO SAVE PROGRESS ==================== */
function setupProgressAutoSave(videoEl, animeSlug, episode) {
  if (progressSaveInterval) {
    clearInterval(progressSaveInterval);
    progressSaveInterval = null;
  }
  
  progressSaveInterval = setInterval(() => {
    if (!videoEl || videoEl.paused || videoEl.ended) return;
    if (videoEl.currentTime < 3) return;
    
    const currentTime = videoEl.currentTime;
    const duration = videoEl.duration || 0;
    
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