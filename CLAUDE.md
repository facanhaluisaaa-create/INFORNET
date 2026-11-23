# Projeto Infornet — Contexto

Projeto da Saint Paul Junior (SPJr) para a Infornet, provedor de internet por fibra óptica.
Escopo atual: treinamento comercial de vendas e retenção. Propostas futuras, fora do escopo atual: gamificação dos atendentes e agente de IA de apoio contínuo.

Escreva sempre em português. O nome correto da empresa é **Infornet** (não "Infonet").

## Pessoas

- **Infornet:** Oscar (gestor e decisor; cuida de custos, risco trabalhista e do Instagram), Rafael (liderança operacional e atendimento; braço direito do Oscar; visão técnica), Randolfo (operação e supervisão; negociação de cancelamentos; testa o Claude para triagem de atendimento), Dilmara (ex-atendente, hoje vende porta a porta; vai validar a turma piloto).
- **SPJr:** Victor Fascina e Cássio Damasceno (comercial; Cássio conduz a apresentação), Luísa (atas, Departamento de Mercado e Projetos), Marcela (frente de marketing). Orientação metodológica: Prof. Éric Nibo.

## Operação da Infornet

- 5 unidades no Piauí: Campo Maior (matriz), Piripiri, Capitão de Campos, Cocal de Telha e Pedro II (loja física ainda vai abrir).
- Cerca de 8 atendentes (4 em Campo Maior, 1 em Capitão de Campos, 1 em Cocal de Telha; demais não detalhados). Eles mesmos vendem, na loja e no WhatsApp.
- Uma única pessoa cuida de retenção e cancelamento nas 5 unidades.
- Sem time de vendas externo (porta a porta); é difícil contratar gente capacitada na região.
- Sistemas: **ChatMix** (atendimento via WhatsApp; guarda as conversas e permite auditoria; tem IA opcional, com custo extra) e **SGP** (gestão do provedor; atendentes registram anotações, como o motivo do cancelamento).
- Não há meta, indicador individual nem bonificação para os atendentes.

## Comercial e retenção

- O cliente normalmente chega decidido; raramente sai da loja sem fechar. **A dor é retenção, não captação.**
- Estimativa do Oscar: cerca de 30 clientes entram e 30 saem por mês (não confirmada pelo Rafael).
- Principal motivo de saída: financeiro. O cliente atrasa, é bloqueado e contrata outro provedor em vez de negociar; a maioria só para de pagar. A Infornet recolhe o equipamento e negativa no SPC/Serasa. Também há mudança de cidade. Segundo o Rafael, as saídas não vêm de falha no serviço.
- Quem sai em dia costuma voltar em até cerca de 2 meses.
- Concorrência: a Brisanet é fraca na região; a objeção que pesa é o preço (desconto nos 3 ou 4 primeiros meses, cerca de R$ 30 a menos por mês). Há concorrentes regionais mais fortes (não nomeados).
- Diferenciais: atendimento local, rápido e pessoal; chamado resolvido em cerca de 2 horas; mesmo sinal em todos os bairros; rede com capacidade sobrando.
- Alçada do atendente: desconto sem aprovação de 10% até 50% (escalonado: 10, 15, 20, 30, 50); depois, troca do Wi-Fi 6 por Wi-Fi 7 bonificado. Mensalidade grátis não é oferecida. Contrato de 12 meses com multa. O limite de 50% ainda precisa ser formalizado por escrito.
- Problema citado: visitas técnicas enviadas para casos que poderiam ser resolvidos a distância.

## Treinamento (validado em 19/11/2026)

- Online, 2 turmas de 4 atendentes, cerca de 2 horas cada.
- 4 módulos: (1) conhecimento do serviço e diferenciais; (2) comunicação e atendimento consultivo; (3) negociação, objeções e retenção; (4) simulações práticas com IA.
- Métodos: SPIN Selling, BANT e um Playbook de Objeções.
- Simulações com IA em 4 perfis: novo interessado, comparação de preço, cliente insatisfeito, pedido de cancelamento.
- Foco 100% na equipe interna; o porta a porta fica para depois, se houver contratação.

## Gamificação (proposta futura)

- Oscar e Randolfo alertaram para o risco trabalhista: bonificação habitual pode ser incorporada ao salário (13º, férias, FGTS, INSS, retroativo de até 5 anos).
- Alinhado: substituir a bonificação direta por pontos (XP) e premiação pontual aos melhores do mês. A segurança jurídica do modelo ainda precisa ser verificada.
- Oscar: a bonificação deve premiar o extraordinário, não o básico.

## Agente de IA de apoio (proposta futura)

- Objetivo: apoiar os atendentes em dúvidas e avaliar os atendimentos com critérios definidos pela Infornet (supervisão).
- Oscar pediu que o escopo e a precificação venham no relatório de entrega.
- Referência de custo: o Randolfo testa o Claude para triagem a custo baixo; a IA do ChatMix aumentaria o custo atual.

## Simulador de atendimento (pasta `simulador/`)

- Site para a etapa prática (módulo 4), feito para publicar na Vercel com Root Directory `simulador`. Instruções em `simulador/README.md`.
- 4 perfis × 4 clientes cada (`lib/dados.js`) e 6 temperamentos sorteados (tranquilo a muito difícil); dentro de um treino, cliente e temperamento não se repetem.
- O servidor (`api/`) chama a API do Claude (`lib/claude.js`) e guarda cada avaliação no Upstash Redis; o instrutor vê tudo em `/resultados.html` com senha.
- Duração média do treino: cerca de 25 minutos por pessoa (uns 6 por cliente). Há cronômetro, aviso aos 7 minutos por cliente, limite de 14 mensagens do atendente e avaliação em segundo plano.
- Variáveis na Vercel: `ANTHROPIC_API_KEY`, `CODIGO_TURMA`, `SENHA_INSTRUTOR` e as do Upstash Redis.
- A logo oficial da Infornet ainda não foi recebida; a encontrada na internet não foi confirmada e foi retirada.
- Os clientes simulados não citam preços porque a tabela de planos ainda não chegou (pedido em `docs/pedido-informacoes-simulador.md`).

## Pendências

- Infornet: composição das turmas e datas; limite de desconto por escrito; lista de informações técnicas básicas; adesão dos atendentes aos vídeos do Instagram (cerca de 4 por mês); relatório de clientes por cidade; tabela de planos e preços; números mensais de vendas e cancelamentos; contatos das atendentes de Campo Maior e Piripiri.
- SPJr: finalizar o material dos 4 módulos; enviar o questionário de pendências; escopo preliminar do agente de IA; critérios da gamificação; estimativa de retorno da gamificação e do agente (aguardando os indicadores pedidos ao Oscar).

## Fontes

- Roteiro de reunião com o Rafael (05/11/2026)
- Call com o Rafael: respostas e próximos passos (05/11/2026)
- Ata da reunião de alinhamento (19/11/2026)
- Transcrição da reunião de alinhamento do treinamento (19/11/2026)
