/* ==================== VIDEO CONTROLS (AniPlay Style) ==================== */

const VC_ICONS = {
  prev: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>`,
  next: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/></svg>`,
  rewind10: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><polyline points="3 3 3 8 8 8"/><text x="12" y="16" text-anchor="middle" font-size="8" font-weight="700" fill="currentColor" stroke="none">10</text></svg>`,
  forward10: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><polyline points="21 3 21 8 16 8"/><text x="12" y="16" text-anchor="middle" font-size="8" font-weight="700" fill="currentColor" stroke="none">10</text></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`,
  fullscreen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`,
  fullscreenExit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>`
};

let vcHideTimer = null;
let vcControlsBound = false;

/* ==================== RESOLUSI CONFIG ==================== */
var QUALITY_OPTIONS = [
  { value: "360p", label: "360p", desc: "Hemat data", key: "videoUrl360", res: 360 },
  { value: "480p", label: "480p", desc: "Standar", key: "videoUrl480", res: 480 },
  { value: "720p", label: "720p", desc: "HD", key: "videoUrl720", res: 720 },
  { value: "1080p", label: "1080p", desc: "Full HD", key: "videoUrl1080", res: 1080 }
];

/* ==================== RENDER ==================== */
function renderVideoControls() {
  const container = document.getElementById("custom-video-controls");
  if (!container) return;

  var qualityLabel = window.__currentQuality || "Auto";
  if (qualityLabel === "legacy") qualityLabel = "Default";

  container.innerHTML = `
    <!-- Top bar: cuma fullscreen di kanan -->
    <div class="vc-top">
      <div class="vc-top-right">
        <button class="vc-top-btn vc-top-btn-icon" id="vc-fullscreen" aria-label="Fullscreen">
          ${VC_ICONS.fullscreen}
        </button>
      </div>
    </div>

    <!-- Baris tengah: prev, rewind, play, forward, next -->
    <div class="vc-center">
      <button class="vc-icon-btn" id="vc-prev" aria-label="Episode sebelumnya">${VC_ICONS.prev}</button>
      <button class="vc-icon-btn" id="vc-rewind" aria-label="Mundur 10 detik">${VC_ICONS.rewind10}</button>
      <button class="vc-play-btn" id="vc-play" aria-label="Play">${VC_ICONS.play}</button>
      <button class="vc-icon-btn" id="vc-forward" aria-label="Maju 10 detik">${VC_ICONS.forward10}</button>
      <button class="vc-icon-btn" id="vc-next" aria-label="Episode berikutnya">${VC_ICONS.next}</button>
    </div>

    <!-- Baris bawah: time + quality + speed -->
    <div class="vc-bottom-info">
      <div class="vc-time-info">
        <span id="vc-time-current">00:00</span>
        <span class="vc-time-sep">/</span>
        <span id="vc-time-total">00:00</span>
      </div>
      <div class="vc-options">
        <button class="vc-option-btn" id="vc-quality">${qualityLabel}</button>
        <button class="vc-option-btn" id="vc-speed">1x</button>
      </div>
    </div>

    <!-- Progress bar paling bawah -->
    <div class="vc-progress-bar" id="vc-progress-bar">
      <div class="vc-progress-fill" id="vc-progress-fill"></div>
      <div class="vc-progress-thumb" id="vc-progress-thumb"></div>
    </div>
  `;

  vcControlsBound = false;
  setupAutoHideControls();
  attachVideoControlsEvents();
}

