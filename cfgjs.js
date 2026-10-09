/* ==================== APP INFO ==================== */
const APP_NAME = "AnimeKu";
const APP_VERSION = "3.0.0";

/* ==================== VERIFIED BADGE ==================== */
const VERIFIED_ICON_URL = "https://cdn.phototourl.com/member/2026-09-27-ed3d428a-b1fc-4bdd-9949-5896ceacb079.png";

/* ==================== UPLOAD API ==================== */
const UPLOAD_API = "https://vidio.miko.web.id";

/* ==================== FIREBASE ==================== */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB63hKXEZGsIiibm5cxt7NCAsk4VG3Rgs8",
  authDomain: "mikostrem-app.firebaseapp.com",
  projectId: "mikostrem-app",
  storageBucket: "mikostrem-app.firebasestorage.app",
  messagingSenderId: "899585533522",
  appId: "1:899585533522:web:085604f2d9f8e2a836218b",
  measurementId: "G-T9YJM77T3R"
};

/* ==================== COLLECTION NAMES ==================== */
const COLLECTIONS = {
  ANIME: "anime",
  TOP: "top",
  USERS: "users",
  NOTIFS: "notifications",
  DISKUSI: "diskusi",
  PREMIUM: "premium_plans",
  PUBLIC_USERS: "public_users",
  CLANS: "clans",
  COMMENTS: "comments",
  MESSAGES: "messages"
};

/* ==================== CONSTANTS ==================== */
const DAYS_OF_WEEK = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

const DUMMY_VIDEOS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4"
];

/* ==================== VIDEO CONFIG ==================== */
const VIDEO_BASE_URL = "https://vidio.miko.web.id/video/";

/* ==================== AUTH CONFIG ==================== */
const AUTH_CONFIG = {
  autoAnonymous: true,
  requireUsername: true,
  usernameMin: 3,
  usernameMax: 20,
  usernamePattern: /^[a-zA-Z0-9_#.]+$/
};