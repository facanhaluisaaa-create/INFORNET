// Utilidades das rotas /api: leitura do corpo, respostas e códigos de acesso.

export function responder(res, status, dados) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(dados));
}

export async function lerCorpo(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  let bruto = "";
  for await (const parte of req) {
    bruto += parte;
    if (bruto.length > 200000) throw new Error("corpo grande demais");
  }
  return bruto ? JSON.parse(bruto) : {};
}

function igual(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

// Código da turma: os atendentes digitam ao começar. Sem CODIGO_TURMA definido, o acesso fica livre.
export function codigoTurmaValido(codigo) {
  const esperado = process.env.CODIGO_TURMA;
  return !esperado || igual(codigo, esperado);
}
export const exigeCodigoTurma = () => Boolean(process.env.CODIGO_TURMA);

// Senha do instrutor para ver os resultados. Sem SENHA_INSTRUTOR, a área de resultados fica fechada.
export function senhaInstrutorValida(senha) {
  const esperado = process.env.SENHA_INSTRUTOR;
  return Boolean(esperado) && String(senha || "") === esperado;
}

// Confere a conversa enviada pela página antes de repassar ao Claude.
export function validarMensagens(msgs) {
  if (!Array.isArray(msgs) || msgs.length < 1 || msgs.length > 80) return null;
  const limpas = [];
  for (const m of msgs) {
    if (!m || (m.de !== "atendente" && m.de !== "cliente")) return null;
    const t = String(m.t || "").trim().slice(0, 2000);
    if (!t) return null;
    limpas.push({ de: m.de, t });
  }
  if (limpas[0].de !== "cliente") return null;
  return limpas;
}