/* ==================== AUTO HIDE / SHOW (anti kedip) ==================== */
function setupAutoHideControls() {
  const wrapper = document.getElementById("watch-player-wrapper");
  const overlay = document.getElementById("custom-video-controls");
  const video = document.getElementById("video-player");
  if (!wrapper || !overlay || !video) return;

  let hideTimer = null;
  let lastToggle = 0;

  const show = () => {
    overlay.classList.add("show");
    clearTimeout(hideTimer);
    if (!video.paused && !video.ended) {
      hideTimer = setTimeout(() => {
        if (!video.paused && !video.ended) {
          overlay.classList.remove("show");
        }
      }, 4000);
    }
  };

  const hide = () => {
    if (!video.paused && !video.ended) {
      overlay.classList.remove("show");
    }
  };

  wrapper.addEventListener("click", (e) => {
    if (e.target.closest(".vc-btn") ||
        e.target.closest(".vc-play-btn") ||
        e.target.closest(".vc-icon-btn") ||
        e.target.closest(".vc-top-btn") ||
        e.target.closest(".vc-option-btn") ||
        e.target.closest(".vc-progress-bar")) return;

    const now = Date.now();
    if (now - lastToggle < 500) return;
    lastToggle = now;

    if (overlay.classList.contains("show")) hide();
    else show();
  });

  video.addEventListener("play", show);
  video.addEventListener("playing", show);

  video.addEventListener("pause", () => {
    clearTimeout(hideTimer);
    overlay.classList.add("show");
  });
  video.addEventListener("ended", () => {
    clearTimeout(hideTimer);
    overlay.classList.add("show");
  });

  overlay.classList.add("show");
  if (!video.paused && !video.ended) {
    hideTimer = setTimeout(() => {
      if (!video.paused) overlay.classList.remove("show");
    }, 4000);
  }
}

/* ==================== EVENTS ==================== */
function attachVideoControlsEvents() {
  const v = document.getElementById("video-player");
  if (!v || v.tagName !== "VIDEO") return;
  if (vcControlsBound) return;
  vcControlsBound = true;

  const stop = (e) => e.stopPropagation();

  const playBtn = document.getElementById("vc-play");
  if (playBtn) playBtn.onclick = (e) => { stop(e); v.paused ? v.play().catch(()=>{}) : v.pause(); };

  const rewindBtn = document.getElementById("vc-rewind");
  if (rewindBtn) rewindBtn.onclick = (e) => { stop(e); v.currentTime = Math.max(0, v.currentTime - 10); showMiniToast("-10s"); };

  const forwardBtn = document.getElementById("vc-forward");
  if (forwardBtn) forwardBtn.onclick = (e) => { stop(e); v.currentTime = Math.min(v.duration || 0, v.currentTime + 10); showMiniToast("+10s"); };

  const prevBtn = document.getElementById("vc-prev");
  if (prevBtn) prevBtn.onclick = (e) => {
    stop(e);
    const prevEp = Number(window.currentEpisode || 1) - 1;
    if (prevEp >= 1 && typeof changeEpisode === "function") changeEpisode(prevEp);
    else showToast("Ini episode pertama");
  };

  const nextBtn = document.getElementById("vc-next");
  if (nextBtn) nextBtn.onclick = (e) => {
    stop(e);
    const nextEp = Number(window.currentEpisode || 1) + 1;
    if (typeof changeEpisode === "function") changeEpisode(nextEp);
  };

  const qualityBtn = document.getElementById("vc-quality");
  if (qualityBtn) qualityBtn.onclick = (e) => { stop(e); openQualityModal(v); };

  const speedBtn = document.getElementById("vc-speed");
  if (speedBtn) speedBtn.onclick = (e) => { stop(e); openSpeedModal(v); };

  const fsBtn = document.getElementById("vc-fullscreen");
  if (fsBtn) {
    fsBtn.onclick = (e) => {
      stop(e);
      if (typeof toggleFakeFullscreen === "function") toggleFakeFullscreen();
    };
  }

  const progressBar = document.getElementById("vc-progress-bar");
  if (progressBar) {
    progressBar.onclick = (e) => {
      e.stopPropagation();
      const rect = progressBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percent = clickX / rect.width;
      if (v.duration) v.currentTime = percent * v.duration;
    };
  }

  attachProgressDrag(v, progressBar);

  v.addEventListener("timeupdate", updateVideoProgress);
  v.addEventListener("loadedmetadata", updateVideoDuration);

  v.addEventListener("play", () => {
    const btn = document.getElementById("vc-play");
    if (btn) btn.innerHTML = VC_ICONS.pause;
  });
  v.addEventListener("pause", () => {
    const btn = document.getElementById("vc-play");
    if (btn) btn.innerHTML = VC_ICONS.play;
  });
  v.addEventListener("ended", () => {
    const btn = document.getElementById("vc-play");
    if (btn) btn.innerHTML = VC_ICONS.play;
  });

  document.addEventListener("fullscreenchange", updateFullscreenIcon);
  document.addEventListener("webkitfullscreenchange", updateFullscreenIcon);
}

