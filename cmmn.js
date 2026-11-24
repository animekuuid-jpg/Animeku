/* ==================== COMMENTS SYSTEM (Firestore) ==================== */
/* Komentar per episode, realtime, optimistic UI.
   Urutan waktu dilakukan di JavaScript (bukan orderBy), supaya tidak butuh composite index. */

let commentsListener = null;
let currentComments = [];
let currentCommentsKey = "";

/* ==================== HELPER URUTAN WAKTU ==================== */
function commentTimeMs(c) {
  var t = c.createdAt;
  if (!t) return Date.now();
  if (typeof t.toMillis === "function") return t.toMillis();
  if (typeof t.toDate === "function") return t.toDate().getTime();
  var d = new Date(t).getTime();
  return isNaN(d) ? Date.now() : d;
}

function sortCommentsDesc(list) {
  return list.sort(function(a, b) { return commentTimeMs(b) - commentTimeMs(a); });
}

/* ==================== AMBIL KOMENTAR (sekali) ==================== */
async function getCommentsFromFirestore(slug, ep) {
  if (!slug || !ep) return [];
  if (!firebaseReady) return [];

  var normalizedSlug = String(slug).toLowerCase().trim();
  var normalizedEp = Number(ep);

  try {
    const snapshot = await db.collection(COLLECTIONS.COMMENTS)
      .where("animeSlug", "==", normalizedSlug)
      .where("episode", "==", normalizedEp)
      .get();

    const comments = [];
    snapshot.forEach(doc => {
      comments.push({ id: doc.id, ...doc.data({ serverTimestamps: "estimate" }) });
    });
    console.log("Loaded " + comments.length + " comments for " + normalizedSlug + " ep" + normalizedEp);
    return sortCommentsDesc(comments);
  } catch (e) {
    console.error("Gagal ambil komentar:", e);
    return [];
  }
}

/* ==================== REALTIME LISTENER ==================== */
/* includeMetadataChanges: true → tulisan pending (belum tersimpan di server) ikut muncul.
   serverTimestamps: "estimate" → createdAt tidak null saat tulisan masih pending. */
function listenComments(slug, ep, callback) {
  mountEpisodeStickerUI();
  stopListenComments();

  if (!slug || !ep) return;
  if (!firebaseReady) return;

  var normalizedSlug = String(slug).toLowerCase().trim();
  var normalizedEp = Number(ep);
  currentCommentsKey = normalizedSlug + "-" + normalizedEp;

  try {
    commentsListener = db.collection(COLLECTIONS.COMMENTS)
      .where("animeSlug", "==", normalizedSlug)
      .where("episode", "==", normalizedEp)
      .onSnapshot({ includeMetadataChanges: true }, (snapshot) => {
        if (currentCommentsKey !== normalizedSlug + "-" + normalizedEp) return;

        const comments = [];
        snapshot.forEach(doc => {
          comments.push({ id: doc.id, ...doc.data({ serverTimestamps: "estimate" }) });
        });
        sortCommentsDesc(comments);
        currentComments = comments;
        if (typeof callback === "function") callback(comments);
      }, (err) => {
        console.error("Realtime komentar error:", err.message);
      });
  } catch (e) {
    console.error("Listen komentar gagal:", e);
  }
}

function stopListenComments() {
  if (commentsListener) {
    try { commentsListener(); } catch (e) {}
    commentsListener = null;
  }
  currentComments = [];
  currentCommentsKey = "";
}

