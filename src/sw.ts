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
    // 其他请求直接走网络
    return fetch(request);
  }
  return new Response("Service Unavailable", { status: 503 });
});