/* ==================== FULLSCREEN ICON ==================== */
function updateFullscreenIcon() {
  const doc = document;
  const isFs = doc.fullscreenElement || doc.webkitFullscreenElement;
  const btn = document.getElementById("vc-fullscreen");
  if (btn) btn.innerHTML = isFs ? VC_ICONS.fullscreenExit : VC_ICONS.fullscreen;
}

/* ==================== MINI TOAST ==================== */
function showMiniToast(text) {
  const existing = document.getElementById("vc-mini-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "vc-mini-toast";
  toast.className = "vc-mini-toast";
  toast.textContent = text;

  const wrapper = document.getElementById("watch-player-wrapper");
  if (wrapper) {
    wrapper.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 800);
  }
}

/* ==================== UPDATE PROGRESS ==================== */
function updateVideoProgress() {
  const v = document.getElementById("video-player");
  if (!v || !v.duration) return;

  const percent = (v.currentTime / v.duration) * 100;
  const fill = document.getElementById("vc-progress-fill");
  const thumb = document.getElementById("vc-progress-thumb");
  const curTime = document.getElementById("vc-time-current");

  if (fill) fill.style.width = percent + "%";
  if (thumb) thumb.style.left = percent + "%";
  if (curTime) curTime.textContent = formatTimeLong(v.currentTime);
}

function updateVideoDuration() {
  const v = document.getElementById("video-player");
  if (!v) return;
  const total = document.getElementById("vc-time-total");
  if (total && v.duration) total.textContent = formatTimeLong(v.duration);
}

function formatTimeLong(sec) {
  sec = Math.floor(Number(sec) || 0);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m.toString().padStart(2, "0") + ":" + s.toString().padStart(2, "0");
}

/* ==================== DRAG PROGRESS ==================== */
function attachProgressDrag(v, progressBar) {
  if (!progressBar) return;

  let isDragging = false;

  const getPercent = (clientX) => {
    const rect = progressBar.getBoundingClientRect();
    let percent = (clientX - rect.left) / rect.width;
    if (percent < 0) percent = 0;
    if (percent > 1) percent = 1;
    return percent;
  };

  const updateUI = (percent) => {
    const fill = document.getElementById("vc-progress-fill");
    const thumb = document.getElementById("vc-progress-thumb");
    const curTime = document.getElementById("vc-time-current");
    if (fill) fill.style.width = (percent * 100) + "%";
    if (thumb) thumb.style.left = (percent * 100) + "%";
    if (curTime && v.duration) curTime.textContent = formatTimeLong(percent * v.duration);
  };

  const onStart = (e) => {
    e.stopPropagation();
    isDragging = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    updateUI(getPercent(clientX));
  };

  const onMove = (e) => {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    updateUI(getPercent(clientX));
  };

  const onEnd = (e) => {
    if (!isDragging) return;
    isDragging = false;
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const percent = getPercent(clientX);
    if (v.duration) v.currentTime = percent * v.duration;
  };

  progressBar.addEventListener("mousedown", onStart);
  progressBar.addEventListener("touchstart", onStart, { passive: true });
  document.addEventListener("mousemove", onMove);
  document.addEventListener("touchmove", onMove, { passive: true });
  document.addEventListener("mouseup", onEnd);
  document.addEventListener("touchend", onEnd);
}

