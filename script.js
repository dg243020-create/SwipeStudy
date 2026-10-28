"use strict";

// ========== ゲーム本体 ==========
// 問題データ QUESTIONS は questions.js にあります（index.html で先に読み込まれます）。
const STORAGE_KEY = "swipeVocabRPG.v1";
const BOSSES_PER_DAY = 3;       // 1日に倒せるボスの数（やりすぎ防止）
const BOSS_MAX_HP = 100;
const BASE_XP = 10;             // 正解1回の経験値
const BOSS_BONUS_XP = 40;       // ボス撃破のボーナス経験値
const TEST_SIZE = 10;           // ボス戦（テスト）の問題数
const TEST_MIN = 5;             // ボス戦に挑戦するのに必要な、記録済みの問題数
const OFFER_MIN = 20;           // ボス戦に誘うまでに、最低でも何問答えるか
const OFFER_MAX = 30;           // 誘いが来るまでの問題数は、OFFER_MIN〜OFFER_MAX のあいだでランダム
const DAILY_GOAL = 10;           // 1日の目標。この問数を解くと、その日のストリークが続く
const YESTERDAY_BONUS_XP = 30;  // 昨日の分のテストを全問正解したときの、追加経験値（1日1回）
const YESTERDAY_MIN = 3;        // 「昨日の分のテスト」に必要な、昨日勉強した問題の数
const HISTORY_DAYS = 14;        // 何日分の「その日に勉強した問題」を残すか
const FLASH_EFFECT = false;     // 3コンボ以上などで、画面が白く光る演出（true にすると復活）

// 週間クエスト：1週間にボスを何体倒すか、達成した週の数に応じたごほうび（おやすみ券）
const QUEST_BOSSES = 5;                              // 1週間に倒すボスの数（週は月曜はじまり）
const QUEST_REWARDS = { 2: 1, 4: 1, 6: 2, 7: 3 };    // 達成した週の数 → もらえる「おやすみ券」の枚数
const QUEST_CYCLE = 7;                               // この週数を達成したら、ごほうびをもらって、最初からやりなおし
const QUEST_CONSECUTIVE = false;                     // true にすると、1週でも達成できなかったら、0週目からやりなおし
const REST_KEEP_DAYS = 60;                           // 「おやすみにした日」を、何日分残すか

// 間違えた問題の復習
const MISTAKE_MAX = 30;            // 記録しておく、間違えた問題の最大数（あふれたら、優先度の低いものからはずす）
const MISTAKE_TIME_CAP = 60;       // 答えるまでにかかった時間は、この秒数までを数える
const MISTAKE_REPEAT_BONUS = 20;   // 何度も間違えた問題の優先度に、1回ごとに足す秒数
const REVIEW_REQUEUE = 5;          // 復習でまた間違えたら、何問あとに、もう一度出すか

const STATS_DAYS = 30;             // 日ごとの「答えた問題数」を、何日分残すか（統計のグラフ用）

// 背景の画像
const BG_IMAGE = "asset/haikei.PNG";   // 背景にする画像の場所（assetフォルダの中。大文字・小文字も同じにする）。使わないときは "" にする
const UI_SCALE_MAX = 1.8;              // iPad・パソコンで、画面全体を大きくするときの、いちばん大きい倍率（1にすると、大きくしない）
const BG_DIM = 0.4;                    // 画像の上にかぶせる、暗い膜の濃さ（0〜1）。文字が読みにくいときは、大きくする

const MONSTERS = [
  { emoji: "👾", name: "スライム語" },
  { emoji: "🐲", name: "ドラゴン文法" },
  { emoji: "👹", name: "オニ熟語" },
  { emoji: "🦑", name: "クラーケン構文" },
  { emoji: "🧟", name: "ゾンビ発音" },
  { emoji: "🦖", name: "ティラノ長文" }
];

const $ = (id) => document.getElementById(id);
const feed = $("feed");

// ---------- 保存データ ----------
function todayStr() {
  return new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD（端末のローカル日付）
}
function load() {
  const base = { level: 1, xp: 0, totalDefeated: 0, bestCombo: 0, date: todayStr(), bossesToday: 0, genre: "すべて", studied: [], history: {}, sinceOffer: 0, nextOfferAt: 0, yesterdayDone: "", streak: 0, bestStreak: 0, lastGoalDate: "", answeredToday: 0, answeredDate: "", tickets: 0, restDates: [], questWeek: "", questBosses: 0, questWeeksDone: 0, questClearedWeek: "", questSeq: 0, mistakes: [], mistakesSeq: 0, stats: normalizeStats(null), badges: {} };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const s = Object.assign(base, saved);
    if (!Array.isArray(s.studied)) s.studied = [];
    if (!s.history || typeof s.history !== "object" || Array.isArray(s.history)) s.history = {};
    if (!Array.isArray(s.restDates)) s.restDates = [];
    if (!Array.isArray(s.mistakes)) s.mistakes = [];
    s.stats = normalizeStats(s.stats);
    s.badges = normalizeBadges(s.badges);
    if (s.date !== todayStr()) { s.date = todayStr(); s.bossesToday = 0; }
    if (s.answeredDate !== todayStr()) { s.answeredDate = todayStr(); s.answeredToday = 0; }
    return s;
  } catch (e) {
    return base;
  }
}
function save() {
  try { checkBadges(); } catch (e) { /* バッジの判定に失敗しても、遊べる */ }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* 保存できなくても遊べる */ }
  if (typeof window.onGameSaved === "function") { try { window.onGameSaved(); } catch (e) { /* 無視 */ } }
}

let state = load();
ensureWeek();                                              // 週が変わっていたら、今週のクエストを新しくする
if (!state.nextOfferAt) state.nextOfferAt = rollOffer();   // 次のボス戦の誘いまで、何問か（ランダム）
let boss = { hp: BOSS_MAX_HP, monster: MONSTERS[0] };
let combo = 0;
let queue = [];
let mode = "study";      // "study"（スワイプ勉強）か "test"（ボス戦）
let test = null;         // ボス戦の進行状況 { list, index, correct }
let review = null;       // 復習の進行状況 { queue, total, cleared }