/* ==================== KIRIM KOMENTAR (Firestore) ==================== */
async function sendCommentToFirestore(slug, ep, text, replyToId = null, sticker = null) {
  if (!currentUser || !currentUserProfile) {
    showToast("Belum login");
    return false;
  }
  if (!slug || !ep || (!sticker && (!text || !text.trim()))) return false;
  if (!firebaseReady) return false;

  var normalizedSlug = String(slug).toLowerCase().trim();
  var normalizedEp = Number(ep);
  var cleanText = sticker ? "" : String(text || "").trim().slice(0, 500);

  try {
    if (replyToId) {
      const commentRef = db.collection(COLLECTIONS.COMMENTS).doc(replyToId);
      const commentDoc = await commentRef.get();
      if (!commentDoc.exists) throw new Error("Komentar induk gak ada");

      const data = commentDoc.data();
      const replies = data.replies || [];
      replies.push({
        id: "r" + Date.now(),
        uid: currentUser.uid,
        user: currentUserProfile.username,
        userId: currentUserProfile.userId,
        avatar: currentUserProfile.avatar || "",
        content: cleanText,
        createdAt: new Date().toISOString()
      });

      await commentRef.update({ replies });
      return true;
    } else {
      const newComment = {
        animeSlug: normalizedSlug,
        episode: normalizedEp,
        uid: currentUser.uid,
        user: currentUserProfile.username,
        userId: currentUserProfile.userId,
        avatar: currentUserProfile.avatar || "",
        content: cleanText,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        likes: 0,
        likedBy: [],
        replies: [],
        tag: "Normal",
        ...(sticker ? { type: "sticker", sticker: sticker } : {})
      };

      const ref = await db.collection(COLLECTIONS.COMMENTS).add(newComment);
      return { id: ref.id, animeSlug: normalizedSlug, episode: normalizedEp, ...newComment };
    }
  } catch (e) {
    console.error("Gagal kirim komentar:", e);
    showErrorToast("Gagal kirim komentar");
    return false;
  }
}

/* ==================== KIRIM KOMENTAR (optimistic UI) ==================== */
/* Komentar langsung muncul di layar, lalu diganti data asli dari listener.
   Kalau gagal, item sementara dibuang dan teks dikembalikan ke input. */
async function sendComment() {
  var input = document.getElementById("comment-input");
  if (!input || !currentUser || !currentUserProfile) return;
  var text = input.value.trim();
  if (!text) return;

  if (text.toLowerCase().startsWith("/stiker")) {
    stickerTarget = "episode";
    handleStickerCommand(text, input);
    return;
  }

  var slug = currentAnimeSlug;
  var ep = currentEpisode;
  var replyId = replyToComment;
  replyToComment = null;

  var tempId = "tmp-" + Date.now();
  var nowIso = new Date().toISOString();
  var me = {
    uid: currentUser.uid,
    user: currentUserProfile.username,
    userId: currentUserProfile.userId,
    avatar: currentUserProfile.avatar || ""
  };

  var list;
  if (replyId) {
    list = currentComments.map(function(c) {
      if (c.id !== replyId) return c;
      var newReply = Object.assign({ id: tempId, content: text.slice(0, 500), createdAt: nowIso, pending: true }, me);
      return Object.assign({}, c, { replies: (c.replies || []).concat([newReply]) });
    });
  } else {
    var pendingItem = Object.assign({
      id: tempId,
      content: text.slice(0, 500),
      createdAt: nowIso,
      likes: 0,
      likedBy: [],
      replies: [],
      tag: "Normal",
      pending: true
    }, me);
    list = [pendingItem].concat(currentComments);
  }

  currentComments = list;
  input.value = "";
  input.placeholder = "Tulis komentar di Episode " + ep + "...";
  renderCommentList(list);
  if (navigator.vibrate) navigator.vibrate(30);

  var result = await sendCommentToFirestore(slug, ep, text, replyId);

  // Pengguna mungkin sudah pindah episode saat menunggu server
  var stillHere = currentAnimeSlug === slug && currentEpisode === ep;

  if (!result) {
    currentComments = currentComments
      .filter(function(c) { return c.id !== tempId; })
      .map(function(c) {
        return Object.assign({}, c, {
          replies: (c.replies || []).filter(function(r) { return r.id !== tempId; })
        });
      });
    if (stillHere) {
      renderCommentList(currentComments);
      var inp = document.getElementById("comment-input");
      if (inp && !inp.value) inp.value = text;
    }
    return;
  }

  try {
    var newCount = (currentUserProfile.comments || 0) + 1;
    await fbUpdate(COLLECTIONS.USERS, currentUser.uid, { comments: newCount });
    currentUserProfile.comments = newCount;
    userProfile.comments = newCount;
    var idx = allUsers.findIndex(function(u) { return u.id === currentUser.uid; });
    if (idx > -1) allUsers[idx].comments = newCount;
  } catch (e) {}
}

/* ==================== RENDER LIST KOMENTAR ==================== */
function renderCommentList(list) {
  var el = document.getElementById("comment-list");
  var count = document.getElementById("comment-count");
  if (count) count.textContent = list.length;
  if (!el) return;

  if (list.length === 0) {
    el.innerHTML = '<div class="comment-empty-black"><svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>Belum ada komentar di Episode ' + currentEpisode + '</p></div>';
    return;
  }
  el.innerHTML = list.map(watchCommentHTML).join("");
}

