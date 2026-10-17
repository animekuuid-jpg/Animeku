/* ==================== MIKO ANIME APP.JS ==================== */

/* ==================== AUTO SLIDE ==================== */
function startAutoSlide() {
  stopAutoSlide();
  autoSlideTimer = setInterval(function() {
    if (typeof nextTopSlide === "function") nextTopSlide();
  }, 5000);
}
function stopAutoSlide() {
  if (autoSlideTimer) { clearInterval(autoSlideTimer); autoSlideTimer = null; }
}

/* ==================== URL ROUTING ==================== */
function handleUrlRouting() {
  var path = window.location.pathname;
  var parts = path.split("/").filter(Boolean);
  if (parts[0] === "anime" && parts[1]) {
    currentAnimeSlug = decodeURIComponent(parts[1]);
    if (parts[2] && parts[2].startsWith("eps")) {
      currentEpisode = Number(parts[2].replace("eps", "")) || 1;
      watchOpen = true;
      currentTab = "detail";
    } else {
      currentTab = "detail";
    }
    return true;
  }
  if (parts[0] === "profil" && parts[1]) {
    currentPublicUser = getPublicUser(decodeURIComponent(parts[1]));
    currentTab = "public-profile";
    return true;
  }
  return false;
}

function updateUrl(slug, ep) {
  if (!slug) return;
  var newPath = ep ? "/anime/" + slug + "/eps" + ep : "/anime/" + slug;
  if (window.location.pathname !== newPath) {
    history.pushState({ slug: slug, ep: ep }, "", newPath);
  }
}

/* ==================== GLOBAL STATE ==================== */
let animeList = [];
let historyList = [];
let favoriteList = [];
let dummyComments = [];
let userProfile = {};
let notificationsList = [];
let diskusiList = [];
let topGiveawayData = [];
let topLevelData = [];
let topRankData = [];
let topClanData = [];
let premiumPlans = [];
let allUsers = [];
let clanList = [];

let pendingAvatarFile = null;
let pendingBannerFile = null;
let pendingBannerType = null;

let currentTab = "home";
let currentDay = getTodayName();
let currentProfileTab = "komentar";
let currentAnimeSlug = null;
let currentEpisode = 1;
let searchQuery = "";
let searchGenre = "";
let watchOpen = false;
let watchFromTab = "home";
let currentTopSlide = 0;
let autoSlideTimer = null;
let currentFavSort = "terbaru";
let currentPublicUser = null;
let currentPublicTab = "info";
let replyToComment = null;
let currentNotifTab = "semua";
let currentClanTab = "my";
let selectedClanLogo = "shield";
let selectedClanColor = "#a855f7";
let editClanOpen = true;
let commentOverlayInterval = null;
let commentOverlayActive = false;
let holdTimer = null;
let isFakeFullscreen = false;

/* ==================== HELPER ==================== */
function calculateJoinDays(u) {
  if (!u) return 0;
  if (u.createdAt) {
    var d = new Date(u.createdAt);
    if (!isNaN(d.getTime())) return Math.max(1, Math.floor((Date.now() - d.getTime()) / 86400000));
  }
  if (u.joinedAt) {
    var d2 = new Date(u.joinedAt);
    if (!isNaN(d2.getTime())) return Math.max(1, Math.floor((Date.now() - d2.getTime()) / 86400000));
  }
  return Math.max(1, (Number(u.joinedMonths) || 0) * 30);
}
function formatJoinDays(days) { return days + "D"; }
function getClanColorForUser(u) {
  if (!u) return "";
  var clanName = u.clanName || "";
  if (!clanName) return "";
  var clanObj = clanList.find(function(c) { return c.id === u.clanId || c.name === clanName; });
  return clanObj ? clanObj.color : (typeof generateClanColor === "function" ? generateClanColor(clanName) : "#a855f7");
}

/* ==================== AVATAR RESOLVER ==================== */
/**
 * Ambil URL avatar dari berbagai kemungkinan nama field
 */
function resolveAvatar(u) {
  if (!u) return "";
  var url = u.avatar || u.photo || u.photoURL || u.foto || u.picture || u.image || u.profilePic || u.profileImage || "";
  if (Array.isArray(url)) url = url[0] || "";
  if (typeof url === "object" && url !== null) url = url.url || url.src || url.href || "";
  return String(url || "").trim();
}

/* ==================== NEW ANIME ==================== */
function getNewAnime() {
  return animeList.filter(function(a) { return a.isNew !== false; });
}

/* ==================== ANIME POPULER ==================== */
function getPopularAnime() {
  return animeList.slice().sort(function(a, b) {
    var scoreA = (Number(a.views) || 0) / 1000 + (Number(a.rating) || 0) * 100;
    var scoreB = (Number(b.views) || 0) / 1000 + (Number(b.rating) || 0) * 100;
    return scoreB - scoreA;
  });
}

/* ==================== LOAD ALL DATA ==================== */
async function loadAllData() {
  showLoading("Memuat data...");
  try {
    var results = await Promise.all([
      fbGetAll(COLLECTIONS.ANIME),
      fbGetAll(COLLECTIONS.TOP),
      fbGetAll(COLLECTIONS.NOTIFS),
      fbGetAll(COLLECTIONS.DISKUSI),
      fbGetAll(COLLECTIONS.PREMIUM),
      fbGetAll(COLLECTIONS.USERS),
      fbGetAll(COLLECTIONS.CLANS)
    ]);
    var animeDocs = results[0] || [];
    var topDocs = results[1] || [];
    var notifDocs = results[2] || [];
    var diskusiDocs = results[3] || [];
    var premiumDocs = results[4] || [];
    var userDocs = results[5] || [];
    var clanDocs = results[6] || [];

    animeList = (animeDocs || []).map(function(a) {
      return {
        id: a.id, slug: a.slug || a.id, title: a.title || a.judul || "-",
        cover: a.cover || a.sampul || "", banner: a.banner || a.spanduk || "",
        rating: a.rating || a.peringkat || 0, studio: a.studio || "",
        type: a.type || a.tipe || "TV", totalEpisodes: a.totalEpisodes || a.jumlah_episode || 0,
        views: a.views || a.pandangan || 0, year: a.year || a.tahun || 0,
        genres: a.genres || a.genre || [], synopsis: a.synopsis || a.sinopsis || "",
        status: a.status || "ongoing", updateDay: a.updateDay || a["hari update"] || "Senin",
        updateTime: a.updateTime || a["waktu update"] || "",
        completed: a.completed === true, isNew: a.isNew !== false,
        franchise: a.franchise || "",
        intro: a.intro || null
      };
    });

    // ⭐ FIX: Support berbagai nama field avatar
    allUsers = (userDocs || []).map(function(u) {
      var xp = Math.min(Math.max(u.xp || 0, 0), 999999999);
      var level = u.level || calculateLevel(xp);
      var rankObj = calculateRank(level);
      var avatarUrl = resolveAvatar(u);
      return {
        id: u.id, userId: u.userId || u["user id"] || "#?",
        username: u.username || u.nama || u.displayName || "-",
        avatar: avatarUrl,
        xp: xp, level: level, rank: u.rank || rankObj.name,
        rankColor: u.rankColor || rankObj.color,
        followers: Math.min(Math.max(u.followers || 0, 0), 99999999),
        watchMinutes: Math.min(Math.max(u.watchMinutes || 0, 0), 99999999),
        comments: Math.min(Math.max(u.comments || 0, 0), 99999999),
        historyCount: Math.min(Math.max(u.historyCount || 0, 0), 99999999),
        joinedMonths: Math.min(Math.max(u.joinedMonths || 1, 1), 999),
        createdAt: u.createdAt || u.created_at || u.joinedAt || "",
        badges: u.badges || u.lencana || [], isDefault: u.isDefault || false,
        bannerUrl: u.bannerUrl || "", bannerType: u.bannerType || "",
        clanId: u.clanId || "", clanName: u.clanName || "",
        isPremium: u.isPremium === true, isAdmin: u.isAdmin === true,
        verified: u.verified || ""
      };
    });

    clanList = (clanDocs || []).map(function(c) {
      return {
        id: c.id, name: c.name || "Tanpa Nama", tag: c.tag || "",
        description: c.description || "", logo: c.logo || "shield",
        color: c.color || generateClanColor(c.name || ""),
        leaderId: c.leaderId || "", leaderName: c.leaderName || "",
        members: c.members || [],
        maxMembers: Math.min(Math.max(c.maxMembers || 20, 2), 100),
        isOpen: c.isOpen !== false,
        createdAt: c.createdAt || new Date().toISOString()
      };
    });

    var sortedByJoin = allUsers.slice().sort(function(a, b) { return calculateJoinDays(b) - calculateJoinDays(a); });
    topGiveawayData = sortedByJoin.slice(0, 20).map(function(u, i) {
      var days = calculateJoinDays(u);
      return { rank: i + 1, name: u.username, avatar: u.avatar, tag: u.rank || "Member", score: formatJoinDays(days), userId: u.userId, username: u.username, isPremium: u.isPremium, verified: u.verified, clanName: u.clanName, clanId: u.clanId };
    });

    var sortedByLevel = allUsers.slice().sort(function(a, b) { return (b.level || 0) - (a.level || 0); });
    topLevelData = sortedByLevel.slice(0, 20).map(function(u, i) {
      return { rank: i + 1, name: u.username, avatar: u.avatar, tag: u.rank || "Member", score: "Lvl " + (u.level || 1), userId: u.userId, username: u.username, isPremium: u.isPremium, verified: u.verified, clanName: u.clanName, clanId: u.clanId };
    });

    var rankOrder = { "Mythic": 1000, "Legend": 900, "Grandmaster": 800, "Master": 700, "Diamond": 600, "Platinum": 500, "Gold": 400, "Silver": 300, "Bronze": 200, "Rookie": 100 };
    var sortedByRank = allUsers.slice().sort(function(a, b) {
      var ra = rankOrder[a.rank] || 0;
      var rb = rankOrder[b.rank] || 0;
      if (rb !== ra) return rb - ra;
      return (b.xp || 0) - (a.xp || 0);
    });
    topRankData = sortedByRank.slice(0, 20).map(function(u, i) {
      return { rank: i + 1, name: u.username, avatar: u.avatar, tag: u.rank || "Rookie", score: u.rank || "Rookie", userId: u.userId, username: u.username, isPremium: u.isPremium, verified: u.verified, clanName: u.clanName, clanId: u.clanId };
    });

    topClanData = clanList.map(function(clan) {
      var totalXp = calculateClanTotalXp(clan.members, allUsers);
      return {
        id: clan.id, rank: 0, name: clan.name, logo: clan.logo,
        color: clan.color, memberCount: clan.members.length,
        totalXp: totalXp, level: getClanLevel(totalXp)
      };
    }).sort(function(a, b) { return b.totalXp - a.totalXp; }).map(function(c, i) { c.rank = i + 1; return c; }).slice(0, 20);

    notificationsList = notifDocs || [];
    diskusiList = diskusiDocs || [];
    premiumPlans = premiumDocs || [];

    if (currentUserProfile) {
      userProfile = currentUserProfile;
      var existIdx = allUsers.findIndex(function(u) { return u.id === currentUserProfile.id; });
      if (existIdx === -1) {
        allUsers.push(currentUserProfile);
      } else {
        allUsers[existIdx] = Object.assign({}, allUsers[existIdx], currentUserProfile);
      }
    } else {
      userProfile = {
        username: "Guest", userId: "#000000",
        avatar: "https://i.pravatar.cc/150?img=47",
        xp: 0, level: 1, rank: "Rookie",
        joinedMonths: 1, comments: 0, historyCount: 0,
        watchMinutes: 0, followers: 0,
        badges: ["Rookie"], isDefault: true,
        bannerUrl: "", bannerType: "",
        clanId: "", clanName: "", verified: "",
        isPremium: false, isAdmin: false
      };
    }

    favoriteList = loadFromStorage(STORAGE_KEYS.FAVORITES, []);
    historyList = loadFromStorage(STORAGE_KEYS.HISTORY, []);
    dummyComments = [];
    window.__notifRead = loadFromStorage(STORAGE_KEYS.NOTIF_READ, []);
    window.__watchProgress = loadFromStorage(STORAGE_KEYS.PROGRESS, {});

    hideLoading();
    return true;
  } catch (e) {
    console.error("Gagal load data:", e);
    hideLoading();
    showToast("Gagal memuat data. Cek koneksi internet.");
    return false;
  }
}

/* ==================== HELPERS ==================== */
function getAnimeBySlug(slug) {
  if (!slug) return null;
  var target = String(slug).toLowerCase().trim();
  var exact = animeList.find(function(a) {
    return String(a.slug || a.id).toLowerCase().trim() === target;
  });
  if (exact) return exact;
  return animeList.find(function(a) {
    return String(a.id).toLowerCase().trim() === target;
  }) || null;
}

function isFavorited(slug) { return favoriteList.some(function(f) { return f.animeSlug === slug; }); }

function getPublicUser(username) {
  var found = allUsers.find(function(u) { return u.username === username; });
  if (found) return found;
  return {
    username: username, userId: "#000000",
    avatar: "https://i.pravatar.cc/150?u=" + encodeURIComponent(username),
    xp: 0, level: 1, rank: "Rookie",
    joinedMonths: 1, comments: 0, historyCount: 0,
    watchMinutes: 0, followers: 0,
    badges: ["Member"], bannerUrl: "", bannerType: "",
    clanId: "", clanName: "", verified: "",
    isPremium: false, isAdmin: false
  };
}

function getCommentsByEpisode(slug, ep) {
  if (typeof currentComments !== "undefined" && Array.isArray(currentComments)) return currentComments;
  if (!slug || !ep) return [];
  return dummyComments.filter(function(c) {
    return String(c.animeSlug) === String(slug) && Number(c.episode) === Number(ep);
  });
}

function isIframeVideo(url) {
  if (!url) return false;
  return url.indexOf("filedon.co") > -1 || url.indexOf("morencius.com") > -1 ||
         url.indexOf("blogger.com/video") > -1 || url.indexOf("pixeldrain.com") > -1 ||
         url.indexOf("vidhide") > -1 || url.indexOf("acefile") > -1 ||
         url.indexOf("krakenfiles") > -1 || url.indexOf("gofile.io") > -1 ||
         url.indexOf("iframe") > -1 || url.indexOf("/embed/") > -1;
}

function unlockScroll() {
  document.querySelectorAll(".afinitas-page, .watch-page, .clan-page, .chat-page-full").forEach(function(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  });
  document.body.style.overflow = "";
  document.body.style.position = "";
  document.body.style.height = "";
  document.body.style.width = "";
  document.documentElement.style.overflow = "";
  document.body.classList.remove("body-fake-fullscreen");
}

/* ==================== FULLSCREEN ==================== */
async function enterFakeFullscreen() {
  var wrapper = document.getElementById("watch-player-wrapper");
  if (!wrapper) return;
  try {
    if (wrapper.requestFullscreen) await wrapper.requestFullscreen({ navigationUI: "hide" });
    else if (wrapper.webkitRequestFullscreen) await wrapper.webkitRequestFullscreen();
  } catch (e) {}
  if (screen.orientation && screen.orientation.lock) {
    try { await screen.orientation.lock("landscape"); } catch (e) {}
  }
  isFakeFullscreen = true;
  var btn = document.getElementById("vc-fullscreen");
  if (btn && typeof VC_ICONS !== "undefined") btn.innerHTML = VC_ICONS.fullscreenExit;
}

async function exitFakeFullscreen() {
  isFakeFullscreen = false;
  var doc = document;
  var isNativeFs = doc.fullscreenElement || doc.webkitFullscreenElement;
  if (isNativeFs) {
    try {
      if (doc.exitFullscreen) await doc.exitFullscreen();
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
    } catch (e) {}
  }
  if (screen.orientation && screen.orientation.unlock) {
    try { screen.orientation.unlock(); } catch (e) {}
  }
  var btn = document.getElementById("vc-fullscreen");
  if (btn && typeof VC_ICONS !== "undefined") btn.innerHTML = VC_ICONS.fullscreen;
}

function toggleFakeFullscreen() {
  if (isFakeFullscreen) exitFakeFullscreen();
  else enterFakeFullscreen();
}

/* ==================== UPLOAD: AVATAR ==================== */
function changeAvatar() {
  if (!currentUser) { showToast("Belum login"); return; }
  var input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { showToast("File harus gambar"); return; }
    if (file.size > 5 * 1024 * 1024) { showToast("Max 5MB"); return; }
    pendingAvatarFile = file;
    var reader = new FileReader();
    reader.onload = function(ev) { showAvatarPreviewModal(ev.target.result); };
    reader.readAsDataURL(file);
  };
  input.click();
}

function showAvatarPreviewModal(previewUrl) {
  document.getElementById("modal-title").textContent = "Preview Avatar";
  document.getElementById("modal-body").innerHTML =
    '<div class="upload-preview-wrap">' +
    '<img class="upload-preview-img round" src="' + previewUrl + '" alt="Preview">' +
    '</div>' +
    '<div class="form-hint" style="text-align:center;margin-top:10px;">Ukuran: ' + (pendingAvatarFile.size / 1024).toFixed(1) + ' KB</div>' +
    '<div class="form-actions">' +
    '<button class="form-btn form-btn-cancel" onclick="cancelUpload()">Batal</button>' +
    '<button class="form-btn form-btn-save" onclick="confirmAvatarUpload()">Simpan</button>' +
    '</div>';
  openModal();
}