// ---------- ユーティリティ ----------
function rollOffer() {
  return OFFER_MIN + Math.floor(Math.random() * (OFFER_MAX - OFFER_MIN + 1));
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- 問題の記録 ----------
// 問題文などから、問題ごとの目印（ID）をつくる。問題を足しても、記録がずれない。
function qid(q) {
  const s = (q.label || "") + q.q;
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
const BY_ID = new Map(QUESTIONS.map((q) => [qid(q), q]));
state.mistakes = state.mistakes.filter((m) => m && BY_ID.has(m.id));   // 問題を書き換えて、なくなったものは、はずす
let studiedSet = new Set(state.studied);
function recordStudied(q) {
  const id = qid(q);
  if (studiedSet.has(id)) return false;
  studiedSet.add(id);
  state.studied.push(id);
  return true;
}

// その日に勉強した問題の記録（「昨日の分のテスト」で使う）
function addHistory(q) {
  const d = todayStr();
  const arr = state.history[d] || (state.history[d] = []);
  const id = qid(q);
  if (!arr.includes(id)) arr.push(id);
  const keys = Object.keys(state.history).sort();
  while (keys.length > HISTORY_DAYS) delete state.history[keys.shift()];
}
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("sv-SE");
}
function yesterdayPool() {
  return (state.history[yesterdayStr()] || []).map((id) => BY_ID.get(id)).filter(Boolean);
}

// ---------- 間違えた問題の記録 ----------
// 間違えた問題を、最大 MISTAKE_MAX 問まで記録する。答えるまでにかかった時間（秒）と、間違えた回数も、いっしょに残す。
//   優先度 ＝ かかった時間（最大 MISTAKE_TIME_CAP 秒）＋（間違えた回数 − 1）× MISTAKE_REPEAT_BONUS
//   復習では、優先度が高い順に出る。復習で正解したら記録からはずれ、また間違えたら優先度が上がる。
const viewObserver = new IntersectionObserver((entries) => {   // カードが画面に出た時刻を、記録する
  entries.forEach((e) => {
    if (e.isIntersecting && e.intersectionRatio > 0.6 && e.target.dataset && !e.target.dataset.shownAt) {
      e.target.dataset.shownAt = String(Date.now());
      viewObserver.unobserve(e.target);
    }
  });
}, { root: feed, threshold: [0.6] });
function resetShownTimes() {      // メニューを開いていた時間などは、数えない
  Array.from(feed.children).forEach((c) => {
    if (c.dataset && c.dataset.kind && !c.dataset.answered && c.dataset.shownAt) c.dataset.shownAt = String(Date.now());
  });
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") resetShownTimes(); });
function answerSeconds(card) {    // カードが出てから、答えるまでの秒数
  const from = Number(card.dataset.shownAt) || Number(card.dataset.builtAt) || Date.now();
  return Math.round(Math.min(MISTAKE_TIME_CAP, Math.max(0, (Date.now() - from) / 1000)) * 10) / 10;
}
function mistakeScore(m) {
  return Math.min(m.t || 0, MISTAKE_TIME_CAP) + ((m.n || 1) - 1) * MISTAKE_REPEAT_BONUS;
}
function sortedMistakes() {       // 優先度が高い順（同じなら、新しい順）
  return state.mistakes.filter((m) => BY_ID.has(m.id))
    .sort((a, b) => mistakeScore(b) - mistakeScore(a) || (b.d || "").localeCompare(a.d || ""));
}
function recordMistake(q, sec) {
  const id = qid(q);
  const t = Math.round(Math.min(MISTAKE_TIME_CAP, Math.max(0, sec || 0)) * 10) / 10;
  const m = state.mistakes.find((x) => x.id === id);
  if (m) { m.n = (m.n || 1) + 1; m.t = Math.max(m.t || 0, t); m.d = todayStr(); }
  else state.mistakes.push({ id, t, n: 1, d: todayStr() });
  while (state.mistakes.length > MISTAKE_MAX) {     // あふれたら、今回の問題以外で、優先度がいちばん低いものをはずす
    let worst = null;
    state.mistakes.forEach((x) => { if (x.id !== id && (!worst || mistakeScore(x) < mistakeScore(worst))) worst = x; });
    if (!worst) break;
    state.mistakes.splice(state.mistakes.indexOf(worst), 1);
  }
  state.mistakesSeq = (state.mistakesSeq || 0) + 1;
}
function noteMistake(q, sec, result) {   // 間違えたときに呼ぶ。記録して、小さくお知らせする
  recordMistake(q, sec);
  const n = el("div", "explain", "🔁 間違えた問題に記録しました");
  n.style.cssText = "font-size:12px;opacity:.7;";
  result.appendChild(n);
}

// ---------- 学習の統計 ----------
// 答えた問題数と正解数を、全体・教科ごと・日ごとに数える。（このアップデート以降の記録）
function normalizeStats(x) {
  const n = (v) => (typeof v === "number" && isFinite(v) && v > 0) ? Math.floor(v) : 0;
  const pairs = (o) => {
    const r = {};
    if (o && typeof o === "object" && !Array.isArray(o)) {
      Object.keys(o).forEach((k) => { const p = o[k]; if (Array.isArray(p)) r[k] = [n(p[0]), n(p[1])]; });
    }
    return r;
  };
  x = (x && typeof x === "object") ? x : {};
  const days = pairs(x.days);
  const keys = Object.keys(days).sort();
  while (keys.length > STATS_DAYS) delete days[keys.shift()];
  return { answered: n(x.answered), correct: n(x.correct), cleared: n(x.cleared), questWeeks: n(x.questWeeks),
    restUsed: n(x.restUsed), bestDay: n(x.bestDay), genres: pairs(x.genres), days };
}
function normalizeBadges(o) {
  const r = {};
  if (o && typeof o === "object" && !Array.isArray(o)) {
    Object.keys(o).forEach((k) => { if (typeof o[k] === "string") r[k] = o[k]; });
  }
  return r;
}
function recordStats(q, ok) {     // 問題に答えるたびに呼ぶ（勉強・ボス戦・復習のどれでも）
  const st = state.stats;
  const g = genreOf(q);
  const d = todayStr();
  const ge = st.genres[g] || (st.genres[g] = [0, 0]);
  const de = st.days[d] || (st.days[d] = [0, 0]);
  st.answered++; ge[0]++; de[0]++;
  if (ok) { st.correct++; ge[1]++; de[1]++; }
  st.bestDay = Math.max(st.bestDay || 0, de[0]);
  const keys = Object.keys(st.days).sort();
  while (keys.length > STATS_DAYS) delete st.days[keys.shift()];
}
function pct(c, a) { return a > 0 ? Math.round((c * 100) / a) : 0; }

// ---------- バッジ ----------
// get() が goal 以上になったら、バッジを獲得する。（goal の数字を変えると、難しさを変えられる）
const BADGES = [
  { id: "lv5",    icon: "🌱", name: "見習い勉強家",     desc: "レベル5に到達",             goal: 5,    unit: "",   get: () => state.level },
  { id: "lv10",   icon: "⭐", name: "勉強家",           desc: "レベル10に到達",            goal: 10,   unit: "",   get: () => state.level },
  { id: "lv20",   icon: "🌟", name: "達人",             desc: "レベル20に到達",            goal: 20,   unit: "",   get: () => state.level },
  { id: "lv30",   icon: "👑", name: "賢者",             desc: "レベル30に到達",            goal: 30,   unit: "",   get: () => state.level },
  { id: "ans100", icon: "📘", name: "100問チャレンジ",   desc: "100問に答える",             goal: 100,  unit: "問", get: () => state.stats.answered },
  { id: "ans500", icon: "📗", name: "500問チャレンジ",   desc: "500問に答える",             goal: 500,  unit: "問", get: () => state.stats.answered },
  { id: "ans1k",  icon: "📚", name: "1000問の旅",        desc: "1000問に答える",            goal: 1000, unit: "問", get: () => state.stats.answered },
  { id: "ans3k",  icon: "🗻", name: "3000問の山",        desc: "3000問に答える",            goal: 3000, unit: "問", get: () => state.stats.answered },
  { id: "acc80",  icon: "🎯", name: "命中率80％",        desc: "100問以上答えて、正解率80％以上", goal: 80, unit: "％", get: () => state.stats.answered >= 100 ? pct(state.stats.correct, state.stats.answered) : 0 },
  { id: "st3",    icon: "🔥", name: "火がついた",        desc: "3日連続で、目標を達成",       goal: 3,    unit: "日", get: () => state.bestStreak || 0 },
  { id: "st7",    icon: "🔥", name: "燃えてきた",        desc: "7日連続で、目標を達成",       goal: 7,    unit: "日", get: () => state.bestStreak || 0 },
  { id: "st14",   icon: "🔥", name: "止まらない",        desc: "14日連続で、目標を達成",      goal: 14,   unit: "日", get: () => state.bestStreak || 0 },
  { id: "st30",   icon: "🌋", name: "ひと月の炎",        desc: "30日連続で、目標を達成",      goal: 30,   unit: "日", get: () => state.bestStreak || 0 },
  { id: "st100",  icon: "🌠", name: "伝説の連続記録",     desc: "100日連続で、目標を達成",     goal: 100,  unit: "日", get: () => state.bestStreak || 0 },
  { id: "boss1",  icon: "⚔️", name: "初陣",             desc: "ボスを1体倒す",             goal: 1,    unit: "体", get: () => state.totalDefeated },
  { id: "boss10", icon: "🗡️", name: "ボスハンター",      desc: "ボスを10体倒す",            goal: 10,   unit: "体", get: () => state.totalDefeated },
  { id: "boss30", icon: "🛡️", name: "歴戦の勇者",        desc: "ボスを30体倒す",            goal: 30,   unit: "体", get: () => state.totalDefeated },
  { id: "boss100",icon: "🏰", name: "ボスの天敵",        desc: "ボスを100体倒す",           goal: 100,  unit: "体", get: () => state.totalDefeated },
  { id: "cmb10",  icon: "💥", name: "コンボ10",          desc: "10コンボを出す",            goal: 10,   unit: "",   get: () => state.bestCombo },
  { id: "cmb20",  icon: "⚡", name: "コンボ20",          desc: "20コンボを出す",            goal: 20,   unit: "",   get: () => state.bestCombo },
  { id: "cmb50",  icon: "🌪️", name: "コンボ50",          desc: "50コンボを出す",            goal: 50,   unit: "",   get: () => state.bestCombo },
  { id: "day50",  icon: "💪", name: "1日50問",           desc: "1日に50問に答える",          goal: 50,   unit: "問", get: () => state.stats.bestDay },
  { id: "day100", icon: "🏋️", name: "1日100問",          desc: "1日に100問に答える",         goal: 100,  unit: "問", get: () => state.stats.bestDay },
  { id: "qw1",    icon: "📅", name: "今週の主役",        desc: "週間クエストを、はじめて達成",  goal: 1,    unit: "週", get: () => state.stats.questWeeks },
  { id: "qw7",    icon: "🏆", name: "クエストマスター",   desc: "週間クエストを、合計7週達成",   goal: 7,    unit: "週", get: () => state.stats.questWeeks },
  { id: "rest1",  icon: "😴", name: "ちゃんと休む",       desc: "おやすみ券を使う",           goal: 1,    unit: "日", get: () => state.stats.restUsed },
  { id: "clr1",   icon: "✨", name: "克服の第一歩",       desc: "復習で、間違えた問題を克服",   goal: 1,    unit: "問", get: () => state.stats.cleared },
  { id: "clr30",  icon: "🧠", name: "復習マスター",       desc: "復習で、30問を克服",         goal: 30,   unit: "問", get: () => state.stats.cleared },
  { id: "gen100", icon: "🎓", name: "教科マスター",       desc: "ひとつの教科で、正解100問",    goal: 100,  unit: "問", get: () => Math.max(0, ...Object.values(state.stats.genres).map((p) => p[1])) },
  { id: "gen5",   icon: "🌈", name: "オールラウンダー",    desc: "5つの教科に挑戦する",         goal: 5,    unit: "教科", get: () => Object.values(state.stats.genres).filter((p) => p[0] > 0).length },
  { id: "rec300", icon: "📝", name: "記録300問",         desc: "記録した問題が300問",         goal: 300,  unit: "問", get: () => state.studied.length },
  { id: "rec1k",  icon: "📖", name: "記録1000問",        desc: "記録した問題が1000問",        goal: 1000, unit: "問", get: () => state.studied.length }
];
function badgeCount() { return BADGES.filter((b) => state.badges[b.id]).length; }
function checkBadges() {          // 保存するたびに、新しく条件を満たしたバッジがないか調べる
  if (!state.badges) state.badges = {};
  const got = [];
  BADGES.forEach((b) => {
    if (!state.badges[b.id] && b.get() >= b.goal) { state.badges[b.id] = todayStr(); got.push(b); }
  });
  if (got.length === 0) return;
  setTimeout(() => {
    toast(got.length === 1 ? `🏅 バッジ獲得！ ${got[0].icon} ${got[0].name}` : `🏅 バッジを${got.length}個 獲得！ メニューで見てみよう`);
    if (got.length === 1) confetti(30);
  }, 1300);
}

// ---------- 毎日の目標とストリーク ----------
// 1日に DAILY_GOAL 問（勉強でもボス戦でも、答えた問題の数）を解くと、その日が「達成」になり、連続日数（ストリーク）が1日増える。
function ensureToday() {          // 日付をまたいだら、今日の分を0に戻す（0時で切り替わる）
  const t = todayStr();
  if (state.date !== t) { state.date = t; state.bossesToday = 0; }
  if (state.answeredDate !== t) { state.answeredDate = t; state.answeredToday = 0; }
  ensureWeek();
}
// 「目標を達成した日」か「おやすみ券で休んだ日」のうち、いちばん新しい日（before を指定すると、その日より前だけを見る）
function lastActiveDate(before) {
  let best = "";
  [state.lastGoalDate].concat(state.restDates || []).forEach((d) => {
    if (d && (!before || d < before) && d > best) best = d;
  });
  return best;
}
function currentStreak() {        // 昨日までつながっていれば、続いている。それより前で止まっていたら、途切れている
  const la = lastActiveDate();
  if (la === todayStr() || la === yesterdayStr()) return state.streak || 0;
  return 0;
}
function achieveGoal() {
  if (state.lastGoalDate === todayStr()) return;
  // 昨日が「達成した日」か「おやすみにした日」なら、連続日数が1日増える（おやすみの日そのものは、日数に数えない）
  state.streak = (lastActiveDate(todayStr()) === yesterdayStr()) ? (state.streak || 0) + 1 : 1;
  state.bestStreak = Math.max(state.bestStreak || 0, state.streak);
  state.lastGoalDate = todayStr();
  confetti(80);
  beep([523, 659, 784, 1047], 0.12);
  setTimeout(() => toast(`🔥 ${state.streak}日連続！ 今日の目標を達成！`), 900);
}

// ---------- 日付の計算 ----------
function dateStr(d) { return d.toLocaleDateString("sv-SE"); }
function addDays(str, n) {        // "2026-10-26" に n 日を足した日付
  const d = new Date(str + "T12:00:00");
  d.setDate(d.getDate() + n);
  return dateStr(d);
}
function dayDiff(a, b) {          // a から b まで、何日あるか
  return Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000);
}
function weekStartStr(d) {        // その日がふくまれる週の、月曜日の日付
  const x = new Date(d.getTime());
  x.setHours(12, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return dateStr(x);
}

// ---------- 週間クエスト ----------
// 1週間（月〜日）にボスを QUEST_BOSSES 体倒すと「その週を達成」。達成した週の数に応じて、おやすみ券がもらえる。
function ensureWeek() {           // 週が変わっていたら、今週の分を0に戻す
  const wk = weekStartStr(new Date());
  if (state.questWeek === wk) return;
  if (state.questWeek && QUEST_CONSECUTIVE) {
    const cleared = state.questClearedWeek === state.questWeek;
    const gap = Math.round(dayDiff(state.questWeek, wk) / 7);
    if (!cleared || gap > 1) state.questWeeksDone = 0;      // 連続で達成できなかったら、やりなおし
  }
  state.questWeek = wk;
  state.questBosses = 0;
}
function questOnBossDefeated() {  // ボスを倒したら呼ぶ。クエストを達成したときは、お知らせの文を返す
  ensureWeek();
  state.questBosses = (state.questBosses || 0) + 1;
  state.questSeq = (state.questSeq || 0) + 1;
  if (state.questBosses < QUEST_BOSSES || state.questClearedWeek === state.questWeek) return "";
  state.questClearedWeek = state.questWeek;
  state.questWeeksDone = (state.questWeeksDone || 0) + 1;
  state.stats.questWeeks++;
  const n = state.questWeeksDone;
  const reward = QUEST_REWARDS[n] || 0;
  state.tickets = (state.tickets || 0) + reward;
  let msg = `📅 今週のクエスト達成！（${n}週目）`;
  if (reward) msg += `　🎫 おやすみ券 +${reward}枚`;
  if (n >= QUEST_CYCLE) {
    state.questWeeksDone = 0;
    msg += "　クエストをすべてクリア！ また最初からです";
  }
  return msg;
}
function nextRewardText(short) {       // 次に、おやすみ券がもらえる週
  const keys = Object.keys(QUEST_REWARDS).map(Number).sort((a, b) => a - b);
  const k = keys.find((x) => x > (state.questWeeksDone || 0));
  if (!k) return "";
  const left = k - (state.questWeeksDone || 0);
  return short ? `次：${k}週目で 🎫×${QUEST_REWARDS[k]}（あと${left}週）` : `次のごほうび：${k}週達成で 🎫×${QUEST_REWARDS[k]}（あと${left}週）`;
}

// ---------- おやすみ券 ----------
// 使うと、勉強しない日があっても、連続記録（ストリーク）が切れない。
function addRestDay(d) {
  if (!state.restDates.includes(d)) state.restDates.push(d);
  const limit = addDays(todayStr(), -REST_KEEP_DAYS);
  state.restDates = state.restDates.filter((x) => x >= limit);
}
function useRestToday() {         // 今日を、おやすみにする（券1枚）
  ensureToday();
  const t = todayStr();
  if ((state.tickets || 0) < 1) { toast("おやすみ券がありません"); return false; }
  if (currentStreak() <= 0) { toast("連続記録がないので、使えません"); return false; }
  if (state.lastGoalDate === t) { toast("今日は、もう目標を達成しています"); return false; }
  if (state.restDates.includes(t)) { toast("今日は、もうおやすみにしています"); return false; }
  if (!confirm("おやすみ券を1枚使って、今日をおやすみにします。\n連続記録（🔥）は守られます。よろしいですか？")) return false;
  state.tickets -= 1;
  addRestDay(t);
  state.stats.restUsed++;
  state.questSeq = (state.questSeq || 0) + 1;
  save();
  updateHud();
  toast("😴 今日は、おやすみです");
  return true;
}
function rescueInfo() {           // 休んで連続記録が途切れている（けれど、券で取り戻せる）とき、何日分かを返す
  const la = lastActiveDate();
  if (!la || (state.streak || 0) <= 0) return null;
  const y = yesterdayStr();
  if (la >= y) return null;       // 昨日までつながっている
  const n = dayDiff(la, y);
  return (n >= 1 && n <= 30) ? { n, from: addDays(la, 1), to: y } : null;
}
function useRescue() {            // 休んだ日を、さかのぼっておやすみにする（1日につき券1枚）
  ensureToday();
  const info = rescueInfo();
  if (!info) { toast("取り戻せる日はありません"); return false; }
  if ((state.tickets || 0) < info.n) { toast(`おやすみ券があと ${info.n - (state.tickets || 0)}枚 必要です`); return false; }
  if (!confirm(`おやすみ券を${info.n}枚使って、${info.from}〜${info.to}の${info.n}日分を、おやすみにします。\n連続記録（🔥${state.streak}日）が、つながります。よろしいですか？`)) return false;
  for (let i = 0; i < info.n; i++) addRestDay(addDays(info.from, i));
  state.tickets -= info.n;
  state.stats.restUsed += info.n;
  state.questSeq = (state.questSeq || 0) + 1;
  save();
  updateHud();
  toast(`🎫 連続記録を守りました（🔥${state.streak}日）`);
  return true;
}
function countAnswer() {          // 問題に答えるたびに呼ぶ
  ensureToday();
  state.answeredToday = (state.answeredToday || 0) + 1;
  if (state.answeredToday >= DAILY_GOAL) achieveGoal();
}

// ---------- ジャンル ----------
// ラベル「【日本史・古代】」の「日本史」の部分をジャンルとして自動で使う。ラベルがなければ「その他」。
const ALL = "すべて";
function genreOf(q) {
  const m = (q.label || "").match(/【(.+?)(?:・.*)?】/);
  return m ? m[1] : "その他";
}
const GENRES = [ALL].concat(Array.from(new Set(QUESTIONS.map(genreOf))));
if (!GENRES.includes(state.genre)) state.genre = ALL;
function pool() {
  return state.genre === ALL ? QUESTIONS : QUESTIONS.filter((q) => genreOf(q) === state.genre);
}
// ボス戦で出題できる、記録済みの問題（いま選んでいるジャンルのもの）
function studiedPool() {
  return state.studied
    .map((id) => BY_ID.get(id))
    .filter((q) => q && (state.genre === ALL || genreOf(q) === state.genre));
}
function nextQuestion() {
  if (queue.length === 0) queue = shuffle(pool());
  return queue.pop();
}
function xpNeeded() { return state.level * 50; }

// ---------- 効果音・演出 ----------
let audioCtx = null;
function beep(freqs, dur = 0.12) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    freqs.forEach((f, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "triangle";
      o.frequency.value = f;
      const t = audioCtx.currentTime + i * dur;
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t); o.stop(t + dur);
    });
  } catch (e) { /* 音が鳴らなくても問題なし */ }
}
function confetti(n = 36) {
  const fx = $("fx");
  const colors = ["#ffcf3f", "#3ddc84", "#6ea8ff", "#ff5470", "#b78bff"];
  for (let i = 0; i < n; i++) {
    const c = document.createElement("span");
    c.className = "confetti";
    c.style.left = Math.random() * 100 + "%";
    c.style.background = colors[i % colors.length];
    c.style.setProperty("--dx", (Math.random() * 120 - 60) + "px");
    c.style.setProperty("--rot", (Math.random() * 720 - 360) + "deg");
    c.style.animationDelay = Math.random() * 0.25 + "s";
    fx.appendChild(c);
    setTimeout(() => c.remove(), 1900);
  }
}
function flash() {
  if (!FLASH_EFFECT) return;
  const f = document.createElement("div");
  f.className = "flash";
  $("fx").appendChild(f);
  setTimeout(() => f.remove(), 400);
}
let toastTimer;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
}
function retrigger(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

// ---------- HUD ----------
function updateHud() {
  $("level").textContent = "Lv." + state.level;
  $("xpFill").style.width = Math.min(100, (state.xp / xpNeeded()) * 100) + "%";
  $("hpFill").style.width = (boss.hp / BOSS_MAX_HP) * 100 + "%";
  $("enemyEmoji").textContent = boss.monster.emoji;
  $("enemyName").textContent = boss.monster.name;
  $("combo").textContent = "COMBO " + combo;
  $("today").textContent = `今日 ${state.bossesToday}/${BOSSES_PER_DAY}体`;
  $("genreBtn").textContent = "📚 " + state.genre;
  try { updateModeButton(); } catch (e) { /* 起動中は無視 */ }
}
function gainXp(amount) {
  state.xp += amount;
  while (state.xp >= xpNeeded()) {
    state.xp -= xpNeeded();
    state.level++;
    toast(`🎉 レベルアップ！ Lv.${state.level}`);
    confetti(60);
    beep([523, 659, 784, 1047], 0.14);
  }
}

// ---------- スクロール制御 ----------
// いつでもスワイプできる。次のカードは先に用意しておく。
let bossActive = true;
const observer = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting || e.intersectionRatio <= 0.6) return;
    const card = e.target;
    if (card.dataset.kind !== "q") return;
    // 前の問題を答えずにスワイプしたら「スキップ」扱い（コンボだけ途切れる）
    const prev = card.previousElementSibling;
    if (prev && prev.dataset.kind === "q" && !prev.dataset.answered && !prev.dataset.skipped) {
      prev.dataset.skipped = "1";
      combo = 0;
      updateHud();
    }
    ensureNext(card);
  });
}, { root: feed, threshold: [0.6] });

