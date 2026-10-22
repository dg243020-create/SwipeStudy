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
  const base = { level: 1, xp: 0, totalDefeated: 0, bestCombo: 0, date: todayStr(), bossesToday: 0, genre: "すべて", studied: [], history: {}, sinceOffer: 0, nextOfferAt: 0, yesterdayDone: "", streak: 0, bestStreak: 0, lastGoalDate: "", answeredToday: 0, answeredDate: "" };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const s = Object.assign(base, saved);
    if (!Array.isArray(s.studied)) s.studied = [];
    if (!s.history || typeof s.history !== "object" || Array.isArray(s.history)) s.history = {};
    if (s.date !== todayStr()) { s.date = todayStr(); s.bossesToday = 0; }
    if (s.answeredDate !== todayStr()) { s.answeredDate = todayStr(); s.answeredToday = 0; }
    return s;
  } catch (e) {
    return base;
  }
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* 保存できなくても遊べる */ }
  if (typeof window.onGameSaved === "function") { try { window.onGameSaved(); } catch (e) { /* 無視 */ } }
}

let state = load();
if (!state.nextOfferAt) state.nextOfferAt = rollOffer();   // 次のボス戦の誘いまで、何問か（ランダム）
let boss = { hp: BOSS_MAX_HP, monster: MONSTERS[0] };
let combo = 0;
let queue = [];
let mode = "study";      // "study"（スワイプ勉強）か "test"（ボス戦）
let test = null;         // ボス戦の進行状況 { list, index, correct }

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

// ---------- 毎日の目標とストリーク ----------
// 1日に DAILY_GOAL 問（勉強でもボス戦でも、答えた問題の数）を解くと、その日が「達成」になり、連続日数（ストリーク）が1日増える。
function ensureToday() {          // 日付をまたいだら、今日の分を0に戻す（0時で切り替わる）
  const t = todayStr();
  if (state.date !== t) { state.date = t; state.bossesToday = 0; }
  if (state.answeredDate !== t) { state.answeredDate = t; state.answeredToday = 0; }
}
function currentStreak() {        // 昨日までに達成していれば、続いている。それより前で止まっていたら、途切れている
  if (state.lastGoalDate === todayStr() || state.lastGoalDate === yesterdayStr()) return state.streak || 0;
  return 0;
}
function achieveGoal() {
  if (state.lastGoalDate === todayStr()) return;
  state.streak = (state.lastGoalDate === yesterdayStr()) ? (state.streak || 0) + 1 : 1;
  state.bestStreak = Math.max(state.bestStreak || 0, state.streak);
  state.lastGoalDate = todayStr();
  confetti(80);
  beep([523, 659, 784, 1047], 0.12);
  setTimeout(() => toast(`🔥 ${state.streak}日連続！ 今日の目標を達成！`), 900);
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

function endTest() {
  mode = "study";
  test = null;
  rebuildFeed();
}

// ---------- 画面の切り替えボタン（右下） ----------
const FLOAT_STYLE = [
  "position:fixed", "right:10px", "z-index:50", "padding:8px 12px", "border-radius:999px",
  "border:1px solid rgba(255,255,255,.35)", "background:rgba(20,20,30,.85)", "color:#fff",
  "font-size:13px", "cursor:pointer"
].join(";");
const modeBtn = document.createElement("button");
modeBtn.type = "button";
modeBtn.style.cssText = FLOAT_STYLE + ";bottom:calc(10px + env(safe-area-inset-bottom, 0px))";
modeBtn.addEventListener("click", () => { if (mode === "test") endTest(); else startTest(); });
document.body.appendChild(modeBtn);
const homeBtn = document.createElement("button");
homeBtn.type = "button";
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
  homeBtn.textContent = `🏠 🔥${currentStreak()}日　${done ? "✔ 達成" : n + "/" + DAILY_GOAL + "問"}`;
}

let menuOpen = false;
function updateModeButton() {
  updateGoalUi();
  const hide = menuOpen ? "none" : "";
  modeBtn.style.display = hide;     // メニューを開いているあいだは、隠す
  homeBtn.style.display = hide;
  modeBtn.textContent = mode === "test" ? "📖 勉強にもどる" : `⚔ ボス戦（記録 ${studiedPool().length} 問）`;
}

// ---------- スタートメニュー ----------
const menu = document.createElement("div");
menu.style.cssText = [
  "position:fixed", "inset:0", "z-index:40", "display:none", "flex-direction:column",
  "align-items:center", "justify-content:center", "padding:24px", "overflow:auto", "color:#fff",
  "background:radial-gradient(circle at 50% 25%, #2a1b5c, #120a2a 70%)"
].join(";");
document.body.appendChild(menu);

function menuBtn(label, sub, onClick, disabled) {
  const b = el("button", "btn");
  b.type = "button";
  b.style.cssText = "display:block;width:100%;text-align:left;padding:14px 16px;";
  b.appendChild(el("div", "", label));
  if (sub) {
    const d = el("div", "", sub);
    d.style.cssText = "font-size:12px;font-weight:400;opacity:.75;margin-top:3px;";
    b.appendChild(d);
  }
  if (disabled) { b.disabled = true; b.style.opacity = "0.45"; }
  else b.addEventListener("click", onClick);
  return b;
}
function recordedCount(g) {
  return state.studied.filter((id) => {
    const q = BY_ID.get(id);
    return q && (g === ALL || genreOf(q) === g);
  }).length;
}

