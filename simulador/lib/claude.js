// Chamadas à API do Claude. A chave fica na variável de ambiente ANTHROPIC_API_KEY da Vercel.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { CRITERIOS } from "./dados.js";
import { regrasCliente, promptAvaliacao } from "./prompts.js";

const MODELO = "claude-opus-5-5";
const client = new Anthropic();

export class ErroClaude extends Error {
  constructor(codigo, mensagem) {
    super(mensagem);
    this.codigo = codigo;
  }
}

function traduzirErro(e) {
  if (e instanceof ErroClaude) return e;
  if (e instanceof Anthropic.AuthenticationError) return new ErroClaude("chave", "A chave da API do Claude é inválida. Confira a variável ANTHROPIC_API_KEY na Vercel.");
  if (e instanceof Anthropic.RateLimitError) return new ErroClaude("limite", "Muitas mensagens ao mesmo tempo. Espere um minuto e envie de novo.");
  if (e instanceof Anthropic.BadRequestError) return new ErroClaude("pedido", "O Claude recusou o pedido: " + e.message);
  if (e instanceof Anthropic.APIError) return new ErroClaude("api", "O Claude não respondeu agora. Envie de novo em instantes.");
  return new ErroClaude("conexao", "A conexão com o Claude falhou. Envie de novo.");
}

// Próxima mensagem do cliente simulado. msgs começa com a mensagem de abertura do cliente.
export async function responderComoCliente(persona, temperamento, msgs) {
  // A API exige que a conversa comece pelo usuário: abrimos com uma deixa curta antes da mensagem do cliente.
  const messages = [{ role: "user", content: "(O cliente abre a conversa no WhatsApp.)" }].concat(
    msgs.map((m) => ({ role: m.de === "atendente" ? "user" : "assistant", content: m.t }))
  );
  try {
    const resp = await client.beta.messages.create({
      model: MODELO,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      cache_control: { type: "ephemeral" },
      system: regrasCliente(persona, temperamento),
      messages,
    });
    if (resp.stop_reason === "refusal") throw new ErroClaude("recusa", "O cliente não conseguiu responder a essa mensagem. Reescreva e envie de novo.");
    const texto = resp.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    if (!texto) throw new ErroClaude("vazio", "O cliente não respondeu. Envie de novo.");
    return texto;
  } catch (e) {
    throw traduzirErro(e);
  }
}

const Avaliacao = z.object({
  resultado: z.string(),
  nota: z.number(),
  criterios: z.array(z.object({ nome: z.string(), nota: z.number(), comentario: z.string() })),
  pontosFortes: z.array(z.string()),
  melhorar: z.array(z.string()),
  fraseExemplo: z.string(),
});

export async function avaliarAtendimento(persona, temperamento, msgs) {
  try {
    const resp = await client.messages.parse({
      model: MODELO,
      max_tokens: 16000,
      output_config: { effort: "medium", format: zodOutputFormat(Avaliacao) },
      messages: [{ role: "user", content: promptAvaliacao(persona, temperamento, msgs) }],
    });
    if (resp.stop_reason === "refusal") throw new ErroClaude("recusa", "Não foi possível avaliar esta conversa. Tente de novo.");
    if (!resp.parsed_output) throw new ErroClaude("formato", "A avaliação veio num formato inesperado. Tente de novo.");
    return normalizar(resp.parsed_output);
  } catch (e) {
    throw traduzirErro(e);
  }
}

function normalizar(a) {
  const n = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.min(10, Number(v))) : 0);
  return {
    resultado: a.resultado || "Sem desfecho",
    nota: Math.round(n(a.nota) * 10) / 10,
    criterios: CRITERIOS.map((nome, i) => {
      const c = a.criterios.find((x) => x.nome === nome) || a.criterios[i] || {};
      return { nome, nota: Math.round(n(c.nota)), comentario: c.comentario || "" };
    }),
    pontosFortes: a.pontosFortes.slice(0, 3),
    melhorar: a.melhorar.slice(0, 3),
    fraseExemplo: a.fraseExemplo || "",
  };
}