function ensureNext(card) {
  if (bossActive && mode === "study" && !card.nextElementSibling) addQuestionCard();
}

// ---------- カード生成 ----------
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

// 問題カード（勉強とボス戦で共通）。選択肢の順番は、毎回ランダム。
function buildCard(q, label, kind, onPick) {
  const card = el("section", "card");
  card.dataset.kind = kind;
  card.dataset.builtAt = String(Date.now());
  viewObserver.observe(card);                 // 画面に出た時刻を知るため
  card.appendChild(el("div", "q-label", label));
  const qt = el("div", "q-text", q.q);
  if (q.q.length > 12) qt.classList.add("small"); // 長い問題文は小さめに
  if (q.q.length > 36) qt.classList.add("xsmall");
  card.appendChild(qt);

  const choices = el("div", "choices");
  const order = shuffle(q.choices.map((text, i) => ({ text, i })));
  const result = el("div", "result");
  order.forEach((c) => {
    const b = el("button", "choice", c.text);
    b.type = "button";
    b.addEventListener("click", () => onPick({ card, q, order, choices, result, btn: b, picked: c.i }));
    choices.appendChild(b);
  });
  card.appendChild(choices);
  card.appendChild(result);
  return card;
}

// 正解・不正解を表示して、正解したかどうかを返す
function revealAnswer(ctx) {
  const { q, order, choices, result, btn, picked } = ctx;
  const ok = picked === q.answer;
  Array.from(choices.children).forEach((b, idx) => {
    b.disabled = true;
    if (order[idx].i === q.answer) b.classList.add("correct");
  });
  if (!ok) btn.classList.add("wrong");
  result.textContent = "";
  result.appendChild(el("div", "verdict " + (ok ? "ok" : "ng"), ok ? "⭕ 正解！" : "❌ 残念…"));
  result.appendChild(el("div", "explain", q.explain));
  return ok;
}

