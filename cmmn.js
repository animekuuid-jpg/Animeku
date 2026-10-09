/* ==================== COMMENTS SYSTEM (Firestore) ==================== */
/* Komentar global — semua user bisa lihat, realtime */

let commentsListener = null; // onSnapshot listener
let currentComments = []; // cache komentar yang lagi di-load
let currentCommentsKey = ""; // key: "slug-ep"

/* ==================== AMBIL KOMENTAR (sekali) ==================== */
async function getCommentsFromFirestore(slug, ep) {
  if (!slug || !ep) return [];
  if (!firebaseReady) return [];
  try {
    const snapshot = await db.collection(COLLECTIONS.COMMENTS)
      .where("animeSlug", "==", String(slug))
      .where("episode", "==", Number(ep))
      .orderBy("createdAt", "desc")
      .get();
    
    const comments = [];
    snapshot.forEach(doc => {
      comments.push({ id: doc.id, ...doc.data() });
    });
    return comments;
  } catch (e) {
    console.error("❌ Gagal ambil komentar:", e);
    // Fallback: tanpa orderBy (kalau index belum dibuat)
    try {
      const snapshot2 = await db.collection(COLLECTIONS.COMMENTS)
        .where("animeSlug", "==", String(slug))
        .where("episode", "==", Number(ep))
        .get();
      const comments2 = [];
      snapshot2.forEach(doc => {
        comments2.push({ id: doc.id, ...doc.data() });
      });
      // Sort manual
      comments2.sort((a, b) => {
        const ta = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const tb = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return tb - ta;
      });
      return comments2;
    } catch (e2) {
      console.error("❌ Fallback komentar juga gagal:", e2);
      return [];
    }
  }
}

/* ==================== REALTIME LISTENER ==================== */
function listenComments(slug, ep, callback) {
  // Matikan listener lama
  stopListenComments();
  
  if (!slug || !ep) return;
  if (!firebaseReady) return;
  
  currentCommentsKey = `${slug}-${ep}`;
  
  try {
    commentsListener = db.collection(COLLECTIONS.COMMENTS)
      .where("animeSlug", "==", String(slug))
      .where("episode", "==", Number(ep))
      .orderBy("createdAt", "desc")
      .onSnapshot((snapshot) => {
        const comments = [];
        snapshot.forEach(doc => {
          comments.push({ id: doc.id, ...doc.data() });
        });
        currentComments = comments;
        if (typeof callback === "function") callback(comments);
      }, (err) => {
        console.warn("⚠️ Realtime komentar error, fallback ke manual:", err);
        // Fallback: load manual
        getCommentsFromFirestore(slug, ep).then(comments => {
          currentComments = comments;
          if (typeof callback === "function") callback(comments);
        });
      });
  } catch (e) {
    console.error("❌ Listen komentar gagal:", e);
  }
}

function stopListenComments() {
  if (commentsListener) {
    try { commentsListener(); } catch (e) {}
    commentsListener = null;
  }
}

/* ==================== KIRIM KOMENTAR ==================== */
async function sendCommentToFirestore(slug, ep, text, replyToId = null) {
  if (!currentUser || !currentUserProfile) {
    showToast("Belum login");
    return false;
  }
  if (!slug || !ep || !text || !text.trim()) return false;
  if (!firebaseReady) return false;
  
  const cleanText = text.trim().slice(0, 500);
  
  try {
    if (replyToId) {
      // ===== REPLY =====
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
      console.log("✅ Reply terkirim");
      return true;
    } else {
      // ===== KOMENTAR BARU =====
      const newComment = {
        animeSlug: String(slug),
        episode: Number(ep),
        uid: currentUser.uid,
        user: currentUserProfile.username,
        userId: currentUserProfile.userId,
        avatar: currentUserProfile.avatar || "",
        content: cleanText,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        likes: 0,
        likedBy: [],
        replies: [],
        tag: "Normal"
      };
      
      const ref = await db.collection(COLLECTIONS.COMMENTS).add(newComment);
      console.log("✅ Komentar terkirim:", ref.id);
      return { id: ref.id, ...newComment };
    }
  } catch (e) {
    console.error("❌ Gagal kirim komentar:", e);
    showErrorToast("Gagal kirim komentar");
    return false;
  }
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
    
    if (isLiked) {
      likedBy = likedBy.filter(id => id !== uid);
    } else {
      likedBy.push(uid);
    }
    
    await commentRef.update({
      likedBy,
      likes: likedBy.length
    });
    
    return !isLiked; // return status baru
  } catch (e) {
    console.error("❌ Gagal like:", e);
    return false;
  }
}

/* ==================== HAPUS KOMENTAR ==================== */
async function deleteCommentFromFirestore(commentId) {
  if (!currentUser) return false;
  if (!commentId) return false;
  if (!firebaseReady) return false;
  
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
    console.log("✅ Komentar dihapus");
    return true;
  } catch (e) {
    console.error("❌ Gagal hapus:", e);
    return false;
  }
}

/* ==================== HAPUS REPLY ==================== */
async function deleteReplyFromFirestore(commentId, replyId) {
  if (!currentUser || !commentId || !replyId) return false;
  if (!firebaseReady) return false;
  
  try {
    const commentRef = db.collection(COLLECTIONS.COMMENTS).doc(commentId);
    const commentDoc = await commentRef.get();
    if (!commentDoc.exists) return false;
    
    const data = commentDoc.data();
    const replies = data.replies || [];
    const reply = replies.find(r => r.id === replyId);
    
    if (!reply) return false;
    if (reply.uid !== currentUser.uid) {
      showErrorToast("Cuma bisa hapus reply sendiri");
      return false;
    }
    
    const newReplies = replies.filter(r => r.id !== replyId);
    await commentRef.update({ replies: newReplies });
    return true;
  } catch (e) {
    console.error("❌ Gagal hapus reply:", e);
    return false;
  }
}

/* ==================== HELPER: FORMAT TIME ==================== */
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

/* ==================== COUNT KOMENTAR ==================== */
async function getCommentCount(slug, ep) {
  if (!slug || !ep || !firebaseReady) return 0;
  try {
    const snapshot = await db.collection(COLLECTIONS.COMMENTS)
      .where("animeSlug", "==", String(slug))
      .where("episode", "==", Number(ep))
      .get();
    return snapshot.size;
  } catch (e) {
    console.error("❌ Gagal hitung komentar:", e);
    return 0;
  }
}

console.log("💬 Comments system loaded");