/* ==================== REPLY ==================== */
function replyComment(id) {
  replyToComment = id;
  var input = document.getElementById("comment-input");
  if (input) {
    input.focus();
    input.placeholder = "Balas komentar...";
  }
  showToast("Balas komentar");
}

/* ==================== LIKE / UNLIKE ==================== */
async function toggleLikeComment(commentId) {
  if (!currentUser) { showToast("Belum login"); return false; }
  if (!commentId) return false;
  if (!firebaseReady) return false;

  try {
    const commentRef = db.collection(COLLECTIONS.COMMENTS).doc(commentId);
    const commentDoc = await commentRef.get();
    if (!commentDoc.exists) throw new Error("Komentar gak ada");

    const data = commentDoc.data();
    let likedBy = data.likedBy || [];
    const uid = currentUser.uid;
    const isLiked = likedBy.includes(uid);

    if (isLiked) likedBy = likedBy.filter(id => id !== uid);
    else likedBy.push(uid);

    await commentRef.update({ likedBy, likes: likedBy.length });
    return !isLiked;
  } catch (e) {
    console.error("Gagal like:", e);
    return false;
  }
}

async function likeComment(id) {
  if (!id || String(id).indexOf("tmp-") === 0) return;
  await toggleLikeComment(id);
}

/* ==================== HAPUS KOMENTAR ==================== */
async function deleteCommentFromFirestore(commentId) {
  if (!currentUser || !commentId || !firebaseReady) return false;

  try {
    const commentRef = db.collection(COLLECTIONS.COMMENTS).doc(commentId);
    const commentDoc = await commentRef.get();
    if (!commentDoc.exists) return false;

    const data = commentDoc.data();
    if (data.uid !== currentUser.uid) {
      showErrorToast("Cuma bisa hapus komentar sendiri");
      return false;
    }

    await commentRef.delete();
    return true;
  } catch (e) {
    console.error("Gagal hapus:", e);
    return false;
  }
}

async function deleteComment(id) {
  if (!confirm("Hapus komentar ini?")) return;
  var ok = await deleteCommentFromFirestore(id);
  if (ok) showSuccessToast("Komentar dihapus");
}

/* ==================== HAPUS REPLY ==================== */
async function deleteReplyFromFirestore(commentId, replyId) {
  if (!currentUser || !commentId || !replyId || !firebaseReady) return false;

  try {
    const commentRef = db.collection(COLLECTIONS.COMMENTS).doc(commentId);
    const commentDoc = await commentRef.get();
    if (!commentDoc.exists) return false;

    const data = commentDoc.data();
    const replies = data.replies || [];
    const reply = replies.find(r => r.id === replyId);

    if (!reply || reply.uid !== currentUser.uid) {
      showErrorToast("Cuma bisa hapus reply sendiri");
      return false;
    }

    const newReplies = replies.filter(r => r.id !== replyId);
    await commentRef.update({ replies: newReplies });
    return true;
  } catch (e) {
    console.error("Gagal hapus reply:", e);
    return false;
  }
}

async function deleteReply(commentId, replyId) {
  if (!confirm("Hapus reply ini?")) return;
  var ok = await deleteReplyFromFirestore(commentId, replyId);
  if (ok) showSuccessToast("Reply dihapus");
}

/* ==================== RENDER 1 KOMENTAR ==================== */
function renderEpisodeStickerBubble(c) {
  const s = typeof getStickerDef === "function" ? getStickerDef(c.sticker) : null;
  if (!s) return '<div class="watch-comment-text">[stiker tidak dikenal]</div>';
  let visual;
  if (s.svg) {
    visual = s.svg.replace("<svg ", '<svg width="100%" height="100%" style="display:block;" ');
  } else {
    visual = '<img src="' + escapeAttr(s.url) + '" alt="" loading="lazy" style="width:100%;height:100%;object-fit:contain;display:block;">';
  }
  // Pinggiran diblur tipis di keempat sisi, bentuk tetap kotak dengan ukuran asli
  const feather = "linear-gradient(to right, transparent 0, #000 6%, #000 94%, transparent 100%), linear-gradient(to bottom, transparent 0, #000 6%, #000 94%, transparent 100%)";
  return '<div style="width:96px;height:96px;margin:6px 0 2px;-webkit-mask-image:' + feather + ';-webkit-mask-composite:source-in;mask-image:' + feather + ';mask-composite:intersect;">' + visual + '</div>';
}