function renderMenu(view) {
  menu.textContent = "";
  const box = el("div");
  box.style.cssText = "width:100%;max-width:380px;display:flex;flex-direction:column;gap:12px;";
  const title = el("div", "q-text", view === "genres" ? "教科をえらぶ" : "📚 SwipeStudy");
  title.style.textAlign = "center";
  box.appendChild(title);

  if (view === "genres") {
    GENRES.forEach((g) => {
      const n = g === ALL ? QUESTIONS.length : QUESTIONS.filter((q) => genreOf(q) === g).length;
      const cur = g === state.genre ? "　✔ いま選択中" : "";
      box.appendChild(menuBtn(g + cur, `${n}問　記録 ${recordedCount(g)}問`, () => pickGenre(g)));
    });
    box.appendChild(menuBtn("← もどる", "", () => renderMenu("main")));
  } else {
    // ストリークと、今日の目標
    const cs = currentStreak();
    const gdone = state.lastGoalDate === todayStr();
    const gn = state.answeredDate === todayStr() ? Math.min(state.answeredToday || 0, DAILY_GOAL) : 0;
    const streakBox = el("div");
    streakBox.style.cssText = "background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:14px 16px;text-align:center;";
    const big = el("div", "", `🔥 ${cs}日連続`);
    big.style.cssText = "font-size:28px;font-weight:800;";
    const best = el("div", "", `最高 ${state.bestStreak || 0}日`);
    best.style.cssText = "font-size:12px;opacity:.7;margin-bottom:10px;";
    const track = el("div");
    track.style.cssText = "height:10px;border-radius:6px;background:rgba(255,255,255,.15);overflow:hidden;";
    const fill = el("div");
    fill.style.cssText = `height:100%;width:${(gdone ? 100 : (gn / DAILY_GOAL) * 100)}%;background:linear-gradient(90deg,#ff9a3d,#ffcf3f);`;
    track.appendChild(fill);
    let note;
    if (gdone) note = "✔ 今日の目標を達成！ また明日も続けよう";
    else if (cs > 0) note = `今日の目標：あと ${DAILY_GOAL - gn}問 で、${cs + 1}日連続になります`;
    else note = `今日の目標：あと ${DAILY_GOAL - gn}問 で、ストリークが始まります`;
    const noteEl = el("div", "", note);
    noteEl.style.cssText = "font-size:13px;margin-top:8px;";
    streakBox.appendChild(big); streakBox.appendChild(best); streakBox.appendChild(track); streakBox.appendChild(noteEl);
    box.appendChild(streakBox);

    const info = el("div", "explain", `Lv.${state.level}　今日 ${state.bossesToday}/${BOSSES_PER_DAY}体　記録 ${state.studied.length}問`);
    info.style.textAlign = "center";
    box.appendChild(info);

    const limit = state.bossesToday >= BOSSES_PER_DAY;
    const n = studiedPool().length;
    const y = yesterdayPool().length;
    box.appendChild(menuBtn(`▶ つづきから勉強する`, `いまの教科：${state.genre}`, () => {
      closeMenu();
      if (mode !== "study") rebuildFeed();
    }));
    box.appendChild(menuBtn("📚 教科をえらんで勉強する", GENRES.filter((g) => g !== ALL).join("・"), () => renderMenu("genres")));
    box.appendChild(menuBtn("⚔ ボス戦（記録した問題から）",
      limit ? "今日のボス戦は終了しました" : (n < TEST_MIN ? `記録 ${n}問（${TEST_MIN}問以上で挑戦できます）` : `記録 ${n}問から、最大${TEST_SIZE}問を出題`),
      () => { closeMenu(); startTest(); }, limit || n < TEST_MIN));
    const yDone = state.yesterdayDone === todayStr();
    box.appendChild(menuBtn("📝 昨日の分のテスト",
      yDone ? "今日はクリア済み（追加経験値をゲット ✔）"
        : (y < YESTERDAY_MIN ? `昨日の記録 ${y}問（${YESTERDAY_MIN}問以上で挑戦できます）`
          : `昨日勉強した ${y}問から、最大${TEST_SIZE}問。全問正解で追加経験値 +${YESTERDAY_BONUS_XP}`),
      () => { closeMenu(); startYesterdayTest(); }, yDone || y < YESTERDAY_MIN));
    box.appendChild(menuBtn("🏆 ランキング", "レベル・ボス討伐数", () => {
      if (typeof window.openRanking === "function") window.openRanking();
      else alert("ランキングを使うには、ログイン機能（cloud.js）が必要です。");
    }));
  }
  menu.appendChild(box);
}
function openMenu(view) {
  menuOpen = true;
  renderMenu(view || "main");
  menu.style.display = "flex";
  updateModeButton();
}
function closeMenu() {
  menuOpen = false;
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
