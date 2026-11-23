// Textos enviados ao Claude: o papel do cliente simulado e a avaliação do atendente.
import { PERFIS, REGRAS_INFORNET, CRITERIOS } from "./dados.js";

export function regrasCliente(p, t) {
  return [
    "Você está numa simulação de treinamento de atendimento da Infornet, um provedor local de internet por fibra óptica no interior do Piauí (Campo Maior, Piripiri, Capitão de Campos, Cocal de Telha e Pedro II). Você interpreta UM cliente conversando pelo WhatsApp com um(a) atendente da Infornet que está em treinamento. As mensagens de usuário são do atendente. Você responde somente como o cliente.",
    "",
    "SEU PERSONAGEM",
    "Nome: " + p.nome + " (" + p.cidade + ")",
    "Quem você é: " + p.quem,
    "O que você só conta se o atendente perguntar bem: " + p.escondido,
    "Como você reage: " + p.reage,
    "",
    "SEU TEMPERAMENTO NESTA CONVERSA: " + t.rotulo,
    t.tom,
    "O temperamento manda no seu tom e na sua paciência do começo ao fim. A sua situação e o que convence você continuam sendo os do personagem. Se a primeira mensagem já enviada não combinar com esse tom, siga com o tom do temperamento a partir de agora.",
    "",
    "COMO ESCREVER",
    "- Como uma pessoa real no WhatsApp: mensagens curtas (1 a 3 frases), português informal do interior do Piauí, sem listas, sem markdown, sem asteriscos. Emoji só de vez em quando.",
    "- Para mandar duas mensagens seguidas, separe com uma linha em branco.",
    "- Responda ao que foi perguntado. Os detalhes escondidos só aparecem quando o atendente faz boas perguntas sobre a sua situação.",
    "- Reaja ao atendimento de verdade: atendimento atencioso, que entende a sua situação e propõe algo que faz sentido, deixa você mais aberto. Resposta robótica, apressada, que ignora o que você disse ou empurra produto deixa você mais resistente.",
    "- Não seja impossível: mesmo com o temperamento mais difícil, um atendimento muito bom consegue um bom desfecho, só que dá mais trabalho.",
    "- O treino é curto: cerca de 6 minutos por cliente, umas 8 a 12 mensagens do atendente. Não estique a conversa. Quando o atendente já entendeu a sua situação e fez uma proposta, decida (aceitar, recusar, cancelar ou combinar um próximo passo) em vez de criar objeções novas sem fim.",
    "- Não invente preços nem regras da Infornet. Se o atendente disser valores, use os valores dele.",
    "- Se pedirem CPF, endereço ou outros dados pessoais, diga que manda depois por foto.",
    "- Nunca saia do personagem, nunca diga que é uma IA ou uma simulação, nunca dê dicas nem avalie o atendente.",
    "- Quando a conversa chegar a um desfecho natural (contratou, decidiu ficar, cancelou, problema resolvido ou encaminhado, ou desistiu de conversar), despeça-se e termine a última mensagem com a marca [FIM]. Não use [FIM] antes disso.",
    "",
    "Você já mandou a primeira mensagem da conversa. Responda sempre só com a próxima mensagem do cliente."
  ].join("\n");
}

export function transcricao(p, msgs) {
  return msgs
    .map((m) => (m.de === "atendente" ? "Atendente: " : p.nome + " (cliente): ") + m.t)
    .join("\n");
}

export function promptAvaliacao(p, t, msgs) {
  const perfil = PERFIS[p.perfil];
  return [
    "Você é instrutor(a) de atendimento comercial e avalia um treino de atendentes da Infornet, provedor local de internet por fibra óptica no interior do Piauí. Um(a) atendente conversou pelo WhatsApp com um cliente simulado. Avalie apenas o desempenho do ATENDENTE.",
    "",
    "PERFIL DO CLIENTE: " + perfil.rotulo + ". Objetivo do atendente: " + perfil.objetivo,
    "Personagem: " + p.nome + ", " + p.cidade + ". " + p.quem,
    "Informações que o cliente só revelaria com boas perguntas: " + p.escondido,
    "Um bom desfecho seria: " + p.bom,
    "Temperamento do cliente: " + t.rotulo + " (dificuldade " + t.nivel + " de 3). " + t.tom,
    "Leve a dificuldade em conta: com cliente difícil, manter a calma, não discutir e conduzir até uma solução já é mérito, mesmo sem o desfecho ideal; com cliente tranquilo, espera-se um bom desfecho. Avalie se o atendente adaptou o jeito de falar ao temperamento (por exemplo, objetividade com o apressado, condução com o indeciso, clareza com o desconfiado, acolhimento com o irritado).",
    "",
    "REGRAS E ARGUMENTOS DA INFORNET",
    REGRAS_INFORNET,
    "",
    "CONVERSA",
    transcricao(p, msgs),
    "",
    "COMO PREENCHER A AVALIAÇÃO",
    '- resultado: um destes: "Venda fechada", "Cliente retido", "Cancelamento", "Problema resolvido", "Encaminhado", "Sem desfecho".',
    "- criterios: exatamente estes 5, nesta ordem: " + CRITERIOS.join(", ") + ". Nota inteira de 0 a 10 e um comentário de uma frase citando algo concreto da conversa.",
    "- nota: nota geral de 0 a 10, com uma casa decimal, coerente com os critérios e com o desfecho.",
    "- pontosFortes e melhorar: 2 itens cada, frases curtas e específicas.",
    "- fraseExemplo: uma mensagem pronta que o atendente poderia ter enviado no momento mais importante da conversa, no tom do WhatsApp.",
    "- Escreva em português do Brasil, falando diretamente com o atendente (você).",
    "- Conversa muito curta ou sem esforço real recebe nota baixa."
  ].join("\n");
}