function watchCommentHTML(c) {
  var isOwn = !c.pending && (c.uid === (currentUser && currentUser.uid) || c.user === userProfile.username);
  var commenterUser = findUserForAuthor(c.uid, c.user, c.userId);
  var avatarUrl = (commenterUser && commenterUser.avatar) || c.avatar || DEFAULT_AVATAR_SRC;
  var commenterLevel = (commenterUser && commenterUser.level) || c.level || 1;
  var commenterRank = (commenterUser && commenterUser.rank) || calculateRank(commenterLevel).name;
  var rankInfo = calculateRank(commenterLevel);
  var liveName = (commenterUser && commenterUser.username) || c.user || "";
  var safeName = escapeAttr(liveName);
  var bannerUrl = (commenterUser && commenterUser.bannerUrl) || "";
  var bannerType = (commenterUser && commenterUser.bannerType) || "image";
  var hasBanner = !!bannerUrl;
  var isPremium = commenterUser && commenterUser.isPremium === true;
  var clanName = (commenterUser && commenterUser.clanName) || "";
  var clanColor = getClanColorForUser(commenterUser);

  var userBorderObj = getAvailableBorders(commenterUser || {}).find(function(b) {
    return b.id === (commenterUser && commenterUser.equippedBorder);
  });
  var borderStyle = userBorderObj ? userBorderObj.style : "none";

  var bannerHTML = "";
  if (hasBanner) {
    if (bannerType === "video") {
      bannerHTML = '<div class="watch-comment-banner-bg"><video src="' + escapeAttr(bannerUrl) + '" autoplay loop muted playsinline webkit-playsinline></video><div class="watch-comment-banner-overlay"></div></div>';
    } else {
      bannerHTML = '<div class="watch-comment-banner-bg"><img src="' + escapeAttr(bannerUrl) + '" alt=""><div class="watch-comment-banner-overlay"></div></div>';
    }
  }

  var likedBy = c.likedBy || [];
  var isLiked = likedBy.indexOf(currentUser && currentUser.uid) > -1;
  var likeCount = likedBy.length || c.likes || 0;
  var timeText = c.pending
    ? "mengirim..."
    : (typeof formatCommentTime === "function" ? formatCommentTime(c.createdAt) : (c.createdAt || "baru saja"));

  return '<div class="watch-comment ' + (hasBanner ? "has-banner" : "") + '">' + bannerHTML +
    '<div class="watch-comment-inner">' +
    '<div class="watch-comment-avatar-wrap">' + renderAvatarWithBorder(avatarUrl, borderStyle, "comment-avatar comment-avatar-clickable", commenterUser && commenterUser.borderImgUrl) + '</div>' +
    '<div class="watch-comment-body">' +
    '<div class="watch-comment-name-row" style="display:flex;flex-wrap:nowrap;align-items:center;gap:6px;min-width:0;"><span class="watch-comment-name comment-name-clickable" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" onclick="openPublicProfile(\'' + safeName + '\')">' + escapeHtml(liveName) + '</span>' +
    (commenterUser && commenterUser.verified ? '<img class="verified-badge" src="' + escapeAttr(commenterUser.verified) + '" alt="">' : "") +
    '<span class="watch-comment-id">' + escapeHtml(c.userId || "") + '</span>' + roleTagsHTML(commenterUser) +
    '</div>' +
    '<div class="watch-comment-level-row" style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:4px 0 0;">' +
    (clanName ? '<span class="watch-comment-clan" style="--clan-color:' + clanColor + ';"><span class="clan-badge-shimmer"></span><span class="clan-badge-text">' + escapeHtml(clanName.toUpperCase()) + '</span></span>' : "") +
    '<span class="watch-comment-rank" style="color:' + rankInfo.color + ';border-color:' + rankInfo.color + ';">' + escapeHtml(commenterRank) + '</span>' +
    '<span class="watch-comment-level">Lvl ' + commenterLevel + '</span><span class="watch-comment-time">' + timeText + '</span></div>' +
    (c.type === "sticker" ? renderEpisodeStickerBubble(c) : '<div class="watch-comment-text">' + escapeHtml(c.content) + '</div>') +
    '<div class="watch-comment-footer"><div class="comment-actions">' +
    (c.pending ? '' :
      '<span class="watch-comment-reply" onclick="replyComment(\'' + c.id + '\')">' + icons.reply + ' Reply</span>' +
      '<span class="watch-comment-like ' + (isLiked ? "liked" : "") + '" onclick="likeComment(\'' + c.id + '\')">' + (isLiked ? icons.heartFill : icons.heart) + '<span>' + likeCount + '</span></span>') +
    (isOwn ? '<span class="watch-comment-del" onclick="deleteComment(\'' + c.id + '\')">' + icons.trash + '</span>' : "") + '</div>' +
    '<span class="watch-comment-tag ' + (c.tag === "Epic" ? "tag-epic" : "tag-normal") + '">' + escapeHtml(c.tag || "Normal") + '</span></div>' +
    (c.replies && c.replies.length > 0 ? '<div class="comment-replies-list">' +
      c.replies.map(function(r) {
        var replyUser2 = findUserForAuthor(r.uid, r.user, r.userId);
        var replyLive = (replyUser2 && replyUser2.username) || r.user || "";
        var safeReplyName = escapeAttr(replyLive);
        var replyUser = findUserForAuthor(r.uid, r.user, r.userId);
          var replyLiveName = (replyUser && replyUser.username) || r.user || "";
        var replyAvatar = r.avatar || (replyUser && replyUser.avatar) || "https://i.pravatar.cc/150";
        var isOwnReply = !r.pending && r.uid === (currentUser && currentUser.uid);
        var replyTime = r.pending
          ? "mengirim..."
          : (typeof formatCommentTime === "function" ? formatCommentTime(r.createdAt) : "");
        return '<div class="comment-reply-item">' +
          '<img class="comment-reply-avatar comment-avatar-clickable" src="' + escapeAttr(replyAvatar) + '" alt="" onclick="openPublicProfile(\'' + safeReplyName + '\')">' +
          '<div style="flex:1;min-width:0;"><div class="comment-reply-name comment-name-clickable" onclick="openPublicProfile(\'' + safeReplyName + '\')">' + escapeHtml(replyLive) + '</div>' +
          '<div class="comment-reply-text">' + escapeHtml(r.content) + '</div>' +
          '<div style="font-size:9.5px;color:var(--text-mute);margin-top:2px;">' + replyTime + '</div></div>' +
          (isOwnReply ? '<button class="member-kick-btn" style="width:24px;height:24px;border-radius:6px;" onclick="event.stopPropagation(); deleteReply(\'' + c.id + '\', \'' + r.id + '\')">' + icons.x + '</button>' : "") + '</div>';
      }).join("") + '</div>' : "") + '</div></div></div>';
}

