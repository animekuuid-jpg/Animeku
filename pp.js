/* ==================== PROFILE.JS (profil, border, avatar, banner) ==================== */
// Dimuat sebelum app.js. Fungsi di sini dipanggil saat runtime oleh app.js, komentar, dan chat.
/* ==================== BORDER CONFIG ==================== */
/* ==================== BORDER BAWAAN (SVG) ==================== */
function makeBorderSvg(c1, c2, c3, ornament, ornColor) {
  var orn = "";
  if (ornament === "diamond") {
    for (var i = 0; i < 8; i++) {
      orn += '<g transform="rotate(' + (i * 45) + ' 50 50)"><rect x="46.5" y="-1" width="7" height="7" transform="rotate(45 50 2.5)" fill="' + ornColor + '"/></g>';
    }
  } else if (ornament === "dot") {
    for (var j = 0; j < 12; j++) {
      orn += '<g transform="rotate(' + (j * 30) + ' 50 50)"><circle cx="50" cy="3.5" r="2.2" fill="' + ornColor + '"/></g>';
    }
  } else if (ornament === "double") {
    orn = '<circle cx="50" cy="50" r="40" fill="none" stroke="' + ornColor + '" stroke-opacity=".7" stroke-width="1.5"/>';
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>' +
    '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset=".5" stop-color="' + c2 + '"/><stop offset="1" stop-color="' + c3 + '"/></linearGradient>' +
    '</defs><circle cx="50" cy="50" r="46.5" fill="none" stroke="url(#g)" stroke-width="4"/>' +
    '<circle cx="50" cy="50" r="42.5" fill="none" stroke="' + c1 + '" stroke-opacity=".45" stroke-width="1"/>' + orn + '</svg>';
}

var BUILTIN_BORDERS = [
  { id: "b-silver", name: "Silver", type: "basic", svg: makeBorderSvg("#f8fafc", "#94a3b8", "#e2e8f0", "", "") },
  { id: "b-bronze", name: "Bronze", type: "basic", svg: makeBorderSvg("#fde68a", "#b45309", "#f59e0b", "", "") },
  { id: "b-emerald", name: "Emerald", type: "basic", svg: makeBorderSvg("#6ee7b7", "#059669", "#a7f3d0", "dot", "#34d399") },
  { id: "b-gold", name: "Gold Crown", type: "premium", svg: makeBorderSvg("#fef3c7", "#f59e0b", "#b45309", "diamond", "#fde68a") },
  { id: "b-violet", name: "Violet Orb", type: "premium", svg: makeBorderSvg("#ddd6fe", "#7c3aed", "#c4b5fd", "dot", "#a78bfa") },
  { id: "b-crimson", name: "Crimson", type: "admin", svg: makeBorderSvg("#fecaca", "#dc2626", "#7f1d1d", "double", "#f87171") }
];

function resolveBorderUrl(v) {
  if (typeof v !== "string" || !v) return "";
  if (v.indexOf("builtin:") === 0) {
    var id = v.slice(8);
    var b = BUILTIN_BORDERS.find(function(x) { return x.id === id; });
    return b ? "data:image/svg+xml;utf8," + encodeURIComponent(b.svg) : "";
  }
  return /^https:\/\//i.test(v) ? v : "";
}

function getAvailableBorders(u) {
  var level = u.level || 1;
  var isPremium = u.isPremium === true;
  var isAdmin = u.isAdmin === true;
  return [
    { id: "default", name: "Default", cost: "Gratis", style: "none", unlocked: true },
    { id: "bronze", name: "Bronze", cost: "Lvl 5+", style: "2px solid #b45309", unlocked: level >= 5 },
    { id: "silver", name: "Silver", cost: "Lvl 10+", style: "2px solid #94a3b8", unlocked: level >= 10 },
    { id: "gold", name: "Gold", cost: "Lvl 20+", style: "2px solid #fbbf24", unlocked: level >= 20 },
    { id: "platinum", name: "Platinum", cost: "Lvl 40+", style: "2px solid #10b981", unlocked: level >= 40 },
    { id: "diamond", name: "Diamond", cost: "Lvl 70+", style: "2px solid #06b6d4", unlocked: level >= 70 },
    { id: "master", name: "Master", cost: "Lvl 100+", style: "2px solid #a855f7", unlocked: level >= 100 },
    { id: "grandmaster", name: "Grandmaster", cost: "Lvl 200+", style: "2px solid #f97316", unlocked: level >= 200 },
    { id: "legend", name: "Legend", cost: "Lvl 500+", style: "2px solid #fbbf24", unlocked: level >= 500 },
    { id: "mythic", name: "Mythic", cost: "Lvl 1000+", style: "2px solid #ef4444", unlocked: level >= 1000 },
    { id: "premium", name: "Premium", cost: "Premium Only", style: "2px solid var(--gold)", unlocked: isPremium },
    { id: "admin", name: "Admin", cost: "Admin Only", style: "2px solid var(--accent-2)", unlocked: isAdmin }
  ];
}

var DEFAULT_AVATAR_SRC = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23202028'/><circle cx='50' cy='38' r='18' fill='%23717181'/><path d='M18 92c4-20 18-30 32-30s28 10 32 30z' fill='%23717181'/></svg>";
function findUserForAuthor(uid, username, userId) {
  var list = Array.isArray(allUsers) ? allUsers : [];
  var byId = uid ? list.find(function(u) { return u.id === uid; }) : null;
  if (byId) return byId;
  var byUserId = (userId && userId !== "#?") ? list.find(function(u) { return u.userId === userId; }) : null;
  return byUserId || list.find(function(u) { return u.username === username; }) || null;
}
function avatarSrcSafe(u) { return (typeof u === "string" && /^https?:\/\//i.test(u)) ? u : DEFAULT_AVATAR_SRC; }
function renderAvatarWithBorder(avatarUrl, borderStyle, sizeClass, borderImgUrl) {
  borderImgUrl = resolveBorderUrl(borderImgUrl);
  var hasFrame = borderStyle && borderStyle !== "none";
  var safeAvatar = typeof escapeAttr === "function" ? escapeAttr(avatarUrl || "") : (avatarUrl || "");
  var wrapperStyle = "position:relative;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;" +
    (hasFrame ? "border:" + borderStyle + ";padding:2px;background:var(--bg);" : "");
  if (borderImgUrl && !hasFrame) wrapperStyle += "border:none;padding:0;background:var(--bg-2, #1f1f27);";
  if (borderImgUrl) wrapperStyle += "overflow:visible;";
  var imgStyle = "position:relative;z-index:1;border-radius:50%;object-fit:cover;width:100%;height:100%;background:var(--bg-2);";
  var frameHTML = "";
  if (borderImgUrl) {
    var safeFrame = typeof escapeAttr === "function" ? escapeAttr(borderImgUrl) : borderImgUrl;
    frameHTML = '<img src="' + safeFrame + '" alt="" style="position:absolute;z-index:2;left:50%;top:50%;transform:translate(-50%,-50%);width:120%;height:auto;max-width:none;max-height:none;pointer-events:none;-webkit-mask-image:linear-gradient(to right, transparent 0, #000 6%, #000 94%, transparent 100%), linear-gradient(to bottom, transparent 0, #000 6%, #000 94%, transparent 100%);-webkit-mask-composite:source-in;mask-image:linear-gradient(to right, transparent 0, #000 6%, #000 94%, transparent 100%), linear-gradient(to bottom, transparent 0, #000 6%, #000 94%, transparent 100%);mask-composite:intersect;' + '' + '">' + frameShineHTML();
  }
  return '<div class="' + sizeClass + '" style="' + wrapperStyle + '"><img referrerpolicy="no-referrer" src="' + escapeAttr(avatarSrcSafe(avatarUrl)) + '" onerror="this.onerror=null;this.src=DEFAULT_AVATAR_SRC" style="' + imgStyle + '" alt="">' + frameHTML + '</div>';
}
/* ==================== UPLOAD: AVATAR ==================== */
function changeAvatar() {
  if (!currentUser) { showToast("Belum login"); return; }
  var input = document.createElement("input");
  input.type = "file"; input.accept = "image/*";
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
    '<div class="upload-preview-wrap"><img class="upload-preview-img round" src="' + previewUrl + '" alt="Preview"></div>' +
    '<div class="form-hint" style="text-align:center;margin-top:10px;">Ukuran: ' + (pendingAvatarFile.size / 1024).toFixed(1) + ' KB</div>' +
    '<div class="form-actions"><button class="form-btn form-btn-cancel" onclick="cancelUpload()">Batal</button><button class="form-btn form-btn-save" onclick="confirmAvatarUpload()">Simpan</button></div>';
  openModal();
}
async function confirmAvatarUpload() {
  if (!pendingAvatarFile || !currentUser) return;
  showLoading("Mengupload avatar...");
  try {
    var formData = new FormData(); formData.append("file", pendingAvatarFile); formData.append("type", "avatar"); formData.append("userId", currentUser.uid);
    var res = await fetch(UPLOAD_API + "/upload/avatar", { method: "POST", body: formData });
    var data = await res.json();
    if (!data.success) throw new Error(data.error || "Upload gagal");
    userProfile.avatar = data.url; if (currentUserProfile) currentUserProfile.avatar = data.url;
    await fbUpdate(COLLECTIONS.USERS, currentUser.uid, { avatar: data.url, updatedAt: new Date().toISOString() });
    var idx = allUsers.findIndex(function(u) { return u.id === currentUser.uid; });
    if (idx > -1) allUsers[idx].avatar = data.url;
    closeModal(); showToast("Avatar berhasil diupload!"); renderPage(); pendingAvatarFile = null;
  } catch (err) { showToast("Gagal upload: " + err.message); } finally { hideLoading(); }
}

/* ==================== UPLOAD: BANNER ==================== */
function changeBanner() {
  if (!currentUser) { showToast("Belum login"); return; }
  var level = userProfile.level || calculateLevel(userProfile.xp || 0);
  var isPremium = userProfile.isPremium === true;
  var isHighRank = level >= 200;
  if (!isPremium && !isHighRank && userProfile.isAdmin !== true) { showToast("Banner cuma buat Premium atau rank Grandmaster+"); return; }
  var input = document.createElement("input");
  input.type = "file"; input.accept = "video/mp4,video/webm,image/*";
  input.onchange = async function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var isVideo = file.type.startsWith("video/");
    var isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) { showToast("File harus video atau gambar"); return; }
    if (isVideo && file.size > 15 * 1024 * 1024) { showToast("Video max 15MB"); return; }
    if (isImage && file.size > 5 * 1024 * 1024) { showToast("Gambar max 5MB"); return; }
    if (isVideo) {
      showLoading("Cek video..."); var duration = await getVideoDuration(file); hideLoading();
      if (duration > 10.5) { showToast("Video " + duration.toFixed(1) + "s - max 10 detik"); return; }
    }
    pendingBannerFile = file; pendingBannerType = isVideo ? "video" : "image";
    var reader = new FileReader();
    reader.onload = function(ev) { showBannerPreviewModal(ev.target.result, isVideo); };
    reader.readAsDataURL(file);
  };
  input.click();
}
function showBannerPreviewModal(previewUrl, isVideo) {
  document.getElementById("modal-title").textContent = "Preview Banner";
  document.getElementById("modal-body").innerHTML =
    '<div class="upload-preview-wrap banner">' + (isVideo ? '<video class="upload-preview-media" src="' + previewUrl + '" autoplay loop muted playsinline></video>' : '<img class="upload-preview-media" src="' + previewUrl + '" alt="Preview">') + '</div>' +
    '<div class="form-hint" style="text-align:center;margin-top:10px;">' + (isVideo ? "Video" : "Gambar") + ' - ' + (pendingBannerFile.size / 1024).toFixed(1) + ' KB</div>' +
    '<div class="form-actions"><button class="form-btn form-btn-cancel" onclick="cancelUpload()">Batal</button><button class="form-btn form-btn-save" onclick="confirmBannerUpload()">Simpan</button></div>';
  openModal();
}
async function confirmBannerUpload() {
  if (!pendingBannerFile || !currentUser) return;
  showLoading("Mengupload banner...");
  try {
    var formData = new FormData(); formData.append("file", pendingBannerFile); formData.append("type", "banner"); formData.append("userId", currentUser.uid);
    var res = await fetch(UPLOAD_API + "/upload/banner", { method: "POST", body: formData });
    var data = await res.json();
    if (!data.success) throw new Error(data.error || "Upload gagal");
    userProfile.bannerUrl = data.url; userProfile.bannerType = pendingBannerType;
    if (currentUserProfile) { currentUserProfile.bannerUrl = data.url; currentUserProfile.bannerType = pendingBannerType; }
    await fbUpdate(COLLECTIONS.USERS, currentUser.uid, { bannerUrl: data.url, bannerType: pendingBannerType, updatedAt: new Date().toISOString() });
    var idx = allUsers.findIndex(function(u) { return u.id === currentUser.uid; });
    if (idx > -1) { allUsers[idx].bannerUrl = data.url; allUsers[idx].bannerType = pendingBannerType; }
    closeModal(); showToast("Banner berhasil diupload!"); renderPage(); pendingBannerFile = null; pendingBannerType = null;
  } catch (err) { showToast("Gagal upload: " + err.message); } finally { hideLoading(); }
}
function cancelUpload() { pendingAvatarFile = null; pendingBannerFile = null; pendingBannerType = null; closeModal(); }
function getVideoDuration(file) {
  return new Promise(function(resolve) {
    var video = document.createElement("video"); video.preload = "metadata";
    video.onloadedmetadata = function() { URL.revokeObjectURL(video.src); resolve(video.duration); };
    video.onerror = function() { resolve(0); }; video.src = URL.createObjectURL(file);
  });
}
/* ==================== ANIMASI PROFIL (sekali tampil per buka profil) ==================== */
var profileAnimShown = {};

function profileAnimOnceHTML(u) {
  var key = String(u.userId || u.username || "");
  var url = String(u.profileAnimUrl || "").trim();
  if (!key || !/^https:\/\/[^\s"'<>]+$/i.test(url) || profileAnimShown[key]) return "";
  profileAnimShown[key] = true;
  return '<div class="profile-anim-once" style="position:absolute;inset:0;overflow:hidden;z-index:3;pointer-events:none;">' +
    '<video src="' + url + '" autoplay muted playsinline webkit-playsinline style="width:100%;height:100%;object-fit:cover;display:block;" onended="this.parentNode.remove()" onerror="this.parentNode.remove()"></video></div>';
}

function renderProfileBanner(u) {
  var base = renderProfileBannerBase(u);
  var anim = profileAnimOnceHTML(u);
  if (!anim) return base;
  return base.replace(/<\/div>\s*$/, anim + "</div>");
}

function renderProfileBannerBase(u) {
  var src = resolveBannerUrl(u.bannerUrl);
  if (!src) return '<div class="profile-banner profile-banner-default"><div class="profile-banner-gradient"></div></div>';
  if (u.bannerType === "video" || isVideoUrl(src)) return '<div class="profile-banner"><video referrerpolicy="no-referrer" class="profile-banner-media" src="' + src + '" autoplay loop muted playsinline webkit-playsinline preload="auto" oncontextmenu="return false"></video><div class="profile-banner-overlay"></div></div>';
  return '<div class="profile-banner"><img referrerpolicy="no-referrer" class="profile-banner-media" src="' + src + '" alt=""><div class="profile-banner-overlay"></div></div>';
}
/* ==================== EDIT PROFILE PAGE ==================== */
function openEditProfilePage() {
  unlockScroll(); exitFakeFullscreen(); watchFromTab = currentTab; currentTab = "edit-profile"; watchOpen = false; stopAutoSlide();
  document.querySelectorAll(".nav-item").forEach(function(b) { b.classList.remove("active"); }); renderPage(); window.scrollTo({ top: 0 });
}

async function renderEditProfilePage(main) {
  var u = userProfile;
  
  // Ambil data dari Firebase (bisa kosong kalau belum diisi)
  var borders = BUILTIN_BORDERS.map(function(b) { return { id: b.id, name: b.name, type: b.type, url: "builtin:" + b.id, builtin: true }; }).concat(await getBordersFromFirestore());
  var banners = BUILTIN_BANNERS.map(function(b) { return { id: b.id, name: b.name, type: b.type, url: "builtin:" + b.id, builtin: true }; }).concat(await getBannersFromFirestore());
  var bannerTierList = banners.filter(function(b) { return (b.type || "basic") === bannerTierTab; });
  var borderTierList = (borders || []).filter(function(b) { return (b.type || "basic") === borderTierTab; });
  
  main.innerHTML = `
    <div class="edit-profile-page">
      <div class="edit-profile-topbar">
        <button class="clan-back" onclick="switchTab('profil')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div class="clan-title">Edit Profil</div>
      </div>

      <div class="edit-profile-hero">
        <div class="edit-avatar-preview">
          ${renderAvatarWithBorder(u.avatar, "none", "edit-avatar-big", u.borderImgUrl)}
          <div class="edit-avatar-cam" onclick="changeAvatar()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
          </div>
        </div>
        <div class="edit-profile-name">${escapeHtml(u.username)}</div>
        <div class="edit-profile-id">${u.userId}</div>
      </div>

      <div class="edit-profile-tabs">
        <button class="edit-profile-tab ${editProfileTab === 'border' ? 'active' : ''}" onclick="editProfileTab = 'border'; renderPage();">Border</button>
        <button class="edit-profile-tab ${editProfileTab === 'banner' ? 'active' : ''}" onclick="editProfileTab = 'banner'; renderPage();">Banner</button>
        <button class="edit-profile-tab ${editProfileTab === 'nama' ? 'active' : ''}" onclick="editProfileTab = 'nama'; renderPage();">Ganti Nama</button>
      </div>

      <div class="edit-profile-content">
        ${editProfileTab === 'nama' ? `
          <div style="padding: 20px;">
            <label class="clan-form-label">Username Baru</label>
            <input id="edit-username-input" class="clan-form-input" value="${escapeHtml(u.username)}" maxlength="20" style="margin-bottom: 16px;">
            <button class="clan-action-btn" onclick="saveNewUsername()">Simpan Nama</button>
          </div>
        ` : editProfileTab === 'banner' ? `
          <!-- TAB BANNER -->
          <div class="border-tier-tabs" style="display:flex;margin:8px 20px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
            ${[["basic","Normal"],["premium","Premium"],["admin","Admin"]].map(function(t) { var on = bannerTierTab === t[0]; return '<button onclick="setBannerTier(\'' + t[0] + '\')" style="flex:1;background:none;border:none;padding:12px 0;font-size:14px;font-weight:600;color:' + (on ? '#fff' : '#8b8b99') + ';border-bottom:2px solid ' + (on ? 'var(--accent, #a855f7)' : 'transparent') + ';cursor:pointer;">' + t[1] + '</button>'; }).join("")}
          ${u.isAdmin === true ? `<button onclick="toggleBannerForm()" title="Tambah" style="width:48px;background:none;border:none;color:#fff;font-size:28px;line-height:1;cursor:pointer;">+</button>` : ""}
          </div>
          ${bannerFormOpen && u.isAdmin === true ? bannerFormHTML() : ""}
          <div class="border-grid" style="margin-top: 14px; padding: 0 20px; grid-template-columns: repeat(2, 1fr); gap: 12px;">
            ${bannerTierList.map(b => {
              var canUse = canUserUseItem(b.type, u);
              var on = u.bannerUrl === b.url;
              return `
                <div class="border-item ${on ? 'equipped' : ''}" style="position:relative;" onclick="${canUse ? `equipBanner('${b.id}', '${b.url}')` : `showToast('Khusus ${b.type}')`}">
                  ${(u.isAdmin === true && !b.builtin) ? `<span onclick="event.stopPropagation();deleteRemoteBanner('${b.id}')" style="position:absolute;top:-4px;left:-4px;width:20px;height:20px;border-radius:50%;background:#ef4444;color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;z-index:3;cursor:pointer;">x</span>` : ""}
                  <div style="width:100%;height:80px;border-radius:10px;overflow:hidden;">
                    ${isVideoUrl(b.url) ? `<video referrerpolicy="no-referrer" src="${escapeAttr(b.url)}" muted autoplay loop playsinline preload="metadata" onerror="this.outerHTML='<div style=&quot;display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:11px;color:#f87171;&quot;>Video gagal dimuat</div>'" style="width:100%;height:100%;object-fit:cover;"></video>` : `<img referrerpolicy="no-referrer" src="${escapeAttr(resolveBannerUrl(b.url))}" alt="" style="width:100%;height:100%;object-fit:cover;">`}
                  </div>
                  <div class="border-name">${escapeHtml(b.name)}</div>
                  <div class="border-cost" style="color:${canUse ? 'var(--success)' : 'var(--danger)'}; text-transform:capitalize;">${b.type === "basic" ? "Normal" : b.type}</div>
                </div>
              `;
            }).join("")}
          </div>
        ` : `
          <!-- TAB BORDER -->
          <div class="border-tier-tabs" style="display:flex;margin:8px 20px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
            ${[["basic","Normal"],["premium","Premium"],["admin","Admin"]].map(function(t) { var on = borderTierTab === t[0]; return '<button onclick="setBorderTier(\'' + t[0] + '\')" style="flex:1;background:none;border:none;padding:12px 0;font-size:14px;font-weight:600;color:' + (on ? '#fff' : '#8b8b99') + ';border-bottom:2px solid ' + (on ? 'var(--accent, #a855f7)' : 'transparent') + ';cursor:pointer;">' + t[1] + '</button>'; }).join("")}
          ${u.isAdmin === true ? `<button onclick="toggleBorderForm()" title="Tambah" style="width:48px;background:none;border:none;color:#fff;font-size:28px;line-height:1;cursor:pointer;">+</button>` : ""}
          </div>
          ${borderFormOpen && u.isAdmin === true ? borderFormHTML() : ""}
          <div class="border-grid" style="margin-top: 14px; padding: 0 20px; grid-template-columns: repeat(3, 1fr); gap: 12px;">
            ${borderTierList.length === 0 && !(u.isAdmin === true) ? `
              <p style="text-align:center;color:var(--text-mute);padding:40px 0;grid-column: span 3;">Belum ada border untuk tier ini.</p>
            ` : ""}
            ${borderTierList.map(b => {
              var canUse = canUserUseItem(b.type, u);
              var on = u.equippedBorder === b.id;
              return `
                <div class="border-item ${on ? 'equipped' : ''}" style="position:relative;" onclick="${canUse ? `equipBorder('${b.id}', '${b.url}')` : `showToast('Khusus ${b.type}')`}">
                  ${(u.isAdmin === true && !b.builtin) ? `<span onclick="event.stopPropagation();deleteRemoteBorder('${b.id}')" style="position:absolute;top:-4px;left:-4px;width:20px;height:20px;border-radius:50%;background:#ef4444;color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;z-index:3;cursor:pointer;">x</span>` : ""}
                  <div class="border-avatar-wrap">
                    ${renderAvatarWithBorder(u.avatar, "none", "border-avatar-img", b.url)}
                  </div>
                  <div class="border-name">${escapeHtml(b.name)}</div>
                  <div class="border-cost" style="color:${canUse ? 'var(--success)' : 'var(--danger)'}; text-transform:capitalize;">${b.type === "basic" ? "Normal" : b.type}</div>
                </div>
              `;
            }).join("")}
          </div>
                `}
      </div>
    </div>
  `;
}

async function saveNewUsername() {
  var input = document.getElementById("edit-username-input");
  if (!input) return;
  var newName = input.value.trim();
  if (newName.length < 3) { showToast("Nama minimal 3 karakter"); return; }
  if (newName === userProfile.username) { showToast("Nama sama dengan yang sekarang"); return; }
  showLoadingToast("Menyimpan nama...");
  try {
    await fbUpdate(COLLECTIONS.USERS, currentUser.uid, { username: newName });
    userProfile.username = newName;
    if (currentUserProfile) currentUserProfile.username = newName;
    var idx = allUsers.findIndex(function(u) { return u.id === currentUser.uid; });
    if (idx > -1) allUsers[idx].username = newName;
    if (userProfile.clanId && typeof syncClanNameFromUser === "function") syncClanNameFromUser(newName);
    showSuccessToast("Nama berhasil diubah");
    renderPage();
  } catch (e) {
    showErrorToast("Gagal mengubah nama");
  }
}
/* ==================== PROFIL ==================== */
function renderProfil(main) {
  var u = userProfile;
  var level = u.level || calculateLevel(u.xp || 0);
  var rank = calculateRankV2(level);
  var isMythic = rank.name.toLowerCase() === "mythic";
  var canBanner = isMythic || u.isPremium === true || level >= 200;
  var myClan = u.clanId ? clanList.find(function(c) { return c.id === u.clanId; }) : null;
  var clanColor = (myClan && myClan.color) || (u.clanName ? generateClanColor(u.clanName) : "");
  
  var userBorderObj = getAvailableBorders(u).find(function(b) { return b.id === u.equippedBorder; });
  var borderStyle = userBorderObj ? userBorderObj.style : "none";

  main.innerHTML = '<div class="profile-hero-wa fade-up"><div class="profile-banner-wrap">' + renderProfileBanner(u) +
    '<div class="profile-avatar-center" onclick="openEditProfilePage()" style="cursor:pointer;">' + renderAvatarWithBorder(u.avatar, borderStyle, "profile-avatar-big", u.borderImgUrl) + '</div></div>' +
    '<div class="profile-info-below"><div class="profile-name-big">' +
    '<div style="display:inline-flex;align-items:center;gap:0;color:inherit;font:inherit;">' + escapeHtml(u.username || "Guest") + (u.verified ? '<img class="verified-badge verified-badge-lg" style="width:24px;height:24px;margin:0 0 0 3px !important;" src="' + u.verified + '" alt="">' : "") + '</div>' +
    '<span style="margin-left:5px;opacity:.75;">' + (u.userId || "#?") + '</span>' + roleTagsHTML(u) + '</div>' +
    '<div class="profile-badges" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;"><span class="profile-badge" style="color:' + rank.color + ';">' + icons.trophy + ' ' + rank.name + '</span>' +
    (u.clanName ? '<span class="clan-badge-profile" style="--clan-color:' + clanColor + ';">' + icons.shield + '<span class="clan-badge-text">' + escapeHtml(u.clanName.toUpperCase()) + '</span></span>' : "") + '<span class="profile-badge">' + icons.star2 + ' Lvl. ' + level + '</span></div></div></div>' +
    '<div class="profile-stats-5 fade-up d2">' +
    '<div class="stat-box"><div class="stat-value">' + Math.min(u.joinedMonths || 0, 999) + '</div><div class="stat-label">bulan</div></div>' +
    '<div class="stat-box"><div class="stat-value gradient-text">' + formatXPBig(u.xp || 0) + '</div><div class="stat-label">XP</div></div>' +
    '<div class="stat-box"><div class="stat-value">' + (u.comments || 0) + '</div><div class="stat-label">komentar</div></div>' +
    '<div class="stat-box"><div class="stat-value">' + (u.historyCount || 0) + '</div><div class="stat-label">riwayat</div></div>' +
    '<div class="stat-box"><div class="stat-value">' + (u.watchMinutes || 0) + '</div><div class="stat-label">menit</div></div></div>' +
    
    '<div class="profile-actions fade-up d2">' +
    '<button class="profile-action-btn" onclick="openClanPage()">' + icons.shield + ' Clan</button>' +
    '<button class="profile-action-btn" onclick="openTeman()">' + icons.star2 + ' Teman</button></div>' +
    '<div class="profile-actions fade-up d2" style="margin-top:-4px;">' +
    '<button class="profile-action-btn" onclick="openSettings()">' + icons.settings + ' Pengaturan</button>' +
    '<button class="profile-action-btn" style="background:rgba(239,68,68,0.12);color:#ef4444;border-color:rgba(239,68,68,0.3);" onclick="logout()">' + icons.logout + ' Logout</button></div>' +
    
    '<div class="profile-tabs fade-up d3">' +
    '<button class="profile-tab ' + (currentProfileTab === "komentar" ? "active" : "") + '" onclick="setProfileTab(\'komentar\')">Komentar</button>' +
    '<button class="profile-tab ' + (currentProfileTab === "favorit" ? "active" : "") + '" onclick="setProfileTab(\'favorit\')">Favorite</button>' +
    '<button class="profile-tab ' + (currentProfileTab === "histori" ? "active" : "") + '" onclick="setProfileTab(\'histori\')">Histori</button></div>' +
    '<div class="profile-content fade-up d4">' + renderProfileContent() + '</div>';
}

function setProfileTab(tab) { currentProfileTab = tab; renderPage(); }
function renderProfileContent() {
  if (currentProfileTab === "komentar") {
    var myComments = dummyComments.filter(function(c) { return c.user === userProfile.username; });
    return myComments.length === 0 ? '<p style="text-align:center;color:var(--text-mute);padding:30px 0;">Belum ada komentar</p>' : myComments.slice(0, 5).map(function(c) {
      var safeName = String(c.user || "").replace(/'/g, "\\'");
      return '<div class="comment-item"><img class="comment-avatar comment-avatar-clickable" src="' + avatarSrcSafe(userProfile.avatar) + '" onerror="this.onerror=null;this.src=DEFAULT_AVATAR_SRC" alt="" onclick="openPublicProfile(\'' + safeName + '\')">' +
        '<div class="comment-body"><div class="comment-header"><span class="comment-name comment-name-clickable" onclick="openPublicProfile(\'' + safeName + '\')">' + escapeHtml(c.user) + '</span><span class="comment-time">' + c.createdAt + '</span></div>' +
        '<div class="comment-text">' + escapeHtml(c.content) + '</div>' +
        '<div style="font-size:10px;color:var(--text-mute);margin-top:4px;">' + (c.animeSlug || "Anime") + ' - Episode ' + (c.episode || "-") + '</div></div></div>';
    }).join("");
  }
  if (currentProfileTab === "favorit") {
    return favoriteList.length === 0 ? '<p style="text-align:center;color:var(--text-mute);padding:30px 0;">Belum ada Favorite</p>' : favoriteList.map(favItemHTML).join("");
  }
  if (currentProfileTab === "histori") {
    return historyList.length === 0 ? '<p style="text-align:center;color:var(--text-mute);padding:30px 0;">Belum ada riwayat</p>' : historyList.slice(0, 5).map(historyItemHTML).join("");
  }
}
/* ==================== PROFIL PUBLIK ==================== */
function openPublicProfile(username) {
  unlockScroll(); exitFakeFullscreen(); currentPublicUser = getPublicUser(username); currentPublicTab = "info"; watchFromTab = currentTab; currentTab = "public-profile"; watchOpen = false; stopAutoSlide();
  document.querySelectorAll(".nav-item").forEach(function(b) { b.classList.remove("active"); }); renderPage(); window.scrollTo({ top: 0 });
}
function renderPublicProfile(main) {
  var u = currentPublicUser; if (!u) { switchTab("home"); return; }
  var level = u.level || calculateLevel(u.xp || 0);
  var rank = calculateRankV2(level);
  var clanObj = u.clanId ? clanList.find(function(c) { return c.id === u.clanId; }) : clanList.find(function(c) { return c.name === u.clanName; });
  var clanColor = (clanObj && clanObj.color) || (u.clanName ? generateClanColor(u.clanName) : "");
  
  var userBorderObj = getAvailableBorders(u).find(function(b) { return b.id === u.equippedBorder; });
  var borderStyle = userBorderObj ? userBorderObj.style : "none";

  main.innerHTML = '<div class="page-header fade-up"><button class="page-back" onclick="goBackFromProfile()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>' +
    '<div class="page-header-title">Profil ' + escapeHtml(u.username) + '</div></div>' +
    '<div class="profile-hero-wa fade-up d1"><div class="profile-banner-wrap">' + renderProfileBanner(u) +
    '<div class="profile-avatar-center">' + renderAvatarWithBorder(u.avatar, borderStyle, "profile-avatar-big", u.borderImgUrl) + '</div></div>' +
    '<div class="profile-info-below"><div class="profile-name-big">' + '<div style="display:inline-flex;align-items:center;gap:0;color:inherit;font:inherit;">' + escapeHtml(u.username) + (u.verified ? '<img class="verified-badge verified-badge-lg" style="width:24px;height:24px;margin:0 0 0 3px !important;" src="' + u.verified + '" alt="">' : "") + '</div>' + ' <span style="margin-left:5px;opacity:.75;">' + u.userId + '</span>' + roleTagsHTML(u) + '</div>' +
    '<div class="profile-badges" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;"><span class="profile-badge" style="color:' + rank.color + ';">' + icons.trophy + ' ' + rank.name + '</span>' +
    (u.clanName ? '<span class="clan-badge-profile" style="--clan-color:' + clanColor + ';">' + icons.shield + '<span class="clan-badge-text">' + escapeHtml(u.clanName.toUpperCase()) + '</span></span>' : "") + '<span class="profile-badge">' + icons.star2 + ' Lvl. ' + level + '</span></div></div></div>' +
    '<div class="profile-stats-5 fade-up d2">' +
    '<div class="stat-box"><div class="stat-value">' + Math.min(u.joinedMonths || 0, 999) + '</div><div class="stat-label">bulan</div></div>' +
    '<div class="stat-box"><div class="stat-value gradient-text">' + formatXPBig(u.xp || 0) + '</div><div class="stat-label">XP</div></div>' +
    '<div class="stat-box"><div class="stat-value">' + formatViews(u.comments || 0) + '</div><div class="stat-label">komentar</div></div>' +
    '<div class="stat-box"><div class="stat-value">' + formatViews(u.historyCount || 0) + '</div><div class="stat-label">riwayat</div></div>' +
    '<div class="stat-box"><div class="stat-value">' + formatViews(u.followers || 0) + '</div><div class="stat-label">follower</div></div></div>' +
    publicProfileActionsHTML(u) +
    '<div class="public-info-card fade-up d3">' +
    '<div class="public-info-row"><span class="public-info-label">Total Nonton</span><span class="public-info-value">' + formatViews(u.watchMinutes || 0) + ' menit</span></div>' +
    '<div class="public-info-row"><span class="public-info-label">Rank</span><span class="public-info-value" style="color:' + rank.color + ';">' + rank.name + '</span></div>' +
    '<div class="public-info-row"><span class="public-info-label">Followers</span><span class="public-info-value">' + formatViews(u.followers || 0) + '</span></div>' +
    '<div class="public-info-row"><span class="public-info-label">Bergabung</span><span class="public-info-value">' + (u.joinedMonths || 0) + ' bulan lalu</span></div></div>';
}
function goBackFromProfile() { if (watchFromTab === "search") openSearch(); else switchTab(watchFromTab || "home"); }
function followUser(username) { showToast("Kamu sekarang mengikuti " + username + "!"); }
function shareProfile(username) {
  var u = getPublicUser(username); var url = window.location.origin + "/profil/" + username;
  var shareData = { title: "Profil " + username + " di AnimeKu", text: "Cek profil " + username + " (Lvl " + u.level + ") di AnimeKu!", url: url };
  if (navigator.share) navigator.share(shareData).catch(function() {});
  else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function() { showToast("Link disalin!"); }).catch(function() { showToast("Link: " + url); });
  else showToast("Link: " + url);
}
/* ==================== SIMPAN LINK TEST (border + animasi profil) ==================== */
// Untuk testing dari halaman Edit Profil. Nanti dipindah ke panel admin.
async function saveProfileTestLinks() {
  if (!currentUser || typeof db === "undefined" || !db) { showErrorToast("Belum login"); return; }
  var border = (document.getElementById("test-border-url") && document.getElementById("test-border-url").value || "").trim();
  var anim = (document.getElementById("test-anim-url") && document.getElementById("test-anim-url").value || "").trim();
  var httpsOk = function(s) { return s === "" || /^https:\/\/[^\s"'<>]+$/i.test(s); };
  if (!httpsOk(border) || !httpsOk(anim)) { showToast("Link harus diawali https://"); return; }
  try {
    await db.collection(COLLECTIONS.USERS).doc(currentUser.uid).set({ borderImgUrl: border, profileAnimUrl: anim }, { merge: true });
    if (userProfile) { userProfile.borderImgUrl = border; userProfile.profileAnimUrl = anim; }
    if (typeof allUsers !== "undefined" && Array.isArray(allUsers)) {
      var idx = allUsers.findIndex(function(x) { return x.id === currentUser.uid; });
      if (idx > -1) { allUsers[idx].borderImgUrl = border; allUsers[idx].profileAnimUrl = anim; }
    }
    showSuccessToast("Link tersimpan");
    renderPage();
  } catch (e) {
    console.error("Gagal simpan link test:", e);
    showErrorToast("Gagal simpan: " + (e.code || e.message || "error"));
  }
}

function setBorderTier(tier) {
  borderTierTab = tier;
  renderPage();
}

/* ==================== TAMBAH / HAPUS BORDER (ADMIN) ==================== */
var borderFormOpen = false;
function assetsColName() { return (typeof COLLECTIONS !== "undefined" && COLLECTIONS && COLLECTIONS.ASSETS) || "assets"; }
function toggleBorderForm() { borderFormOpen = !borderFormOpen; renderPage(); }
function borderFormHTML() {
  return '<div style="margin:0 20px 14px;padding:14px;border-radius:14px;background:var(--bg-2, #1f1f27);">' +
    '<input id="border-form-name" class="clan-form-input" placeholder="Nama border" style="margin-bottom:8px;">' +
    '<input id="border-form-url" class="clan-form-input" placeholder="https://... (PNG transparan, 1:1)" style="margin-bottom:8px;">' +
    '<select id="border-form-tier" class="clan-form-input" style="margin-bottom:8px;">' +
    '<option value="basic"' + (borderTierTab === "basic" ? " selected" : "") + '>Normal</option>' +
    '<option value="premium"' + (borderTierTab === "premium" ? " selected" : "") + '>Premium</option>' +
    '<option value="admin"' + (borderTierTab === "admin" ? " selected" : "") + '>Admin</option>' +
    '</select>' +
    '<button class="clan-action-btn" onclick="saveRemoteBorder()">Simpan Border</button></div>';
}
async function saveRemoteBorder() {
  if (!currentUser || !userProfile || userProfile.isAdmin !== true) { showToast("Khusus admin"); return; }
  var name = String((document.getElementById("border-form-name") || {}).value || "").trim();
  var url = String((document.getElementById("border-form-url") || {}).value || "").trim();
  var tier = (document.getElementById("border-form-tier") || {}).value || "basic";
  if (!name) { showToast("Nama border wajib diisi"); return; }
  if (!/^https:\/\//i.test(url)) { showToast("Link harus https"); return; }
  var list = await getBordersFromFirestore();
  var item = { id: "r-" + Date.now(), name: name, url: url, type: tier };
  try {
    await db.collection(assetsColName()).doc("borders").set({ list: list.concat([item]) }, { merge: true });
    borderFormOpen = false;
    showSuccessToast("Border ditambahkan");
    renderPage();
  } catch (e) {
    showErrorToast("Gagal simpan border: " + (e.code || e.message));
  }
}
async function deleteRemoteBorder(id) {
  if (!userProfile || userProfile.isAdmin !== true) return;
  if (!confirm("Hapus border ini?")) return;
  var list = await getBordersFromFirestore();
  try {
    await db.collection(assetsColName()).doc("borders").set({ list: list.filter(function(x) { return x.id !== id; }) }, { merge: true });
    showSuccessToast("Border dihapus");
    renderPage();
  } catch (e) {
    showErrorToast("Gagal hapus border: " + (e.code || e.message));
  }
}

/* ==================== BANNER BAWAAN (SVG) ==================== */
function makeBannerSvg(c1, c2, c3) {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset=".5" stop-color="' + c2 + '"/><stop offset="1" stop-color="' + c3 + '"/></linearGradient></defs><rect width="1200" height="400" fill="url(#g)"/><circle cx="180" cy="80" r="150" fill="#fff" fill-opacity=".08"/><circle cx="1010" cy="350" r="210" fill="#fff" fill-opacity=".07"/><circle cx="760" cy="120" r="70" fill="#fff" fill-opacity=".05"/></svg>';
}
var BUILTIN_BANNERS = [
  { id: "bn-aurora", name: "Aurora", type: "basic", svg: makeBannerSvg("#1e3a8a", "#7c3aed", "#06b6d4") },
  { id: "bn-sakura", name: "Sakura", type: "premium", svg: makeBannerSvg("#831843", "#f472b6", "#fde68a") },
  { id: "bn-inferno", name: "Inferno", type: "admin", svg: makeBannerSvg("#450a0a", "#dc2626", "#f97316") }
];
function resolveBannerUrl(v) {
  if (typeof v !== "string" || !v) return "";
  if (v.indexOf("builtin:") === 0) {
    var id = v.slice(8);
    var b = BUILTIN_BANNERS.find(function(x) { return x.id === id; });
    return b ? "data:image/svg+xml;utf8," + encodeURIComponent(b.svg) : "";
  }
  return /^https:\/\//i.test(v) ? v : "";
}
var bannerTierTab = "basic";
function isVideoUrl(u) { return /\.(mp4|webm)(\?|#|$)/i.test(String(u || "")); }
var bannerFormOpen = false;
function setBannerTier(tier) { bannerTierTab = tier; renderPage(); }
function toggleBannerForm() { bannerFormOpen = !bannerFormOpen; renderPage(); }
function bannerFormHTML() {
  return '<div style="margin:0 20px 14px;padding:14px;border-radius:14px;background:var(--bg-2, #1f1f27);">' +
    '<input id="banner-form-name" class="clan-form-input" placeholder="Nama banner" style="margin-bottom:8px;">' +
    '<input id="banner-form-url" class="clan-form-input" placeholder="https://... (gambar banner)" style="margin-bottom:8px;">' +
    '<select id="banner-form-tier" class="clan-form-input" style="margin-bottom:8px;">' +
    '<option value="basic"' + (bannerTierTab === "basic" ? " selected" : "") + '>Normal</option>' +
    '<option value="premium"' + (bannerTierTab === "premium" ? " selected" : "") + '>Premium</option>' +
    '<option value="admin"' + (bannerTierTab === "admin" ? " selected" : "") + '>Admin</option>' +
    '</select>' +
    '<button class="clan-action-btn" onclick="saveRemoteBanner()">Simpan Banner</button></div>';
}
async function saveRemoteBanner() {
  if (!currentUser || !userProfile || userProfile.isAdmin !== true) { showToast("Khusus admin"); return; }
  var name = String((document.getElementById("banner-form-name") || {}).value || "").trim();
  var url = String((document.getElementById("banner-form-url") || {}).value || "").trim();
  var tier = (document.getElementById("banner-form-tier") || {}).value || "basic";
  if (!name) { showToast("Nama banner wajib diisi"); return; }
  if (!/^https:\/\//i.test(url)) { showToast("Link harus https"); return; }
  var list = await getBannersFromFirestore();
  var item = { id: "rb-" + Date.now(), name: name, url: url, type: tier };
  try {
    await db.collection(assetsColName()).doc("banners").set({ list: list.concat([item]) }, { merge: true });
    bannerFormOpen = false;
    showSuccessToast("Banner ditambahkan");
    renderPage();
  } catch (e) { showErrorToast("Gagal simpan banner: " + (e.code || e.message)); }
}
async function deleteRemoteBanner(id) {
  if (!userProfile || userProfile.isAdmin !== true) return;
  if (!confirm("Hapus banner ini?")) return;
  var list = await getBannersFromFirestore();
  try {
    await db.collection(assetsColName()).doc("banners").set({ list: list.filter(function(x) { return x.id !== id; }) }, { merge: true });
    showSuccessToast("Banner dihapus");
    renderPage();
  } catch (e) { showErrorToast("Gagal hapus banner: " + (e.code || e.message)); }
}

/* ==================== KILAU BINGKAI (SHINE) ==================== */
function ensureFrameShineStyle() {
  if (document.getElementById("frame-shine-style")) return;
  var st = document.createElement("style");
  st.id = "frame-shine-style";
  st.textContent = "@keyframes frameShine{0%{background-position:150% 0}60%,100%{background-position:-150% 0}}" +
    ".frame-shine{position:absolute;z-index:3;left:50%;top:50%;transform:translate(-50%,-50%);width:120%;aspect-ratio:1/1;border-radius:50%;pointer-events:none;" +
    "background:linear-gradient(115deg,transparent 38%,rgba(255,255,255,.9) 50%,transparent 62%);background-size:300% 100%;background-repeat:no-repeat;" +
    "mix-blend-mode:screen;-webkit-mask-image:radial-gradient(circle closest-side,transparent 80%,#000 94%);mask-image:radial-gradient(circle closest-side,transparent 80%,#000 94%);" +
    "animation:frameShine 2.8s ease-in-out infinite;}";
  document.head.appendChild(st);
}
function frameShineHTML() {
  ensureFrameShineStyle();
  return '<span class="frame-shine"></span>';
}

/* ==================== TAG ROLE (PREMIUM & ADMIN) ==================== */
function ensureRoleTagStyle() {
  if (document.getElementById("role-tag-style")) return;
  var st = document.createElement("style");
  st.id = "role-tag-style";
  st.textContent =
    "@keyframes roleSheen{0%,55%{transform:translateX(-130%)}100%{transform:translateX(130%)}}" +
    ".role-tag{position:relative;overflow:hidden;display:inline-flex;align-items:center;gap:5px;padding:3px 9px 3px 7px;margin:0 0 0 8px;border-radius:999px;font-size:9.5px !important;font-weight:800 !important;letter-spacing:.6px;text-transform:uppercase;line-height:1;white-space:nowrap;flex-shrink:0;border:1px solid;opacity:1 !important;vertical-align:middle;}" +
    ".role-tag svg{width:11px;height:11px;flex-shrink:0;}" +
    ".role-tag::after{content:\"\";position:absolute;top:0;bottom:0;left:0;width:45%;background:linear-gradient(105deg,transparent 0%,rgba(255,255,255,.75) 50%,transparent 100%);animation:roleSheen 3.4s ease-in-out infinite;pointer-events:none;}" +
    ".role-tag-admin{color:#fff !important;background:linear-gradient(135deg,#ff5a5a 0%,#dc2626 50%,#7f1d1d 100%);border-color:rgba(255,255,255,.35);box-shadow:0 0 14px rgba(239,68,68,.6),inset 0 1px 0 rgba(255,255,255,.35);text-shadow:0 1px 2px rgba(0,0,0,.45);}" +
    ".role-tag-premium{color:#fff !important;background:linear-gradient(135deg,#7dd3fc 0%,#2563eb 50%,#1e3a8a 100%);border-color:rgba(255,255,255,.4);box-shadow:0 0 14px rgba(59,130,246,.6),inset 0 1px 0 rgba(255,255,255,.4);text-shadow:0 1px 2px rgba(0,0,0,.35);}" +
    ".role-tag-row{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:8px;margin:8px 0 0;}";
  document.head.appendChild(st);
}
var ROLE_ICON_SHIELD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
var ROLE_ICON_STAR = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2"/></svg>';
function roleTagsHTML(u) {
  if (!u) return "";
  ensureRoleTagStyle();
  var h = "";
  if (u.isAdmin === true) h += '<span class="role-tag role-tag-admin" style="margin-left:10px !important;">' + ROLE_ICON_SHIELD + 'Admin</span>';
  if (u.isPremium === true) h += '<span class="role-tag role-tag-premium" style="margin-left:6px !important;">' + ROLE_ICON_STAR + 'Premium</span>';
  return h;
}
function roleTagRowHTML(u) {
  var t = roleTagsHTML(u);
  return t ? '<div class="role-tag-row">' + t + '</div>' : "";
}


/* ==================== XP BESAR (sampai Oktiliun) ==================== */
var XP_SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc"];
function formatXPBig(xp) {
  var n = Number(xp) || 0;
  if (n < 1000) return String(Math.floor(n));
  var i = 0;
  while (n >= 1000 && i < XP_SUFFIXES.length - 1) { n = n / 1000; i++; }
  return n.toFixed(n < 100 ? 1 : 0) + XP_SUFFIXES[i];
}

/* ==================== RANK (termasuk rank baru Divine) ==================== */
var RANK_TIERS = [
  { min: 2000, name: "Divine", color: "#f472b6" },
  { min: 1000, name: "Mythic", color: "#ef4444" },
  { min: 500, name: "Legend", color: "#fbbf24" },
  { min: 200, name: "Grandmaster", color: "#f97316" },
  { min: 100, name: "Master", color: "#a855f7" },
  { min: 70, name: "Diamond", color: "#06b6d4" },
  { min: 40, name: "Platinum", color: "#10b981" },
  { min: 20, name: "Gold", color: "#fbbf24" },
  { min: 10, name: "Silver", color: "#94a3b8" },
  { min: 5, name: "Bronze", color: "#b45309" },
  { min: 0, name: "Rookie", color: "#6b7280" }
];
function calculateRankV2(level) {
  var lv = Number(level) || 1;
  var t = RANK_TIERS.find(function(x) { return lv >= x.min; }) || RANK_TIERS[RANK_TIERS.length - 1];
  return { name: t.name, color: t.color };
}

/* ==================== TEMAN (IKUTI & SALING IKUTI) ==================== */
var temanTab = "teman";
var searchMode = "anime";
var followCache = { following: {}, followers: {}, loaded: false };
var dmUnsub = null;
var dmTargetUid = null;
var POSTER_FALLBACK_SRC = "https://cdn.nekohime.site/file/wz3wk955.jpg";

function ensureTemanStyle() {
  if (document.getElementById("teman-style")) return;
  var st = document.createElement("style");
  st.id = "teman-style";
  st.textContent =
    ".teman-av{width:46px;height:46px;flex-shrink:0;}" +
    ".teman-av img{width:100%;height:100%;object-fit:cover;border-radius:50%;}" +
    ".teman-card{display:flex;align-items:center;gap:12px;padding:12px 14px;margin:0 16px 10px;background:linear-gradient(145deg,var(--bg-2) 0%,var(--bg-3) 100%);border:1px solid var(--border);border-radius:16px;}" +
    ".teman-name{display:flex;align-items:center;flex-wrap:wrap;gap:6px;font-size:14px;font-weight:800;min-width:0;}" +
    ".teman-id{font-size:11px;color:var(--text-mute);font-weight:700;}" +
    ".teman-btn{padding:7px 12px;border-radius:999px;font-size:11px;font-weight:800;border:1px solid var(--border);background:var(--bg);color:var(--text-dim);white-space:nowrap;}" +
    ".teman-btn.primary{background:var(--grad);color:#fff;border-color:transparent;box-shadow:0 6px 16px rgba(124,58,237,.35);}" +
    ".teman-btn.danger{color:#f87171;border-color:rgba(239,68,68,.35);}" +
    ".teman-tabs{display:flex;margin:8px 16px 14px;border-bottom:1px solid rgba(255,255,255,.08);}" +
    ".teman-tab{flex:1;background:none;border:none;padding:12px 0;font-size:14px;font-weight:700;cursor:pointer;}";
  document.head.appendChild(st);
}

/* ---- data follow ---- */
function followDocId(from, to) { return from + "_" + to; }
async function loadFollowState() {
  if (!currentUser) return;
  var a = await db.collection("follows").where("from", "==", currentUser.uid).get();
  var b = await db.collection("follows").where("to", "==", currentUser.uid).get();
  var st = { following: {}, followers: {}, loaded: true };
  a.forEach(function(d) { st.following[d.data().to] = true; });
  b.forEach(function(d) { st.followers[d.data().from] = true; });
  followCache = st;
}
function isFollowing(uid) { return !!followCache.following[uid]; }
function isFollowedBy(uid) { return !!followCache.followers[uid]; }
function isMutual(uid) { return isFollowing(uid) && isFollowedBy(uid); }
function refreshCurrentView() { renderPage(); }

async function followUserById(uid) {
  if (!currentUser) { showToast("Login dulu"); return; }
  if (!uid || uid === currentUser.uid) { showToast("Itu akunmu sendiri"); return; }
  try {
    await db.collection("follows").doc(followDocId(currentUser.uid, uid)).set({
      from: currentUser.uid, to: uid, createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    await loadFollowState();
    showToast(isMutual(uid) ? "Sekarang berteman!" : "Kamu mengikuti user ini");
    refreshCurrentView();
  } catch (e) { showToast("Gagal ikuti: " + (e.code || e.message)); }
}
async function unfollowUserById(uid, question) {
  if (question && !window.confirm(question)) return;
  try {
    await db.collection("follows").doc(followDocId(currentUser.uid, uid)).delete();
    await loadFollowState();
    showToast("Berhenti mengikuti");
    refreshCurrentView();
  } catch (e) { showToast("Gagal: " + (e.code || e.message)); }
}
async function toggleFollowUid(uid) {
  if (!currentUser) { showToast("Login dulu"); return; }
  if (!followCache.loaded) await loadFollowState();
  if (isFollowing(uid)) unfollowUserById(uid);
  else followUserById(uid);
}

/* ---- tampilan baris user ---- */
function temanRowHTML(otherUid, actionsHTML, sub) {
  var u = findUserForAuthor(otherUid, null) || { username: "Pengguna", avatar: "", id: otherUid };
  var safeName = String(u.username || "").replace(/'/g, "\\'");
  var userBorderObj = (typeof getAvailableBorders === "function") ? getAvailableBorders(u).find(function(b) { return b.id === u.equippedBorder; }) : null;
  var borderStyle = userBorderObj ? userBorderObj.style : "none";
  var verifiedHTML = u.verified ? '<img class="verified-badge verified-badge-sm" src="' + u.verified + '" alt="">' : "";
  return '<div class="teman-card" style="flex-wrap:wrap;align-items:center;">' +
    '<div onclick="openPublicProfile(\'' + safeName + '\')" style="cursor:pointer;">' +
    '<div class="teman-av">' + renderAvatarWithBorder(u.avatar, borderStyle, "teman-av", u.borderImgUrl) + '</div></div>' +
    '<div style="flex:1 1 180px;min-width:0;">' +
    '<div class="watch-comment-name-row" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-start;gap:6px;margin:0;min-width:0;">' +
    '<span class="watch-comment-name" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(u.username || "") + '</span>' + verifiedHTML +
    '<span class="watch-comment-id">' + escapeHtml(u.userId || "#?") + '</span>' +
    roleTagsHTML(u) + '</div>' +
    '<div class="watch-comment-level-row" style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:4px 0 0;">' +
    (u.clanName ? '<span class="watch-comment-clan" style="--clan-color:' + ((typeof clanList !== "undefined" && Array.isArray(clanList) && (clanList.find(function(c) { return c.name === u.clanName; }) || {}).color) || (typeof generateClanColor === "function" ? generateClanColor(u.clanName) : "#888")) + ';"><span class="clan-badge-shimmer"></span><span class="clan-badge-text">' + escapeHtml(String(u.clanName).toUpperCase()) + '</span></span>' : "") +
    '<span class="watch-comment-rank" style="color:' + calculateRankV2(u.level || 1).color + ';border-color:' + calculateRankV2(u.level || 1).color + ';margin:0;">' + calculateRankV2(u.level || 1).name + '</span>' +
    '<span class="watch-comment-level">Lvl ' + (u.level || 1) + '</span>' + (sub ? '<span style="font-size:10px;color:var(--text-mute);">' + sub + '</span>' : "") + '</div>' +
    '</div>' +
    '<div style="display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px;width:100%;margin-top:8px;">' + actionsHTML + '</div></div>';
}
function followBtnHTML(uid) {
  if (isMutual(uid)) return '<button class="teman-btn" onclick="unfollowUserById(\'' + uid + '\', \'Berhenti berteman dengan user ini?\')">Berteman</button>';
  if (isFollowing(uid)) return '<button class="teman-btn" onclick="unfollowUserById(\'' + uid + '\')">Mengikuti</button>';
  return '<button class="teman-btn primary" onclick="followUserById(\'' + uid + '\')">Ikuti</button>';
}

/* ---- tombol di profil publik: ikuti / mengikuti / berteman + chat ---- */
function publicProfileActionsHTML(u) {
  var share = '<button class="profile-action-btn" onclick="shareProfile(\'' + String(u.username).replace(/'/g, "\\'") + '\')">' + icons.share + ' Bagikan</button>';
  if (!currentUser || u.id === currentUser.uid) return '<div class="profile-actions fade-up d2">' + share + '</div>';
  if (!followCache.loaded) {
    loadFollowState().then(function() { if (currentTab === "public-profile") renderPage(); });
  }
  var main;
  if (isMutual(u.id)) {
    main = '<button class="profile-action-btn" onclick="unfollowUserById(\'' + u.id + '\', \'Berhenti berteman dengan user ini?\')">' + icons.heart + ' Berteman</button>' +
      '<button class="profile-action-btn" onclick="openDM(\'' + u.id + '\')">Chat</button>';
  } else if (isFollowing(u.id)) {
    main = '<button class="profile-action-btn" onclick="unfollowUserById(\'' + u.id + '\')">' + icons.heart + ' Mengikuti</button>';
  } else {
    main = '<button class="profile-action-btn" onclick="followUserById(\'' + u.id + '\')">' + icons.heart + ' Ikuti</button>';
  }
  return '<div class="profile-actions fade-up d2">' + main + share + '</div>';
}

/* ---- halaman Teman ---- */
async function renderTeman(main) {
  ensureTemanStyle();
  var header = '<div class="page-header fade-up" style="padding-top:20px;"><button class="page-back" onclick="switchTab(\'profil\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button><div class="page-header-title">Teman</div></div>';
  if (!currentUser) { main.innerHTML = header + '<p style="text-align:center;color:var(--text-mute);padding:60px 20px;">Login dulu untuk punya teman</p>'; return; }
  main.innerHTML = header + '<p style="text-align:center;color:var(--text-mute);padding:30px;">Memuat...</p>';
  await loadFollowState();
  var following = Object.keys(followCache.following);
  var mutual = following.filter(isFollowedBy);
  var onlyFollowing = following.filter(function(x) { return !isFollowedBy(x); });
  var onlyFollowers = Object.keys(followCache.followers).filter(function(x) { return !isFollowing(x); });
  var tabs = [["teman", "Teman (" + mutual.length + ")"], ["mengikuti", "Mengikuti (" + onlyFollowing.length + ")"], ["pengikut", "Pengikut (" + onlyFollowers.length + ")"]];
  var tabHTML = '<div class="teman-tabs">' + tabs.map(function(t) {
    var on = temanTab === t[0];
    return '<button class="teman-tab" onclick="setTemanTab(\'' + t[0] + '\')" style="color:' + (on ? "#fff" : "#8b8b99") + ';border-bottom:2px solid ' + (on ? "var(--accent,#a855f7)" : "transparent") + ';">' + t[1] + '</button>';
  }).join("") + '</div>';
  var list = temanTab === "teman" ? mutual : temanTab === "mengikuti" ? onlyFollowing : onlyFollowers;
  var body = list.length === 0 ? '<div style="text-align:center;color:var(--text-mute);padding:40px 20px;">Belum ada di daftar ini</div>' :
    list.map(function(uid) {
      if (temanTab === "teman") return temanRowHTML(uid, '<button class="teman-btn primary" onclick="openDM(\'' + uid + '\')">Chat</button>' + followBtnHTML(uid), "saling mengikuti");
      if (temanTab === "mengikuti") return temanRowHTML(uid, followBtnHTML(uid), "kamu ikuti");
      return temanRowHTML(uid, followBtnHTML(uid), "mengikutimu");
    }).join("");
  main.innerHTML = header + tabHTML + body;
}
function setTemanTab(t) { temanTab = t; renderPage(); }
function openTeman() {
  unlockScroll(); exitFakeFullscreen(); watchFromTab = currentTab; currentTab = "teman"; watchOpen = false; stopAutoSlide(); renderPage(); window.scrollTo({ top: 0 });
}

/* ---- chat teman (hanya kalau saling mengikuti) ---- */
function chatIdOf(a, b) { return [a, b].sort().join("_"); }
function openDM(uid) { dmTargetUid = uid; currentTab = "dm"; renderPage(); window.scrollTo({ top: 0 }); }
async function renderDM(main) {
  ensureTemanStyle();
  if (dmUnsub) { dmUnsub(); dmUnsub = null; }
  if (!followCache.loaded) await loadFollowState();
  var other = findUserForAuthor(dmTargetUid, null) || { username: "Teman", id: dmTargetUid, avatar: "" };
  main.innerHTML = '<div class="page-header fade-up" style="padding-top:20px;"><button class="page-back" onclick="switchTab(\'teman\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button><div class="page-header-title">' + escapeHtml(other.username || "Teman") + '</div></div>' +
    '<div id="dm-list" style="padding:0 16px;display:flex;flex-direction:column;gap:8px;min-height:50vh;padding-bottom:90px;"></div>' +
    '<div style="position:fixed;left:0;right:0;bottom:70px;padding:10px 14px;background:var(--bg);border-top:1px solid var(--border);display:flex;gap:8px;">' +
    '<input id="dm-input" placeholder="Tulis pesan..." style="flex:1;padding:11px 14px;border-radius:999px;background:var(--bg-3);border:1px solid var(--border);color:var(--text);outline:none;font-size:14px;">' +
    '<button class="teman-btn primary" onclick="sendDM()">Kirim</button></div>';
  var el = document.getElementById("dm-list");
  if (!isMutual(dmTargetUid)) { if (el) el.innerHTML = '<p style="text-align:center;color:var(--text-mute);padding:40px 0;">Kalian harus saling mengikuti untuk chat</p>'; return; }
  var ref = db.collection("chats").doc(chatIdOf(currentUser.uid, dmTargetUid)).collection("messages").orderBy("createdAt");
  dmUnsub = ref.onSnapshot(function(snap) {
    var box = document.getElementById("dm-list");
    if (!box) return;
    var html = "";
    snap.forEach(function(d) {
      var m = d.data(); var mine = m.uid === currentUser.uid;
      html += '<div style="align-self:' + (mine ? "flex-end" : "flex-start") + ';max-width:78%;padding:9px 13px;border-radius:16px;font-size:14px;line-height:1.4;background:' + (mine ? "var(--grad)" : "var(--bg-3)") + ';color:' + (mine ? "#fff" : "var(--text)") + ';word-break:break-word;">' + escapeHtml(m.text || "") + '</div>';
    });
    box.innerHTML = html || '<p style="text-align:center;color:var(--text-mute);padding:40px 0;">Belum ada pesan</p>';
    box.scrollTop = box.scrollHeight;
  }, function(err) {
    var box = document.getElementById("dm-list");
    if (box) box.innerHTML = '<p style="text-align:center;color:var(--text-mute);padding:40px 0;">Gagal memuat chat: ' + escapeHtml(err.code || err.message) + '</p>';
  });
}
async function sendDM() {
  var input = document.getElementById("dm-input");
  var text = input ? input.value.trim() : "";
  if (!text || !currentUser || !dmTargetUid) return;
  if (!isMutual(dmTargetUid)) { showToast("Harus saling mengikuti dulu"); return; }
  try {
    var cid = chatIdOf(currentUser.uid, dmTargetUid);
    var chatRef = db.collection("chats").doc(cid);
    var snap = await chatRef.get();
    if (!snap.exists) await chatRef.set({ users: [currentUser.uid, dmTargetUid] });
    await chatRef.collection("messages").add({
      uid: currentUser.uid, text: text.slice(0, 500), createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    input.value = "";
  } catch (e) { showToast("Gagal kirim: " + (e.code || e.message)); }
}

/* ---- pencarian Teman/User ---- */
function searchModeTabsHTML() {
  var modes = [["anime", "Anime"], ["user", "Teman / User"]];
  return '<div style="display:flex;margin:4px 16px 12px;padding:4px;background:var(--bg-2);border:1px solid var(--border);border-radius:14px;">' +
    modes.map(function(m) {
      var on = searchMode === m[0];
      return '<button onclick="setSearchMode(\'' + m[0] + '\')" style="flex:1;padding:9px 0;border-radius:10px;font-size:13px;font-weight:800;border:none;background:' + (on ? "var(--grad)" : "transparent") + ';color:' + (on ? "#fff" : "var(--text-dim)") + ';">' + m[1] + '</button>';
    }).join("") + '</div>';
}
function setSearchMode(m) { searchMode = m; renderPage(); }
function userSearchResultsHTML() {
  var q = String(searchQuery || "").trim().toLowerCase();
  var me = currentUser ? currentUser.uid : "";
  var pool = (Array.isArray(allUsers) ? allUsers : []).filter(function(u) { return u && u.id !== me; });
  var found = q ? pool.filter(function(u) {
    return String(u.username || "").toLowerCase().indexOf(q) > -1 || String(u.userId || "").toLowerCase().indexOf(q) > -1;
  }).slice(0, 30) : pool.slice().sort(function(a, b) { return (b.level || 0) - (a.level || 0); }).slice(0, 30);
  if (found.length === 0) return '<div style="text-align:center;color:var(--text-mute);padding:40px 20px;">' + (q ? "User tidak ditemukan" : "Belum ada user lain") + '</div>';
  var head = q ? "" : '<div style="font-size:12px;color:var(--text-mute);padding:0 16px 8px;">Ketik username atau ID untuk mencari, atau pilih dari daftar</div>';
  return head + found.map(function(u) {
    var safe = String(u.username || "").replace(/'/g, "\\'");
    var chatBtn = isMutual(u.id) ? '<button class="teman-btn primary" onclick="openDM(\'' + u.id + '\')">Chat</button>' : "";
    return temanRowHTML(u.id, chatBtn + followBtnHTML(u.id), isMutual(u.id) ? "saling mengikuti" : "");
  }).join("");
}
async function renderSearchUsers(main) {
  ensureTemanStyle();
  if (currentUser && !followCache.loaded) await loadFollowState();
  main.innerHTML = '<div class="search-header fade-up"><button class="search-back" onclick="switchTab(\'home\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button>' +
    '<div class="search-bar-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>' +
    '<input id="search-bar" class="search-bar-input" placeholder="Cari username atau ID..." value="' + escapeHtml(searchQuery || "") + '" oninput="onSearchInput(this.value)"></div></div>' +
    searchModeTabsHTML() + '<div id="user-search-wrap">' + userSearchResultsHTML() + '</div>';
}
function updateUserSearchResults() {
  var wrap = document.getElementById("user-search-wrap");
  if (wrap) wrap.innerHTML = userSearchResultsHTML();
}

/* ---- logo cadangan untuk poster yang gagal dimuat ---- */
document.addEventListener("error", function(e) {
  var t = e.target;
  if (!t || t.tagName !== "IMG") return;
  if (t.getAttribute("onerror") || t.classList.contains("verified-badge") || t.dataset.fallbackDone) return;
  t.dataset.fallbackDone = "1";
  t.referrerPolicy = "no-referrer";
  t.style.objectFit = "contain";
  t.style.background = "var(--bg-3, #1c1c2b)";
  t.src = POSTER_FALLBACK_SRC;
}, true);

/* ---- gaya tag clan: pill bersih tanpa potongan, dipakai di chat, komentar, daftar Teman, dan profil ---- */
(function ensureClanTagStyleNow() {
  if (document.getElementById("clan-tag-style")) return;
  var st = document.createElement("style");
  st.id = "clan-tag-style";
  st.textContent =
    ".watch-comment-clan, .clan-badge-profile {" +
    "display:inline-flex !important;align-items:center;justify-content:center;gap:5px;position:relative;margin:0;" +
    "padding:2px 9px 2px 7px !important;font-size:9.5px !important;font-weight:800 !important;letter-spacing:.4px !important;" +
    "line-height:1.3 !important;color:#fff !important;white-space:nowrap;overflow:hidden;border-radius:999px !important;" +
    "clip-path:none !important;" +
    "border:1px solid color-mix(in srgb, var(--clan-color, #a855f7) 60%, #fff) !important;" +
    "background:linear-gradient(135deg, var(--clan-color, #a855f7), color-mix(in srgb, var(--clan-color, #a855f7) 55%, #000)) !important;" +
    "box-shadow:0 0 8px color-mix(in srgb, var(--clan-color, #a855f7) 40%, transparent) !important;" +
    "text-shadow:0 1px 1px rgba(0,0,0,.45);}" +
    ".clan-badge-profile {font-size:11px !important;padding:4px 12px 4px 9px !important;}" +
    ".watch-comment-clan::before {content:'';width:5px;height:5px;border-radius:50%;background:#fff;opacity:.9;flex-shrink:0;}" +
    ".clan-badge-profile::before {display:none !important;}" +
    ".clan-badge-shimmer {display:none !important;}" +
    ".clan-badge-profile svg {width:12px;height:12px;stroke:#fff;fill:none;flex-shrink:0;position:relative;z-index:2;}";
  document.head.appendChild(st);
})();
