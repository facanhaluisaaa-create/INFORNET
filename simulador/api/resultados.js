// POST /api/resultados: lista, apaga ou recebe a avaliação final do instrutor. Exige a senha do instrutor.
import { responder, lerCorpo, senhaInstrutorValida } from "../lib/http.js";
import { listarResultados, apagarResultado, atualizarResultado, bancoConfigurado } from "../lib/armazenamento.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return responder(res, 405, { erro: "Use POST." });
  let corpo;
  try { corpo = await lerCorpo(req); } catch { return responder(res, 400, { erro: "Pedido inválido." }); }

  if (!process.env.SENHA_INSTRUTOR) return responder(res, 503, { erro: "A área do instrutor ainda não foi ativada. Defina SENHA_INSTRUTOR na Vercel." });
  if (!senhaInstrutorValida(corpo.senha)) return responder(res, 401, { erro: "Senha incorreta." });

  try {
    if (corpo.apagar) await apagarResultado(String(corpo.apagar));
    if (corpo.avaliacaoInstrutor) {
      const a = corpo.avaliacaoInstrutor;
      const nota = Number(a.nota);
      if (!Number.isFinite(nota) || nota < 0 || nota > 10) return responder(res, 400, { erro: "A nota final deve ser de 0 a 10." });
      const ok = await atualizarResultado(String(a.id), {
        instrutor: {
          nota: Math.round(nota * 10) / 10,
          comentario: String(a.comentario || "").trim().slice(0, 2000),
          avaliador: String(a.avaliador || "").trim().slice(0, 80),
          data: new Date().toISOString(),
        },
      });
      if (!ok) return responder(res, 404, { erro: "Resultado não encontrado. Atualize a página." });
    }
    const resultados = await listarResultados();
    responder(res, 200, { resultados, bancoConfigurado });
  } catch (e) {
    console.error("resultados:", e.message);
    responder(res, 502, { erro: "Não foi possível ler os resultados agora. Tente de novo." });
  }
}
