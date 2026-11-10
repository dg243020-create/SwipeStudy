// ============================================================
// companion.js ― 相棒（相棒ごとのレベル・3つの枠）＋ 宝箱 ＋ 図鑑 ＋ 教科の相棒 ＋ 称号
//   ・script.js の「あと」に読み込みます（index.html は、前回のまま）
//   ・script.js は1文字も変えなくてOK。script.js の関数を、このファイルが「ひとまわり大きく」して動きます
//   ・保存データは state.comp（相棒・枠・かけら・宝箱）に、まとめて入ります
//
//   【しくみ】
//   ・自分のレベル（Lv.）は、いままでどおり。相棒のレベルは、相棒ごとに別々
//   ・経験値は、「連れている相棒」に入る。1匹目は100％、2匹目は50％、3匹目は25％
//   ・2枠目は自分が Lv.10、3枠目は Lv.30 で解放
//   ・宝箱は、「今日の目標を達成」「週間クエスト達成」「ボスを倒す（ときどき）」でもらえる
//   ・教科の相棒は、その教科の問題に100問正解すると仲間になる。その教科の問題に正解すると、経験値が1.5倍
//   ・称号は、バッジ＋相棒のきろくから、好きなものを1つ選べる
// ============================================================
(function () {
  "use strict";

  // ---------- 設定（数字を変えると、速さや出やすさを変えられます） ----------
  const MAX_LV = 30;                          // 相棒のレベルの上限（極める）
  const STAGE_LV = [1, 3, 7, 12, 20, 30];     // 相棒がこのレベルになると、次の姿に進化する
  const FORM_LABEL = ["ベビー", "ジュニア", "ミドル", "アダルト", "マスター", "レジェンド"];
  const STAGE_SAY = ["まだ小さな姿", "すこし成長した！", "力がついてきた", "立派になってきた", "堂々とした姿", "最強の姿！"];
  const NEED_BASE = 40, NEED_STEP = 12;       // 1レベル上がるのに必要な経験値 ＝ (NEED_BASE ＋ レベル×NEED_STEP) × レア度の倍率
  const RAR_MULT = { N: 1, R: 1.5, SR: 2, L: 3, S: 1.5 };   // レアな相棒ほど、育てるのに時間がかかる
  const SLOT_LV = [1, 10, 30];                // 枠が解放される、自分のレベル（1枠目・2枠目・3枠目）
  const SLOT_RATE = [1, 0.5, 0.25];           // 枠ごとの、経験値の割合
  const OVERFLOW_PER = 60;                    // 極めた相棒に入るはずだった経験値が、これだけたまると、かけら1個になる
  const AVG_XP = 12;                          // 1問に正解したときの経験値の目安（「あと約◯問」の計算に使う）
  const NEAR_RATIO = 0.9;                     // 経験値バーが、この割合をこえたら「あと少し！」
  const BOOST_MIN = 15;                       // 経験値2倍券の長さ（分）
  const PITY_R = 10;                          // この回数のあいだ、レア以上が出なければ、次は必ずレア以上
  const PITY_SR = 30;                         // この回数のあいだ、スーパーレア以上が出なければ、次は必ずスーパーレア以上
  // 宝箱のもらえるタイミング
  const CHEST_DAILY = 1;                      // 今日の目標を達成したとき
  const CHEST_WEEKLY = 2;                     // 週間クエストを達成したとき
  const CHEST_BOSS_CHANCE = 0.35;             // ボスを倒したとき、宝箱が落ちる確率（0〜1）
  const SUBJECT_UNLOCK = 100;                 // 教科の相棒が仲間になる、その教科の「正解した問題数」
  const SUBJECT_BONUS = 1.5;                  // 教科の相棒を連れていて、その教科の問題に正解したときの、経験値の倍率

  // レア度：w＝出やすさ、shard＝ダブったときにもらえる「かけら」、price＝かけらで交換するのに必要な数
  const RAR = {
    N:  { label: "ノーマル",     stars: "★",     w: 70, shard: 2,  price: 10 },
    R:  { label: "レア",         stars: "★★",    w: 22, shard: 6,  price: 25 },
    SR: { label: "スーパーレア", stars: "★★★",   w: 7,  shard: 15, price: 60 },
    L:  { label: "伝説",         stars: "★★★★",  w: 1,  shard: 40, price: 150 },
    S:  { label: "教科の相棒",   stars: "📚",     w: 0,  shard: 0,  price: 0 }     // 宝箱には入らない。教科の問題に正解して、仲間にする
  };
  const RAR_ORDER = ["N", "R", "SR", "L"];

  // 相棒たち：forms ＝ 6段階の姿（絵文字）。names があれば、段階ごとの名前になる
  const COMPANIONS = [
    { id: "hiyoko", rar: "N", name: "ことりん", forms: ["🥚", "🐣", "🐥", "🐔", "🦅", "🐉"],
      names: ["ふしぎなたまご", "ピヨまる", "かしこピヨ", "ものしりコッコ", "はかせワシ", "ことだまドラゴン"] },
    { id: "tane",   rar: "N", name: "たねっこ",   forms: ["🌱", "🌿", "🍀", "🌻", "🌳", "🌸"] },
    { id: "sakana", rar: "N", name: "うみっこ",   forms: ["🐟", "🐠", "🐡", "🦈", "🐬", "🐳"] },
    { id: "hoshi",  rar: "N", name: "ほしのこ",   forms: ["⭐", "🌟", "💫", "✨", "🌠", "🌌"] },
    { id: "mushi",  rar: "N", name: "むしっこ",   forms: ["🐛", "🐌", "🐜", "🐝", "🐞", "🦋"] },
    { id: "kitsune", rar: "R", name: "きつねび",     forms: ["🦊", "🦊✨", "🦊💫", "🦊🔥", "🦊🌟", "🦊👑"] },
    { id: "yume",    rar: "R", name: "ゆめうま",     forms: ["🐴", "🐎", "🦄", "🦄✨", "🦄🌈", "🦄👑"] },
    { id: "fukuro",  rar: "R", name: "ふくろう博士", forms: ["🐦", "🦉", "🦉📚", "🦉🎓", "🦉✨", "🦉👑"] },
    { id: "pen",  rar: "SR", name: "こおりペンギン", forms: ["🐧", "🐧💧", "🐧🧊", "🐧💎", "🐧🌟", "🐧👑"] },
    { id: "tora", rar: "SR", name: "ほのおのとら",   forms: ["🐱", "🐯", "🐯🔥", "🐅", "🐅🔥", "🐅👑"] },
    { id: "niji", rar: "L",  name: "にじのりゅう",   forms: ["🥚✨", "🐍✨", "🐲✨", "🐉✨", "🐉🌈", "🐉👑"] },
    // 教科の相棒：group は、script.js の教科のグループ（SUBJECT_GROUPS）の id
    { id: "s_kokugo", rar: "S", subject: true, group: "kokugo", name: "ことのはん", forms: ["📝", "📖", "📕", "📚", "🎋", "🏮"] },
    { id: "s_shakai", rar: "S", subject: true, group: "shakai", name: "ちずまる",   forms: ["🧭", "🏺", "🏛", "🏯", "🌏", "👑"] },
    { id: "s_rika",   rar: "S", subject: true, group: "rika",   name: "ラボリン",   forms: ["🧪", "🔬", "🧬", "🔭", "🚀", "🪐"] },
    { id: "s_eigo",   rar: "S", subject: true, group: "eigo",   name: "ワードン",   forms: ["🔤", "💬", "🗽", "🛫", "🌐", "🎓"] }
  ];
  const BY = {};
  COMPANIONS.forEach((c) => { BY[c.id] = c; });

  // ---------- 見た目（CSS） ----------
  const css = document.createElement("style");
  css.textContent = `
#hud .bar.xp { height: 16px; position: relative; }
.comp-xp-label { position: absolute; left: 0; right: 0; top: 0; bottom: 0; display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 800; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,.7); pointer-events: none; white-space: nowrap; }
.comp-xp-label.near { color: #ffe27a; }
#xpFill.comp-near { box-shadow: 0 0 10px #ffcf3f; animation: compGlow 1s ease-in-out infinite; }
.comp-btn { font: inherit; font-size: 22px; line-height: 1; width: 36px; height: 36px; padding: 0; border-radius: 50%; cursor: pointer;
  color: #fff; background: rgba(255,255,255,.14); border: 2px solid rgba(255,255,255,.35); flex: none; white-space: nowrap; overflow: hidden; }
.comp-btn.sm, .comp-step .e.sm { font-size: 14px; }
.comp-btn:active { transform: scale(.92); }
.rar-R  { border-color: #6ea8ff !important; box-shadow: 0 0 8px #6ea8ff; }
.rar-SR { border-color: #ffcf3f !important; box-shadow: 0 0 10px #ffcf3f; }
.rar-L  { border-color: #ff7ad9 !important; animation: compRainbow 2.4s linear infinite; }
.rar-S  { border-color: #3ddc84 !important; box-shadow: 0 0 8px #3ddc84; }
.comp-chest { position: fixed; left: 10px; bottom: calc(10px + env(safe-area-inset-bottom, 0px)); z-index: 35; display: none;
  font: inherit; font-size: 13px; font-weight: 800; color: #1a1033; background: #ffcf3f; border: 0; border-radius: 999px; padding: 8px 12px; cursor: pointer;
  animation: compBob 1.2s infinite; box-shadow: 0 0 12px rgba(255,207,63,.8); }
.comp-ov { position: fixed; inset: 0; z-index: 45; display: flex; align-items: center; justify-content: center; padding: 16px;
  background: rgba(10,5,25,.92); color: #fff; overflow: auto; }
.comp-box { width: 100%; max-width: 440px; margin: auto; text-align: center; display: flex; flex-direction: column; gap: 10px; align-items: center; }
.comp-title { font-size: 18px; font-weight: 800; }
.comp-big { font-size: 100px; line-height: 1.15; white-space: nowrap; }
.comp-big.long { font-size: 64px; }
.comp-big.mid { font-size: 72px; }
.comp-big.shake { animation: compShake .35s linear infinite; filter: drop-shadow(0 0 18px #fff); }
.comp-big.pop { animation: compPop .7s ease-out; }
.comp-big.g-N  { filter: drop-shadow(0 0 22px #ffffff); }
.comp-big.g-R  { filter: drop-shadow(0 0 26px #6ea8ff); }
.comp-big.g-SR { filter: drop-shadow(0 0 30px #ffcf3f); }
.comp-big.g-L  { animation: compShake .3s linear infinite, compRainbowGlow 1s linear infinite; }
.comp-name { font-size: 20px; font-weight: 800; color: #ffcf3f; }
.comp-stars { font-size: 16px; letter-spacing: 2px; }
.comp-say { font-size: 14px; opacity: .85; }
.comp-line { font-size: 13px; opacity: .92; }
.comp-bar { width: 100%; max-width: 280px; height: 10px; border-radius: 6px; background: rgba(255,255,255,.16); overflow: hidden; }
.comp-bar > div { height: 100%; background: linear-gradient(90deg, #6ea8ff, #b78bff); }
.comp-road, .comp-grid, .comp-slots { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin: 4px 0; }
.comp-step, .comp-tile, .comp-slot { width: 62px; padding: 6px 2px; border-radius: 12px; border: 2px solid rgba(255,255,255,.2); background: rgba(255,255,255,.06);
  color: #fff; font: inherit; text-align: center; }
.comp-tile, .comp-slot { cursor: pointer; width: 70px; }
.comp-slot { width: 96px; padding: 8px 4px; }
.comp-slot.empty, .comp-slot.locked { opacity: .55; }
.comp-slot .e { font-size: 30px; line-height: 1.2; white-space: nowrap; }
.comp-slot .e.sm { font-size: 18px; }
.comp-slot .l { font-size: 11px; line-height: 1.3; }
.comp-step.now, .comp-tile.sel, .comp-slot.sel { background: rgba(255,207,63,.18); outline: 2px solid #ffcf3f; }
.comp-step .e, .comp-tile .e { font-size: 26px; line-height: 1.2; white-space: nowrap; }
.comp-tile .e.sm { font-size: 17px; }
.comp-step .l, .comp-tile .l { font-size: 10px; opacity: .9; }
.comp-step.lock .e, .comp-tile.lock .e { filter: brightness(0) invert(1); opacity: .22; }
.comp-step.lock.next .e { opacity: .45; }
.comp-tile.r-S { border-color: #3ddc84; } .comp-tile.r-R  { border-color: #6ea8ff; } .comp-tile.r-SR { border-color: #ffcf3f; } .comp-tile.r-L { border-color: #ff7ad9; }
.comp-close, .comp-sub { font: inherit; font-weight: 800; font-size: 16px; border: 0; border-radius: 14px; padding: 12px 26px; cursor: pointer; margin-top: 4px; }
.comp-close { color: #1a1033; background: #ffcf3f; }
.comp-sub { color: #fff; background: rgba(255,255,255,.16); border: 1px solid rgba(255,255,255,.3); font-size: 14px; padding: 10px 18px; }
.comp-sub:disabled { opacity: .45; cursor: default; }
.comp-titles { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
.comp-tbtn { font: inherit; font-size: 13px; font-weight: 700; color: #fff; background: rgba(255,255,255,.1); border: 2px solid rgba(255,255,255,.25); border-radius: 999px; padding: 7px 12px; cursor: pointer; }
.comp-tbtn.sel { border-color: #ffcf3f; background: rgba(255,207,63,.2); }
.comp-tap { font-size: 12px; color: #ffcf3f; animation: compBob 1.2s infinite; }
.comp-new { color: #ff7ad9; font-weight: 800; }
.ui-wide .comp-ov .comp-box { zoom: var(--kf, 1); }
@keyframes compGlow { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.5); } }
@keyframes compShake { 0%,100% { transform: translateX(0) rotate(0); } 25% { transform: translateX(-6px) rotate(-4deg); } 75% { transform: translateX(6px) rotate(4deg); } }
@keyframes compPop { 0% { transform: scale(.2); opacity: 0; } 60% { transform: scale(1.35); opacity: 1; } 100% { transform: scale(1); } }
@keyframes compBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
@keyframes compRainbow { 0% { border-color: #ff5470; box-shadow: 0 0 10px #ff5470; } 33% { border-color: #ffcf3f; box-shadow: 0 0 10px #ffcf3f; }
  66% { border-color: #3ddc84; box-shadow: 0 0 10px #3ddc84; } 100% { border-color: #6ea8ff; box-shadow: 0 0 10px #6ea8ff; } }
@keyframes compRainbowGlow { 0% { filter: drop-shadow(0 0 26px #ff5470); } 33% { filter: drop-shadow(0 0 26px #ffcf3f); }
  66% { filter: drop-shadow(0 0 26px #3ddc84); } 100% { filter: drop-shadow(0 0 26px #6ea8ff); } }
@media (prefers-reduced-motion: reduce) { #xpFill.comp-near, .comp-big.shake, .comp-big.pop, .comp-big.g-L, .comp-tap, .comp-chest, .rar-L { animation: none; } }`;
  (document.head || document.body).appendChild(css);

  // ---------- 計算（レベル・進化・経験値） ----------
  function stageIndex(lv) {                    // 相棒のレベルで、何番目の姿か
    let idx = 0;
    STAGE_LV.forEach((l, k) => { if (lv >= l) idx = k; });
    return idx;
  }
  function need(comp, lv) { return Math.round((NEED_BASE + lv * NEED_STEP) * RAR_MULT[comp.rar]); }   // lv から lv+1 に必要な経験値
  function slotsOpen() { return SLOT_LV.filter((l) => state.level >= l).length; }
  function formOf(comp, i) { return comp.forms[i]; }
  function nameOf(comp, i) { return comp.names ? comp.names[i] : `${comp.name}（${FORM_LABEL[i]}）`; }
  function isLong(s) { return Array.from(s).length >= 2; }
  function questionsLeft() { return Math.max(1, Math.ceil((xpNeeded() - state.xp) / AVG_XP)); }

  // ---------- 保存データ（state.comp） ----------
  function num(v) { return (typeof v === "number" && isFinite(v) && v > 0) ? Math.floor(v) : 0; }
  function cleanComp(x) {                      // 壊れたデータや足りない項目を、きれいに直す（古い形のデータも読める）
    x = (x && typeof x === "object") ? x : {};
    const owned = {};
    if (x.owned && typeof x.owned === "object") {
      Object.keys(x.owned).forEach((id) => { if (BY[id] && num(x.owned[id]) > 0) owned[id] = num(x.owned[id]); });
    }
    if (!owned.hiyoko) owned.hiyoko = 1;       // ことりん（最初の相棒）は、いつも持っている
    const grow = {};
    Object.keys(owned).forEach((id) => {
      const g = (x.grow && typeof x.grow === "object" && x.grow[id] && typeof x.grow[id] === "object") ? x.grow[id] : {};
      const lv = Math.min(MAX_LV, Math.max(1, num(g.lv) || 1));
      const xp = (typeof g.xp === "number" && isFinite(g.xp) && g.xp > 0 && lv < MAX_LV) ? g.xp : 0;
      grow[id] = { lv, xp, seen: Math.min(STAGE_LV.length - 1, num(g.seen)) };
    });
    let team = Array.isArray(x.team) ? x.team.slice(0, 3) : [BY[x.active] ? x.active : "hiyoko"];
    team = team.map((id) => (owned[id] ? id : null));
    team = team.map((id, k) => (id && team.indexOf(id) === k) ? id : null);    // 同じ相棒を、2つの枠に入れない
    while (team.length < 3) team.push(null);
    if (!team[0]) team[0] = "hiyoko";
    return {
      owned, grow, team,
      shards: num(x.shards), pending: num(x.pending), pityR: num(x.pityR), pitySR: num(x.pitySR),
      title: typeof x.title === "string" ? x.title : "",
      boostUntil: num(x.boostUntil), gift: x.gift ? 1 : 0, overflow: (typeof x.overflow === "number" && x.overflow > 0) ? x.overflow : 0,
      intro: (x.intro || typeof state.compSeen === "number") ? 1 : 0       // 前のバージョンで遊んでいた人は、紹介を出さない
    };
  }
  function C() {                               // いつでも、正しい state.comp を返す
    if (!state.comp || !state.comp.owned || !state.comp.grow || !state.comp.team) state.comp = cleanComp(state.comp);
    return state.comp;
  }
  function ownedCount(c) { return Object.keys(c.owned).length; }
  function gain(c, id) {                       // 相棒を手に入れたとき（はじめてなら、レベル1から）
    c.owned[id] = (c.owned[id] || 0) + 1;
    if (!c.grow[id]) c.grow[id] = { lv: 1, xp: 0, seen: 0 };
  }
  function mainComp() { const c = C(); return BY[c.team[0]] || BY.hiyoko; }
  function growOf(id) { const c = C(); return c.grow[id] || (c.grow[id] = { lv: 1, xp: 0, seen: 0 }); }
  function boostOn() { return C().boostUntil > Date.now(); }
  function persist() { try { save(); } catch (e) { /* 保存できなくても遊べる */ } }

  function div(cls, text) {
    const d = document.createElement("div");
    if (cls) d.className = cls;
    if (text !== undefined) d.textContent = text;
    return d;
  }
  function button(cls, text, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = cls;
    b.textContent = text;
    b.addEventListener("click", (e) => { e.stopPropagation(); onClick(); });
    return b;
  }
  function barOf(ratio) {
    const b = div("comp-bar"), f = document.createElement("div");
    f.style.width = Math.round(Math.max(0, Math.min(1, ratio)) * 100) + "%";
    b.appendChild(f);
    return b;
  }

  // ---------- 経験値を、連れている相棒に配る ----------
  let evoQueue = [];                           // 進化・新しい仲間の演出の順番待ち
  let lastGroup = null;                        // 直前に答えた問題の、教科のグループ（教科の相棒のボーナス用）
  const groupCache = {};
  function groupOfGenre(name) {                // 「日本史」→「shakai」のように、教科のグループを調べる
    if (name in groupCache) return groupCache[name];
    let id = "";
    SUBJECT_GROUPS.forEach((g) => { if (!id && g.id !== "other" && groupGenres(g).indexOf(name) >= 0) id = g.id; });
    return (groupCache[name] = id);
  }
  function groupName(gid) { const g = SUBJECT_GROUPS.find((x) => x.id === gid); return g ? g.name : ""; }
  function groupCorrect(gid) {                 // その教科のグループで、正解した問題の数
    try {
      const g = SUBJECT_GROUPS.find((x) => x.id === gid);
      let n = 0;
      if (g) groupGenres(g).forEach((name) => { const p = state.stats.genres[name]; if (p) n += p[1]; });
      return n;
    } catch (e) { return 0; }
  }
  function giveXp(c, id, x) {
    const comp = BY[id], g = growOf(id);
    if (g.lv >= MAX_LV) {                      // 極めた相棒の分は、かけらになる
      c.overflow += x;
      while (c.overflow >= OVERFLOW_PER) { c.overflow -= OVERFLOW_PER; c.shards++; }
      return;
    }
    g.xp += x;
    while (g.lv < MAX_LV && g.xp >= need(comp, g.lv)) {
      g.xp -= need(comp, g.lv);
      g.lv++;
    }
    if (g.lv >= MAX_LV) g.xp = 0;
  }
  function addXpToTeam(amount) {
    const c = C();
    const open = slotsOpen();
    for (let k = 0; k < open; k++) {
      const id = c.team[k];
      if (!id) continue;
      let x = amount * SLOT_RATE[k];
      if (BY[id].group && BY[id].group === lastGroup) x *= SUBJECT_BONUS;    // 得意な教科の問題は、経験値が増える
      giveXp(c, id, x);
    }
    lastGroup = null;
    checkEvolutions();
  }
  function checkEvolutions() {                 // 進化した相棒がいれば、演出の順番待ちに入れる
    const c = C();
    let found = false;
    Object.keys(c.owned).forEach((id) => {
      const g = growOf(id), idx = stageIndex(g.lv);
      if (idx > g.seen) { evoQueue.push({ kind: "evo", id, from: g.seen, to: idx }); g.seen = idx; found = true; }
      else if (idx < g.seen) g.seen = idx;
    });
    if (found) { persist(); runEvoQueue(); }
  }
  let evoWaiting = false;
  function runEvoQueue() {
    if (evoWaiting || evoQueue.length === 0) return;
    evoWaiting = true;
    setTimeout(() => {                         // レベルアップの演出のあとに出す
      evoWaiting = false;
      whenFree(() => {
        const e = evoQueue.shift();
        if (e) { if (e.kind === "unlock") showUnlock(e); else showEvolution(e); }
        if (evoQueue.length > 0) runEvoQueue();
      });
    }, 900);
  }

  function checkSubjectUnlocks() {             // 教科の問題に100問正解したら、その教科の相棒が仲間になる
    const c = C();
    let found = false;
    COMPANIONS.forEach((cp) => {
      if (!cp.subject || c.owned[cp.id]) return;
      if (groupCorrect(cp.group) >= SUBJECT_UNLOCK) { gain(c, cp.id); evoQueue.push({ kind: "unlock", id: cp.id }); found = true; }
    });
    if (found) { persist(); runEvoQueue(); }
  }

  // ---------- 宝箱の抽選 ----------
  function pickWeighted(list) {                // [[値, 重み], ...] から、重みに応じて1つ選ぶ
    const total = list.reduce((s, p) => s + p[1], 0);
    let r = Math.random() * total;
    for (let i = 0; i < list.length; i++) { r -= list[i][1]; if (r < 0) return list[i][0]; }
    return list[list.length - 1][0];
  }
  function rollRarity(c) {
    let rar;
    if (c.pitySR >= PITY_SR - 1) rar = pickWeighted([["SR", RAR.SR.w], ["L", RAR.L.w]]);                    // スーパーレア以上が確定
    else if (c.pityR >= PITY_R - 1) rar = pickWeighted([["R", RAR.R.w], ["SR", RAR.SR.w], ["L", RAR.L.w]]);  // レア以上が確定
    else rar = pickWeighted(RAR_ORDER.map((k) => [k, RAR[k].w]));
    const rank = RAR_ORDER.indexOf(rar);
    c.pityR = rank >= 1 ? 0 : c.pityR + 1;
    c.pitySR = rank >= 2 ? 0 : c.pitySR + 1;
    return rar;
  }
  function rollChest() {                       // 抽選して、結果をすぐ state に反映する（ハズレなし）
    const c = C();
    const rar = rollRarity(c);
    let kind = "comp";
    if (rar === "N") kind = pickWeighted([["comp", 45], ["boost", 30], ["shard", 25]]);
    else if (rar === "R") kind = pickWeighted([["comp", 70], ["ticket", 30]]);
    const res = { rar, kind };
    if (kind === "comp") {
      const pool = COMPANIONS.filter((x) => x.rar === rar);
      const fresh = pool.filter((x) => !c.owned[x.id]);
      const list = (fresh.length > 0 && Math.random() < 0.7) ? fresh : pool;   // まだ持っていない相棒が、出やすい
      const comp = list[Math.floor(Math.random() * list.length)];
      res.id = comp.id;
      if (c.owned[comp.id]) { res.dup = true; res.shards = RAR[rar].shard; c.shards += res.shards; c.owned[comp.id]++; }
      else { res.dup = false; gain(c, comp.id); }
    } else if (kind === "boost") {
      c.boostUntil = Math.max(Date.now(), c.boostUntil) + BOOST_MIN * 60000;
    } else if (kind === "ticket") {
      state.tickets = (state.tickets || 0) + 1;
    } else {                                   // かけら
      res.shards = 2; c.shards += 2;
    }
    return res;
  }

  // ---------- 画面の部品：HUD の相棒ボタン・経験値バーの文字・宝箱ボタン ----------
  const btn = document.createElement("button");
  btn.id = "compBtn";
  btn.type = "button";
  btn.className = "comp-btn";
  btn.setAttribute("aria-label", "相棒を見る");
  const player = document.querySelector("#hud .player");
  const levelEl = document.getElementById("level");
  if (player && levelEl) player.insertBefore(btn, levelEl);
  btn.addEventListener("click", () => showPanel(false));

  const label = div("comp-xp-label", "");
  const xpFill = document.getElementById("xpFill");
  if (xpFill && xpFill.parentNode) xpFill.parentNode.appendChild(label);

  const chestBtn = document.createElement("button");
  chestBtn.type = "button";
  chestBtn.className = "comp-chest";
  chestBtn.addEventListener("click", () => openChest());
  document.body.appendChild(chestBtn);

  // ---------- 大きな表示（相棒メニュー・進化・宝箱・図鑑） ----------
  let overlay = null;
  let locked = false;        // true のあいだは、タップで閉じられない
  let savedFxZ = "";
  function closeOverlay() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    const fx = document.getElementById("fx");
    if (fx) fx.style.zIndex = savedFxZ;
    try { if (menuOpen && lastMenuView === "main") renderMenu("main"); } catch (e) { /* スタートメニューの表示を最新にする */ }
  }
  function openOverlay() {
    if (overlay) { overlay.remove(); overlay = null; }
    overlay = div("comp-ov");
    const box = div("comp-box");
    overlay.appendChild(box);
    overlay.addEventListener("click", () => { if (!locked) closeOverlay(); });
    document.body.appendChild(overlay);
    const fx = document.getElementById("fx");      // 紙ふぶきが、大きな表示の上に出るようにする
    if (fx) { if (!savedFxZ) savedFxZ = fx.style.zIndex || ""; fx.style.zIndex = "50"; }
    locked = false;
    return box;
  }
  function whenFree(fn) {                          // ほかの大きな表示が出ていたら、閉じるまで待つ
    if (!overlay) fn(); else setTimeout(() => whenFree(fn), 800);
  }
  function bigEmoji(text, extra) {
    return div("comp-big" + (isLong(text) ? " long" : "") + (extra ? " " + extra : ""), text);
  }
  function fire(n, notes) {
    try { confetti(n); beep(notes, 0.12); } catch (e) { /* 無視 */ }
  }

  // 相棒メニュー（HUD のボタン／スタートメニューのボタン／はじめて来たとき）
  function showPanel(intro, gift) {
    const c = C(), comp = mainComp(), g = growOf(comp.id), i = stageIndex(g.lv);
    const open = slotsOpen();
    const box = openOverlay();
    box.appendChild(div("comp-title", intro ? "🎁 相棒がやってきた！" : "🐾 相棒"));

    // 3つの枠
    const slots = div("comp-slots");
    for (let k = 0; k < 3; k++) {
      const id = c.team[k];
      const unlocked = k < open;
      const s = document.createElement("button");
      s.type = "button";
      if (!unlocked) {
        s.className = "comp-slot locked";
        s.appendChild(div("e", "🔒"));
        s.appendChild(div("l", `枠${k + 1}`));
        s.appendChild(div("l", `自分のLv.${SLOT_LV[k]}で解放`));
        s.addEventListener("click", (e) => { e.stopPropagation(); toast(`自分がLv.${SLOT_LV[k]}になると、枠${k + 1}が解放されます`); });
      } else if (id) {
        const cp = BY[id], gg = growOf(id), f = formOf(cp, stageIndex(gg.lv));
        s.className = "comp-slot" + (k === 0 ? " sel" : "");
        s.appendChild(div("e" + (isLong(f) ? " sm" : ""), f));
        s.appendChild(div("l", cp.name));
        s.appendChild(div("l", `Lv.${gg.lv}${gg.lv >= MAX_LV ? " ★極め" : ""}　経験値${Math.round(SLOT_RATE[k] * 100)}％`));
        s.addEventListener("click", (e) => { e.stopPropagation(); showDex(id); });
      } else {
        s.className = "comp-slot empty";
        s.appendChild(div("e", "＋"));
        s.appendChild(div("l", `枠${k + 1}（空き）`));
        s.appendChild(div("l", `経験値${Math.round(SLOT_RATE[k] * 100)}％`));
        s.addEventListener("click", (e) => { e.stopPropagation(); showDex(c.team[0]); });
      }
      slots.appendChild(s);
    }
    box.appendChild(slots);

    // 1枠目の相棒のくわしい様子
    box.appendChild(bigEmoji(formOf(comp, i), "mid"));
    box.appendChild(div("comp-name", nameOf(comp, i)));
    box.appendChild(div("comp-stars", RAR[comp.rar].stars + " " + RAR[comp.rar].label));
    box.appendChild(div("comp-say", STAGE_SAY[i]));
    if (comp.group) box.appendChild(div("comp-line", `📚 ${groupName(comp.group)}の問題に正解すると、経験値が${SUBJECT_BONUS}倍`));
    const tt = titleById(c.title);
    box.appendChild(button("comp-sub", tt ? `🏷 ${tt.icon} ${tt.name} ▶` : "🏷 称号をえらぶ ▶", () => showTitles()));
    if (g.lv >= MAX_LV) {
      box.appendChild(div("comp-line", `Lv.${g.lv} ★極めた！ これからの経験値は、かけらになります`));
    } else {
      box.appendChild(div("comp-line", `Lv.${g.lv}　あと経験値 ${Math.max(1, Math.ceil(need(comp, g.lv) - g.xp))}`));
      box.appendChild(barOf(g.xp / need(comp, g.lv)));
      const nextLv = STAGE_LV[i + 1];
      box.appendChild(div("comp-line", nextLv ? `次の進化：Lv.${nextLv}（あと${nextLv - g.lv}レベル）` : ""));
    }
    const road = div("comp-road");
    STAGE_LV.forEach((slv, k) => {
      const step = div("comp-step" + (k === i ? " now" : "") + (k > i ? " lock" : "") + (k === i + 1 ? " next" : ""));
      step.appendChild(div("e" + (isLong(formOf(comp, k)) ? " sm" : ""), formOf(comp, k)));
      step.appendChild(div("l", k > i ? `Lv.${slv}` : (comp.names ? comp.names[k] : FORM_LABEL[k])));
      road.appendChild(step);
    });
    box.appendChild(road);

    let stock = `🎁 宝箱 ${c.pending}個　💎 かけら ${c.shards}`;
    if (boostOn()) stock += `　⚡2倍 あと${Math.max(1, Math.ceil((c.boostUntil - Date.now()) / 60000))}分`;
    box.appendChild(div("comp-line", stock));
    if (gift) box.appendChild(div("comp-line", "🎁 はじめての宝箱をプレゼント！ 左下のボタンから開けてね"));
    else box.appendChild(div("comp-line", "宝箱は「今日の目標」「週間クエスト」「ボス撃破」でもらえるよ"));
    if (c.pending > 0) box.appendChild(button("comp-sub", `🎁 宝箱を開ける（${c.pending}個）`, () => openChest()));
    box.appendChild(button("comp-sub", `📖 図鑑・入れかえ（${ownedCount(c)}/${COMPANIONS.length}）`, () => showDex(c.team[0])));
    box.appendChild(button("comp-close", intro ? "よろしくね！" : "とじる", closeOverlay));
  }

  // 進化の演出：「おや？」→ 光る → 新しい姿
  function showEvolution(e) {
    const comp = BY[e.id];
    const box = openOverlay();
    const mine = overlay;
    locked = true;
    const title = div("comp-title", "…おや？ 相棒の様子が…");
    let big = bigEmoji(formOf(comp, e.from), "shake");
    const name = div("comp-name", nameOf(comp, e.from));
    const say = div("comp-say", "");
    const tap = div("comp-tap", "");
    [title, big, name, say, tap].forEach((x) => box.appendChild(x));
    try { beep([392, 440, 494], 0.18); } catch (err) { /* 音は鳴らなくてよい */ }
    setTimeout(() => {
      if (overlay !== mine) return;
      title.textContent = e.to === STAGE_LV.length - 1 ? "🌟 最終進化！" : "✨ 進化！";
      const nb = bigEmoji(formOf(comp, e.to), "pop");
      box.replaceChild(nb, big);
      big = nb;
      name.textContent = nameOf(comp, e.to);
      say.textContent = `${comp.name}：${formOf(comp, e.from)} → ${formOf(comp, e.to)}　進化した！`;
      tap.textContent = "タップして閉じる";
      locked = false;
      fire(120, [523, 659, 784, 1047, 1319]);
    }, 1500);
  }

  // 教科の相棒が、仲間になったとき
  function showUnlock(e) {
    const comp = BY[e.id];
    const box = openOverlay();
    box.appendChild(div("comp-title", "🎉 新しい仲間！"));
    box.appendChild(bigEmoji(formOf(comp, 0), "pop g-R"));
    box.appendChild(div("comp-name", comp.name));
    box.appendChild(div("comp-stars", "📚 " + groupName(comp.group) + "の相棒"));
    box.appendChild(div("comp-line", `${groupName(comp.group)}の問題に、${SUBJECT_UNLOCK}問 正解しました！`));
    box.appendChild(div("comp-line", `${groupName(comp.group)}の問題に正解すると、この相棒の経験値が${SUBJECT_BONUS}倍になります`));
    fire(120, [523, 659, 784, 1047, 1319]);
    box.appendChild(button("comp-sub", "枠に入れる・入れかえる", () => showDex(comp.id)));
    box.appendChild(button("comp-close", "とじる", closeOverlay));
  }

  // ---------- 称号 ----------
  // バッジ（script.js の BADGES）と、相棒のきろくが、そのまま称号になる。好きなものを1つ選べる。
  const COMP_TITLES = [
    { id: "col5",   icon: "🗂", name: "コレクター",     desc: "相棒を5種類あつめる",             goal: 5,  unit: "種類", get: () => ownedCount(C()) },
    { id: "colAll", icon: "📖", name: "図鑑マスター",   desc: "すべての相棒をあつめる",           goal: COMPANIONS.length, unit: "種類", get: () => ownedCount(C()) },
    { id: "max1",   icon: "🏅", name: "極めし者",       desc: "相棒を1匹、レベル30まで育てる",     goal: 1,  unit: "匹", get: () => Object.keys(C().grow).filter((id) => C().grow[id].lv >= MAX_LV).length },
    { id: "max3",   icon: "🏆", name: "三つの極み",     desc: "相棒を3匹、レベル30まで育てる",     goal: 3,  unit: "匹", get: () => Object.keys(C().grow).filter((id) => C().grow[id].lv >= MAX_LV).length },
    { id: "leg",    icon: "🌈", name: "伝説の持ち主",   desc: "伝説の相棒を手に入れる",           goal: 1,  unit: "匹", get: () => Object.keys(C().owned).filter((id) => BY[id].rar === "L").length },
    { id: "slot3",  icon: "🐾", name: "三匹使い",       desc: "3つめの枠を解放する（自分がLv.30）", goal: 1,  unit: "",   get: () => (slotsOpen() >= 3 ? 1 : 0) },
    { id: "subAll", icon: "🎓", name: "教科の友",       desc: "4つの教科の相棒を、すべて仲間にする", goal: 4,  unit: "匹", get: () => COMPANIONS.filter((x) => x.subject && C().owned[x.id]).length }
  ];
  function allTitles() {
    const list = [];
    try {
      BADGES.forEach((b) => list.push({ id: "b:" + b.id, icon: b.icon, name: b.name, desc: b.desc, earned: !!state.badges[b.id], cur: Math.min(b.get(), b.goal), goal: b.goal, unit: b.unit }));
    } catch (e) { /* バッジが読めなくても、相棒の称号は出す */ }
    COMP_TITLES.forEach((t) => {
      const v = t.get();
      list.push({ id: "c:" + t.id, icon: t.icon, name: t.name, desc: t.desc, earned: v >= t.goal, cur: Math.min(v, t.goal), goal: t.goal, unit: t.unit });
    });
    return list;
  }
  function titleById(id) {                     // いま選んでいて、ちゃんと獲得している称号
    if (!id) return null;
    return allTitles().find((t) => t.id === id && t.earned) || null;
  }
  function showTitles() {
    const c = C(), list = allTitles();
    const box = openOverlay();
    box.appendChild(div("comp-title", "🏷 称号"));
    const cur = titleById(c.title);
    box.appendChild(div("comp-name", cur ? `${cur.icon} ${cur.name}` : "称号なし"));
    if (cur) box.appendChild(div("comp-line", cur.desc));
    const got = list.filter((t) => t.earned);
    box.appendChild(div("comp-line", `獲得 ${got.length}/${list.length}　タップして、つけかえる（もう一度タップで外す）`));
    const grid = div("comp-titles");
    got.forEach((t) => {
      grid.appendChild(button("comp-tbtn" + (t.id === c.title ? " sel" : ""), `${t.icon} ${t.name}`, () => {
        c.title = (c.title === t.id) ? "" : t.id;
        persist(); refresh(); showTitles();
      }));
    });
    if (got.length === 0) grid.appendChild(div("comp-line", "まだ称号がありません。勉強して、バッジを集めよう！"));
    box.appendChild(grid);
    const next = list.filter((t) => !t.earned).sort((a, b) => (b.cur / b.goal) - (a.cur / a.goal)).slice(0, 6);
    if (next.length > 0) {
      box.appendChild(div("comp-line", "もうすぐ獲得できる称号"));
      next.forEach((t) => box.appendChild(div("comp-line", `🔒 ${t.icon} ${t.name}：${t.desc}（${t.cur}/${t.goal}${t.unit}）`)));
    }
    box.appendChild(button("comp-sub", "← 相棒メニューにもどる", () => showPanel(false)));
    box.appendChild(button("comp-close", "とじる", closeOverlay));
  }

  // ---------- 宝箱を開ける ----------
  function openChest() {
    const c = C();
    if (c.pending <= 0) { toast("宝箱がありません"); return; }
    c.pending--;
    const res = rollChest();                   // 先に結果を保存する（途中で閉じても、中身は消えない）
    persist();
    refresh();
    const box = openOverlay();
    const mine = overlay;
    locked = true;
    const title = div("comp-title", "🎁 宝箱を開けている…");
    const big = bigEmoji("🎁", "shake");
    const tap = div("comp-tap", "");
    box.appendChild(title); box.appendChild(big); box.appendChild(tap);
    try { beep([330, 392], 0.15); } catch (e) { /* 無視 */ }
    setTimeout(() => {                         // 中身が見える前に、レア度の色で光る（予感）
      if (overlay !== mine) return;
      big.className = "comp-big g-" + res.rar;
      title.textContent = res.rar === "N" ? "ぴかっ…！" : res.rar === "R" ? "青く光った…！" : res.rar === "SR" ? "金色に光った…！！" : "虹色に光った…！！！";
      try { beep(res.rar === "N" ? [440] : [440, 554, 659], 0.12); } catch (e) { /* 無視 */ }
    }, 1000);
    setTimeout(() => { if (overlay === mine) revealChest(res); }, 2300);
  }
  function revealChest(res) {
    const c = C();
    const box = openOverlay();
    const R = RAR[res.rar];
    box.appendChild(div("comp-title", res.kind === "comp" && !res.dup ? "🎉 新しい相棒！" : "🎁 宝箱の中身"));
    if (res.kind === "comp") {
      const comp = BY[res.id];
      box.appendChild(bigEmoji(formOf(comp, 0), "pop g-" + res.rar));
      box.appendChild(div("comp-name", comp.name));
      box.appendChild(div("comp-stars", R.stars + " " + R.label));
      if (res.dup) box.appendChild(div("comp-line", `もう持っていた！ かけら 💎+${res.shards} になりました`));
      else {
        box.appendChild(div("comp-new", "NEW！ 図鑑に登録しました（レベル1から育てよう）"));
        box.appendChild(button("comp-sub", "枠に入れる・入れかえる", () => showDex(comp.id)));
      }
    } else if (res.kind === "boost") {
      box.appendChild(bigEmoji("⚡"));
      box.appendChild(div("comp-name", `経験値2倍券（${BOOST_MIN}分）`));
      box.appendChild(div("comp-line", "いまから、もらえる経験値が2倍になります！"));
    } else if (res.kind === "ticket") {
      box.appendChild(bigEmoji("🎫"));
      box.appendChild(div("comp-name", "おやすみ券 +1"));
      box.appendChild(div("comp-stars", R.stars + " " + R.label));
      box.appendChild(div("comp-line", "連続記録を守る券です。メニューから使えます"));
    } else {
      box.appendChild(bigEmoji("💎"));
      box.appendChild(div("comp-name", `かけら +${res.shards}`));
      box.appendChild(div("comp-line", "ためると、図鑑で好きな相棒と交換できます"));
    }
    fire({ N: 25, R: 60, SR: 110, L: 200 }[res.rar], res.rar === "N" ? [523, 659] : [523, 659, 784, 1047, 1319]);
    if (c.pending > 0) box.appendChild(button("comp-sub", `🎁 つぎを開ける（残り${c.pending}個）`, () => openChest()));
    box.appendChild(button("comp-close", "とじる", closeOverlay));
  }

  // ---------- 図鑑・入れかえ ----------
  function setSlot(k, id) {                    // 相棒を枠に入れる。すでに別の枠にいたら、入れかえる
    const c = C(), t = c.team, j = t.indexOf(id);
    if (j === k) return true;
    if (j >= 0) {
      const prev = t[k];
      if (j === 0 && !prev) { toast("1枠目の相棒は、空にできません"); return false; }
      t[k] = id; t[j] = prev || null;
    } else t[k] = id;
    persist();
    return true;
  }
  function showDex(selId) {
    const c = C(), open = slotsOpen();
    const sel = BY[selId] || mainComp();
    const box = openOverlay();
    box.appendChild(div("comp-title", `📖 図鑑　${ownedCount(c)}/${COMPANIONS.length}`));
    const grid = div("comp-grid");
    COMPANIONS.forEach((comp) => {
      const has = !!c.owned[comp.id];
      const f = formOf(comp, has ? stageIndex(growOf(comp.id).lv) : 0);
      const slot = c.team.indexOf(comp.id);
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "comp-tile r-" + comp.rar + (has ? "" : " lock") + (comp.id === sel.id ? " sel" : "");
      tile.appendChild(div("e" + (isLong(f) ? " sm" : ""), f));
      tile.appendChild(div("l", has ? comp.name : "？？？"));
      tile.appendChild(div("l", slot >= 0 && slot < open ? `枠${slot + 1}` : (has ? `Lv.${growOf(comp.id).lv}` : RAR[comp.rar].stars)));
      tile.addEventListener("click", (e) => { e.stopPropagation(); showDex(comp.id); });
      grid.appendChild(tile);
    });
    box.appendChild(grid);

    const has = !!c.owned[sel.id], R = RAR[sel.rar];
    box.appendChild(div("comp-name", has ? sel.name : "？？？"));
    box.appendChild(div("comp-stars", R.stars + " " + R.label));
    if (has && sel.group) box.appendChild(div("comp-line", `📚 ${groupName(sel.group)}の問題に正解すると、経験値が${SUBJECT_BONUS}倍`));
    if (has) {
      const g = growOf(sel.id), i = stageIndex(g.lv);
      box.appendChild(div("comp-line", `${nameOf(sel, i)}　Lv.${g.lv}${g.lv >= MAX_LV ? " ★極め" : ""}　持っている数 ${c.owned[sel.id]}`));
      if (g.lv < MAX_LV) box.appendChild(barOf(g.xp / need(sel, g.lv)));
      for (let k = 0; k < open; k++) {
        if (c.team[k] === sel.id) {
          box.appendChild(div("comp-new", `✔ 枠${k + 1}にいます（経験値${Math.round(SLOT_RATE[k] * 100)}％）`));
          if (k > 0) box.appendChild(button("comp-sub", `枠${k + 1}から外す`, () => { c.team[k] = null; persist(); refresh(); showDex(sel.id); }));
        } else {
          box.appendChild(button("comp-sub", `枠${k + 1}に入れる（経験値${Math.round(SLOT_RATE[k] * 100)}％）`, () => {
            if (setSlot(k, sel.id)) { refresh(); toast(`${sel.name} を枠${k + 1}に入れました`); showDex(sel.id); }
          }));
        }
      }
      if (open < 3) box.appendChild(div("comp-line", `枠${open + 1}は、自分がLv.${SLOT_LV[open]}で解放されます`));
    } else if (sel.subject) {
      box.appendChild(div("comp-line", `${groupName(sel.group)}の問題に ${SUBJECT_UNLOCK}問 正解すると、仲間になります（いま ${Math.min(SUBJECT_UNLOCK, groupCorrect(sel.group))}/${SUBJECT_UNLOCK}）`));
      box.appendChild(barOf(groupCorrect(sel.group) / SUBJECT_UNLOCK));
    } else {
      box.appendChild(div("comp-line", `まだ持っていません　交換：💎${R.price}（いま ${c.shards}）`));
      const ex = button("comp-sub", `💎${R.price} で交換する`, () => {
        if (c.shards < R.price) { toast("かけらが足りません"); return; }
        c.shards -= R.price; gain(c, sel.id); persist(); refresh();
        fire(80, [523, 659, 784, 1047]); toast(`🎉 ${sel.name} を手に入れた！`); showDex(sel.id);
      });
      if (c.shards < R.price) ex.disabled = true;
      box.appendChild(ex);
    }
    box.appendChild(div("comp-line", `💎 かけら ${c.shards}　／　宝箱 ${c.pending}個`));
    box.appendChild(div("comp-line", `出る割合：${RAR_ORDER.map((k) => `${RAR[k].label} ${RAR[k].w}％`).join("　")}`));
    box.appendChild(div("comp-line", `レア以上は、最大あと${Math.max(1, PITY_R - c.pityR)}回、スーパーレア以上は、最大あと${Math.max(1, PITY_SR - c.pitySR)}回で出ます`));
    box.appendChild(button("comp-sub", "← 相棒メニューにもどる", () => showPanel(false)));
    box.appendChild(button("comp-close", "とじる", closeOverlay));
  }

  // ---------- 画面を最新にする（updateHud のたびに呼ばれる） ----------
  let welcomed = false;      // はじめての宝箱のお知らせを、出したか
  function refresh() {
    const c = C(), comp = mainComp(), g = growOf(comp.id);
    const lv = state.level, i = stageIndex(g.lv), form = formOf(comp, i);
    btn.textContent = form;
    btn.className = "comp-btn rar-" + comp.rar + (isLong(form) ? " sm" : "");
    btn.title = `${nameOf(comp, i)} Lv.${g.lv}（タップで見る）`;

    // 自分の経験値バーの文字（あと少し）
    const ratio = Math.min(1, state.xp / xpNeeded());
    const near = ratio >= NEAR_RATIO;
    label.textContent = (near ? "🔥あと少し！" : `あと約${questionsLeft()}問`) + (boostOn() ? " ⚡2倍" : "");
    label.className = "comp-xp-label" + (near ? " near" : "");
    if (xpFill) xpFill.classList.toggle("comp-near", near);

    // はじめての宝箱（1回だけ）
    let gifted = false;
    if (!c.gift) { c.gift = 1; c.pending += 1; gifted = true; }
    chestBtn.textContent = `🎁 宝箱 ×${c.pending}`;
    chestBtn.style.display = c.pending > 0 ? "block" : "none";

    checkEvolutions();                                            // 進化していたら、演出を出す
    checkSubjectUnlocks();                                        // 教科の相棒が仲間になったか調べる
    if (!c.intro) {                                               // はじめて：相棒の紹介を出す
      c.intro = 1;
      persist();
      setTimeout(() => whenFree(() => showPanel(true, true)), 900);
      welcomed = true;
    }
    if (gifted) {
      persist();
      if (!welcomed) setTimeout(() => { try { toast("🎁 宝箱をプレゼント！ 左下から開けてね"); } catch (e) { /* 無視 */ } }, 1200);
      welcomed = true;
    }
  }

  // ---------- スタートメニュー：ボタンに色をつけて、いちばん下に「相棒」を足す ----------
  // 色の変え方：[ボタンの名前に入っている言葉, 背景の色, 文字の色]
  const MENU_COLORS = [
    ["つづきから",   "#3ddc84", "#0d2a1a"],
    ["教科をえらぶ", "#6ea8ff", "#0d1f40"],
    ["ボス戦",       "#ff5470", "#ffffff"],
    ["昨日のテスト", "#b78bff", "#22104a"],
    ["バッジ",       "#ff9a3d", "#3a1f05"],
    ["統計",         "#2fc4c4", "#05302f"],
    ["ランキング",   "#ffcf3f", "#1a1033"],
    ["間違いの復習", "#ff7ad9", "#3f0f33"]
  ];
  function addMenuButton() {
    const box = menu.firstChild;
    if (!box) return;
    // ボタンに色をつける（押せないボタンは、script.js の暗い色のまま）
    Array.from(box.querySelectorAll("button.mn-btn")).forEach((b) => {
      if (b.disabled) return;
      const text = (b.firstChild && b.firstChild.textContent) || "";
      const hit = MENU_COLORS.find((m) => text.indexOf(m[0]) >= 0);
      if (hit) { b.style.background = hit[1]; b.style.color = hit[2]; }
    });
    // いちばん下の行に、2列ぶんの横長で「相棒」を置く（文字は真ん中）
    const c = C(), comp = mainComp(), g = growOf(comp.id);
    const b = menuBtn(`${formOf(comp, stageIndex(g.lv))} 相棒`,
      `${comp.name} Lv.${g.lv}　🎁${c.pending}`, () => showPanel(false));
    b.style.textAlign = "center";
    b.style.background = "linear-gradient(90deg, #ff7ad9, #b78bff, #6ea8ff)";
    b.style.color = "#1a1033";
    box.appendChild(b);
    fitMenu(box);
  }

  // ---------- script.js の関数を、大きくする ----------
  const baseGainXp = gainXp;                       // 経験値：2倍券と、相棒への配分
  gainXp = function (amount) {
    const a = boostOn() ? amount * 2 : amount;
    baseGainXp(a);
    addXpToTeam(a);
  };
  const baseUpdateHud = updateHud;
  updateHud = function () {
    baseUpdateHud();
    try { refresh(); } catch (e) { /* 相棒でエラーが出ても、ゲームは続ける */ }
  };
  const baseRecordStats = recordStats;             // どの教科の問題に答えたかを覚えておく
  recordStats = function (q, ok) {
    baseRecordStats(q, ok);
    try { lastGroup = groupOfGenre(genreOf(q)); } catch (e) { lastGroup = null; }
  };
  window.getCompanionLabel = function () {         // ランキングなどで、相棒と称号を出したいときに使える
    const comp = mainComp(), g = growOf(comp.id), tt = titleById(C().title);
    return { emoji: formOf(comp, stageIndex(g.lv)), name: comp.name, level: g.lv, title: tt ? tt.name : "" };
  };
  const baseRenderMenu = renderMenu;
  renderMenu = function (view) {
    baseRenderMenu(view);
    try { if (!view || view === "main") addMenuButton(); } catch (e) { /* 無視 */ }
  };
  const baseAchieveGoal = achieveGoal;             // 今日の目標を達成 → 宝箱
  achieveGoal = function () {
    const before = state.lastGoalDate;
    baseAchieveGoal();
    if (before !== state.lastGoalDate && state.lastGoalDate === todayStr()) {
      const c = C();
      c.pending += CHEST_DAILY;
      persist();
      refresh();
      setTimeout(() => { try { toast(`🎁 今日の目標達成！ 宝箱 +${CHEST_DAILY}`); } catch (e) { /* 無視 */ } }, 2800);
    }
  };
  const baseQuestBoss = questOnBossDefeated;       // ボスを倒した → 週間クエスト達成で宝箱／ときどき宝箱が落ちる
  questOnBossDefeated = function () {
    let msg = baseQuestBoss();
    const c = C();
    let add = 0, text = "";
    if (msg) { add += CHEST_WEEKLY; text += `　🎁 宝箱 +${CHEST_WEEKLY}`; }
    if (Math.random() < CHEST_BOSS_CHANCE) { add += 1; text += "　🎁 ボスが宝箱を落とした！"; }
    if (add > 0) { c.pending += add; persist(); refresh(); msg = (msg || "") + text; }
    return msg;
  };
  // クラウドから読み込んだとき：相棒のデータは、持っている数が多いほうを使う
  if (window.gameApi && typeof window.gameApi.applySave === "function") {
    const baseApply = window.gameApi.applySave;
    window.gameApi.applySave = function (s) {
      const keep = C();
      baseApply(s);
      if (s && s.comp && typeof s.comp === "object") {
        const cloud = cleanComp(s.comp);
        state.comp = (ownedCount(cloud) >= ownedCount(keep)) ? cloud : keep;
      } else state.comp = keep;
      try { refresh(); } catch (e) { /* 無視 */ }
    };
  }
  state.comp = cleanComp(state.comp);              // 起動したときに、保存データを一度きれいにする
  try { refresh(); } catch (e) { /* 無視 */ }      // 起動した直後の1回
  try { if (menuOpen && lastMenuView === "main") renderMenu("main"); } catch (e) { /* 起動時に出ているスタートメニューにも、相棒のボタンを足す */ }
})();