// ---------- 勉強モード ----------
function addQuestionCard() {
  const q = nextQuestion();
  const card = buildCard(q, q.label || "この問題は？", "q", onAnswer);
  feed.appendChild(card);
  observer.observe(card);
  return card;
}

function onAnswer(ctx) {
  const { card, q, result } = ctx;
  if (card.dataset.answered === "1") return;
  card.dataset.answered = "1";

  const ok = revealAnswer(ctx);
  countAnswer();                          // 今日の目標に数える
  if (!ok) noteMistake(q, answerSeconds(card), result);   // 間違えた問題として記録する
  recordStats(q, ok);                     // 統計に数える
  recordStudied(q);                       // 答えた問題を、記録する
  state.sinceOffer = (state.sinceOffer || 0) + 1;   // 前回の誘いから、何問答えたか
  addHistory(q);                          // 「今日勉強した問題」としても記録する

  if (ok) {
    combo++;
    state.bestCombo = Math.max(state.bestCombo, combo);
    gainXp(BASE_XP + Math.min(combo - 1, 5) * 2);
    beep([660, 880]);
    retrigger($("combo"), "pop");
    confetti(combo >= 3 ? 40 : 12);
    if (combo >= 3) flash();
  } else {
    combo = 0;
    beep([220, 180], 0.15);
  }
  // 20〜30問のあいだのランダムな問題数に達したら、ボス戦に誘う（抜き打ち）
  const offerDue = state.sinceOffer >= state.nextOfferAt && state.bossesToday < BOSSES_PER_DAY && studiedPool().length >= TEST_MIN;
  if (offerDue) { state.sinceOffer = 0; state.nextOfferAt = rollOffer(); }
  updateHud();
  save();

  if (offerDue) {
    result.appendChild(el("div", "hint", "⬆ 上にスワイプ"));
    addOfferCard();
  } else {
    result.appendChild(el("div", "hint", "⬆ 上にスワイプして次へ"));
    ensureNext(card);
  }
}

