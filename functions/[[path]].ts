import { app } from "./app";
import { handle } from "hono/cloudflare-pages";

const handler = handle(app);

// 资源文件扩展名，匹配到说明请求的是静态资源而非 SPA 路由
const ASSET_EXT_RE =
  /\.(js|mjs|css|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|map|wasm)(\?|$)/i;

export const onRequest: PagesFunction = async (ctx) => {
  const res = await handler(ctx);

  // 只有 Hono 默认的"路由未命中 404"才回退给 Pages（避免Hono接管所有路径导致网站 404）
  if (
    res.status === 404 &&
    !res.headers.get("content-type")?.includes("application/json")
  ) {
    // 资源文件请求：直接返回 404，避免 SPA fallback 把 index.html 当资源返回导致 MIME 错误
    const pathname = new URL(ctx.request.url).pathname;
    if (ASSET_EXT_RE.test(pathname)) {
      return new Response("Not Found", { status: 404 });
    }
    // SPA 路由请求：返回 index.html 支持客户端路由
    return ctx.next();
  }

  return res;
};
