// Meting 备用方案:本机常驻 node 微服务。
//
// 当主方案(QQ 音乐 cyapi)拿不到可播直链时,backend `app/services/meting_client.py`
// 通过 httpx 调本服务的 /search-url,走网易源拿真实可播 mp3 直链兜底。
//
// 路由(均返回 JSON,失败也 200+{error},不让进程退出):
//   GET /health                   -> {status:"ok"}
//   GET /search-url?q=<kw>&limit=<n>  -> 遍历网易 search 结果,返回首个 url() 非空曲目:
//     {name, artist, id, url, source:"netease"} 或 {error:"..."}
//
// 端口由 env METING_PORT 控制,默认 9109;仅监听 127.0.0.1(只给同机 backend 调)。
// 仅依赖 @meting/core + node 内置 http;无框架。

import http from "node:http";
import Meting from "@meting/core";

const PORT = parseInt(process.env.METING_PORT || "9109", 10);
const HOST = "127.0.0.1";

/**网易源:遍历搜索结果,返回第一个能拿到可播 url 的曲目。*/
async function searchPlayable(query, limit = 8) {
  const m = new Meting("netease");
  let hits;
  try {
    const raw = await m.format(true).search(query, { limit });
    hits = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (e) {
    throw new Error(`netease search failed: ${String(e).slice(0, 120)}`);
  }
  if (!Array.isArray(hits) || hits.length === 0) {
    throw new Error(`netease search empty for: ${query}`);
  }
  for (const h of hits) {
    const id = h?.id;
    if (!id) continue;
    let urlObj;
    try {
      const u = await m.format(true).url(id, 320);
      urlObj = typeof u === "string" ? JSON.parse(u) : u;
    } catch (e) {
      // 单首失败跳过,继续下一首
      continue;
    }
    const url = Array.isArray(urlObj) ? urlObj[0]?.url : urlObj?.url;
    const name = (Array.isArray(h.name) ? h.name.join(" ") : h.name) || "";
    const artist = Array.isArray(h.artist) ? h.artist.join(", ") : (h.artist || "");
    if (url) {
      return { name, artist, id: String(id), url, source: "netease" };
    }
  }
  throw new Error("no playable url among results");
}

function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  try {
    if (url.pathname === "/health") return send(res, 200, { status: "ok" });
    if (url.pathname === "/search-url") {
      const q = url.searchParams.get("q") || "";
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "8", 10) || 8, 20);
      if (!q) return send(res, 200, { error: "missing q" });
      try {
        const r = await searchPlayable(q, limit);
        return send(res, 200, r);
      } catch (e) {
        return send(res, 200, { error: String(e).slice(0, 200) });
      }
    }
    return send(res, 404, { error: "not found" });
  } catch (e) {
    return send(res, 200, { error: String(e).slice(0, 200) });
  }
});

server.on("error", (e) => console.error("[meting] server error:", e.message));
server.listen(PORT, HOST, () => {
  console.log(`[meting] listening on http://${HOST}:${PORT}`);
});
