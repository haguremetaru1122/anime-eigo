// アニメ英語ノート：オフライン用
// 版が変わると新しい一式を取り込み、画面に「新しい話が届きました」を出す
const VERSION = "fabeaba1695c";
const CORE = ["./", "index.html", "manifest.webmanifest", "config.json", "data.bin", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
const CORE_CACHE = "core-" + VERSION;
const FONT_CACHE = "fonts";

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CORE_CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: "reload" })))));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("core-") && k !== CORE_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", e => { if (e.data === "skip") self.skipWaiting(); });

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 文字（Googleフォント）：あれば使い、裏で新しくする
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(FONT_CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;

  // 画面・データ：取り込んだものを使う（電波がなくても開ける）
  e.respondWith(caches.open(CORE_CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true }) || (req.mode === "navigate" ? await c.match("index.html") : null);
    return hit || fetch(req);
  }));
});