function addOfferCard() {
  const c = el("section", "card center");
  c.dataset.kind = "info";
  c.appendChild(el("div", "big-emoji", "⚔️"));
  c.appendChild(el("div", "q-text", "ボスが現れた！ 挑戦しますか？"));
  c.appendChild(el("div", "explain", `記録した ${studiedPool().length} 問から、最大 ${TEST_SIZE} 問を出題。全問正解で撃破！`));
  const go = el("button", "btn", "⚔ 挑戦する");
  go.type = "button";
  go.addEventListener("click", startTest);
  const more = el("button", "btn", "あとにする（勉強をつづける） ▶");
  more.type = "button";
  more.style.marginTop = "12px";
  more.addEventListener("click", () => {
    more.disabled = true;
    const nc = addQuestionCard();
    nc.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  c.appendChild(go);
  c.appendChild(more);
  feed.appendChild(c);
}

function showDoneCard() {
  const done = el("section", "card center");
  done.dataset.kind = "info";
  done.appendChild(el("div", "big-emoji", "🌙"));
  done.appendChild(el("div", "q-text", "今日の探索は終了！"));
  done.appendChild(el("div", "explain", `今日は ${BOSSES_PER_DAY} 体倒しました。また明日挑戦しよう。`));
  bossActive = false;
  feed.appendChild(done);
}

// ---------- ボス戦（テストモード） ----------
// ボス戦（テスト）を始める共通の処理
function beginTest(list, kind, title, icon, retry) {
  test = { list: shuffle(list).slice(0, TEST_SIZE), index: 0, correct: 0, kind, title, icon, retry };   // 出題順もランダム
  mode = "test";
  review = null;
  bossActive = false;
  boss = { hp: BOSS_MAX_HP, monster: MONSTERS[state.totalDefeated % MONSTERS.length] };
  combo = 0;
  observer.disconnect();
  feed.textContent = "";
  feed.scrollTop = 0;
  updateHud();
  addTestCard();
}

// 記録した問題から出題するボス戦
function startTest() {
  if (state.bossesToday >= BOSSES_PER_DAY) { toast("今日のボス戦は、ここまでです"); return; }
  const list = studiedPool();
  if (list.length < TEST_MIN) {
    toast(`ボス戦には、記録した問題が ${TEST_MIN} 問以上必要です（いま ${list.length} 問）`);
    return;
  }
  beginTest(list, "boss", "ボス戦", "⚔", startTest);
}

// 昨日勉強した問題から出題するテスト（ボス討伐には数えない。全問正解で、追加経験値）
function startYesterdayTest() {
  if (state.yesterdayDone === todayStr()) { toast("昨日の分のテストは、今日はクリア済みです"); return; }
  const list = yesterdayPool();
  if (list.length < YESTERDAY_MIN) {
    toast(`昨日の分のテストには、昨日勉強した問題が ${YESTERDAY_MIN} 問以上必要です（昨日は ${list.length} 問）`);
    return;
  }
  beginTest(list, "yesterday", "昨日のテスト", "📝", startYesterdayTest);
}

function addTestCard() {
  const q = test.list[test.index];
  const label = `${test.icon} ${test.title} ${test.index + 1}/${test.list.length}　${q.label || ""}`;
  const card = buildCard(q, label, "t", onTestAnswer);
  feed.appendChild(card);
  return card;
}

function onTestAnswer(ctx) {
  const { card, result } = ctx;
  if (card.dataset.answered === "1") return;
  card.dataset.answered = "1";

  const ok = revealAnswer(ctx);
  countAnswer();                          // ボス戦の問題も、今日の目標に数える
  if (!ok) noteMistake(ctx.q, answerSeconds(card), result);   // 間違えた問題として記録する
  recordStats(ctx.q, ok);                 // 統計に数える
  if (!ok) {
    combo = 0;
    beep([220, 180], 0.15);
    updateHud();
    save();
    testFailed(result);
    return;
  }

  test.correct++;
  combo++;
  state.bestCombo = Math.max(state.bestCombo, combo);
  gainXp(BASE_XP + Math.min(combo - 1, 5) * 2);
  if (test.kind === "boss") {
    boss.hp = BOSS_MAX_HP * (1 - test.correct / test.list.length);
    retrigger($("enemyEmoji"), "hit");
  }
  beep([660, 880]);
  retrigger($("combo"), "pop");
  confetti(combo >= 3 ? 40 : 12);
  if (combo >= 3) flash();
  updateHud();
  save();

  if (test.correct === test.list.length) {
    if (test.kind === "yesterday") yesterdayCleared(result); else testCleared(result);
  } else {
    // 答えたら、次の問題のカードが現れる。上にスワイプして進む（答えるまでは、次のカードがないので進めない）
    result.appendChild(el("div", "hint", "⬆ 上にスワイプして次へ"));
    test.index++;
    addTestCard();
  }
}

function testFailed(result) {
  const isBoss = test.kind === "boss";
  if (isBoss) boss.hp = BOSS_MAX_HP;
  updateHud();
  const c = el("section", "card center");
  c.dataset.kind = "info";
  c.appendChild(el("div", "big-emoji", "💥"));
  c.appendChild(el("div", "q-text", isBoss ? "ボスに返り討ちにされた…" : "テストは不合格…"));
  c.appendChild(el("div", "explain", `${test.correct}／${test.list.length} 問正解。` + (isBoss ? "全問正解で撃破です。" : `全問正解で、追加経験値 +${YESTERDAY_BONUS_XP}！`)));
  const retry = el("button", "btn", "もう一度挑戦 ▶");
  retry.type = "button";
  retry.addEventListener("click", test.retry);         // 問題も、順番も、新しくなる
  const back = el("button", "btn", "📖 勉強にもどる");
  back.type = "button";
  back.style.marginTop = "12px";
  back.addEventListener("click", endTest);
  c.appendChild(retry);
  c.appendChild(back);
  result.appendChild(el("div", "hint", "⬆ 上にスワイプ"));
  feed.appendChild(c);
}

function yesterdayCleared(result) {
  const total = test.list.length;
  state.yesterdayDone = todayStr();      // 追加経験値は、1日1回
  gainXp(YESTERDAY_BONUS_XP);
  save();
  updateHud();
  confetti(60);
  beep([523, 659, 784, 1047], 0.12);
  const c = el("section", "card center");
  c.dataset.kind = "info";
  c.appendChild(el("div", "big-emoji", "📝"));
  c.appendChild(el("div", "q-text", "昨日の分のテスト クリア！"));
  c.appendChild(el("div", "explain", `${total}問 全問正解！ 追加経験値 +${YESTERDAY_BONUS_XP}`));
  const b = el("button", "btn", "📖 勉強にもどる");
  b.type = "button";
  b.addEventListener("click", endTest);
  c.appendChild(b);
  result.appendChild(el("div", "hint", "⬆ 上にスワイプ"));
  feed.appendChild(c);
}

function testCleared(result) {
  const name = boss.monster.name;
  const total = test.list.length;
  state.totalDefeated++;
  state.bossesToday++;
  gainXp(BOSS_BONUS_XP);
  const qmsg = questOnBossDefeated();      // 週間クエストに数える（達成したら、お知らせが返ってくる）
  save();
  updateHud();
  confetti(100);
  flash();
  beep([523, 659, 784, 1047, 1319], 0.12);

  const finished = state.bossesToday >= BOSSES_PER_DAY;
  const c = el("section", "card center");
  c.dataset.kind = "info";
  c.appendChild(el("div", "big-emoji", "🏆"));
  c.appendChild(el("div", "q-text", `${name} を撃破！`));
  c.appendChild(el("div", "explain", `${total}問 全問正解！ ／ 最高コンボ ${state.bestCombo} ／ 通算 ${state.totalDefeated} 体`));
  if (qmsg) {
    const qe = el("div", "explain", qmsg);
    qe.style.cssText = "font-weight:800;color:#ffcf3f;";
    c.appendChild(qe);
    setTimeout(() => toast(qmsg), 700);
  }
  if (finished) {
    c.appendChild(el("div", "explain", "今日の探索はここまで。おつかれさま！また明日 🌙"));
  } else {
    const b = el("button", "btn", "📖 勉強にもどる");
    b.type = "button";
    b.addEventListener("click", endTest);
    c.appendChild(b);
  }
  result.appendChild(el("div", "hint", "⬆ 上にスワイプ"));
  feed.appendChild(c);
}

function endTest() {              // ボス戦・復習をやめて、勉強にもどる
  mode = "study";
  test = null;
  review = null;
  rebuildFeed();
}

// ---------- 間違えた問題の復習 ----------
function startReview() {
  const ids = sortedMistakes().map((m) => m.id);
  if (ids.length === 0) { toast("間違えた問題は、まだありません"); return; }
  review = { queue: ids, total: ids.length, cleared: 0 };
  mode = "review";
  test = null;
  bossActive = false;
  boss = { hp: BOSS_MAX_HP, monster: { emoji: "🔁", name: "間違えた問題の復習" } };
  combo = 0;
  observer.disconnect();
  feed.textContent = "";
  feed.scrollTop = 0;
  updateHud();
  addReviewCard();
}

function addReviewCard() {
  if (!review || review.queue.length === 0) { showReviewDone(); return; }
  const id = review.queue[0];
  const q = BY_ID.get(id);
  if (!q) { review.queue.shift(); addReviewCard(); return; }
  const card = buildCard(q, `🔁 復習 のこり${review.queue.length}問　${q.label || ""}`, "r", onReviewAnswer);
  feed.appendChild(card);
}

function onReviewAnswer(ctx) {
  const { card, q, result } = ctx;
  if (card.dataset.answered === "1" || !review) return;
  card.dataset.answered = "1";
  const sec = answerSeconds(card);
  const ok = revealAnswer(ctx);
  countAnswer();                          // 復習の問題も、今日の目標に数える
  recordStats(q, ok);                     // 統計に数える
  const id = qid(q);
  review.queue.shift();                   // 先頭が、いま答えた問題
  let note;
  if (ok) {
    state.mistakes = state.mistakes.filter((m) => m.id !== id);   // 正解したら、記録からはずす
    state.mistakesSeq = (state.mistakesSeq || 0) + 1;
    review.cleared++;
    state.stats.cleared++;
    combo++;
    state.bestCombo = Math.max(state.bestCombo, combo);
    gainXp(BASE_XP + Math.min(combo - 1, 5) * 2);
    beep([660, 880]);
    retrigger($("combo"), "pop");
    confetti(combo >= 3 ? 40 : 12);
    note = "✨ 克服！ 間違えた問題の記録から、はずしました";
  } else {
    combo = 0;
    beep([220, 180], 0.15);
    recordMistake(q, sec);                // 間違えた回数が増えて、優先度が上がる
    if (review.queue.length > 0) {
      const at = Math.min(REVIEW_REQUEUE, review.queue.length);
      review.queue.splice(at, 0, id);     // at問あとに、もう一度出す
      note = `🔁 もう一度、${at}問あとに出ます`;
    } else {
      note = "🔁 まだ記録に残っています。また今度、復習しよう";
    }
  }
  const ne = el("div", "explain", note);
  ne.style.cssText = "font-weight:700;margin-top:6px;";
  result.appendChild(ne);
  result.appendChild(el("div", "hint", "⬆ 上にスワイプして次へ"));
  boss.hp = BOSS_MAX_HP * Math.min(1, state.mistakes.length / Math.max(1, review.total));
  updateHud();
  save();
  addReviewCard();                        // 次のカード（問題がなければ、おしまいのカード）
}

function showReviewDone() {
  const left = state.mistakes.length;
  const cleared = review ? review.cleared : 0;
  const c = el("section", "card center");
  c.dataset.kind = "info";
  c.appendChild(el("div", "big-emoji", left === 0 ? "🎉" : "🔁"));
  c.appendChild(el("div", "q-text", left === 0 ? "復習、ぜんぶ克服！" : "復習おわり！"));
  c.appendChild(el("div", "explain", `克服 ${cleared}問　／　まだ記録に残っている問題 ${left}問`));
  const b = el("button", "btn", "📖 勉強にもどる");
  b.type = "button";
  b.addEventListener("click", endTest);
  c.appendChild(b);
  if (left === 0) { confetti(80); beep([523, 659, 784, 1047], 0.12); }
  feed.appendChild(c);
}

// ---------- 画面の切り替えボタン（右下） ----------
const FLOAT_STYLE = [
  "position:fixed", "right:10px", "z-index:50", "padding:8px 12px", "border-radius:999px",
  "border:1px solid rgba(255,255,255,.35)", "background:rgba(20,20,30,.85)", "color:#fff",
  "font-size:13px", "cursor:pointer"
].join(";");
const modeBtn = document.createElement("button");
modeBtn.type = "button";
modeBtn.classList.add("ui-float");
modeBtn.style.cssText = FLOAT_STYLE + ";bottom:calc(10px + env(safe-area-inset-bottom, 0px))";
modeBtn.addEventListener("click", () => { if (mode !== "study") endTest(); else startTest(); });
document.body.appendChild(modeBtn);
const homeBtn = document.createElement("button");
homeBtn.type = "button";
homeBtn.classList.add("ui-float");
homeBtn.textContent = "🏠 メニュー";
homeBtn.style.cssText = FLOAT_STYLE + ";bottom:calc(56px + env(safe-area-inset-bottom, 0px))";
homeBtn.addEventListener("click", () => openMenu());
document.body.appendChild(homeBtn);

// 画面のいちばん上の細い線：今日の目標の進み具合
const goalBar = document.createElement("div");
goalBar.style.cssText = "position:fixed;top:0;left:0;height:4px;width:0;z-index:30;pointer-events:none;transition:width .3s;background:linear-gradient(90deg,#ff9a3d,#ffcf3f);";
document.body.appendChild(goalBar);
function updateGoalUi() {
  const done = state.lastGoalDate === todayStr();
  const n = state.answeredDate === todayStr() ? Math.min(state.answeredToday || 0, DAILY_GOAL) : 0;
  goalBar.style.width = (done ? 100 : (n / DAILY_GOAL) * 100) + "%";
  const resting = !done && (state.restDates || []).includes(todayStr());
  const tk = (state.tickets || 0) > 0 ? `　🎫${state.tickets}` : "";
  homeBtn.textContent = `🏠 🔥${currentStreak()}日　${done ? "✔ 達成" : resting ? "😴 おやすみ" : n + "/" + DAILY_GOAL + "問"}${tk}`;
}

let menuOpen = false;
let lastMenuView = "main";      // いま開いているメニューの画面（画面の大きさが変わったとき、開きなおす）
function updateModeButton() {
  updateGoalUi();
  const hide = menuOpen ? "none" : "";
  modeBtn.style.display = hide;     // メニューを開いているあいだは、隠す
  homeBtn.style.display = hide;
  modeBtn.textContent = mode !== "study" ? "📖 勉強にもどる" : `⚔ ボス戦（記録 ${studiedPool().length} 問）`;
}

// ---------- 大きい画面の倍率 ----------
// 画面が広い（幅700px以上・高さ560px以上）ときだけ、画面の大きさに合わせて倍率 --k を決める。スマホでは、倍率1のまま
function applyUiScale() {
  const w = window.innerWidth || 0, h = window.innerHeight || 0;
  const root = document.documentElement;
  const wide = UI_SCALE_MAX > 1 && w >= 700 && h >= 560;
  const land = wide && w / h >= 1.25;                       // 横長の画面：問題を左、選択肢を右に並べる
  root.classList.toggle("ui-wide", wide);
  root.classList.toggle("ui-land", land);
  let k = 1;
  if (wide) k = Math.max(1, Math.min(UI_SCALE_MAX, land ? Math.min(w / 800, h / 480) : Math.min(w / 420, h / 760)));
  root.style.setProperty("--k", k.toFixed(3));
  root.style.setProperty("--kf", Math.min(k, 1.5).toFixed(3));           // 下のボタンなどは、そこまで大きくしない
  root.style.setProperty("--side", Math.max(14, Math.round((w - (land ? 800 : 420) * k) / 2)) + "px");
}
applyUiScale();
let uiResizeTimer = 0;
window.addEventListener("resize", () => {
  clearTimeout(uiResizeTimer);
  uiResizeTimer = setTimeout(() => { applyUiScale(); if (menuOpen) renderMenu(lastMenuView); }, 120);
});

// ---------- スタートメニュー ----------
const menu = document.createElement("div");
menu.style.cssText = [
  "position:fixed", "inset:0", "z-index:40", "display:none", "flex-direction:column",
  "padding:12px 16px 16px", "padding-top:calc(env(safe-area-inset-top) + 12px)", "overflow:auto", "color:#fff",
  BG_IMAGE
    ? `background:linear-gradient(rgba(14,7,32,${Math.min(0.9, BG_DIM + 0.2)}), rgba(14,7,32,${Math.min(0.9, BG_DIM + 0.2)})), url("${BG_IMAGE}") center / cover no-repeat, #120a2a`
    : "background:radial-gradient(circle at 50% 25%, #2a1b5c, #120a2a 70%)"
].join(";");
document.body.appendChild(menu);
// 問題の画面の背景：画像は動かさず、問題のカードだけがスワイプで動く
if (BG_IMAGE) {
  const bgStyle = document.createElement("style");
  bgStyle.textContent = `
body { background: transparent; }
body::before { content: ""; position: fixed; inset: 0; z-index: -1;
  background: linear-gradient(rgba(14,7,32,${BG_DIM}), rgba(14,7,32,${BG_DIM})), url("${BG_IMAGE}") center / cover no-repeat, var(--bg); }
.card { background: transparent; text-shadow: 0 1px 6px rgba(0,0,0,.55); }
.choice { background: rgba(18,10,40,.6); }
.choice.correct { background: rgba(30,120,70,.8); }
.choice.wrong { background: rgba(160,30,60,.8); }`;
  (document.head || document.body).appendChild(bgStyle);
}
// 大きい画面（iPad・パソコン）用：画面に合わせて、全体を大きくする。スマホ（せまい画面）では、何も変わらない
const wideStyle = document.createElement("style");
wideStyle.textContent = `
:root { --k: 1; --kf: 1; --side: 14px; }
.ui-wide { --hud-h: calc(112px * var(--k)); }
.ui-wide #hud { zoom: var(--k); height: 112px; padding-left: calc(var(--side) / var(--k)); padding-right: calc(var(--side) / var(--k)); }
.ui-wide .card { padding: calc(var(--hud-h) + 12px * var(--k)) var(--side) calc(24px * var(--k)); gap: calc(16px * var(--k)); }
.ui-wide .card > * { zoom: var(--k); }
.ui-land .card:not(.center) { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-rows: auto auto auto;
  align-content: center; column-gap: calc(36px * var(--k)); row-gap: calc(14px * var(--k)); }
.ui-land .card:not(.center) > .q-label { grid-column: 1; grid-row: 1; align-self: end; }
.ui-land .card:not(.center) > .q-text { grid-column: 1; grid-row: 2; }
.ui-land .card:not(.center) > .result { grid-column: 1; grid-row: 3; }
.ui-land .card:not(.center) > .choices { grid-column: 2; grid-row: 1 / 4; align-self: center; }
.ui-wide .ui-float, .ui-wide #toast, .ui-wide .sheet-panel { zoom: var(--kf); }
.ui-wide .ui-panel { zoom: var(--kf); max-height: calc(85vh / var(--kf)) !important; }`;
(document.head || document.body).appendChild(wideStyle);
const menuStyle = document.createElement("style");
menuStyle.textContent = `
.mn-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.mn-cols > * { min-width: 0; }
.mn-col { display: flex; flex-direction: column; gap: 7px; }
.mn-btn { padding: 8px 12px !important; border-radius: 12px !important; }
.mn-label { font-size: 15px; line-height: 1.25; }
.mn-sub { font-size: 11px; font-weight: 400; opacity: .75; margin-top: 2px; line-height: 1.3;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.mn-title { font-size: 20px; font-weight: 800; }
@media (max-height: 560px) {
  .mn-sub, .mn-title, .mn-info, .mn-best { display: none; }
  .mn-btn { padding: 7px 12px !important; }
  .mn-col, .mn-cols { gap: 8px; }
}`;
(document.head || document.body).appendChild(menuStyle);

function menuBtn(label, sub, onClick, disabled) {
  const b = el("button", "btn mn-btn");
  b.type = "button";
  b.style.cssText = "display:block;width:100%;text-align:left;";
  b.appendChild(el("div", "mn-label", label));
  if (sub) b.appendChild(el("div", "mn-sub", sub));
  if (disabled) {                    // 押せないボタンは、背景の画像の上でも読めるように、暗い色にする
    b.disabled = true;
    b.style.background = "rgba(255,255,255,.16)";
    b.style.color = "#d9d0f5";
  } else b.addEventListener("click", onClick);
  return b;
}
function recordedCount(g) {
  return state.studied.filter((id) => {
    const q = BY_ID.get(id);
    return q && (g === ALL || genreOf(q) === g);
  }).length;
}

// 週間クエストの表示
function buildQuestBox() {
  ensureWeek();
  const done = state.questClearedWeek === state.questWeek;
  const n = Math.min(state.questBosses || 0, QUEST_BOSSES);
  const daysLeft = 7 - ((new Date().getDay() + 6) % 7);       // 日曜日まで（今日をふくむ）
  const b = el("div");
  b.style.cssText = "background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:9px 12px;display:flex;flex-direction:column;justify-content:center;text-align:center;";
  const t = el("div", "", "📅 今週のクエスト");
  t.style.cssText = "font-weight:800;font-size:15px;";
  const t2 = el("div", "", `ボスを${QUEST_BOSSES}体倒す　${n}/${QUEST_BOSSES}`);
  t2.style.cssText = "font-size:12px;opacity:.9;margin-top:2px;";
  const track = el("div");
  track.style.cssText = "height:10px;border-radius:6px;background:rgba(255,255,255,.15);overflow:hidden;margin:5px 0;";
  const fill = el("div");
  fill.style.cssText = `height:100%;width:${(n / QUEST_BOSSES) * 100}%;background:linear-gradient(90deg,#6ea8ff,#b78bff);`;
  track.appendChild(fill);
  const l1 = el("div", "", done ? "✔ 今週は達成！" : `あと${QUEST_BOSSES - n}体（日曜まで${daysLeft}日）`);
  l1.style.cssText = "font-size:12px;";
  const l2 = el("div", "", `達成した週 ${state.questWeeksDone || 0}/${QUEST_CYCLE}　${nextRewardText(true)}`);
  l2.style.cssText = "font-size:11px;opacity:.75;margin-top:3px;";
  b.appendChild(t); b.appendChild(t2); b.appendChild(track); b.appendChild(l1); b.appendChild(l2);
  if (QUEST_CONSECUTIVE) {
    const l3 = el("div", "", "※1週でも逃すと、0週目から");
    l3.style.cssText = "font-size:10px;opacity:.6;margin-top:2px;";
    b.appendChild(l3);
  }
  return b;
}

// 連続記録の箱。タップすると、おやすみ券の画面が開く
function buildStreakBox() {
  const cs = currentStreak();
  const gdone = state.lastGoalDate === todayStr();
  const gn = state.answeredDate === todayStr() ? Math.min(state.answeredToday || 0, DAILY_GOAL) : 0;
  const resting = state.restDates.includes(todayStr());
  const b = el("div");
  b.setAttribute("role", "button");
  b.tabIndex = 0;
  b.style.cssText = "background:rgba(255,255,255,.07);border:1px solid rgba(255,207,63,.5);border-radius:14px;padding:9px 12px;text-align:center;cursor:pointer;display:flex;flex-direction:column;justify-content:center;";
  const big = el("div", "", `🔥 ${cs}日連続`);
  big.style.cssText = "font-size:22px;font-weight:800;line-height:1.2;";
  const best = el("div", "mn-best", `最高 ${state.bestStreak || 0}日`);
  best.style.cssText = "font-size:11px;opacity:.7;";
  const track = el("div");
  track.style.cssText = "height:10px;border-radius:6px;background:rgba(255,255,255,.15);overflow:hidden;margin:5px 0;";
  const fill = el("div");
  fill.style.cssText = `height:100%;width:${(gdone ? 100 : (gn / DAILY_GOAL) * 100)}%;background:linear-gradient(90deg,#ff9a3d,#ffcf3f);`;
  track.appendChild(fill);
  let note;
  if (gdone) note = "✔ 今日の目標を達成！";
  else if (resting) note = "😴 今日はおやすみ中";
  else if (cs > 0) note = `あと${DAILY_GOAL - gn}問で ${cs + 1}日連続`;
  else note = `あと${DAILY_GOAL - gn}問で、連続スタート`;
  const noteEl = el("div", "", note);
  noteEl.style.cssText = "font-size:12px;";
  const foot = el("div", "", `🎫 おやすみ券 ${state.tickets || 0}枚　▶`);
  foot.style.cssText = "font-size:12px;font-weight:700;color:#ffcf3f;margin-top:4px;";
  b.appendChild(big); b.appendChild(best); b.appendChild(track); b.appendChild(noteEl); b.appendChild(foot);
  const open = () => renderMenu("rest");
  b.addEventListener("click", open);
  b.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") open(); });
  return b;
}

// おやすみ券の表示と、使うボタン
function buildTicketBox() {
  const tk = state.tickets || 0;
  const wrap = el("div");
  wrap.style.cssText = "background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:8px;";
  const head = el("div", "", `🎫 おやすみ券　${tk}枚`);
  head.style.cssText = "font-size:20px;font-weight:800;text-align:center;";
  const sub = el("div", "", "使うと、勉強しない日があっても、連続記録（🔥）が切れません");
  sub.style.cssText = "font-size:12px;opacity:.75;text-align:center;margin-bottom:4px;";
  wrap.appendChild(head); wrap.appendChild(sub);

  const t = todayStr();
  let why = "";
  if (tk < 1) why = "おやすみ券がありません";
  else if (currentStreak() <= 0) why = "連続記録がないので、使えません";
  else if (state.lastGoalDate === t) why = "今日は、もう目標を達成しています";
  else if (state.restDates.includes(t)) why = "今日は、もうおやすみにしています";
  wrap.appendChild(menuBtn("😴 今日をおやすみにする", why || "券を1枚使います。今日は勉強しなくても、連続記録が続きます",
    () => { if (useRestToday()) renderMenu("rest"); }, !!why));

  const info = rescueInfo();
  if (info) {
    const lack = info.n - tk;
    wrap.appendChild(menuBtn(`⏪ 休んだ${info.n}日分を取り戻す`,
      lack > 0 ? `あと${lack}枚、券が必要です（連続記録 🔥${state.streak}日）` : `券を${info.n}枚使って、連続記録（🔥${state.streak}日）を守ります`,
      () => { if (useRescue()) renderMenu("rest"); }, lack > 0));
  }
  return wrap;
}

// 小さな箱（バッジ・統計の画面で使う）
function panelBox() {
  const b = el("div");
  b.style.cssText = "background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:14px 16px;";
  return b;
}
function wideScreen() { return (window.innerWidth || 0) >= 680; }
function panelTitle(text) {
  const t = el("div", "", text);
  t.style.cssText = "font-weight:800;font-size:15px;margin-bottom:10px;";
  return t;
}

// 戻るボタンつきの見出し（メニューの中の画面で使う）
function subHeader(title) {
  const row = el("div");
  row.style.cssText = "display:flex;align-items:center;gap:10px;";
  const back = el("button", "", "← もどる");
  back.type = "button";
  back.style.cssText = "font:inherit;font-size:13px;font-weight:700;color:#fff;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);border-radius:999px;padding:6px 12px;cursor:pointer;white-space:nowrap;";
  back.addEventListener("click", () => renderMenu("main"));
  const t = el("div", "", title);
  t.style.cssText = "flex:1;text-align:center;font-weight:800;font-size:18px;padding-right:76px;";   // 戻るボタンの分だけ、中央に寄せる
  row.appendChild(back); row.appendChild(t);
  return row;
}

// ---------- バッジの画面（小さなタイルを並べて、タップでくわしく見る）----------
function renderBadgesView(box) {
  const before = badgeCount();
  checkBadges();
  if (badgeCount() !== before) save();
  const head = el("div", "", `獲得 ${badgeCount()} / ${BADGES.length}`);
  head.style.cssText = "text-align:center;font-weight:800;font-size:15px;";
  box.appendChild(head);

  const detail = panelBox();
  detail.style.minHeight = "62px";
  const showDetail = (b) => {
    const got = state.badges[b.id];
    const cur = Math.min(b.get(), b.goal);
    detail.textContent = "";
    const l1 = el("div", "", `${b.icon} ${b.name}`);
    l1.style.cssText = "font-weight:800;font-size:15px;";
    const l2 = el("div", "", b.desc);
    l2.style.cssText = "font-size:12px;opacity:.85;margin-top:2px;";
    const l3 = el("div", "", got ? `獲得した日：${got}${got === todayStr() ? "　NEW ✨" : ""}` : `進み具合：${cur}/${b.goal}${b.unit}`);
    l3.style.cssText = "font-size:12px;margin-top:2px;" + (got ? "color:#ffcf3f;font-weight:700;" : "opacity:.8;");
    detail.appendChild(l1); detail.appendChild(l2); detail.appendChild(l3);
  };
  const hint = el("div", "", "バッジをタップすると、くわしく見られます");
  hint.style.cssText = "font-size:12px;opacity:.7;text-align:center;";
  detail.appendChild(hint);
  box.appendChild(detail);

  const grid = el("div");
  grid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fill,minmax(54px,1fr));gap:8px;";
  BADGES.forEach((b) => {
    const got = state.badges[b.id];
    const cur = Math.min(b.get(), b.goal);
    const tile = el("button");
    tile.type = "button";
    tile.style.cssText = "font:inherit;color:#fff;border-radius:12px;padding:8px 4px 6px;text-align:center;cursor:pointer;border:1px solid " +
      (got ? "rgba(255,207,63,.8);background:rgba(255,207,63,.16);" : "rgba(255,255,255,.15);background:rgba(255,255,255,.05);");
    const ic = el("div", "", b.icon);
    ic.style.cssText = "font-size:26px;line-height:1.1;" + (got ? "" : "filter:grayscale(1);opacity:.55;");
    tile.appendChild(ic);
    const tr = el("div");
    tr.style.cssText = "height:4px;border-radius:2px;background:rgba(255,255,255,.18);margin:5px 4px 0;overflow:hidden;";
    const fl = el("div");
    fl.style.cssText = `height:100%;width:${got ? 100 : (cur / b.goal) * 100}%;background:${got ? "#ffcf3f" : "#6ea8ff"};`;
    tr.appendChild(fl);
    tile.appendChild(tr);
    tile.addEventListener("click", () => showDetail(b));
    grid.appendChild(tile);
  });
  box.appendChild(grid);
}

// ---------- 統計の画面（広い画面では2列、せまい画面では、タブで切りかえ）----------
function buildStatsTotal() {
  const st = state.stats;
  const total = panelBox();
  const big = el("div", "", `正解率 ${pct(st.correct, st.answered)}％`);
  big.style.cssText = "font-size:26px;font-weight:800;text-align:center;";
  const sub = el("div", "", `${st.correct}問正解　／　${st.answered}問に挑戦`);
  sub.style.cssText = "font-size:13px;opacity:.8;text-align:center;margin-top:2px;";
  total.appendChild(big); total.appendChild(sub);
  return total;
}
function buildStatsChart() {
  const st = state.stats;
  const chart = panelBox();
  chart.appendChild(panelTitle("📈 最近7日間（答えた問題数）"));
  const days = [];
  for (let i = 6; i >= 0; i--) days.push(addDays(todayStr(), -i));
  const maxA = Math.max(1, ...days.map((d) => (st.days[d] || [0, 0])[0]));
  const row = el("div");
  row.style.cssText = "display:flex;gap:6px;align-items:flex-end;";
  days.forEach((d) => {
    const a = (st.days[d] || [0, 0])[0];
    const col = el("div");
    col.style.cssText = "flex:1;display:flex;flex-direction:column;align-items:center;";
    const num = el("div", "", String(a));
    num.style.cssText = "font-size:11px;opacity:.85;";
    const barWrap = el("div");
    barWrap.style.cssText = "height:70px;display:flex;align-items:flex-end;width:100%;";
    const bar = el("div");
    bar.style.cssText = `width:100%;border-radius:4px 4px 0 0;height:${a > 0 ? Math.max(3, Math.round((a / maxA) * 70)) : 2}px;background:${a >= DAILY_GOAL ? "#ffcf3f" : "#6ea8ff"};opacity:${a > 0 ? 1 : .3};`;
    barWrap.appendChild(bar);
    const wd = el("div", "", "日月火水木金土"[new Date(d + "T12:00:00").getDay()]);
    wd.style.cssText = "font-size:11px;margin-top:3px;" + (d === todayStr() ? "font-weight:800;color:#ffcf3f;" : "opacity:.75;");
    col.appendChild(num); col.appendChild(barWrap); col.appendChild(wd);
    row.appendChild(col);
  });
  chart.appendChild(row);
  const legend = el("div", "", `黄色は、毎日の目標（${DAILY_GOAL}問）を超えた日`);
  legend.style.cssText = "font-size:11px;opacity:.65;margin-top:6px;";
  chart.appendChild(legend);
  return chart;
}
function buildStatsGenres() {
  const st = state.stats;
  const gbox = panelBox();
  gbox.appendChild(panelTitle("📚 教科ごとの正解率"));
  const rows = Object.entries(st.genres).filter(([, p]) => p[0] > 0).sort((a, b) => b[1][0] - a[1][0]);
  if (rows.length === 0) {
    const none = el("div", "", "まだ記録がありません。問題に答えると、ここに出ます。");
    none.style.cssText = "font-size:13px;opacity:.75;";
    gbox.appendChild(none);
  }
  const list = el("div");
  if (wideScreen()) list.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:0 16px;";
  gbox.appendChild(list);
  rows.forEach(([name, p]) => {
    const r = pct(p[1], p[0]);
    const line = el("div");
    line.style.cssText = `margin-top:${(window.innerHeight || 999) < 560 ? 3 : 7}px;`;     // 画面が低いときは、すきまをつめる
    const top = el("div");
    top.style.cssText = "display:flex;justify-content:space-between;font-size:13px;";
    top.appendChild(el("span", "", name));
    top.appendChild(el("span", "", `${r}％（${p[1]}/${p[0]}問）`));
    const tr = el("div");
    tr.style.cssText = "height:8px;border-radius:4px;background:rgba(255,255,255,.15);overflow:hidden;margin-top:3px;";
    const fl = el("div");
    fl.style.cssText = `height:100%;width:${r}%;background:${r >= 80 ? "#3ddc84" : r >= 60 ? "#ffcf3f" : "#ff5470"};`;
    tr.appendChild(fl);
    line.appendChild(top); line.appendChild(tr);
    list.appendChild(line);
  });
  const enough = rows.filter(([, p]) => p[0] >= 20);   // 20問以上答えた教科だけで、得意・苦手を決める
  if (enough.length >= 2) {
    const sorted = enough.slice().sort((a, b) => pct(b[1][1], b[1][0]) - pct(a[1][1], a[1][0]));
    const hi = sorted[0], lo = sorted[sorted.length - 1];
    const tip = el("div", "", `得意：${hi[0]}（${pct(hi[1][1], hi[1][0])}％）　苦手：${lo[0]}（${pct(lo[1][1], lo[1][0])}％）`);
    tip.style.cssText = "font-size:12px;margin-top:10px;opacity:.85;";
    gbox.appendChild(tip);
  }
  return gbox;
}
function buildStatsRecords() {
  const st = state.stats;
  const rec = panelBox();
  rec.appendChild(panelTitle("🗂 きろく"));
  const list = el("div");
  if (wideScreen()) list.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:0 16px;";
  rec.appendChild(list);
  [
    ["🔥 最高の連続日数", `${state.bestStreak || 0}日`],
    ["💥 最高コンボ", `${state.bestCombo || 0}`],
    ["⚔ ボスを倒した数", `${state.totalDefeated || 0}体`],
    ["📝 記録した問題", `${state.studied.length}問`],
    ["✨ 復習で克服した問題", `${st.cleared}問`],
    ["💪 1日の最高", `${st.bestDay}問`],
    ["📅 週間クエスト達成", `${st.questWeeks}週`],
    ["😴 おやすみ券を使った日", `${st.restUsed}日`],
    ["🏅 バッジ", `${badgeCount()}/${BADGES.length}`]
  ].forEach(([k, v]) => {
    const r = el("div");
    r.style.cssText = "display:flex;justify-content:space-between;font-size:13px;padding:4px 0;border-top:1px solid rgba(255,255,255,.1);";
    r.appendChild(el("span", "", k));
    const vv = el("span", "", v);
    vv.style.fontWeight = "700";
    r.appendChild(vv);
    list.appendChild(r);
  });
  return rec;
}
function renderStatsView(box) {
  const note = el("div", "", "※ 答えた問題数・正解率の記録は、統計ができてからのものです");
  note.style.cssText = "font-size:11px;opacity:.6;text-align:center;";
  if (wideScreen() && (window.innerHeight || 0) >= 640) {   // 広くて高い画面：左右に2列
    const cols = el("div", "mn-cols");
    const left = el("div", "mn-col"), right = el("div", "mn-col");
    left.appendChild(buildStatsTotal()); left.appendChild(buildStatsChart());
    right.appendChild(buildStatsGenres()); right.appendChild(buildStatsRecords());
    cols.appendChild(left); cols.appendChild(right);
    box.appendChild(cols);
  } else {                                        // せまい画面：タブで切りかえ（スクロールしなくてよいように）
    const tabs = [
      ["📈 ぜんたい", () => [buildStatsTotal(), buildStatsChart()]],
      ["📚 教科", () => [buildStatsGenres()]],
      ["🗂 きろく", () => [buildStatsRecords()]]
    ];
    const bar = el("div");
    bar.style.cssText = "display:flex;gap:6px;";
    const body = el("div");
    body.style.cssText = "display:flex;flex-direction:column;gap:10px;";
    const btns = [];
    const show = (i) => {
      body.textContent = "";
      const items = tabs[i][1]();
      if (wideScreen() && items.length > 1) {      // 広い画面では、横にならべる
        const g = el("div", "mn-cols");
        items.forEach((p) => g.appendChild(p));
        body.appendChild(g);
      } else items.forEach((p) => body.appendChild(p));
      btns.forEach((b, k) => {
        b.style.background = k === i ? "#ffcf3f" : "rgba(255,255,255,.12)";
        b.style.color = k === i ? "#1a1033" : "#fff";
      });
    };
    tabs.forEach(([label], i) => {
      const b = el("button", "", label);
      b.type = "button";
      b.style.cssText = "flex:1;font:inherit;font-size:13px;font-weight:800;border:1px solid rgba(255,255,255,.25);border-radius:999px;padding:8px 4px;cursor:pointer;";
      b.addEventListener("click", () => show(i));
      btns.push(b);
      bar.appendChild(b);
    });
    box.appendChild(bar);
    box.appendChild(body);
    show(0);
  }
  box.appendChild(note);
}

// ---------- おやすみ券の画面 ----------
function renderRestView(box) {
  const cs = currentStreak();
  const head = el("div", "", `🔥 いまの連続記録：${cs}日　（最高 ${state.bestStreak || 0}日）`);
  head.style.cssText = "text-align:center;font-weight:700;font-size:14px;";
  box.appendChild(head);
  box.appendChild(buildTicketBox());
  const how = el("div", "", `🎫 おやすみ券は、週間クエスト（1週間にボスを${QUEST_BOSSES}体倒す）を達成して、ためていくともらえます`);
  how.style.cssText = "font-size:12px;opacity:.7;text-align:center;";
  box.appendChild(how);
}

function renderMenu(view) {
  ensureToday();
  menu.textContent = "";
  view = view || "main";
  lastMenuView = view;
  const titles = { genres: "教科をえらぶ", badges: "🏅 バッジ", stats: "📊 学習の統計", rest: "🎫 おやすみ券" };
  const wide = document.documentElement.classList.contains("ui-wide");
  const maxW = (wide ? { main: 640, genres: 520, badges: 640, stats: 700, rest: 440 } : { main: 760, genres: 560, badges: 760, stats: 760, rest: 440 })[view] || 640;
  const box = el("div");
  box.style.cssText = `width:100%;max-width:${maxW}px;display:flex;flex-direction:column;gap:7px;margin:auto;`;
  if (view === "main") {
    const hd = el("div");
    hd.style.cssText = "display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:2px 12px;";
    hd.appendChild(el("div", "mn-title", "📚 SwipeStudy"));
    const info = el("div", "mn-info", `Lv.${state.level}　今日 ${state.bossesToday}/${BOSSES_PER_DAY}体　記録 ${state.studied.length}問`);
    info.style.cssText = "font-size:13px;opacity:.85;";
    hd.appendChild(info);
    box.appendChild(hd);
  }
  else box.appendChild(subHeader(titles[view] || ""));

  if (view === "genres") {
    const grid = el("div", "mn-cols");
    GENRES.forEach((g) => {
      const n = g === ALL ? QUESTIONS.length : QUESTIONS.filter((q) => genreOf(q) === g).length;
      const cur = g === state.genre ? "　✔" : "";
      grid.appendChild(menuBtn(g + cur, `${n}問　記録 ${recordedCount(g)}問`, () => pickGenre(g)));
    });
    box.appendChild(grid);
  } else if (view === "badges") {
    renderBadgesView(box);
  } else if (view === "stats") {
    renderStatsView(box);
  } else if (view === "rest") {
    renderRestView(box);
  } else {
    // 上の段：連続記録（タップで、おやすみ券）と、今週のクエスト
    const top = el("div", "mn-cols");
    top.appendChild(buildStreakBox());
    top.appendChild(buildQuestBox());
    box.appendChild(top);

    // 下の段：左＝勉強とボス戦、右＝バッジ・統計・ランキング・復習
    const limit = state.bossesToday >= BOSSES_PER_DAY;
    const n = studiedPool().length;
    const y = yesterdayPool().length;
    const yDone = state.yesterdayDone === todayStr();
    const mc = sortedMistakes().length;
    const cols = el("div", "mn-cols");
    const left = el("div", "mn-col"), right = el("div", "mn-col");

    left.appendChild(menuBtn("▶ つづきから", `いまの教科：${state.genre}`, () => {
      closeMenu();
      if (mode !== "study") rebuildFeed();
    }));
    left.appendChild(menuBtn("📚 教科をえらぶ", `${GENRES.length - 1}教科から選べます`, () => renderMenu("genres")));
    left.appendChild(menuBtn("⚔ ボス戦",
      limit ? "今日のボス戦は終了しました" : (n < TEST_MIN ? `記録 ${n}問（${TEST_MIN}問から）` : `記録 ${n}問から、最大${TEST_SIZE}問`),
      () => { closeMenu(); startTest(); }, limit || n < TEST_MIN));
    left.appendChild(menuBtn("📝 昨日のテスト",
      yDone ? "今日はクリア済み ✔" : (y < YESTERDAY_MIN ? `昨日 ${y}問（${YESTERDAY_MIN}問から）` : `昨日の${y}問から。全問正解で +${YESTERDAY_BONUS_XP}XP`),
      () => { closeMenu(); startYesterdayTest(); }, yDone || y < YESTERDAY_MIN));

    right.appendChild(menuBtn("🏅 バッジ", `獲得 ${badgeCount()} / ${BADGES.length}`, () => renderMenu("badges")));
    right.appendChild(menuBtn("📊 統計", `正解率 ${pct(state.stats.correct, state.stats.answered)}％　${state.stats.answered}問に挑戦`, () => renderMenu("stats")));
    right.appendChild(menuBtn("🏆 ランキング", "レベル・ボス・連続日数", () => {
      if (typeof window.openRanking === "function") window.openRanking();
      else alert("ランキングを使うには、ログイン機能（cloud.js）が必要です。");
    }));
    right.appendChild(menuBtn("🔁 間違いの復習",
      mc ? `いま ${mc}問（時間がかかった順）` : "間違えた問題は、まだなし",
      () => { closeMenu(); startReview(); }, mc === 0));
    cols.appendChild(left); cols.appendChild(right);
    box.appendChild(cols);
  }
  menu.appendChild(box);
  fitMenu(box);
}
// 大きい画面では、メニュー全体を、画面いっぱいまで大きくする（スクロールが出ない範囲で）
function fitMenu(box) {
  box.style.zoom = "";
  if (!document.documentElement.classList.contains("ui-wide") || menu.style.display === "none") return;
  const cs = getComputedStyle(menu);
  const availW = menu.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const availH = menu.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const bw = box.offsetWidth, bh = box.offsetHeight;
  if (!bw || !bh) return;
  const z = Math.max(1, Math.min(UI_SCALE_MAX, availW / bw, (availH * 0.97) / bh));
  if (z > 1.01) box.style.zoom = z.toFixed(3);
}
function openMenu(view) {
  menuOpen = true;
  menu.style.display = "flex";
  renderMenu(view || "main");
  updateModeButton();
}
function closeMenu() {
  menuOpen = false;
  resetShownTimes();                // メニューを開いていた時間は、答えるまでの時間に数えない
  menu.style.display = "none";
  updateModeButton();
}
function pickGenre(g) {
  closeMenu();
  if (g !== state.genre) { state.genre = g; save(); queue = []; }
  rebuildFeed();
  toast("📚 " + g);
}
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menuOpen) closeMenu(); });

