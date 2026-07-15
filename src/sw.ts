/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute, setCatchHandler } from "workbox-routing";
import { NetworkFirst, CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { clientsClaim } from "workbox-core";

declare let self: ServiceWorkerGlobalScope;

// Auto-update: 立即激活新版本 Service Worker
self.skipWaiting();
clientsClaim();

// 清理旧版本的 precache 缓存，避免部署新版本后旧文件名找不到
cleanupOutdatedCaches();

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({
    cacheName: "pages-cache",
    networkTimeoutSeconds: 3,
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 5 * 60 })],
  })
);

registerRoute(
  ({ request }) => {
    const isAudioDestination = request.destination === "audio";
    const hasAudioExt = /\.(mp3|m4a|ogg|wav|flac|aac|mpe?g)(\?|$)/i.test(
      request.url
    );

    if (isAudioDestination || hasAudioExt) return true;

    const secFetchDest = request.headers.get("Sec-Fetch-Dest");
    if (secFetchDest === "empty") return false;
    if (!secFetchDest && request.destination === "") return false;

    return false;
  },
  new CacheFirst({
    cacheName: "audio-stream-cache",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 300,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200, 206],
      }),
      {
        cacheWillUpdate: async ({ response }) => {
          if (
            response.status === 0 ||
            response.status === 200 ||
            response.status === 206
          ) {
            return response;
          }
          return null;
        },
      },
    ],
    // ! 严禁使用 ignoreSearch， 避免B站音源缓存失效
  })
);

// 兜底：所有未匹配的请求回退到网络，防止 precache 中缺失的文件返回空响应
setCatchHandler(async ({ event }) => {
  if (event instanceof FetchEvent) {
    const { request } = event;
    // 导航请求回退到 index.html
    if (request.mode === "navigate") {
      return (
        (await caches.match(new Request("/index.html"))) ??
        new Response("Offline", { status: 503 })
      );
    }
    // 非导航请求走网络，但检测 SPA fallback 返回 HTML 的情况
    const response = await fetch(request);
    const contentType = response.headers.get("content-type") || "";
    // 如果请求的是 JS/CSS 资源但服务器返回了 HTML（_redirects catch-all 导致），
    // 说明文件不存在，返回 404 而非把 HTML 当资源返回
    if (
      response.ok &&
      contentType.includes("text/html") &&
      !request.url.endsWith(".html") &&
      !request.url.endsWith("/")
    ) {
      return new Response(`Asset not found: ${request.url}`, {
        status: 404,
        statusText: "Not Found",
      });
    }
    return response;
  }
  return new Response("Service Unavailable", { status: 503 });
});
