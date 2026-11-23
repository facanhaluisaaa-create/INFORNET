// POST /api/cliente: devolve a próxima mensagem do cliente simulado.
import { PERSONAS, TEMPERAMENTOS } from "../lib/dados.js";
import { responder, lerCorpo, codigoTurmaValido, validarMensagens } from "../lib/http.js";
import { responderComoCliente, ErroClaude } from "../lib/claude.js";


export default async function handler(req, res) {
  if (req.method !== "POST") return responder(res, 405, { erro: "Use POST." });
  let corpo;
  try { corpo = await lerCorpo(req); } catch { return responder(res, 400, { erro: "Pedido inválido." }); }

  if (!codigoTurmaValido(corpo.codigo)) return responder(res, 401, { erro: "Código da turma incorreto." });
  const persona = PERSONAS.find((p) => p.id === corpo.personaId);
  const temperamento = TEMPERAMENTOS[corpo.temperamentoId];
  const msgs = validarMensagens(corpo.msgs);
  if (!persona || !temperamento || !msgs) return responder(res, 400, { erro: "Conversa inválida. Recarregue a página." });
  if (msgs[msgs.length - 1].de !== "atendente") return responder(res, 400, { erro: "Falta a mensagem do atendente." });

  try {
    const texto = await responderComoCliente(persona, temperamento, msgs);
    responder(res, 200, { texto });
  } catch (e) {
    const status = e instanceof ErroClaude && e.codigo === "limite" ? 429 : 502;
    console.error("cliente:", e.codigo || "", e.message);
    responder(res, status, { erro: e.message });
  }
}
