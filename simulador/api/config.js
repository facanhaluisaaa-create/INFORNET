// GET /api/config: o que a página precisa para montar o treino, sem os segredos dos clientes.
import { PERFIS, ORDEM, TEMPERAMENTOS, MODOS, PERSONAS } from "../lib/dados.js";
import { responder, exigeCodigoTurma, codigoTurmaValido } from "../lib/http.js";
import { bancoConfigurado } from "../lib/armazenamento.js";

export default function handler(req, res) {
  // ?codigo=... confere o código da turma antes de começar o treino.
  const codigo = new URL(req.url, "http://localhost").searchParams.get("codigo");
  responder(res, 200, {
    exigeCodigo: exigeCodigoTurma(),
    codigoValido: codigoTurmaValido(codigo),
    bancoConfigurado,
    perfis: PERFIS,
    ordem: ORDEM,
    modos: MODOS,
    temperamentos: Object.fromEntries(
      Object.entries(TEMPERAMENTOS).map(([k, t]) => [k, { rotulo: t.rotulo, nivel: t.nivel }])
    ),
    personas: PERSONAS.map((p) => ({ id: p.id, perfil: p.perfil, nome: p.nome, cidade: p.cidade, abertura: p.abertura })),
  });
}
