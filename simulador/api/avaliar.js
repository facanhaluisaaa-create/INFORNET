// POST /api/avaliar: avalia o atendimento e já guarda o resultado para o instrutor.
import { randomUUID } from "node:crypto";
import { PERSONAS, TEMPERAMENTOS, PERFIS } from "../lib/dados.js";
import { responder, lerCorpo, codigoTurmaValido, validarMensagens } from "../lib/http.js";
import { avaliarAtendimento, ErroClaude } from "../lib/claude.js";
import { salvarResultado, bancoConfigurado } from "../lib/armazenamento.js";


export default async function handler(req, res) {
  if (req.method !== "POST") return responder(res, 405, { erro: "Use POST." });
  let corpo;
  try { corpo = await lerCorpo(req); } catch { return responder(res, 400, { erro: "Pedido inválido." }); }

  if (!codigoTurmaValido(corpo.codigo)) return responder(res, 401, { erro: "Código da turma incorreto." });
  const persona = PERSONAS.find((p) => p.id === corpo.personaId);
  const temperamento = TEMPERAMENTOS[corpo.temperamentoId];
  const msgs = validarMensagens(corpo.msgs);
  if (!persona || !temperamento || !msgs) return responder(res, 400, { erro: "Conversa inválida. Recarregue a página." });

  let avaliacao;
  try {
    avaliacao = await avaliarAtendimento(persona, temperamento, msgs);
  } catch (e) {
    const status = e instanceof ErroClaude && e.codigo === "limite" ? 429 : 502;
    console.error("avaliar:", e.codigo || "", e.message);
    return responder(res, status, { erro: e.message });
  }

  const registro = {
    id: randomUUID(),
    data: new Date().toISOString(),
    nome: String(corpo.nome || "").trim().slice(0, 80) || "Sem nome",
    sessaoId: String(corpo.sessaoId || "").slice(0, 64),
    modo: String(corpo.modo || "").slice(0, 20),
    perfil: persona.perfil,
    perfilRotulo: PERFIS[persona.perfil].rotulo,
    cliente: persona.nome + " (" + persona.cidade + ")",
    temperamento: temperamento.rotulo,
    nivel: temperamento.nivel,
    ...avaliacao,
    conversa: msgs,
  };

  let salvo = false;
  try {
    await salvarResultado(registro);
    salvo = bancoConfigurado;
  } catch (e) {
    console.error("salvar:", e.message);
  }
  responder(res, 200, { avaliacao, salvo });
}