// ---------- ジャンル切り替え ----------
function renderGenreSheet() {
  const list = $("genreList");
  list.textContent = "";
  GENRES.forEach((g) => {
    const n = g === ALL ? QUESTIONS.length : QUESTIONS.filter((q) => genreOf(q) === g).length;
    const b = el("button", "genre-item" + (g === state.genre ? " active" : ""), `${g}（${n}問）`);
    b.type = "button";
    b.addEventListener("click", () => selectGenre(g));
    list.appendChild(b);
  });
}
function openGenreSheet() { renderGenreSheet(); $("genreSheet").hidden = false; }
function closeGenreSheet() { $("genreSheet").hidden = true; }

// 勉強モードの画面を、最初から作り直す（ボス戦の途中だった場合は、やめて勉強にもどる）
function rebuildFeed() {
  observer.disconnect();
  feed.textContent = "";
  feed.scrollTop = 0;
  mode = "study";
  test = null;
  review = null;
  boss = { hp: BOSS_MAX_HP, monster: MONSTERS[state.totalDefeated % MONSTERS.length] };
  combo = 0;
  updateHud();
  if (state.bossesToday >= BOSSES_PER_DAY) {
    showDoneCard();
    return;
  }
  bossActive = true;
  addQuestionCard();
}
function selectGenre(g) {
  closeGenreSheet();
  if (g === state.genre) return;
  state.genre = g;
  save();
  queue = [];
  rebuildFeed();
  toast("📚 " + g + " に切り替えました");
}
$("genreBtn").addEventListener("click", openGenreSheet);
$("genreClose").addEventListener("click", closeGenreSheet);
$("genreBackdrop").addEventListener("click", closeGenreSheet);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeGenreSheet(); });