/* ==================== FORMAT WAKTU ==================== */
function formatCommentTime(createdAt) {
  if (!createdAt) return "baru saja";

  let date;
  if (createdAt.toDate && typeof createdAt.toDate === "function") {
    date = createdAt.toDate();
  } else if (typeof createdAt === "string") {
    date = new Date(createdAt);
  } else if (createdAt instanceof Date) {
    date = createdAt;
  } else {
    return "baru saja";
  }

  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hour = Math.floor(min / 60);
  const day = Math.floor(hour / 24);

  if (sec < 60) return "baru saja";
  if (min < 60) return min + " menit lalu";
  if (hour < 24) return hour + " jam lalu";
  if (day < 7) return day + " hari lalu";

  const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${date.getDate()} ${bulan[date.getMonth()]}`;
}

/* ==================== HITUNG KOMENTAR ==================== */
async function getCommentCount(slug, ep) {
  if (!slug || !ep || !firebaseReady) return 0;
  try {
    const snapshot = await db.collection(COLLECTIONS.COMMENTS)
      .where("animeSlug", "==", String(slug).toLowerCase().trim())
      .where("episode", "==", Number(ep))
      .get();
    return snapshot.size;
  } catch (e) {
    return 0;
  }
}

/* ==================== TOMBOL & PANEL STIKER DI KOLOM KOMENTAR ==================== */
// Dipasang dari sini, jadi tidak perlu mengubah app.js. Aman dipanggil berkali-kali.
function mountEpisodeStickerUI() {
  const input = document.getElementById("comment-input");
  if (!input) return;
  const wrap = input.closest(".comment-input-wrap") || input.parentElement;
  if (!wrap) return;

  if (!document.getElementById("ep-sticker-style")) {
    const st = document.createElement("style");
    st.id = "ep-sticker-style";
    st.textContent = `
      #ep-comment-dock { position: sticky; bottom: 0; z-index: 5; background: var(--bg, #0d0d12); padding: 8px 0; display: flex; flex-direction: column; gap: 6px; }
      #ep-sticker-tray { display: none; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 0; padding: 10px; border-radius: 16px; background: var(--bg-2, #1f1f27); border: 1px solid rgba(255,255,255,0.08); max-height: 42vh; overflow-y: auto; }
      #ep-sticker-tray.open { display: grid; }
      #ep-sticker-btn.active { background: var(--accent, #a855f7) !important; color: #fff !important; }
    `;
    document.head.appendChild(st);
  }

  let tray = document.getElementById("ep-sticker-tray");
  if (!tray) {
    tray = document.createElement("div");
    tray.className = "chat-sticker-tray";
    tray.id = "ep-sticker-tray";
  }

  if (!document.getElementById("ep-sticker-btn")) {
    const btn = document.createElement("button");
    btn.id = "ep-sticker-btn";
    btn.title = "Stiker";
    btn.setAttribute("onclick", "openEpisodeStickers()");
    btn.style.cssText = "width:38px;height:38px;flex-shrink:0;border-radius:50%;border:1px solid rgba(255,255,255,0.12);background:#1f1f27;color:#e5e7eb;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;";
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3H6a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V9z"/><path d="M15 3v6h6"/></svg>';
    const sendBtn = wrap.querySelector(".comment-send-btn");
    if (sendBtn) wrap.insertBefore(btn, sendBtn);
    else wrap.appendChild(btn);
  }

  // Satu wadah sticky di bawah daftar komentar: panel stiker di atas, kolom tulis di bawah
  let dock = document.getElementById("ep-comment-dock");
  if (!dock) {
    dock = document.createElement("div");
    dock.id = "ep-comment-dock";
  }
  const list = document.getElementById("comment-list");
  if (list) list.after(dock);
  dock.appendChild(tray);
  dock.appendChild(wrap);

  wrap.style.position = "";
  wrap.style.bottom = "";
  wrap.style.background = "";
  wrap.style.padding = "0";
  wrap.style.display = "flex";
  wrap.style.alignItems = "center";
  wrap.style.gap = "8px";

  if (typeof ensureChatStyles === "function") ensureChatStyles();

  // Ambil daftar stiker dari koleksi yang sama dengan chat global
  if (typeof listenStickers === "function" && typeof stickersListener !== "undefined" && !stickersListener) {
    listenStickers();
  }
}

function openEpisodeStickers() {
  if (typeof stickerIds !== "function" || typeof toggleStickerTray !== "function") {
    showToast("CatDinding.js belum versi terbaru");
    return;
  }
  toggleStickerTray("episode");
}


/* ==================== STIKER DI KOMENTAR EPISODE ==================== */
async function sendEpisodeSticker(key) {
  if (!currentUser || !currentUserProfile) {
    showToast("Belum login");
    return;
  }
  var slug = currentAnimeSlug;
  var ep = currentEpisode;
  if (!slug || !ep) return;

  var tempId = "tmp-" + Date.now();
  var pendingItem = {
    id: tempId,
    type: "sticker",
    sticker: key,
    content: "",
    createdAt: new Date().toISOString(),
    likes: 0,
    likedBy: [],
    replies: [],
    tag: "Normal",
    pending: true,
    uid: currentUser.uid,
    user: currentUserProfile.username,
    userId: currentUserProfile.userId,
    avatar: currentUserProfile.avatar || ""
  };
  currentComments = [pendingItem].concat(currentComments);
  renderCommentList(currentComments);
  if (navigator.vibrate) navigator.vibrate(30);

  var result = await sendCommentToFirestore(slug, ep, "", null, key);
  if (!result) {
    currentComments = currentComments.filter(function(c) { return c.id !== tempId; });
    renderCommentList(currentComments);
  }
}

console.log("Comments system loaded");
