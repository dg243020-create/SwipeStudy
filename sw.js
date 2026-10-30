"use strict";

// SwipeStudy オフライン用 Service Worker
// 方針：ネットにつながっているときは、いつも最新のファイルを取りにいく（ネット優先）。
//       つながらないときだけ、前に保存したファイルを使う。
// ファイルを大きく変えたときは、下の CACHE_VERSION の数字を 1 つ上げてください。
const CACHE_VERSION = "v3";
const CACHE_NAME = "swipestudy-" + CACHE_VERSION;

// 最初に保存しておくファイル（オフラインでも遊べるようにするため）
const PRECACHE = [
  "./",
  "index.html",
  "style.css",
  "questions.js",
  "script.js",
  "cloud.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => { /* 1つ失敗しても、ゲーム自体は動くので無視 */ })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k.startsWith("swipestudy-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // 自分のサイトのファイルだけ扱う（Firebase や Google ログインの通信には触らない）
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("index.html")))
  );
});
