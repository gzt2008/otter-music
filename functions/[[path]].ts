import { app } from "./app";
import { handle } from "hono/cloudflare-pages";

const handler = handle(app);

// 资源文件扩展名
const ASSET_EXT_RE =
  /\.(js|mjs|css|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|map|wasm)(\?|$)/i;

export const onRequest: PagesFunction = async (ctx) => {
  const res = await handler(ctx);

  // 只有 Hono 默认的"路由未命中 404"才回退给 Pages（避免Hono接管所有路径导致网站 404）
  if (
    res.status === 404 &&
    !res.headers.get("content-type")?.includes("application/json")
  ) {
    // 先让 Pages 尝试匹配静态文件（sw.js 等真实存在的文件）
    const nextRes = await ctx.next();
    const nextCT = nextRes.headers.get("content-type") || "";

    // 如果 Pages 找到了静态文件（200 且非 HTML），直接返回
    if (nextRes.status === 200 && !nextCT.includes("text/html")) {
      return nextRes;
    }

    // 如果 Pages 返回了 HTML（SPA fallback），而请求的是资源文件，
    // 说明文件确实不存在，返回 404 避免 MIME 类型错误
    const pathname = new URL(ctx.request.url).pathname;
    if (nextCT.includes("text/html") && ASSET_EXT_RE.test(pathname)) {
      return new Response("Not Found", {
        status: 404,
        statusText: "Not Found",
      });
    }

    // 其他情况（SPA 路由等）返回 Pages 的响应
    return nextRes;
  }

  return res;
};
