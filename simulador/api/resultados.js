// POST /api/resultados: lista (ou apaga) os resultados. Exige a senha do instrutor.
import { responder, lerCorpo, senhaInstrutorValida } from "../lib/http.js";
import { listarResultados, apagarResultado, bancoConfigurado } from "../lib/armazenamento.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return responder(res, 405, { erro: "Use POST." });
  let corpo;
  try { corpo = await lerCorpo(req); } catch { return responder(res, 400, { erro: "Pedido inválido." }); }

  if (!process.env.SENHA_INSTRUTOR) return responder(res, 503, { erro: "A área do instrutor ainda não foi ativada. Defina SENHA_INSTRUTOR na Vercel." });
  if (!senhaInstrutorValida(corpo.senha)) return responder(res, 401, { erro: "Senha incorreta." });

  try {
    if (corpo.apagar) await apagarResultado(String(corpo.apagar));
    const resultados = await listarResultados();
    responder(res, 200, { resultados, bancoConfigurado });
  } catch (e) {
    console.error("resultados:", e.message);
    responder(res, 502, { erro: "Não foi possível ler os resultados agora. Tente de novo." });
  }
}