// ---------- キーボード操作（PC用） ----------
document.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  feed.scrollBy({ top: (e.key === "ArrowDown" ? 1 : -1) * feed.clientHeight, behavior: "smooth" });
});

// ---------- クラウド同期用の入り口（cloud.js が使う） ----------
window.gameApi = {
  getSave() { return Object.assign({}, state); },
  // 渡されたデータで、進行状況を丸ごと置き換える
  applySave(s) {
    state.level = s.level || 1;
    state.xp = s.xp || 0;
    state.totalDefeated = s.totalDefeated || 0;
    state.bestCombo = s.bestCombo || 0;
    state.studied = Array.isArray(s.studied) ? s.studied.slice() : [];
    studiedSet = new Set(state.studied);
    state.history = (s.history && typeof s.history === "object" && !Array.isArray(s.history)) ? JSON.parse(JSON.stringify(s.history)) : {};
    state.yesterdayDone = s.yesterdayDone || "";
    state.streak = s.streak || 0;
    state.bestStreak = s.bestStreak || 0;
    state.lastGoalDate = s.lastGoalDate || "";
    state.answeredToday = (s.answeredDate === todayStr()) ? (s.answeredToday || 0) : 0;
    state.answeredDate = todayStr();
    state.date = todayStr();
    state.bossesToday = (s.date === todayStr()) ? (s.bossesToday || 0) : 0;
    state.tickets = s.tickets || 0;
    state.restDates = Array.isArray(s.restDates) ? s.restDates.slice() : [];
    state.questWeek = s.questWeek || "";
    state.questBosses = s.questBosses || 0;
    state.questWeeksDone = s.questWeeksDone || 0;
    state.questClearedWeek = s.questClearedWeek || "";
    state.questSeq = s.questSeq || 0;
    state.mistakes = (Array.isArray(s.mistakes) ? s.mistakes : [])
      .filter((m) => m && BY_ID.has(m.id)).slice(0, MISTAKE_MAX)
      .map((m) => ({ id: m.id, t: m.t || 0, n: m.n || 1, d: m.d || "" }));
    state.mistakesSeq = s.mistakesSeq || 0;
    state.stats = normalizeStats(s.stats);
    state.badges = normalizeBadges(s.badges);
    ensureWeek();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* 無視 */ }
    rebuildFeed();
  }
};

// ---------- 起動 ----------
function init() {
  boss.monster = MONSTERS[state.totalDefeated % MONSTERS.length];
  updateHud();
  if (state.bossesToday >= BOSSES_PER_DAY) {
    showDoneCard();
  } else {
    addQuestionCard();
  }
  openMenu();                       // 起動したら、まずメニューを出す
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}
init();
