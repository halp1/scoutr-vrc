const PORT = Number(process.env.PORT ?? 8080);
const DIST = import.meta.dir + "/dist";

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const file = Bun.file(DIST + url.pathname);
    if (await file.exists()) return new Response(file);
    return new Response(Bun.file(DIST + "/index.html"));
  },
});

console.log(`Serving dist on http://localhost:${PORT}`);
