# Simulador de atendimento Infornet

Site para a etapa prática do treinamento comercial. O atendente coloca o nome, atende 4 clientes simulados pelo WhatsApp (um de cada perfil, com temperamentos sorteados) e recebe uma avaliação. Cada avaliação fica salva para o instrutor.

## Os dois links

| Para quem | Endereço | O que tem |
|---|---|---|
| Atendentes (alunos) | `https://SEU-SITE.vercel.app/` | O teste: nome, código da turma e os 4 clientes |
| Instrutores | `https://SEU-SITE.vercel.app/instrutor` | Com senha: lista de atendentes e, ao clicar em um, o desempenho só dele (média, notas por critério e por perfil, treinos, cada conversa) |

A página dos alunos não tem nenhum link para a área do instrutor. A página de cada atendente tem endereço próprio (`/instrutor?atendente=nome`), que dá para guardar ou mandar para outro instrutor (ele também vai precisar da senha).

## Como funciona

| Parte | Arquivo |
|---|---|
| Página do atendente | `index.html`, `app.js`, `styles.css` |
| Área do instrutor (atendentes, desempenho individual, planilha CSV) | `instrutor.html` |
| Clientes, temperamentos e regras da Infornet | `lib/dados.js` |
| Textos enviados ao Claude (cliente e avaliação) | `lib/prompts.js` |
| Chamadas à API do Claude | `lib/claude.js` |
| Onde os resultados ficam salvos | `lib/armazenamento.js` |
| Rotas do servidor | `api/config.js`, `api/cliente.js`, `api/avaliar.js`, `api/resultados.js` |

Os detalhes escondidos de cada cliente ficam só no servidor: o atendente não consegue vê-los pelo navegador.

## Tempo do treino

O treino foi pensado para cerca de 25 minutos por pessoa (uns 6 minutos por cliente):

- A página mostra um cronômetro do treino e de cada cliente. Passados 7 minutos com o mesmo cliente, aparece um aviso para encaminhar o fechamento.
- O cliente simulado é orientado a decidir em 8 a 12 mensagens do atendente. A partir de 14 mensagens, ele fecha a conversa.
- A avaliação roda em segundo plano: o atendente pode ir para o próximo cliente enquanto ela fica pronta.
- O tempo de cada conversa aparece na área do instrutor e na planilha.

Para mudar esses números, edite `TEMPO_TREINO_MIN`, `TEMPO_CLIENTE_MIN` e `ALERTA_CLIENTE_MIN` em `app.js` e `LIMITE_MENSAGENS_ATENDENTE` em `lib/claude.js`.

## Publicar na Vercel (uma vez só)

1. Crie uma conta em vercel.com entrando com o GitHub.
2. Clique em **Add New → Project** e importe o repositório `INFORNET`.
3. Em **Root Directory**, escolha a pasta `simulador`. Framework: **Other**. Não precisa mudar mais nada.
4. Em **Environment Variables**, adicione:

   | Nome | Valor |
   |---|---|
   | `ANTHROPIC_API_KEY` | A chave da API do Claude (console.anthropic.com → API Keys) |
   | `CODIGO_TURMA` | Um código simples que os atendentes digitam, por exemplo `INFORNET2026` |
   | `SENHA_INSTRUTOR` | A senha para ver os resultados |

5. Clique em **Deploy**. Em cerca de 1 minuto sai o link do site.
6. Banco de dados para guardar os resultados: no projeto, abra **Storage → Create Database → Upstash Redis** (plano gratuito) e conecte ao projeto. Depois clique em **Deployments → ⋯ → Redeploy** para o site passar a usar o banco.

Sem o passo 6, o site funciona, mas os resultados ficam só na memória do servidor e somem quando ele reinicia. A área do instrutor avisa quando o banco não está ligado.

## Atualizar

Cada alteração enviada para a branch que a Vercel acompanha publica uma nova versão sozinha. Para mudar clientes, temperamentos ou regras, edite `lib/dados.js`.

## Testar no computador

```bash
cd simulador
npm install
ANTHROPIC_API_KEY=sua-chave CODIGO_TURMA=teste SENHA_INSTRUTOR=teste node dev-server.js
```

Abra http://localhost:3000.

## Custo

Cada mensagem do atendente e cada avaliação é uma chamada à API do Claude, cobrada na conta dona da chave. O cliente simulado usa esforço baixo (respostas curtas) e a avaliação usa esforço médio. Acompanhe o gasto em console.anthropic.com → Usage e, se quiser, defina um limite mensal em Limits.
