// Servidor local para testar o simulador sem a Vercel: node dev-server.js
// Precisa de ANTHROPIC_API_KEY no ambiente. Abre em http://localhost:3000
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.dirname(fileURLToPath(import.meta.url));
const tipos = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml" };
const PORTA = Number(process.env.PORT || 3000);

http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  try {
    if (pathname.startsWith("/api/")) {
      const nome = pathname.slice(5).replace(/[^a-z]/g, "");
      const mod = await import(path.join(raiz, "api", nome + ".js"));
      return await mod.default(req, res);
    }
    if (pathname === "/resultados") { res.writeHead(307, { Location: "/instrutor" }); return res.end(); }
    // Igual à Vercel com cleanUrls: /instrutor abre instrutor.html
    const nomeArquivo = pathname === "/" ? "index.html" : path.extname(pathname) ? pathname : pathname + ".html";
    const arquivo = path.join(raiz, nomeArquivo);
    if (!arquivo.startsWith(raiz) || /^(node_modules|lib|api)$/.test(path.relative(raiz, arquivo).split(path.sep)[0])) throw new Error("fora");
    const dados = await readFile(arquivo);
    res.writeHead(200, { "Content-Type": tipos[path.extname(arquivo)] || "application/octet-stream" });
    res.end(dados);
  } catch (e) {
    if (!res.headersSent) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); res.end("Não encontrado"); }
  }
}).listen(PORTA, () => console.log("Simulador em http://localhost:" + PORTA));
