// ============================================================================
// [음악왕] PWA & PWABuilder Android APK 전용 Service Worker (sw.js)
// - 온라인 상태: 항상 최신 서버 파일을 우선 받아옴 (Network-First) -> 업데이트 즉시 반영
// - 오프라인 상태: 캐시된 앱 셸 폴백 반환 -> PWABuilder 오프라인/설치 조건 100% 통과
// - Supabase / iTunes / 외부 CDN: 실시간 통신 보장을 위해 캐시하지 않고 네트워크 직통
// ============================================================================

const CACHE_NAME = "musicking-pwa-v24.8";
const APP_SHELL_FILES = [
  "./",
  "./index.html",
  "./style.css?v=24.8",
  "./data.js?v=24.8",
  "./pixel_avatar_v3.js?v=24.8",
  "./pixel_avatar.js?v=24.8",
  "./online.js?v=24.8",
  "./fishing.js?v=24.8",
  "./arcade_sfx.js?v=24.8",
  "./arcade_games.js?v=24.8",
  "./arcade.js?v=24.8",
  "./app.js?v=24.8",
  "./manifest.json",
  "./bgm/click.wav",
  "./myad/ad1.png?v=20.0"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(APP_SHELL_FILES).catch(() => {});
    })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 외부 API(Supabase, iTunes, CDN 등)는 캐시 없이 네트워크 직통 처리
  if (url.origin !== self.location.origin) {
    return;
  }

  // 같은 출처의 HTML/내비게이션은 브라우저 HTTP 캐시(max-age)까지 우회해 최신 반영, 정적 리소스는 Network-First
  const isHtmlRequest =
    req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith(".html");
  const networkFetch = isHtmlRequest
    ? fetch(req.url, { cache: "no-cache", credentials: "same-origin" }).then(res =>
        res && res.redirected ? Response.redirect(res.url, 302) : res
      )
    : fetch(req);

  event.respondWith(
    networkFetch
      .then(networkRes => {
        if (networkRes && networkRes.status === 200) {
          const cloned = networkRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, cloned)).catch(() => {});
        }
        return networkRes;
      })
      .catch(async () => {
        const cached = await caches.match(req, { ignoreSearch: true });
        if (cached) return cached;
        if (req.mode === "navigate") {
          return caches.match("./index.html");
        }
        return new Response("Offline", { status: 503, statusText: "Offline" });
      })
  );
});