async function confirmAvatarUpload() {
  if (!pendingAvatarFile || !currentUser) return;
  showLoading("Mengupload avatar...");
  try {
    var formData = new FormData();
    formData.append("file", pendingAvatarFile);
    formData.append("type", "avatar");
    formData.append("userId", currentUser.uid);
    var res = await fetch(UPLOAD_API + "/upload/avatar", { method: "POST", body: formData });
    var data = await res.json();
    if (!data.success) throw new Error(data.error || "Upload gagal");
    userProfile.avatar = data.url;
    if (currentUserProfile) currentUserProfile.avatar = data.url;
    await fbUpdate(COLLECTIONS.USERS, currentUser.uid, { avatar: data.url, updatedAt: new Date().toISOString() });
    var idx = allUsers.findIndex(function(u) { return u.id === currentUser.uid; });
    if (idx > -1) allUsers[idx].avatar = data.url;
    closeModal();
    showToast("Avatar berhasil diupload!");
    renderPage();
    pendingAvatarFile = null;
  } catch (err) {
    showToast("Gagal upload: " + err.message);
  } finally {
    hideLoading();
  }
}

/* ==================== UPLOAD: BANNER ==================== */
function changeBanner() {
  if (!currentUser) { showToast("Belum login"); return; }
  var level = userProfile.level || calculateLevel(userProfile.xp || 0);
  var isPremium = userProfile.isPremium === true;
  var isHighRank = level >= 200;
  if (!isPremium && !isHighRank) { showToast("Banner cuma buat Premium atau rank Grandmaster+"); return; }
  var input = document.createElement("input");
  input.type = "file";
  input.accept = "video/mp4,video/webm,image/*";
  input.onchange = async function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var isVideo = file.type.startsWith("video/");
    var isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) { showToast("File harus video atau gambar"); return; }
    if (isVideo && file.size > 15 * 1024 * 1024) { showToast("Video max 15MB"); return; }
    if (isImage && file.size > 5 * 1024 * 1024) { showToast("Gambar max 5MB"); return; }
    if (isVideo) {
      showLoading("Cek video...");
      var duration = await getVideoDuration(file);
      hideLoading();
      if (duration > 10.5) { showToast("Video " + duration.toFixed(1) + "s - max 10 detik"); return; }
    }
    pendingBannerFile = file;
    pendingBannerType = isVideo ? "video" : "image";
    var reader = new FileReader();
    reader.onload = function(ev) { showBannerPreviewModal(ev.target.result, isVideo); };
    reader.readAsDataURL(file);
  };
  input.click();
}

function showBannerPreviewModal(previewUrl, isVideo) {
  document.getElementById("modal-title").textContent = "Preview Banner";
  document.getElementById("modal-body").innerHTML =
    '<div class="upload-preview-wrap banner">' +
    (isVideo ? '<video class="upload-preview-media" src="' + previewUrl + '" autoplay loop muted playsinline></video>' : '<img class="upload-preview-media" src="' + previewUrl + '" alt="Preview">') +
    '</div>' +
    '<div class="form-hint" style="text-align:center;margin-top:10px;">' + (isVideo ? "Video" : "Gambar") + ' - ' + (pendingBannerFile.size / 1024).toFixed(1) + ' KB</div>' +
    '<div class="form-actions">' +
    '<button class="form-btn form-btn-cancel" onclick="cancelUpload()">Batal</button>' +
    '<button class="form-btn form-btn-save" onclick="confirmBannerUpload()">Simpan</button>' +
    '</div>';
  openModal();
}

async function confirmBannerUpload() {
  if (!pendingBannerFile || !currentUser) return;
  showLoading("Mengupload banner...");
  try {
    var formData = new FormData();
    formData.append("file", pendingBannerFile);
    formData.append("type", "banner");
    formData.append("userId", currentUser.uid);
    var res = await fetch(UPLOAD_API + "/upload/banner", { method: "POST", body: formData });
    var data = await res.json();
    if (!data.success) throw new Error(data.error || "Upload gagal");
    userProfile.bannerUrl = data.url;
    userProfile.bannerType = pendingBannerType;
    if (currentUserProfile) {
      currentUserProfile.bannerUrl = data.url;
      currentUserProfile.bannerType = pendingBannerType;
    }
    await fbUpdate(COLLECTIONS.USERS, currentUser.uid, { bannerUrl: data.url, bannerType: pendingBannerType, updatedAt: new Date().toISOString() });
    var idx = allUsers.findIndex(function(u) { return u.id === currentUser.uid; });
    if (idx > -1) {
      allUsers[idx].bannerUrl = data.url;
      allUsers[idx].bannerType = pendingBannerType;
    }
    closeModal();
    showToast("Banner berhasil diupload!");
    renderPage();
    pendingBannerFile = null;
    pendingBannerType = null;
  } catch (err) {
    showToast("Gagal upload: " + err.message);
  } finally {
    hideLoading();
  }
}

function cancelUpload() {
  pendingAvatarFile = null;
  pendingBannerFile = null;
  pendingBannerType = null;
  closeModal();
}

function getVideoDuration(file) {
  return new Promise(function(resolve) {
    var video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = function() { URL.revokeObjectURL(video.src); resolve(video.duration); };
    video.onerror = function() { resolve(0); };
    video.src = URL.createObjectURL(file);
  });
}

function renderProfileBanner(u) {
  var isPremium = u.isPremium === true;
  var isHighRank = (u.level || 1) >= 200;
  if ((!isPremium && !isHighRank) || !u.bannerUrl) {
    return '<div class="profile-banner profile-banner-default"><div class="profile-banner-gradient"></div></div>';
  }
  if (u.bannerType === "video") {
    return '<div class="profile-banner"><video class="profile-banner-media" src="' + u.bannerUrl + '" autoplay loop muted playsinline webkit-playsinline preload="auto" oncontextmenu="return false" onloadeddata="this.play().catch(e => console.log(\'Autoplay blocked:\', e))"></video><div class="profile-banner-overlay"></div></div>';
  }
  return '<div class="profile-banner"><img class="profile-banner-media" src="' + u.bannerUrl + '" alt=""><div class="profile-banner-overlay"></div></div>';
}