/* ==================== SPEED MODAL ==================== */
function openSpeedModal(v) {
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const current = v.playbackRate || 1;

  document.getElementById("modal-title").textContent = "Kecepatan";
  document.getElementById("modal-body").innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${speeds.map(s => `
        <button class="settings-modal-option ${s === current ? "selected" : ""}" onclick="selectSpeed(${s})">
          <div style="flex:1;text-align:left;">
            <div class="settings-modal-option-title">${s}x</div>
          </div>
        </button>
      `).join("")}
    </div>
  `;
  openModal();
}

function selectSpeed(speed) {
  const v = document.getElementById("video-player");
  if (!v) return;
  v.playbackRate = Number(speed);
  const speedBtn = document.getElementById("vc-speed");
  if (speedBtn) speedBtn.textContent = speed + "x";
  closeModal();
  if (navigator.vibrate) navigator.vibrate(20);
}

/* ==================== QUALITY MODAL (REAL SWITCH) ==================== */
// Cache data episode yang aktif (biar gak fetch ulang tiap ganti res)
window.__currentEpisodeData = window.__currentEpisodeData || null;

async function openQualityModal(v) {
  if (!currentAnimeSlug || !currentEpisode) {
    showToast("Episode belum ke-load");
    return;
  }

  showLoadingToast("Cek resolusi...");

  // Ambil data episode (pakai cache kalau ada)
  var epData = window.__currentEpisodeData;
  if (!epData || Number(epData.id) !== Number(currentEpisode)) {
    try {
      epData = await fbGetOneSub("anime", currentAnimeSlug, "episode", String(currentEpisode));
      window.__currentEpisodeData = epData;
    } catch (e) {
      console.error(e);
      hideLoading();
      showToast("Gagal cek resolusi");
      return;
    }
  }
  hideLoading();

  if (!epData) {
    showToast("Data episode gak ada");
    return;
  }

  // Cek res mana aja yang tersedia
  var available = [];
  QUALITY_OPTIONS.forEach(function(q) {
    if (epData[q.key] && epData[q.key].length > 5) {
      available.push(q);
    }
  });

  // Fallback: kalau ada videoUrl legacy
  if (available.length === 0 && epData.videoUrl) {
    available.push({ value: "legacy", label: "Default", desc: "Sumber asli", key: "videoUrl", res: 0 });
  }

  if (available.length === 0) {
    showToast("Belum ada sumber video untuk episode ini");
    return;
  }

  // Res aktif sekarang
  var currentQuality = window.__currentQuality || null;
  if (!currentQuality) {
    var currentSrc = v ? (v.src || v.currentSrc) : "";
    for (var i = 0; i < available.length; i++) {
      if (currentSrc && currentSrc.indexOf(available[i].key) > -1) {
        currentQuality = available[i].value;
        break;
      }
    }
  }
  if (!currentQuality) currentQuality = available[available.length - 1].value;

  // Bangun UI
  var bodyHTML = '<div style="display:flex;flex-direction:column;gap:8px;">';
  available.forEach(function(q) {
    var isSelected = q.value === currentQuality;
    var url = epData[q.key];
    var sizeInfo = "";

    if (url) {
      var ext = url.split(".").pop().split("?")[0].toUpperCase();
      if (ext.length > 5) ext = "";
      sizeInfo = ext ? " • ." + ext : "";
    }

    bodyHTML += '<button class="settings-modal-option ' + (isSelected ? "selected" : "") + '" onclick="selectQuality(\'' + q.value + '\')">' +
      '<div style="flex:1;text-align:left;">' +
      '<div class="settings-modal-option-title">' + q.label + ' ' + (isSelected ? '<span style="color:var(--accent-2);font-size:10px;">(AKTIF)</span>' : "") + '</div>' +
      '<div class="settings-modal-option-desc">' + q.desc + sizeInfo + '</div>' +
      '</div>' +
      (isSelected ? '<span class="settings-modal-check">' + SETTINGS_ICONS.check + '</span>' : '') +
      '</button>';
  });
  bodyHTML += '</div>';

  document.getElementById("modal-title").textContent = "Kualitas Video";
  document.getElementById("modal-body").innerHTML = bodyHTML;
  openModal();
}

async function selectQuality(qualityValue) {
  if (!currentAnimeSlug || !currentEpisode) {
    closeModal();
    return;
  }

  var v = document.getElementById("video-player");
  if (!v || v.tagName !== "VIDEO") {
    showToast("Ganti resolusi cuma buat video langsung");
    closeModal();
    return;
  }

  // Cari quality option (bisa legacy juga)
  var q = null;
  if (qualityValue === "legacy") {
    q = { value: "legacy", label: "Default", key: "videoUrl" };
  } else {
    q = QUALITY_OPTIONS.find(function(x) { return x.value === qualityValue; });
  }
  if (!q) {
    closeModal();
    return;
  }

  // Ambil data episode
  var epData = window.__currentEpisodeData;
  if (!epData) {
    try {
      epData = await fbGetOneSub("anime", currentAnimeSlug, "episode", String(currentEpisode));
      window.__currentEpisodeData = epData;
    } catch (e) { closeModal(); return; }
  }

  if (!epData || !epData[q.key]) {
    showToast("Resolusi " + q.label + " gak tersedia");
    closeModal();
    return;
  }

  var newUrl = epData[q.key];
  var oldTime = v.currentTime || 0;
  var wasPaused = v.paused;
  var oldQuality = window.__currentQuality;

  // Kalau sama, gak usah ganti
  if (oldQuality === qualityValue && v.src && v.src.indexOf(q.key) > -1) {
    closeModal();
    return;
  }

  closeModal();

  // Save current quality
  window.__currentQuality = qualityValue;

  // Update button label
  var qualityBtn = document.getElementById("vc-quality");
  if (qualityBtn) qualityBtn.textContent = q.label;

  // Tampilkan toast loading
  showMiniToast("Ganti ke " + q.label + "...");

  // Simpan state + pause
  v.pause();

  // Set src baru
  v.src = newUrl;
  v.load();

  // Restore time + play state
  var restoreHandler = function() {
    v.removeEventListener("loadedmetadata", restoreHandler);
    try {
      if (oldTime > 0 && oldTime < v.duration) {
        v.currentTime = oldTime;
      }
    } catch (e) {}

    if (!wasPaused) {
      v.play().catch(function() {});
    }
    showMiniToast(q.label + " aktif");
  };

  v.addEventListener("loadedmetadata", restoreHandler);

  // Fallback: kalau metadata gagal load dalam 8 detik
  setTimeout(function() {
    if (v.readyState === 0) {
      v.removeEventListener("loadedmetadata", restoreHandler);
      showToast("Gagal load resolusi " + q.label);
      // Balikin ke sumber lama
      if (oldQuality && oldQuality !== "legacy") {
        var oldQ = QUALITY_OPTIONS.find(function(x) { return x.value === oldQuality; });
        if (oldQ && epData[oldQ.key]) {
          v.src = epData[oldQ.key];
          v.load();
          window.__currentQuality = oldQuality;
          if (qualityBtn) qualityBtn.textContent = oldQ.label;
        }
      }
    }
  }, 8000);
}

/* ==================== AUTO-PICK BEST QUALITY ==================== */
// Dipanggil di renderWatch() buat nentuin resolusi default
function pickBestQualityForEpisode(epData) {
  if (!epData) return null;
  // Prioritas: 1080p → 720p → 480p → 360p → legacy
  if (epData.videoUrl1080 && epData.videoUrl1080.length > 5) return { value: "1080p", key: "videoUrl1080", url: epData.videoUrl1080 };
  if (epData.videoUrl720 && epData.videoUrl720.length > 5) return { value: "720p", key: "videoUrl720", url: epData.videoUrl720 };
  if (epData.videoUrl480 && epData.videoUrl480.length > 5) return { value: "480p", key: "videoUrl480", url: epData.videoUrl480 };
  if (epData.videoUrl360 && epData.videoUrl360.length > 5) return { value: "360p", key: "videoUrl360", url: epData.videoUrl360 };
  if (epData.videoUrl && epData.videoUrl.length > 5) return { value: "legacy", key: "videoUrl", url: epData.videoUrl };
  return null;
}

/* ==================== CLEANUP ==================== */
function cleanupVideoControls() {
  clearTimeout(vcHideTimer);
  vcControlsBound = false;
}

console.log("Video controls loaded");