/* ==================== ROUTER ==================== */
function switchTab(tab) {
  unlockScroll();
  exitFakeFullscreen();
  if (currentTab === "global-chat" && tab !== "global-chat") {
    if (typeof stopGlobalChatListener === "function") stopGlobalChatListener();
  }
  currentTab = tab;
  watchOpen = false;
  stopAutoSlide();
  var nav = document.getElementById("bottom-nav");
  var mh = document.getElementById("mini-header");
  if (nav) nav.style.display = "flex";
  if (mh && tab !== "home") mh.style.display = "none";
  document.querySelectorAll(".nav-item").forEach(function(b) {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
  if (tab === "home" && window.location.pathname !== "/") {
    history.pushState({}, "", "/");
  }
  renderPage();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderPage() {
  var main = document.getElementById("app-main");
  var nav = document.getElementById("bottom-nav");
  var mh = document.getElementById("mini-header");
  if (!main) return;
  main.innerHTML = "";
  if (currentTab === "global-chat") {
    if (nav) nav.style.display = "none";
    if (mh) mh.style.display = "none";
    if (typeof renderGlobalChat === "function") renderGlobalChat(main);
    return;
  }
  if (mh && currentTab !== "home") mh.style.display = "none";
  if (nav) nav.style.display = "flex";
  if (watchOpen) {
    if (nav) nav.style.display = "none";
    renderWatch(main);
    return;
  }
  try {
    if (currentTab === "home") { renderMiniHeader(); renderHome(main); }
    else if (currentTab === "search") renderSearch(main);
    else if (currentTab === "jadwal") renderJadwal(main);
    else if (currentTab === "favorit") renderFavorit(main);
    else if (currentTab === "riwayat") renderRiwayat(main);
    else if (currentTab === "profil") renderProfil(main);
    else if (currentTab === "notifikasi") renderNotifikasi(main);
    else if (currentTab === "premium") renderPremium(main);
    else if (currentTab === "diskusi" && typeof renderGlobalChat === "function") renderGlobalChat(main);
    else if (currentTab === "peliharaan" && typeof renderPeliharaan === "function") renderPeliharaan(main);
    else if (currentTab === "afinitas" && typeof renderAfinitas === "function") renderAfinitas(main);
    else if (currentTab === "public-profile" && typeof renderPublicProfile === "function") renderPublicProfile(main);
    else if (currentTab === "detail") renderDetail(main);
    else if (currentTab === "clan" && typeof renderClanPage === "function") renderClanPage(main);
    else if (currentTab === "settings" && typeof renderSettings === "function") renderSettings(main);
    else if (currentTab === "leaderboard" && typeof renderLeaderboard === "function") renderLeaderboard(main);
    else if (currentTab === "popular") renderPopular(main);
  } catch (e) {
    console.error("Render error:", e);
    main.innerHTML = '<p style="padding:40px;text-align:center;color:white;">Error: ' + e.message + '</p>';
  }
  setTimeout(forceBannerAutoplay, 200);
}

/* ==================== MINI HEADER ==================== */
function renderMiniHeader() {
  var mh = document.getElementById("mini-header");
  if (!mh) return;
  var readList = window.__notifRead || [];
  var unreadCount = notificationsList.filter(function(n) { return readList.indexOf(n.id) === -1; }).length;
  mh.innerHTML =
    '<div class="mini-logo">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ico-18"><polygon points="6 3 20 12 6 21 6 3"/></svg>' +
    '<span>MikoAnime</span>' +
    '</div>' +
    '<div class="mini-actions">' +
    '<button class="mini-icon-btn" onclick="openSearch()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></button>' +
    '<button class="mini-icon-btn" onclick="openNotifikasi()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>' + (unreadCount > 0 ? '<span class="mini-badge">' + unreadCount + '</span>' : "") + '</button>' +
    '</div>';
  mh.style.display = "flex";
}

function pageHeaderHTML(title, backFn) {
  backFn = backFn || "switchTab('home')";
  return '<div class="page-header fade-up">' +
    '<button class="page-back" onclick="' + backFn + '">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>' +
    '</button>' +
    '<div class="page-header-title">' + title + '</div>' +
    '</div>';
}

function premiumBarHTML() {
  return '<button class="premium-bar fade-up" onclick="openPremium()">' +
    '<div class="premium-bar-icon">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="ico-16"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>' +
    '</div>' +
    '<div class="premium-bar-text">' +
    '<div class="premium-bar-title">Beli Premium</div>' +
    '<div class="premium-bar-sub">Nonton tanpa iklan & akses 1080p</div>' +
    '</div>' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="ico-16"><path d="M9 18l6-6-6-6"/></svg>' +
    '</button>';
}

/* ==================== TOP CAROUSEL ==================== */
function topCarouselHTML() {
  var slides = [
    { title: "TOP GIVEAWAY USERS", icon: "crown", type: "giveaway" },
    { title: "TOP LEVEL", icon: "star", type: "level" },
    { title: "TOP RANK", icon: "trophy", type: "rank" },
    { title: "TOP CLAN", icon: "shield", type: "clan" }
  ];
  return '<section class="card-section giveaway-section fade-up d1" id="top-carousel">' +
    '<div class="top-carousel-head">' +
    '<div class="top-carousel-title" id="top-title">' + iconCrown() + '<span>TOP GIVEAWAY USERS</span></div>' +
    '<div class="top-nav-btns">' +
    '<button class="top-nav-btn" onclick="prevTopSlide()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="ico-14"><path d="M15 18l-6-6 6-6"/></svg></button>' +
    '<button class="top-nav-btn" onclick="nextTopSlide()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="ico-14"><path d="M9 18l6-6-6-6"/></svg></button>' +
    '</div>' +
    '</div>' +
    '<div class="top-slider" id="top-slider">' +
    slides.map(function(s, i) {
      return '<div class="top-slide ' + (i === 0 ? "active" : "") + '">' + renderTopSlideContent(s.type) + '</div>';
    }).join("") +
    '</div>' +
    '<div class="giveaway-dots" id="top-dots">' + slides.map(function(_, i) { return '<span class="' + (i === 0 ? "dot-active" : "") + '" onclick="goTopSlide(' + i + ')"></span>'; }).join("") + '</div>' +
    '</section>';
}

function renderTopSlideContent(type) {
  var data = [];
  if (type === "giveaway") {
    var sorted = allUsers.slice().sort(function(a, b) { return calculateJoinDays(b) - calculateJoinDays(a); });
    data = sorted.slice(0, 5).map(function(u, i) {
      var days = calculateJoinDays(u);
      return { rank: i + 1, userId: u.userId, username: u.username, avatar: u.avatar, level: u.level, clanName: u.clanName, clanId: u.clanId, isPremium: u.isPremium, verified: u.verified, score: formatJoinDays(days) };
    });
  } else if (type === "level") {
    var sorted2 = allUsers.slice().sort(function(a, b) { return (b.level || 0) - (a.level || 0); });
    data = sorted2.slice(0, 5).map(function(u, i) {
      return { rank: i + 1, userId: u.userId, username: u.username, avatar: u.avatar, level: u.level, clanName: u.clanName, clanId: u.clanId, isPremium: u.isPremium, verified: u.verified, score: "Lvl " + (u.level || 1) };
    });
  } else if (type === "rank") {
    var rankOrder = { "Mythic": 1000, "Legend": 900, "Grandmaster": 800, "Master": 700, "Diamond": 600, "Platinum": 500, "Gold": 400, "Silver": 300, "Bronze": 200, "Rookie": 100 };
    var sorted3 = allUsers.slice().sort(function(a, b) {
      var ra = rankOrder[a.rank] || 0;
      var rb = rankOrder[b.rank] || 0;
      if (rb !== ra) return rb - ra;
      return (b.xp || 0) - (a.xp || 0);
    });
    data = sorted3.slice(0, 5).map(function(u, i) {
      return { rank: i + 1, userId: u.userId, username: u.username, avatar: u.avatar, level: u.level, clanName: u.clanName, clanId: u.clanId, isPremium: u.isPremium, verified: u.verified, score: u.rank || "Rookie" };
    });
  } else if (type === "clan") {
    data = clanList.map(function(c) {
      var totalXp = calculateClanTotalXp(c.members, allUsers);
      return { id: c.id, rank: 0, name: c.name, logo: c.logo, color: c.color, memberCount: c.members.length, level: getClanLevel(totalXp), totalXp: totalXp, isClan: true };
    }).sort(function(a, b) { return b.totalXp - a.totalXp; }).map(function(c, i) { c.rank = i + 1; return c; }).slice(0, 5);
  }

  if (data.length === 0) {
    return '<p style="text-align:center;color:var(--text-mute);padding:20px 0;font-size:12px;">Belum ada data</p>';
  }

  return '<div onclick="openLeaderboard(\'' + type + '\')" style="cursor:pointer;">' +
    '<div class="giveaway-list-custom">' +
    data.map(function(item) { return renderGiveawayRow(item); }).join("") +
    '</div>' +
    '<div style="text-align:center;margin-top:10px;font-size:11px;font-weight:600;color:var(--accent-2);display:flex;align-items:center;justify-content:center;gap:4px;">' +
    'Lihat Selengkapnya ' + icons.chevronRight +
    '</div>' +
    '</div>';
}

function renderGiveawayRow(item) {
  if (item.isClan) {
    var color = item.color || generateClanColor(item.name);
    var logo = getClanLogo(item.logo);
    return '<div class="gw-row-custom" onclick="event.stopPropagation(); openClanDetail(\'' + item.id + '\')">' +
      '<span class="gw-row-rank">#' + item.rank + '</span>' +
      '<span class="clan-emblem xs" style="background:' + color + ';color:white;">' + logo + '</span>' +
      '<span class="gw-row-name">' + escapeHtml(item.name) + '</span>' +
      '</div>';
  }
  var safeName = String(item.username || "").replace(/'/g, "\\'");
  var clanName = item.clanName || "";
  var clanColor = getClanColorForUser(item);
  var verifiedHTML = item.verified ? '<img class="verified-badge verified-badge-sm" src="' + item.verified + '" alt="">' : "";
  var premiumHTML = item.isPremium ? '<span class="gw-row-premium">P</span>' : "";
  return '<div class="gw-row-custom" onclick="event.stopPropagation(); openPublicProfile(\'' + safeName + '\')">' +
    '<span class="gw-row-rank">#' + item.rank + '</span>' +
    '<img class="gw-row-avatar" src="' + (item.avatar || 'https://i.pravatar.cc/150') + '" alt="">' +
    '<span class="gw-row-name">' + escapeHtml(item.username) + verifiedHTML + '</span>' +
    premiumHTML +
    (clanName ? '<span class="gw-clan" style="--clan-color:' + clanColor + ';">' + escapeHtml(clanName.toUpperCase()) + '</span>' : "") +
    '<span class="gw-row-score">' + item.score + '</span>' +
    '</div>';
}

function goTopSlide(index) {
  var slides = document.querySelectorAll(".top-slide");
  var dots = document.querySelectorAll("#top-dots span");
  if (!slides.length) return;
  currentTopSlide = index;
  slides.forEach(function(s, i) { s.classList.toggle("active", i === index); });
  dots.forEach(function(d, i) { d.classList.toggle("dot-active", i === index); });
  updateTopTitle(index);
}

function nextTopSlide() {
  var slides = document.querySelectorAll(".top-slide");
  if (!slides.length) return;
  goTopSlide((currentTopSlide + 1) % slides.length);
}

function prevTopSlide() {
  var slides = document.querySelectorAll(".top-slide");
  if (!slides.length) return;
  goTopSlide((currentTopSlide - 1 + slides.length) % slides.length);
}

function updateTopTitle(index) {
  var titles = [
    { text: "TOP GIVEAWAY USERS", icon: iconCrown },
    { text: "TOP LEVEL", icon: iconStar },
    { text: "TOP RANK", icon: iconTrophy },
    { text: "TOP CLAN", icon: iconShield }
  ];
  var t = titles[index];
  var el = document.getElementById("top-title");
  if (el) el.innerHTML = t.icon() + '<span>' + t.text + '</span>';
}

function initSwipe() {
  var slider = document.getElementById("top-slider");
  if (!slider) return;
  var startX = 0, startY = 0, isDragging = false;
  slider.addEventListener("touchstart", function(e) {
    startX = e.touches[0].clientX; startY = e.touches[0].clientY;
    isDragging = true; stopAutoSlide();
  }, { passive: true });
  slider.addEventListener("touchmove", function(e) {
    if (!isDragging) return;
    var dx = Math.abs(e.touches[0].clientX - startX);
    var dy = Math.abs(e.touches[0].clientY - startY);
    if (dy > dx) isDragging = false;
  }, { passive: true });
  slider.addEventListener("touchend", function(e) {
    if (!isDragging) return;
    isDragging = false;
    var diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) > 50) { if (diff < 0) nextTopSlide(); else prevTopSlide(); }
    startAutoSlide();
  }, { passive: true });
}

/* ==================== HOME ==================== */
function renderHome(main) {
  renderMiniHeader();
  var newAnimeList = getNewAnime();
  var popularAnime = getPopularAnime();

  main.innerHTML =
    topCarouselHTML() +
    premiumBarHTML() +
    '<div class="diskusi-bar fade-up d2" onclick="openDiskusi()">' +
    '<div class="diskusi-left">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ico-14"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
    '<span>Public Diskusi</span>' +
    '</div>' +
    '<div class="diskusi-right">' +
    '<svg viewBox="0 0 24 24" fill="currentColor" class="ico-12 heart-red"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
    '<span class="diskusi-text">' + (diskusiList[0] ? diskusiList[0].user + ": " + diskusiList[0].message : "Belum ada diskusi") + '</span>' +
    icons.chevronRight +
    '</div>' +
    '</div>' +
    '<section class="section fade-up d3">' +
    '<div class="section-head">' +
    '<h2 class="section-title">Terakhir Ditonton</h2>' +
    '<a class="section-link" onclick="switchTab(\'riwayat\')">Selengkapnya ' + icons.chevronRight + '</a>' +
    '</div>' +
    '<div class="horizontal-scroll">' +
    (historyList.length > 0 ? historyList.slice(0, 5).map(cwCardHTML).join("") : '<p style="color:var(--text-mute);font-size:12px;padding:10px 0;">Belum ada riwayat</p>') +
    '</div>' +
    '</section>' +
    '<section class="section fade-up d4">' +
    '<div class="section-head">' +
    '<h2 class="section-title">New Anime Update</h2>' +
    '<a class="section-link" onclick="switchTab(\'jadwal\')">Lihat Jadwal ' + icons.chevronRight + '</a>' +
    '</div>' +
    '<div class="anime-grid-3">' +
    (newAnimeList.length > 0
      ? newAnimeList.slice(0, 9).map(animeCardHTML).join("")
      : '<p style="color:var(--text-mute);font-size:12px;grid-column:1/-1;text-align:center;padding:20px 0;">Belum ada anime baru</p>') +
    '</div>' +
    '</section>' +
    (popularAnime.length > 0 ? '<section class="section fade-up">' +
      '<div class="section-head">' +
      '<h2 class="section-title">Anime Populer</h2>' +
      '<a class="section-link" onclick="openPopularPage()">Selengkapnya ' + icons.chevronRight + '</a>' +
      '</div>' +
      '<div class="anime-grid-3">' +
      popularAnime.slice(0, 9).map(animeCardHTML).join("") +
      '</div>' +
      '</section>' : "");
  setTimeout(function() { initSwipe(); startAutoSlide(); }, 100);
}

function cwCardHTML(item) {
  var percent = item.duration ? (item.progress / item.duration) * 100 : 0;
  return '<div class="cw-card" onclick="openWatch(\'' + item.animeSlug + '\', ' + item.episode + ')">' +
    '<div class="cw-thumb">' +
    '<img src="' + (item.thumb || item.cover) + '" alt="">' +
    '<span class="cw-eps">Eps ' + item.episode + '</span>' +
    '<div class="cw-progress"><div class="cw-progress-fill" style="width:' + percent + '%"></div></div>' +
    '</div>' +
    '<div class="cw-title">' + item.animeTitle + '</div>' +
    '<div class="cw-time">' + icons.clock + '<span>' + formatTime(item.progress) + ' / ' + formatTime(item.duration) + '</span></div>' +
    '</div>';
}

function animeCardHTML(anime) {
  var fav = isFavorited(anime.slug);
  var showNew = anime.isNew !== false;
  return '<div class="anime-card" onclick="openAnime(\'' + anime.slug + '\')">' +
    '<div class="anime-thumb">' +
    '<img src="' + anime.cover + '" alt="" loading="lazy">' +
    (showNew ? '<span class="anime-badge">NEW</span>' : "") +
    '<span class="anime-rating">' + icons.star + Number(anime.rating || 0).toFixed(1) + '</span>' +
    '<span class="anime-eps">' + (anime.totalEpisodes || 0) + ' Eps</span>' +
    '<button class="anime-fav-btn ' + (fav ? "active" : "") + '" onclick="event.stopPropagation(); toggleFav(\'' + anime.slug + '\')">' + (fav ? icons.heartFill : icons.heart) + '</button>' +
    '</div>' +
    '<div class="anime-title">' + anime.title + '</div>' +
    '<div class="anime-views">' + icons.eye + '<span>' + formatViews(anime.views) + '</span></div>' +
    '</div>';
}

function toggleFav(slug) {
  var anime = getAnimeBySlug(slug);
  if (!anime) return;
  var idx = favoriteList.findIndex(function(f) { return f.animeSlug === slug; });
  if (idx > -1) { favoriteList.splice(idx, 1); showToast("Dihapus dari Favorite"); }
  else {
    favoriteList.push({ animeSlug: anime.slug, animeTitle: anime.title, cover: anime.cover, episode: 1, rating: anime.rating, totalEpisodes: anime.totalEpisodes, lastUpdate: "baru saja" });
    showToast("Ditambahkan ke Favorite");
  }
  saveFavorites();
  renderPage();
}

/* ==================== HALAMAN ANIME POPULER ==================== */
function openPopularPage() {
  unlockScroll();
  exitFakeFullscreen();
  watchFromTab = currentTab;
  currentTab = "popular";
  watchOpen = false;
  stopAutoSlide();
  document.querySelectorAll(".nav-item").forEach(function(b) { b.classList.remove("active"); });
  renderPage();
  window.scrollTo({ top: 0 });
}

function renderPopular(main) {
  var sorted = getPopularAnime();
  main.innerHTML =
    '<div class="page-header fade-up" style="padding-top:20px;">' +
    '<button class="page-back" onclick="switchTab(\'home\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>' +
    '<div class="page-header-title">Anime Populer</div>' +
    '</div>' +
    '<p style="font-size:12px;color:var(--text-mute);margin-bottom:14px;">' + sorted.length + ' anime paling populer</p>' +
    (sorted.length === 0
      ? '<p style="text-align:center;color:var(--text-mute);padding:40px 0;">Belum ada anime</p>'
      : '<div class="anime-grid-3 fade-up d1">' + sorted.map(animeCardHTML).join("") + '</div>');
}

/* ==================== SEARCH ==================== */
function openSearch() {
  watchFromTab = currentTab;
  currentTab = "search";
  watchOpen = false;
  searchQuery = "";
  searchGenre = "";
  stopAutoSlide();
  unlockScroll();
  document.querySelectorAll(".nav-item").forEach(function(b) { b.classList.remove("active"); });
  var nav = document.getElementById("bottom-nav");
  if (nav) nav.style.display = "flex";
  renderPage();
  setTimeout(function() { var inp = document.getElementById("search-bar"); if (inp) inp.focus(); }, 100);
}

function renderSearch(main) {
  var allGenres = [];
  animeList.forEach(function(a) {
    (a.genres || []).forEach(function(g) {
      if (allGenres.indexOf(g) === -1) allGenres.push(g);
    });
  });
  allGenres.sort();
  var results = animeList;
  if (searchQuery.trim()) {
    var q = searchQuery.toLowerCase();
    results = results.filter(function(a) {
      return a.title.toLowerCase().indexOf(q) > -1 || (a.studio || "").toLowerCase().indexOf(q) > -1 ||
        (a.genres || []).some(function(g) { return g.toLowerCase().indexOf(q) > -1; });
    });
  }
  if (searchGenre) results = results.filter(function(a) { return (a.genres || []).indexOf(searchGenre) > -1; });

  main.innerHTML =
    '<div class="search-header fade-up">' +
    '<button class="search-back" onclick="switchTab(\'home\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>' +
    '<div class="search-bar-wrap">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>' +
    '<input id="search-bar" class="search-bar-input" placeholder="Cari anime, studio, genre..." value="' + searchQuery + '" oninput="onSearchInput(this.value)">' +
    '</div>' +
    '</div>' +
    '<div class="search-tags fade-up d1">' +
    '<span class="search-tag ' + (searchGenre === "" ? "active" : "") + '" onclick="setGenre(\'\')">Semua</span>' +
    allGenres.map(function(g) { return '<span class="search-tag ' + (searchGenre === g ? "active" : "") + '" onclick="setGenre(\'' + g + '\')">' + g + '</span>'; }).join("") +
    '</div>' +
    '<div class="search-result-count fade-up d2" id="search-result-count">' + results.length + ' anime ditemukan</div>' +
    '<div class="fade-up d3" id="search-results-wrap">' +
    (results.length === 0 ? '<div class="search-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><p>Anime "' + searchQuery + '" tidak ditemukan</p></div>' : '<div class="search-grid">' + results.map(animeCardHTML).join("") + '</div>') +
    '</div>';
}

function onSearchInput(val) {
  searchQuery = val;
  var countEl = document.getElementById("search-result-count");
  var resultsWrap = document.getElementById("search-results-wrap");
  if (!countEl || !resultsWrap) return;
  var results = animeList;
  if (searchQuery.trim()) {
    var q = searchQuery.toLowerCase();
    results = results.filter(function(a) {
      return a.title.toLowerCase().indexOf(q) > -1 || (a.studio || "").toLowerCase().indexOf(q) > -1 ||
        (a.genres || []).some(function(g) { return g.toLowerCase().indexOf(q) > -1; });
    });
  }
  if (searchGenre) results = results.filter(function(a) { return (a.genres || []).indexOf(searchGenre) > -1; });
  countEl.textContent = results.length + " anime ditemukan";
  resultsWrap.innerHTML = results.length === 0
    ? '<div class="search-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><p>Anime "' + searchQuery + '" tidak ditemukan</p></div>'
    : '<div class="search-grid">' + results.map(animeCardHTML).join("") + '</div>';
}

function setGenre(g) {
  searchGenre = g;
  document.querySelectorAll(".search-tag").forEach(function(el) {
    el.classList.toggle("active", el.textContent.trim() === (g || "Semua"));
  });
  onSearchInput(searchQuery);
}

/* ==================== JADWAL ==================== */
function renderJadwal(main) {
  var list = animeList.filter(function(a) { return a.updateDay === currentDay && !a.completed; });
  main.innerHTML =
    '<h1 class="page-title fade-up">Jadwal Tayang</h1>' +
    '<div class="jadwal-tabs fade-up d1">' +
    DAYS_OF_WEEK.map(function(d) { return '<button class="day-tab ' + (d === currentDay ? "active" : "") + '" onclick="setDay(\'' + d + '\')">' + d + '</button>'; }).join("") +
    '</div>' +
    '<div class="schedule-count fade-up d2">' + list.length + ' Anime</div>' +
    '<div class="schedule-list fade-up d3">' +
    (list.length === 0 ? '<p style="text-align:center;color:var(--text-mute);padding:40px 0;">Belum ada jadwal hari ' + currentDay + '</p>' : list.map(scheduleItemHTML).join("")) +
    '</div>';
}

function setDay(day) { currentDay = day; renderPage(); }

function scheduleItemHTML(anime) {
  return '<div class="schedule-item" onclick="openAnime(\'' + anime.slug + '\')">' +
    '<div class="schedule-time">' + (anime.updateTime || "—") + '</div>' +
    '<div class="schedule-thumb"><img src="' + anime.cover + '" alt=""></div>' +
    '<div class="schedule-info">' +
    '<div class="schedule-title">' + anime.title + '</div>' +
    '<div class="schedule-ep">Episode ' + (anime.totalEpisodes || 0) + '</div>' +
    '<div class="schedule-status">Menunggu Update</div>' +
    '<div class="schedule-meta">' + icons.eye + '<span>' + formatViews(anime.views) + '</span><span>•</span><span>★ ' + Number(anime.rating || 0).toFixed(1) + '</span></div>' +
    '</div>' +
    '</div>';
}

/* ==================== FAVORITE ==================== */
function renderFavorit(main) {
  var list = favoriteList.slice();
  if (currentFavSort === "rating") list.sort(function(a, b) { return b.rating - a.rating; });
  else if (currentFavSort === "az") list.sort(function(a, b) { return a.animeTitle.localeCompare(b.animeTitle); });

  main.innerHTML =
    '<div class="fav-header fade-up">' +
    '<div>' +
    '<div class="fav-title">Favorite Saya</div>' +
    '<div class="fav-count">' + list.length + ' anime tersimpan</div>' +
    '</div>' +
    '<button class="fav-sort" onclick="cycleFavSort()">' +
    (currentFavSort === "terbaru" ? "Terbaru" : currentFavSort === "rating" ? "Rating" : "A-Z") +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;"><polyline points="6 9 12 15 18 9"/></svg>' +
    '</button>' +
    '</div>' +
    (list.length === 0 ? '<div class="fav-empty fade-up d1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><p>Belum ada anime favorite</p></div>' : '<div class="fav-list fade-up d1">' + list.map(favItemHTML).join("") + '</div>');
}

function cycleFavSort() {
  if (currentFavSort === "terbaru") currentFavSort = "rating";
  else if (currentFavSort === "rating") currentFavSort = "az";
  else currentFavSort = "terbaru";
  renderPage();
}

function favItemHTML(fav) {
  return '<div class="fav-item" onclick="openWatch(\'' + fav.animeSlug + '\', ' + fav.episode + ')">' +
    '<div class="fav-thumb">' +
    '<img src="' + fav.cover + '" alt="">' +
    '<span class="fav-badge">Eps ' + fav.episode + '</span>' +
    '</div>' +
    '<div class="fav-info">' +
    '<div class="fav-anime-title">' + fav.animeTitle + '</div>' +
    '<div class="fav-ep">Episode ' + fav.episode + ' / ' + fav.totalEpisodes + '</div>' +
    '<div class="fav-meta"><span>★ ' + Number(fav.rating || 0).toFixed(1) + '</span><span>•</span><span>' + fav.lastUpdate + '</span></div>' +
    '</div>' +
    '<button class="fav-remove" onclick="event.stopPropagation(); removeFav(\'' + fav.animeSlug + '\')">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
    '</button>' +
    '</div>';
}

function removeFav(slug) {
  var idx = favoriteList.findIndex(function(f) { return f.animeSlug === slug; });
  if (idx > -1) { favoriteList.splice(idx, 1); saveFavorites(); showToast("Dihapus dari Favorite"); renderPage(); }
}

/* ==================== NONTON ==================== */
function openAnime(slug) {
  unlockScroll();
  exitFakeFullscreen();
  watchFromTab = currentTab;
  currentAnimeSlug = slug;
  currentTab = "detail";
  watchOpen = false;
  stopAutoSlide();
  if (typeof updateUrl === "function") updateUrl(slug);
  document.querySelectorAll(".nav-item").forEach(function(b) { b.classList.remove("active"); });
  renderPage();
  window.scrollTo({ top: 0 });
}

function openWatch(slug, episode) {
  unlockScroll();
  exitFakeFullscreen();
  watchFromTab = currentTab;
  currentAnimeSlug = slug;
  currentEpisode = Number(episode) || 1;
  window.currentEpisode = currentEpisode;
  watchOpen = true;
  stopAutoSlide();
  if (typeof updateUrl === "function") updateUrl(slug, currentEpisode);
  renderPage();
  window.scrollTo({ top: 0 });
}

function closeWatch() {
  if (typeof stopCommentOverlay === "function") stopCommentOverlay();
  if (typeof stopListenComments === "function") stopListenComments();
  exitFakeFullscreen();
  var v = document.getElementById("video-player");
  if (v) {
    if (v.tagName === "VIDEO") {
      if (currentAnimeSlug && currentEpisode) {
        var time = v.currentTime;
        var duration = v.duration || 0;
        if (typeof saveWatchProgressLocal === "function") saveWatchProgressLocal(currentAnimeSlug, currentEpisode, time, duration);
        if (typeof saveWatchProgressToFirestore === "function") saveWatchProgressToFirestore(currentAnimeSlug, currentEpisode, time, duration);
      }
      if (typeof cleanupWatchPlayer === "function") cleanupWatchPlayer(v);
      if (typeof cleanupVideoControls === "function") cleanupVideoControls();
      v.pause();
      v.src = "";
    } else if (v.tagName === "IFRAME") {
      v.src = "";
    }
  }
  watchOpen = false;
  unlockScroll();
  if (typeof updateUrl === "function" && currentAnimeSlug) updateUrl(currentAnimeSlug);
  renderPage();
  window.scrollTo({ top: 0 });
}

/* ==================== RENDER WATCH ==================== */
async function renderWatch(main) {
  var anime = getAnimeBySlug(currentAnimeSlug);
  if (!anime) {
    console.error("❌ Anime gak ketemu:", currentAnimeSlug);
    showToast("Anime gak ditemukan");
    currentTab = "home";
    watchOpen = false;
    renderPage();
    return;
  }
  var ep = currentEpisode;
  window.currentEpisode = ep;
  var fav = isFavorited(anime.slug);

  showLoading("Memuat episode...");
  var episodes = [];
  try { episodes = await fbGetSubcollection("anime", anime.slug, "episode"); } catch (e) {}
  hideLoading();

  var currentEpData = episodes.find(function(e) { return Number(e.id) === ep; });

  window.__currentEpisodeData = currentEpData || null;
  window.__currentQuality = null;

  var videoUrl = "";
  if (currentEpData) {
    if (typeof pickBestQualityForEpisode === "function") {
      var picked = pickBestQualityForEpisode(currentEpData);
      if (picked) {
        videoUrl = picked.url;
        window.__currentQuality = picked.value;
      }
    }
    if (!videoUrl && currentEpData.videoUrl) {
      videoUrl = currentEpData.videoUrl;
      window.__currentQuality = "legacy";
    }
  }
  if (!videoUrl && typeof getVideoUrlForEpisode === "function") {
    videoUrl = getVideoUrlForEpisode(anime.slug, ep);
  }

  var isIframe = isIframeVideo(videoUrl);
  var progressKey = anime.slug + "-ep" + ep;
  var savedTime = (window.__watchProgress || {})[progressKey] || 0;

  var episodeComments = [];
  try { episodeComments = await getCommentsFromFirestore(anime.slug, ep); } catch (e) {}

  main.innerHTML =
    '<div class="watch-page">' +
    '<div class="watch-topbar" id="watch-topbar">' +
    '<button class="watch-back" onclick="closeWatch()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>' +
    '<div class="watch-title-top">' + anime.title + '</div>' +
    '<button class="watch-share-btn" onclick="shareAnime(\'' + anime.slug + '\', \'' + anime.title.replace(/'/g, "\\'") + '\')">' + icons.share + '</button>' +
    '</div>' +
    '<div class="watch-player" id="watch-player-wrapper">' +
    (videoUrl
      ? (isIframe
          ? '<iframe id="video-player" class="watch-video" src="' + videoUrl + '" width="100%" height="100%" frameborder="0" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="no-referrer" scrolling="no"></iframe>'
          : '<video id="video-player" class="watch-video" src="' + videoUrl + '" poster="' + anime.banner + '" preload="metadata" playsinline controlsList="nodownload" oncontextmenu="return false"></video>')
      : '<div class="watch-player-placeholder">' + icons.play + '<p style="color:var(--text-mute);font-size:13px;">Video episode ' + ep + ' belum tersedia</p></div>') +
    (!isIframe && videoUrl ? '<div class="video-controls-overlay" id="custom-video-controls"></div>' : "") +
    '</div>' +
    (!isIframe && savedTime > 5 ? '<div class="resume-hint fade-up">Lanjut dari ' + formatTime(savedTime) + '</div>' : "") +
    '<div class="watch-info-card">' +
    '<div class="watch-info-cover"><img src="' + anime.cover + '" alt=""></div>' +
    '<div class="watch-info-meta">' +
    '<div class="watch-info-title">' + anime.title + '</div>' +
    '<div class="watch-info-row"><span>Episode ' + ep + '</span>' + icons.eye + '<span>' + formatViews(anime.views) + '</span></div>' +
    '<div class="watch-info-synopsis">' + anime.synopsis + '</div>' +
    '</div>' +
    '</div>' +
    '<div class="watch-actions">' +
    '<button class="watch-action" onclick="downloadVideo(\'' + videoUrl + '\')">' + icons.download + '<span>Download</span></button>' +
    '<button class="watch-action" onclick="reportVideo()">' + icons.report + '<span>Report</span></button>' +
    '<button class="watch-action" onclick="shareAnime(\'' + anime.slug + '\', \'' + anime.title.replace(/'/g, "\\'") + '\')">' + icons.share + '<span>Share</span></button>' +
    '<button class="watch-action" onclick="toggleFav(\'' + anime.slug + '\')">' + (fav ? icons.heartFill : icons.heart) + '<span>Favorite</span></button>' +
    '</div>' +
    '<h3 class="watch-section-title">Episode List</h3>' +
    '<div class="episode-grid">' +
    (episodes.length > 0
      ? episodes.map(function(e) { return '<div class="ep-item ' + (Number(e.id) === ep ? "active" : "") + '" onclick="changeEpisode(' + Number(e.id) + ')">' + e.id + '</div>'; }).join("")
      : '<p style="color:var(--text-mute);font-size:12px;padding:8px 0;">Belum ada episode</p>') +
    '</div>' +
    '<h3 class="watch-section-title">Komentar Episode ' + ep + ' (<span id="comment-count">' + episodeComments.length + '</span>)</h3>' +
    '<div class="comment-input-wrap">' +
    '<img class="comment-input-avatar" src="' + (userProfile.avatar || 'https://i.pravatar.cc/150') + '" alt="">' +
    '<input id="comment-input" class="comment-input" placeholder="Tulis komentar di Episode ' + ep + '..." onkeydown="if(event.key===\'Enter\')sendComment()">' +
    '<button class="comment-send-btn" onclick="sendComment()">' + icons.send + '</button>' +
    '</div>' +
    '<div id="comment-list">' +
    (episodeComments.length === 0
      ? '<div class="comment-empty-black"><svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>Belum ada komentar di Episode ' + ep + '</p></div>'
      : episodeComments.map(watchCommentHTML).join("")) +
    '</div>' +
    '</div>';

  setTimeout(async function() {
    var v = document.getElementById("video-player");
    if (v && v.tagName === "VIDEO") {
      var finalSavedTime = savedTime;
      if (typeof getWatchProgress === "function") {
        try {
          var firestoreTime = await getWatchProgress(anime.slug, ep);
          finalSavedTime = Math.max(savedTime, firestoreTime);
        } catch (e) {}
      }
      if (finalSavedTime > 5) v.currentTime = finalSavedTime;

      var nextEp = ep + 1;
      var hasNextEp = episodes.some(function(e) { return Number(e.id) === nextEp; });

      if (typeof setupWatchPlayer === "function") setupWatchPlayer(v, anime.slug, ep, hasNextEp);
      if (typeof renderVideoControls === "function") {
        renderVideoControls();
        if (typeof updateVideoDuration === "function") updateVideoDuration();
        setTimeout(function() {
          var fsBtn = document.getElementById("vc-fullscreen");
          if (fsBtn) fsBtn.onclick = function(e) { e.stopPropagation(); toggleFakeFullscreen(); };
        }, 50);
      }
    } else if (v && v.tagName === "IFRAME") {
      if (typeof addToHistory === "function") addToHistory(anime.slug, ep);
    }

    if (typeof listenComments === "function") {
      listenComments(anime.slug, ep, function(comments) {
        var list = document.getElementById("comment-list");
        var count = document.getElementById("comment-count");
        if (count) count.textContent = comments.length;
        if (list) {
          if (comments.length === 0) {
            list.innerHTML = '<div class="comment-empty-black"><svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>Belum ada komentar di Episode ' + ep + '</p></div>';
          } else {
            list.innerHTML = comments.map(watchCommentHTML).join("");
          }
        }
      });
    }
  }, 100);
}

function changeEpisode(n) {
  if (typeof stopCommentOverlay === "function") stopCommentOverlay();
  if (typeof stopListenComments === "function") stopListenComments();
  exitFakeFullscreen();
  var v = document.getElementById("video-player");
  if (v) {
    if (v.tagName === "VIDEO") {
      if (currentAnimeSlug && currentEpisode) {
        var time = v.currentTime;
        var duration = v.duration || 0;
        if (typeof saveWatchProgressLocal === "function") saveWatchProgressLocal(currentAnimeSlug, currentEpisode, time, duration);
        if (typeof saveWatchProgressToFirestore === "function") saveWatchProgressToFirestore(currentAnimeSlug, currentEpisode, time, duration);
      }
      if (typeof cleanupWatchPlayer === "function") cleanupWatchPlayer(v);
      if (typeof cleanupVideoControls === "function") cleanupVideoControls();
      v.pause();
      v.src = "";
    } else if (v.tagName === "IFRAME") {
      v.src = "";
    }
  }
  currentEpisode = Number(n);
  window.currentEpisode = currentEpisode;
  if (typeof updateUrl === "function" && currentAnimeSlug) updateUrl(currentAnimeSlug, currentEpisode);
  renderPage();
  window.scrollTo({ top: 0 });
}

function downloadVideo(url) {
  if (!url) { showToast("Video tidak tersedia"); return; }
  var a = document.createElement("a");
  a.href = url;
  a.download = "animeku-video.mp4";
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast("Download dimulai...");
}

function reportVideo() {
  if (confirm("Laporkan video ini bermasalah?")) showToast("Laporan dikirim. Terima kasih!");
}

function shareAnime(slug, title) {
  var url = window.location.origin + "/anime/" + slug;
  var shareData = { title: "Nonton " + title + " di AnimeKu", text: "Streaming " + title + " subtitle Indonesia di AnimeKu!", url: url };
  if (navigator.share) navigator.share(shareData).catch(function() {});
  else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function() { showToast("Link disalin!"); }).catch(function() { showToast("Link: " + url); });
  else showToast("Link: " + url);
}

/* ==================== SEND COMMENT ==================== */
async function sendComment() {
  var input = document.getElementById("comment-input");
  if (!input) return;
  var text = input.value.trim();
  if (!text) return;
  input.disabled = true;
  var replyId = replyToComment;
  replyToComment = null;
  var result = await sendCommentToFirestore(currentAnimeSlug, currentEpisode, text, replyId);
  input.disabled = false;
  if (!result) { showErrorToast("Gagal kirim komentar"); return; }
  input.value = "";
  input.placeholder = "Tulis komentar di Episode " + currentEpisode + "...";
  if (navigator.vibrate) navigator.vibrate(30);
  if (currentUser && currentUserProfile) {
    try {
      var newCount = (currentUserProfile.comments || 0) + 1;
      await fbUpdate(COLLECTIONS.USERS, currentUser.uid, { comments: newCount });
      currentUserProfile.comments = newCount;
      userProfile.comments = newCount;
      var idx = allUsers.findIndex(function(u) { return u.id === currentUser.uid; });
      if (idx > -1) allUsers[idx].comments = newCount;
    } catch (e) {}
  }
  showToast(replyId ? "Reply terkirim" : "Komentar terkirim");
}

function renderCommentSection() {
  var list = document.getElementById("comment-list");
  var count = document.getElementById("comment-count");
  if (!list) return;
  var episodeComments = getCommentsByEpisode(currentAnimeSlug, currentEpisode);
  if (count) count.textContent = episodeComments.length;
  if (episodeComments.length === 0) {
    list.innerHTML = '<div class="comment-empty-black"><svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>Belum ada komentar di Episode ' + currentEpisode + '</p></div>';
  } else {
    list.innerHTML = episodeComments.map(watchCommentHTML).join("");
  }
}

function replyComment(id) {
  replyToComment = id;
  var input = document.getElementById("comment-input");
  if (input) { input.focus(); input.placeholder = "Balas komentar..."; }
  showToast("Balas komentar");
}

async function likeComment(id) {
  if (!id) return;
  await toggleLikeComment(id);
}

async function deleteComment(id) {
  if (!confirm("Hapus komentar ini?")) return;
  var ok = await deleteCommentFromFirestore(id);
  if (ok) showSuccessToast("Komentar dihapus");
}

async function deleteReply(commentId, replyId) {
  if (!confirm("Hapus reply ini?")) return;
  var ok = await deleteReplyFromFirestore(commentId, replyId);
  if (ok) showSuccessToast("Reply dihapus");
}

/* ==================== WATCH COMMENT HTML ==================== */
function watchCommentHTML(c) {
  var isOwn = c.uid === (currentUser && currentUser.uid) || c.user === userProfile.username;
  var commenterUser = allUsers.find(function(u) { return u.username === c.user; });
  var avatarUrl = c.avatar || (commenterUser && commenterUser.avatar) || "https://i.pravatar.cc/150";
  var commenterLevel = (commenterUser && commenterUser.level) || c.level || 1;
  var commenterRank = (commenterUser && commenterUser.rank) || calculateRank(commenterLevel).name;
  var rankInfo = calculateRank(commenterLevel);
  var safeName = String(c.user || "").replace(/'/g, "\\'");
  var bannerUrl = (commenterUser && commenterUser.bannerUrl) || "";
  var bannerType = (commenterUser && commenterUser.bannerType) || "image";
  var hasBanner = !!bannerUrl;
  var isPremium = commenterUser && commenterUser.isPremium === true;
  var clanName = (commenterUser && commenterUser.clanName) || "";
  var clanColor = getClanColorForUser(commenterUser);

  var bannerHTML = "";
  if (hasBanner) {
    if (bannerType === "video") {
      bannerHTML = '<div class="watch-comment-banner-bg"><video src="' + bannerUrl + '" autoplay loop muted playsinline webkit-playsinline></video><div class="watch-comment-banner-overlay"></div></div>';
    } else {
      bannerHTML = '<div class="watch-comment-banner-bg"><img src="' + bannerUrl + '" alt=""><div class="watch-comment-banner-overlay"></div></div>';
    }
  }

  var likedBy = c.likedBy || [];
  var isLiked = likedBy.indexOf(currentUser && currentUser.uid) > -1;
  var likeCount = likedBy.length || c.likes || 0;

  return '<div class="watch-comment ' + (hasBanner ? "has-banner" : "") + '">' +
    bannerHTML +
    '<div class="watch-comment-inner">' +
    '<img class="comment-avatar comment-avatar-clickable" src="' + avatarUrl + '" alt="" onclick="openPublicProfile(\'' + safeName + '\')">' +
    '<div class="watch-comment-body">' +
    '<div class="watch-comment-name-row">' +
    '<span class="watch-comment-name comment-name-clickable" onclick="openPublicProfile(\'' + safeName + '\')">' + escapeHtml(c.user) + '</span>' +
    (commenterUser && commenterUser.verified ? '<img class="verified-badge" src="' + commenterUser.verified + '" alt="">' : "") +
    '<span class="watch-comment-id">' + c.userId + '</span>' +
    (isPremium ? '<span class="watch-comment-premium">PREMIUM</span>' : "") +
    (clanName ? '<span class="watch-comment-clan" style="--clan-color:' + clanColor + ';"><span class="clan-badge-shimmer"></span><span class="clan-badge-text">' + escapeHtml(clanName.toUpperCase()) + '</span></span>' : "") +
    '<span class="watch-comment-level">Lvl ' + commenterLevel + '</span>' +
    '<span class="watch-comment-rank" style="color:' + rankInfo.color + ';border-color:' + rankInfo.color + ';">' + commenterRank + '</span>' +
    '<span class="watch-comment-time">' + (typeof formatCommentTime === "function" ? formatCommentTime(c.createdAt) : (c.createdAt || "baru saja")) + '</span>' +
    '</div>' +
    '<div class="watch-comment-text">' + escapeHtml(c.content) + '</div>' +
    '<div class="watch-comment-footer">' +
    '<div class="comment-actions">' +
    '<span class="watch-comment-reply" onclick="replyComment(\'' + c.id + '\')">' + icons.reply + ' Reply</span>' +
    '<span class="watch-comment-like ' + (isLiked ? "liked" : "") + '" onclick="likeComment(\'' + c.id + '\')">' + (isLiked ? icons.heartFill : icons.heart) + '<span>' + likeCount + '</span></span>' +
    (isOwn ? '<span class="watch-comment-del" onclick="deleteComment(\'' + c.id + '\')">' + icons.trash + '</span>' : "") +
    '</div>' +
    '<span class="watch-comment-tag ' + (c.tag === "Epic" ? "tag-epic" : "tag-normal") + '">' + (c.tag || "Normal") + '</span>' +
    '</div>' +
    (c.replies && c.replies.length > 0
      ? '<div class="comment-replies-list">' +
        c.replies.map(function(r) {
          var safeReplyName = String(r.user || "").replace(/'/g, "\\'");
          var replyUser = allUsers.find(function(u) { return u.username === r.user; });
          var replyAvatar = r.avatar || (replyUser && replyUser.avatar) || "https://i.pravatar.cc/150";
          var isOwnReply = r.uid === (currentUser && currentUser.uid);
          return '<div class="comment-reply-item">' +
            '<img class="comment-reply-avatar comment-avatar-clickable" src="' + replyAvatar + '" alt="" onclick="openPublicProfile(\'' + safeReplyName + '\')">' +
            '<div style="flex:1;min-width:0;">' +
            '<div class="comment-reply-name comment-name-clickable" onclick="openPublicProfile(\'' + safeReplyName + '\')">' + escapeHtml(r.user) + '</div>' +
            '<div class="comment-reply-text">' + escapeHtml(r.content) + '</div>' +
            '<div style="font-size:9.5px;color:var(--text-mute);margin-top:2px;">' + (typeof formatCommentTime === "function" ? formatCommentTime(r.createdAt) : "") + '</div>' +
            '</div>' +
            (isOwnReply ? '<button class="member-kick-btn" style="width:24px;height:24px;border-radius:6px;" onclick="event.stopPropagation(); deleteReply(\'' + c.id + '\', \'' + r.id + '\')">' + icons.x + '</button>' : "") +
            '</div>';
        }).join("") +
        '</div>'
      : "") +
    '</div>' +
    '</div>' +
    '</div>';
}

/* ==================== LEADERBOARD ==================== */
var currentLeaderboardType = "giveaway";

function openLeaderboard(type) {
  unlockScroll();
  exitFakeFullscreen();
  watchFromTab = currentTab;
  currentLeaderboardType = type || "giveaway";
  currentTab = "leaderboard";
  watchOpen = false;
  stopAutoSlide();
  document.querySelectorAll(".nav-item").forEach(function(b) { b.classList.remove("active"); });
  renderPage();
  window.scrollTo({ top: 0 });
}

function renderLeaderboard(main) {
  var type = currentLeaderboardType;
  var data = [];
  var title = "";

  if (type === "giveaway") {
    var sortedByJoin = allUsers.slice().sort(function(a, b) { return calculateJoinDays(b) - calculateJoinDays(a); });
    data = sortedByJoin.slice(0, 100).map(function(u, i) {
      var days = calculateJoinDays(u);
      return { rank: i + 1, userId: u.userId, username: u.username, avatar: u.avatar, level: u.level, rankName: u.rank, clanName: u.clanName, clanColor: getClanColorForUser(u), verified: u.verified, isPremium: u.isPremium, scoreText: days + " hari" };
    });
    title = "Top Giveaway";
  } else if (type === "level") {
    var sorted = allUsers.slice().sort(function(a, b) { return (b.level || 0) - (a.level || 0); });
    data = sorted.slice(0, 100).map(function(u, i) {
      return { rank: i + 1, userId: u.userId, username: u.username, avatar: u.avatar, level: u.level, rankName: u.rank, clanName: u.clanName, clanColor: getClanColorForUser(u), verified: u.verified, isPremium: u.isPremium, scoreText: "Lvl " + (u.level || 1) };
    });
    title = "Top Level";
  } else if (type === "rank") {
    var rankOrder = { "Mythic": 1000, "Legend": 900, "Grandmaster": 800, "Master": 700, "Diamond": 600, "Platinum": 500, "Gold": 400, "Silver": 300, "Bronze": 200, "Rookie": 100 };
    var sorted2 = allUsers.slice().sort(function(a, b) {
      var ra = rankOrder[a.rank] || 0;
      var rb = rankOrder[b.rank] || 0;
      if (rb !== ra) return rb - ra;
      return (b.xp || 0) - (a.xp || 0);
    });
    data = sorted2.slice(0, 100).map(function(u, i) {
      return { rank: i + 1, userId: u.userId, username: u.username, avatar: u.avatar, level: u.level, rankName: u.rank, clanName: u.clanName, clanColor: getClanColorForUser(u), verified: u.verified, isPremium: u.isPremium, scoreText: u.rank || "Rookie" };
    });
    title = "Top Rank";
  } else if (type === "clan") {
    data = clanList.map(function(c) {
      var totalXp = calculateClanTotalXp(c.members, allUsers);
      return { rank: 0, id: c.id, name: c.name, logo: c.logo, color: c.color, memberCount: c.members.length, level: getClanLevel(totalXp), totalXp: totalXp, isClan: true };
    }).sort(function(a, b) { return b.totalXp - a.totalXp; }).map(function(c, i) { c.rank = i + 1; return c; }).slice(0, 100);
    title = "Top Clan";
  }

  var top3 = data.slice(0, 3);
  var rest = data.slice(3);

  main.innerHTML =
    '<div class="page-header fade-up" style="padding-top:20px;">' +
    '<button class="page-back" onclick="switchTab(\'home\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>' +
    '<div class="page-header-title">' + title + '</div>' +
    '</div>' +
    (top3.length >= 3 ? renderLeaderboardPodium(top3, type) : "") +
    '<div class="lb-section-title fade-up d1">Semua Peringkat</div>' +
    '<div class="lb-list fade-up d2">' +
    (rest.length === 0 ? '<p style="text-align:center;color:var(--text-mute);padding:40px 0;">Belum ada data</p>' : rest.map(function(item, i) { return renderLeaderboardRow(item, i + 4, type); }).join("")) +
    '</div>';
}

function renderLeaderboardPodium(top3, type) {
  var order = [top3[1], top3[0], top3[2]];
  var rankNums = [2, 1, 3];
  return '<div class="lb-podium fade-up d1">' +
    order.map(function(item, i) {
      if (!item) return "";
      if (type === "clan") {
        var logo = getClanLogo(item.logo);
        return '<div class="lb-podium-item rank-' + rankNums[i] + '" onclick="openClanDetail(\'' + item.id + '\')">' +
          '<div class="lb-podium-emblem" style="background:' + item.color + ';color:white;">' + logo + '<span class="lb-podium-badge">' + rankNums[i] + '</span></div>' +
          '<div class="lb-podium-name">' + escapeHtml(item.name) + '</div>' +
          '<div class="lb-podium-score">Lvl ' + item.level + '</div>' +
          '</div>';
      }
      var safeName = String(item.username || "").replace(/'/g, "\\'");
      var clanBadge = item.clanName ? '<span class="lb-clan-tag" style="--clan-color:' + item.clanColor + ';">' + escapeHtml(item.clanName.toUpperCase()) + '</span>' : "";
      var verifiedHTML = item.verified ? '<img class="verified-badge verified-badge-sm" src="' + item.verified + '" alt="">' : "";
      var premiumHTML = item.isPremium ? '<span class="lb-premium-tag">P</span>' : "";
      return '<div class="lb-podium-item rank-' + rankNums[i] + '" onclick="openPublicProfile(\'' + safeName + '\')">' +
        '<div class="lb-podium-avatar-wrap">' +
        '<img class="lb-podium-avatar" src="' + (item.avatar || 'https://i.pravatar.cc/150') + '" alt="">' +
        '<span class="lb-podium-badge">' + rankNums[i] + '</span>' +
        '</div>' +
        '<div class="lb-podium-name">' + escapeHtml(item.username) + verifiedHTML + '</div>' +
        premiumHTML +
        clanBadge +
        '<div class="lb-podium-score">' + item.scoreText + '</div>' +
        '</div>';
    }).join("") +
    '</div>';
}

function renderLeaderboardRow(item, rank, type) {
  if (type === "clan") {
    var logo = getClanLogo(item.logo);
    return '<div class="lb-row" onclick="openClanDetail(\'' + item.id + '\')">' +
      '<span class="lb-row-rank">#' + rank + '</span>' +
      '<span class="clan-emblem xs" style="background:' + item.color + ';color:white;">' + logo + '</span>' +
      '<div class="lb-row-info">' +
      '<div class="lb-row-name">' + escapeHtml(item.name) + '</div>' +
      '<div class="lb-row-meta"><span class="lb-row-id">' + item.memberCount + ' member</span></div>' +
      '</div>' +
      '<div class="lb-row-score">Lvl ' + item.level + '</div>' +
      '</div>';
  }

  var safeName = String(item.username || "").replace(/'/g, "\\'");
  var clanBadge = item.clanName ? '<span class="lb-clan-tag" style="--clan-color:' + item.clanColor + ';">' + escapeHtml(item.clanName.toUpperCase()) + '</span>' : "";
  var verifiedHTML = item.verified ? '<img class="verified-badge verified-badge-sm" src="' + item.verified + '" alt="">' : "";
  var premiumHTML = item.isPremium ? '<span class="lb-premium-tag">P</span>' : "";

  return '<div class="lb-row" onclick="openPublicProfile(\'' + safeName + '\')">' +
    '<span class="lb-row-rank">#' + rank + '</span>' +
    '<img class="lb-row-avatar" src="' + (item.avatar || 'https://i.pravatar.cc/150') + '" alt="">' +
    '<div class="lb-row-info">' +
    '<div class="lb-row-name">' + escapeHtml(item.username) + verifiedHTML + '</div>' +
    '<div class="lb-row-meta">' +
    '<span class="lb-row-id">' + (item.userId || '#?') + '</span>' +
    premiumHTML +
    clanBadge +
    '</div>' +
    '</div>' +
    '<div class="lb-row-score">' + item.scoreText + '</div>' +
    '</div>';
}

/* ==================== RIWAYAT ==================== */
function renderRiwayat(main) {
  var groups = {};
  historyList.forEach(function(h) {
    var key = formatDate(h.watchedAt);
    if (!groups[key]) groups[key] = [];
    groups[key].push(h);
  });
  main.innerHTML =
    '<h1 class="page-title fade-up">Riwayat Menonton</h1>' +
    '<p style="text-align:center;font-size:12px;color:var(--text-mute);margin-bottom:20px;">Tahan series untuk hapus</p>' +
    (Object.keys(groups).length === 0
      ? '<p style="text-align:center;color:var(--text-mute);padding:40px 0;">Belum ada riwayat</p>'
      : Object.keys(groups).map(function(date, idx) {
          return '<div class="history-group fade-up" style="animation-delay:' + (idx * 0.05) + 's">' +
            '<div class="history-date">' + date + '</div>' +
            groups[date].map(historyItemHTML).join("") +
            '</div>';
        }).join(""));
}

function historyItemHTML(item) {
  var percent = item.duration ? (item.progress / item.duration) * 100 : 0;
  return '<div class="history-item" onclick="openWatch(\'' + item.animeSlug + '\', ' + item.episode + ')" ontouchstart="startHoldTimer(\'' + item.animeSlug + '\', ' + item.episode + ')" ontouchend="clearHoldTimer()">' +
    '<div class="history-thumb"><img src="' + item.cover + '" alt=""></div>' +
    '<div class="history-info">' +
    '<div class="history-title">' + item.animeTitle + '</div>' +
    '<div class="history-ep">Episode ' + item.episode + '</div>' +
    '<div class="history-progress-bar"><div class="history-progress-fill" style="width:' + percent + '%"></div></div>' +
    '<div class="history-progress-time"><span>' + formatTime(item.progress) + '</span><span>' + formatTime(item.duration) + '</span></div>' +
    '</div>' +
    '</div>';
}

function startHoldTimer(slug, ep) {
  holdTimer = setTimeout(function() {
    if (confirm("Hapus dari riwayat?")) {
      var idx = historyList.findIndex(function(h) { return h.animeSlug === slug && Number(h.episode) === Number(ep); });
      if (idx > -1) {
        historyList.splice(idx, 1);
        saveHistory();
        var key = slug + "-ep" + ep;
        if (window.__watchProgress && window.__watchProgress[key]) {
          delete window.__watchProgress[key];
          if (typeof saveWatchProgress === "function") saveWatchProgress();
        }
        showToast("Dihapus dari riwayat");
        renderPage();
      }
    }
  }, 800);
}

function clearHoldTimer() { if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; } }

/* ==================== PROFIL ==================== */
function renderProfil(main) {
  var u = userProfile;
  var level = u.level || calculateLevel(u.xp || 0);
  var rank = calculateRank(level);
  var isMythic = rank.name.toLowerCase() === "mythic";
  var canBanner = isMythic || u.isPremium === true || level >= 200;
  var myClan = u.clanId ? clanList.find(function(c) { return c.id === u.clanId; }) : null;
  var clanColor = (myClan && myClan.color) || (u.clanName ? generateClanColor(u.clanName) : "");

  main.innerHTML =
    '<div class="profile-hero-wa fade-up">' +
    '<div class="profile-banner-wrap">' +
    renderProfileBanner(u) +
    '<div class="profile-avatar-center">' +
    '<img class="profile-avatar-big" src="' + u.avatar + '" alt="">' +
    '<div class="profile-cam" onclick="changeAvatar()">' + icons.camera + '</div>' +
    '</div>' +
    '</div>' +
    '<div class="profile-info-below">' +
    '<div class="profile-name-big">' +
    escapeHtml(u.username || "Guest") + (u.verified ? '<img class="verified-badge verified-badge-lg" src="' + u.verified + '" alt="">' : "") +
    '<span>' + (u.userId || "#?") + '</span>' +
    '</div>' +
    '<div class="profile-badges">' +
    '<span class="profile-badge">' + icons.star2 + ' Lvl. ' + level + '</span>' +
    '<span class="profile-badge" style="color:' + rank.color + ';">' + icons.trophy + ' ' + rank.name + '</span>' +
    (u.isPremium ? '<span class="profile-badge profile-badge-premium">PREMIUM</span>' : "") +
    (u.clanName ? '<span class="clan-badge-profile" style="--clan-color:' + clanColor + ';">' + icons.shield + '<span class="clan-badge-text">' + escapeHtml(u.clanName.toUpperCase()) + '</span></span>' : "") +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="profile-stats-5 fade-up d2">' +
    '<div class="stat-box"><div class="stat-value">' + Math.min(u.joinedMonths || 0, 999) + '</div><div class="stat-label">bulan</div></div>' +
    '<div class="stat-box"><div class="stat-value gradient-text">' + formatXP(u.xp || 0) + '</div><div class="stat-label">XP</div></div>' +
    '<div class="stat-box"><div class="stat-value">' + (u.comments || 0) + '</div><div class="stat-label">komentar</div></div>' +
    '<div class="stat-box"><div class="stat-value">' + (u.historyCount || 0) + '</div><div class="stat-label">riwayat</div></div>' +
    '<div class="stat-box"><div class="stat-value">' + (u.watchMinutes || 0) + '</div><div class="stat-label">menit</div></div>' +
    '</div>' +
    (canBanner ? '<div class="profile-banner-btn-wrap fade-up d2"><button class="profile-banner-btn" onclick="changeBanner()">' + icons.camera + ' Ganti Banner</button></div>' : "") +
    '<div class="profile-actions fade-up d2">' +
    '<button class="profile-action-btn" onclick="openClanPage()">' + icons.shield + ' Clan</button>' +
    '<button class="profile-action-btn" onclick="openAfinitas()">' + icons.star2 + ' Afinitas</button>' +
    '<button class="profile-action-btn" onclick="openSettings()">' + icons.settings + ' Pengaturan</button>' +
    '</div>' +
    '<div class="profile-actions fade-up d2" style="margin-top:-4px;">' +
    '<button class="profile-action-btn" style="background:rgba(239,68,68,0.12);color:#ef4444;border-color:rgba(239,68,68,0.3);" onclick="logout()">' + icons.logout + ' Logout</button>' +
    '</div>' +
    '<div class="profile-tabs fade-up d3">' +
    '<button class="profile-tab ' + (currentProfileTab === "komentar" ? "active" : "") + '" onclick="setProfileTab(\'komentar\')">Komentar</button>' +
    '<button class="profile-tab ' + (currentProfileTab === "favorit" ? "active" : "") + '" onclick="setProfileTab(\'favorit\')">Favorite</button>' +
    '<button class="profile-tab ' + (currentProfileTab === "histori" ? "active" : "") + '" onclick="setProfileTab(\'histori\')">Histori</button>' +
    '</div>' +
    '<div class="profile-content fade-up d4">' + renderProfileContent() + '</div>';
}

function setProfileTab(tab) { currentProfileTab = tab; renderPage(); }

function renderProfileContent() {
  if (currentProfileTab === "komentar") {
    var myComments = dummyComments.filter(function(c) { return c.user === userProfile.username; });
    return myComments.length === 0
      ? '<p style="text-align:center;color:var(--text-mute);padding:30px 0;">Belum ada komentar</p>'
      : myComments.slice(0, 5).map(function(c) {
          var safeName = String(c.user || "").replace(/'/g, "\\'");
          return '<div class="comment-item">' +
            '<img class="comment-avatar comment-avatar-clickable" src="' + userProfile.avatar + '" alt="" onclick="openPublicProfile(\'' + safeName + '\')">' +
            '<div class="comment-body">' +
            '<div class="comment-header">' +
            '<span class="comment-name comment-name-clickable" onclick="openPublicProfile(\'' + safeName + '\')">' + escapeHtml(c.user) + '</span>' +
            '<span class="comment-time">' + c.createdAt + '</span>' +
            '</div>' +
            '<div class="comment-text">' + escapeHtml(c.content) + '</div>' +
            '<div style="font-size:10px;color:var(--text-mute);margin-top:4px;">' + (c.animeSlug || "Anime") + ' - Episode ' + (c.episode || "-") + '</div>' +
            '</div>' +
            '</div>';
        }).join("");
  }
  if (currentProfileTab === "favorit") {
    return favoriteList.length === 0
      ? '<p style="text-align:center;color:var(--text-mute);padding:30px 0;">Belum ada Favorite</p>'
      : favoriteList.map(favItemHTML).join("");
  }
  if (currentProfileTab === "histori") {
    return historyList.length === 0
      ? '<p style="text-align:center;color:var(--text-mute);padding:30px 0;">Belum ada riwayat</p>'
      : historyList.slice(0, 5).map(historyItemHTML).join("");
  }
}

/* ==================== HALAMAN LAIN ==================== */
function openNotifikasi() {
  unlockScroll();
  exitFakeFullscreen();
  watchFromTab = currentTab;
  currentTab = "notifikasi"; watchOpen = false;
  stopAutoSlide();
  document.querySelectorAll(".nav-item").forEach(function(b) { b.classList.remove("active"); });
  renderPage(); window.scrollTo({ top: 0 });
}

function openPremium() {
  unlockScroll();
  exitFakeFullscreen();
  watchFromTab = currentTab;
  currentTab = "premium"; watchOpen = false;
  stopAutoSlide();
  document.querySelectorAll(".nav-item").forEach(function(b) { b.classList.remove("active"); });
  renderPage(); window.scrollTo({ top: 0 });
}

function openDiskusi() {
  if (typeof openGlobalChat === "function") openGlobalChat();
  else switchTab("global-chat");
}

function openPeliharaan() {
  unlockScroll();
  exitFakeFullscreen();
  watchFromTab = currentTab;
  currentTab = "peliharaan"; watchOpen = false;
  stopAutoSlide();
  renderPage(); window.scrollTo({ top: 0 });
}

function openAfinitas() {
  unlockScroll();
  exitFakeFullscreen();
  watchFromTab = currentTab;
  currentTab = "afinitas"; watchOpen = false;
  stopAutoSlide();
  renderPage(); window.scrollTo({ top: 0 });
}

function openSettings() {
  unlockScroll();
  exitFakeFullscreen();
  watchFromTab = currentTab;
  currentTab = "settings";
  watchOpen = false;
  stopAutoSlide();
  document.querySelectorAll(".nav-item").forEach(function(b) { b.classList.remove("active"); });
  renderPage();
  window.scrollTo({ top: 0 });
}

/* ==================== NOTIFIKASI ==================== */
function renderNotifikasi(main) {
  var readList = window.__notifRead || [];
  var unread = notificationsList.filter(function(n) { return readList.indexOf(n.id) === -1; }).length;
  var list = currentNotifTab === "belum" ? notificationsList.filter(function(n) { return readList.indexOf(n.id) === -1; }) : notificationsList;

  main.innerHTML =
    pageHeaderHTML("Notifikasi", "switchTab('home')") +
    '<div class="notif-tabs fade-up">' +
    '<button class="notif-tab ' + (currentNotifTab === "semua" ? "active" : "") + '" onclick="setNotifTab(\'semua\')">Semua</button>' +
    '<button class="notif-tab ' + (currentNotifTab === "belum" ? "active" : "") + '" onclick="setNotifTab(\'belum\')">Belum Dibaca ' + (unread > 0 ? '(' + unread + ')' : "") + '</button>' +
    '</div>' +
    '<div class="fade-up d1">' +
    (list.length === 0
      ? '<p style="text-align:center;color:var(--text-mute);padding:40px 0;">Tidak ada notifikasi</p>'
      : list.map(renderNotifItemHTML).join("")) +
    '</div>';
}

function renderNotifItemHTML(n) {
  var readList = window.__notifRead || [];
  var isUnread = readList.indexOf(n.id) === -1;

  var isAnimeNotif = n.targetType === "anime" && n.targetId;
  var anime = isAnimeNotif ? getAnimeBySlug(n.targetId) : null;

  var clickAction = "markNotifRead('" + n.id + "')";
  if (isAnimeNotif) {
    clickAction = "openNotifAnime('" + n.id + "', '" + n.targetId + "')";
  } else if (n.targetType === "user" && n.targetId) {
    clickAction = "markNotifRead('" + n.id + "')";
  }

  var typeIcon = n.type === "update" ? icons.play : n.type === "comment" ? icons.chat : icons.star;

  if (isAnimeNotif && anime && anime.cover) {
    return '<div class="notif-item notif-item-anime ' + (isUnread ? "unread" : "") + '" onclick="' + clickAction + '">' +
      '<div class="notif-poster-wrap">' +
      '<img class="notif-poster" src="' + escapeHtml(anime.cover) + '" alt="' + escapeHtml(anime.title || "") + '" loading="lazy">' +
      '<div class="notif-poster-overlay">' +
      '<div class="notif-poster-icon">' + typeIcon + '</div>' +
      '</div>' +
      (isUnread ? '<div class="notif-poster-dot"></div>' : "") +
      '</div>' +
      '<div class="notif-body">' +
      '<div class="notif-badge notif-badge-anime">' + escapeHtml(n.targetLabel || anime.title || "Anime") + '</div>' +
      '<div class="notif-title">' + escapeHtml(n.title || "") + '</div>' +
      '<div class="notif-msg">' + escapeHtml(n.message || "") + '</div>' +
      '<div class="notif-footer">' +
      '<span class="notif-time">' + (n.time || "") + '</span>' +
      '<span class="notif-cta">Tonton ' + icons.chevronRight + '</span>' +
      '</div>' +
      '</div>' +
      '</div>';
  }

  var badgeHTML = "";
  if (n.targetType === "anime" && n.targetLabel) {
    badgeHTML = '<span class="notif-badge notif-badge-anime">' + escapeHtml(n.targetLabel) + '</span>';
  } else if (n.targetType === "user" && n.targetLabel) {
    badgeHTML = '<span class="notif-badge notif-badge-user">' + escapeHtml(n.targetLabel) + '</span>';
  }

  var arrowHTML = isAnimeNotif
    ? '<span class="notif-arrow">' + icons.chevronRight + '</span>'
    : "";

  return '<div class="notif-item ' + (isUnread ? "unread" : "") + '" onclick="' + clickAction + '">' +
    '<div class="notif-icon type-' + n.type + '">' + typeIcon + '</div>' +
    '<div class="notif-body">' +
    (badgeHTML ? '<div class="notif-badge-wrap">' + badgeHTML + '</div>' : "") +
    '<div class="notif-title">' + escapeHtml(n.title || "") + '</div>' +
    '<div class="notif-msg">' + escapeHtml(n.message || "") + '</div>' +
    '<div class="notif-time">' + (n.time || "") + '</div>' +
    '</div>' +
    arrowHTML +
    '</div>';
}

function openNotifAnime(notifId, animeSlug) {
  window.__notifRead = window.__notifRead || [];
  if (window.__notifRead.indexOf(notifId) === -1) {
    window.__notifRead.push(notifId);
    saveNotifRead();
  }

  if (animeSlug && typeof openAnime === "function") {
    openAnime(animeSlug);
  } else {
    renderPage();
  }
}

function setNotifTab(tab) { currentNotifTab = tab; renderPage(); }

function markNotifRead(id) {
  window.__notifRead = window.__notifRead || [];
  if (window.__notifRead.indexOf(id) === -1) {
    window.__notifRead.push(id);
    saveNotifRead();
    renderPage();
  }
}

function renderPremium(main) {
  var isPremium = userProfile && userProfile.isPremium === true;
  main.innerHTML =
    pageHeaderHTML("Premium", "switchTab('home')") +
    (isPremium
      ? '<div class="premium-hero fade-up d1">' +
        '<div class="premium-hero-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg></div>' +
        '<div class="premium-hero-title">Kamu Udah Premium</div>' +
        '<div class="premium-hero-sub">Nikmati akses stiker, ganti banner, verified badge, dan kualitas 1080p.</div>' +
        '</div>'
      : '<div class="premium-hero fade-up d1">' +
        '<div class="premium-hero-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg></div>' +
        '<div class="premium-hero-title">AnimeKu Premium</div>' +
        '<div class="premium-hero-sub">Buka stiker, ganti banner, verified badge, dan kualitas 1080p.</div>' +
        '</div>' +
        '<div class="plan-list fade-up d2">' +
        (premiumPlans.length === 0
          ? '<p style="text-align:center;color:var(--text-mute);padding:20px 0;">Belum ada paket premium</p>'
          : premiumPlans.map(function(p) {
              return '<div class="plan-card ' + (p.popular ? "popular" : "") + '" onclick="buyPremium(\'' + escapeHtml(p.name) + '\')">' +
                (p.popular ? '<span class="plan-popular-tag">Populer</span>' : "") +
                '<div class="plan-name">' + escapeHtml(p.name) + '</div>' +
                '<div class="plan-price">' + escapeHtml(p.price) + '</div>' +
                '<div class="plan-period">' + escapeHtml(p.period) + '</div>' +
                '<div class="plan-features">' + (p.features || []).map(function(f) { return '<div class="plan-feature">' + icons.check + '<span>' + escapeHtml(f) + '</span></div>'; }).join("") + '</div>' +
                '</div>';
            }).join("")) +
        '</div>' +
        '<button class="premium-buy-btn fade-up d3" onclick="buyPremium(\'Pilihanmu\')">Beli Premium Sekarang</button>');
}

function buyPremium(plan) { showToast("Paket " + plan + " dipilih. Pembayaran segera hadir!"); }

function renderDiskusi(main) { if (typeof renderGlobalChat === "function") renderGlobalChat(main); }

function renderPeliharaan(main) {
  main.innerHTML =
    pageHeaderHTML("Peliharaan", "switchTab('profil')") +
    '<div class="feature-hero fade-up d1">' +
    '<div class="feature-icon-big">' + icons.paw + '</div>' +
    '<div class="feature-title">Peliharaan</div>' +
    '<div class="feature-sub">Kumpulkan karakter anime favoritmu dan rawat mereka di sini. Fitur segera hadir!</div>' +
    '</div>';
}

/* ==================== AFINITAS ==================== */
function renderAfinitas(main) {
  var u = userProfile;
  var level = u.level || calculateLevel(u.xp || 0);
  var rank = calculateRank(level);

  var userGenres = {};
  favoriteList.forEach(function(f) {
    var anime = getAnimeBySlug(f.animeSlug);
    if (anime && anime.genres) anime.genres.forEach(function(g) { userGenres[g] = (userGenres[g] || 0) + 2; });
  });
  historyList.forEach(function(h) {
    var anime = getAnimeBySlug(h.animeSlug);
    if (anime && anime.genres) anime.genres.forEach(function(g) { userGenres[g] = (userGenres[g] || 0) + 1; });
  });

  var characters = animeList.slice(0, 20).map(function(anime) {
    var matchScore = 0;
    var totalGenres = (anime.genres || []).length;
    if (totalGenres > 0 && Object.keys(userGenres).length > 0) {
      var hitGenres = 0;
      anime.genres.forEach(function(g) { if (userGenres[g]) hitGenres += userGenres[g]; });
      var maxPossible = Math.max.apply(null, Object.values(userGenres)) * totalGenres;
      matchScore = maxPossible > 0 ? Math.min(100, Math.round((hitGenres / maxPossible) * 100)) : 0;
    }
    if (matchScore === 0) matchScore = Math.round((anime.rating || 7) * 10);
    matchScore = Math.max(50, matchScore);
    var colors = ["#a855f7", "#ec4899", "#06b6d4", "#f59e0b", "#10b981", "#f43f5e", "#8b5cf6", "#14b8a6"];
    return { id: anime.slug, name: anime.title, role: anime.studio || anime.type || "Anime", match: matchScore, avatar: anime.cover, color: colors[anime.title.length % colors.length], genres: anime.genres || [] };
  });

  var topCharacters = characters.sort(function(a, b) { return b.match - a.match; }).slice(0, 4);
  var similarUsers = allUsers
    .filter(function(x) { return x.username !== u.username; })
    .map(function(x) {
      var levelDiff = Math.abs((x.level || 1) - level);
      var match = Math.max(40, Math.min(99, 100 - levelDiff * 2));
      return Object.assign({}, x, { match: match });
    })
    .sort(function(a, b) { return b.match - a.match; })
    .slice(0, 5);
  var totalMatch = topCharacters.length > 0 ? Math.round(topCharacters.reduce(function(sum, c) { return sum + c.match; }, 0) / topCharacters.length) : 0;

  main.innerHTML =
    '<div class="afinitas-page">' +
    '<div class="afinitas-topbar">' +
    '<button class="afinitas-back" onclick="switchTab(\'profil\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>' +
    '<div class="afinitas-title">Afinitas</div>' +
    '<button class="afinitas-help" onclick="showToast(\'Afinitas dihitung dari genre anime favoritmu\')">?</button>' +
    '</div>' +
    '<div class="afinitas-hero">' +
    '<img class="afinitas-hero-avatar" src="' + u.avatar + '" alt="">' +
    '<div class="afinitas-hero-name">' + escapeHtml(u.username || "Guest") + '</div>' +
    '<div class="afinitas-hero-rank" style="color:' + rank.color + ';">' + rank.name + ' - Lvl ' + level + '</div>' +
    '<div class="afinitas-hero-score">' + totalMatch + '%</div>' +
    '<div class="afinitas-hero-label">Total Afinitas</div>' +
    '<div class="afinitas-hero-bar"><div class="afinitas-hero-bar-fill" id="afinitas-hero-fill" style="width:0%"></div></div>' +
    '</div>' +
    '<div class="afinitas-section">' +
    '<div class="afinitas-section-head">' +
    '<div class="afinitas-section-title">Karakter Afinitas</div>' +
    '<div class="afinitas-section-count">' + topCharacters.length + ' karakter</div>' +
    '</div>' +
    (topCharacters.length === 0
      ? '<div class="afinitas-empty"><p>Belum ada data anime</p></div>'
      : topCharacters.map(function(c, i) {
          return '<div class="afinitas-card" onclick="openAfinitasCharModal(' + i + ')">' +
            '<div class="afinitas-card-avatar">' +
            '<img src="' + c.avatar + '" alt="">' +
            '<div class="afinitas-card-badge" style="background:' + c.color + ';">' + c.match + '%</div>' +
            '</div>' +
            '<div class="afinitas-card-info">' +
            '<div class="afinitas-card-name">' + escapeHtml(c.name) + '</div>' +
            '<div class="afinitas-card-role">' + escapeHtml(c.role) + '</div>' +
            '<div class="afinitas-card-bar"><div class="afinitas-card-bar-fill" style="width:0%;background:' + c.color + ';" data-width="' + c.match + '%"></div></div>' +
            '</div>' +
            '</div>';
        }).join("")) +
    '</div>' +
    '<div class="afinitas-section">' +
    '<div class="afinitas-section-head">' +
    '<div class="afinitas-section-title">User dengan Level Mirip</div>' +
    '<div class="afinitas-section-count">' + similarUsers.length + ' user</div>' +
    '</div>' +
    (similarUsers.length === 0
      ? '<div class="afinitas-empty"><p>Belum ada user lain</p></div>'
      : similarUsers.map(function(x) {
          return '<div class="afinitas-user" onclick="openPublicProfile(\'' + String(x.username).replace(/'/g, "\\'") + '\')">' +
            '<img class="afinitas-user-avatar" src="' + x.avatar + '" alt="">' +
            '<div class="afinitas-user-info">' +
            '<div class="afinitas-user-name">' + escapeHtml(x.username) + '</div>' +
            '<div class="afinitas-user-rank">' + (x.rank || "Rookie") + ' - Lvl ' + (x.level || 1) + '</div>' +
            '</div>' +
            '<div class="afinitas-user-match">' + x.match + '%</div>' +
            '</div>';
        }).join("")) +
    '</div>' +
    '</div>' +
    '<div class="afinitas-modal" id="afinitas-modal"><div class="afinitas-modal-card" id="afinitas-modal-card"></div></div>';

  window.__afinitasChars = topCharacters;
  setTimeout(function() {
    var heroFill = document.getElementById("afinitas-hero-fill");
    if (heroFill) heroFill.style.width = totalMatch + "%";
    document.querySelectorAll(".afinitas-card-bar-fill").forEach(function(el) { el.style.width = el.dataset.width; });
  }, 200);
}

function openAfinitasCharModal(index) {
  var chars = window.__afinitasChars || [];
  var c = chars[index];
  if (!c) return;
  var modal = document.getElementById("afinitas-modal");
  var card = document.getElementById("afinitas-modal-card");
  if (!modal || !card) return;

  var userGenres = {};
  favoriteList.forEach(function(f) {
    var anime = getAnimeBySlug(f.animeSlug);
    if (anime && anime.genres) anime.genres.forEach(function(g) { userGenres[g] = true; });
  });
  historyList.forEach(function(h) {
    var anime = getAnimeBySlug(h.animeSlug);
    if (anime && anime.genres) anime.genres.forEach(function(g) { userGenres[g] = true; });
  });
  var matchedGenres = (c.genres || []).filter(function(g) { return userGenres[g]; });

  card.innerHTML =
    '<img class="afinitas-modal-avatar" src="' + c.avatar + '" alt="" style="border-color:' + c.color + ';">' +
    '<div class="afinitas-modal-name">' + escapeHtml(c.name) + '</div>' +
    '<div class="afinitas-modal-role">' + escapeHtml(c.role) + '</div>' +
    '<div class="afinitas-modal-match">' + c.match + '%</div>' +
    '<div class="afinitas-modal-match-label">Cocok</div>' +
    '<div class="afinitas-modal-desc">' +
    (matchedGenres.length > 0
      ? 'Kamu cocok dengan <b>' + escapeHtml(c.name) + '</b> karena genre: <b>' + matchedGenres.map(escapeHtml).join(", ") + '</b>'
      : 'Tonton lebih banyak anime ' + escapeHtml(c.role) + ' biar afinitasmu makin tinggi!') +
    '</div>' +
    '<button class="afinitas-modal-close" onclick="closeAfinitasModal()">Tutup</button>';
  modal.classList.add("show");
}

function closeAfinitasModal() {
  var modal = document.getElementById("afinitas-modal");
  if (modal) modal.classList.remove("show");
}

/* ==================== PROFIL PUBLIK ==================== */
function openPublicProfile(username) {
  unlockScroll();
  exitFakeFullscreen();
  currentPublicUser = getPublicUser(username);
  currentPublicTab = "info";
  watchFromTab = currentTab;
  currentTab = "public-profile";
  watchOpen = false;
  stopAutoSlide();
  document.querySelectorAll(".nav-item").forEach(function(b) { b.classList.remove("active"); });
  renderPage();
  window.scrollTo({ top: 0 });
}

function renderPublicProfile(main) {
  var u = currentPublicUser;
  if (!u) { switchTab("home"); return; }
  var level = u.level || calculateLevel(u.xp || 0);
  var rank = calculateRank(level);
  var clanObj = u.clanId ? clanList.find(function(c) { return c.id === u.clanId; }) : clanList.find(function(c) { return c.name === u.clanName; });
  var clanColor = (clanObj && clanObj.color) || (u.clanName ? generateClanColor(u.clanName) : "");

  main.innerHTML =
    '<div class="page-header fade-up">' +
    '<button class="page-back" onclick="goBackFromProfile()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>' +
    '<div class="page-header-title">Profil ' + escapeHtml(u.username) + '</div>' +
    '</div>' +
    '<div class="profile-hero-wa fade-up d1">' +
    '<div class="profile-banner-wrap">' +
    renderProfileBanner(u) +
    '<div class="profile-avatar-center"><img class="profile-avatar-big" src="' + u.avatar + '" alt=""></div>' +
    '</div>' +
    '<div class="profile-info-below">' +
    '<div class="profile-name-big">' + escapeHtml(u.username) + (u.verified ? '<img class="verified-badge verified-badge-lg" src="' + u.verified + '" alt="">' : "") + ' <span>' + u.userId + '</span></div>' +
    '<div class="profile-badges">' +
    '<span class="profile-badge">' + icons.star2 + ' Lvl. ' + level + '</span>' +
    '<span class="profile-badge" style="color:' + rank.color + ';">' + icons.trophy + ' ' + rank.name + '</span>' +
    (u.isPremium ? '<span class="profile-badge profile-badge-premium">PREMIUM</span>' : "") +
    (u.clanName ? '<span class="clan-badge-profile" style="--clan-color:' + clanColor + ';">' + icons.shield + '<span class="clan-badge-text">' + escapeHtml(u.clanName.toUpperCase()) + '</span></span>' : "") +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="profile-stats-5 fade-up d2">' +
    '<div class="stat-box"><div class="stat-value">' + Math.min(u.joinedMonths || 0, 999) + '</div><div class="stat-label">bulan</div></div>' +
    '<div class="stat-box"><div class="stat-value gradient-text">' + formatXP(u.xp || 0) + '</div><div class="stat-label">XP</div></div>' +
    '<div class="stat-box"><div class="stat-value">' + formatViews(u.comments || 0) + '</div><div class="stat-label">komentar</div></div>' +
    '<div class="stat-box"><div class="stat-value">' + formatViews(u.historyCount || 0) + '</div><div class="stat-label">riwayat</div></div>' +
    '<div class="stat-box"><div class="stat-value">' + formatViews(u.followers || 0) + '</div><div class="stat-label">follower</div></div>' +
    '</div>' +
    '<div class="profile-actions fade-up d2">' +
    '<button class="profile-action-btn" onclick="followUser(\'' + String(u.username).replace(/'/g, "\\'") + '\')">' + icons.heart + ' Ikuti</button>' +
    '<button class="profile-action-btn" onclick="shareProfile(\'' + String(u.username).replace(/'/g, "\\'") + '\')">' + icons.share + ' Bagikan</button>' +
    '</div>' +
    '<div class="public-info-card fade-up d3">' +
    '<div class="public-info-row"><span class="public-info-label">Total Nonton</span><span class="public-info-value">' + formatViews(u.watchMinutes || 0) + ' menit</span></div>' +
    '<div class="public-info-row"><span class="public-info-label">Rank</span><span class="public-info-value" style="color:' + rank.color + ';">' + rank.name + '</span></div>' +
    '<div class="public-info-row"><span class="public-info-label">Followers</span><span class="public-info-value">' + formatViews(u.followers || 0) + '</span></div>' +
    '<div class="public-info-row"><span class="public-info-label">Bergabung</span><span class="public-info-value">' + (u.joinedMonths || 0) + ' bulan lalu</span></div>' +
    '</div>';
}

function goBackFromProfile() {
  if (watchFromTab === "search") openSearch();
  else switchTab(watchFromTab || "home");
}

function followUser(username) { showToast("Kamu sekarang mengikuti " + username + "!"); }

function shareProfile(username) {
  var u = getPublicUser(username);
  var url = window.location.origin + "/profil/" + username;
  var shareData = { title: "Profil " + username + " di AnimeKu", text: "Cek profil " + username + " (Lvl " + u.level + ") di AnimeKu!", url: url };
  if (navigator.share) navigator.share(shareData).catch(function() {});
  else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function() { showToast("Link disalin!"); }).catch(function() { showToast("Link: " + url); });
  else showToast("Link: " + url);
}

/* ==================== DETAIL ANIME ==================== */
function renderDetail(main) {
  var anime = getAnimeBySlug(currentAnimeSlug);
  if (!anime) {
    console.error("❌ Anime gak ketemu:", currentAnimeSlug);
    showToast("Anime gak ditemukan");
    currentTab = "home";
    renderPage();
    return;
  }
  var fav = isFavorited(anime.slug);
  var related = (typeof getRelatedAnime === "function") ? getRelatedAnime(anime, 6) : [];

  main.innerHTML =
    '<div class="detail-page">' +
    '<div class="detail-banner">' +
    '<img src="' + anime.banner + '" alt="">' +
    '<div class="detail-banner-overlay"></div>' +
    '<button class="detail-back" onclick="goBackFromDetail()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>' +
    '</div>' +
    '<div class="detail-info">' +
    '<div class="detail-poster">' +
    '<img src="' + anime.cover + '" alt="">' +
    '<span class="detail-poster-badge">' + (anime.type || "TV") + '</span>' +
    '</div>' +
    '<div class="detail-meta">' +
    '<h1 class="detail-title">' + escapeHtml(anime.title) + '</h1>' +
    '<div class="detail-stats">' +
    '<span class="detail-stat">' + icons.star + '<span>' + Number(anime.rating || 0).toFixed(1) + '</span></span>' +
    '<span class="detail-stat">' + icons.eye + '<span>' + formatViews(anime.views) + '</span></span>' +
    '</div>' +
    '<div class="detail-info-row">' +
    '<span class="detail-info-chip">' + escapeHtml(anime.studio || "—") + '</span>' +
    '<span class="detail-info-chip">' + (anime.year || "—") + '</span>' +
    '<span class="detail-info-chip ' + (anime.status === "ongoing" ? "chip-live" : "") + '">' + (anime.status === "ongoing" ? "Ongoing" : "Completed") + '</span>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="detail-genres">' + (anime.genres || []).map(function(g) { return '<span class="detail-genre" onclick="openGenreFromDetail(\'' + String(g).replace(/'/g, "\\'") + '\')">' + escapeHtml(g) + '</span>'; }).join("") + '</div>' +
    '<div class="detail-actions">' +
    '<button class="detail-btn-primary" onclick="openWatch(\'' + anime.slug + '\', 1)">' + icons.play + ' Tonton Sekarang</button>' +
    '<button class="detail-btn-secondary ' + (fav ? "active" : "") + '" onclick="toggleFav(\'' + anime.slug + '\')">' + (fav ? icons.heartFill : icons.heart) + ' ' + (fav ? "Favorit" : "Tambah Favorite") + '</button>' +
    '</div>' +
    '<div class="detail-section">' +
    '<h3 class="detail-section-title">Sinopsis</h3>' +
    '<p class="detail-synopsis" id="detail-synopsis">' + escapeHtml(anime.synopsis) + '</p>' +
    '<button class="detail-more" id="detail-more-btn" onclick="toggleSynopsis()">Selengkapnya</button>' +
    '</div>' +
    '<div class="detail-section">' +
    '<h3 class="detail-section-title">Episode</h3>' +
    '<div class="episode-grid" id="detail-episode-grid"><p style="color:var(--text-mute);font-size:12px;padding:8px 0;">Memuat episode...</p></div>' +
    '</div>' +
    (related.length > 0 ? '<div class="detail-section"><h3 class="detail-section-title">Anime Terkait</h3><div class="anime-grid-3">' + related.map(animeCardHTML).join("") + '</div></div>' : "") +
    '</div>';

  setTimeout(function() {
    var syn = document.getElementById("detail-synopsis");
    var btn = document.getElementById("detail-more-btn");
    if (syn && btn) { if (syn.scrollHeight <= syn.clientHeight + 10) btn.style.display = "none"; }
  }, 50);

  (async function() {
    var eps = await fbGetSubcollection("anime", anime.slug, "episode");
    var grid = document.getElementById("detail-episode-grid");
    if (grid) {
      grid.innerHTML = eps.length > 0
        ? eps.map(function(e) { return '<div class="ep-item" onclick="openWatch(\'' + anime.slug + '\', ' + Number(e.id) + ')">' + e.id + '</div>'; }).join("")
        : '<p style="color:var(--text-mute);font-size:12px;padding:8px 0;">Belum ada episode</p>';
    }
  })();
}

function goBackFromDetail() {
  if (watchFromTab === "search") openSearch();
  else switchTab(watchFromTab || "home");
}

function toggleSynopsis() {
  var syn = document.getElementById("detail-synopsis");
  var btn = document.getElementById("detail-more-btn");
  if (!syn || !btn) return;
  if (syn.classList.contains("expanded")) { syn.classList.remove("expanded"); btn.textContent = "Selengkapnya"; }
  else { syn.classList.add("expanded"); btn.textContent = "Sembunyikan"; }
}

function openGenreFromDetail(genre) {
  unlockScroll();
  searchGenre = genre;
  currentTab = "search";
  searchQuery = "";
  var nav = document.getElementById("bottom-nav");
  if (nav) nav.style.display = "flex";
  renderPage();
  window.scrollTo({ top: 0 });
}

/* ==================== CLAN PAGE ==================== */
function openClanPage() {
  unlockScroll();
  exitFakeFullscreen();
  watchFromTab = currentTab;
  currentTab = "clan";
  currentClanTab = userProfile.clanId ? "my" : "browse";
  watchOpen = false;
  stopAutoSlide();
  document.querySelectorAll(".nav-item").forEach(function(b) { b.classList.remove("active"); });
  renderPage();
  window.scrollTo({ top: 0 });
}

function renderClanPage(main) {
  var myClan = userProfile.clanId ? clanList.find(function(c) { return c.id === userProfile.clanId; }) : null;
  main.innerHTML =
    '<div class="clan-page">' +
    '<div class="clan-topbar">' +
    '<button class="clan-back" onclick="switchTab(\'profil\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>' +
    '<div class="clan-title">Clan</div>' +
    '</div>' +
    '<div class="clan-tabs">' +
    (myClan ? '<button class="clan-tab ' + (currentClanTab === "my" ? "active" : "") + '" onclick="setClanTab(\'my\')">Clan Saya</button>' : "") +
    '<button class="clan-tab ' + (currentClanTab === "browse" ? "active" : "") + '" onclick="setClanTab(\'browse\')">Cari Clan</button>' +
    (!myClan ? '<button class="clan-tab ' + (currentClanTab === "create" ? "active" : "") + '" onclick="setClanTab(\'create\')">Bikin Clan</button>' : "") +
    '</div>' +
    '<div class="clan-body">' +
    (currentClanTab === "my" && myClan ? renderMyClan(myClan) : "") +
    (currentClanTab === "browse" ? renderBrowseClan() : "") +
    (currentClanTab === "create" && !myClan ? renderCreateClanForm() : "") +
    '</div>' +
    '</div>';
  setTimeout(function() {
    document.querySelectorAll(".clan-progress-fill").forEach(function(el) {
      if (el.dataset.width) el.style.width = el.dataset.width;
    });
  }, 200);
}

function setClanTab(tab) { currentClanTab = tab; renderPage(); }

function renderMyClan(clan) {
  var totalXp = calculateClanTotalXp(clan.members, allUsers);
  var progress = clanLevelProgress(totalXp);
  var isLeader = clan.leaderId === (currentUser && currentUser.uid);
  var logoHTML = getClanLogo(clan.logo);
  return '<div class="clan-card fade-up">' +
    '<div class="clan-card-header">' +
    '<div class="clan-emblem" style="background:' + clan.color + ';color:white;">' + logoHTML + '</div>' +
    '<div class="clan-header-info">' +
    '<div class="clan-name-lg">' + escapeHtml(clan.name) + '</div>' +
    '<div class="clan-tag-lg">' + (clan.tag ? escapeHtml(clan.tag) + " - " : "") + 'Leader: ' + escapeHtml(clan.leaderName) + '</div>' +
    '</div>' +
    '</div>' +
    (clan.description ? '<div class="clan-desc">"' + escapeHtml(clan.description) + '"</div>' : "") +
    '<div class="clan-stats-row">' +
    '<div class="clan-stat-box"><div class="clan-stat-value">' + clan.members.length + '/' + clan.maxMembers + '</div><div class="clan-stat-label">Member</div></div>' +
    '<div class="clan-stat-box"><div class="clan-stat-value gradient">Lvl ' + progress.level + '</div><div class="clan-stat-label">Level</div></div>' +
    '<div class="clan-stat-box"><div class="clan-stat-value">' + formatXP(totalXp) + '</div><div class="clan-stat-label">Total XP</div></div>' +
    '</div>' +
    '<div class="clan-progress-wrap">' +
    '<div class="clan-progress-label"><span>Progress Lvl ' + (progress.level + 1) + '</span><span>' + progress.percent + '%</span></div>' +
    '<div class="clan-progress-bar"><div class="clan-progress-fill" data-width="' + progress.percent + '%" style="width:0%"></div></div>' +
    '</div>' +
    '<div class="clan-actions-row">' +
    (isLeader
      ? '<button class="clan-btn clan-btn-secondary" onclick="openEditClanModal()">' + icons.edit + ' Edit</button>' +
        '<button class="clan-btn clan-btn-danger" onclick="disbandClan()">' + icons.trash + ' Bubarkan</button>'
      : '<button class="clan-btn clan-btn-danger" onclick="leaveClan()">' + icons.exit + ' Keluar Clan</button>') +
    '</div>' +
    '</div>' +
    '<div class="clan-section fade-up d1">' +
    '<div class="clan-section-head">' +
    '<div class="clan-section-title">Anggota Clan</div>' +
    '<div class="clan-section-count">' + clan.members.length + ' orang</div>' +
    '</div>' +
    clan.members.map(function(m) { return renderMemberItem(m, isLeader, clan); }).join("") +
    '</div>';
}

function renderMemberItem(member, isLeader, clan) {
  var user = allUsers.find(function(u) { return u.userId === member.userId || u.username === member.username; });
  var level = (user && user.level) || 1;
  var rank = calculateRank(level);
  var avatar = (user && user.avatar) || member.avatar || "https://i.pravatar.cc/150";
  var isLeaderMember = member.userId === clan.leaderId;
  var safeName = String(member.username || "").replace(/'/g, "\\'");
  return '<div class="member-item" onclick="openPublicProfile(\'' + safeName + '\')">' +
    '<img class="member-avatar" src="' + avatar + '" alt="">' +
    '<div class="member-info">' +
    '<div class="member-name-row">' +
    '<span class="member-name">' + escapeHtml(member.username || "Unknown") + '</span>' +
    (isLeaderMember ? '<span class="member-role leader">Leader</span>' : '<span class="member-role member">Member</span>') +
    '</div>' +
    '<div class="member-meta" style="color:' + rank.color + ';">' + rank.name + ' - Lvl ' + level + '</div>' +
    '</div>' +
    (isLeader && !isLeaderMember ? '<button class="member-kick-btn" onclick="event.stopPropagation(); kickMember(\'' + safeName + '\')">' + icons.x + '</button>' : "") +
    '</div>';
}

function renderBrowseClan() {
  var openClans = clanList;
  if (openClans.length === 0) {
    return '<div class="clan-empty-state fade-up">' +
      '<div class="clan-empty-icon">' + icons.shield + '</div>' +
      '<div class="clan-empty-title">Belum Ada Clan</div>' +
      '<div class="clan-empty-sub">Jadilah yang pertama bikin clan!</div>' +
      (!userProfile.clanId ? '<button class="clan-action-btn" onclick="setClanTab(\'create\')">' + icons.plus + ' Bikin Clan Baru</button>' : "") +
      '</div>';
  }
  return '<div class="clan-section-head fade-up">' +
    '<div class="clan-section-title">Daftar Clan</div>' +
    '<div class="clan-section-count">' + openClans.length + ' clan</div>' +
    '</div>' +
    openClans.map(function(c) {
      var totalXp = calculateClanTotalXp(c.members, allUsers);
      var full = c.members.length >= c.maxMembers;
      var logoHTML = getClanLogo(c.logo);
      return '<div class="clan-list-item fade-up">' +
        '<div class="clan-emblem sm" style="background:' + c.color + ';color:white;">' + logoHTML + '</div>' +
        '<div class="clan-list-info" onclick="openClanDetail(\'' + c.id + '\')">' +
        '<div class="clan-list-name">' + escapeHtml(c.name) + '</div>' +
        '<div class="clan-list-meta">Lvl ' + getClanLevel(totalXp) + ' - ' + c.members.length + '/' + c.maxMembers + ' member</div>' +
        '</div>' +
        (full ? '<button class="clan-list-join full">Penuh</button>'
          : userProfile.clanId ? '<button class="clan-list-join full">Udah Punya</button>'
          : c.isOpen ? '<button class="clan-list-join" onclick="joinClan(\'' + c.id + '\')">Join</button>'
          : '<button class="clan-list-join full">Tertutup</button>') +
        '</div>';
    }).join("");
}

function renderCreateClanForm() {
  return '<div class="clan-card fade-up">' +
    '<div class="clan-section-head" style="margin-bottom:16px;"><div class="clan-section-title">Bikin Clan Baru</div></div>' +
    '<div class="clan-form-group"><label class="clan-form-label">Nama Clan *</label><input id="clan-name-input" class="clan-form-input" placeholder="Contoh: MAOU" maxlength="20"></div>' +
    '<div class="clan-form-group"><label class="clan-form-label">Tag (opsional)</label><input id="clan-tag-input" class="clan-form-input" placeholder="Contoh: MOU" maxlength="5"></div>' +
    '<div class="clan-form-group"><label class="clan-form-label">Deskripsi (opsional)</label><textarea id="clan-desc-input" class="clan-form-input clan-form-textarea" placeholder="Squad santuy, aktif tiap hari..." maxlength="100"></textarea></div>' +
    '<div class="clan-form-group"><label class="clan-form-label">Logo Clan</label><div class="clan-logo-picker" id="clan-logo-picker">' +
    Object.keys(CLAN_LOGOS).map(function(key) {
      return '<div class="clan-logo-option ' + (key === selectedClanLogo ? "selected" : "") + '" onclick="selectClanLogo(\'' + key + '\')">' + getClanLogo(key) + '</div>';
    }).join("") +
    '</div></div>' +
    '<div class="clan-form-group"><label class="clan-form-label">Warna Clan</label><div class="clan-color-picker">' +
    CLAN_COLORS.map(function(c) { return '<div class="clan-color-option ' + (c === selectedClanColor ? "selected" : "") + '" style="background:' + c + ';" onclick="selectClanColor(\'' + c + '\')"></div>'; }).join("") +
    '</div></div>' +
    '<button class="clan-action-btn" onclick="createClan()">' + icons.plus + ' Bikin Clan</button>' +
    '</div>';
}

function selectClanLogo(key) {
  selectedClanLogo = key;
  var keys = Object.keys(CLAN_LOGOS);
  document.querySelectorAll(".clan-logo-option").forEach(function(el, i) { el.classList.toggle("selected", keys[i] === key); });
}

function selectClanColor(color) {
  selectedClanColor = color;
  document.querySelectorAll(".clan-color-option").forEach(function(el) {
    var bg = el.style.background || "";
    el.classList.toggle("selected", bg.indexOf(color) > -1);
  });
}

async function createClan() {
  var name = (document.getElementById("clan-name-input") || {}).value || "";
  name = name.trim();
  var tag = ((document.getElementById("clan-tag-input") || {}).value || "").trim();
  var desc = ((document.getElementById("clan-desc-input") || {}).value || "").trim();
  if (!name) { showToast("Nama clan wajib diisi"); return; }
  if (name.length < 2) { showToast("Nama clan minimal 2 karakter"); return; }
  if (name.length > 20) { showToast("Nama clan maksimal 20 karakter"); return; }
  var exist = clanList.find(function(c) { return c.name.toLowerCase() === name.toLowerCase(); });
  if (exist) { showToast("Nama clan udah dipakai"); return; }
  if (userProfile.clanId) { showToast("Kamu udah punya clan"); return; }
  if (!currentUser) { showToast("Belum login"); return; }
  showLoadingToast("Bikin clan...");
  var clanData = {
    name: name, tag: tag, description: desc,
    logo: selectedClanLogo, color: selectedClanColor,
    leaderId: currentUser.uid, leaderName: userProfile.username,
    members: [{ userId: currentUser.uid, username: userProfile.username, avatar: userProfile.avatar, joinedAt: new Date().toISOString() }],
    maxMembers: 20, isOpen: true, createdAt: new Date().toISOString()
  };
  try {
    var newId = await fbAdd(COLLECTIONS.CLANS, clanData);
    if (!newId) throw new Error("Gagal bikin clan");
    clanData.id = newId;
    userProfile.clanId = newId;
    userProfile.clanName = name;
    if (currentUserProfile) { currentUserProfile.clanId = newId; currentUserProfile.clanName = name; }
    saveProfile();
    await fbUpdate(COLLECTIONS.USERS, currentUser.uid, { clanId: newId, clanName: name });
    var idx = allUsers.findIndex(function(u) { return u.id === currentUser.uid; });
    if (idx > -1) { allUsers[idx].clanId = newId; allUsers[idx].clanName = name; }
    clanList.push(clanData);
    refreshTopClanData();
    currentClanTab = "my";
    showSuccessToast("Clan berhasil dibuat!");
    renderPage();
  } catch (err) {
    showErrorToast("Gagal bikin clan: " + err.message);
  }
}

async function joinClan(clanId) {
  var clan = clanList.find(function(c) { return c.id === clanId; });
  if (!clan) return;
  if (clan.members.length >= clan.maxMembers) { showToast("Clan udah penuh"); return; }
  if (userProfile.clanId) { showToast("Kamu udah punya clan. Keluar dulu."); return; }
  if (!clan.isOpen) { showToast("Clan ini tertutup"); return; }
  if (!currentUser) { showToast("Belum login"); return; }
  showLoadingToast("Join clan...");
  try {
    var newMember = { userId: currentUser.uid, username: userProfile.username, avatar: userProfile.avatar, joinedAt: new Date().toISOString() };
    var newMembers = clan.members.concat([newMember]);
    await fbUpdate(COLLECTIONS.CLANS, clanId, { members: newMembers });
    clan.members = newMembers;
    userProfile.clanId = clanId;
    userProfile.clanName = clan.name;
    if (currentUserProfile) { currentUserProfile.clanId = clanId; currentUserProfile.clanName = clan.name; }
    saveProfile();
    await fbUpdate(COLLECTIONS.USERS, currentUser.uid, { clanId: clanId, clanName: clan.name });
    var idx = allUsers.findIndex(function(u) { return u.id === currentUser.uid; });
    if (idx > -1) { allUsers[idx].clanId = clanId; allUsers[idx].clanName = clan.name; }
    refreshTopClanData();
    currentClanTab = "my";
    showSuccessToast("Berhasil join " + clan.name);
    renderPage();
  } catch (err) {
    showErrorToast("Gagal join clan");
  }
}

async function leaveClan() {
  if (!confirm("Yakin mau keluar dari clan ini?")) return;
  var clan = clanList.find(function(c) { return c.id === userProfile.clanId; });
  if (!clan) return;
  if (clan.leaderId === (currentUser && currentUser.uid)) { showToast("Kamu leader. Bubarkan dulu atau transfer."); return; }
  showLoadingToast("Keluar clan...");
  try {
    var newMembers = clan.members.filter(function(m) { return m.userId !== currentUser.uid; });
    await fbUpdate(COLLECTIONS.CLANS, clan.id, { members: newMembers });
    clan.members = newMembers;
    userProfile.clanId = "";
    userProfile.clanName = "";
    if (currentUserProfile) { currentUserProfile.clanId = ""; currentUserProfile.clanName = ""; }
    saveProfile();
    await fbUpdate(COLLECTIONS.USERS, currentUser.uid, { clanId: "", clanName: "" });
    var idx = allUsers.findIndex(function(u) { return u.id === currentUser.uid; });
    if (idx > -1) { allUsers[idx].clanId = ""; allUsers[idx].clanName = ""; }
    refreshTopClanData();
    showSuccessToast("Berhasil keluar clan");
    currentClanTab = "browse";
    renderPage();
  } catch (err) {
    showErrorToast("Gagal keluar clan");
  }
}

async function kickMember(memberUsername) {
  if (!confirm("Kick " + memberUsername + " dari clan?")) return;
  var clan = clanList.find(function(c) { return c.id === userProfile.clanId; });
  if (!clan) return;
  if (clan.leaderId !== (currentUser && currentUser.uid)) { showToast("Cuma leader yang bisa kick"); return; }
  var targetUser = allUsers.find(function(u) { return u.username === memberUsername; });
  if (!targetUser) return;
  showLoadingToast("Kick member...");
  try {
    var newMembers = clan.members.filter(function(m) { return m.userId !== targetUser.userId && m.userId !== targetUser.id; });
    await fbUpdate(COLLECTIONS.CLANS, clan.id, { members: newMembers });
    clan.members = newMembers;
    if (targetUser.id) {
      await fbUpdate(COLLECTIONS.USERS, targetUser.id, { clanId: "", clanName: "" });
      var idx = allUsers.findIndex(function(u) { return u.id === targetUser.id; });
      if (idx > -1) { allUsers[idx].clanId = ""; allUsers[idx].clanName = ""; }
    }
    refreshTopClanData();
    showSuccessToast("Member di-kick");
    renderPage();
  } catch (err) {
    showErrorToast("Gagal kick member");
  }
}

async function disbandClan() {
  if (!confirm("Yakin mau bubarkan clan ini? Semua member bakal keluar.")) return;
  var clan = clanList.find(function(c) { return c.id === userProfile.clanId; });
  if (!clan) return;
  if (clan.leaderId !== (currentUser && currentUser.uid)) { showToast("Cuma leader yang bisa bubarkan"); return; }
  showLoadingToast("Bubarkan clan...");
  try {
    for (var i = 0; i < clan.members.length; i++) {
      var m = clan.members[i];
      var u = allUsers.find(function(x) { return x.userId === m.userId; });
      if (u && u.id) {
        try { await fbUpdate(COLLECTIONS.USERS, u.id, { clanId: "", clanName: "" }); } catch (e) {}
        u.clanId = ""; u.clanName = "";
      }
    }
    await fbDelete(COLLECTIONS.CLANS, clan.id);
    clanList = clanList.filter(function(c) { return c.id !== clan.id; });
    userProfile.clanId = "";
    userProfile.clanName = "";
    if (currentUserProfile) { currentUserProfile.clanId = ""; currentUserProfile.clanName = ""; }
    saveProfile();
    refreshTopClanData();
    showSuccessToast("Clan udah dibubarkan");
    currentClanTab = "browse";
    renderPage();
  } catch (err) {
    showErrorToast("Gagal bubarkan clan");
  }
}

function openEditClanModal() {
  var clan = clanList.find(function(c) { return c.id === userProfile.clanId; });
  if (!clan) return;
  selectedClanLogo = clan.logo || "shield";
  selectedClanColor = clan.color || "#a855f7";
  editClanOpen = clan.isOpen;
  document.getElementById("modal-title").textContent = "Edit Clan";
  document.getElementById("modal-body").innerHTML =
    '<div class="clan-form-group"><label class="clan-form-label">Nama Clan *</label><input id="clan-name-input" class="clan-form-input" value="' + escapeHtml(clan.name) + '" maxlength="20"></div>' +
    '<div class="clan-form-group"><label class="clan-form-label">Tag</label><input id="clan-tag-input" class="clan-form-input" value="' + escapeHtml(clan.tag || "") + '" maxlength="5"></div>' +
    '<div class="clan-form-group"><label class="clan-form-label">Deskripsi</label><textarea id="clan-desc-input" class="clan-form-input clan-form-textarea" maxlength="100">' + escapeHtml(clan.description || "") + '</textarea></div>' +
    '<div class="clan-form-group"><label class="clan-form-label">Logo Clan</label><div class="clan-logo-picker">' +
    Object.keys(CLAN_LOGOS).map(function(key) {
      return '<div class="clan-logo-option ' + (key === selectedClanLogo ? "selected" : "") + '" onclick="selectClanLogo(\'' + key + '\')">' + getClanLogo(key) + '</div>';
    }).join("") +
    '</div></div>' +
    '<div class="clan-form-group"><label class="clan-form-label">Warna Clan</label><div class="clan-color-picker">' +
    CLAN_COLORS.map(function(c) { return '<div class="clan-color-option ' + (c === selectedClanColor ? "selected" : "") + '" style="background:' + c + ';" onclick="selectClanColor(\'' + c + '\')"></div>'; }).join("") +
    '</div></div>' +
    '<div class="form-actions"><button class="form-btn form-btn-cancel" onclick="closeModal()">Batal</button><button class="form-btn form-btn-save" onclick="saveClanEdit()">Simpan</button></div>';
  openModal();
}

async function saveClanEdit() {
  var clan = clanList.find(function(c) { return c.id === userProfile.clanId; });
  if (!clan) return;
  var name = ((document.getElementById("clan-name-input") || {}).value || "").trim();
  var tag = ((document.getElementById("clan-tag-input") || {}).value || "").trim();
  var desc = ((document.getElementById("clan-desc-input") || {}).value || "").trim();
  if (!name || name.length < 2) { showToast("Nama clan minimal 2 karakter"); return; }
  var exist = clanList.find(function(c) { return c.id !== clan.id && c.name.toLowerCase() === name.toLowerCase(); });
  if (exist) { showToast("Nama clan udah dipakai"); return; }
  showLoadingToast("Simpan...");
  try {
    var updates = { name: name, tag: tag, description: desc, logo: selectedClanLogo, color: selectedClanColor };
    await fbUpdate(COLLECTIONS.CLANS, clan.id, updates);
    Object.assign(clan, updates);
    userProfile.clanName = name;
    if (currentUserProfile) currentUserProfile.clanName = name;
    saveProfile();
    if (currentUser) {
      try { await fbUpdate(COLLECTIONS.USERS, currentUser.uid, { clanName: name }); } catch (e) {}
      var idx = allUsers.findIndex(function(u) { return u.id === currentUser.uid; });
      if (idx > -1) allUsers[idx].clanName = name;
    }
    refreshTopClanData();
    closeModal();
    showSuccessToast("Clan diupdate");
    renderPage();
  } catch (err) {
    showErrorToast("Gagal simpan");
  }
}

function openClanDetail(clanId) {
  var clan = clanList.find(function(c) { return c.id === clanId; });
  if (!clan) { showToast("Clan ga ditemukan"); return; }
  var totalXp = calculateClanTotalXp(clan.members, allUsers);
  var progress = clanLevelProgress(totalXp);
  var isMember = clan.id === userProfile.clanId;
  var logoHTML = getClanLogo(clan.logo);
  document.getElementById("modal-title").textContent = clan.name;
  document.getElementById("modal-body").innerHTML =
    '<div class="clan-card-header" style="margin-bottom:16px;">' +
    '<div class="clan-emblem" style="background:' + clan.color + ';color:white;">' + logoHTML + '</div>' +
    '<div class="clan-header-info">' +
    '<div class="clan-name-lg">' + escapeHtml(clan.name) + '</div>' +
    '<div class="clan-tag-lg">' + (clan.tag ? escapeHtml(clan.tag) + " - " : "") + 'Leader: ' + escapeHtml(clan.leaderName) + '</div>' +
    '</div></div>' +
    (clan.description ? '<div class="clan-desc">"' + escapeHtml(clan.description) + '"</div>' : "") +
    '<div class="clan-stats-row" style="margin-bottom:16px;">' +
    '<div class="clan-stat-box"><div class="clan-stat-value">' + clan.members.length + '/' + clan.maxMembers + '</div><div class="clan-stat-label">Member</div></div>' +
    '<div class="clan-stat-box"><div class="clan-stat-value gradient">Lvl ' + progress.level + '</div><div class="clan-stat-label">Level</div></div>' +
    '<div class="clan-stat-box"><div class="clan-stat-value">' + formatXP(totalXp) + '</div><div class="clan-stat-label">XP</div></div>' +
    '</div>' +
    '<div class="form-actions">' +
    '<button class="form-btn form-btn-cancel" onclick="closeModal()">Tutup</button>' +
    (!isMember && clan.isOpen && clan.members.length < clan.maxMembers && !userProfile.clanId
      ? '<button class="form-btn form-btn-save" onclick="closeModal(); joinClan(\'' + clan.id + '\')">Join Clan</button>'
      : "") +
    '</div>';
  openModal();
}

function refreshTopClanData() {
  topClanData = clanList.map(function(clan) {
    var totalXp = calculateClanTotalXp(clan.members, allUsers);
    return { id: clan.id, rank: 0, name: clan.name, logo: clan.logo, color: clan.color, memberCount: clan.members.length, totalXp: totalXp, level: getClanLevel(totalXp) };
  }).sort(function(a, b) { return b.totalXp - a.totalXp; }).map(function(c, i) { c.rank = i + 1; return c; }).slice(0, 20);
}

/* ==================== FORCE AUTOPLAY BANNER ==================== */
function forceBannerAutoplay() {
  document.querySelectorAll(".profile-banner-media").forEach(function(el) {
    if (el.tagName !== "VIDEO") return;
    el.muted = true;
    el.playsInline = true;
    var promise = el.play();
    if (promise !== undefined) {
      promise.catch(function() {
        var tryPlay = function() {
          el.play().catch(function() {});
          document.removeEventListener("touchstart", tryPlay);
          document.removeEventListener("click", tryPlay);
          document.removeEventListener("scroll", tryPlay);
        };
        document.addEventListener("touchstart", tryPlay, { once: true, passive: true });
        document.addEventListener("click", tryPlay, { once: true });
        document.addEventListener("scroll", tryPlay, { once: true, passive: true });
      });
    }
  });
}

/* ==================== BOTTOM NAV ==================== */
document.querySelectorAll(".nav-item").forEach(function(btn) {
  btn.addEventListener("click", function() { switchTab(btn.dataset.tab); });
});

/* ==================== AUTH STATE HANDLER ==================== */
function onAuthChangedRender() {
  if (typeof isLoggedIn === "function" && isLoggedIn() && typeof currentUserProfile !== "undefined" && currentUserProfile) {
    userProfile = currentUserProfile;
    renderPage();
  } else if (typeof renderLoginPage === "function") {
    renderLoginPage();
  }
}

/* ==================== OVERRIDE renderPage ==================== */
var _origRenderPage = renderPage;
renderPage = function() {
  if (typeof isLoggedIn === "function" && !isLoggedIn()) {
    if (typeof renderLoginPage === "function") renderLoginPage();
    return;
  }
  _origRenderPage.apply(this, arguments);
};

/* ==================== INIT ==================== */
(async function init() {
  console.log("AnimeKu start");
  showLoading("Menyiapkan aplikasi...");
  if (!firebaseReady) {
    showErrorToast("Firebase gagal load. Cek koneksi.");
    hideLoading();
    return;
  }
  try { await initAuth(); } catch (e) {
    hideLoading();
    showErrorToast("Gagal init auth. Coba refresh.");
    return;
  }
  try { await initUserIdCounter(); } catch (e) {}
  if (typeof isLoggedIn === "function" && isLoggedIn()) {
    await loadAllData();
    hideLoading();
    if (typeof handleUrlRouting === "function" && handleUrlRouting()) {
      renderPage();
    } else {
      renderPage();
    }
  } else {
    hideLoading();
    if (typeof renderLoginPage === "function") renderLoginPage();
  }
  window.addEventListener("popstate", function(e) {
    if (typeof handleUrlRouting === "function" && handleUrlRouting()) {
      renderPage();
    } else {
      switchTab("home");
    }
  });
  console.log("AnimeKu ready");
})();